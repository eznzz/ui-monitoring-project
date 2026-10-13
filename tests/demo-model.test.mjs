import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function source(name){return fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');}
function makeEnvironment(){
  const storage=new Map();
  const localStorage={
    getItem:key=>storage.get(key)??null,
    setItem:(key,value)=>storage.set(key,String(value))
  };
  let nonce=0;
  const window={addEventListener(){}};
  const context=vm.createContext({
    window,localStorage,crypto:{randomUUID:()=>String(++nonce)},
    document:{readyState:'loading',addEventListener(){}}
  });
  vm.runInContext(source('modules/shared/app.js'),context);
  context.MP=window.MP;
  vm.runInContext(source('modules/shared/licensing.js'),context);
  context.MP_LICENSE=window.MP_LICENSE;
  return {MP:window.MP,lic:window.MP_LICENSE,localStorage};
}

test('catalog belongs to Platform; tenant owns a canonical object registry',()=>{
 const {MP}=makeEnvironment(),s=MP.state();
 const c=MP.createCompany(s,'Ocean','vessels','owner@example.test');
 assert.equal(c.objectTypeId,'vessels');
 assert.equal(c.ownerEmail,'owner@example.test');
 assert.equal(MP.tenant(s,c.id).objects.length,0);
 assert.ok(!('objectTypes' in c));
 assert.throws(()=>MP.createCompany(s,'Other','vessels','OWNER@example.test'));
});
test('legacy vessels and single-IMO assignment migrate without losing identity',()=>{
 const {MP,localStorage}=makeEnvironment();
 const previous={
  version:4,nextTenantNumber:2,
  companies:[{id:'tenant_db_000001',name:'Legacy',objectTypes:['vessels'],modules:{documents:{paid:true,enabled:true}}}],
  tenants:{tenant_db_000001:{
   users:[{id:'u',email:'u@example.test',role:'vessel',vesselImo:'1234567'}],
   vessels:[{imo:'1234567',name:'Legacy Ship'}]
  }},licenses:[],licenseRequests:[]
 };
 localStorage.setItem(MP.KEY,JSON.stringify(previous));
 const s=MP.state(),t=MP.tenant(s,'tenant_db_000001');
 assert.equal(s.version,5);
 assert.equal(t.objects.length,1);
 assert.equal(t.objects[0].status,'active'); // old demo history is preserved
 assert.equal(t.users[0].objectIds[0],t.objects[0].id);
 assert.equal('vessels' in t,false);
 assert.equal(s.companies[0].modules.documents.enabled,false); // no entitlement from old paid flag
 MP.save(s);
 const again=MP.state();
 assert.equal(again.tenants.tenant_db_000001.objects[0].id,t.objects[0].id);
});
test('inactive, archive restore, history and stable IDs',()=>{
 const {MP}=makeEnvironment(),s=MP.state(),id='tenant_db_000001';
 const v={id:MP.newId('object'),objectTypeId:'vessels',status:'inactive',
  fields:{shipName:'Test Vessel',imo:'1234567'},holds:[],holdTotals:{},history:[]};
 MP.tenant(s,id).objects.push(v);
 MP.setObjectStatus(s,id,v.id,'active');
 MP.setObjectStatus(s,id,v.id,'archived');
 assert.throws(()=>MP.setObjectStatus(s,id,v.id,'active'),/inactive/);
 MP.setObjectStatus(s,id,v.id,'inactive');
 v.fields.imo='7654321';
 assert.equal(MP.tenant(s,id).objects[0].id,v.id);
 assert.equal(v.history.length,3);
 assert.ok(MP.tenant(s,id).audit.length>=3);
});
test('RBAC demo scope is intersection of active, module and user assignments',()=>{
 const {MP,lic}=makeEnvironment(),s=MP.state(),id='tenant_db_000001',c=MP.company(s,id);
 const o={id:'o1',objectTypeId:'vessels',status:'inactive',fields:{shipName:'Ship',imo:'1234567'},history:[]};
 MP.tenant(s,id).objects.push(o);
 MP.tenant(s,id).users.push({id:'u1',name:'Crew',email:'crew@example.test',
  role:'vessel',objectIds:[],modulePermissions:['documents']});
 MP.setObjectStatus(s,id,o.id,'active');
 MP.assignUserObjects(s,id,'u1',['o1']);
 lic.setSystemLicense(s,c,'2000-01-01','9999-01-01');
 lic.setSubscription(s,c,'documents',{startsOn:'2000-01-01',endsBefore:'9999-01-01',
  enabled:true,blocked:false,vesselCap:3});
 lic.assignModuleObjects(s,c,'documents',['o1']);
 assert.equal(MP.effectiveObjects(s,id,'u1','documents').length,1);
 MP.setObjectStatus(s,id,'o1','inactive');
 assert.equal(MP.effectiveObjects(s,id,'u1','documents').length,0);
 lic.assignModuleObjects(s,c,'documents',[]);
 assert.ok(c.modules.documents.assignedObjectIds.includes('o1')); // preserved inactive link
 MP.setCompanyArchived(s,id,true);
 assert.equal(MP.effectiveObjects(s,id,'u1','documents').length,0);
});
test('Fleet tiers and atomic reactivation limit',()=>{
 const {MP,lic}=makeEnvironment(),s=MP.state(),id='tenant_db_000001',c=MP.company(s,id);
 const os=Array.from({length:4},(_,i)=>({
  id:'ship-'+i,objectTypeId:'vessels',status:'inactive',
  fields:{shipName:'Ship '+i,imo:'123456'+i},history:[]}));
 MP.tenant(s,id).objects.push(...os);
 os.slice(0,3).forEach(v=>MP.setObjectStatus(s,id,v.id,'active'));
 lic.setSystemLicense(s,c,'2000-01-01','9999-01-01');
 lic.setSubscription(s,c,'documents',{startsOn:'2000-01-01',endsBefore:'9999-01-01',
  enabled:true,blocked:false,vesselCap:3});
 lic.assignModuleObjects(s,c,'documents',os.slice(0,3).map(o=>o.id));
 MP.setObjectStatus(s,id,os[0].id,'inactive');
 lic.assignModuleObjects(s,c,'documents',[os[1].id,os[2].id]);
 MP.setObjectStatus(s,id,os[3].id,'active');
 lic.assignModuleObjects(s,c,'documents',[os[1].id,os[2].id,os[3].id]);
 assert.throws(()=>MP.setObjectStatus(s,id,os[0].id,'active'),/Fleet/);
 assert.equal(os[0].status,'inactive');
 assert.equal(c.modules.documents.assignedObjectIds.length,4); // retained inactive link
 assert.throws(()=>lic.setSubscription(s,c,'documents',{
   startsOn:'2000-01-01',endsBefore:'9999-01-01',enabled:true,blocked:false,vesselCap:2
 }),/Fleet|Лимит/);
});
test('all demo controllers parse as JavaScript and required IDs exist',()=>{
 for(const [html,js] of [
  ['modules/platform/index.html','modules/platform/platform.js'],
  ['modules/tenant/index.html','modules/tenant/tenant.js'],
  ['modules/tenant/vessel.html','modules/tenant/vessel.js']
 ]){
  const markup=source(html),script=source(js);
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.match(markup,/services\/mock-adapter\.js/);
  const ids=new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  // Ship Particulars creates field controls and hold actions dynamically from its schema.
  const generated=new Set(['hold-add','hold-template','hold-mobile-list','ship-shipName','ship-imo']);
  for(const match of script.matchAll(/\$\('([^']+)'\)/g)){
   assert.ok(ids.has(match[1])||(html.includes('vessel.html')&&generated.has(match[1])),
    html+': missing #'+match[1]);
  }
 }
});

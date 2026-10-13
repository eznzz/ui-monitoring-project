// Run: node tests/demo-foundation.test.cjs
'use strict';
const {readFileSync}=require('node:fs'),{resolve}=require('node:path');
const vm=require('node:vm'),assert=require('node:assert/strict');
const values=new Map(),window={};
const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
vm.runInNewContext(readFileSync(resolve(__dirname,'../modules/shared/app.js'),'utf8'),{
 window,document:{readyState:'loading',addEventListener(){}},localStorage,Date,Math,JSON,Object,String,Array,RegExp,Error
});
const MP=window.MP,state=MP.defaults();
assert.equal(state.version,7);
assert.deepEqual(Array.from(MP.availableObjectTypes(),t=>t.id),['vessels']);
assert.equal(MP.findObjectType('trucks'),null);
assert.throws(()=>MP.createMockCompany(state,{name:'Bad',ownerEmail:'bad',objectTypeId:'vessels'}));
assert.throws(()=>MP.createMockCompany(state,{name:'Bad type',ownerEmail:'x@example.test',objectTypeId:'trucks'}));
const c=MP.createMockCompany(state,{name:'Shipping',ownerEmail:'OWNER@example.test',objectTypeId:'vessels'});
assert.equal(c.ownerEmail,'owner@example.test');
assert.equal(c.templateId,'mock-etalon-vessels-v1');
assert.equal(c.provisioningStatus,'ready');
assert.equal(state.tenants[c.id].vessels.length,0);
assert.throws(()=>MP.createMockCompany(state,{name:'Repeat',ownerEmail:'owner@example.test',objectTypeId:'vessels'}));
state.tenants[c.id].vessels.push({id:'object-one',fields:{shipName:'Marta',imo:'1234567'},holds:[{cbm:'1'}],status:'inactive',history:[]});
MP.setCompanyArchived(state,c.id,true);
assert.equal(c.status,'archived');
assert.throws(()=>MP.setVesselStatus(state,c.id,'object-one','active'));
assert.equal(state.tenants[c.id].vessels.length,1);
MP.setCompanyArchived(state,c.id,false);
assert.equal(c.status,'active');
assert.equal(MP.save(state),true);
assert.equal(MP.state().tenants[c.id].vessels[0].holds[0].cbm,'1');
const legacy={version:4,nextTenantNumber:5,companies:[{id:'tenant_db_000004',name:'Old',objectTypes:['vessels'],modules:{}}],
 tenants:{tenant_db_000004:{users:[],vessels:[]}}};
values.set(MP.KEY,JSON.stringify(legacy));
const migrated=MP.state();
assert.equal(migrated.version,7);
assert.equal(migrated.companies[0].templateId,'mock-etalon-vessels-v1');
assert.equal(migrated.companies[0].status,'active');
assert.equal(migrated.companies[0].ownerEmail,'');
console.log('demo foundation: PASS');

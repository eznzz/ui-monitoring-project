// Run: node tests/demo-vessels.test.cjs
// Mock-only state regression; never connects to VDMS or a database.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const values=new Map(),window={};
const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../modules/shared/app.js'),'utf8'),{
 window,document:{readyState:'loading',addEventListener(){}},localStorage,Date,Math,Array,Object,JSON,String,Error,Set
});
const MP=window.MP,s=MP.defaults(),tenantId=s.companies[0].id;
const v1=MP.createVessel(s,tenantId,{fields:{shipName:'Demo A',imo:'1234567',mmsi:'999'},
 holds:[{name:'1A'}],holdTotals:{totalCbm:'120'}});
assert.equal(v1.status,'inactive');
assert.equal(v1.holds.length,1);
assert.equal(v1.holdTotals.totalCbm,'120');
assert.throws(()=>MP.setVesselStatus(s,tenantId,v1.id,'active_unapproved'));
s.tenants[tenantId].users.push({id:'u1',name:'Crew',email:'crew@example.test',role:'vessel',vesselIds:[]});
assert.throws(()=>MP.assignUserVessels(s,tenantId,'u1',[v1.id])); // cannot newly assign inactive
MP.setVesselStatus(s,tenantId,v1.id,'active');
const v2=MP.createVessel(s,tenantId,{fields:{shipName:'Demo B',imo:'2345678'}});
MP.setVesselStatus(s,tenantId,v2.id,'active');
MP.assignUserVessels(s,tenantId,'u1',[v1.id,v2.id]);
assert.deepEqual(Array.from(s.tenants[tenantId].users[0].vesselIds),[v1.id,v2.id]);
const stableId=v1.id;
MP.updateVessel(s,tenantId,v1.id,{fields:{shipName:'Renamed',imo:'3456789'},holds:[],holdTotals:{}});
assert.equal(v1.id,stableId);
assert.equal(s.tenants[tenantId].users[0].vesselIds[0],stableId);
MP.setVesselStatus(s,tenantId,v1.id,'archived');
assert.throws(()=>MP.setVesselStatus(s,tenantId,v1.id,'active')); // archived cannot auto-activate
assert.throws(()=>MP.updateVessel(s,tenantId,v1.id,{fields:{shipName:'Oops',imo:'7777777'}}));
MP.assignUserVessels(s,tenantId,'u1',[v2.id]); // archived link preserved
assert.ok(s.tenants[tenantId].users[0].vesselIds.includes(v1.id));
MP.setVesselStatus(s,tenantId,v1.id,'inactive');
MP.setVesselStatus(s,tenantId,v1.id,'active');
assert.ok(v1.history.length>=5);
s.tenants[tenantId].users.push({id:'u2',name:'Office',email:'office@example.test',role:'office',vesselIds:[]});
MP.assignUserVessels(s,tenantId,'u2',[]);
assert.equal(s.tenants[tenantId].users[1].vesselIds.length,0);
MP.save(s);
const restored=MP.state();
assert.equal(restored.tenants[tenantId].vessels[0].id,stableId);
assert.equal(restored.tenants[tenantId].users[0].vesselIds.length,2);
const old={version:5,nextTenantNumber:2,companies:[{id:'tenant_db_000001',name:'Legacy',
 objectTypes:['vessels'],modules:{}}],tenants:{tenant_db_000001:{
 users:[{id:'legacy-user',role:'vessel',name:'Old',email:'old@example.test',vesselImo:'7654321'}],
 vessels:[{id:'7654321',fields:{shipName:'Old Vessel',imo:'7654321'},holds:[]}]}},
 licenses:[],licenseRequests:[]};
values.set(MP.KEY,JSON.stringify(old));
const migrated=MP.state(),mv=migrated.tenants[tenantId].vessels[0];
assert.notEqual(mv.id,'7654321');
assert.equal(mv.status,'active'); // preserve existing demo access
assert.equal(migrated.tenants[tenantId].users[0].vesselIds[0],mv.id);
assert.equal('vesselImo' in migrated.tenants[tenantId].users[0],false);
MP.save(migrated);
assert.equal(MP.state().tenants[tenantId].vessels[0].id,mv.id);
console.log('Demo vessels and assignments: PASS');

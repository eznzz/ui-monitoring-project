// Run: node tests/vessel-lifecycle.test.cjs
'use strict';
const {readFileSync}=require('node:fs'),{resolve}=require('node:path');
const vm=require('node:vm'),assert=require('node:assert/strict');
const values=new Map(),window={};
vm.runInNewContext(readFileSync(resolve(__dirname,'../modules/shared/app.js'),'utf8'),{
 window,document:{readyState:'loading',addEventListener(){}},
 localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},
 Date,Math,JSON,Object,String,Array,RegExp,Error
});
const MP=window.MP,s=MP.defaults(),tid=s.companies[0].id;
const v={id:MP.newObjectId(),fields:{shipName:'Test',imo:'1234567'},holds:[{cbm:'10'}],status:'inactive',history:[]};
s.tenants[tid].vessels.push(v);
assert.match(v.id,/^object-/);
assert.throws(()=>MP.setVesselStatus(s,'another-tenant',v.id,'active'));
assert.equal(MP.setVesselStatus(s,tid,v.id,'active').status,'active'); // mock only
v.fields.imo='7654321';
assert.notEqual(v.id,v.fields.imo);
assert.equal(MP.setVesselStatus(s,tid,v.id,'archived').status,'archived');
assert.throws(()=>MP.setVesselStatus(s,tid,v.id,'active'));
assert.equal(MP.setVesselStatus(s,tid,v.id,'inactive').status,'inactive');
assert.equal(v.holds[0].cbm,'10');
assert.equal(v.history.length,3);
assert.equal(v.history[1].to,'archived');
assert.equal(v.history[2].to,'inactive');
assert.equal(MP.removeVessel,undefined); // destructive operation has been removed

const v2={id:'object-two',fields:{shipName:'Second',imo:'1111111'},status:'inactive',history:[]};
s.tenants[tid].vessels.push(v2);
s.companies[0].modules.documents={objectIds:[v.id,v2.id],vesselCap:1};
MP.setVesselStatus(s,tid,v.id,'active');
assert.equal(MP.fleetUsage(s,tid,'documents'),1);
assert.throws(()=>MP.setVesselStatus(s,tid,v2.id,'active'),/Mock Fleet/);
MP.setVesselStatus(s,tid,v.id,'inactive');
assert.equal(MP.setVesselStatus(s,tid,v2.id,'active').status,'active');

const legacy={version:4,nextTenantNumber:2,companies:[{id:tid,name:'Legacy',objectTypes:['vessels'],modules:{}}],
 tenants:{[tid]:{users:[{id:'user-old',role:'vessel',vesselImo:'5555555'}],
 vessels:[{id:'5555555',name:'Old Ship',imo:'5555555',holds:[{cbm:'75'}],holdTotals:{totalCbm:'75'}}]}}};
values.set(MP.KEY,JSON.stringify(legacy));
const once=MP.state(),twice=MP.state(),m=once.tenants[tid].vessels[0],u=once.tenants[tid].users[0];
assert.notEqual(m.id,'5555555'); // legacy IMO-ID migrated
assert.equal(m.id,twice.tenants[tid].vessels[0].id);
assert.equal(u.objectIds[0],m.id);
assert.equal('vesselImo' in u,false);
assert.equal(m.holds[0].cbm,'75');
assert.equal(m.holdTotals.totalCbm,'75');
assert.equal(m.status,'inactive');
console.log('vessel lifecycle: PASS');

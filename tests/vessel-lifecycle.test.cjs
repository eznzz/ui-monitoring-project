// Run: node tests/vessel-lifecycle.test.cjs
'use strict';
const {readFileSync}=require('node:fs'),{resolve}=require('node:path');
const assert=require('node:assert/strict'),vm=require('node:vm');
const local=new Map(),window={};
vm.runInNewContext(readFileSync(resolve(__dirname,'../modules/shared/app.js'),'utf8'),{
 window,document:{readyState:'loading',addEventListener(){}},
 localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)},
 Date,Math,JSON,String,Object,Array,RegExp,Error
});
const MP=window.MP, state=MP.defaults(),tenantId=state.companies[0].id;
const v={id:'object-demo-test',fields:{shipName:'Test Ship',imo:'1234567'},status:'inactive',history:[]};
state.tenants[tenantId].vessels.push(v);
assert.throws(()=>MP.setVesselStatus(state,tenantId,v.id,'active'),/серверной проверки/);
assert.throws(()=>MP.setVesselStatus(state,'another-tenant',v.id,'archived'));
assert.equal(MP.setVesselStatus(state,tenantId,v.id,'archived').status,'archived');
assert.equal(state.tenants[tenantId].vessels.length,1);
assert.throws(()=>MP.setVesselStatus(state,tenantId,v.id,'active'));
assert.equal(MP.setVesselStatus(state,tenantId,v.id,'inactive').status,'inactive');
assert.equal(v.history.length,2);
assert.equal(v.history[0].from,'inactive');
assert.equal(v.history[1].from,'archived');
assert.equal(v.history[1].to,'inactive');

const legacy={version:4,nextTenantNumber:2,companies:[{id:tenantId,name:'Old',
 objectTypes:['vessels'],modules:{}}],tenants:{[tenantId]:{
 users:[],vessels:[{id:'legacy-imo',name:'Old Ship',imo:'7654321'}]}}};
local.set(MP.KEY,JSON.stringify(legacy));
const migrated=MP.state().tenants[tenantId].vessels[0];
assert.equal(migrated.id,'legacy-imo');
assert.equal(migrated.status,'inactive');
assert.equal(migrated.objectTypeId,'vessels');
assert.equal(migrated.fields.imo,'7654321');
assert.ok(Array.isArray(migrated.history));
console.log('vessel lifecycle smoke: PASS');

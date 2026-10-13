// Run: node tests/user-assignments.test.cjs
'use strict';
const {readFileSync}=require('node:fs'),{resolve}=require('node:path');
const vm=require('node:vm'),assert=require('node:assert/strict'),window={};
vm.runInNewContext(readFileSync(resolve(__dirname,'../modules/shared/app.js'),'utf8'),{
 window,document:{readyState:'loading',addEventListener(){}},
 localStorage:{getItem(){return null;},setItem(){}},Date,Math,JSON,Object,String,Array,RegExp,Error
});
const MP=window.MP,s=MP.defaults(),tid=s.companies[0].id;
const a={id:'object-a',fields:{imo:'1111111',shipName:'A'},status:'active',history:[]};
const b={id:'object-b',fields:{imo:'2222222',shipName:'B'},status:'active',history:[]};
const z={id:'object-z',fields:{imo:'3333333',shipName:'Z'},status:'inactive',history:[]};
s.tenants[tid].vessels.push(a,b,z);
assert.deepEqual(Array.from(MP.validateUserObjectIds(s,tid,'office',[])),[]);
assert.throws(()=>MP.validateUserObjectIds(s,tid,'vessel',[]),/хотя бы одно/);
assert.throws(()=>MP.validateUserObjectIds(s,tid,'vessel',[z.id]),/только активные/);
assert.throws(()=>MP.validateUserObjectIds(s,tid,'office',['object-other']));
assert.deepEqual(Array.from(MP.validateUserObjectIds(s,tid,'vessel',[a.id,b.id,a.id])),[a.id,b.id]);
const user={id:'user-demo',name:'Captain',role:'vessel',objectIds:[a.id,b.id]};
s.tenants[tid].users.push(user);
MP.assignUserObjects(s,tid,user.id,[b.id]);
assert.deepEqual(Array.from(user.objectIds),[b.id]);
MP.setVesselStatus(s,tid,b.id,'archived');
assert.deepEqual(Array.from(user.objectIds),[b.id]); // do not destroy history
const office={id:'office-1',role:'office',objectIds:[]};
s.tenants[tid].users.push(office);
MP.assignUserObjects(s,tid,office.id,[a.id]);
assert.deepEqual(Array.from(office.objectIds),[a.id]);
MP.assignUserObjects(s,tid,office.id,[]);
assert.deepEqual(Array.from(office.objectIds),[]);
assert.equal(MP.validateUserObjectIds(s,tid,'office',[]).length,0);
a.fields.imo='9999999';assert.equal(user.objectIds[0],b.id); // ID unaffected by IMO updates
assert.throws(()=>MP.assignUserObjects(s,tid,user.id,[]),/хотя бы одно/);
console.log('user assignments: PASS');

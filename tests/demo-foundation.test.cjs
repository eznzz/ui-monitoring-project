// Run: node tests/demo-foundation.test.cjs
'use strict';
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const values=new Map();
const localStorage={
 getItem:key=>values.get(key)??null,
 setItem:(key,value)=>values.set(key,value)
};
const window={};
vm.runInNewContext(readFileSync(resolve(__dirname,'../modules/shared/app.js'),'utf8'),{
 window,localStorage,document:{readyState:'loading',addEventListener(){}},Date,Math,JSON,Array,Object,String,RegExp,Error
});
const MP=window.MP, state=MP.defaults();
assert.deepEqual(Array.from(MP.availableObjectTypes(),t=>t.id),['vessels']);
assert.equal(MP.findObjectType('trucks'),null);
assert.throws(()=>MP.createMockCompany(state,{name:'No email',ownerEmail:'bad',objectTypeId:'vessels'}));
assert.throws(()=>MP.createMockCompany(state,{name:'Unknown',ownerEmail:'x@example.test',objectTypeId:'trucks'}));

const company=MP.createMockCompany(state,{name:'Test Shipping',ownerEmail:'OWNER@example.test',objectTypeId:'vessels'});
assert.equal(company.ownerEmail,'owner@example.test');
assert.equal(company.templateId,'mock-etalon-vessels-v1');
assert.equal(company.provisioningStatus,'ready');
assert.equal(state.tenants[company.id].vessels.length,0);
assert.throws(()=>MP.createMockCompany(state,{name:'Duplicate',ownerEmail:'owner@example.test',objectTypeId:'vessels'}));

state.tenants[company.id].vessels.push({id:'vessel-1',fields:{shipName:'Test',imo:'1234567'}});
MP.setCompanyArchived(state,company.id,true);
assert.equal(company.status,'archived');
assert.equal(state.tenants[company.id].vessels.length,1);
MP.setCompanyArchived(state,company.id,false);
assert.equal(company.status,'active');
assert.equal(state.tenants[company.id].vessels.length,1);
assert.equal(MP.save(state),true);
const roundtrip=MP.state();
assert.equal(MP.company(roundtrip,company.id).ownerEmail,'owner@example.test');
assert.equal(MP.tenant(roundtrip,company.id).vessels.length,1);

const legacy={version:4,nextTenantNumber:5,companies:[{id:'tenant_db_000004',name:'Old',
 objectTypes:['vessels'],modules:{}}],tenants:{tenant_db_000004:{users:[],vessels:[]}}};
values.set(MP.KEY,JSON.stringify(legacy));
const migrated=MP.state();
assert.equal(migrated.version,5);
assert.equal(migrated.companies[0].templateId,'mock-etalon-vessels-v1');
assert.equal(migrated.companies[0].status,'active');
assert.equal(migrated.companies[0].ownerEmail,'');
console.log('demo foundation smoke: PASS');

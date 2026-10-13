/* Monitoring Project • isolated demo state for initial platform/tenant interfaces.
   No real authentication, database, licensing or payment processing. */
(function(){
'use strict';
const KEY='mp-ui-prototype-v1';
const MODULES=[
 {id:'core',name:'Core',detail:'Расширенные функции учёта судов и справочников'},
 {id:'auth',name:'Auth',detail:'Расширенные роли, разрешения и сессии'},
 {id:'documents',name:'Documents',detail:'Сертификаты и документы'},
 {id:'crewing',name:'Crewing',detail:'Экипажи и ротации'},
 {id:'supply',name:'Supply',detail:'Заявки и снабжение'},
 {id:'vms',name:'VMS',detail:'Маршруты, позиции и телеметрия'},
 {id:'performance',name:'Performance',detail:'Топливо и KPI'},
 {id:'reports',name:'Reports',detail:'Отчётность'},
 {id:'sync',name:'Sync',detail:'Обмен данными'}
];
/* Mock etalon_db Object Type catalog: NOT a physical PostgreSQL template or API contract. */
const ETALON_OBJECT_TYPES=Object.freeze([
 Object.freeze({id:'vessels',name:'Суда (Vessels)',description:'Карточки судов и Ship Particulars',
  templateId:'mock-etalon-vessels-v1',available:true})
]);
const OBJECT_TYPES=ETALON_OBJECT_TYPES; // compatibility alias
function availableObjectTypes(){return ETALON_OBJECT_TYPES.filter(t=>t.available);}
function findObjectType(id){return availableObjectTypes().find(t=>t.id===id)||null;}
const ROLES=[{id:'office',name:'Office'},{id:'vessel',name:'Vessel'}];
function defaults(){
 return {version:5,nextTenantNumber:2,companies:[{id:'tenant_db_000001',name:'Демо-компания',objectTypes:['vessels'],objectTypeId:'vessels',templateId:'mock-etalon-vessels-v1',ownerEmail:'',status:'active',provisioningStatus:'ready',modules:{}}],
   tenants:{tenant_db_000001:{users:[],vessels:[]}},licenses:[],licenseRequests:[]};
}
function normalize(raw){
 if(!raw||!Array.isArray(raw.companies)||!raw.tenants)return defaults();
 raw.version=6;
 const existing=raw.companies.map(c=>Number(c.id?.match(/tenant_db_(\d+)$/)?.[1]||0));
 raw.nextTenantNumber=Math.max(Number.isInteger(raw.nextTenantNumber)?raw.nextTenantNumber:1,Math.max(0,...existing)+1);
 if(!Array.isArray(raw.licenses))raw.licenses=[];
 if(!Array.isArray(raw.licenseRequests))raw.licenseRequests=[];
 raw.companies.forEach(c=>{
   delete c.code; // obsolete UI-only free-form label; Tenant ID is canonical
   if(!Array.isArray(c.objectTypes))c.objectTypes=['vessels']; // migration of older mock companies
   c.objectTypes=c.objectTypes.filter(id=>OBJECT_TYPES.some(type=>type.id===id));
   c.objectTypeId=c.objectTypeId||c.objectTypes[0]||null;
   c.templateId=c.templateId||findObjectType(c.objectTypeId)?.templateId||'legacy-unknown';
   if(typeof c.ownerEmail!=='string')c.ownerEmail='';
   if(!['active','archived'].includes(c.status))c.status='active';
   if(!c.provisioningStatus)c.provisioningStatus='ready'; // legacy mock record
   c.modules=c.modules||{};
   if(!raw.tenants[c.id])raw.tenants[c.id]={users:[],vessels:[]};
 });
 Object.keys(raw.tenants).forEach(id=>{
   const t=raw.tenants[id];
   t.users=Array.isArray(t.users)?t.users:[];
   t.vessels=Array.isArray(t.vessels)?t.vessels:[];
   // Migrate Vessels before user links so legacy vesselImo can resolve to a stable Object ID.
   const seen=new Set();
   t.vessels=t.vessels.map((v,i)=>{
    const record=(v.fields&&typeof v.fields==='object')?v:{
     id:v.id||'',fields:{shipName:v.name||'',imo:v.imo||'',shipType:v.type||'',flag:v.flag||'',callSign:v.callSign||''},
     holds:[],updatedAt:''
    };
    const originalId=String(record.id||'');
    // Legacy numeric IDs sometimes equalled IMO; do not keep a business attribute as Object identity.
    record.id=!originalId||originalId===String(record.fields?.imo||'')||seen.has(originalId)
     ?'object-legacy-'+id+'-'+i:originalId;
    seen.add(record.id);
    record.objectTypeId='vessels';
    record.status=['active','inactive','archived'].includes(record.status)?record.status:'inactive';
    record.holds=Array.isArray(record.holds)?record.holds:[];
    record.holdTotals=record.holdTotals&&typeof record.holdTotals==='object'?record.holdTotals:{};
    record.history=Array.isArray(record.history)?record.history:[];
    return record;
   });
   t.users.forEach((u,i)=>{
    if(!ROLES.some(r=>r.id===u.role))u.role='office';
    if(!u.id)u.id='legacy-'+id+'-'+i;
    if(!Array.isArray(u.objectIds)){
     const linked=t.vessels.find(v=>v.fields?.imo===u.vesselImo);
     u.objectIds=linked?[linked.id]:[];
    }
    u.objectIds=[...new Set(u.objectIds)].filter(objectId=>t.vessels.some(v=>v.id===objectId));
    delete u.vesselImo; // relationships now reference stable Object IDs
    delete u.password;delete u.passwordConfirm;delete u.passwordHash;
   });
 });
 return raw;
}
function state(){
 let raw;
 try{raw=JSON.parse(localStorage.getItem(KEY));}catch(_){raw=null;}
 return normalize(raw);
}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s));return true;}catch(_){return false;}}
function company(s,id){return s.companies.find(c=>c.id===id)||null;}
function createMockCompany(s,{name,ownerEmail,objectTypeId}){
 const n=String(name||'').trim(),email=String(ownerEmail||'').trim().toLowerCase();
 const type=findObjectType(objectTypeId);
 if(!n)throw Error('Укажите название компании.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Укажите корректный e-mail владельца.');
 if(!type)throw Error('Выберите доступный тип объектов из эталона.');
 if(s.companies.some(c=>c.ownerEmail?.toLowerCase()===email)||
   Object.values(s.tenants).some(t=>t.users?.some(u=>u.email?.toLowerCase()===email)))
  throw Error('Этот e-mail уже используется в демо.');
 const next=s.nextTenantNumber||2,id='tenant_db_'+String(next).padStart(6,'0');
 if(s.companies.some(c=>c.id===id))throw Error('Конфликт ID mock Tenant.');
 const c={id,name:n,ownerEmail:email,objectTypes:[type.id],objectTypeId:type.id,templateId:type.templateId,
  status:'active',provisioningStatus:'ready',modules:{}};
 s.nextTenantNumber=next+1;
 s.tenants[id]={users:[],vessels:[]}; // mock only, no PostgreSQL provisioning
 s.companies.push(c);
 return c;
}
function setCompanyArchived(s,id,archived){
 const c=company(s,id);if(!c)throw Error('Компания не найдена.');
 c.status=archived?'archived':'active';
 c.archivedAt=archived?new Date().toISOString():null;
 return c;
}
function tenant(s,id){
 if(!s.tenants[id])s.tenants[id]={users:[],vessels:[]};
 return s.tenants[id];
}
function vesselSummary(v){
 const d=v?.fields||v||{};
 return {name:d.shipName||d.name||'',imo:d.imo||'',type:d.shipType||d.type||'',flag:d.flag||''};
}
function escape(value){
 return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function countEnabled(c){return MODULES.filter(m=>c.modules?.[m.id]?.paid&&c.modules?.[m.id]?.enabled).length;}
function removeUser(s,tenantId,userId){
 const c=company(s,tenantId),t=s.tenants?.[tenantId];
 if(!c||!t||!Array.isArray(t.users))throw Error('Компания или список пользователей не найден.');
 const before=t.users.length;
 t.users=t.users.filter(u=>u.id!==userId);
 if(t.users.length===before)throw Error('Пользователь не найден.');
 return true;
}
const VESSEL_STATUSES=Object.freeze(['active','inactive','archived']);
function vesselById(s,tenantId,objectId){
 return s.tenants?.[tenantId]?.vessels?.find(v=>v.id===objectId)||null;
}
function nextObjectId(s,tenantId){
 let id;
 do{id='object-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);}
 while(vesselById(s,tenantId,id));
 return id;
}
function saveVessel(s,tenantId,{id,fields,holds=[],holdTotals={}}){
 const c=company(s,tenantId),t=s.tenants?.[tenantId];
 if(!c||c.status==='archived'||!c.objectTypes?.includes('vessels')||!t)
  throw Error('Реестр судов недоступен для этой компании.');
 if(!fields?.shipName?.trim())throw Error('Укажите Ship\'s Name.');
 if(!/^\d{7}$/.test(String(fields?.imo||'')))throw Error('IMO No. должен содержать ровно 7 цифр (mock).');
 const prev=id?vesselById(s,tenantId,id):null;
 if(id&&!prev)throw Error('Object ID не найден в этой компании.');
 if(t.vessels.some(v=>v.id!==id&&v.fields?.imo===fields.imo))
  throw Error('Это IMO уже есть в реестре компании.');
 if(prev?.status==='archived')throw Error('Сначала восстановите судно из архива.');
 const now=new Date().toISOString(),record=prev||{
  id:nextObjectId(s,tenantId),objectTypeId:'vessels',status:'inactive',history:[]
 };
 record.fields={...fields};record.holds=holds.map(h=>({...h}));record.holdTotals={...holdTotals};record.updatedAt=now;
 record.history.push({type:prev?'particulars-updated':'created',at:now,actor:'demo-admin'});
 if(!prev)t.vessels.push(record);
 return record;
}
function setVesselStatus(s,tenantId,objectId,next){
 const c=company(s,tenantId),v=vesselById(s,tenantId,objectId);
 if(!c||c.status==='archived'||!v)throw Error('Судно недоступно.');
 if(!VESSEL_STATUSES.includes(next))throw Error('Неизвестный статус судна.');
 if(v.status===next)return v;
 if(v.status==='archived'&&next!=='inactive')
  throw Error('Восстановление архива возможно только в inactive.');
 if(v.status!=='archived'&&next==='active'&&v.status!=='inactive')
  throw Error('Активация возможна только из inactive.');
 const previous=v.status;
 v.status=next;
 v.history=Array.isArray(v.history)?v.history:[];
 v.history.push({type:'status-changed',from:previous,to:next,at:new Date().toISOString(),actor:'demo-admin'});
 // MOCK ONLY: actual fleet-limit checks must be atomic on the backend before activation.
 return v;
}
function assignUserObjects(s,tenantId,userId,ids){
 const c=company(s,tenantId),t=s.tenants?.[tenantId],u=t?.users?.find(x=>x.id===userId);
 if(!c||c.status==='archived'||!u||!['office','vessel'].includes(u.role))
  throw Error('Назначение недоступно.');
 if(!Array.isArray(ids))throw Error('Список Object ID должен быть массивом.');
 const unique=[...new Set(ids)],existing=new Set(u.objectIds||[]);
 for(const objectId of unique){
  const v=t.vessels.find(x=>x.id===objectId);
  if(!v)throw Error('Судно не принадлежит компании.');
  // Existing inactive/archived assignments can be kept, but not newly granted.
  if(!existing.has(objectId)&&v.status!=='active')
   throw Error('Новые назначения возможны только на активные суда.');
 }
 u.objectIds=unique;
 u.assignmentHistory=Array.isArray(u.assignmentHistory)?u.assignmentHistory:[];
 u.assignmentHistory.push({type:'assignments-updated',objectIds:[...unique],at:new Date().toISOString(),actor:'demo-admin'});
 return u;
}
// Company archive/restore preserves tenant data; physical deletion is not a UI action.
function setFeedback(id,message,error){
 const node=document.getElementById(id);if(!node)return;
 node.textContent=message;node.setAttribute('role',error?'alert':'status');
}
function applyTheme(dark){
 document.body.classList.toggle('dark',dark);
 document.querySelectorAll('[data-theme-toggle]').forEach(b=>{
   b.setAttribute('aria-pressed',String(dark));
   b.textContent=dark?'☀ Светлая тема':'◐ Тёмная тема';
 });
}
function initShared(){
 let stored=null;try{stored=localStorage.getItem('vms-theme');}catch(_){}
 applyTheme(stored==='dark'||(stored!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches));
 document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',()=>{
   const dark=!document.body.classList.contains('dark');applyTheme(dark);
   try{localStorage.setItem('vms-theme',dark?'dark':'light');}catch(_){}
 }));
 window.addEventListener('storage',e=>{if(e.key==='vms-theme')applyTheme(e.newValue==='dark');});
 const menu=document.querySelector('[data-mp-sidebar]');
 const overlay=document.querySelector('[data-mp-overlay]');
 const trigger=document.querySelector('[data-mp-menu]');
 if(menu&&overlay&&trigger){
   function close(){menu.classList.remove('is-open');overlay.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');}
   trigger.addEventListener('click',()=>{const open=menu.classList.toggle('is-open');overlay.classList.toggle('is-open',open);trigger.setAttribute('aria-expanded',String(open));});
   overlay.addEventListener('click',close);
   menu.addEventListener('click',e=>{if(e.target.closest('a'))close();});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('is-open')){close();trigger.focus();}});
   window.addEventListener('resize',()=>{if(innerWidth>950)close();});
 }
}
window.MP={KEY,MODULES,OBJECT_TYPES,ETALON_OBJECT_TYPES,availableObjectTypes,findObjectType,ROLES,defaults,state,save,company,createMockCompany,setCompanyArchived,tenant,vesselSummary,VESSEL_STATUSES,vesselById,saveVessel,setVesselStatus,assignUserObjects,escape,countEnabled,removeUser,setFeedback};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShared);else initShared();
})();

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
 return {version:6,nextTenantNumber:2,companies:[{id:'tenant_db_000001',name:'Демо-компания',objectTypes:['vessels'],objectTypeId:'vessels',templateId:'mock-etalon-vessels-v1',ownerEmail:'',status:'active',provisioningStatus:'ready',modules:{}}],
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
   const seen=new Set();
   t.vessels=t.vessels.map((v,i)=>{
     let record=v;
     if(!v.fields||typeof v.fields!=='object'){
       record={id:v.id,fields:{shipName:v.name||'',imo:v.imo||'',shipType:v.type||'',
         flag:v.flag||'',callSign:v.callSign||''},holds:[],updatedAt:v.updatedAt||''};
     }
     record.holds=Array.isArray(record.holds)?record.holds:[];
     record.holdTotals=record.holdTotals&&typeof record.holdTotals==='object'?record.holdTotals:{};
     // Legacy IMO-derived IDs are replaced once by deterministic mock Object IDs.
     if(!record.id||record.id===record.fields.imo||seen.has(record.id))
       record.id='object-'+id+'-'+String(i+1).padStart(5,'0');
     seen.add(record.id);
     if(!['active','inactive','archived'].includes(record.status))
       record.status='active'; // preserve the working visibility of old demo records
     record.history=Array.isArray(record.history)?record.history:[];
     return record;
   });
   t.users.forEach((u,i)=>{
     if(!ROLES.some(r=>r.id===u.role))u.role='office';
     if(!u.id)u.id='legacy-'+id+'-'+i;
     const legacy=u.vesselImo?t.vessels.find(v=>v.fields.imo===u.vesselImo):null;
     u.vesselIds=Array.isArray(u.vesselIds)?u.vesselIds.filter(vId=>t.vessels.some(v=>v.id===vId)):
       (legacy?[legacy.id]:[]);
     // Migrate once to a many-to-many relationship; no more IMO linkage.
     delete u.vesselImo;
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
function newObjectId(){
 return 'object-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,11);
}
function createVessel(s,tenantId,{fields,holds=[],holdTotals={}}){
 const c=company(s,tenantId),t=tenant(s,tenantId);
 if(!c||c.status==='archived'||c.objectTypeId!=='vessels')throw Error('Создание судна недоступно.');
 const shipName=String(fields?.shipName||'').trim(),imo=String(fields?.imo||'').trim();
 if(!shipName||!imo)throw Error("Обязательны Ship's Name и IMO.");
 if(t.vessels.some(v=>v.fields.imo===imo))throw Error('Судно с таким IMO уже есть в компании.');
 const record={id:newObjectId(),status:'inactive',fields:{...fields,shipName,imo},
  holds:holds.map(h=>({...h})),holdTotals:{...holdTotals},
  history:[{action:'created',at:new Date().toISOString(),actor:'mock-admin',status:'inactive'}],
  updatedAt:new Date().toISOString()};
 t.vessels.push(record);return record;
}
function updateVessel(s,tenantId,objectId,{fields,holds=[],holdTotals={}}){
 const t=tenant(s,tenantId),v=t.vessels.find(x=>x.id===objectId);
 if(!v)throw Error('Судно не найдено.');
 if(v.status==='archived')throw Error('Архивная карточка доступна только для просмотра.');
 const shipName=String(fields?.shipName||'').trim(),imo=String(fields?.imo||'').trim();
 if(!shipName||!imo)throw Error("Обязательны Ship's Name и IMO.");
 if(t.vessels.some(x=>x!==v&&x.fields.imo===imo))throw Error('Судно с таким IMO уже есть в компании.');
 v.fields={...fields,shipName,imo};
 v.holds=holds.map(h=>({...h}));v.holdTotals={...holdTotals};
 v.updatedAt=new Date().toISOString();
 v.history.push({action:'particulars_updated',at:v.updatedAt,actor:'mock-admin'});
 return v;
}
function setVesselStatus(s,tenantId,objectId,nextStatus){
 const c=company(s,tenantId),v=tenant(s,tenantId).vessels.find(x=>x.id===objectId);
 if(!c||c.status==='archived'||!v)throw Error('Судно или компания недоступны.');
 const allowed={active:['inactive','archived'],inactive:['active','archived'],archived:['inactive']};
 if(!allowed[v.status]?.includes(nextStatus))throw Error('Недопустимый переход состояния судна.');
 // Fleet capacity is not checked in the mock because no trusted module subscription
 // and assignment contract is available yet. Backend must enforce it atomically.
 const previous=v.status;v.status=nextStatus;v.updatedAt=new Date().toISOString();
 v.history.push({action:'status_changed',from:previous,to:nextStatus,at:v.updatedAt,actor:'mock-admin'});
 return v;
}
function assignUserVessels(s,tenantId,userId,vesselIds){
 const t=tenant(s,tenantId),u=t.users.find(x=>x.id===userId);
 if(!u)throw Error('Пользователь не найден.');
 const unique=[...new Set(vesselIds)];
 if(unique.some(id=>!t.vessels.some(v=>v.id===id&&v.status==='active')))
  throw Error('Новое назначение допускается только на активные суда.');
 const preserved=(u.vesselIds||[]).filter(id=>t.vessels.some(v=>v.id===id&&v.status!=='active'));
 if(u.role==='vessel'&&!unique.length&&!preserved.length)throw Error('Vessel требует как минимум одно назначение.');
 u.vesselIds=[...new Set([...unique,...preserved])];
 return u;
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
// Vessels are never deleted in the demo; use inactive/archive transitions.
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
window.MP={KEY,MODULES,OBJECT_TYPES,ETALON_OBJECT_TYPES,availableObjectTypes,findObjectType,ROLES,defaults,state,save,company,createMockCompany,setCompanyArchived,tenant,newObjectId,createVessel,updateVessel,setVesselStatus,assignUserVessels,vesselSummary,escape,countEnabled,removeUser,setFeedback};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShared);else initShared();
})();

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
   t.users.forEach((u,i)=>{
    if(!ROLES.some(r=>r.id===u.role))u.role='office';
    if(!u.id)u.id='legacy-'+id+'-'+i;
    delete u.password;delete u.passwordConfirm;delete u.passwordHash;
   });
   t.vessels=t.vessels.map((v,index)=>{
     const normalized=v.fields&&typeof v.fields==='object'?v:{
      ...v,fields:{shipName:v.name||'',imo:v.imo||'',shipType:v.type||'',flag:v.flag||'',callSign:v.callSign||''}};
     normalized.holds=Array.isArray(normalized.holds)?normalized.holds:[];
     normalized.id=normalized.id||('legacy-object-'+id+'-'+index);
     // Old demo IDs may be IMO: preserve identity during migration, never recompute on edits.
     if(!['active','inactive','archived'].includes(normalized.status))normalized.status='inactive';
     normalized.objectTypeId='vessels';
     if(!Array.isArray(normalized.history))normalized.history=[];
     return normalized;
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
function newObjectId(){return 'object-'+(globalThis.crypto?.randomUUID?.()||('mock-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))); }
function setVesselStatus(s,tenantId,objectId,nextStatus){
 const t=s.tenants?.[tenantId],v=t?.vessels?.find(item=>item.id===objectId);
 if(!v)throw Error('Объект не найден в этой компании.');
 const transitions={inactive:['active','archived'],active:['inactive','archived'],archived:['inactive']};
 if(!transitions[v.status]?.includes(nextStatus))throw Error('Недопустимый переход статуса.');
 if(nextStatus==='active')throw Error('Активация требует серверной проверки Fleet и назначений модулей; в демо недоступна.');
 v.history=Array.isArray(v.history)?v.history:[];
 v.history.push({at:new Date().toISOString(),event:'status',from:v.status,to:nextStatus,actor:'demo-tenant-admin'});
 v.status=nextStatus;
 return v;
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
function removeVessel(s,tenantId,vesselIMO){
 const c=company(s,tenantId),t=s.tenants?.[tenantId];
 if(!c||!t||!Array.isArray(t.vessels))throw Error('Компания или список судов не найден.');
 if(t.users?.some(u=>u.role==='vessel'&&u.vesselImo===vesselIMO))
  throw Error('Судно привязано к аккаунту vessel. Сначала удалите привязанные аккаунты в разделе «Пользователи».');
 const before=t.vessels.length;
 t.vessels=t.vessels.filter(v=>vesselSummary(v).imo!==vesselIMO);
 if(t.vessels.length===before)throw Error('Судно не найдено.');
 return true;
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
window.MP={KEY,MODULES,OBJECT_TYPES,ETALON_OBJECT_TYPES,availableObjectTypes,findObjectType,ROLES,defaults,state,save,company,createMockCompany,setCompanyArchived,tenant,vesselSummary,newObjectId,setVesselStatus,escape,countEnabled,removeUser,removeVessel,setFeedback};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShared);else initShared();
})();

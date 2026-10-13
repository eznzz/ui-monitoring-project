/* Monitoring Project: platform object catalog and tenant-scoped demo store.
   MOCK ONLY. No authentication, server authorization, tenant routing or payments. */
(function(){
'use strict';
const KEY='mp-ui-prototype-v1'; // Keep the existing browser key to migrate without data loss.
const VERSION=5;
const MODULES=[
 {id:'core',name:'Core',detail:'Расширенные функции учёта объектов и справочников'},
 {id:'auth',name:'Auth',detail:'Расширенные роли, разрешения и сессии'},
 {id:'documents',name:'Documents',detail:'Сертификаты и документы'},
 {id:'crewing',name:'Crewing',detail:'Экипажи и ротации'},
 {id:'supply',name:'Supply',detail:'Заявки и снабжение'},
 {id:'vms',name:'VMS',detail:'Маршруты, позиции и телеметрия'},
 {id:'performance',name:'Performance',detail:'Топливо и KPI'},
 {id:'reports',name:'Reports',detail:'Отчётность'},
 {id:'sync',name:'Sync',detail:'Обмен данными'}
];
// Only Platform owns this catalog. New types will be added by Platform/API,
// not by tenants. Vessels is the first supported type, not a paid module.
const OBJECT_TYPES=[{id:'vessels',name:'Суда (Vessels)',plural:'Суда',
 description:'Ship Particulars, IMO и морские технические характеристики',supported:true}];
const ROLES=[{id:'office',name:'Office'},{id:'vessel',name:'Vessel'}];
const STATUSES=['active','inactive','archived'];
const dateStamp=()=>new Date().toISOString();
function newId(prefix){
 const random=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():
  Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 return prefix+'-'+random;
}
function defaults(){
 return {version:VERSION,nextTenantNumber:2,
  companies:[{id:'tenant_db_000001',name:'Демо-компания',objectTypeId:'vessels',
   ownerEmail:'',status:'active',systemLicense:null,modules:{}}],
  tenants:{tenant_db_000001:{users:[],objects:[],audit:[]}},licenses:[],licenseRequests:[]};
}
function validType(id){return OBJECT_TYPES.some(type=>type.id===id&&type.supported);}
function normalize(raw){
 if(!raw||!Array.isArray(raw.companies)||!raw.tenants)return defaults();
 const previous=Number(raw.version)||0;
 raw.version=VERSION;
 const existing=raw.companies.map(c=>Number(c.id?.match(/tenant_db_(\d+)$/)?.[1]||0));
 raw.nextTenantNumber=Math.max(Number.isInteger(raw.nextTenantNumber)?raw.nextTenantNumber:1,Math.max(0,...existing)+1);
 if(!Array.isArray(raw.licenses))raw.licenses=[];
 if(!Array.isArray(raw.licenseRequests))raw.licenseRequests=[];
 raw.companies.forEach(c=>{
  delete c.code;
  c.objectTypeId=validType(c.objectTypeId)?c.objectTypeId:
   (Array.isArray(c.objectTypes)?c.objectTypes.find(validType):null)||'vessels';
  delete c.objectTypes;
  c.ownerEmail=String(c.ownerEmail||'').trim().toLowerCase();
  c.status=c.status==='archived'?'archived':'active';
  c.modules=c.modules&&typeof c.modules==='object'?c.modules:{};
  if(!raw.tenants[c.id])raw.tenants[c.id]={users:[],objects:[],audit:[]};
  if(!c.systemLicense)c.systemLicense=null;
  // An older approved demo key is historical data, never proof of a new subscription.
  Object.entries(c.modules).forEach(([id,m])=>{
   if(!m||typeof m!=='object'){delete c.modules[id];return;}
   m.assignedObjectIds=Array.isArray(m.assignedObjectIds)?m.assignedObjectIds:[];
   m.vesselCap=m.vesselCap===null?null:(Number.isInteger(m.vesselCap)&&m.vesselCap>=0?m.vesselCap:3);
   m.startsOn=typeof m.startsOn==='string'?m.startsOn:'';
   m.endsBefore=typeof m.endsBefore==='string'?m.endsBefore:'';
   m.enabled=Boolean(m.enabled&&m.startsOn&&m.endsBefore); // old paid/key flags do not authorize
   m.blocked=Boolean(m.blocked);
   delete m.paid;
  });
 });
 Object.keys(raw.tenants).forEach(id=>{
  const t=raw.tenants[id];
  t.users=Array.isArray(t.users)?t.users:[];
  t.audit=Array.isArray(t.audit)?t.audit:[];
  const old=Array.isArray(t.vessels)?t.vessels:[];
  if(!Array.isArray(t.objects))t.objects=old;
  t.objects=t.objects.map((v,i)=>{
   if(!v.fields||typeof v.fields!=='object'){
    v={...v,fields:{shipName:v.name||'',imo:v.imo||'',shipType:v.type||'',
     flag:v.flag||'',callSign:v.callSign||''}};
   }
   v.id=String(v.id||newId('object'));
   if(/^\d{7}$/.test(v.id))v.id=newId('object');
   v.objectTypeId=v.objectTypeId||'vessels';
   v.status=STATUSES.includes(v.status)?v.status:(previous<VERSION?'active':'inactive');
   v.holds=Array.isArray(v.holds)?v.holds:[];
   v.holdTotals=v.holdTotals&&typeof v.holdTotals==='object'?v.holdTotals:{};
   v.history=Array.isArray(v.history)?v.history:[];
   v.updatedAt=v.updatedAt||'';
   return v;
  });
  t.users.forEach((u,i)=>{
   if(!ROLES.some(r=>r.id===u.role))u.role='office';
   if(!u.id)u.id='legacy-'+id+'-'+i;
   if(!Array.isArray(u.objectIds)){
    const matched=t.objects.find(v=>v.objectTypeId==='vessels'&&v.fields.imo===u.vesselImo);
    u.objectIds=matched?[matched.id]:[];
   }
   u.objectIds=[...new Set(u.objectIds.filter(v=>t.objects.some(o=>o.id===v)))];
   u.modulePermissions=Array.isArray(u.modulePermissions)?u.modulePermissions:[];
   delete u.vesselImo;delete u.password;delete u.passwordConfirm;delete u.passwordHash;
  });
  delete t.vessels; // only one canonical tenant object registry
 });
 return raw;
}
function state(){
 let raw;
 try{raw=JSON.parse(localStorage.getItem(KEY));}catch(_){raw=null;}
 return normalize(raw);
}
function save(s){
 try{localStorage.setItem(KEY,JSON.stringify(s));return true;}catch(_){return false;}
}
function company(s,id){return s.companies.find(c=>c.id===id)||null;}
function tenant(s,id){
 if(!s.tenants[id])s.tenants[id]={users:[],objects:[],audit:[]};
 return s.tenants[id];
}
function objectType(c){return OBJECT_TYPES.find(t=>t.id===c?.objectTypeId)||null;}
function vessels(s,id){return tenant(s,id).objects.filter(o=>o.objectTypeId==='vessels');}
function vesselSummary(v){
 const d=v?.fields||v||{};
 return {name:d.shipName||d.name||'',imo:d.imo||'',type:d.shipType||d.type||'',flag:d.flag||''};
}
function addAudit(s,tenantId,action,entityId,summary){
 const entry={id:newId('audit'),at:dateStamp(),actor:'demo-admin',action,entityId,summary};
 tenant(s,tenantId).audit.push(entry);
 return entry;
}
function globalEmailUsed(s,email,exceptId){
 const normalized=String(email||'').trim().toLowerCase();
 return s.companies.some(c=>c.id!==exceptId&&c.ownerEmail===normalized)||
  s.companies.some(c=>tenant(s,c.id).users.some(u=>u.id!==exceptId&&u.email===normalized));
}
function createCompany(s,name,typeId,ownerEmail){
 if(!String(name||'').trim()||!validType(typeId))throw Error('Укажите компанию и поддерживаемый тип объектов.');
 const email=String(ownerEmail||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Укажите e-mail первого владельца.');
 if(globalEmailUsed(s,email))throw Error('Этот e-mail уже используется другой учётной записью.');
 const next=s.nextTenantNumber||2,id='tenant_db_'+String(next).padStart(6,'0');
 s.nextTenantNumber=next+1;
 const c={id,name:String(name).trim(),ownerEmail:email,objectTypeId:typeId,status:'active',
  systemLicense:null,modules:{}};
 s.companies.push(c);s.tenants[id]={users:[],objects:[],audit:[]};
 addAudit(s,id,'company.create',id,'Создана компания с типом объектов '+typeId);
 return c;
}
function setCompanyArchived(s,id,archived){
 const c=company(s,id);
 if(!c)throw Error('Компания не найдена.');
 c.status=archived?'archived':'active';
 addAudit(s,id,archived?'company.archive':'company.restore',id,'Изменён статус компании');
 return c;
}
function setObjectStatus(s,id,objectId,status){
 const c=company(s,id),t=tenant(s,id),obj=t.objects.find(o=>o.id===objectId);
 if(!c||!obj)throw Error('Объект не найден в компании.');
 if(c.status==='archived')throw Error('Компания архивирована.');
 if(!STATUSES.includes(status))throw Error('Неверный статус.');
 if(obj.status==='archived'&&status!=='inactive')throw Error('Из архива можно восстановить только в inactive.');
 if(obj.status!=='archived'&&status==='inactive'&&obj.status==='inactive')return obj;
 if(status==='active'){
  for(const [moduleId,m] of Object.entries(c.modules)){
   if(!m.assignedObjectIds?.includes(objectId))continue;
   const count=t.objects.filter(o=>o.status==='active'&&m.assignedObjectIds.includes(o.id)&&o.id!==objectId).length;
   if(m.vesselCap!==null&&count+1>m.vesselCap)throw Error('Превышен Fleet-лимит модуля '+moduleId+'. Судно остаётся выключенным.');
  }
 }
 const old=obj.status;obj.status=status;obj.updatedAt=dateStamp();
 obj.history.push({at:obj.updatedAt,actor:'demo-admin',action:'status',from:old,to:status});
 addAudit(s,id,'object.status',objectId,old+' → '+status);
 return obj;
}
function assignUserObjects(s,id,userId,objectIds){
 const t=tenant(s,id),u=t.users.find(x=>x.id===userId);
 if(!u)throw Error('Пользователь не найден.');
 const ids=[...new Set(objectIds)];
 if(ids.some(x=>!t.objects.some(o=>o.id===x&&o.status==='active')))throw Error('Назначать можно только активные объекты.');
 u.objectIds=ids;
 addAudit(s,id,'user.objects',userId,'Назначено объектов: '+ids.length);
 return u;
}
function effectiveObjects(s,id,userId,moduleId){
 const c=company(s,id),t=tenant(s,id),u=t.users.find(x=>x.id===userId);
 const m=c?.modules?.[moduleId];
 if(!c||!u||c.status==='archived'||!m||!u.modulePermissions.includes(moduleId))return [];
 if(typeof MP_LICENSE!=='undefined'&&(!MP_LICENSE.licenseActive(c)||!MP_LICENSE.effective(s,c,moduleId)))return [];
 return t.objects.filter(o=>o.status==='active'&&m.assignedObjectIds.includes(o.id)&&u.objectIds.includes(o.id));
}
function removeUser(s,id,userId){
 const t=tenant(s,id),before=t.users.length;
 t.users=t.users.filter(u=>u.id!==userId);
 if(before===t.users.length)throw Error('Пользователь не найден.');
 addAudit(s,id,'user.remove',userId,'Удалена демонстрационная учётная запись');
}
function escape(value){
 return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
}
function countEnabled(c){
 return MODULES.filter(m=>c.modules?.[m.id]?.enabled&&c.modules?.[m.id]?.startsOn).length;
}
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
window.MP={KEY,VERSION,MODULES,OBJECT_TYPES,ROLES,STATUSES,newId,defaults,normalize,state,save,
 company,tenant,objectType,vessels,vesselSummary,createCompany,globalEmailUsed,setCompanyArchived,
 setObjectStatus,assignUserObjects,effectiveObjects,addAudit,escape,countEnabled,removeUser,setFeedback};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShared);else initShared();
})();

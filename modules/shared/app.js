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
/* Simulated platform_db reference table. Additional object types must come from this
   platform reference in a future backend; tenant cannot create or activate them. */
const OBJECT_TYPES=[{id:'vessels',name:'Суда (Vessels)',description:'Карточки судов и Ship Particulars'}];
const ROLES=[{id:'office',name:'Office'},{id:'vessel',name:'Vessel'}];
function defaults(){
 return {version:4,nextTenantNumber:2,companies:[{id:'tenant_db_000001',name:'Демо-компания',code:'COMP-001',objectTypes:['vessels'],modules:{}}],
   tenants:{tenant_db_000001:{users:[],vessels:[]}},licenses:[],licenseRequests:[]};
}
function normalize(raw){
 if(!raw||!Array.isArray(raw.companies)||!raw.tenants)return defaults();
 raw.version=4;
 if(!Number.isInteger(raw.nextTenantNumber)||raw.nextTenantNumber<1){
  const existing=raw.companies.map(c=>Number(c.id?.match(/tenant_db_(\d+)$/)?.[1]||0));
  raw.nextTenantNumber=Math.max(1,...existing)+1;
 }
 if(!Array.isArray(raw.licenses))raw.licenses=[];
 if(!Array.isArray(raw.licenseRequests))raw.licenseRequests=[];
 raw.companies.forEach(c=>{
   if(!Array.isArray(c.objectTypes))c.objectTypes=['vessels']; // migration of older mock companies
   c.objectTypes=c.objectTypes.filter(id=>OBJECT_TYPES.some(type=>type.id===id));
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
   t.vessels=t.vessels.map(v=>{
     if(v.fields&&typeof v.fields==='object'){
       v.holds=Array.isArray(v.holds)?v.holds:[];
       return v;
     }
     return {id:v.imo||'vessel-'+String(Date.now()),fields:{
       shipName:v.name||'',imo:v.imo||'',shipType:v.type||'',flag:v.flag||'',callSign:v.callSign||''
     },holds:[],updatedAt:''};
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
function removeCompany(s,tenantId){
 const ix=s.companies.findIndex(c=>c.id===tenantId);
 if(ix<0)throw Error('Компания не найдена.');
 const removed=s.companies.splice(ix,1)[0];
 delete s.tenants[tenantId];
 s.licenses=(s.licenses||[]).filter(l=>l.tenantId!==tenantId);
 s.licenseRequests=(s.licenseRequests||[]).filter(r=>r.tenantId!==tenantId);
 return removed;
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
window.MP={KEY,MODULES,OBJECT_TYPES,ROLES,defaults,state,save,company,tenant,vesselSummary,escape,countEnabled,removeUser,removeVessel,removeCompany,setFeedback};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShared);else initShared();
})();
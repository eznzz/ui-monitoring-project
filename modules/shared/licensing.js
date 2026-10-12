/* Monitoring Project • licensing UI-only workflow. No cryptographic entitlement
   verification, payments, server-side access control, or real activation. */
(function(){
'use strict';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const stamp=()=>new Date().toISOString();
const normalizeKey=s=>String(s||'').toUpperCase().replace(/\s+/g,'').trim();
const cleanDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s))?String(s):'';
function ensure(s){
 if(!Array.isArray(s.licenses))s.licenses=[];
 if(!Array.isArray(s.licenseRequests))s.licenseRequests=[];
 return s;
}
function byCompany(s,tenantId){
 ensure(s);return s.licenses.filter(l=>l.tenantId===tenantId);
}
function requestsByCompany(s,tenantId){
 ensure(s);return s.licenseRequests.filter(r=>r.tenantId===tenantId).slice().reverse();
}
function isCurrent(l){
 const t=today();
 return Boolean(l&&!l.revokedAt&&cleanDate(l.expiresAt)>=t&&cleanDate(l.issuedAt)<=t);
}
function approved(s,c,moduleId){
 ensure(s);
 return s.licenseRequests.some(r=>{
  const l=s.licenses.find(x=>x.id===r.licenseId);
  return r.tenantId===c?.id&&r.moduleId===moduleId&&r.status==='approved'&&l?.moduleId===moduleId&&l?.tenantId===c?.id&&isCurrent(l);
 });
}
function effective(s,c,moduleId){
 return Boolean(c?.modules?.[moduleId]?.paid&&c?.modules?.[moduleId]?.enabled&&approved(s,c,moduleId));
}
function randomKey(){
 const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const bytes=new Uint8Array(16);
 if(!globalThis.crypto?.getRandomValues)throw Error('Невозможно создать демо-ключ в этом браузере.');
 crypto.getRandomValues(bytes);
 const blocks=[];
 for(let i=0;i<16;i+=4){blocks.push(Array.from(bytes.slice(i,i+4),b=>chars[b%chars.length]).join(''));}
 return 'MP-'+blocks.join('-');
}
function issue(s,tenantId,moduleId,expiresAt){
 ensure(s);
 const c=MP.company(s,tenantId);
 if(!c)throw Error('Компания не найдена.');
 if(!MP.MODULES.some(m=>m.id===moduleId))throw Error('Модуль не найден.');
 if(!c.modules?.[moduleId]?.paid)throw Error('Сначала отметьте оплату модуля в Platform.');
 if(!cleanDate(expiresAt)||expiresAt<today())throw Error('Укажите актуальную дату окончания.');
 let key;
 for(let i=0;i<5;i++){key=randomKey();if(!s.licenses.some(l=>l.key===key))break;}
 if(s.licenses.some(l=>l.key===key))throw Error('Не удалось получить уникальный ключ.');
 const l={id:'lic-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),key,tenantId,moduleId,
   issuedAt:today(),expiresAt,revokedAt:null};
 s.licenses.push(l);return l;
}
function request(s,tenantId,input){
 ensure(s);
 const key=normalizeKey(input);
 const l=s.licenses.find(x=>x.key===key);
 if(!l)throw Error('Лицензионный ключ не найден.');
 if(l.tenantId!==tenantId)throw Error('Ключ назначен другой компании.');
 if(!isCurrent(l))throw Error('Срок действия ключа истёк или он отозван.');
 const c=MP.company(s,tenantId);
 if(!c?.modules?.[l.moduleId]?.paid)throw Error('Оплата модуля ещё не подтверждена платформой.');
 if(s.licenseRequests.some(r=>r.licenseId===l.id&&['pending','approved'].includes(r.status))){
  throw Error('Запрос по этому ключу уже создан.');
 }
 const r={id:'req-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),licenseId:l.id,
  tenantId,moduleId:l.moduleId,status:'pending',requestedAt:stamp(),reviewedAt:null};
 s.licenseRequests.push(r);return {license:l,request:r};
}
function decide(s,requestId,approve){
 ensure(s);
 const r=s.licenseRequests.find(x=>x.id===requestId);
 if(!r||r.status!=='pending')throw Error('Ожидающий запрос не найден.');
 const l=s.licenses.find(x=>x.id===r.licenseId),c=MP.company(s,r.tenantId);
 if(!c||!l||l.tenantId!==c.id||l.moduleId!==r.moduleId)throw Error('Ключ или компания не найдены.');
 if(approve&&(!isCurrent(l)||!c.modules?.[r.moduleId]?.paid))throw Error('Нельзя подключить неоплаченный модуль по недействующему ключу.');
 r.status=approve?'approved':'rejected';r.reviewedAt=stamp();
 if(approve)c.modules[r.moduleId]={...c.modules[r.moduleId],paid:true,enabled:true};
 return r;
}
function revoke(s,id){
 ensure(s);const l=s.licenses.find(x=>x.id===id);
 if(!l)throw Error('Ключ не найден.');
 if(l.revokedAt)return l;
 l.revokedAt=stamp();
 s.licenseRequests.filter(r=>r.licenseId===id&&r.status==='pending').forEach(r=>{r.status='rejected';r.reviewedAt=stamp();});
 const c=MP.company(s,l.tenantId);
 if(c?.modules?.[l.moduleId]&&!s.licenses.some(x=>x.id!==id&&x.moduleId===l.moduleId&&x.tenantId===l.tenantId&&isCurrent(x)&&s.licenseRequests.some(r=>r.licenseId===x.id&&r.status==='approved'))){
  c.modules[l.moduleId].enabled=false;
 }
 return l;
}
function formatDate(value){
 if(!value)return '—';
 const dt=new Date(String(value).length===10?value+'T12:00:00':value);
 return Number.isNaN(dt.getTime())?'—':new Intl.DateTimeFormat('ru-RU',{year:'numeric',month:'2-digit',day:'2-digit'}).format(dt);
}
window.MP_LICENSE={ensure,byCompany,requestsByCompany,isCurrent,approved,effective,issue,request,decide,revoke,formatDate,today,normalizeKey};
})();
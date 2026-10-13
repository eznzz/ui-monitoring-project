/* UI-only commercial mock. Backend will enforce all entitlements and limits. */
(function(){
'use strict';
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const stamp=()=>new Date().toISOString();
function nextDay(date){
 const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);
 return d.toISOString().slice(0,10);
}
function dateOk(value){return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(Date.parse(value));}
function validRange(start,end){return dateOk(start)&&dateOk(end)&&start<end;}
function activeRange(item){
 const date=today();
 return Boolean(item&&validRange(item.startsOn,item.endsBefore)&&item.startsOn<=date&&date<item.endsBefore);
}
function licenseActive(c){return Boolean(c?.status==='active'&&activeRange(c?.systemLicense));}
function effective(s,c,moduleId){
 const m=c?.modules?.[moduleId];
 return Boolean(licenseActive(c)&&m?.enabled&&!m.blocked&&activeRange(m));
}
function setSystemLicense(s,c,startsOn,endsBefore){
 if(!c)throw Error('Компания не выбрана.');
 if(!validRange(startsOn,endsBefore))throw Error('Проверьте даты системной лицензии: конец не включён.');
 c.systemLicense={startsOn,endsBefore,updatedAt:stamp()};
 MP.addAudit(s,c.id,'license.update',c.id,'Системная лицензия '+startsOn+' — '+endsBefore);
 return c.systemLicense;
}
function setSubscription(s,c,moduleId,{startsOn,endsBefore,vesselCap,enabled,blocked}){
 if(!c||!MP.MODULES.some(m=>m.id===moduleId))throw Error('Модуль не найден.');
 const cap=vesselCap===null?null:Number(vesselCap);
 if(cap!==null&&(!Number.isInteger(cap)||cap<0))throw Error('Лимит Fleet должен быть неотрицательным целым числом.');
 if(enabled&&!validRange(startsOn,endsBefore))throw Error('Укажите действительный период подписки.');
 const prev=c.modules[moduleId]||{};
 const ids=Array.isArray(prev.assignedObjectIds)?prev.assignedObjectIds:[];
 const activeCount=MP.tenant(s,c.id).objects.filter(o=>o.status==='active'&&ids.includes(o.id)).length;
 if(enabled&&cap!==null&&activeCount>cap)throw Error('Лимит меньше количества уже назначенных активных судов.');
 c.modules[moduleId]={...prev,startsOn:startsOn||'',endsBefore:endsBefore||'',vesselCap:cap,
  enabled:Boolean(enabled),blocked:Boolean(blocked),assignedObjectIds:ids,updatedAt:stamp()};
 MP.addAudit(s,c.id,'subscription.update',moduleId,'Подписка изменена вручную (демо)');
 return c.modules[moduleId];
}
function assignModuleObjects(s,c,moduleId,ids){
 if(!c?.modules?.[moduleId]?.enabled)throw Error('Сначала оформите подписку на модуль.');
 const objects=MP.tenant(s,c.id).objects;
 const requested=[...new Set(ids)];
 if(requested.some(id=>!objects.some(o=>o.id===id&&o.status==='active'&&o.objectTypeId===c.objectTypeId)))
  throw Error('Выбирать можно только активные объекты своей компании.');
 const entry=c.modules[moduleId];
 if(entry.vesselCap!==null&&requested.length>entry.vesselCap)throw Error('Превышен Fleet-лимит модуля.');
 entry.assignedObjectIds=requested;entry.updatedAt=stamp();
 MP.addAudit(s,c.id,'subscription.objects',moduleId,'Назначено объектов: '+requested.length);
 return entry;
}
function request(s,c,moduleId,comment){
 if(!c||!MP.MODULES.some(m=>m.id===moduleId))throw Error('Выберите модуль.');
 if(!Array.isArray(s.moduleRequests))s.moduleRequests=[];
 const record={id:MP.newId('request'),tenantId:c.id,moduleId,
  comment:String(comment||'').slice(0,500),status:'pending',createdAt:stamp()};
 s.moduleRequests.push(record);
 MP.addAudit(s,c.id,'subscription.request',moduleId,'Обращение отправлено (не меняет подписку)');
 return record;
}
function requestsByCompany(s,id){return (s.moduleRequests||[]).filter(r=>r.tenantId===id).slice().reverse();}
function formatDate(value){
 if(!value)return '—';
 const dt=new Date(String(value).length===10?value+'T12:00:00':value);
 return Number.isNaN(dt.getTime())?'—':new Intl.DateTimeFormat('ru-RU',{year:'numeric',month:'2-digit',day:'2-digit'}).format(dt);
}
window.MP_LICENSE={today,nextDay,activeRange,licenseActive,effective,setSystemLicense,setSubscription,
 assignModuleObjects,request,requestsByCompany,formatDate};
})();

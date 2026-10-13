(function(){
'use strict';
const $=id=>document.getElementById(id);
let data=MP.state(), selected=data.companies[0]?.id||'',activeTab='profile';
const list=$('company-list'),modules=$('platform-module-list'),search=$('company-search'),dialog=$('company-dialog');
function selectedCompany(){return MP.company(data,selected);}
function store(){if(!MP.save(data))MP.setFeedback('platform-feedback','Не удалось сохранить демонстрационные данные.',true);}
function typeLabels(c){
 return (c.objectTypes||[]).map(id=>MP.OBJECT_TYPES.find(t=>t.id===id)?.name||id);
}
function renderCompanyList(){
 const q=search.value.trim().toLowerCase();
 const matches=data.companies.filter(c=>[c.name,c.id].some(v=>v.toLowerCase().includes(q)));
 $('company-list-count').textContent=matches.length;
 list.replaceChildren();
 if(!matches.length){const p=document.createElement('p');p.className='mp-empty';p.textContent=data.companies.length?'По запросу ничего не найдено.':'Компаний пока нет. Нажмите «Новая компания».';list.append(p);return;}
 matches.forEach(c=>{
  const b=document.createElement('button');b.type='button';b.className='mp-record mp-record--button';
  b.setAttribute('aria-pressed',String(c.id===selected));
  b.innerHTML='<span><strong>'+MP.escape(c.name)+'</strong><small>'+MP.escape(c.id)+(c.status==='archived'?' · Архив':'')+'</small></span><i class="fa-solid fa-chevron-right mp-muted" aria-hidden="true"></i>';
  b.addEventListener('click',()=>{selected=c.id;render();});
  list.append(b);
 });
}
function renderModules(c){
 modules.replaceChildren();
 MP.MODULES.forEach(m=>{
  const entry=c.modules[m.id]||{paid:false,enabled:false};
  const row=document.createElement('div');row.className='mp-module';
  const paidId='paid-'+m.id,enabledId='enabled-'+m.id;
  row.innerHTML='<div><strong>'+MP.escape(m.name)+'</strong><small>'+MP.escape(m.detail)+'</small></div>'+
  '<label class="mp-module-check" for="'+paidId+'"><input type="checkbox" id="'+paidId+'" data-action="paid" data-module="'+m.id+'"'+(entry.paid?' checked':'')+(c.status==='archived'?' disabled':'')+'>Оплачено</label>'+
  '<label class="mp-module-check" for="'+enabledId+'" title="Активация после запроса компании и подтверждения на платформе"><input type="checkbox" id="'+enabledId+'" disabled'+(MP_LICENSE.effective(data,c,m.id)?' checked':'')+'>Включён</label>';
  modules.append(row);
 });
 const enabled=MP.MODULES.filter(m=>MP_LICENSE.effective(data,c,m.id)).length,paid=MP.MODULES.filter(m=>c.modules?.[m.id]?.paid).length;
 $('modules-counter').textContent=enabled+' включено / '+paid+' оплачено';
 $('company-active-modules').textContent=enabled+' из '+MP.MODULES.length;
}

function moduleName(id){return MP.MODULES.find(m=>m.id===id)?.name||id;}
function renderLicensePanel(company){
 const licenseList=$('platform-license-keys'),requestList=$('platform-license-requests');
 const moduleSelect=$('platform-license-module'),previous=moduleSelect.value;
 moduleSelect.replaceChildren();
 const initial=new Option('Выберите оплаченный модуль','');
 moduleSelect.add(initial);
 MP.MODULES.filter(m=>company.modules?.[m.id]?.paid).forEach(m=>moduleSelect.add(new Option(m.name,m.id)));
 if([...moduleSelect.options].some(o=>o.value===previous))moduleSelect.value=previous;
 const expiration=$('platform-license-expiry');
 expiration.min=MP_LICENSE.today();
 if(!expiration.value||expiration.value<expiration.min){
  const next=new Date();
  next.setFullYear(next.getFullYear()+1);
  expiration.value=next.toISOString().slice(0,10);
 }
 licenseList.replaceChildren();
 const licenses=MP_LICENSE.byCompany(data,company.id).slice().reverse();
 if(!licenses.length){
  const empty=document.createElement('p');empty.className='mp-empty';empty.textContent='Для компании пока не выпускались лицензионные ключи.';licenseList.append(empty);
 }
 licenses.forEach(license=>{
  const record=document.createElement('article');record.className='mp-record mp-license-record';
  const info=document.createElement('div');info.className='mp-stack';info.style.gap='5px';
  const title=document.createElement('strong');title.textContent=moduleName(license.moduleId);
  const key=document.createElement('code');key.className='mp-license-key';key.textContent=license.key;
  const dates=document.createElement('small');dates.textContent='Выпущен: '+MP_LICENSE.formatDate(license.issuedAt)+' · До: '+MP_LICENSE.formatDate(license.expiresAt);
  const valid=MP_LICENSE.isCurrent(license);
  const current=MP_LICENSE.effective(data,company,license.moduleId)&&data.licenseRequests.some(r=>r.licenseId===license.id&&r.status==='approved');
  const status=document.createElement('span');status.className='mp-badge';
  status.textContent=license.revokedAt?'Отозван':valid?(current?'Подключён':'Выдан'):'Истёк';
  info.append(title,key,dates,status);
  const actions=document.createElement('div');actions.className='mp-row';
  const copy=document.createElement('button');copy.type='button';copy.className='mp-btn mp-btn--secondary';copy.textContent='Копировать';
  copy.dataset.copyLicense=license.id;
  actions.append(copy);
  if(valid){
   const revoke=document.createElement('button');revoke.type='button';revoke.className='mp-btn mp-btn--secondary';revoke.dataset.revokeLicense=license.id;revoke.textContent='Отозвать';
   actions.append(revoke);
  }
  record.append(info,actions);licenseList.append(record);
 });
 requestList.replaceChildren();
 const requests=MP_LICENSE.requestsByCompany(data,company.id);
 $('platform-requests-count').textContent=requests.filter(r=>r.status==='pending').length;
 if(!requests.length){
  const empty=document.createElement('p');empty.className='mp-empty';empty.textContent='Пока нет запросов на подключение.';requestList.append(empty);
 }
 requests.forEach(request=>{
  const license=data.licenses.find(l=>l.id===request.licenseId);
  const record=document.createElement('article');record.className='mp-record mp-license-record';
  const info=document.createElement('div');info.className='mp-stack';info.style.gap='5px';
  const title=document.createElement('strong');title.textContent=moduleName(request.moduleId);
  const dates=document.createElement('small');
  dates.textContent='Запрошен: '+MP_LICENSE.formatDate(request.requestedAt)+' · До: '+MP_LICENSE.formatDate(license?.expiresAt);
  const status=document.createElement('span');status.className='mp-badge';
  status.textContent=request.status==='pending'?'Ожидает решения':request.status==='approved'?'Подключён':'Отклонён';
  info.append(title,dates,status);
  const actions=document.createElement('div');actions.className='mp-row';
  if(request.status==='pending'){
   const approve=document.createElement('button');approve.type='button';approve.className='mp-btn mp-btn--primary';approve.dataset.requestAction='approve';approve.dataset.requestId=request.id;approve.textContent='Подключить';
   const reject=document.createElement('button');reject.type='button';reject.className='mp-btn mp-btn--secondary';reject.dataset.requestAction='reject';reject.dataset.requestId=request.id;reject.textContent='Отклонить';
   actions.append(approve,reject);
  }
  record.append(info,actions);requestList.append(record);
 });
}
$('platform-license-form').addEventListener('submit',event=>{
 event.preventDefault();
 const moduleId=$('platform-license-module').value,expiresAt=$('platform-license-expiry').value;
 try{
  const license=MP_LICENSE.issue(data,selected,moduleId,expiresAt);
  store();render();
  MP.setFeedback('platform-license-feedback','Демо-ключ для '+moduleName(license.moduleId)+' выпущен '+MP_LICENSE.formatDate(license.issuedAt)+'. Передайте его администратору компании.',false);
 }catch(error){MP.setFeedback('platform-license-feedback',error.message,true);}
});
$('platform-license-keys').addEventListener('click',async event=>{
 const btn=event.target.closest('[data-copy-license],[data-revoke-license]');
 if(!btn)return;
 if(btn.dataset.copyLicense){
  const license=data.licenses.find(l=>l.id===btn.dataset.copyLicense&&l.tenantId===selected);
  if(!license)return;
  try{
   if(!navigator.clipboard?.writeText)throw Error('Функция копирования недоступна: выделите и скопируйте ключ.');
   await navigator.clipboard.writeText(license.key);
   MP.setFeedback('platform-license-feedback','Ключ скопирован (демо).',false);
  }catch(err){MP.setFeedback('platform-license-feedback',err.message,true);}
 }else{
  try{
   const l=data.licenses.find(x=>x.id===btn.dataset.revokeLicense&&x.tenantId===selected);
   if(!l)return;
   MP_LICENSE.revoke(data,l.id);
   store();render();
   MP.setFeedback('platform-license-feedback','Ключ отозван; доступ по нему прекращён.',false);
  }catch(err){MP.setFeedback('platform-license-feedback',err.message,true);}
 }
});
$('platform-license-requests').addEventListener('click',event=>{
 const btn=event.target.closest('[data-request-action]');
 if(!btn)return;
 const request=data.licenseRequests.find(r=>r.id===btn.dataset.requestId&&r.tenantId===selected);
 if(!request)return;
 try{
  MP_LICENSE.decide(data,request.id,btn.dataset.requestAction==='approve');
  store();render();
  MP.setFeedback('platform-request-feedback','Запрос рассмотрен '+MP_LICENSE.formatDate(new Date().toISOString())+'. Решение сохранено в демонстрационных данных.',false);
 }catch(err){MP.setFeedback('platform-request-feedback',err.message,true);}
});

function renderPlatformDashboard(){
 const companies=data.companies.length;
 const paid=data.companies.reduce((n,c)=>n+MP.MODULES.filter(m=>c.modules?.[m.id]?.paid).length,0);
 $('platform-tile-companies').textContent=companies+' компаний';
 $('platform-tile-paid').textContent=paid+' оплачено';
 $('platform-tile-keys').textContent=(data.licenses||[]).length+' ключей';
}
function routeFromHash(){
 const key=decodeURIComponent(location.hash.slice(1));
 return ['dashboard','companies','modules','keys','principles'].includes(key)?key:
  key==='license-workspace'?'keys':'dashboard';
}
function openPlatformPage(page,updateLocation=true){
 if(!['dashboard','companies','modules','keys','principles'].includes(page))page='dashboard';
 $('platform-dashboard').hidden=page!=='dashboard';
 $('platform-work-area').hidden=!['companies','modules','keys'].includes(page);
 $('principles').hidden=page!=='principles';
 const pane={companies:'profile',modules:'licenses',keys:'keys'}[page];
 if(pane)chooseTab(pane);
 document.querySelectorAll('.mp-sidebar-nav [data-platform-section]').forEach(a=>{
  const active=a.dataset.platformSection===page;
  a.classList.toggle('active',active);
  if(active)a.setAttribute('aria-current','page');
  else a.removeAttribute('aria-current');
 });
 $('platform-topbar-title').textContent='Platform / '+({
  dashboard:'Главная',companies:'Компании',modules:'Подписка и модули',
  keys:'Лицензионные ключи',principles:'Правила подключения'
 }[page]);
 if(updateLocation){
  history.replaceState(null,'',location.pathname+location.search+'#'+page);
  window.scrollTo({top:0,behavior:'instant'});
 }
}
document.querySelectorAll('[data-platform-section]').forEach(link=>{
 link.addEventListener('click',event=>{
  event.preventDefault();openPlatformPage(link.dataset.platformSection);
 });
});
window.addEventListener('hashchange',()=>openPlatformPage(routeFromHash(),false));

function chooseTab(id,focus){
 activeTab=id;
 ['profile','licenses','keys'].forEach(tab=>{
  const button=$('platform-tab-'+tab),panel=$('platform-pane-'+tab),active=tab===id;
  button.setAttribute('aria-selected',String(active));
  button.tabIndex=active?0:-1;panel.hidden=!active;
 });
 if(focus)$('platform-tab-'+id).focus();
}
document.querySelectorAll('[data-platform-tab]').forEach(button=>{
 button.addEventListener('click',()=>openPlatformPage(({profile:'companies',licenses:'modules',keys:'keys'})[button.dataset.platformTab]));
 button.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const tabs=['profile','licenses','keys'];
  const current=tabs.indexOf(button.dataset.platformTab);
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(current+1)%tabs.length:(current+tabs.length-1)%tabs.length;
  openPlatformPage(({profile:'companies',licenses:'modules',keys:'keys'})[tabs[next]]);
  $('platform-tab-'+tabs[next]).focus();
 });
});
function render(){
 if(!selectedCompany())selected=data.companies[0]?.id||'';
 renderCompanyList();
 const c=selectedCompany();
 $('company-detail-workspace').hidden=!c;
 renderPlatformDashboard();
 if(!c)return;
 $('selected-company-heading').textContent=c.name;
 $('selected-company-id').textContent=c.id;
 $('company-tenant-id').textContent=c.id;
 $('company-types').textContent=typeLabels(c).join(', ')||'Не выбран';
 $('company-owner-email').textContent=c.ownerEmail||'Не задан в старом mock';
 $('company-template').textContent=c.templateId||'Неизвестен';
 $('company-state').textContent=(c.status==='archived'?'В архиве':'Активна')+' · '+(c.provisioningStatus==='ready'?'mock Tenant готов':c.provisioningStatus);
 $('company-status-button').innerHTML=c.status==='archived'?'<i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Восстановить компанию':'<i class="fa-solid fa-box-archive" aria-hidden="true"></i> Архивировать компанию';
 const openTenant=$('open-tenant');
 if(c.status==='archived'){openTenant.removeAttribute('href');openTenant.setAttribute('aria-disabled','true');openTenant.tabIndex=-1;}
 else{openTenant.href='../tenant/index.html?tenant='+encodeURIComponent(c.id);openTenant.removeAttribute('aria-disabled');openTenant.tabIndex=0;}
 renderModules(c);renderLicensePanel(c);chooseTab(activeTab);
}
modules.addEventListener('change',e=>{
 const input=e.target.closest('input[data-module][data-action]');
 if(!input)return;
 const c=selectedCompany(),id=input.dataset.module,action=input.dataset.action;
 if(!c||!MP.MODULES.some(m=>m.id===id))return;
 if(c.status==='archived'){render();MP.setFeedback('modules-feedback','Архивная компания не изменяется в демо.',true);return;}
 const entry=c.modules[id]||{paid:false,enabled:false};
 if(action!=='paid')return;
 entry.paid=input.checked;
 if(!entry.paid)entry.enabled=false;
 c.modules[id]=entry;
 const restore=input.id;
 store();render();
 $(restore)?.focus();
 MP.setFeedback('modules-feedback',MP.MODULES.find(m=>m.id===id).name+': '+(entry.paid?'оплата отмечена; выдайте ключ и подтвердите запрос для подключения':'оплата снята и доступ отключён')+' · mock-режим.',false);
});
search.addEventListener('input',renderCompanyList);
function renderTypes(){
 const select=$('company-object-types');
 select.replaceChildren(new Option('Выберите тип объектов',''));
 MP.availableObjectTypes().forEach(type=>select.add(new Option(type.name,type.id)));
 select.value='';
}
$('company-status-button').addEventListener('click',async()=>{
 const c=selectedCompany();if(!c)return;
 const restore=c.status==='archived';
 const ok=await MP_CONFIRM.action({
  title:(restore?'Восстановить':'Архивировать')+' компанию «'+c.name+'»?',
  description:restore?'Восстановление снимет архивный статус (mock), сохранив данные.':
   'Компания будет архивирована; пользователи, суда и подписки останутся в демо.',
  buttonLabel:restore?'Восстановить':'Архивировать'
 });
 if(!ok)return;
 try{
  MP.setCompanyArchived(data,c.id,!restore);
  store();render();
  MP.setFeedback('platform-feedback','Компания «'+c.name+'»: '+(restore?'восстановлена':'архивирована')+' (mock).',false);
 }catch(error){MP.setFeedback('platform-feedback',error.message,true);}
});
$('add-company-button').addEventListener('click',()=>{
 $('company-form').reset();$('company-form-error').textContent='';renderTypes();
 dialog.showModal();$('new-company-name').focus();
});
$('cancel-company').addEventListener('click',()=>dialog.close());
document.querySelector('[data-dialog-close="company-dialog"]')?.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('company-form').addEventListener('submit',e=>{
 e.preventDefault();
 try{
  const created=MP.createMockCompany(data,{
   name:$('new-company-name').value,
   ownerEmail:$('new-owner-email').value,
   objectTypeId:$('company-object-types').value
  });
  if(!MP.save(data))throw Error('Браузер не сохранил mock Tenant.');
  selected=created.id;search.value='';activeTab='profile';
  dialog.close();render();openPlatformPage('companies');
  MP.setFeedback('platform-feedback','Компания «'+created.name+'» подготовлена по '+created.templateId+' (mock, не API).',false);
 }catch(error){$('company-form-error').textContent=error.message;}
});
window.addEventListener('storage',e=>{if(e.key===MP.KEY){data=MP.state();render();}});
renderTypes();render();openPlatformPage(routeFromHash(),false);
})();

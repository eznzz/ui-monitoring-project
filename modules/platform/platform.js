(function(){
'use strict';
const $=id=>document.getElementById(id);
let data=MP.state(),selected=data.companies[0]?.id||'',activeTab='profile';
const list=$('company-list'),modules=$('platform-module-list'),search=$('company-search'),dialog=$('company-dialog');
const current=()=>MP.company(data,selected);
const save=()=>{if(!MP.save(data))throw Error('Не удалось сохранить демонстрационные данные.');};
const typeName=c=>MP.objectType(c)?.name||'Тип не определён';
const moduleName=id=>MP.MODULES.find(m=>m.id===id)?.name||id;
const format=MP_LICENSE.formatDate;
function notice(id,message,error=false){MP.setFeedback(id,message,error);}
function renderCompanyList(){
 const q=search.value.trim().toLowerCase(),matches=data.companies.filter(c=>[c.name,c.id,c.ownerEmail].some(v=>String(v||'').toLowerCase().includes(q)));
 $('company-list-count').textContent=matches.length;list.replaceChildren();
 if(!matches.length){const p=document.createElement('p');p.className='mp-empty';p.textContent=data.companies.length?'По запросу ничего не найдено.':'Создайте компанию.';list.append(p);return;}
 matches.forEach(c=>{
  const button=document.createElement('button');button.type='button';button.className='mp-record mp-record--button';
  button.setAttribute('aria-pressed',String(c.id===selected));
  const title=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
  strong.textContent=c.name+(c.status==='archived'?' · Архив':'');
  small.textContent=c.id+' · '+typeName(c);title.append(strong,small);
  const arrow=document.createElement('i');arrow.className='fa-solid fa-chevron-right mp-muted';arrow.setAttribute('aria-hidden','true');
  button.append(title,arrow);button.addEventListener('click',()=>{selected=c.id;render();});list.append(button);
 });
}
function renderModules(c){
 modules.replaceChildren();
 MP.MODULES.forEach(m=>{
  const sub=c.modules[m.id],effective=MP_LICENSE.effective(data,c,m.id);
  const row=document.createElement('div');row.className='mp-module';
  const info=document.createElement('div');
  const title=document.createElement('strong');title.textContent=m.name;
  const detail=document.createElement('small');detail.textContent=m.detail;
  const state=document.createElement('small');
  state.textContent=sub?.enabled?(effective?'Доступен':sub.blocked?'Административно заблокирован':'Вне срока действия лицензии/подписки'):'Не подключён';
  info.append(title,detail,state);
  const count=document.createElement('span');count.className='mp-badge';
  count.textContent=sub?.enabled?(sub.vesselCap===null?'Unlimited':('Fleet '+sub.vesselCap)):'Не оформлен';
  const edit=document.createElement('button');edit.className='mp-btn mp-btn--secondary mp-btn--small';edit.type='button';
  edit.dataset.editModule=m.id;edit.textContent='Настроить';
  row.append(info,count,edit);modules.append(row);
 });
 const active=MP.MODULES.filter(m=>MP_LICENSE.effective(data,c,m.id)).length;
 $('modules-counter').textContent=active+' доступно из '+MP.MODULES.length;
 $('company-active-modules').textContent=active+' из '+MP.MODULES.length;
}
function populateSubscriptionForm(c){
 const sel=$('platform-license-module'),old=sel.value;
 sel.replaceChildren(new Option('Выберите модуль',''));
 MP.MODULES.forEach(m=>sel.add(new Option(m.name,m.id)));
 sel.value=old||'';
 if(!sel.value)sel.value='';
 const active=MP.vessels(data,c.id).filter(v=>v.status==='active');
 const select=$('platform-subscription-objects');select.replaceChildren();
 active.forEach(v=>select.add(new Option(MP.vesselSummary(v).name+' · IMO '+MP.vesselSummary(v).imo,v.id)));
 refreshSubscriptionSelection();
}
function refreshSubscriptionSelection(){
 const c=current(),id=$('platform-license-module').value,sub=c?.modules?.[id]||{};
 $('platform-license-start').value=sub.startsOn||MP_LICENSE.today();
 $('platform-license-expiry').value=sub.endsBefore?new Date(new Date(sub.endsBefore+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10):'';
 $('platform-license-cap').value=sub.vesselCap===null?'unlimited':String(sub.vesselCap??3);
 $('platform-license-enabled').checked=Boolean(sub.enabled);
 $('platform-license-blocked').checked=Boolean(sub.blocked);
 const selectedIds=new Set(sub.assignedObjectIds||[]);
 [...$('platform-subscription-objects').options].forEach(option=>{option.selected=selectedIds.has(option.value);});
}
function renderLicensePanel(c){
 const license=c.systemLicense;
 $('platform-system-start').value=license?.startsOn||MP_LICENSE.today();
 $('platform-system-expiry').value=license?.endsBefore?
  new Date(new Date(license.endsBefore+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10):'';
 $('platform-system-status').textContent=MP_LICENSE.licenseActive(c)?'Системная лицензия действует':
  license?'Системная лицензия вне срока или компания в архиве':'Системная лицензия не выдана';
 populateSubscriptionForm(c);
 const cards=$('platform-license-keys');cards.replaceChildren();
 MP.MODULES.filter(m=>c.modules[m.id]?.enabled).forEach(m=>{
  const sub=c.modules[m.id],el=document.createElement('article');el.className='mp-record mp-license-record';
  const info=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('small');
  title.textContent=m.name;
  const active=MP.vessels(data,c.id).filter(v=>v.status==='active'&&sub.assignedObjectIds.includes(v.id)).length;
  detail.textContent='С '+format(sub.startsOn)+' по '+format(sub.endsBefore?new Date(new Date(sub.endsBefore+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10):'')+
   ' · Fleet '+(sub.vesselCap===null?'Unlimited':sub.vesselCap)+' · активных объектов '+active;
  info.append(title,detail);
  const badge=document.createElement('span');badge.className='mp-badge';badge.textContent=MP_LICENSE.effective(data,c,m.id)?'Действует':'Недоступна';
  el.append(info,badge);cards.append(el);
 });
 if(!cards.childElementCount){const p=document.createElement('p');p.className='mp-empty';p.textContent='Подписки ещё не оформлены.';cards.append(p);}
 const requests=$('platform-license-requests');requests.replaceChildren();
 const rr=MP_LICENSE.requestsByCompany(data,c.id);
 $('platform-requests-count').textContent=rr.filter(x=>x.status==='pending').length;
 rr.forEach(req=>{
  const el=document.createElement('article');el.className='mp-record mp-license-record';
  const info=document.createElement('div');info.textContent=moduleName(req.moduleId)+' · '+format(req.createdAt)+' · '+(req.comment||'Без комментария');
  const badge=document.createElement('span');badge.className='mp-badge';badge.textContent=req.status==='pending'?'Обращение (необязательное)':'Рассмотрено';
  el.append(info,badge);requests.append(el);
 });
 if(!rr.length){const p=document.createElement('p');p.className='mp-empty';p.textContent='Обращений нет. Super Admin может оформить подписку напрямую.';requests.append(p);}
}
function renderPlatformDashboard(){
 const n=data.companies.filter(c=>c.status==='active').length;
 const enabled=data.companies.reduce((count,c)=>count+MP.MODULES.filter(m=>MP_LICENSE.effective(data,c,m.id)).length,0);
 const requests=(data.moduleRequests||[]).filter(r=>r.status==='pending').length;
 $('platform-tile-companies').textContent=n+' активных';
 $('platform-tile-paid').textContent=enabled+' подключено';
 $('platform-tile-keys').textContent=requests+' обращений';
}
function routeFromHash(){
 const value=decodeURIComponent(location.hash.slice(1));
 return ['dashboard','companies','modules','keys','principles'].includes(value)?value:'dashboard';
}
function chooseTab(id,focus){
 activeTab=id;
 ['profile','licenses','keys'].forEach(tab=>{
  const button=$('platform-tab-'+tab),panel=$('platform-pane-'+tab),on=tab===id;
  button.setAttribute('aria-selected',String(on));button.tabIndex=on?0:-1;panel.hidden=!on;
 });
 if(focus)$('platform-tab-'+id).focus();
}
function openPlatformPage(page,updateLocation=true){
 if(!['dashboard','companies','modules','keys','principles'].includes(page))page='dashboard';
 $('platform-dashboard').hidden=page!=='dashboard';
 $('platform-work-area').hidden=!['companies','modules','keys'].includes(page);
 $('principles').hidden=page!=='principles';
 const pane={companies:'profile',modules:'licenses',keys:'keys'}[page];
 if(pane)chooseTab(pane);
 document.querySelectorAll('.mp-sidebar-nav [data-platform-section]').forEach(a=>{
  const on=a.dataset.platformSection===page;a.classList.toggle('active',on);
  if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 });
 $('platform-topbar-title').textContent='Platform / '+({
  dashboard:'Главная',companies:'Компании',modules:'Подписки и модули',
  keys:'Лицензия и условия',principles:'Правила подключения'}[page]);
 if(updateLocation){history.replaceState(null,'',location.pathname+location.search+'#'+page);window.scrollTo({top:0,behavior:'instant'});}
}
document.querySelectorAll('[data-platform-section]').forEach(link=>link.addEventListener('click',e=>{
 e.preventDefault();openPlatformPage(link.dataset.platformSection);
}));
window.addEventListener('hashchange',()=>openPlatformPage(routeFromHash(),false));
document.querySelectorAll('[data-platform-tab]').forEach(button=>{
 button.addEventListener('click',()=>openPlatformPage(({profile:'companies',licenses:'modules',keys:'keys'})[button.dataset.platformTab]));
 button.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();const tabs=['profile','licenses','keys'];
  const i=tabs.indexOf(button.dataset.platformTab),next=e.key==='Home'?0:e.key==='End'?2:e.key==='ArrowRight'?(i+1)%3:(i+2)%3;
  openPlatformPage(({profile:'companies',licenses:'modules',keys:'keys'})[tabs[next]]);
  $('platform-tab-'+tabs[next]).focus();
 });
});
function render(){
 if(!current())selected=data.companies[0]?.id||'';
 renderCompanyList();const c=current();renderPlatformDashboard();
 $('company-detail-workspace').hidden=!c;if(!c)return;
 $('selected-company-heading').textContent=c.name;
 $('selected-company-id').textContent=c.id;
 $('company-tenant-id').textContent=c.id;
 $('company-types').textContent=typeName(c);
 $('company-owner-email').textContent=c.ownerEmail||'Не задан (демоданные прежней версии)';
 $('company-status').textContent=c.status==='archived'?'Архив':'Активна';
 $('delete-company-button').textContent=c.status==='archived'?'Восстановить компанию':'Архивировать компанию';
 $('open-tenant').hidden=c.status==='archived';
 $('open-tenant').href='../tenant/index.html?tenant='+encodeURIComponent(c.id);
 renderModules(c);renderLicensePanel(c);chooseTab(activeTab);
}
modules.addEventListener('click',e=>{
 const btn=e.target.closest('[data-edit-module]');if(!btn)return;
 openPlatformPage('keys');$('platform-license-module').value=btn.dataset.editModule;refreshSubscriptionSelection();
 $('platform-license-module').focus();
});
$('platform-license-module').addEventListener('change',refreshSubscriptionSelection);
$('platform-system-form').addEventListener('submit',e=>{
 e.preventDefault();const c=current();if(!c)return;
 try{
  MP_LICENSE.setSystemLicense(data,c,$('platform-system-start').value,
   MP_LICENSE.nextDay($('platform-system-expiry').value));
  save();render();notice('platform-license-feedback','Системная лицензия назначена вручную (демо).');
 }catch(err){notice('platform-license-feedback',err.message,true);}
});
$('platform-license-form').addEventListener('submit',e=>{
 e.preventDefault();const c=current(),id=$('platform-license-module').value;if(!c)return;
 try{
  const enabled=$('platform-license-enabled').checked;
  const input={
   startsOn:$('platform-license-start').value,
   endsBefore:MP_LICENSE.nextDay($('platform-license-expiry').value),
   vesselCap:$('platform-license-cap').value==='unlimited'?null:Number($('platform-license-cap').value),
   enabled,blocked:$('platform-license-blocked').checked
  };
  MP_LICENSE.setSubscription(data,c,id,input);
  if(enabled){
   MP_LICENSE.assignModuleObjects(data,c,id,[...$('platform-subscription-objects').selectedOptions].map(o=>o.value));
  }
  save();render();notice('platform-license-feedback','Подписка и назначенные активные объекты обновлены (демо).');
 }catch(err){notice('platform-license-feedback',err.message,true);}
});
search.addEventListener('input',renderCompanyList);
function renderTypes(){
 const select=$('company-object-types');select.replaceChildren(new Option('Выберите тип объектов',''));
 MP.OBJECT_TYPES.filter(t=>t.supported).forEach(type=>select.add(new Option(type.name,type.id)));
 select.value='';
}
$('delete-company-button').addEventListener('click',()=>{
 const c=current();if(!c)return;
 const archived=c.status==='archived';
 if(!window.confirm(archived?'Восстановить компанию «'+c.name+'»? Другие ограничения сохранятся.':
  'Архивировать компанию «'+c.name+'»? Данные останутся, доступ компании будет выключен.'))return;
 try{
  MP.setCompanyArchived(data,c.id,!archived);save();render();
  notice('platform-feedback',archived?'Компания восстановлена; условия лицензии проверяются отдельно.':'Компания архивирована без удаления данных.');
 }catch(err){notice('platform-feedback',err.message,true);}
});
$('add-company-button').addEventListener('click',()=>{
 $('company-form').reset();$('company-form-error').textContent='';renderTypes();dialog.showModal();$('new-company-name').focus();
});
$('cancel-company').addEventListener('click',()=>dialog.close());
document.querySelector('[data-dialog-close="company-dialog"]')?.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('company-form').addEventListener('submit',e=>{
 e.preventDefault();
 try{
  const c=MP.createCompany(data,$('new-company-name').value,
   $('company-object-types').value,$('new-company-owner-email').value);
  save();selected=c.id;search.value='';activeTab='profile';
  dialog.close();render();openPlatformPage('companies');
  notice('platform-feedback','Компания создана: '+typeName(c)+'. Tenant-реестр объектов подготовлен (демо).');
 }catch(err){$('company-form-error').textContent=err.message;}
});
window.addEventListener('storage',e=>{if(e.key===MP.KEY){data=MP.state();render();}});
renderTypes();render();openPlatformPage(routeFromHash(),false);
})();

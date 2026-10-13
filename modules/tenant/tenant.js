(function(){
'use strict';
const $=id=>document.getElementById(id);
let data=MP.state(),view='users';
const requested=new URLSearchParams(location.search).get('tenant');
const tenantId=requested||data.companies[0]?.id||'';
if(!MP.company(data,tenantId)||MP.company(data,tenantId).status==='archived'){
 // UI-only guard: real tenant isolation and archive enforcement belong to backend.
 window.location.replace('../auth/login.html');
 return;
}
const dialog=$('user-dialog');
function company(){return MP.company(data,tenantId);}
function records(){return MP.tenant(data,tenantId);}
function store(){
 if(!MP.save(data))MP.setFeedback('tenant-user-feedback','Браузер не сохранил демоданные.',true);
}
function allowVessels(){return Boolean(company()?.objectTypes?.includes('vessels'));}
function viewSelect(next,focus){
 if(next==='vessels'&&!allowVessels())next='users';
 view=next;
 ['users','vessels','licenses'].forEach(type=>{
  const active=type===view,tab=$('tenant-tab-'+type),pane=$('tenant-pane-'+type);
  tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;pane.hidden=!active;
 });
 if(focus)$('tenant-tab-'+view).focus();
}
function renderTenantDashboard(){
 const c=company(),tenant=records();
 const pending=MP_LICENSE.requestsByCompany(data,tenantId).filter(r=>r.status==='pending').length;
 $('tenant-dashboard-id').textContent=c.id;
 $('tenant-dashboard-company').textContent=c.name+' · сведения о компании и первичная настройка';
 $('tenant-tile-users').textContent=tenant.users.length+' пользователей';
 $('tenant-tile-vessels').textContent=tenant.vessels.length+' судов';
 $('tenant-tile-pending').textContent=pending+' ожидают решения';
 $('tenant-dashboard-vessel-tile').hidden=!allowVessels();
}
function routeFromHash(){
 const route=decodeURIComponent(location.hash.slice(1));
 return ['dashboard','users','vessels','licenses'].includes(route)?route:'dashboard';
}
function showTenantPage(page,updateLocation=true){
 if(!['dashboard','users','vessels','licenses'].includes(page))page='dashboard';
 if(page==='vessels'&&!allowVessels())page='users';
 $('tenant-dashboard').hidden=page!=='dashboard';
 $('tenant-work-area').hidden=page==='dashboard';
 if(page!=='dashboard')viewSelect(page);
 document.querySelectorAll('.mp-sidebar-nav [data-tenant-section]').forEach(a=>{
  const active=a.dataset.tenantSection===page;
  a.classList.toggle('active',active);
  if(active)a.setAttribute('aria-current','page');
  else a.removeAttribute('aria-current');
 });
 $('tenant-top-name').textContent=(company()?.name||'Компания')+' / '+({
  dashboard:'Главная',users:'Пользователи',vessels:'Суда',licenses:'Лицензии'
 }[page]);
 if(updateLocation){
  history.replaceState(null,'',location.pathname+location.search+'#'+page);
  window.scrollTo({top:0,behavior:'instant'});
 }
}
document.querySelectorAll('[data-tenant-section]').forEach(link=>{
 link.addEventListener('click',event=>{event.preventDefault();showTenantPage(link.dataset.tenantSection);});
});
window.addEventListener('hashchange',()=>showTenantPage(routeFromHash(),false));

document.querySelectorAll('[data-tenant-tab]').forEach(button=>{
 button.addEventListener('click',()=>showTenantPage(button.dataset.tenantTab));
 button.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();
  const tabs=['users',...(allowVessels()?['vessels']:[]),'licenses'];
  const idx=tabs.indexOf(view);
  const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:e.key==='ArrowRight'?(idx+1)%tabs.length:(idx-1+tabs.length)%tabs.length;
  showTenantPage(tabs[next]);
  $('tenant-tab-'+tabs[next]).focus();
 });
});
function renderUsers(){
 const list=$('tenant-user-list'),users=records().users;
 $('tenant-users-count').textContent=users.length;
 list.replaceChildren();
 if(!users.length){
  const empty=document.createElement('p');empty.className='mp-empty';
  empty.textContent='Пользователи ещё не добавлены. Начните с создания первого пользователя.';
  list.append(empty);return;
 }
 const table=document.createElement('table');table.className='mp-basic-table';
 table.innerHTML='<thead><tr><th scope="col">Пользователь</th><th scope="col">Email</th><th scope="col">Роль</th><th scope="col">Судно</th><th scope="col">Действия</th></tr></thead>';
 const body=document.createElement('tbody');
 users.forEach(u=>{
  const tr=document.createElement('tr'),assign=records().vessels.find(v=>MP.vesselSummary(v).imo===u.vesselImo);
  const vals=[u.name,u.email,u.role||'office',assign?MP.vesselSummary(assign).name:'—'];
  ['Пользователь','Email','Роль','Судно'].forEach((label,i)=>{
   const td=document.createElement('td');td.dataset.label=label;
   if(i===2){
    const span=document.createElement('span');span.className='mp-badge';span.textContent=vals[i];td.append(span);
   }else td.textContent=vals[i];
   tr.append(td);
  });
  const action=document.createElement('td');action.dataset.label='Действия';
  const remove=document.createElement('button');remove.type='button';remove.className='mp-btn mp-btn--danger mp-btn--small';
  remove.dataset.removeUser=u.id;remove.setAttribute('aria-label','Удалить пользователя '+u.name);
  const icon=document.createElement('i');icon.className='fa-solid fa-trash-can';icon.setAttribute('aria-hidden','true');
  remove.append(icon,document.createTextNode(' Удалить'));action.append(remove);tr.append(action);
  body.append(tr);
 });
 table.append(body);list.append(table);
}
function renderVessels(){
 const list=$('tenant-vessel-list');list.replaceChildren();
 const search=$('tenant-vessel-search').value.trim().toLowerCase();
 const vessels=records().vessels.filter(v=>{
  const s=MP.vesselSummary(v);return s.name.toLowerCase().includes(search)||s.imo.includes(search);
 });
 $('tenant-vessels-count').textContent=records().vessels.length;
 if(!vessels.length){
  const p=document.createElement('p');p.className='mp-empty';
  p.textContent=records().vessels.length?'По запросу ничего не найдено.':'Ни одной карточки судна. Нажмите «Добавить судно».';
  list.append(p);return;
 }
 const table=document.createElement('table');table.className='mp-basic-table';
 table.innerHTML='<thead><tr><th scope="col">Судно</th><th scope="col">IMO</th><th scope="col">Тип</th><th scope="col">Действие</th></tr></thead>';
 const tbody=document.createElement('tbody');
 vessels.forEach(v=>{
  const s=MP.vesselSummary(v),tr=document.createElement('tr');
  [['Судно',s.name],['IMO',s.imo],['Тип',s.type||'—']].forEach(([label,value])=>{
   const td=document.createElement('td');td.dataset.label=label;td.textContent=value;tr.append(td);
  });
  const td=document.createElement('td');td.dataset.label='Действие';
  const a=document.createElement('a');a.className='mp-btn mp-btn--secondary';a.textContent='Открыть карточку ';const arrow=document.createElement('i');arrow.className='fa-solid fa-arrow-right';arrow.setAttribute('aria-hidden','true');a.append(arrow);
  a.href='vessel.html?tenant='+encodeURIComponent(tenantId)+'&imo='+encodeURIComponent(s.imo);
  const remove=document.createElement('button');remove.type='button';remove.className='mp-btn mp-btn--danger mp-btn--small';
  remove.dataset.removeVessel=s.imo;remove.setAttribute('aria-label','Удалить судно '+s.name);
  const icon=document.createElement('i');icon.className='fa-solid fa-trash-can';icon.setAttribute('aria-hidden','true');
  remove.append(icon,document.createTextNode(' Удалить'));
  const actions=document.createElement('div');actions.className='mp-record-actions';
  actions.append(a,remove);td.append(actions);tr.append(td);tbody.append(tr);
 });
 table.append(tbody);list.append(table);
}
function renderLicenseRequests(){
 const list=$('tenant-license-requests');list.replaceChildren();
 const requests=MP_LICENSE.requestsByCompany(data,tenantId);
 if(!requests.length){const p=document.createElement('p');p.className='mp-empty';p.textContent='Пока нет запросов на подключение модулей.';list.append(p);return;}
 requests.forEach(r=>{
  const license=data.licenses.find(l=>l.id===r.licenseId);
  const title=MP.MODULES.find(m=>m.id===r.moduleId)?.name||r.moduleId;
  const expired=license&&!MP_LICENSE.isCurrent(license);
  const enabled=MP_LICENSE.effective(data,company(),r.moduleId);
  const label=expired?'Истёк / отозван':r.status==='approved'?(enabled?'Подключён':'Одобрен, но не активен'):r.status==='rejected'?'Отклонён':'Ожидает платформу';
  const node=document.createElement('article');node.className='mp-record mp-license-record';
  const info=document.createElement('div');info.className='mp-stack';info.style.gap='4px';
  const strong=document.createElement('strong');strong.textContent=title;
  const date=document.createElement('small');date.textContent='Запрошено: '+MP_LICENSE.formatDate(r.requestedAt)+' · Действует до: '+MP_LICENSE.formatDate(license?.expiresAt);
  const note=document.createElement('small');note.textContent='Выдан: '+MP_LICENSE.formatDate(license?.issuedAt)+(expired?' · Срок действия истёк/ключ отозван':'');
  info.append(strong,date,note);
  const pill=document.createElement('span');pill.className='mp-badge';pill.textContent=label;
  node.append(info,pill);list.append(node);
 });
}
function render(){
 const c=company();if(!c){window.location.replace('../auth/login.html');return;}
 $('tenant-sidebar-id').textContent=c.id;
 $('tenant-head-code').textContent=c.id;
 $('tenant-company-title').textContent=c.name;
 $('tenant-top-name').textContent='Monitoring Project / '+c.name;
 $('tenant-object-types').textContent=(c.objectTypes||[]).map(id=>MP.OBJECT_TYPES.find(t=>t.id===id)?.name||id).join(', ')||'Тип не назначен';
 $('tenant-tab-vessels').hidden=!allowVessels();
 document.querySelector('[data-nav-vessels]').hidden=!allowVessels();
 $('add-vessel-button').href='vessel.html?tenant='+encodeURIComponent(tenantId);
 renderUsers();renderVessels();renderLicenseRequests();renderTenantDashboard();viewSelect(view);
}
function populateVesselChoices(){
 const selector=$('tenant-user-vessel');selector.replaceChildren();
 selector.add(new Option('Выберите судно',''));
 records().vessels.forEach(v=>{
  const s=MP.vesselSummary(v);selector.add(new Option(s.name+' · IMO '+s.imo,s.imo));
 });
}
function toggleUserVessel(){
 const vessel=$('tenant-user-role').value==='vessel';
 $('user-vessel-field').hidden=!vessel;
 $('tenant-user-vessel').required=vessel;
 $('tenant-user-vessel').disabled=!vessel||!allowVessels();
 const count=records().vessels.length;
 $('user-vessel-help').textContent=vessel&&!count
  ?'Нет зарегистрированных судов. Сначала создайте карточку судна в разделе «Суда».'
  :'Для роли vessel обязательно выбрать уже существующее судно.';
}
$('tenant-user-role').addEventListener('change',toggleUserVessel);
$('add-user-button').addEventListener('click',()=>{
 $('tenant-user-form').reset();$('user-form-error').textContent='';
 populateVesselChoices();toggleUserVessel();dialog.showModal();$('tenant-user-name').focus();
});
$('cancel-user').addEventListener('click',()=>dialog.close());
document.querySelector('[data-dialog-close="user-dialog"]')?.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('tenant-user-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.currentTarget;
 if(!form.reportValidity())return;
 const name=$('tenant-user-name').value.trim(),email=$('tenant-user-email').value.trim().toLowerCase();
 const password=$('tenant-user-password'),confirm=$('tenant-user-password-confirm');
 if(password.value.length<8){$('user-form-error').textContent='Пароль должен содержать минимум 8 символов.';password.focus();return;}
 if(password.value!==confirm.value){$('user-form-error').textContent='Подтверждение пароля не совпадает.';confirm.focus();return;}
 const role=$('tenant-user-role').value,vesselImo=role==='vessel'?$('tenant-user-vessel').value:'';
 if(role==='vessel'&&(!vesselImo||!allowVessels()||!records().vessels.some(v=>MP.vesselSummary(v).imo===vesselImo))){
  $('user-form-error').textContent='Для роли vessel требуется выбрать существующее судно. Сначала создайте карточку судна.';
  $('tenant-user-vessel').focus();return;
 }
 if(!name||!email||!MP.ROLES.some(r=>r.id===role)){
  $('user-form-error').textContent='Заполните данные и выберите роль.';return;
 }
 if(records().users.some(u=>u.email.toLowerCase()===email)){
  $('user-form-error').textContent='Этот email уже используется в компании.';return;
 }
 records().users.push({id:'user-'+Date.now(),name,email,role,vesselImo});
 // Credentials are intentionally discarded in the public mock application.
 form.reset();store();dialog.close();renderUsers();renderTenantDashboard();
 MP.setFeedback('tenant-user-feedback','Пользователь создан с ролью '+role+'. Это демоданные.',false);
});
$('tenant-user-list').addEventListener('click',async event=>{
 const button=event.target.closest('[data-remove-user]');if(!button)return;
 const user=records().users.find(u=>u.id===button.dataset.removeUser);if(!user)return;
 const confirmed=await MP_CONFIRM.remove({
  title:'Удалить пользователя «'+user.name+'»?',
  description:'Аккаунт '+user.email+' и привязка к судну будут удалены из этой компании. Действие нельзя отменить.',
  buttonLabel:'Удалить пользователя'
 });
 if(!confirmed)return;
 try{
  MP.removeUser(data,tenantId,user.id);store();
  renderUsers();renderTenantDashboard();
  MP.setFeedback('tenant-user-feedback','Пользователь удалён из демоданных.',false);
 }catch(error){MP.setFeedback('tenant-user-feedback',error.message,true);}
});
$('tenant-vessel-list').addEventListener('click',async event=>{
 const button=event.target.closest('[data-remove-vessel]');if(!button)return;
 const vessel=records().vessels.find(v=>MP.vesselSummary(v).imo===button.dataset.removeVessel);
 if(!vessel)return;
 const {name,imo}=MP.vesselSummary(vessel);
 const accounts=records().users.filter(u=>u.role==='vessel'&&u.vesselImo===imo);
 if(accounts.length){
  MP.setFeedback('tenant-vessel-feedback','Нельзя удалить «'+name+'»: привязано аккаунтов vessel — '+accounts.length+'. Сначала удалите эти аккаунты в разделе «Пользователи».',true);
  return;
 }
 const confirmed=await MP_CONFIRM.remove({
  title:'Удалить судно «'+name+'»?',
  description:'Будет удалена карточка IMO '+imo+' со всеми Ship Particulars и грузовыми помещениями. Восстановить демоданные нельзя.',
  buttonLabel:'Удалить судно'
 });
 if(!confirmed)return;
 try{
  MP.removeVessel(data,tenantId,imo);store();
  renderVessels();renderTenantDashboard();
  MP.setFeedback('tenant-vessel-feedback','Судно «'+name+'» удалено из демоданных.',false);
 }catch(error){MP.setFeedback('tenant-vessel-feedback',error.message,true);}
});
$('tenant-vessel-search').addEventListener('input',renderVessels);
$('tenant-license-form').addEventListener('submit',event=>{
 event.preventDefault();
 const input=$('tenant-license-key');
 if(!input.value.trim()){MP.setFeedback('tenant-license-feedback','Введите лицензионный ключ.',true);input.focus();return;}
 try{
  const result=MP_LICENSE.request(data,tenantId,input.value);
  if(!MP.save(data))throw Error('Не удалось сохранить запрос в браузере.');
  input.value='';renderLicenseRequests();renderTenantDashboard();
  MP.setFeedback('tenant-license-feedback','Запрос на модуль '+(MP.MODULES.find(m=>m.id===result.license.moduleId)?.name||'')+' от '+MP_LICENSE.formatDate(result.request.requestedAt)+' передан на рассмотрение платформы (демо).',false);
 }catch(error){MP.setFeedback('tenant-license-feedback',error.message,true);}
});
window.addEventListener('storage',e=>{if(e.key===MP.KEY){data=MP.state();render();}});
render();showTenantPage(routeFromHash(),false);
})();

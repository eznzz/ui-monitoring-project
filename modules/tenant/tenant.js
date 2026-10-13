(function(){
'use strict';
const $=id=>document.getElementById(id);
let data=MP.state(),view='users',editingUserId=null;
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
 $('tenant-tile-vessels').textContent=tenant.vessels.length+' судов · '+tenant.vessels.filter(v=>v.status==='active').length+' active';
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
 $('tenant-users-count').textContent=users.length;list.replaceChildren();
 if(!users.length){const el=document.createElement('p');el.className='mp-empty';el.textContent='Пользователей пока нет.';list.append(el);return;}
 const table=document.createElement('table');table.className='mp-basic-table';
 table.innerHTML='<thead><tr><th scope="col">Пользователь</th><th scope="col">Email</th><th scope="col">Роль</th><th scope="col">Назначенные суда</th><th scope="col">Действия</th></tr></thead>';
 const tbody=document.createElement('tbody');
 users.forEach(u=>{
  const tr=document.createElement('tr');
  const vessels=(u.vesselIds||[]).map(id=>records().vessels.find(v=>v.id===id)).filter(Boolean);
  const names=vessels.map(v=>MP.vesselSummary(v).name+(v.status!=='active'?' ('+v.status+')':''));
  const vals=[u.name,u.email,u.role||'office',names.length?names.length+': '+names.join(', '):'—'];
  ['Пользователь','Email','Роль','Назначенные суда'].forEach((name,i)=>{
   const td=document.createElement('td');td.dataset.label=name;
   if(i===2){const badge=document.createElement('span');badge.className='mp-badge';badge.textContent=vals[i];td.append(badge);}
   else td.textContent=vals[i];tr.append(td);
  });
  const cell=document.createElement('td');cell.dataset.label='Действия';
  const actions=document.createElement('div');actions.className='mp-record-actions';
  const edit=document.createElement('button');edit.className='mp-btn mp-btn--secondary mp-btn--small';edit.type='button';
  edit.dataset.editUser=u.id;edit.textContent='Редактировать';
  const remove=document.createElement('button');remove.className='mp-btn mp-btn--danger mp-btn--small';remove.type='button';
  remove.dataset.removeUser=u.id;remove.textContent='Удалить';
  actions.append(edit,remove);cell.append(actions);tr.append(cell);tbody.append(tr);
 });
 table.append(tbody);list.append(table);
}
function renderVessels(){
 const list=$('tenant-vessel-list');list.replaceChildren();
 const search=$('tenant-vessel-search').value.trim().toLowerCase();
 const archive=$('tenant-vessel-filter').value==='archive';
 const vessels=records().vessels.filter(v=>{
  if((v.status==='archived')!==archive)return false;
  const a=MP.vesselSummary(v);return a.name.toLowerCase().includes(search)||a.imo.includes(search);
 });
 $('tenant-vessels-count').textContent=records().vessels.filter(v=>(v.status==='archived')===archive).length;
 if(!vessels.length){const el=document.createElement('p');el.className='mp-empty';
  el.textContent='В выбранном разделе суда не найдены.';list.append(el);return;}
 const table=document.createElement('table');table.className='mp-basic-table';
 table.innerHTML='<thead><tr><th scope="col">Судно</th><th scope="col">IMO</th><th scope="col">Тип</th><th scope="col">Статус</th><th scope="col">Действия</th></tr></thead>';
 const tbody=document.createElement('tbody');
 const statusLabels={active:'Active',inactive:'Inactive',archived:'Archived'};
 vessels.forEach(v=>{
  const s=MP.vesselSummary(v),tr=document.createElement('tr');
  [['Судно',s.name],['IMO',s.imo],['Тип',s.type||'—'],['Статус',statusLabels[v.status]]].forEach(([label,value])=>{
   const cell=document.createElement('td');cell.dataset.label=label;
   if(label==='Статус'){const badge=document.createElement('span');badge.className='mp-badge';badge.textContent=value;cell.append(badge);}
   else cell.textContent=value;tr.append(cell);
  });
  const td=document.createElement('td');td.dataset.label='Действия';
  const actions=document.createElement('div');actions.className='mp-record-actions';
  const open=document.createElement('a');open.className='mp-btn mp-btn--secondary mp-btn--small';
  open.textContent=v.status==='archived'?'Просмотр карточки':'Ship Particulars';
  open.href='vessel.html?tenant='+encodeURIComponent(tenantId)+'&objectId='+encodeURIComponent(v.id);
  actions.append(open);
  const transitions=v.status==='active'?[['inactive','Выключить'],['archived','В архив']]:
   v.status==='inactive'?[['active','Активировать'],['archived','В архив']]:[['inactive','Восстановить']];
  transitions.forEach(([target,label])=>{
   const button=document.createElement('button');button.type='button';
   button.className='mp-btn mp-btn--secondary mp-btn--small';button.textContent=label;
   button.dataset.vesselStatus=target;button.dataset.vesselId=v.id;actions.append(button);
  });
  td.append(actions);tr.append(td);tbody.append(tr);
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
function populateVesselChoices(user=null){
 const selector=$('tenant-user-vessel');selector.replaceChildren();
 const selected=new Set(user?.vesselIds||[]);
 records().vessels.forEach(v=>{
  if(v.status!=='active'&&!selected.has(v.id))return;
  const s=MP.vesselSummary(v);
  const opt=new Option(s.name+' · IMO '+s.imo+(v.status!=='active'?' · сохранено ('+v.status+')':''),
    v.id,selected.has(v.id),selected.has(v.id));
  if(v.status!=='active')opt.disabled=true; // preserved, cannot newly assign
  selector.add(opt);
 });
}
function toggleUserVessel(){
 const vessel=$('tenant-user-role').value==='vessel';
 $('user-vessel-field').hidden=!allowVessels();
 $('tenant-user-vessel').disabled=!allowVessels();
 $('tenant-user-vessel').required=false; // validated in submit, including preserved inactive links
 const count=records().vessels.filter(v=>v.status==='active').length;
 $('user-vessel-help').textContent=!count
  ?'Нет активных судов для новых назначений. Сначала активируйте судно в реестре.'
  :vessel?'Выберите одно или несколько активных судов (Ctrl/Command или Shift). Сохранённые inactive/archived связи не пропадут.':
    'Office может иметь ноль или несколько активных судов; Ctrl/Command или Shift для множественного выбора.';
}
function setUserFormMode(user=null){
 editingUserId=user?.id||null;
 $('tenant-user-form').reset();$('user-form-error').textContent='';
 $('user-dialog-title').textContent=user?'Редактировать пользователя':'Добавить пользователя';
 $('user-submit-button').textContent=user?'Сохранить':'Создать';
 ['tenant-user-password','tenant-user-password-confirm'].forEach(id=>{
  const el=$(id);el.required=!user;el.closest('.mp-field').hidden=Boolean(user);
 });
 if(user){
  $('tenant-user-name').value=user.name;
  $('tenant-user-email').value=user.email;
  $('tenant-user-role').value=user.role;
 }
 populateVesselChoices(user);toggleUserVessel();dialog.showModal();$('tenant-user-name').focus();
}
$('tenant-user-role').addEventListener('change',toggleUserVessel);
$('add-user-button').addEventListener('click',()=>setUserFormMode());
$('cancel-user').addEventListener('click',()=>dialog.close());
document.querySelector('[data-dialog-close="user-dialog"]')?.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('tenant-user-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.currentTarget;
 if(!form.reportValidity())return;
 const name=$('tenant-user-name').value.trim(),email=$('tenant-user-email').value.trim().toLowerCase();
 const password=$('tenant-user-password'),confirm=$('tenant-user-password-confirm');
 if(!editingUserId){
  if(password.value.length<8){$('user-form-error').textContent='Пароль должен содержать минимум 8 символов.';return;}
  if(password.value!==confirm.value){$('user-form-error').textContent='Пароли не совпадают.';return;}
 }
 const role=$('tenant-user-role').value;
 const ids=[...$('tenant-user-vessel').selectedOptions].filter(opt=>!opt.disabled).map(opt=>opt.value);
 const current=records().users.find(u=>u.id===editingUserId);
 if(!name||!email||!MP.ROLES.some(r=>r.id===role)){
  $('user-form-error').textContent='Заполните данные и выберите роль.';return;
 }
 if(records().users.some(u=>u.id!==editingUserId&&u.email.toLowerCase()===email)){
  $('user-form-error').textContent='E-mail уже используется в компании.';return;
 }
 if(role==='vessel'&&!ids.length&&(!current||(current.role!=='vessel')||!(current.vesselIds||[]).length)){
  $('user-form-error').textContent='При создании или переводе в Vessel назначьте минимум одно активное судно.';return;
 }
 const user=current||{id:'user-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),vesselIds:[]};
 const snapshot={...user,vesselIds:[...(user.vesselIds||[])]};
 user.name=name;user.email=email;user.role=role;
 if(!current)records().users.push(user);
 try{
  MP.assignUserVessels(data,tenantId,user.id,ids);
  store();dialog.close();renderUsers();renderTenantDashboard();
  MP.setFeedback('tenant-user-feedback','Назначения пользователя сохранены (mock, Object ID).',false);
 }catch(error){
  if(!current)records().users=records().users.filter(u=>u!==user);
  else Object.assign(user,snapshot);
  $('user-form-error').textContent=error.message;
 }
});
$('tenant-user-list').addEventListener('click',async event=>{
 const edit=event.target.closest('[data-edit-user]');
 if(edit){const u=records().users.find(x=>x.id===edit.dataset.editUser);if(u)setUserFormMode(u);return;}
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
 const button=event.target.closest('[data-vessel-status]');if(!button)return;
 const id=button.dataset.vesselId,target=button.dataset.vesselStatus;
 const vessel=records().vessels.find(v=>v.id===id);if(!vessel)return;
 const name=MP.vesselSummary(vessel).name;
 if(target==='archived'){
  const ok=await MP_CONFIRM.action({
   title:'Архивировать судно «'+name+'»?',
   description:'Карточка и назначения сохраняются. Архивное судно не участвует в работе модулей (mock).',
   buttonLabel:'В архив'
  });
  if(!ok)return;
 }
 try{
  MP.setVesselStatus(data,tenantId,id,target);
  store();renderVessels();renderUsers();renderTenantDashboard();
  MP.setFeedback('tenant-vessel-feedback','Статус «'+name+'»: '+target+' (mock). Для Fleet-лимитов потребуется backend API.',false);
 }catch(error){MP.setFeedback('tenant-vessel-feedback',error.message,true);}
});
$('tenant-vessel-filter').addEventListener('change',renderVessels);
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

(function(){
'use strict';
const $=id=>document.getElementById(id);
let data=MP_DATA.load(),view='users',editingUser=null;
const tenantId=new URLSearchParams(location.search).get('tenant')||data.companies[0]?.id||'';
if(!MP.company(data,tenantId)){window.location.replace('../auth/login.html');return;}
const dialog=$('user-dialog');
const company=()=>MP.company(data,tenantId);
const records=()=>MP.tenant(data,tenantId);
const objects=()=>MP.vessels(data,tenantId);
const summary=MP.vesselSummary;
const activeObjects=()=>objects().filter(o=>o.status==='active');
function store(){if(!MP_DATA.persist(data))throw Error('Не удалось сохранить демоданные в браузере.');}
function allowVessels(){return company()?.objectTypeId==='vessels';}
function feedback(id,message,error=false){MP.setFeedback(id,message,error);}
function viewSelect(next,focus){
 if(next==='vessels'&&!allowVessels())next='users';
 view=next;
 ['users','vessels','licenses'].forEach(type=>{
  const on=type===view,tab=$('tenant-tab-'+type),pane=$('tenant-pane-'+type);
  tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;pane.hidden=!on;
 });
 if(focus)$('tenant-tab-'+view).focus();
}
function routeFromHash(){
 const route=decodeURIComponent(location.hash.slice(1));
 return ['dashboard','users','vessels','licenses'].includes(route)?route:'dashboard';
}
function showTenantPage(page,updateLocation=true){
 if(!['dashboard','users','vessels','licenses'].includes(page))page='dashboard';
 if(page==='vessels'&&!allowVessels())page='users';
 if(company()?.status==='archived')page='dashboard';
 $('tenant-dashboard').hidden=page!=='dashboard';
 $('tenant-work-area').hidden=page==='dashboard';
 if(page!=='dashboard')viewSelect(page);
 document.querySelectorAll('.mp-sidebar-nav [data-tenant-section]').forEach(a=>{
  const active=a.dataset.tenantSection===page;a.classList.toggle('active',active);
  if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
 });
 $('tenant-top-name').textContent=(company()?.name||'Компания')+' / '+({
  dashboard:'Главная',users:'Пользователи',vessels:'Суда',licenses:'Подписки'}[page]);
 if(updateLocation){history.replaceState(null,'',location.pathname+location.search+'#'+page);window.scrollTo({top:0,behavior:'instant'});}
}
document.querySelectorAll('[data-tenant-section]').forEach(link=>link.addEventListener('click',event=>{
 event.preventDefault();showTenantPage(link.dataset.tenantSection);
}));
window.addEventListener('hashchange',()=>showTenantPage(routeFromHash(),false));
document.querySelectorAll('[data-tenant-tab]').forEach(button=>{
 button.addEventListener('click',()=>showTenantPage(button.dataset.tenantTab));
 button.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();const tabs=['users',...(allowVessels()?['vessels']:[]),'licenses'],i=tabs.indexOf(view);
  const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:e.key==='ArrowRight'?(i+1)%tabs.length:(i+tabs.length-1)%tabs.length;
  showTenantPage(tabs[next]);$('tenant-tab-'+tabs[next]).focus();
 });
});
function renderTenantDashboard(){
 const t=records(),c=company();
 $('tenant-dashboard-id').textContent=c.id;
 $('tenant-dashboard-company').textContent=c.name+' · тип объектов: '+(MP.objectType(c)?.name||c.objectTypeId);
 $('tenant-tile-users').textContent=t.users.length+' пользователей';
 $('tenant-tile-vessels').textContent=objects().filter(o=>o.status==='active').length+' активных из '+objects().length;
 $('tenant-tile-pending').textContent=MP_LICENSE.requestsByCompany(data,tenantId).filter(r=>r.status==='pending').length+' обращений';
 $('tenant-dashboard-vessel-tile').hidden=!allowVessels();
}
function renderUsers(){
 const list=$('tenant-user-list'),users=records().users;list.replaceChildren();
 $('tenant-users-count').textContent=users.length;
 if(!users.length){const empty=document.createElement('p');empty.className='mp-empty';empty.textContent='Создайте первого пользователя.';list.append(empty);return;}
 const table=document.createElement('table');table.className='mp-basic-table';
 table.innerHTML='<thead><tr><th scope="col">Пользователь</th><th scope="col">Email</th><th scope="col">Роль</th><th scope="col">Назначенные суда</th><th scope="col">Модули</th><th scope="col">Действия</th></tr></thead>';
 const body=document.createElement('tbody');
 users.forEach(u=>{
  const tr=document.createElement('tr'),ids=u.objectIds||[];
  const assigned=ids.map(id=>objects().find(v=>v.id===id)).filter(Boolean);
  const names=assigned.map(v=>summary(v).name+(v.status!=='active'?' ('+v.status+')':'')).join(', ')||'—';
  const vals=[u.name,u.email,u.role,names,(u.modulePermissions||[]).join(', ')||'—'];
  ['Пользователь','Email','Роль','Назначенные суда','Модули'].forEach((name,i)=>{
   const td=document.createElement('td');td.dataset.label=name;
   if(i===2){const badge=document.createElement('span');badge.className='mp-badge';badge.textContent=vals[i];td.append(badge);}
   else td.textContent=vals[i];tr.append(td);
  });
  const cell=document.createElement('td');cell.dataset.label='Действия';
  const edit=document.createElement('button');edit.type='button';edit.className='mp-btn mp-btn--secondary mp-btn--small';
  edit.dataset.editUser=u.id;edit.textContent='Назначения / права';
  cell.append(edit);tr.append(cell);body.append(tr);
 });
 table.append(body);list.append(table);
}
function statusText(s){return ({active:'Активное',inactive:'Неактивное',archived:'Архив'})[s]||s;}
function renderVessels(){
 const list=$('tenant-vessel-list'),search=$('tenant-vessel-search').value.trim().toLowerCase();
 const filter=$('tenant-vessel-status').value;
 const visible=objects().filter(v=>{
  const s=summary(v);
  return (filter==='all'||filter===v.status||(filter==='current'&&v.status!=='archived'))&&
   (s.name.toLowerCase().includes(search)||s.imo.includes(search));
 });
 $('tenant-vessels-count').textContent=objects().length;
 list.replaceChildren();
 if(!visible.length){const p=document.createElement('p');p.className='mp-empty';p.textContent='По выбранному фильтру судов нет.';list.append(p);return;}
 const table=document.createElement('table');table.className='mp-basic-table';
 table.innerHTML='<thead><tr><th scope="col">Судно</th><th scope="col">IMO</th><th scope="col">Тип</th><th scope="col">Статус</th><th scope="col">Действия</th></tr></thead>';
 const body=document.createElement('tbody');
 visible.forEach(v=>{
  const s=summary(v),tr=document.createElement('tr');
  [['Судно',s.name],['IMO',s.imo],['Тип',s.type||'—'],['Статус',statusText(v.status)]].forEach(([label,val])=>{
   const td=document.createElement('td');td.dataset.label=label;
   if(label==='Статус'){const badge=document.createElement('span');badge.className='mp-badge';badge.textContent=val;td.append(badge);}
   else td.textContent=val;tr.append(td);
  });
  const cell=document.createElement('td');cell.dataset.label='Действия';
  const actions=document.createElement('div');actions.className='mp-record-actions';
  const link=document.createElement('a');link.className='mp-btn mp-btn--secondary mp-btn--small';
  link.textContent='Ship Particulars';link.href='vessel.html?tenant='+encodeURIComponent(tenantId)+'&id='+encodeURIComponent(v.id);
  actions.append(link);
  const choices=v.status==='active'?[['inactive','Выключить'],['archived','Архивировать']]:
   v.status==='inactive'?[['active','Включить'],['archived','Архивировать']]:[['inactive','Восстановить']];
  choices.forEach(([status,label])=>{
   const button=document.createElement('button');button.className='mp-btn mp-btn--secondary mp-btn--small';button.type='button';
   button.dataset.objectId=v.id;button.dataset.status=status;button.textContent=label;actions.append(button);
  });
  cell.append(actions);tr.append(cell);body.append(tr);
 });
 table.append(body);list.append(table);
}
function renderLicenseRequests(){
 const container=$('tenant-license-requests');container.replaceChildren();
 const c=company(),license=c.systemLicense;
 const head=document.createElement('p');head.className='mp-help';
 head.textContent=license?'Системная лицензия: '+(MP_LICENSE.licenseActive(c)?'действует':'вне срока')+
  ' · '+MP_LICENSE.formatDate(license.startsOn)+' — '+MP_LICENSE.formatDate(license.endsBefore):
  'Системная лицензия ещё не выдана платформой.';
 container.append(head);
 MP.MODULES.forEach(m=>{
  const sub=c.modules[m.id];if(!sub?.enabled)return;
  const p=document.createElement('p');p.className='mp-help';
  p.textContent=m.name+': '+(MP_LICENSE.effective(data,c,m.id)?'доступен':'недоступен')+
   ' · Fleet '+(sub.vesselCap===null?'Unlimited':sub.vesselCap)+' · '+(sub.assignedObjectIds||[]).filter(id=>objects().some(o=>o.id===id&&o.status==='active')).length+' судов';
  container.append(p);
 });
 const requests=MP_LICENSE.requestsByCompany(data,tenantId);
 requests.forEach(r=>{
  const el=document.createElement('article');el.className='mp-record mp-license-record';
  el.textContent=(MP.MODULES.find(m=>m.id===r.moduleId)?.name||r.moduleId)+
   ' · '+MP_LICENSE.formatDate(r.createdAt)+' · '+r.status+' · '+(r.comment||'Без комментария');
  container.append(el);
 });
 const select=$('tenant-license-module'),previous=select.value;select.replaceChildren(new Option('Выберите модуль',''));
 MP.MODULES.forEach(m=>select.add(new Option(m.name,m.id)));select.value=previous||'';
 const moduleSelect=$('tenant-assignment-module'),old=moduleSelect.value;moduleSelect.replaceChildren(new Option('Выберите подключённый модуль',''));
 MP.MODULES.filter(m=>c.modules[m.id]?.enabled).forEach(m=>moduleSelect.add(new Option(m.name,m.id)));
 moduleSelect.value=old||'';populateModuleObjects();
}
function populateModuleObjects(){
 const id=$('tenant-assignment-module').value,sub=company()?.modules?.[id];
 const select=$('tenant-assignment-objects');select.replaceChildren();
 const selected=new Set(sub?.assignedObjectIds||[]);
 activeObjects().forEach(v=>{
  const o=new Option(summary(v).name+' · IMO '+summary(v).imo,v.id);
  o.selected=selected.has(v.id);select.add(o);
 });
}
function populateUserChoices(u){
 const selector=$('tenant-user-vessel');selector.replaceChildren();
 const linked=new Set(u?.objectIds||[]);
 objects().filter(v=>v.status==='active'||linked.has(v.id)).forEach(v=>{
  const label=summary(v).name+' · IMO '+summary(v).imo+(v.status!=='active'?' ('+v.status+' — связь сохранена)':'');
  const option=new Option(label,v.id);option.selected=linked.has(v.id);
  if(v.status!=='active')option.disabled=true;
  selector.add(option);
 });
 const select=$('tenant-user-modules');select.replaceChildren();
 const rights=new Set(u?.modulePermissions||[]);
 MP.MODULES.forEach(m=>{const o=new Option(m.name,m.id);o.selected=rights.has(m.id);select.add(o);});
}
function toggleUserVessel(){
 const role=$('tenant-user-role').value;
 $('user-vessel-field').hidden=false;
 $('tenant-user-vessel').disabled=!allowVessels();
 $('user-vessel-help').textContent=role==='vessel'?
  'Выберите одно или несколько активных судов. Для Vessel хотя бы одно обязательно.':
  'Для Office можно выбрать любое количество активных судов или оставить список пустым.';
}
$('tenant-user-role').addEventListener('change',toggleUserVessel);
function openUserForm(u){
 editingUser=u?.id||null;
 $('tenant-user-form').reset();$('user-form-error').textContent='';
 $('user-dialog-title').textContent=u?'Изменить пользователя и назначения':'Добавить пользователя';
 $('tenant-user-name').value=u?.name||'';
 $('tenant-user-email').value=u?.email||'';
 $('tenant-user-role').value=u?.role||'office';
 populateUserChoices(u);toggleUserVessel();dialog.showModal();$('tenant-user-name').focus();
}
$('add-user-button').addEventListener('click',()=>openUserForm(null));
$('tenant-user-list').addEventListener('click',e=>{
 const btn=e.target.closest('[data-edit-user]');if(!btn)return;
 const u=records().users.find(x=>x.id===btn.dataset.editUser);
 if(u)openUserForm(u);
});
$('cancel-user').addEventListener('click',()=>dialog.close());
document.querySelector('[data-dialog-close="user-dialog"]')?.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('tenant-user-form').addEventListener('submit',e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 const name=$('tenant-user-name').value.trim(),email=$('tenant-user-email').value.trim().toLowerCase();
 const role=$('tenant-user-role').value,existing=editingUser?records().users.find(u=>u.id===editingUser):null;
 const activeIds=[...$('tenant-user-vessel').selectedOptions].filter(o=>!o.disabled).map(o=>o.value);
 const savedInactive=(existing?.objectIds||[]).filter(id=>objects().some(v=>v.id===id&&v.status!=='active'));
 if(role==='vessel'&&!activeIds.length&&!savedInactive.length){
  $('user-form-error').textContent='Для роли Vessel необходимо назначить хотя бы одно активное судно.';return;
 }
 if(!name||!email||!MP.ROLES.some(r=>r.id===role)){ $('user-form-error').textContent='Заполните имя, e-mail и роль.';return;}
 if(MP.globalEmailUsed(data,email,existing?.id)){ $('user-form-error').textContent='E-mail уже занят в одной из компаний.';return;}
 const rights=[...$('tenant-user-modules').selectedOptions].map(o=>o.value);
 const user=existing||{id:MP.newId('user'),objectIds:[],modulePermissions:[]};
 user.name=name;user.email=email;user.role=role;user.modulePermissions=rights;
 if(!existing)records().users.push(user);
 try{
  MP.assignUserObjects(data,tenantId,user.id,activeIds);
  user.objectIds=[...new Set([...user.objectIds,...savedInactive])];
  MP.addAudit(data,tenantId,'user.update',user.id,'Данные и модульные права обновлены');
  store();dialog.close();renderUsers();renderTenantDashboard();
  feedback('tenant-user-feedback','Пользователь и назначения сохранены в демоданных.');
 }catch(err){feedback('tenant-user-feedback',err.message,true);}
});
$('tenant-vessel-list').addEventListener('click',e=>{
 const btn=e.target.closest('[data-object-id][data-status]');if(!btn)return;
 const v=objects().find(o=>o.id===btn.dataset.objectId);if(!v)return;
 const status=btn.dataset.status;
 if(!window.confirm('Изменить статус «'+summary(v).name+'»: '+statusText(v.status)+' → '+statusText(status)+'?'))return;
 try{MP.setObjectStatus(data,tenantId,v.id,status);store();render();feedback('tenant-vessel-feedback','Статус изменён без удаления истории.');}
 catch(err){feedback('tenant-vessel-feedback',err.message,true);}
});
$('tenant-vessel-search').addEventListener('input',renderVessels);
$('tenant-vessel-status').addEventListener('change',renderVessels);
$('tenant-assignment-module').addEventListener('change',populateModuleObjects);
$('tenant-assignment-form').addEventListener('submit',e=>{
 e.preventDefault();const id=$('tenant-assignment-module').value;
 try{
  MP_LICENSE.assignModuleObjects(data,company(),id,[...$('tenant-assignment-objects').selectedOptions].map(o=>o.value));
  store();renderLicenseRequests();feedback('tenant-assignment-feedback','Суда для модуля назначены в пределах Fleet-лимита.');
 }catch(err){feedback('tenant-assignment-feedback',err.message,true);}
});
$('tenant-license-form').addEventListener('submit',e=>{
 e.preventDefault();
 try{
  const r=MP_LICENSE.request(data,company(),$('tenant-license-module').value,$('tenant-license-comment').value);
  store();$('tenant-license-comment').value='';renderLicenseRequests();renderTenantDashboard();
  feedback('tenant-license-feedback','Необязательное обращение '+r.id+' сохранено (не включает модуль).');
 }catch(err){feedback('tenant-license-feedback',err.message,true);}
});
function render(){
 const c=company();if(!c){location.replace('../auth/login.html');return;}
 $('tenant-sidebar-id').textContent=c.id;
 $('tenant-head-code').textContent=c.id;
 $('tenant-company-title').textContent=c.name;
 $('tenant-top-name').textContent='Monitoring Project / '+c.name;
 $('tenant-object-types').textContent=MP.objectType(c)?.name||c.objectTypeId;
 $('tenant-tab-vessels').hidden=!allowVessels();
 document.querySelector('[data-nav-vessels]').hidden=!allowVessels();
 $('add-vessel-button').href='vessel.html?tenant='+encodeURIComponent(tenantId);
 if(c.status==='archived'){
  renderTenantDashboard();
  $('tenant-dashboard-company').textContent='Компания находится в архиве. Восстановление выполняет Super Admin из Platform Admin.';
  $('tenant-work-area').hidden=true;
  showTenantPage('dashboard',false);return;
 }
 renderUsers();renderVessels();renderLicenseRequests();renderTenantDashboard();viewSelect(view);
}
window.addEventListener('storage',e=>{if(e.key===MP.KEY){data=MP_DATA.load();render();}});
render();showTenantPage(routeFromHash(),false);
})();

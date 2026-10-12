(function(){
'use strict';
const $=id=>document.getElementById(id);
let data=MP.state(),view='users';
const requested=new URLSearchParams(location.search).get('tenant');
const tenantId=MP.company(data,requested)?requested:'tenant_db_000001';
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
document.querySelectorAll('[data-tenant-tab]').forEach(button=>{
 button.addEventListener('click',()=>viewSelect(button.dataset.tenantTab));
 button.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();
  const tabs=['users',...(allowVessels()?['vessels']:[]),'licenses'];
  const idx=tabs.indexOf(view);
  const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:e.key==='ArrowRight'?(idx+1)%tabs.length:(idx-1+tabs.length)%tabs.length;
  viewSelect(tabs[next],true);
 });
});
document.querySelector('[data-nav-users]').addEventListener('click',()=>viewSelect('users'));
document.querySelector('[data-nav-vessels]').addEventListener('click',()=>viewSelect('vessels'));
document.querySelector('[data-nav-licenses]').addEventListener('click',()=>viewSelect('licenses'));
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
 table.innerHTML='<thead><tr><th scope="col">Пользователь</th><th scope="col">Email</th><th scope="col">Роль</th><th scope="col">Судно</th></tr></thead>';
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
  const a=document.createElement('a');a.className='mp-btn mp-btn--secondary';a.textContent='Открыть карточку →';
  a.href='vessel.html?tenant='+encodeURIComponent(tenantId)+'&imo='+encodeURIComponent(s.imo);
  td.append(a);tr.append(td);tbody.append(tr);
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
  const label=r.status==='approved'?'Одобрен':r.status==='rejected'?'Отклонён':'Ожидает платформу';
  const expired=license&&!MP_LICENSE.isCurrent(license);
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
 const c=company();if(!c)return;
 $('tenant-sidebar-id').textContent=c.id;
 $('tenant-head-code').textContent=c.id;
 $('tenant-company-title').textContent=c.name+' · '+c.code;
 $('tenant-top-name').textContent='Monitoring Project / '+c.name;
 $('tenant-object-types').textContent=(c.objectTypes||[]).map(id=>MP.OBJECT_TYPES.find(t=>t.id===id)?.name||id).join(', ')||'Тип не назначен';
 $('tenant-tab-vessels').hidden=!allowVessels();
 document.querySelector('[data-nav-vessels]').hidden=!allowVessels();
 $('add-vessel-button').href='vessel.html?tenant='+encodeURIComponent(tenantId);
 renderUsers();renderVessels();renderLicenseRequests();viewSelect(view);
}
function populateVesselChoices(){
 const selector=$('tenant-user-vessel');selector.replaceChildren();
 selector.add(new Option('Не назначено',''));
 records().vessels.forEach(v=>{
  const s=MP.vesselSummary(v);selector.add(new Option(s.name+' · IMO '+s.imo,s.imo));
 });
}
function toggleUserVessel(){ $('user-vessel-field').hidden=$('tenant-user-role').value!=='vessel'; }
$('tenant-user-role').addEventListener('change',toggleUserVessel);
$('add-user-button').addEventListener('click',()=>{
 $('tenant-user-form').reset();$('user-form-error').textContent='';
 populateVesselChoices();toggleUserVessel();dialog.showModal();$('tenant-user-name').focus();
});
$('cancel-user').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('tenant-user-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.currentTarget;
 if(!form.reportValidity())return;
 const name=$('tenant-user-name').value.trim(),email=$('tenant-user-email').value.trim().toLowerCase();
 const password=$('tenant-user-password'),confirm=$('tenant-user-password-confirm');
 if(password.value.length<8){$('user-form-error').textContent='Пароль должен содержать минимум 8 символов.';password.focus();return;}
 if(password.value!==confirm.value){$('user-form-error').textContent='Подтверждение пароля не совпадает.';confirm.focus();return;}
 const role=$('tenant-user-role').value,vesselImo=role==='vessel'?$('tenant-user-vessel').value:'';
 if(!name||!email||!MP.ROLES.some(r=>r.id===role)){
  $('user-form-error').textContent='Заполните данные и выберите роль.';return;
 }
 if(records().users.some(u=>u.email.toLowerCase()===email)){
  $('user-form-error').textContent='Этот email уже используется в компании.';return;
 }
 records().users.push({id:'user-'+Date.now(),name,email,role,vesselImo});
 // Credentials are intentionally discarded in the public mock application.
 form.reset();store();dialog.close();renderUsers();
 MP.setFeedback('tenant-user-feedback','Пользователь создан с ролью '+role+'. Это демоданные.',false);
});
$('tenant-vessel-search').addEventListener('input',renderVessels);
$('tenant-license-form').addEventListener('submit',event=>{
 event.preventDefault();
 const input=$('tenant-license-key');
 if(!input.value.trim()){MP.setFeedback('tenant-license-feedback','Введите лицензионный ключ.',true);input.focus();return;}
 try{
  const result=MP_LICENSE.request(data,tenantId,input.value);
  if(!MP.save(data))throw Error('Не удалось сохранить запрос в браузере.');
  input.value='';renderLicenseRequests();
  MP.setFeedback('tenant-license-feedback','Запрос на модуль '+(MP.MODULES.find(m=>m.id===result.license.moduleId)?.name||'')+' от '+MP_LICENSE.formatDate(result.request.requestedAt)+' передан на рассмотрение платформы (демо).',false);
 }catch(error){MP.setFeedback('tenant-license-feedback',error.message,true);}
});
window.addEventListener('storage',e=>{if(e.key===MP.KEY){data=MP.state();render();}});
if(location.hash==='#vessels')view='vessels';
if(location.hash==='#licenses')view='licenses';
render();
})();
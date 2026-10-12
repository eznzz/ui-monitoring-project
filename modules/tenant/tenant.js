(function(){
'use strict';
const $=id=>document.getElementById(id);
let data=MP.state();
const requested=new URLSearchParams(location.search).get('tenant');
const tenantId=data.companies.some(c=>c.id===requested)?requested:'tenant_db_000001';
function company(){return MP.company(data,tenantId);}
function records(){
  if(!data.tenants[tenantId])data.tenants[tenantId]={users:[],vessels:[]};
  return data.tenants[tenantId];
}
function persist(messageId){
  if(!MP.save(data))MP.setFeedback(messageId,'Не удалось сохранить демоданные в браузере.',true);
}
function renderUsers(){
  const users=records().users;
  $('tenant-users-count').textContent=users.length;
  $('users-list-count').textContent=users.length;
  const list=$('tenant-user-list');list.replaceChildren();
  if(!users.length){
    const empty=document.createElement('p');empty.className='mp-empty';
    empty.textContent='Пока нет пользователей. Создайте первого пользователя.';list.append(empty);return;
  }
  users.forEach(u=>{
    const row=document.createElement('div');row.className='mp-record';
    row.innerHTML='<span><strong>'+MP.escape(u.name)+'</strong><small>'+MP.escape(u.email)+'</small></span><span class="mp-badge">Создан</span>';
    list.append(row);
  });
}
function renderVessels(){
  const vessels=records().vessels,term=$('tenant-vessel-search').value.trim().toLowerCase();
  const matches=vessels.filter(v=>v.name.toLowerCase().includes(term)||v.imo.includes(term));
  $('tenant-vessels-count').textContent=vessels.length;
  $('vessels-list-count').textContent=matches.length;
  const list=$('tenant-vessel-list');list.replaceChildren();
  if(!matches.length){
    const empty=document.createElement('p');empty.className='mp-empty';
    empty.textContent=vessels.length?'По запросу ничего не найдено.':'Карточки судов пока не заполнены.';
    list.append(empty);return;
  }
  matches.forEach(v=>{
    const row=document.createElement('div');row.className='mp-record';
    const info=document.createElement('span');
    info.style.minWidth='0';
    info.innerHTML='<strong>'+MP.escape(v.name)+'</strong><small>IMO '+MP.escape(v.imo)+(v.type?' · '+MP.escape(v.type):'')+(v.flag?' · '+MP.escape(v.flag):'')+'</small>';
    const edit=document.createElement('button');
    edit.className='mp-btn mp-btn--secondary';edit.type='button';edit.textContent='Изменить';
    edit.setAttribute('aria-label','Изменить карточку судна '+v.name);
    edit.addEventListener('click',()=>editVessel(v));
    row.append(info,edit);list.append(row);
  });
}
function render(){
  const c=company();
  if(!c){
    document.querySelector('.mp-main-content').replaceChildren();
    const msg=document.createElement('p');msg.className='mp-card';msg.textContent='Компания не найдена в демонстрационных данных.';
    document.querySelector('.mp-main-content').append(msg);
    return;
  }
  $('tenant-sidebar-id').textContent=c.id;
  $('tenant-head-code').textContent=c.id;
  $('tenant-company-title').textContent=c.name+' · первичная настройка';
  $('tenant-company-code').textContent=c.code;
  $('tenant-top-name').textContent='Monitoring Project / '+c.name;
  renderUsers();renderVessels();
}
$('tenant-user-form').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const name=$('tenant-user-name').value.trim(),email=$('tenant-user-email').value.trim().toLowerCase();
  if(!name||!email){MP.setFeedback('tenant-user-feedback','Заполните имя и email.',true);return;}
  if(records().users.some(u=>u.email===email)){MP.setFeedback('tenant-user-feedback','Пользователь с таким email уже есть.',true);return;}
  records().users.push({id:'user-'+Date.now(),name,email});
  persist('tenant-user-feedback');form.reset();renderUsers();
  MP.setFeedback('tenant-user-feedback','Пользователь добавлен в демо.',false);
});
function clearVessel(){
  $('tenant-vessel-form').reset();$('tenant-vessel-edit-id').value='';
  $('tenant-vessel-form-title').textContent='Заполнить карточку судна';
  $('tenant-vessel-save').textContent='Сохранить карточку';
  $('tenant-vessel-cancel').hidden=true;
}
function editVessel(v){
  $('tenant-vessel-edit-id').value=v.imo;
  $('tenant-vessel-name').value=v.name;
  $('tenant-vessel-imo').value=v.imo;
  $('tenant-vessel-type').value=v.type||'';
  $('tenant-vessel-flag').value=v.flag||'';
  $('tenant-vessel-call-sign').value=v.callSign||'';
  $('tenant-vessel-form-title').textContent='Редактировать карточку судна';
  $('tenant-vessel-save').textContent='Сохранить изменения';
  $('tenant-vessel-cancel').hidden=false;
  $('tenant-vessel-name').focus();
  document.getElementById('vessels').scrollIntoView({block:'start',behavior:'instant'});
}
$('tenant-vessel-cancel').addEventListener('click',()=>{clearVessel();MP.setFeedback('tenant-vessel-feedback','Редактирование отменено.',false);});
$('tenant-vessel-form').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const edited=$('tenant-vessel-edit-id').value;
  const item={
    name:$('tenant-vessel-name').value.trim(),
    imo:$('tenant-vessel-imo').value.trim(),
    type:$('tenant-vessel-type').value,
    flag:$('tenant-vessel-flag').value.trim(),
    callSign:$('tenant-vessel-call-sign').value.trim()
  };
  if(!item.name||!/^[0-9]{7}$/.test(item.imo)){
    MP.setFeedback('tenant-vessel-feedback','Укажите название и IMO из семи цифр.',true);return;
  }
  const vessels=records().vessels;
  if(vessels.some(v=>v.imo===item.imo&&v.imo!==edited)){
    MP.setFeedback('tenant-vessel-feedback','Карточка судна с таким IMO уже существует.',true);return;
  }
  if(edited){
    const old=vessels.find(v=>v.imo===edited);
    if(!old){MP.setFeedback('tenant-vessel-feedback','Исходная карточка не найдена.',true);return;}
    Object.assign(old,item);
  }else vessels.push(item);
  persist('tenant-vessel-feedback');
  clearVessel();renderVessels();
  MP.setFeedback('tenant-vessel-feedback',edited?'Изменения сохранены в демо.':'Карточка судна создана в демо.',false);
});
$('tenant-vessel-search').addEventListener('input',renderVessels);
window.addEventListener('storage',event=>{if(event.key===MP.KEY){data=MP.state();render();}});
render();
})();

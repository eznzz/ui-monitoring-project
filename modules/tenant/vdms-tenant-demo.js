/* VDMS Tenant Console contract demo. No network, no real sessions or credentials. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const uuid=()=>{const a=crypto.getRandomValues(new Uint8Array(16));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;const h=Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
const validId=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,fn,disabled=false,variant='secondary'){const b=el('button',text,'mp-btn mp-btn--'+variant);b.type='button';b.disabled=disabled;b.addEventListener('click',fn);return b;}
function table(headers,rows){const t=el('table',undefined,'mp-basic-table'),head=el('thead'),hr=el('tr'),body=el('tbody');headers.forEach(x=>{const th=el('th',x);th.scope='col';hr.append(th);});head.append(hr);rows.forEach(row=>{const tr=el('tr');row.forEach((v,i)=>{const td=el('td');td.dataset.label=headers[i];if(v instanceof Node)td.append(v);else td.textContent=v??'—';tr.append(td);});body.append(tr);});t.append(head,body);return t;}
function section(root,title,headers,rows){root.append(el('h3',title,'mp-section-title'));root.append(rows.length?table(headers,rows):el('p','Нет данных','mp-empty'));}
function field(label,input){const wrap=el('label',undefined,'mp-field');wrap.append(el('span',label,'mp-label'),input);return wrap;}
function select(options){const s=el('select');options.forEach(([v,t])=>s.add(new Option(t,v)));return s;}
function mount(){
let selected=null,tab='profile',session=null,t=null;
const dialog=$('user-dialog'),form=$('tenant-user-form');
const modules=[['core','Objects','Объекты','available'],['documents','Documents','Документы','planned'],['fleet','Fleet','Флот','planned'],['maintenance','Maintenance','Техническое обслуживание','planned'],['crew','Crew','Экипаж','planned'],['warehouse','Warehouse','Склад','planned'],['finance','Finance','Финансы','planned'],['analytics','Analytics','Аналитика','planned']].map(([code,nameEn,nameRu,status])=>({code,nameEn,nameRu,status,enabled:code==='core'}));
function fixture(actor){
 const roleCodes=['sec01b_tenant_admin_reader','sec01b_user_creator','sec01b4_delegator','sec01b4_object_reader'];
 const roles=roleCodes.map((code,i)=>({id:'aaaaaaaa-0000-4000-8000-'+String([32,42,52,53][i]).padStart(12,'0'),code,description:'',active:true,revision:1}));
 const users=[{id:uuid(),login:'sec01b-writer',displayName:'SEC-01B Tenant User Writer',active:true,revision:1},{id:uuid(),login:'sec01b4-delegator',displayName:'SEC-01B4 Scoped Role Delegator',active:true,revision:1},{id:uuid(),login:'demo-user',displayName:'Demo User',active:true,revision:1}];
 return {users,roles,assignments:users.slice(0,2).map((u,i)=>({id:uuid(),userId:u.id,roleId:roles[i+1].id,objectId:null,objectCode:null,revision:1})),policyRevision:1,assignmentCapability:{canManage:actor==='sec01b4-delegator'},objects:[{id:uuid(),code:'demo-object-01',revision:1}],company:{id:uuid(),code:'mvp-a',name:'MVP A (demo)'},modules,languageRegistry:{primary:'en',languages:[{code:'en',name:'English',isPrimary:true,isEnabled:true,sortOrder:10},{code:'ru',name:'Russian',isPrimary:false,isEnabled:true,sortOrder:20}]}};
}
function model(){return t;}
function objects(t){return t.objects;}
function company(){return t.company;}
function store(){/* session-local fixtures, never persisted */}
function onChange(){}
function assignments(t,u){return t.assignments.filter(a=>a.userId===u.id);}
function change(t){t.policyRevision++;store();render();onChange();}
function render(){
 if(!session||!t)return;const t=model(),c=company(),list=$('tenant-user-list'),detail=$('vdms-user-detail'),summary=$('vdms-company-summary');
 $('tenant-users-count').textContent=t.users.length;
 $('add-user-button').disabled=session.login!=='sec01b-writer';
 list.replaceChildren(el('p','Версия политики: '+t.policyRevision+' · Назначений: '+t.assignments.length+' · Управление назначениями: '+(t.assignmentCapability.canManage?'доступно':'недоступно'),'mp-help'));
 if(t.users.length)list.append(table(['Логин','Имя','Статус','Роли','Действие'],t.users.map(u=>[u.login,u.displayName,u.active?'Активен':'Отключён',assignments(t,u).length,button('Открыть',()=>{selected=u.id;tab='profile';render();})])));
 else list.append(el('p','Пользователи ещё не добавлены.','mp-empty'));
 summary.replaceChildren(el('h2','Компания и модули · VDMS demo','mp-section-title'));
 section(summary,'Компания',['UUID','Code','Название','Юридическое название','Торговое название','Статус'],[[c.id,c.code,c.name,c.legalName,c.tradeName,c.status]]);
 section(summary,'Модули (демо-каталог)',['Code','Name EN','Name RU','Status','Enabled'],t.modules.map(m=>[m.code,m.nameEn,m.nameRu,m.status,m.enabled?'Да':'Нет']));
 section(summary,'Языки · основной: '+t.languageRegistry.primary,['Code','Name','Primary','Enabled','Sort order'],t.languageRegistry.languages.map(l=>[l.code,l.name,l.isPrimary?'Да':'Нет',l.isEnabled?'Да':'Нет',l.sortOrder]));
 section(summary,'Объекты',['UUID','Code','Object type ID','Revision'],objects(t).map(o=>[o.id,o.code,o.objectTypeId,o.revision]));
 summary.append(el('p','Демо-значения. Коды, названия и статусы модулей взяты из VDMS 000034_erp_modules; каталог только для чтения.','mp-help'));
 detail.replaceChildren();const u=t.users.find(u=>u.id===selected);if(!u)return;
 const aa=assignments(t,u),complete=t.users.length<100&&t.assignments.length<100,modifiable=complete&&aa.length===0&&session.login==='sec01b-writer',manageable=complete&&t.assignmentCapability.canManage&&u.active;
 detail.append(el('h2',u.displayName+' · '+u.login,'mp-section-title'),el('p',u.active?'Активен':'Отключён','mp-badge'));
 const tabs=el('div',undefined,'mp-row');[['profile','Профиль'],['security','Безопасность'],['roles','Роли'],['objects','Объекты'],['history','История']].forEach(([k,l])=>{const b=button(l,()=>{tab=k;render();},false,k===tab?'primary':'secondary');b.setAttribute('aria-pressed',String(k===tab));tabs.append(b);});detail.append(tabs);
 if(tab==='profile'){
  section(detail,'Основные данные',['UUID','Логин','Имя','Revision','Роли'],[[u.id,u.login,u.displayName,u.revision,aa.length]]);
  const name=el('input');name.value=u.displayName;name.maxLength=120;name.disabled=!modifiable;
  detail.append(field('Отображаемое имя',name),button('Сохранить имя',()=>{const v=name.value.trim();if(!v||v===u.displayName)return;u.displayName=v;u.revision++;change(t);},!modifiable,'primary'));
 }else if(tab==='security'){
  section(detail,'Безопасность',['Статус','Revision'],[[u.active?'Доступ разрешён':'Заблокирован',u.revision]]);
  detail.append(button(u.active?'Заблокировать':'Разблокировать',()=>{if(u.active&&!window.confirm('Заблокировать '+u.login+'?'))return;u.active=!u.active;u.revision++;change(t);},!modifiable,u.active?'danger':'primary'),el('p','Смена пароля и управление сессиями не реализованы в данном контракте.','mp-help'));
 }else if(tab==='roles'){
  section(detail,'Назначения',['UUID','User ID','Role ID / Code','Object ID','Object Code','Revision','Действие'],aa.map(a=>[a.id,a.userId,a.roleId+' / '+(t.roles.find(r=>r.id===a.roleId)?.code||'—'),a.objectId??'Вся компания',a.objectCode,a.revision,button('Отозвать',()=>{t.assignments=t.assignments.filter(x=>x.id!==a.id);change(t);},!manageable,'danger')]));
  const role=select([['','Выберите роль'],...t.roles.filter(r=>r.active).map(r=>[r.id,r.description+' ('+r.code+')'])]),scope=select([['object','Конкретный объект'],['tenant','Вся компания']]),object=select([['','Выберите объект'],...objects(t).map(o=>[o.id,o.code])]);const objField=field('Объект',object);
  const grant=button('Назначить роль',()=>{const o=scope.value==='object'?objects(t).find(x=>x.id===object.value):null;if(!role.value||(scope.value==='object'&&(!o||objects(t).length>=100)))return;if(aa.some(a=>a.roleId===role.value&&a.objectId===(o?.id??null)))return;t.assignments.push({id:uuid(),userId:u.id,roleId:role.value,objectId:o?.id??null,objectCode:o?.code??null,revision:1});change(t);},!manageable,'primary');
  function syncGrant(){objField.hidden=scope.value==='tenant';grant.disabled=!manageable||!role.value||(scope.value==='object'&&(!object.value||objects(t).length>=100));}
  [role,scope,object].forEach(x=>x.addEventListener('change',syncGrant));syncGrant();
  [role,scope,object].forEach(x=>x.disabled=!manageable);
  detail.append(field('Роль',role),field('Область назначения',scope),objField,grant);
  section(detail,'Каталог ролей',['UUID','Code','Description','Active','Revision'],t.roles.map(r=>[r.id,r.code,r.description,r.active?'Да':'Нет',r.revision]));
 }else if(tab==='objects'){
  section(detail,'Назначения на объекты',['Object Code','Object UUID','Роль'],aa.filter(a=>a.objectId).map(a=>[a.objectCode,a.objectId,t.roles.find(r=>r.id===a.roleId)?.code]));
  const query=el('input');query.placeholder='UUID объекта';const out=el('p',undefined,'mp-help');
  detail.append(field('Поиск объекта по UUID',query),button('Получить объект',()=>{const o=objects(t).find(x=>x.id===query.value.trim());out.textContent=!validId(query.value.trim())?'Введите корректный UUID.':o?o.code+' · '+o.id+' · '+(o.objectTypeId??'—')+' · revision '+o.revision:'Объект не найден в демонстрационном реестре.';}),out,el('p','Видимые объекты демо: '+objects(t).length+' · лимит выдачи VDMS: 100','mp-help'));
 }else detail.append(el('p','История чтения и аудит: API не реализован в Tenant Console.','mp-empty'));
 if(!complete)detail.append(el('p','Список достиг ограничения VDMS (100); изменение и назначение ролей недоступны при неполных данных.','mp-help'));
 if(!modifiable&&(tab==='profile'||tab==='security'))detail.append(el('p','Изменение доступно только для пользователя без назначенных ролей при полном списке.','mp-help'));
}
$('add-user-button').addEventListener('click',()=>{form.reset();$('user-form-error').textContent='';dialog.showModal();$('tenant-user-name').focus();});
$('cancel-user').addEventListener('click',()=>dialog.close());
document.querySelector('[data-dialog-close="user-dialog"]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>form.reset());
form.addEventListener('submit',e=>{e.preventDefault();if(!session||session.login!=='sec01b-writer'||!form.reportValidity())return;const t=model(),login=$('tenant-user-login').value.trim(),displayName=$('tenant-user-name').value.trim();if(!displayName||t.users.some(u=>u.login===login)){ $('user-form-error').textContent='Укажите имя и уникальный логин.';return;}
 const u={id:uuid(),login,displayName,active:true,revision:1};t.users.push(u);selected=u.id;tab='profile';form.reset();dialog.close();change(t);});
function setSession(next){
 session=next;$('tenant-workspace').hidden=!session;
 for(const id of ['tenant-refresh','tenant-logout','tenant-reload'])$(id).disabled=!session;
 $('tenant-session').textContent=session?'Активная демо-сессия · '+session.login:'Нет сессии';
 if(session)render();else{selected=null;t=null;dialog.close();$('tenant-user-list').replaceChildren();$('vdms-user-detail').replaceChildren();$('vdms-company-summary').replaceChildren();}
}
$('tenant-login-form').addEventListener('submit',e=>{
 e.preventDefault();const company=$('tenant-company').value.trim(),login=$('tenant-login').value.trim(),secret=$('tenant-password').value;$('tenant-password').value='';
 if(company!=='mvp-a'||!['sec01b-writer','sec01b4-delegator'].includes(login)||secret!=='demo-only'){setSession(null);$('tenant-feedback').textContent='401 · вход отклонён (mock)';return;}
 selected=null;tab='profile';t=fixture(login);setSession({login,sessionId:uuid()});$('tenant-feedback').textContent='Вход выполнен (mock)';
});
$('tenant-refresh').addEventListener('click',()=>{if(session)$('tenant-feedback').textContent='Сессия обновлена (mock)';});
$('tenant-reload').addEventListener('click',()=>{if(session){render();$('tenant-feedback').textContent='Данные обновлены (mock)';}});
$('tenant-logout').addEventListener('click',()=>{setSession(null);$('tenant-feedback').textContent='Сессия завершена (mock)';});
}
mount();
})();

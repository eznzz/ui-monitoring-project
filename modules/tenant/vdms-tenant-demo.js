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
function field(label,input){const wrap=el('label',undefined,'mp-field');wrap.append(el('span',label),input);return wrap;}
function select(options){const s=el('select');options.forEach(([v,t])=>s.add(new Option(t,v)));return s;}
function mount({records,company,store,onChange}){
let selected=null,tab='profile';
const dialog=$('user-dialog'),form=$('tenant-user-form');
function model(){
 const t=records(),c=company();let changed=false;
 const set=(o,k,v)=>{if(o[k]===undefined){o[k]=v;changed=true;}};
 set(c,'vdmsId',uuid());set(c,'vdmsCode','demo-'+c.id.replace(/[^a-z0-9-]/gi,'-').toLowerCase());set(c,'vdmsStatus','active');
 set(t,'policyRevision',1);set(t,'assignmentCapability',{canManage:true});
 set(t,'roles',[{id:uuid(),code:'office',description:'Office (demo)',active:true,revision:1},{id:uuid(),code:'vessel',description:'Vessel (demo)',active:true,revision:1}]);
 set(t,'assignments',[]);set(t,'languageRegistry',{primary:'ru',languages:[{code:'ru',name:'Русский',isPrimary:true,isEnabled:true,sortOrder:1},{code:'en',name:'English',isPrimary:false,isEnabled:true,sortOrder:2}]});
 t.vessels.forEach(v=>{set(v,'vdmsId',uuid());set(v,'vdmsCode',MP.vesselSummary(v).imo||v.vdmsId);set(v,'vdmsRevision',1);});
 t.users.forEach(u=>{
  if(!validId(u.id)){u.id=uuid();changed=true;}
  set(u,'login',u.email||u.id);set(u,'displayName',u.name||u.login);set(u,'active',true);set(u,'revision',1);
  if(!u.vdmsMigrated){const role=t.roles.find(r=>r.code===u.role),v=t.vessels.find(v=>MP.vesselSummary(v).imo===u.vesselImo);if(role&&(!u.vesselImo||v))t.assignments.push({id:uuid(),userId:u.id,roleId:role.id,objectId:v?v.vdmsId:null,objectCode:v?v.vdmsCode:null,revision:1});u.vdmsMigrated=true;changed=true;}
 });
 if(changed)store();
 return t;
}
function objects(t){return t.vessels.map(v=>({id:v.vdmsId,code:v.vdmsCode,objectTypeId:'vessels',revision:v.vdmsRevision}));}
function assignments(t,u){return t.assignments.filter(a=>a.userId===u.id);}
function change(t){t.policyRevision++;store();render();onChange();}
function render(){
 const t=model(),c=company(),list=$('tenant-user-list'),detail=$('vdms-user-detail'),summary=$('vdms-company-summary');
 $('tenant-users-count').textContent=t.users.length;
 list.replaceChildren(el('p','Версия политики: '+t.policyRevision+' · Назначений: '+t.assignments.length+' · Управление назначениями: '+(t.assignmentCapability.canManage?'доступно':'недоступно'),'mp-help'));
 if(t.users.length)list.append(table(['Логин','Имя','Статус','Роли','Действие'],t.users.map(u=>[u.login,u.displayName,u.active?'Активен':'Отключён',assignments(t,u).length,button('Открыть',()=>{selected=u.id;tab='profile';render();})])));
 else list.append(el('p','Пользователи ещё не добавлены.','mp-empty'));
 summary.replaceChildren(el('h2','Компания и модули · VDMS demo','mp-section-title'));
 section(summary,'Компания',['UUID','Code','Название','Юридическое название','Торговое название','Статус'],[[c.vdmsId,c.vdmsCode,c.name,c.legalName,c.tradeName,c.vdmsStatus]]);
 section(summary,'Модули (демо-каталог)',['Code','Name EN','Name RU','Status','Enabled'],MP.MODULES.map(m=>[m.id,m.name,null,'available',c.modules?.[m.id]?.enabled?'Да':'Нет']));
 section(summary,'Языки · основной: '+t.languageRegistry.primary,['Code','Name','Primary','Enabled','Sort order'],t.languageRegistry.languages.map(l=>[l.code,l.name,l.isPrimary?'Да':'Нет',l.isEnabled?'Да':'Нет',l.sortOrder]));
 section(summary,'Объекты',['UUID','Code','Object type ID','Revision'],objects(t).map(o=>[o.id,o.code,o.objectTypeId,o.revision]));
 summary.append(el('p','Синтетические значения; каталог модулей и языков не получен с сервера. Ship Particulars и лицензии остаются отдельными концептуальными экранами.','mp-help'));
 detail.replaceChildren();const u=t.users.find(u=>u.id===selected);if(!u)return;
 const aa=assignments(t,u),modifiable=aa.length===0,manageable=t.assignmentCapability.canManage&&u.active;
 detail.append(el('h2',u.displayName+' · '+u.login,'mp-section-title'));
 const tabs=el('div',undefined,'mp-row');[['profile','Профиль'],['security','Безопасность'],['roles','Роли'],['objects','Объекты'],['history','История']].forEach(([k,l])=>{const b=button(l,()=>{tab=k;render();},false,k===tab?'primary':'secondary');b.setAttribute('aria-pressed',String(k===tab));tabs.append(b);});detail.append(tabs);
 if(tab==='profile'){
  section(detail,'Основные данные',['UUID','Логин','Имя','Revision','Роли'],[[u.id,u.login,u.displayName,u.revision,aa.length]]);
  const name=el('input');name.value=u.displayName;name.maxLength=120;name.disabled=!modifiable;
  detail.append(field('Отображаемое имя',name),button('Сохранить имя',()=>{const v=name.value.trim();if(!v||v===u.displayName)return;u.displayName=v;u.name=v;u.revision++;change(t);},!modifiable,'primary'));
 }else if(tab==='security'){
  section(detail,'Безопасность',['Статус','Revision'],[[u.active?'Доступ разрешён':'Заблокирован',u.revision]]);
  detail.append(button(u.active?'Заблокировать':'Разблокировать',()=>{if(u.active&&!window.confirm('Заблокировать '+u.login+'?'))return;u.active=!u.active;u.revision++;change(t);},!modifiable,u.active?'danger':'primary'),el('p','Смена пароля и управление сессиями не реализованы в данном контракте.','mp-help'));
 }else if(tab==='roles'){
  section(detail,'Назначения',['UUID','User ID','Role ID / Code','Object ID','Object Code','Revision','Действие'],aa.map(a=>[a.id,a.userId,a.roleId+' / '+(t.roles.find(r=>r.id===a.roleId)?.code||'—'),a.objectId??'Вся компания',a.objectCode,a.revision,button('Отозвать',()=>{t.assignments=t.assignments.filter(x=>x.id!==a.id);if(u.vesselImo&&a.objectCode===u.vesselImo)u.vesselImo='';change(t);},!manageable,'danger')]));
  const role=select([['','Выберите роль'],...t.roles.filter(r=>r.active).map(r=>[r.id,r.description+' ('+r.code+')'])]),scope=select([['object','Конкретный объект'],['tenant','Вся компания']]),object=select([['','Выберите объект'],...objects(t).map(o=>[o.id,o.code])]);const objField=field('Объект',object);
  const grant=button('Назначить роль',()=>{const o=scope.value==='object'?objects(t).find(x=>x.id===object.value):null;if(!role.value||(scope.value==='object'&&!o))return;if(aa.some(a=>a.roleId===role.value&&a.objectId===(o?.id??null)))return;t.assignments.push({id:uuid(),userId:u.id,roleId:role.value,objectId:o?.id??null,objectCode:o?.code??null,revision:1});change(t);},!manageable,'primary');
  scope.addEventListener('change',()=>{objField.hidden=scope.value==='tenant';});
  [role,scope,object].forEach(x=>x.disabled=!manageable);
  detail.append(field('Роль',role),field('Область назначения',scope),objField,grant);
  section(detail,'Каталог ролей',['UUID','Code','Description','Active','Revision'],t.roles.map(r=>[r.id,r.code,r.description,r.active?'Да':'Нет',r.revision]));
 }else if(tab==='objects'){
  section(detail,'Назначения на объекты',['Object Code','Object UUID','Роль'],aa.filter(a=>a.objectId).map(a=>[a.objectCode,a.objectId,t.roles.find(r=>r.id===a.roleId)?.code]));
  const query=el('input');query.placeholder='UUID объекта';const out=el('p',undefined,'mp-help');
  detail.append(field('Поиск объекта по UUID',query),button('Получить объект',()=>{const o=objects(t).find(x=>x.id===query.value.trim());out.textContent=o?o.code+' · '+o.id+' · '+o.objectTypeId+' · revision '+o.revision:'Объект не найден в демонстрационном реестре.';}),out,el('p','Видимые объекты демо: '+objects(t).length,'mp-help'));
 }else detail.append(el('p','История чтения и аудит: API не реализован в Tenant Console.','mp-empty'));
 if(!modifiable&&(tab==='profile'||tab==='security'))detail.append(el('p','Изменение доступно только для пользователя без назначенных ролей.','mp-help'));
}
$('add-user-button').addEventListener('click',()=>{form.reset();$('user-form-error').textContent='';dialog.showModal();$('tenant-user-name').focus();});
$('cancel-user').addEventListener('click',()=>dialog.close());
document.querySelector('[data-dialog-close="user-dialog"]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>form.reset());
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const t=model(),login=$('tenant-user-email').value.trim(),displayName=$('tenant-user-name').value.trim();if(!displayName||t.users.some(u=>u.login===login)){ $('user-form-error').textContent='Укажите имя и уникальный логин.';return;}
 const u={id:uuid(),login,displayName,active:true,revision:1,vdmsMigrated:true,name:displayName,email:login,role:'office',vesselImo:''};t.users.push(u);selected=u.id;tab='profile';form.reset();dialog.close();change(t);});
return {render,hasObjectAssignments(v){return model().assignments.some(a=>a.objectId===v.vdmsId);}};
}
window.MP_VDMS={mount};
})();

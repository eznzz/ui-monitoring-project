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
 const matches=data.companies.filter(c=>[c.name,c.code,c.id].some(v=>v.toLowerCase().includes(q)));
 $('company-list-count').textContent=matches.length;
 list.replaceChildren();
 if(!matches.length){const p=document.createElement('p');p.className='mp-empty';p.textContent='Компании не найдены';list.append(p);return;}
 matches.forEach(c=>{
  const b=document.createElement('button');b.type='button';b.className='mp-record mp-record--button';
  b.setAttribute('aria-pressed',String(c.id===selected));
  b.innerHTML='<span><strong>'+MP.escape(c.name)+'</strong><small>'+MP.escape(c.id)+'</small></span><span class="mp-badge">'+MP.escape(c.code)+'</span>';
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
  '<label class="mp-module-check" for="'+paidId+'"><input type="checkbox" id="'+paidId+'" data-action="paid" data-module="'+m.id+'"'+(entry.paid?' checked':'')+'>Оплачено</label>'+
  '<label class="mp-module-check" for="'+enabledId+'"><input type="checkbox" id="'+enabledId+'" data-action="enabled" data-module="'+m.id+'"'+(entry.enabled?' checked':'')+(entry.paid?'':' disabled')+'>Включён</label>';
  modules.append(row);
 });
 const enabled=MP.countEnabled(c),paid=MP.MODULES.filter(m=>c.modules?.[m.id]?.paid).length;
 $('modules-counter').textContent=enabled+' включено / '+paid+' оплачено';
 $('company-active-modules').textContent=enabled+' из '+MP.MODULES.length;
}
function chooseTab(id,focus){
 activeTab=id;
 ['profile','licenses'].forEach(tab=>{
  const button=$('platform-tab-'+tab),panel=$('platform-pane-'+tab),active=tab===id;
  button.setAttribute('aria-selected',String(active));
  button.tabIndex=active?0:-1;panel.hidden=!active;
 });
 if(focus)$('platform-tab-'+id).focus();
}
document.querySelectorAll('[data-platform-tab]').forEach(button=>{
 button.addEventListener('click',()=>chooseTab(button.dataset.platformTab));
 button.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const tab=event.key==='Home'?'profile':event.key==='End'?'licenses':event.key==='ArrowRight'?'licenses':'profile';
  chooseTab(tab,true);
 });
});
function render(){
 if(!selectedCompany())selected=data.companies[0]?.id||'';
 renderCompanyList();
 const c=selectedCompany();if(!c)return;
 $('selected-company-heading').textContent=c.name;
 $('selected-company-id').textContent=c.id+' · '+c.code;
 $('company-tenant-id').textContent=c.id;
 $('company-code').textContent=c.code;
 $('company-types').textContent=typeLabels(c).join(', ')||'Не выбран';
 $('open-tenant').href='../tenant/index.html?tenant='+encodeURIComponent(c.id);
 renderModules(c);chooseTab(activeTab);
}
modules.addEventListener('change',e=>{
 const input=e.target.closest('input[data-module][data-action]');
 if(!input)return;
 const c=selectedCompany(),id=input.dataset.module,action=input.dataset.action;
 if(!c||!MP.MODULES.some(m=>m.id===id))return;
 const entry=c.modules[id]||{paid:false,enabled:false};
 if(action==='paid'){
  entry.paid=input.checked;if(!entry.paid)entry.enabled=false;
 }else{
  if(!entry.paid){input.checked=false;MP.setFeedback('modules-feedback','Сначала требуется отметка оплаты.',true);return;}
  entry.enabled=input.checked;
 }
 c.modules[id]=entry;
 const restore=input.id;
 store();render();
 $(restore)?.focus();
 MP.setFeedback('modules-feedback',MP.MODULES.find(m=>m.id===id).name+': '+(entry.enabled?'доступ включён':entry.paid?'оплата отмечена':'нет оплаченного доступа')+' · mock-режим.',false);
});
search.addEventListener('input',renderCompanyList);
function renderTypes(){
 const wrap=$('company-object-types');wrap.replaceChildren();
 MP.OBJECT_TYPES.forEach(t=>{
  const label=document.createElement('label');label.className='mp-type-option';
  const cb=document.createElement('input');cb.type='checkbox';cb.name='objectType';cb.value=t.id;
  cb.checked=t.id==='vessels';
  const div=document.createElement('div');
  const strong=document.createElement('strong');strong.textContent=t.name;
  const small=document.createElement('p');small.textContent=t.description;
  div.append(strong,small);label.append(cb,div);wrap.append(label);
 });
}
$('add-company-button').addEventListener('click',()=>{
 $('company-form').reset();$('company-form-error').textContent='';renderTypes();
 dialog.showModal();$('new-company-name').focus();
});
$('cancel-company').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('company-form').addEventListener('submit',e=>{
 e.preventDefault();
 const name=$('new-company-name').value.trim(),code=$('new-company-code').value.trim();
 const objectTypes=[...document.querySelectorAll('#company-object-types input:checked')].map(el=>el.value);
 if(!name||!code){$('company-form-error').textContent='Укажите название и код компании.';return;}
 if(!objectTypes.length){$('company-form-error').textContent='Выберите хотя бы один тип объектов.';return;}
 if(data.companies.some(c=>c.code.toLowerCase()===code.toLowerCase())){
  $('company-form-error').textContent='Код компании уже занят.';return;
 }
 const nums=data.companies.map(c=>Number(c.id.match(/tenant_db_(\d+)$/)?.[1]||0));
 const id='tenant_db_'+String(Math.max(0,...nums)+1).padStart(6,'0');
 data.companies.push({id,name,code,objectTypes,modules:{}});
 data.tenants[id]={users:[],vessels:[]};
 selected=id;search.value='';activeTab='profile';
 store();dialog.close();render();
 MP.setFeedback('platform-feedback','Компания создана с типом объектов: '+typeLabels(selectedCompany()).join(', ')+'. Это локальные демоданные.',false);
});
window.addEventListener('storage',e=>{if(e.key===MP.KEY){data=MP.state();render();}});
renderTypes();render();
})();
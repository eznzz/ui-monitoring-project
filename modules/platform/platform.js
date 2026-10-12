(function(){
'use strict';
let data=MP.state();
let selected=data.companies[0]?.id||'tenant_db_000001';
const $=id=>document.getElementById(id);
const list=$('company-list'),modules=$('platform-module-list');
const search=$('company-search');
const dialog=$('company-dialog');
function current(){return MP.company(data,selected);}
function persist(){if(!MP.save(data))MP.setFeedback('platform-feedback','Не удалось записать демоданные в браузере.',true);}
function renderCompanies(){
  const term=search.value.trim().toLowerCase();
  const matching=data.companies.filter(c=>[c.name,c.code,c.id].some(t=>t.toLowerCase().includes(term)));
  $('company-count').textContent=data.companies.length;
  $('company-list-count').textContent=matching.length;
  list.replaceChildren();
  if(!matching.length){
    const p=document.createElement('p');p.className='mp-empty';p.textContent='Компании не найдены';list.append(p);return;
  }
  matching.forEach(c=>{
    const b=document.createElement('button');
    b.type='button';b.className='mp-record mp-record--button';
    b.setAttribute('aria-pressed',String(c.id===selected));
    b.innerHTML='<span><strong>'+MP.escape(c.name)+'</strong><small>'+MP.escape(c.id)+'</small></span><span class="mp-badge">'+MP.escape(c.code)+'</span>';
    b.addEventListener('click',()=>{selected=c.id;render();});
    list.append(b);
  });
}
function renderModules(c){
  modules.replaceChildren();
  if(!c)return;
  MP.MODULES.forEach(m=>{
    const entry=c.modules[m.id]||{paid:false,enabled:false};
    const row=document.createElement('div');row.className='mp-module';
    const paidId='paid-'+m.id,enabledId='enabled-'+m.id;
    row.innerHTML='<div><strong>'+MP.escape(m.name)+'</strong><small>'+MP.escape(m.detail)+'</small></div>'+
      '<label class="mp-module-check" for="'+paidId+'"><input type="checkbox" id="'+paidId+'" data-module="'+m.id+'" data-action="paid"'+(entry.paid?' checked':'')+'>Оплачено</label>'+
      '<label class="mp-module-check" for="'+enabledId+'"><input type="checkbox" id="'+enabledId+'" data-module="'+m.id+'" data-action="enabled"'+(entry.enabled?' checked':'')+(entry.paid?'':' disabled')+'>Включён</label>';
    modules.append(row);
  });
}
function render(){
  if(!current())selected=data.companies[0]?.id||'';
  renderCompanies();
  const c=current();
  if(!c)return;
  $('selected-company-heading').textContent=c.name;
  $('selected-company-id').textContent=c.id+' · '+c.code;
  $('open-tenant').href='../tenant/index.html?tenant='+encodeURIComponent(c.id);
  $('paid-count').textContent=MP.MODULES.filter(m=>c.modules[m.id]?.paid).length;
  $('enabled-count').textContent=MP.countEnabled(c);
  renderModules(c);
}
modules.addEventListener('change',event=>{
  const input=event.target.closest('input[data-module][data-action]');
  if(!input)return;
  const c=current(),key=input.dataset.module,action=input.dataset.action;
  if(!c||!MP.MODULES.some(m=>m.id===key))return;
  const entry=c.modules[key]||{paid:false,enabled:false};
  if(action==='paid'){
    entry.paid=input.checked;
    if(!entry.paid)entry.enabled=false;
  }else{
    if(!entry.paid){input.checked=false;MP.setFeedback('modules-feedback','Сначала отметьте оплату модуля.',true);return;}
    entry.enabled=input.checked;
  }
  c.modules[key]=entry;
  persist();render();
  MP.setFeedback('modules-feedback',key+': '+(entry.enabled?'доступ включён':entry.paid?'оплачено, ожидает включения':'доступ не предоставлен')+'. Это демонстрационная запись.',false);
});
search.addEventListener('input',renderCompanies);
$('add-company-button').addEventListener('click',()=>{
  $('company-form').reset();$('company-form-error').textContent='';
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  $('new-company-name').focus();
});
$('cancel-company').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('company-form').addEventListener('submit',event=>{
  event.preventDefault();
  const name=$('new-company-name').value.trim(),code=$('new-company-code').value.trim();
  if(!name||!code){$('company-form-error').textContent='Заполните название и код.';return;}
  if(data.companies.some(c=>c.code.toLowerCase()===code.toLowerCase())){
    $('company-form-error').textContent='Этот код уже используется.';return;
  }
  const nums=data.companies.map(c=>Number(c.id.match(/tenant_db_(\d+)$/)?.[1]||0));
  const next=String(Math.max(0,...nums)+1).padStart(6,'0');
  const id='tenant_db_'+next;
  data.companies.push({id,name,code,modules:{}});
  data.tenants[id]={users:[],vessels:[]};
  selected=id;search.value='';
  persist();render();dialog.close();
  MP.setFeedback('platform-feedback','Компания добавлена в демонстрационные данные.',false);
});
window.addEventListener('storage',event=>{
  if(event.key===MP.KEY){data=MP.state();render();}
});
render();
})();

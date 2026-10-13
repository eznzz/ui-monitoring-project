(function(){
'use strict';
const $=id=>document.getElementById(id);
const schema=window.MP_SHIP_SCHEMA;
const params=new URLSearchParams(location.search);
let state=MP.state();
const requested=params.get('tenant');
const tenantId=requested||state.companies[0]?.id||'';
const requestedId=params.get('id')||'';
const originalIMO=params.get('imo')||''; // Legacy demo URL, normalized after save.
const company=MP.company(state,tenantId);
const authorizedObjectType=company?.objectTypeId==='vessels'&&company.status!=='archived';
const vesselList=MP.vessels(state,tenantId);
let source=vesselList.find(v=>requestedId?v.id===requestedId:MP.vesselSummary(v).imo===originalIMO);
const originalValues=source?{...source.fields}:{};
let holdRows=source?.holds?source.holds.map(h=>({...h})):[];
let holdTotals=source?.holdTotals?{...source.holdTotals}:{};
const form=$('vessel-particulars-form');
const fieldsPane=$('editor-sections'),navigation=$('editor-sections-nav');
const holdTotalFields=[
 {id:'totalCbm',label:'TOTAL CBM'},
 {id:'totalCbft',label:'TOTAL CBFT'},
 {id:'totalSqm',label:'TOTAL SQM'}
];
function el(tag,attrs={},text){
 const node=document.createElement(tag);
 Object.entries(attrs).forEach(([name,val])=>node.setAttribute(name,String(val)));
 if(text!==undefined)node.textContent=text;
 return node;
}
function standardField(f,value,required){
 const outer=el('div',{class:'mp-field'});
 const label=el('label',{for:'ship-'+f.id},f.label+(required?' *':''));
 const input=f.id==='shipType'
  ?el('select',{id:'ship-'+f.id,'data-field':f.id})
  :el('input',{type:'text',id:'ship-'+f.id,'data-field':f.id,autocomplete:'off'});
 if(f.id==='shipType'){
  const types=[
   ['', 'Выберите тип судна'],
   ['reefer','Reefer / рефрижератор'],
   ['bulk-carrier','Bulk Carrier / балкер'],
   ['tanker','Tanker / танкер'],
   ['container-ship','Container Ship / контейнеровоз'],
   ['general-cargo','General Cargo / сухогруз'],
   ['ro-ro','Ro-Ro'],
   ['passenger','Passenger / пассажирское'],
   ['fishing','Fishing / рыболовное'],
   ['gas-carrier','Gas Carrier / газовоз'],
   ['offshore','Offshore / специальное'],
   ['tug','Tug / буксир'],
   ['other','Other / другое']
  ];
  types.forEach(([id,label])=>input.append(el('option',{value:id},label)));
  // Preserve ship type strings from existing Ship Particulars records.
  if(value&&!types.some(([id])=>id===value)){
   input.append(el('option',{value},value));
  }
 }
 input.value=value||'';
 if(required){input.required=true;input.setAttribute('aria-required','true');}
 if(f.id==='imo'){input.inputMode='numeric';input.maxLength=7;input.pattern='[0-9]{7}';input.placeholder='7 цифр';}
 if(f.id==='shipName'){input.maxLength=120;input.placeholder='Название судна';}
 outer.append(label,input);
 return outer;
}
function renderSections(){
 fieldsPane.replaceChildren();navigation.replaceChildren();
 schema.sections.forEach((section,i)=>{
  const link=el('a',{href:'#ship-section-'+section.id},String(i+1).padStart(2,'0')+'  '+section.ru);
  navigation.append(link);
  const sectionEl=el('section',{class:'mp-card mp-editor-section mp-stack',id:'ship-section-'+section.id});
  const heading=el('header',{});
  heading.append(el('span',{class:'mp-eyebrow'},String(i+1).padStart(2,'0')+' / SHIP PARTICULARS'));
  heading.append(el('h2',{},section.title));
  heading.append(el('p',{},section.ru));
  sectionEl.append(heading);
  if(section.kind==='holds'){
   const toolbar=el('div',{class:'mp-page-tools'});
   const note=el('p',{class:'mp-help'},'Вносите размеры трюмов по строкам. Единицы и примечания сохраняются как текст, как в исходном документе.');
   const actions=el('div',{class:'mp-row'});
   const append=el('button',{type:'button',class:'mp-btn mp-btn--secondary',id:'hold-add'},'+ Помещение');
   const sample=el('button',{type:'button',class:'mp-btn mp-btn--secondary',id:'hold-template'},'Добавить 1A–4C');
   actions.append(append,sample);toolbar.append(note,actions);sectionEl.append(toolbar);
   // One responsive card layout at every viewport: no horizontal scrollbar.
   sectionEl.append(el('div',{id:'hold-mobile-list',class:'mp-mobile-holds mp-holds-grid'}));
   const totals=el('div',{class:'mp-form-grid'});
   holdTotalFields.forEach(f=>{
    const field=el('div',{class:'mp-field'});
    field.append(el('label',{for:'hold-total-'+f.id},f.label));
    const input=el('input',{type:'text',id:'hold-total-'+f.id,'data-hold-total':f.id});
    input.value=holdTotals[f.id]||'';field.append(input);totals.append(field);
   });
   sectionEl.append(el('p',{class:'mp-help'},'Итоговые значения — отдельные строки исходного Ship Particulars. Они не вычисляются автоматически и не заменяют Total Cargo Volume.'));
   sectionEl.append(totals);
  }else{
   const grid=el('div',{class:'mp-editor-fields'});
   section.fields.forEach(field=>grid.append(standardField(field,originalValues[field.id],['shipName','imo'].includes(field.id))));
   sectionEl.append(grid);
  }
  fieldsPane.append(sectionEl);
 });
 renderHolds();
 $('hold-add').addEventListener('click',()=>{holdRows.push({});renderHolds();});
 $('hold-template').addEventListener('click',()=>{
  const ids=['1A','1B','2A','2B','2C','3A','3B','3C','4A','4B','4C'];
  const current=new Set(holdRows.map(h=>h.holdDeck));
  ids.forEach(id=>{if(!current.has(id))holdRows.push({holdDeck:id});});
  renderHolds();updateProgress();
 });
}
function buildHoldInput(index,f){
 const input=el('input',{type:'text','data-hold-index':index,'data-hold-key':f.id,'aria-label':f.label+' · помещение '+(index+1)});
 input.value=holdRows[index][f.id]||'';
 return input;
}
function deleteButton(index){
 const b=el('button',{type:'button',class:'mp-small-action','data-hold-delete':index,'aria-label':'Удалить помещение '+(index+1)},'Удалить');
 return b;
}
function renderHolds(){
 const cards=$('hold-mobile-list');
 if(!cards)return;
 cards.replaceChildren();
 if(!holdRows.length){
  cards.append(el('p',{class:'mp-empty'},'Помещений пока нет. Нажмите «+ Помещение» или «Добавить 1A–4C».'));
 }
 holdRows.forEach((item,index)=>{
  const card=el('article',{class:'mp-hold-card'});
  const header=el('div',{class:'mp-row mp-between'});
  header.append(el('strong',{},item.holdDeck||'Помещение '+(index+1)));
  header.append(deleteButton(index));
  card.append(header);
  const fields=el('div',{class:'mp-hold-card-fields'});
  schema.holdFields.forEach(f=>{
   const field=el('div',{class:'mp-field'});
   const input=buildHoldInput(index,f);
   const id='hold-card-'+index+'-'+f.id;
   input.id=id;
   field.append(el('label',{for:id},f.label));field.append(input);
   fields.append(field);
  });
  card.append(fields);cards.append(card);
 });
 updateProgress();
}
fieldsPane.addEventListener('input',event=>{
 const input=event.target;
 if(input.matches('[data-hold-index]')){
  const index=Number(input.dataset.holdIndex),key=input.dataset.holdKey;
  if(!holdRows[index])return;
  holdRows[index][key]=input.value;
  if(key==='holdDeck'){
   const heading=fieldsPane.querySelectorAll('#hold-mobile-list .mp-hold-card')[index]?.querySelector('strong');
   if(heading)heading.textContent=input.value||'Помещение '+(index+1);
  }
 }else if(input.matches('[data-hold-total]')){
  holdTotals[input.dataset.holdTotal]=input.value;
 }
 updateProgress();
});
fieldsPane.addEventListener('click',event=>{
 const button=event.target.closest('[data-hold-delete]');
 if(!button)return;
 const index=Number(button.dataset.holdDelete);
 if(index<0||index>=holdRows.length)return;
 holdRows.splice(index,1);renderHolds();
});
function updateProgress(){
 const filled=[...document.querySelectorAll('[data-field]')].filter(input=>input.value.trim()).length;
 const holdFilled=holdRows.reduce((n,row)=>n+schema.holdFields.filter(f=>String(row[f.id]||'').trim()).length,0);
 const totalFilled=holdTotalFields.filter(f=>String(holdTotals[f.id]||'').trim()).length;
 const totalFields=schema.sections.reduce((n,section)=>n+(section.fields?.length||0),0);
 $('editor-progress').textContent='Заполнено '+(filled+holdFilled+totalFilled)+' из '+(totalFields+holdRows.length*schema.holdFields.length+holdTotalFields.length)+' полей';
}
function resetEditor(){
 if(!window.confirm('Очистить все поля формы? Уже сохранённые данные не изменятся до нового сохранения.'))return;
 document.querySelectorAll('[data-field],[data-hold-total]').forEach(input=>{input.value='';});
 holdRows=[];holdTotals={};renderHolds();updateProgress();
 MP.setFeedback('editor-feedback','Форма очищена. Для сохранения требуются название судна и IMO.',false);
}
$('editor-reset').addEventListener('click',resetEditor);
function renderObjectMeta(){
 const el=$('editor-object-meta');if(!el)return;
 el.replaceChildren();
 if(!source){el.textContent='После первого сохранения: inactive · Object ID будет назначен автоматически.';return;}
 const text='Object ID: '+source.id+' · Статус: '+source.status+
  ' · История изменений: '+(source.history||[]).length+' записей';
 el.textContent=text;
 const log=$('editor-history');if(!log)return;
 log.replaceChildren();
 const history=(source.history||[]).slice().reverse();
 if(!history.length)return;
 const details=document.createElement('details'),title=document.createElement('summary');
 title.textContent='История карточки и статусов ('+history.length+')';details.append(title);
 const list=document.createElement('ul');
 history.forEach(event=>{
  const entry=document.createElement('li');
  entry.textContent=(event.at||'—')+' · '+(event.action||'изменение')+
   (event.from?' · '+event.from+' → '+event.to:'')+
   (event.changedFields?.length?' · Поля: '+event.changedFields.join(', '):'');
  list.append(entry);
 });
 details.append(list);log.append(details);
}
function saveForm(event){
 event.preventDefault();
 const latest=MP.company(MP.state(),tenantId);
 if(!latest||latest.status==='archived'){
  MP.setFeedback('editor-feedback','Компания недоступна или архивирована. Сохранение недоступно.',true);return;
 }
 if(!authorizedObjectType){MP.setFeedback('editor-feedback','Компания не имеет типа объектов Vessels.',true);return;}
 const name=$('ship-shipName'),imo=$('ship-imo');
 if(!name.value.trim()){MP.setFeedback('editor-feedback','Укажите Ship\'s Name.',true);name.focus();name.scrollIntoView({block:'center'});return;}
 if(!/^\d{7}$/.test(imo.value.trim())){MP.setFeedback('editor-feedback','IMO No. должен содержать ровно 7 цифр.',true);imo.focus();imo.scrollIntoView({block:'center'});return;}
 const fields={};
 document.querySelectorAll('[data-field]').forEach(input=>{fields[input.dataset.field]=input.value.trim();});
 const vessels=MP.vessels(state,tenantId);
 const duplicate=vessels.some(v=>v!==source&&MP.vesselSummary(v).imo===fields.imo);
 if(duplicate){MP.setFeedback('editor-feedback','Судно с таким IMO уже существует в этой компании.',true);imo.focus();return;}
 const timestamp=new Date().toISOString(),created=!source;
 const changes=Object.keys(fields).filter(key=>fields[key]!==source?.fields?.[key]);
 const record={
  id:source?.id||MP.newId('object'),objectTypeId:'vessels',
  status:source?.status||'inactive',
  fields,holds:holdRows.map(h=>({...h})),holdTotals:{...holdTotals},
  updatedAt:timestamp,history:source?.history||[]
 };
 record.history.push({at:timestamp,actor:'demo-admin',action:created?'particulars.create':'particulars.update',changedFields:changes});
 if(source)Object.assign(source,record);
 else{MP.tenant(state,tenantId).objects.push(record);source=record;}
 MP.addAudit(state,tenantId,created?'object.create':'object.update',record.id,
  'Ship Particulars: '+changes.join(', '));
 if(!MP.save(state)){MP.setFeedback('editor-feedback','Браузер не сохранил данные. Проверьте доступность localStorage.',true);return;}
 MP.setFeedback('editor-feedback',
  created?'Карточка создана в статусе inactive. Для работы в модулях её нужно включить вручную.':
  'Карточка обновлена; Object ID и назначения не изменились.',false);
 const url=new URL(location.href);
 url.searchParams.delete('imo');
 url.searchParams.set('id',record.id);
 url.searchParams.set('tenant',tenantId);
 window.history.replaceState(null,'',url.toString());
 $('editor-title').textContent=fields.shipName||'Карточка судна';
 renderObjectMeta();
}
form.addEventListener('submit',saveForm);
if(!company||!authorizedObjectType){
 fieldsPane.textContent='Создание карточек судов недоступно: тип Vessels не назначен платформой.';
 form.querySelector('button[type=submit]').disabled=true;
 return;
}
$('editor-tenant-code').textContent=tenantId;
$('editor-back').href='index.html?tenant='+encodeURIComponent(tenantId)+'#vessels';
$('editor-back-sidebar').href=$('editor-back').href;
$('editor-title').textContent=source?MP.vesselSummary(source).name:'Новая карточка судна';
renderObjectMeta();
renderSections();updateProgress();
})();
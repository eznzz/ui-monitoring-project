/* A single reusable confirmation dialog for UI-only deletion actions. */
(function(){
'use strict';
function confirmRemoval({title,description,buttonLabel='Удалить',destructive=true}={}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');
  dialog.className='mp-dialog mp-confirm-dialog';
  dialog.setAttribute('aria-labelledby','mp-confirm-title');
  dialog.setAttribute('aria-describedby','mp-confirm-description');
  const form=document.createElement('form');
  form.method='dialog';form.className='mp-confirm-body';
  const heading=document.createElement('div');heading.className='mp-confirm-heading';
  const symbol=document.createElement('span');symbol.className='mp-confirm-symbol';symbol.setAttribute('aria-hidden','true');
  const icon=document.createElement('i');icon.className='fa-solid fa-triangle-exclamation';symbol.append(icon);
  const copy=document.createElement('div');
  const h=document.createElement('h2');h.id='mp-confirm-title';h.textContent=title||'Подтвердите удаление';
  const p=document.createElement('p');p.id='mp-confirm-description';p.className='mp-help';p.textContent=description||'Действие нельзя отменить.';
  copy.append(h,p);heading.append(symbol,copy);
  const actions=document.createElement('div');actions.className='mp-form-actions';
  const cancel=document.createElement('button');cancel.type='submit';cancel.value='cancel';cancel.className='mp-btn mp-btn--secondary';cancel.textContent='Отмена';
  const erase=document.createElement('button');erase.type='submit';erase.value='delete';erase.className=destructive?'mp-btn mp-btn--danger':'mp-btn mp-btn--primary';
  const eraseIcon=document.createElement('i');eraseIcon.className=destructive?'fa-solid fa-trash-can':'fa-solid fa-check';eraseIcon.setAttribute('aria-hidden','true');
  erase.append(eraseIcon,document.createTextNode(' '+buttonLabel));actions.append(cancel,erase);
  form.append(heading,actions);dialog.append(form);document.body.append(dialog);
  let settled=false;
  function finish(confirmed){if(settled)return;settled=true;dialog.remove();resolve(confirmed);}
  dialog.addEventListener('close',()=>finish(dialog.returnValue==='delete'),{once:true});
  dialog.addEventListener('cancel',()=>{dialog.returnValue='cancel';},{once:true});
  try{dialog.showModal();cancel.focus();}catch(_){finish(false);}
 });
}
window.MP_CONFIRM={remove:confirmRemoval,action:opts=>confirmRemoval({...opts,destructive:false})};
})();

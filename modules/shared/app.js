/* Monitoring Project: shared UI-only state and shell.
 * No backend or real authentication. localStorage is demonstrational only. */
(function(){
  'use strict';
  const KEY='mp-ui-prototype-v1';
  const MODULES=[
    {id:'core',name:'Core',detail:'Расширенные функции учёта судов и справочников'},
    {id:'auth',name:'Auth',detail:'Расширенное управление ролями и доступом'},
    {id:'documents',name:'Documents',detail:'Сертификаты, документы и сроки действия'},
    {id:'crewing',name:'Crewing',detail:'Экипажи, контракты и ротации'},
    {id:'supply',name:'Supply',detail:'Заявки, закупки и снабжение'},
    {id:'vms',name:'VMS',detail:'Позиции, маршруты и телеметрия'},
    {id:'performance',name:'Performance',detail:'Топливо, операции и показатели'},
    {id:'reports',name:'Reports',detail:'Шаблоны и подготовка отчётов'},
    {id:'sync',name:'Sync',detail:'Статусы обмена и конфликты'}
  ];
  function defaults(){
    return {
      version:1,
      companies:[{id:'tenant_db_000001',name:'Демо-компания',code:'COMP-001',modules:{}}],
      tenants:{tenant_db_000001:{users:[],vessels:[]}}
    };
  }
  function state(){
    let raw=null;
    try{raw=JSON.parse(localStorage.getItem(KEY));}catch(_){}
    if(!raw||raw.version!==1||!Array.isArray(raw.companies)||!raw.tenants)return defaults();
    return raw;
  }
  function save(s){
    try{localStorage.setItem(KEY,JSON.stringify(s));return true;}catch(_){return false;}
  }
  function company(s,id){return s.companies.find(c=>c.id===id)||null;}
  function escape(value){
    return String(value??'').replace(/[&<>"']/g, c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function countEnabled(c){
    return MODULES.filter(m=>c.modules?.[m.id]?.paid&&c.modules?.[m.id]?.enabled).length;
  }
  function setFeedback(id,message,isError){
    const target=document.getElementById(id);
    if(!target)return;
    target.textContent=message;
    target.setAttribute('role',isError?'alert':'status');
  }
  function theme(dark){
    document.body.classList.toggle('dark',dark);
    document.querySelectorAll('[data-theme-toggle]').forEach(b=>{
      b.setAttribute('aria-pressed',String(dark));
      b.textContent=dark?'☀ Светлая тема':'◐ Тёмная тема';
    });
  }
  function initShared(){
    let stored=null;try{stored=localStorage.getItem('vms-theme');}catch(_){}
    theme(stored==='dark'||(stored!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches));
    document.querySelectorAll('[data-theme-toggle]').forEach(b=>{
      b.addEventListener('click',()=>{
        const dark=!document.body.classList.contains('dark');
        theme(dark);
        try{localStorage.setItem('vms-theme',dark?'dark':'light');}catch(_){}
      });
    });
    window.addEventListener('storage',e=>{if(e.key==='vms-theme')theme(e.newValue==='dark');});
    const menu=document.querySelector('[data-mp-sidebar]');
    const overlay=document.querySelector('[data-mp-overlay]');
    const trigger=document.querySelector('[data-mp-menu]');
    if(menu&&overlay&&trigger){
      function close(){
        menu.classList.remove('is-open');
        overlay.classList.remove('is-open');
        trigger.setAttribute('aria-expanded','false');
      }
      trigger.addEventListener('click',()=>{
        const open=menu.classList.toggle('is-open');
        overlay.classList.toggle('is-open',open);
        trigger.setAttribute('aria-expanded',String(open));
      });
      overlay.addEventListener('click',close);
      menu.addEventListener('click',e=>{if(e.target.closest('a'))close();});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('is-open')){close();trigger.focus();}});
      window.addEventListener('resize',()=>{if(window.innerWidth>950)close();});
    }
  }
  window.MP={KEY,MODULES,defaults,state,save,company,countEnabled,escape,setFeedback};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initShared);
  else initShared();
})();

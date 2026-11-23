(function () {
"use strict";
// MOCK-ONLY. No network, localStorage, credentials, cookies, token persistence, or database access.
const prefix="/internal/platform-admin";
const rights={
 owner:["tenant.read","tenant.create","tenant.draft.update","tenant.activate"],
 reader:["tenant.read"],
 reviewer:["tenant.provision.approve"]
};
const seed=[
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c801",code:"NORTH",name:"North Shipping (demo)",status:"draft",revision:3,profile:{legalName:"North Shipping Ltd.",tradeName:"North",description:"Тестовая компания",registrationNumber:"",taxNumber:"",countryCode:"GB",contactEmail:"office@example.test",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c802",code:"BLUE",name:"Blue Logistics (demo)",status:"active",revision:7,profile:{legalName:"Blue Logistics",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c803",code:"EAST",name:"East Maritime (demo)",status:"provisioning",revision:2,profile:{legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c804",code:"WEST",name:"West Operations (demo)",status:"suspended",revision:5,profile:{legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c805",code:"SOUTH",name:"South Transport (demo)",status:"disabled",revision:4,profile:{legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""}}
];
let companies=structuredClone(seed), session=null, page="login", pageNo=0, selectedId=null, editingId=null;
let reviews=[], history=[], forcedConflict=false;
const $=id=>document.getElementById(id);
const profile=()=>({legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""});
const permitted=right=>Boolean(session?.permissions.includes(right));
const selected=()=>companies.find(c=>c.tenantId===selectedId);
const requestId=()=>crypto.randomUUID();
const textNode=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=String(value??"");if(className)node.className=className;return node;};
function feedback(message,error=false){$("feedback").textContent=message;$("feedback").dataset.error=String(error);}
function setupTheme(){
 const key="vms-theme";
 let stored=null;try{stored=localStorage.getItem(key);}catch(_){}
 const apply=dark=>{document.body.classList.toggle("dark",dark);$("theme-toggle").textContent=dark?"☀ Светлая тема":"◐ Тёмная тема";};
 apply(stored==="dark"||(stored!== "light"&&window.matchMedia("(prefers-color-scheme: dark)").matches));
 $("theme-toggle").addEventListener("click",()=>{const dark=!document.body.classList.contains("dark");apply(dark);try{localStorage.setItem(key,dark?"dark":"light");}catch(_){}});
}
function navigate(next){
 if(!["login","companies","activation","contract"].includes(next))next="login";
 page=next;
 document.querySelectorAll("[data-screen]").forEach(el=>{el.hidden=el.dataset.screen!==next;});
 document.querySelectorAll("[data-page]").forEach(el=>{if(el.dataset.page===next)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");});
 $("page-heading").textContent={login:"Вход / MFA",companies:"Компании",activation:"Активация",contract:"Контракт и ограничения"}[next];
 $("concept-sidebar").classList.remove("is-open");$("menu-toggle").setAttribute("aria-expanded","false");
 if(location.hash.slice(1)!==next)history.replaceState(null,"","#"+next);
 if(next==="companies")renderCompanies();
 if(next==="activation")renderReviews();
}
function login(){
 const type=$("demo-actor").value, status=$("demo-login-status").value;
 session=null;
 if(status!=="success"){
  $("session-panel").textContent="Mock HTTP "+status+" · вход не выполнен.";
  feedback(status==="401"?"401: Неверные учетные данные (имитация).":"503: Сервис временно недоступен (имитация).",true);
  updateActions();return;
 }
 session={actorId:type==="owner"?"mock-owner":type==="reviewer"?"mock-reviewer":"mock-reader",login:"fixture-"+type,permissions:[...rights[type]]};
 $("session-panel").replaceChildren(textNode("strong","Симуляция завершена: POST /login 204 → POST /access 200 → GET /me 200."),textNode("p","Тестовая фикстура actorId: "+session.actorId),textNode("p","GET /me.permissions: "+session.permissions.join(", ")));
 feedback("Демо-сессия создана только в памяти вкладки. Нет настоящего Platform JWT.");
 updateActions();
}
function logout(){session=null;$("session-panel").textContent="Mock POST /logout → 204. Сессия прототипа очищена.";feedback("Выход из демонстрационного сценария.");updateActions();navigate("login");}
function updateActions(){
 $("new-company").disabled=!permitted("tenant.create");
 $("new-company").title=permitted("tenant.create")?"POST /companies":"Нет tenant.create в mock GET /me";
 renderCompanies();renderReviews();
}
function renderCompanies(){
 const tbody=$("companies-body");tbody.replaceChildren();
 const filter=$("company-status").value,query=$("company-search").value.trim().toLowerCase();
 if(!permitted("tenant.read")){
  const tr=document.createElement("tr"),td=textNode("td","403 · нет tenant.read. Войдите через тестовую фикстуру с правом чтения.");td.colSpan=5;tr.append(td);tbody.append(tr);
  $("next-page").disabled=$("prev-page").disabled=true;$("page-indicator").textContent="Нет доступа";$("company-detail").replaceChildren(textNode("p","Карточка недоступна без tenant.read."));return;
 }
 const filtered=companies.filter(c=>filter==="all"||c.status===filter);
 const pages=Math.max(1,Math.ceil(filtered.length/2));pageNo=Math.min(pageNo,pages-1);
 // This is a deterministic cursor-like UI fixture, not a real server search API.
 const view=filtered.slice(pageNo*2,(pageNo+1)*2).filter(c=>c.name.toLowerCase().includes(query)||c.code.toLowerCase().includes(query));
 if(!view.length){const tr=document.createElement("tr");const td=textNode("td","Нет записей на этой странице.");td.colSpan=5;tr.append(td);tbody.append(tr);}
 for(const c of view){
  const tr=document.createElement("tr");
  for(const s of [c.code,c.name,c.status,c.revision])tr.append(textNode("td",s));
  const td=document.createElement("td"),btn=textNode("button","Открыть");btn.type="button";btn.className="mp-btn mp-btn--secondary";btn.addEventListener("click",()=>{selectedId=c.tenantId;renderDetail();});td.append(btn);tr.append(td);tbody.append(tr);
 }
 $("prev-page").disabled=pageNo===0;$("next-page").disabled=pageNo>=pages-1;
 $("page-indicator").textContent="Страница "+(pageNo+1)+" / "+pages+" · nextCursor: "+(pageNo<pages-1?"mock:"+String(pageNo+1):"пустой");
 renderDetail();
}
function renderDetail(){
 const panel=$("company-detail");panel.replaceChildren();
 const c=selected();if(!c){panel.append(textNode("p","Выберите компанию для просмотра карточки."));return;}
 panel.append(textNode("h3",c.name),textNode("small","GET "+prefix+"/companies/{tenantID} · mock 200"));
 const dl=document.createElement("dl");
 const pairs=[["Tenant UUID",c.tenantId],["Код",c.code],["Статус",c.status],["Revision",c.revision],["Legal name",c.profile.legalName||"—"],["Contact email",c.profile.contactEmail||"—"]];
 for(const [name,value] of pairs)dl.append(textNode("dt",name),textNode("dd",value));
 panel.append(dl);
 const actions=document.createElement("div");actions.className="concept-actions";
 const edit=textNode("button","Редактировать draft");edit.type="button";edit.className="mp-btn mp-btn--secondary";edit.disabled=!permitted("tenant.draft.update")||c.status!=="draft";edit.addEventListener("click",()=>openRecord(c.tenantId));actions.append(edit);
 const conflict=textNode("button","Имитировать 409 при сохранении");conflict.type="button";conflict.className="mp-btn mp-btn--secondary";conflict.disabled=edit.disabled;conflict.addEventListener("click",()=>{forcedConflict=true;openRecord(c.tenantId);feedback("Следующее PATCH вернёт 409 (симуляция).");});actions.append(conflict);
 const activate=textNode("button","Запросить активацию");activate.type="button";activate.className="mp-btn mp-btn--primary";activate.disabled=!permitted("tenant.activate")||c.status!=="draft"||reviews.some(r=>r.tenantId===c.tenantId&&r.state==="requested");
 activate.addEventListener("click",()=>requestActivation(c));actions.append(activate);
 panel.append(actions);
}
function openRecord(id){
 const c=companies.find(x=>x.tenantId===id);editingId=c?.tenantId||null;
 $("record-form").reset();$("record-error").textContent="";
 $("record-mode").textContent=c?"PATCH /companies/{tenantID}":"POST /companies";
 $("record-dialog-title").textContent=c?"Редактирование черновика":"Новая компания";
 $("record-note").textContent=c?"Изменить только name и contactEmail с expectedRevision="+c.revision+".":"Создать draft: requestId (UUID v4), code, name.";
 $("code-field").hidden=Boolean(c);$("email-field").hidden=!c;
 $("record-code").value=c?.code||"";$("record-name").value=c?.name||"";$("record-email").value=c?.profile.contactEmail||"";
 $("record-dialog").showModal();$("record-name").focus();
}
function saveRecord(ev){
 ev.preventDefault();$("record-error").textContent="";
 const name=$("record-name").value.trim(),code=$("record-code").value.trim().toUpperCase(),email=$("record-email").value.trim();
 if(!name){$("record-error").textContent="Введите название.";return;}
 if(editingId){
  const c=companies.find(x=>x.tenantId===editingId);
  if(!c||c.status!=="draft"||!permitted("tenant.draft.update")){$("record-error").textContent="403: действие недоступно.";return;}
  if(forcedConflict){forcedConflict=false;$("record-error").textContent="409: revision устарела. Закройте форму, перечитайте карточку и повторите изменение.";return;}
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$("record-error").textContent="Проверьте формат e-mail.";return;}
  c.name=name;c.profile.contactEmail=email;c.revision++;
  feedback("Mock PATCH "+prefix+"/companies/{tenantID} → 200, revision="+c.revision+".");
 }else{
  if(!permitted("tenant.create")){$("record-error").textContent="403: нет tenant.create.";return;}
  if(!code||!/^[A-Z0-9_-]{2,40}$/.test(code)){$("record-error").textContent="Код: 2–40 символов A–Z, 0–9, _ или -.";return;}
  if(companies.some(c=>c.code===code)){$("record-error").textContent="409: такой code уже существует.";return;}
  const id=requestId(),newId=requestId();
  const c={tenantId:newId,code,name,status:"draft",revision:1,profile:profile()};
  companies.unshift(c);selectedId=c.tenantId;
  feedback("Mock POST /companies → 201 draft · requestId="+id+". Ответ не сохраняется на сервере.");
 }
 $("record-dialog").close();pageNo=0;$("company-status").value="all";$("company-search").value="";renderCompanies();
}
function requestActivation(c){
 if(!permitted("tenant.activate")||c.status!=="draft"){feedback("403: невозможно подать заявку.",true);return;}
 const id=requestId();
 reviews.unshift({requestId:id,tenantId:c.tenantId,tenantName:c.name,tenantCode:c.code,requesterActorId:session.actorId,requesterLogin:session.login,expectedRevision:c.revision,createdAt:new Date().toISOString(),state:"requested"});
 feedback("Mock POST /companies/{tenantID}/activation-requests → 201 requested. Компания остаётся draft.");
 renderDetail();renderReviews();
}
function renderReviews(){
 const root=$("activation-queue");root.replaceChildren();
 if(!permitted("tenant.provision.approve")){root.append(textNode("p","403 · требуется tenant.provision.approve. Выберите Reviewer в разделе входа."));return;}
 if(!reviews.length){root.append(textNode("p","Очередь пуста. Для демонстрации создайте заявку под фикстурой Owner, затем войдите как Reviewer."));return;}
 for(const r of reviews){
  const div=document.createElement("article");div.className="concept-record";
  const info=document.createElement("div");info.append(textNode("strong",r.tenantName+" · "+r.state),textNode("small","Request "+r.requestId+" · "+r.requesterLogin));
  div.append(info);
  const actions=document.createElement("div");actions.className="concept-actions";
  for(const decision of ["approved","rejected"]){
   const b=textNode("button",decision==="approved"?"Одобрить (mock)":"Отклонить (mock)");
   b.type="button";b.className="mp-btn mp-btn--secondary";b.disabled=r.state!=="requested"||r.requesterActorId===session.actorId;
   b.addEventListener("click",()=>{if(r.requesterActorId===session.actorId){feedback("Self-approval запрещён.",true);return;}r.state=decision;history.unshift({requestId:r.requestId,decision});feedback("Mock Reviewer "+decision+" → 200. Повторный пароль и TOTP НЕ вводятся, реальной активации нет.");renderReviews();});
   actions.append(b);
  }
  div.append(actions);root.append(div);
 }
 if(history.length)root.append(textNode("p","История фикстуры: "+history.map(h=>h.requestId.slice(0,8)+" — "+h.decision).join("; ")));
}
$("mock-login").addEventListener("click",login);$("mock-logout").addEventListener("click",logout);
$("company-status").addEventListener("change",()=>{pageNo=0;renderCompanies();});
$("company-search").addEventListener("input",renderCompanies);
$("prev-page").addEventListener("click",()=>{pageNo=Math.max(0,pageNo-1);renderCompanies();});
$("next-page").addEventListener("click",()=>{pageNo++;renderCompanies();});
$("new-company").addEventListener("click",()=>openRecord(null));
$("record-form").addEventListener("submit",saveRecord);
$("close-record").addEventListener("click",()=>$("record-dialog").close());
$("cancel-record").addEventListener("click",()=>$("record-dialog").close());
$("menu-toggle").addEventListener("click",()=>{const open=$("concept-sidebar").classList.toggle("is-open");$("menu-toggle").setAttribute("aria-expanded",String(open));});
window.addEventListener("hashchange",()=>navigate(location.hash.slice(1)));
document.querySelectorAll("[data-page]").forEach(el=>el.addEventListener("click",ev=>{ev.preventDefault();navigate(el.dataset.page);}));
setupTheme();navigate(location.hash.slice(1)||"login");updateActions();
})();
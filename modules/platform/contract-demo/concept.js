(function () {
"use strict";
// MOCK-ONLY. No network, localStorage, credentials, cookies, token persistence, or database access.
const prefix="/internal/platform-admin";
const rights={
 owner:["tenant.read","tenant.create","tenant.draft.update","tenant.activate","platform.reviewer.bootstrap"],
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
let reviews=[], reviewDecisions=[], forcedConflict=false;
const $=id=>document.getElementById(id);
const profile=()=>({legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""});
const permitted=right=>Boolean(session?.permissions.includes(right));
const selected=()=>companies.find(c=>c.tenantId===selectedId);
const requestId=()=>crypto.randomUUID();
const textNode=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=String(value??"");if(className)node.className=className;return node;};
function feedback(message,error=false){
 $("feedback").textContent=message;
 $("feedback").setAttribute("role",error?"alert":"status");
 // The Login layout uses the canonical card and its own accessible status.
 if(page==="login")$("session-panel").setAttribute("aria-label",message);
}
function navigate(next){
 if(!["login","companies","activation","reviewer","logs","contract"].includes(next))next="login";
 page=next;
 document.querySelectorAll("[data-screen]").forEach(el=>{el.hidden=el.dataset.screen!==next;});
 document.querySelector(".app.mp-template-app").hidden=next==="login";
 document.body.classList.toggle("mp-login-page",next==="login");
 document.querySelectorAll("[data-page]").forEach(el=>{if(el.dataset.page===next){el.setAttribute("aria-current","page");el.classList.add("active");}else{el.removeAttribute("aria-current");el.classList.remove("active");}});
 $("page-heading").textContent={login:"Вход / MFA",companies:"Компании",activation:"Активация",reviewer:"Reviewer",logs:"Журнал",contract:"Контракт и ограничения"}[next];
 $("platform-topbar-title").textContent="Platform / "+({login:"Вход",companies:"Компании",activation:"Активация",reviewer:"Reviewer",logs:"Журнал",contract:"Правила API"}[next]);
 $("sidebar").classList.remove("open");$("overlay").classList.remove("open");$("burger").setAttribute("aria-expanded","false");
 if(location.hash.slice(1)!==next)history.replaceState(null,"","#"+next);
 if(next==="companies")renderCompanies();
 if(next==="activation")renderReviews();if(next==="reviewer")renderReviewer();if(next==="logs")renderLogs();
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
 renderCompanies();renderReviews();renderReviewer();renderLogs();
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
 const actions=document.createElement("div");actions.className="mp-row";
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
  const div=document.createElement("article");div.className="mp-record";
  const info=document.createElement("div");info.append(textNode("strong",r.tenantName+" · "+r.state),textNode("small","Request "+r.requestId+" · "+r.requesterLogin));
  div.append(info);
  const actions=document.createElement("div");actions.className="mp-row";
  for(const decision of ["approved","rejected"]){
   const b=textNode("button",decision==="approved"?"Одобрить (mock)":"Отклонить (mock)");
   b.type="button";b.className="mp-btn mp-btn--secondary";b.disabled=r.state!=="requested"||r.requesterActorId===session.actorId;
   b.addEventListener("click",()=>{if(r.requesterActorId===session.actorId){feedback("Self-approval запрещён.",true);return;}r.state=decision;reviewDecisions.unshift({requestId:r.requestId,decision});feedback("Mock Reviewer "+decision+" → 200. Повторный пароль и TOTP НЕ вводятся, реальной активации нет.");renderReviews();});
   actions.append(b);
  }
  div.append(actions);root.append(div);
 }
 if(reviewDecisions.length)root.append(textNode("p","История фикстуры: "+reviewDecisions.map(h=>h.requestId.slice(0,8)+" — "+h.decision).join("; ")));
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

window.addEventListener("hashchange",()=>navigate(location.hash.slice(1)));
document.querySelectorAll("[data-page]").forEach(el=>el.addEventListener("click",ev=>{ev.preventDefault();navigate(el.dataset.page);}));

const invitations=[];
let showHistory=false,logOffset=0;
const baseLogs=[
 {at:"2026-11-23T09:00:00Z",category:"tenant",eventType:"company.created",outcome:"success",subject:"NORTH"},
 {at:"2026-11-23T08:55:00Z",category:"auth",eventType:"platform.login",outcome:"success",subject:"fixture-owner"},
 {at:"2026-11-23T08:50:00Z",category:"review",eventType:"activation.requested",outcome:"success",subject:"NORTH"},
 {at:"2026-11-22T15:00:00Z",category:"tenant",eventType:"company.updated",outcome:"success",subject:"EAST"},
 {at:"2026-11-22T14:00:00Z",category:"auth",eventType:"platform.login",outcome:"denied",subject:"demo"},
 {at:"2026-11-22T13:00:00Z",category:"review",eventType:"activation.reviewed",outcome:"success",subject:"BLUE"}
];
function canInvite(){return permitted("platform.reviewer.bootstrap")&&permitted("tenant.create")&&permitted("tenant.activate");}
function renderReviewer(){
 const root=$("reviewer-invitations");root.replaceChildren();
 const available=$("reviewer-operator").value==="enabled";
 $("invite-reviewer").disabled=!canInvite()||!available;
 $("reviewer-history").disabled=!permitted("tenant.provision.approve");
 if(!available){root.append(textNode("p","503 · Reviewer Operator не подключён на выбранном стенде (mock)."));return;}
 if(!canInvite()){root.append(textNode("p","403 · приглашения требуют platform.reviewer.bootstrap, tenant.create и tenant.activate."));return;}
 if(!invitations.length){root.append(textNode("p","У текущего тестового Owner нет приглашений."));}
 for(const item of invitations.filter(x=>$("reviewer-status-filter").value==="all"||x.state===$("reviewer-status-filter").value)){
  const row=document.createElement("article");row.className="mp-record";
  const info=document.createElement("div");info.append(textNode("strong",item.reviewerLogin+" · "+item.state),textNode("small",item.recipientEmail+" · "+item.requestId));row.append(info);
  const controls=document.createElement("div");controls.className="mp-row";
  const advance=textNode("button","Следующий mock-статус");
  advance.type="button";advance.className="mp-btn mp-btn--secondary";advance.disabled=item.state==="claimed";
  advance.addEventListener("click",()=>{const flow=["requested","queued","sent","claimed"];item.state=flow[Math.min(flow.length-1,flow.indexOf(item.state)+1)];feedback("Mock GET /reviewers/invitations/{requestID}/status → "+item.state+". Отправка письма и Claim не выполнялись.");renderReviewer();});controls.append(advance);
  const confirm=textNode("button","Owner confirmation (mock)");
  confirm.type="button";confirm.className="mp-btn mp-btn--secondary";confirm.disabled=item.state!=="claimed"||item.confirmed;
  confirm.addEventListener("click",()=>{item.confirmed=true;feedback("Mock owner-confirm → confirmed. Реального подтверждения паролем/TOTP не было.");renderReviewer();});
  controls.append(confirm);row.append(controls);root.append(row);
 }
 if(showHistory){
  const historyPanel=$("reviewer-history-panel");historyPanel.hidden=false;historyPanel.replaceChildren(textNode("strong","GET /activation-reviews/history · mock"));
  historyPanel.append(textNode("p",reviewDecisions.length?reviewDecisions.map(x=>x.requestId.slice(0,8)+": "+x.decision).join(" · "):"У текущего Reviewer пока нет решений в mock-истории."));
 }else $("reviewer-history-panel").hidden=true;
}
function createInvitation(){
 if(!canInvite()){feedback("403 · недостаточно разрешений.",true);return;}
 if($("reviewer-operator").value!=="enabled"){feedback("503 · Reviewer Operator отсутствует.",true);return;}
 const email=$("reviewer-email").value.trim(),loginName=$("reviewer-login").value.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!email.endsWith("@example.test")||!loginName){feedback("Введите демонстрационный login и e-mail на example.test.",true);return;}
 invitations.unshift({requestId:requestId(),reviewerLogin:loginName,recipientEmail:email,state:"requested",confirmed:false});
 feedback("Mock POST /reviewers/invitations → 201 requested. Письмо НЕ отправлено.");
 $("reviewer-email").value="";$("reviewer-login").value="";renderReviewer();
}
function renderLogs(){
 const tbody=$("log-body");tbody.replaceChildren();
 const canView=session?.actorId==="mock-owner"&&permitted("tenant.create")&&permitted("tenant.activate");
 if(!canView){
  const td=textNode("td","403 · Platform Owner с MFA и правами tenant.create/tenant.activate необходим.");td.colSpan=5;const row=document.createElement("tr");row.append(td);tbody.append(row);
  $("log-prev").disabled=$("log-next").disabled=true;$("log-offset").textContent="Нет доступа";return;
 }
 const cat=$("log-category").value,limit=Number($("log-limit").value);
 const values=baseLogs.filter(x=>cat==="all"||x.category===cat);
 logOffset=Math.min(logOffset,Math.max(0,Math.ceil(values.length/limit)-1)*limit);
 const shown=values.slice(logOffset,logOffset+limit);
 for(const item of shown){const row=document.createElement("tr");for(const key of ["at","category","eventType","outcome","subject"])row.append(textNode("td",item[key]));tbody.append(row);}
 if(!shown.length){const tr=document.createElement("tr"),td=textNode("td","Журнал пуст.");td.colSpan=5;tr.append(td);tbody.append(tr);}
 $("log-offset").textContent="offset: "+logOffset+" · nextOffset: "+(logOffset+limit<values.length?logOffset+limit:"null")+" (mock)";
 $("log-prev").disabled=logOffset===0;$("log-next").disabled=logOffset+limit>=values.length;
}
$("reviewer-operator").addEventListener("change",renderReviewer);
$("reviewer-status-filter").addEventListener("change",renderReviewer);
$("invite-reviewer").addEventListener("click",createInvitation);
$("reviewer-history").addEventListener("click",()=>{showHistory=!showHistory;renderReviewer();});
$("log-category").addEventListener("change",()=>{logOffset=0;renderLogs();});
$("log-limit").addEventListener("change",()=>{logOffset=0;renderLogs();});
$("log-prev").addEventListener("click",()=>{logOffset=Math.max(0,logOffset-Number($("log-limit").value));renderLogs();});
$("log-next").addEventListener("click",()=>{logOffset+=Number($("log-limit").value);renderLogs();});

$("login-theme").addEventListener("click",()=>$("themeToggle").click());
 $("open-platform").addEventListener("click",()=>navigate("companies"));
 navigate(location.hash.slice(1)||"login");updateActions();
})();
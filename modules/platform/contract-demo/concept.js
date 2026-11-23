(function () {
"use strict";
// MOCK-ONLY. No network, localStorage, credentials, cookies, token persistence, or database access.
const prefix="/internal/platform-admin";
const rights={
 owner:["tenant.read","tenant.create","tenant.draft.update","tenant.activate","platform.reviewer.bootstrap"],
 reviewer:["tenant.provision.approve"]
};
const seed=[
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c801",code:"north",name:"North Shipping (demo)",status:"draft",revision:3,profile:{legalName:"North Shipping Ltd.",tradeName:"North",description:"Тестовая компания",registrationNumber:"",taxNumber:"",countryCode:"GB",contactEmail:"office@example.test",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c802",code:"blue",name:"Blue Logistics (demo)",status:"active",revision:7,profile:{legalName:"Blue Logistics",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c803",code:"east",name:"East Maritime (demo)",status:"provisioning",revision:2,profile:{legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c804",code:"west",name:"West Operations (demo)",status:"suspended",revision:5,profile:{legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c805",code:"south",name:"South Transport (demo)",status:"disabled",revision:4,profile:{legalName:"",tradeName:"",description:"",registrationNumber:"",taxNumber:"",countryCode:"",contactEmail:"",website:""}}
 ,
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c806",code:"harbor",name:"Harbor Engineering (demo)",status:"active",revision:4,profile:{legalName:"Harbor Engineering Ltd.",tradeName:"Harbor Tech",description:"Сервисная компания · демонстрация",registrationNumber:"HE-DEMO",taxNumber:"",countryCode:"DE",contactEmail:"contact@example.test",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c807",code:"delta",name:"Delta Offshore (demo)",status:"draft",revision:1,profile:{legalName:"Delta Offshore Demo GmbH",tradeName:"Delta",description:"Черновик компании · демонстрация",registrationNumber:"",taxNumber:"",countryCode:"DE",contactEmail:"",website:""}},
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c808",code:"polar",name:"Polar Research (demo)",status:"active",revision:6,profile:{legalName:"Polar Research Inc.",tradeName:"Polar",description:"Научная организация · демонстрация",registrationNumber:"",taxNumber:"",countryCode:"NO",contactEmail:"research@example.test",website:""}}];
let companies=structuredClone(seed), dataMode="demo", session=null, page="login", requestedPage=null, pageNo=0, selectedId=null, editingId=null;
let reviews=[], reviewDecisions=[], forcedConflict=false, serverMode="standard";
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
const ownerSections=["overview","companies","provisioning","reviewer","email-operator","monitor","logs"];
const validScreens=["login",...ownerSections,"activation","mail","p4","contract"];
const hasOwnerOps=()=>permitted("tenant.create")&&permitted("tenant.activate");
const canCompanies=()=>permitted("tenant.read")||permitted("tenant.create");
const isAllowed=key=>
 key==="login"||key==="contract"?true:
 key==="overview"||key==="companies"?canCompanies():
 key==="provisioning"||key==="monitor"||key==="logs"?hasOwnerOps()&&canCompanies():
 key==="activation"?permitted("tenant.provision.approve"):
 key==="reviewer"||key==="email-operator"?permitted("platform.reviewer.bootstrap"):
 key==="mail"?serverMode==="lab"&&(permitted("platform.mail.manage")||permitted("platform.reviewer.bootstrap")):
 key==="p4"?serverMode==="lab"&&permitted("platform.reviewer.bootstrap"):false;
const homeSection=()=>permitted("tenant.provision.approve")?"activation":canCompanies()?"companies":permitted("platform.reviewer.bootstrap")?"reviewer":"contract";
function renderNavigation(){
 document.querySelectorAll("#concept-nav [data-page]").forEach(el=>{
  const enabled=Boolean(session)&&isAllowed(el.dataset.page);
  el.parentElement.hidden=!enabled;
  el.parentElement.style.display=enabled?"":"none";
  el.tabIndex=enabled?0:-1;
 });
}
function navigate(next){
 if(!validScreens.includes(next))next="login";
 if(session&&next!=="login"&&!isAllowed(next)){
  const forbidden=next;
  next=homeSection();
  feedback("Доступ к разделу «"+forbidden+"» отсутствует в текущем наборе permissions / серверных флагов; открыт доступный раздел.",true);
 }
 
 if(!session&&next!=="login"){
  requestedPage=next;
  next="login";
  $("open-platform").textContent="Открыть "+({overview:"Обзор платформы",companies:"Реестр компаний",provisioning:"Provisioning",activation:"Активацию",reviewer:"Reviewer",logs:"Журнал",monitor:"Мониторинг служб",mail:"Почтовый сервер",contract:"Правила API","email-operator":"Email Operator"}[requestedPage]||"Platform Admin")+" →";
  $("session-panel").textContent="Для открытия раздела «"+({overview:"Обзор платформы",companies:"Компании",provisioning:"Provisioning",activation:"Активация",reviewer:"Reviewer",logs:"Журнал",monitor:"Мониторинг",mail:"Почта",contract:"Правила API","email-operator":"Email Operator"}[requestedPage]||requestedPage)+"» выберите тестовый субъект, выполните mock-вход и нажмите кнопку перехода. Это не настоящая авторизация.";
 }
 page=next;
 renderNavigation();
 document.querySelectorAll("[data-screen]").forEach(el=>{el.hidden=el.dataset.screen!==next;});
 document.querySelector(".app.mp-template-app").hidden=next==="login";
 document.body.classList.toggle("mp-login-page",next==="login");
 document.querySelectorAll("[data-page]").forEach(el=>{if(el.dataset.page===next){el.setAttribute("aria-current","page");el.classList.add("active");}else{el.removeAttribute("aria-current");el.classList.remove("active");}});
 $("page-heading").textContent={login:"Вход / MFA",overview:"Обзор платформы",companies:"Компании",provisioning:"Provisioning",activation:"Активация",reviewer:"Reviewer", "email-operator":"Email Operator",mail:"Почтовый сервер · LAB",monitor:"Мониторинг служб",logs:"Журнал",p4:"Локальная приёмка · LAB",contract:"Контракт и ограничения"}[next];
 $("platform-topbar-title").textContent="Platform / "+({login:"Вход",overview:"Главная",companies:"Компании",provisioning:"Provisioning",activation:"Активация",reviewer:"Reviewer","email-operator":"Email Operator",mail:"Почта · LAB",monitor:"Мониторинг",logs:"Журнал",p4:"P4 LAB",contract:"Правила API"}[next]);
 $("sidebar").classList.remove("open");$("overlay").classList.remove("open");$("burger").setAttribute("aria-expanded","false");
 if(location.hash.slice(1)!==next)history.replaceState(null,"","#"+next);
 if(next==="companies")renderCompanies();
 if(next==="activation")renderReviews();if(next==="reviewer")renderReviewer();if(next==="logs")renderLogs();if(window.MPPlatformParity)window.MPPlatformParity.render(next,parityContext());
}
function login(){
 const type=$("demo-actor").value, status=$("demo-login-status").value;
 if(!Object.hasOwn(rights,type)){feedback("Тестовый субъект не существует в модели VDMS.",true);return;}
 session=null;
 if(status!=="success"){
  $("session-panel").textContent="Mock HTTP "+status+" · вход не выполнен.";
  feedback(status==="401"?"401: Неверные учетные данные (имитация).":"503: Сервис временно недоступен (имитация).",true);
  updateActions();return;
 }
 serverMode=$("demo-server-mode").value;
 session={actorId:type==="owner"?"mock-owner":"mock-reviewer",login:"fixture-"+type,permissions:[...rights[type]]};
 // Real VDMS grants Mail Operator permissions explicitly, never implicitly from Owner.
 // Only the LAB fixture simulates additional SQL grants, without changing a server.
 if(type==="owner"&&serverMode==="lab")session.permissions.push("platform.mail.diagnose","platform.mail.test_send");
 $("session-panel").replaceChildren(textNode("strong","Симуляция завершена: POST /login 204 → POST /access 200 → GET /me 200."),textNode("p","Тестовая фикстура actorId: "+session.actorId),textNode("p","GET /me.permissions: "+session.permissions.join(", ")));
 feedback("Демо-сессия создана только в памяти вкладки. Нет настоящего Platform JWT.");
 updateActions();
}
function logout(){session=null;requestedPage=null;$("session-panel").textContent="Mock POST /logout → 204. Сессия прототипа очищена.";feedback("Выход из демонстрационного сценария.");updateActions();navigate("login");}
function updateActions(){
 $("new-company").disabled=!permitted("tenant.create");
 $("new-company").title=permitted("tenant.create")?"POST /companies":"Нет tenant.create в mock GET /me";
 renderCompanies();renderReviews();renderReviewer();renderLogs();if(window.MPPlatformParity)window.MPPlatformParity.render(page,parityContext());
}

function changeDataMode(next,force=false){
 if(!["demo","empty"].includes(next)||(next===dataMode&&!force))return;
 dataMode=next;
 companies=next==="demo"?structuredClone(seed):[];
 reviews=[];reviewDecisions=[];invitations.length=0;
 reviewerChecked=false;selectedInvitationId="";reviewerDetailLoaded=false;
 showHistory=false;selectedId=null;editingId=null;forcedConflict=false;pageNo=0;logOffset=0;
 $("company-status").value="all";$("company-search").value="";
 $("reviewer-status-filter").value="all";reviewMode="pending";
 document.querySelectorAll("[data-review-mode]").forEach(tab=>{
  const active=tab.dataset.reviewMode==="pending";tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;
 });
 if(window.MPPlatformParity?.resetFixtures)window.MPPlatformParity.resetFixtures();
 $("overview-data-mode").value=dataMode;
 feedback(dataMode==="empty"?"Пустое состояние: компании и связанные фикстуры очищены (только в браузере).":"Демо-данные восстановлены. Ранее созданные mock-записи сброшены.");
 updateActions();
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
 if(!view.length){const tr=document.createElement("tr");const td=textNode("td",companies.length?"Нет записей на этой странице.":"Компаний пока нет. Выберите демо-набор в Overview или создайте черновик.");td.colSpan=5;tr.append(td);tbody.append(tr);}
 for(const c of view){
  const tr=document.createElement("tr");
  for(const [i,value] of [c.code,c.name,c.status,c.revision].entries()){const cell=textNode("td",value);cell.dataset.label=["Код","Компания","Статус","Revision"][i];tr.append(cell);}
  const td=document.createElement("td"),btn=textNode("button","Открыть");td.dataset.label="Действие";btn.type="button";btn.className="mp-btn mp-btn--secondary";btn.addEventListener("click",()=>{selectedId=c.tenantId;renderDetail();});td.append(btn);tr.append(td);tbody.append(tr);
 }
 $("prev-page").disabled=pageNo===0;$("next-page").disabled=pageNo>=pages-1;
 $("page-indicator").textContent=(companies.length?"Страница "+(pageNo+1)+" / "+pages:"Компаний: 0")+" · nextCursor: "+(pageNo<pages-1?"mock:"+String(pageNo+1):"пустой");
 renderDetail();
}
function renderDetail(){
 const panel=$("company-detail");panel.replaceChildren();
 const c=selected();if(!c){panel.append(textNode("p","Выберите компанию для просмотра карточки."));return;}
 panel.append(textNode("h3",c.name),textNode("small","GET "+prefix+"/companies/{tenantID} · mock 200"));
 const dl=document.createElement("dl");
 const pairs=[["Tenant UUID",c.tenantId],["Код",c.code],["Статус",c.status],["Revision",c.revision],["Юридическое название",c.profile.legalName||"—"],["Торговое название",c.profile.tradeName||"—"],["Описание",c.profile.description||"—"],["Регистрационный номер",c.profile.registrationNumber||"—"],["Налоговый номер",c.profile.taxNumber||"—"],["Страна",c.profile.countryCode||"—"],["Контактный e-mail",c.profile.contactEmail||"—"],["Веб-сайт",c.profile.website||"—"]];
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
 $("record-note").textContent=c?"Изменить name и поля profile с expectedRevision="+c.revision+".":"Создать draft: requestId (UUID v4), code, name.";
 $("code-field").hidden=Boolean(c);$("profile-fields").hidden=!c;
 $("record-code").value=c?.code||"";$("record-name").value=c?.name||"";
 for(const key of ["legalName","tradeName","description","registrationNumber","taxNumber","countryCode","contactEmail","website"])$("profile-"+key).value=c?.profile[key]||"";
 $("record-dialog").showModal();$("record-name").focus();
}
function saveRecord(ev){
 ev.preventDefault();$("record-error").textContent="";
 const name=$("record-name").value.trim(),code=$("record-code").value.trim();
 if(!name||name.length>200){$("record-error").textContent="Введите название (не более 200 символов).";return;}
 if(editingId){
  const c=companies.find(x=>x.tenantId===editingId);
  if(!c||c.status!=="draft"||!permitted("tenant.draft.update")){$("record-error").textContent="403: действие недоступно.";return;}
  if(forcedConflict){forcedConflict=false;$("record-error").textContent="409: revision устарела. Закройте форму, перечитайте карточку и повторите изменение.";return;}
  const updated={};
  for(const key of ["legalName","tradeName","description","registrationNumber","taxNumber","countryCode","contactEmail","website"])updated[key]=$("profile-"+key).value.trim();
  if(updated.contactEmail&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(updated.contactEmail)){$("record-error").textContent="Проверьте формат e-mail.";return;}
  if(updated.countryCode&&!/^[A-Za-z]{2}$/.test(updated.countryCode)){$("record-error").textContent="Код страны: две латинские буквы.";return;}
  c.name=name;Object.assign(c.profile,updated);c.revision++;
  feedback("Mock PATCH "+prefix+"/companies/{tenantID} → 200, revision="+c.revision+".");
 }else{
  if(!permitted("tenant.create")){$("record-error").textContent="403: нет tenant.create.";return;}
  if(code.length<2||code.length>63||!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(code)){$("record-error").textContent="Код: 2–63 символа, строчные a–z, 0–9 и дефис между сегментами.";return;}
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
 if(reviews.some(r=>r.tenantId===c.tenantId&&r.state==="requested")){feedback("409: ожидающая заявка для этой компании уже существует.",true);return;}
 const id=requestId();
 reviews.unshift({requestId:id,tenantId:c.tenantId,tenantName:c.name,tenantCode:c.code,requesterActorId:session.actorId,requesterLogin:session.login,expectedRevision:c.revision,createdAt:new Date().toISOString(),state:"requested"});
 feedback("Mock POST /companies/{tenantID}/activation-requests → 201 requested. Компания остаётся draft.");
 renderDetail();renderReviews();
}
let reviewMode="pending";
function renderReviews(){
 const root=$("activation-queue");root.replaceChildren();
 $("review-seed-demo").disabled=!permitted("tenant.provision.approve")||dataMode!=="demo";
 if(!permitted("tenant.provision.approve")){$("review-count").textContent="0";root.append(textNode("p","403 · требуется tenant.provision.approve. Выберите Reviewer в разделе входа."));return;}
 const mode=reviewMode;
 const items=mode==="pending"?reviews.filter(r=>r.state==="requested"):
 reviewDecisions.filter(h=>h.decision===mode&&h.reviewerActorId===session.actorId)
  .map(h=>reviews.find(r=>r.requestId===h.requestId)).filter(Boolean);
 const approvalsEnabled=serverMode==="restricted"||serverMode==="lab";
 $("review-approval-text").textContent=approvalsEnabled?
  "Restricted/LAB fixture: решение доступно только с имитацией подтверждения. В VDMS нужны password + TOTP, серверные флаги и SQL v57/v59.":
  "Стандартный режим: approval/reject выключены серверным флагом. Очередь доступна только для чтения Reviewer.";
 $("review-count").textContent=String(items.length);
 if(!items.length){root.append(textNode("p",mode==="pending"?"Нет ожидающих заявок. Создайте заявку под Owner или загрузите тестовые заявки Reviewer.":"В личной истории Reviewer пока нет решений."));return;}
 for(const r of items){
  const div=document.createElement("article");div.className="mp-record";
  const info=document.createElement("div");info.append(textNode("strong",r.tenantName+" · "+r.state),textNode("small","Request "+r.requestId+" · "+r.requesterLogin+" · revision "+r.expectedRevision+" · "+r.createdAt));
  div.append(info);
  const actions=document.createElement("div");actions.className="mp-row";
  if(mode!=="pending"){const item=reviewDecisions.find(x=>x.requestId===r.requestId&&x.reviewerActorId===session.actorId);
 actions.append(textNode("span","Решение Reviewer: "+r.state+(item?.reason?" · Причина: "+item.reason:""),"mp-badge"));div.append(actions);root.append(div);continue;}
 if(!approvalsEnabled){actions.append(textNode("span","Одобрение недоступно в конфигурации сервера (mock).","mp-help"));div.append(actions);root.append(div);continue;}
  for(const decision of ["approved","rejected"]){
   const b=textNode("button",decision==="approved"?"Одобрить (mock)":"Отклонить (mock)");
   b.type="button";b.className="mp-btn mp-btn--secondary";b.disabled=r.state!=="requested"||r.requesterActorId===session.actorId;
   b.addEventListener("click",()=>openReviewDecision(r,decision));
   actions.append(b);
  }
  div.append(actions);root.append(div);
 }
 
}

let reviewTargetId=null,reviewTargetDecision=null;
function openReviewDecision(r,decision){
 if(!session||!permitted("tenant.provision.approve")||r.requesterActorId===session.actorId||serverMode==="standard"){feedback("403: нет допуска Reviewer или серверный режим Approval отключён.",true);return;}
 reviewTargetId=r.requestId;reviewTargetDecision=decision;
 $("review-decision-form").reset();$("review-decision-error").textContent="";
 $("review-reason-field").hidden=decision!=="rejected";
 $("review-decision-heading").textContent=(decision==="approved"?"Подтвердить":"Отклонить")+" заявку";
 $("review-decision-note").textContent=r.tenantName+" · "+r.tenantCode+" · revision "+r.expectedRevision;
 $("review-decision-dialog").showModal();
}
function closeReviewDecision(){$("review-decision-dialog").close();reviewTargetId=null;reviewTargetDecision=null;}
$("review-close").addEventListener("click",closeReviewDecision);
$("review-cancel").addEventListener("click",closeReviewDecision);
$("review-decision-form").addEventListener("submit",e=>{
 e.preventDefault();$("review-decision-error").textContent="";
 const r=reviews.find(x=>x.requestId===reviewTargetId);
 if(!r||r.state!=="requested"||!permitted("tenant.provision.approve")||r.requesterActorId===session?.actorId||serverMode==="standard"){
  $("review-decision-error").textContent="403/409: решение больше недоступно.";return;
 }
 const company=companies.find(c=>c.tenantId===r.tenantId);
 if(!company||company.status!=="draft"||company.revision!==r.expectedRevision){
  $("review-decision-error").textContent="409: revision компании изменилась либо draft недоступен.";return;
 }
 if(!$("review-decision-consent").checked){$("review-decision-error").textContent="Подтвердите демонстрационный характер решения.";return;}
 let reason=null;
 if(reviewTargetDecision==="rejected"){
  reason=$("review-reason").value;
  if(!reason||reason.trim()!==reason||reason.length>8000||[...reason].length>2000){
   $("review-decision-error").textContent="Укажите причину отказа до 2000 символов без пробелов по краям.";return;
  }
 }
 const decision=reviewTargetDecision;
 r.state=decision;reviewDecisions.unshift({requestId:r.requestId,decision,tenantId:r.tenantId,reason,reviewerActorId:session.actorId,decidedAt:new Date().toISOString()});
 closeReviewDecision();
 feedback("Mock POST /activation-reviews/{requestID}/"+(decision==="approved"?"approve":"reject")+" → "+decision+". Пароль и TOTP не проверялись; Tenant DB не создавалась.");
 renderReviews();
});
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
let reviewerChecked=false,selectedInvitationId="",reviewerDetailLoaded=false;
function reviewerAvailability(){
 const available=$("reviewer-operator").value==="enabled";
 $("reviewer-status-summary").textContent=!reviewerChecked?"Не проверено":available?
  "activeReviewers: "+invitations.filter(x=>x.confirmed).length+" · invitationEnabled: true (mock)":
  "invitationEnabled: false / 503 (mock)";
 return available;
}
function renderReviewer(){
 const root=$("reviewer-invitations");root.replaceChildren();
 const available=reviewerAvailability();
 $("invite-reviewer").disabled=!canInvite()||!available;
 $("reviewer-existing-check").disabled=!canInvite()||!available||!selectedInvitationId;
 $("reviewer-history").disabled=!permitted("tenant.provision.approve");
 const select=$("reviewer-existing");const old=selectedInvitationId;
 select.replaceChildren(new Option("Выберите запрос",""));
 for(const item of invitations)select.add(new Option(item.reviewerLogin+" · "+item.recipientEmail+" · "+item.state,item.requestId));
 if(invitations.some(x=>x.requestId===old))select.value=old;
 else{selectedInvitationId="";select.value="";}
 if(!available){root.append(textNode("p","503 / disabled · Reviewer Operator не подключён на выбранном стенде (mock)."));renderSelectedInvitation();return;}
 if(!canInvite()){root.append(textNode("p","403 · требуется platform.reviewer.bootstrap (и подтверждение Owner на backend)."));renderSelectedInvitation();return;}
 const filtered=invitations.filter(x=>$("reviewer-status-filter").value==="all"||x.state===$("reviewer-status-filter").value);
 if(!filtered.length)root.append(textNode("p","Приглашений в текущем фильтре нет."));
 for(const item of filtered){
  const row=document.createElement("article");row.className="mp-record";
  const info=document.createElement("div");
  info.append(textNode("strong",item.reviewerLogin+" · "+item.state),textNode("small",item.recipientEmail+" · "+item.requestId));row.append(info);
  const actions=document.createElement("div");actions.className="mp-row";
  const view=textNode("button","Выбрать запрос");view.type="button";view.className="mp-btn mp-btn--secondary";
  view.addEventListener("click",()=>{selectedInvitationId=item.requestId;reviewerDetailLoaded=false;renderReviewer();});
  actions.append(view);row.append(actions);root.append(row);
 }
 renderSelectedInvitation();
 if(showHistory){
  const historyPanel=$("reviewer-history-panel");historyPanel.hidden=false;historyPanel.replaceChildren(textNode("strong","GET /activation-reviews/history · mock"));
  historyPanel.append(textNode("p",reviewDecisions.length?reviewDecisions.filter(x=>x.reviewerActorId===session.actorId).map(x=>x.requestId.slice(0,8)+": "+x.decision).join(" · "):"У текущего Reviewer пока нет решений в mock-истории."));
 }else $("reviewer-history-panel").hidden=true;
}
function renderSelectedInvitation(){
 const root=$("reviewer-selected-detail");root.replaceChildren(textNode("h3","Состояние существующего приглашения","mp-section-title"));
 const item=invitations.find(x=>x.requestId===selectedInvitationId);
 if(!canInvite()||!reviewerAvailability()){root.append(textNode("p","Просмотр ограничен правами и состоянием оператора.","mp-help"));return;}
 if(!item){root.append(textNode("p","Выберите запрос для просмотра его актуального состояния.","mp-help"));return;}
 if(!reviewerDetailLoaded){root.append(textNode("p","Выбран запрос. Нажмите «Проверить запрос» для GET /reviewers/invitations/{requestID}/status (mock).","mp-help"));return;}
 const list=document.createElement("dl");list.className="mp-description-grid";
 for(const [k,v] of [["requestId",item.requestId],["reviewerLogin",item.reviewerLogin],["recipientEmail",item.recipientEmail],["state",item.state],["Owner confirmation",item.confirmed?"confirmed":"pending"]]){
  const dl=document.createElement("div");dl.append(textNode("dt",k),textNode("dd",v));list.append(dl);
 }root.append(list);
 const actions=document.createElement("div");actions.className="mp-stack";
 if(item.state==="requested"||item.state==="queued"){
  const note=textNode("p",item.state==="queued"?
   "Предыдущая попытка могла достичь SMTP. Перед новой попыткой проверьте почтовый ящик Reviewer.":
   "Приглашение зарегистрировано, но письмо не отправлено.","mp-help");
  const confirmLabel=document.createElement("label");confirmLabel.className="mp-role-option";
  const checkbox=document.createElement("input");checkbox.type="checkbox";
  const desc=textNode("span","Подтверждаю: это только mock. Я понимаю необходимость проверки почтового ящика и защищённого MFA в VDMS.");
  confirmLabel.append(checkbox,desc);
  const send=textNode("button",item.state==="queued"?"Имитировать повторную отправку":"Имитировать отправку приглашения");
  send.type="button";send.className="mp-btn mp-btn--primary";send.disabled=true;
  checkbox.addEventListener("change",()=>{send.disabled=!checkbox.checked;});
  send.addEventListener("click",()=>{
   // Two-step fixture: requested -> queued (unknown SMTP outcome), queued -> sent.
   item.state=item.state==="requested"?"queued":"sent";
   feedback("Mock POST /reviewers/invitations/email/send → "+item.state+". Никакой SMTP-доставки не было.");
   renderReviewer();
  });
  actions.append(note,confirmLabel,send);
 }
 if(item.state==="sent"){
  actions.append(textNode("p","Сервер сообщает sent. В реальной системе Claim выполняется Reviewer по одноразовой ссылке отдельно от Owner.","mp-help"));
  const claim=textNode("button","Имитировать внешний Claim (без токена)");
  claim.type="button";claim.className="mp-btn mp-btn--secondary";
  claim.addEventListener("click",()=>{item.state="claimed";feedback("Mock Reviewer Claim → claimed. Реальная регистрация не выполнена.");renderReviewer();});
  actions.append(claim);
 }
 if(item.state==="claimed"&&!item.confirmed){
  actions.append(textNode("p","GET /reviewers/invitations/{requestID}/owner-confirm → pending. Для реального подтверждения необходимы Owner password, свежий TOTP и согласие.","mp-help"));
  const l=document.createElement("label");l.className="mp-role-option";
  const c=document.createElement("input");c.type="checkbox";l.append(c,textNode("span","Подтверждаю макетный сценарий Owner Confirmation (без полномочий на сервере)."));
  const confirm=textNode("button","Подтвердить Reviewer (mock)");confirm.type="button";confirm.className="mp-btn mp-btn--primary";confirm.disabled=true;
  c.addEventListener("change",()=>{confirm.disabled=!c.checked;});
  confirm.addEventListener("click",()=>{item.confirmed=true;feedback("Mock POST /reviewers/invitations/owner-confirm → confirmed. Реальные permissions не выдавались.");renderReviewer();});
  actions.append(l,confirm);
 }
 if(item.state==="claimed"&&item.confirmed)actions.append(textNode("p","Owner confirmation: confirmed (mock). В реальном сервере назначается tenant.provision.approve.","mp-badge"));
 root.append(actions);
}
function createInvitation(){
 if(!canInvite()){feedback("403 · недостаточно разрешений.",true);return;}
 if($("reviewer-operator").value!=="enabled"){feedback("503 · Reviewer Operator отсутствует.",true);return;}
 const email=$("reviewer-email").value.trim(),loginName=$("reviewer-login").value.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!email.endsWith("@example.test")||!loginName){feedback("Введите демонстрационный login и e-mail на example.test.",true);return;}
 const newId=requestId();invitations.unshift({requestId:newId,reviewerLogin:loginName,recipientEmail:email,state:"requested",confirmed:false});selectedInvitationId=newId;reviewerDetailLoaded=false;
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
 for(const item of shown){const row=document.createElement("tr");for(const [i,key] of ["at","category","eventType","outcome","subject"].entries()){const cell=textNode("td",item[key]);cell.dataset.label=["Дата","Категория","Событие","Результат","Объект"][i];row.append(cell);}tbody.append(row);}
 if(!shown.length){const tr=document.createElement("tr"),td=textNode("td","Журнал пуст.");td.colSpan=5;tr.append(td);tbody.append(tr);}
 $("log-offset").textContent="offset: "+logOffset+" · nextOffset: "+(logOffset+limit<values.length?logOffset+limit:"null")+" (mock)";
 $("log-prev").disabled=logOffset===0;$("log-next").disabled=logOffset+limit>=values.length;
}
document.querySelectorAll("[data-review-mode]").forEach(btn=>btn.addEventListener("click",()=>{
 reviewMode=btn.dataset.reviewMode;
 document.querySelectorAll("[data-review-mode]").forEach(tab=>{const active=tab===btn;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;});
 renderReviews();
}));
$("review-seed-demo").addEventListener("click",()=>{
 if(!permitted("tenant.provision.approve")){feedback("403: требуется Reviewer.",true);return;}
 if(dataMode!=="demo"){feedback("Пустой набор: перейдите на Owner Overview и выберите демо-данные.",true);return;}
 let added=0;
 for(const code of ["north","delta"]){
  const c=companies.find(x=>x.code===code&&x.status==="draft");
  if(!c||reviews.some(r=>r.tenantId===c.tenantId))continue;
  reviews.push({requestId:requestId(),tenantId:c.tenantId,tenantName:c.name,tenantCode:c.code,requesterActorId:"mock-owner",requesterLogin:"fixture-owner",expectedRevision:c.revision,createdAt:"2026-11-23T11:00:00Z",state:"requested"});
  added++;
 }
 reviewMode="pending";
 document.querySelectorAll("[data-review-mode]").forEach(tab=>{let active=tab.dataset.reviewMode==="pending";tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;});
 renderReviews();
 feedback("Mock Reviewer: загружено "+added+" заявок из тех же данных Owner, без API.");
});
$("review-refresh").addEventListener("click",()=>{renderReviews();feedback("Mock GET /activation-reviews · обновлено без сетевого запроса.");});
$("reviewer-operator").addEventListener("change",()=>{reviewerChecked=false;renderReviewer();});
$("reviewer-check-status").addEventListener("click",()=>{reviewerChecked=true;renderReviewer();feedback("Mock GET /reviewers/status → 200 или 503; состояние не проверено на сервере.");});
$("reviewer-existing").addEventListener("change",()=>{selectedInvitationId=$("reviewer-existing").value;reviewerDetailLoaded=false;renderReviewer();});
$("reviewer-existing-check").addEventListener("click",()=>{reviewerDetailLoaded=true;renderSelectedInvitation();feedback("Mock GET /reviewers/invitations/{requestID}/status → 200.");});
$("reviewer-status-filter").addEventListener("change",renderReviewer);
$("invite-reviewer").addEventListener("click",createInvitation);
$("reviewer-history").addEventListener("click",()=>{showHistory=!showHistory;renderReviewer();});
$("log-category").addEventListener("change",()=>{logOffset=0;renderLogs();});
$("log-limit").addEventListener("change",()=>{logOffset=0;renderLogs();});
$("log-prev").addEventListener("click",()=>{logOffset=Math.max(0,logOffset-Number($("log-limit").value));renderLogs();});
$("log-next").addEventListener("click",()=>{logOffset+=Number($("log-limit").value);renderLogs();});

$("overview-data-mode").addEventListener("change",()=>changeDataMode($("overview-data-mode").value));
$("overview-load-demo").addEventListener("click",()=>changeDataMode("demo",true));
$("login-theme").addEventListener("click",()=>$("themeToggle").click());
 $("open-platform").addEventListener("click",()=>{
 if(!session){feedback("Сначала выполните демонстрационный вход; реальные пароли и TOTP вводить не требуется.",true);return;}
 const destination=requestedPage||homeSection();
 requestedPage=null;
 $("open-platform").textContent="Открыть Platform Admin →";
 navigate(destination);
});
 function openOverviewCompany(tenantId){
 if(!permitted("tenant.read")&&!permitted("tenant.create"))return;
 const index=companies.findIndex(c=>c.tenantId===tenantId);
 if(index<0)return;
 selectedId=tenantId;pageNo=Math.floor(index/2);
 $("company-status").value="all";$("company-search").value="";
 navigate("companies");renderCompanies();
}
function parityContext(){return {session,companies,reviews,reviewDecisions,permitted,feedback,navigate,openOverviewCompany,dataMode,serverMode};}
 navigate(location.hash.slice(1)||"login");updateActions();
})();
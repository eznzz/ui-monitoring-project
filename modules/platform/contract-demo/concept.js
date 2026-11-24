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
 {tenantId:"8e185467-876c-4c7d-8f6e-d9dd7b29c808",code:"polar",name:"Polar Research (demo)",status:"active",revision:6,profile:{legalName:"Polar Research Inc.",tradeName:"Polar",description:"Научная организация · демонстрация",registrationNumber:"",taxNumber:"",countryCode:"NO",contactEmail:"research@example.test",website:""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c809","code":"atlas","name":"Atlas Marine (demo)","status":"active","revision":8,"profile":{"legalName":"Atlas Marine GmbH","tradeName":"Atlas","description":"Hamburg maritime operations","registrationNumber":"DEMO-ATLAS","taxNumber":"","countryCode":"DE","contactEmail":"atlas@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c810","code":"orion","name":"Orion Laboratories (demo)","status":"draft","revision":2,"profile":{"legalName":"Orion Laboratories Ltd.","tradeName":"Orion","description":"Laboratory services fixture","registrationNumber":"DEMO-ORION","taxNumber":"","countryCode":"GB","contactEmail":"orion@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c811","code":"cedar","name":"Cedar Freight (demo)","status":"active","revision":5,"profile":{"legalName":"Cedar Freight AS","tradeName":"Cedar","description":"Logistics and shipping fixture","registrationNumber":"DEMO-CEDAR","taxNumber":"","countryCode":"NO","contactEmail":"cedar@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c812","code":"meridian","name":"Meridian Energy (demo)","status":"provisioning","revision":3,"profile":{"legalName":"Meridian Energy BV","tradeName":"Meridian","description":"Provisioning lifecycle test","registrationNumber":"DEMO-MERIDIAN","taxNumber":"","countryCode":"NL","contactEmail":"meridian@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c813","code":"nimbus","name":"Nimbus Robotics (demo)","status":"active","revision":9,"profile":{"legalName":"Nimbus Robotics GmbH","tradeName":"Nimbus","description":"Industrial automation fixture","registrationNumber":"DEMO-NIMBUS","taxNumber":"","countryCode":"DE","contactEmail":"nimbus@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c814","code":"seabird","name":"Seabird Foods (demo)","status":"disabled","revision":4,"profile":{"legalName":"Seabird Foods Ltd.","tradeName":"Seabird","description":"Disabled tenant lifecycle test","registrationNumber":"DEMO-SEABIRD","taxNumber":"","countryCode":"IE","contactEmail":"seabird@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c815","code":"granite","name":"Granite Industrial (demo)","status":"suspended","revision":6,"profile":{"legalName":"Granite Industrial Oy","tradeName":"Granite","description":"Suspended tenant lifecycle test","registrationNumber":"DEMO-GRANITE","taxNumber":"","countryCode":"FI","contactEmail":"granite@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c816","code":"aurora","name":"Aurora Data (demo)","status":"draft","revision":1,"profile":{"legalName":"Aurora Data AB","tradeName":"Aurora","description":"New draft with incomplete setup","registrationNumber":"DEMO-AURORA","taxNumber":"","countryCode":"SE","contactEmail":"aurora@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c817","code":"vector","name":"Vector Services (demo)","status":"active","revision":7,"profile":{"legalName":"Vector Services SAS","tradeName":"Vector","description":"Multiple modules and users fixture","registrationNumber":"DEMO-VECTOR","taxNumber":"","countryCode":"FR","contactEmail":"vector@example.test","website":""}},
 {"tenantId":"8e185467-876c-4c7d-8f6e-d9dd7b29c818","code":"tidewater","name":"Tidewater Solutions (demo)","status":"draft","revision":2,"profile":{"legalName":"Tidewater Solutions Ltd.","tradeName":"Tidewater","description":"New draft for review testing","registrationNumber":"DEMO-TIDEWATER","taxNumber":"","countryCode":"GB","contactEmail":"tidewater@example.test","website":""}}];
let companySortKey="",companySortDir=1,companyPage=0,companyPageCount=1;const companyPageSize=10;
let companies=structuredClone(seed), dataMode="demo", session=null, page="login", requestedPage=null, selectedId=null, editingId=null;
let reviews=[], reviewDecisions=[], serverMode="standard";
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
 if(page==="login")$("platform-login-error").setAttribute("aria-label",message);
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
const homeSection=()=>permitted("tenant.provision.approve")?"activation":canCompanies()?"overview":permitted("platform.reviewer.bootstrap")?"reviewer":"contract";
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
 if(next==="login"&&session)logout();
 if(session&&next!=="login"&&!isAllowed(next)){
  const forbidden=next;
  next=homeSection();
  feedback("Доступ к разделу «"+forbidden+"» отсутствует в текущем наборе permissions / серверных флагов; открыт доступный раздел.",true);
 }
 
 if(!session&&next!=="login"){
  requestedPage=next;
  next="login";
  $("platform-login-error").textContent="";
  // Preserve a requested deep link until a demo subject is selected by login name.
 }
 if(next!=="companies"&&$("company-dialog").open)$("company-dialog").close();
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
function login(event){
 event.preventDefault();
 const form=$("platform-login-form");
 if(!form.reportValidity())return;
 const loginName=$("platform-login-name").value.trim().toLowerCase();
 const suppliedPassword=$("platform-login-password").value;
 const suppliedTotp=$("platform-login-totp").value;
 // These values are demo-only, never sent to a server, stored, logged, or copied into a session.
 $("platform-login-password").value="";
 $("platform-login-totp").value="";
 const identities={
  "owner.demo":{type:"owner",mode:"restricted"},
  "reviewer.demo":{type:"reviewer",mode:"restricted"},
  "lab.owner.demo":{type:"owner",mode:"lab"},
  "readonly.reviewer.demo":{type:"reviewer",mode:"standard"}
 };
 const identity=identities[loginName];
 if(!identity||suppliedPassword!=="demo-only"||suppliedTotp!=="000000"){
  $("platform-login-error").textContent="Используйте только демонстрационные значения из подсказки. Реальные учётные данные здесь не проверяются.";
  return;
 }
 $("platform-login-error").textContent="";
 const type=identity.type;
 serverMode=identity.mode;
 session={actorId:type==="owner"?"mock-owner":"mock-reviewer",login:"fixture-"+type,permissions:[...rights[type]]};
 if(type==="owner"&&serverMode==="lab")session.permissions.push("platform.mail.diagnose","platform.mail.test_send");
 feedback("Открыт демонстрационный сценарий "+(type==="owner"?"Owner":"Reviewer")+". Реальная аутентификация не выполнялась.");
 updateActions();
 const destination=requestedPage&&isAllowed(requestedPage)?requestedPage:homeSection();
 requestedPage=null;
 navigate(destination);
}
function logout(){
 if($("company-dialog").open)$("company-dialog").close();selectedId=null;
 companySortKey="";companySortDir=1;companyPage=0;
 session=null;requestedPage=null;
 $("platform-login-form").reset();
 $("platform-login-error").textContent="";
 feedback("Демонстрационный сценарий завершён.");
 updateActions();navigate("login");
}
function updateActions(){
 $("new-company").disabled=!permitted("tenant.create");
 $("new-company").title=permitted("tenant.create")?"POST /companies":"Нет tenant.create в mock GET /me";
 renderCompanies();renderReviews();renderReviewer();renderLogs();if(window.MPPlatformParity)window.MPPlatformParity.render(page,parityContext());
}

function changeDataMode(next,force=false){
 if(!["demo","empty"].includes(next)||(next===dataMode&&!force))return;
 if($("company-dialog").open)$("company-dialog").close();
 dataMode=next;
 companies=next==="demo"?structuredClone(seed):[];
 companySortKey="";companySortDir=1;
 reviews=[];reviewDecisions=[];invitations.length=0;
 reviewerChecked=false;selectedInvitationId="";reviewerDetailLoaded=false;
 showHistory=false;selectedId=null;editingId=null;companyPage=0;logShown=Number($("log-limit").value);
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
  const tr=document.createElement("tr"),td=textNode("td","403 · нет tenant.read. Войдите через тестовую фикстуру с правом чтения.");td.colSpan=5;td.className="table-empty";tr.append(td);tbody.append(tr);
  companyPage=0;companyPageCount=1;$("company-prev").disabled=true;$("company-next").disabled=true;$("company-page").textContent="1 / 1";$("company-range").textContent="Нет доступа";$("company-detail").replaceChildren(textNode("p","Карточка недоступна без tenant.read."));return;
 }
 const normalized=text=>String(text??"").toLocaleLowerCase("ru").normalize("NFKC");
 const filtered=companies.filter(c=>{
  if(filter!=="all"&&c.status!==filter)return false;
  if(!query)return true;
  const searchable=[c.tenantId,c.code,c.name,...Object.values(c.profile||{})].map(normalized).join(" ");
  return searchable.includes(normalized(query));
 });
 if(companySortKey)filtered.sort((a,b)=>companySortDir*(companySortKey==="revision"?a.revision-b.revision:String(a[companySortKey]).localeCompare(String(b[companySortKey]),"ru",{numeric:true})));
 companyPageCount=Math.max(1,Math.ceil(filtered.length/companyPageSize));companyPage=Math.min(Math.max(0,companyPage),companyPageCount-1);
 const shown=filtered.slice(companyPage*companyPageSize,(companyPage+1)*companyPageSize);
 if(!shown.length){const tr=document.createElement("tr");const td=textNode("td",companies.length?"Нет компаний с такими параметрами поиска.":"Компаний пока нет. Выберите демо-набор в Overview или создайте черновик.");td.colSpan=5;td.className="table-empty";tr.append(td);tbody.append(tr);}
 for(const c of shown){
  const tr=document.createElement("tr");
  for(const key of ["name","code","status","revision"]){const cell=document.createElement("td");cell.dataset.label={name:"Компания",code:"Код",status:"Статус",revision:"Revision"}[key];
   if(key==="status"){const pill=textNode("span",c.status);pill.className="table-status-pill";pill.dataset.status=c.status;cell.append(pill);}else cell.textContent=c[key];tr.append(cell);
  }
  const td=document.createElement("td"),btn=textNode("button","Открыть");td.dataset.label="Действие";btn.type="button";btn.className="button secondary small";btn.setAttribute("aria-haspopup","dialog");btn.addEventListener("click",()=>openCompanyDetail(c.tenantId));td.append(btn);tr.append(td);tbody.append(tr);
 }
 $("company-filter-summary").textContent=(query||filter!=="all")?"Найдено: "+filtered.length+" · поиск только по загруженным демо-данным":"Все загруженные компании: "+companies.length;
 $("company-reset").disabled=!query&&filter==="all";
 $("company-page").textContent=(companyPage+1)+" / "+companyPageCount;
 $("company-prev").disabled=companyPage===0;
 $("company-next").disabled=companyPage>=companyPageCount-1;
 $("company-range").textContent=filtered.length?"Показано "+shown.length+" из "+filtered.length:"Компаний: 0";
 document.querySelectorAll("[data-company-sort]").forEach(button=>{const active=button.dataset.companySort===companySortKey;button.setAttribute("aria-pressed",String(active));button.querySelector("span").textContent=active?(companySortDir===1?"↑":"↓"):"↕";button.closest("th").setAttribute("aria-sort",active?(companySortDir===1?"ascending":"descending"):"none");});
 $("company-mobile-sort").value=companySortKey?companySortKey+":"+companySortDir:"";
 // Client-side pages of the loaded mock records; real API cursor fetching is unchanged in scope.
 renderDetail();
}
function openCompanyDetail(id){
 if(!permitted("tenant.read")||!companies.some(c=>c.tenantId===id))return;
 selectedId=id;renderDetail();const dialog=$("company-dialog");if(!dialog.open)dialog.showModal();
}
function renderDetail(){
 const panel=$("company-detail"),actions=$("company-dialog-actions");panel.replaceChildren();actions.replaceChildren();
 const c=selected();$("company-dialog-notice").textContent="";if(!c||!permitted("tenant.read"))return;
 $("company-dialog-title").textContent=c.name;
 $("company-dialog-description").textContent="GET "+prefix+"/companies/{tenantID} · mock 200";
 const dl=document.createElement("dl");
 const pairs=[["Tenant UUID",c.tenantId],["Код",c.code],["Статус",c.status],["Revision",c.revision],["Юридическое название",c.profile.legalName||"—"],["Торговое название",c.profile.tradeName||"—"],["Описание",c.profile.description||"—"],["Регистрационный номер",c.profile.registrationNumber||"—"],["Налоговый номер",c.profile.taxNumber||"—"],["Страна",c.profile.countryCode||"—"],["Контактный e-mail",c.profile.contactEmail||"—"],["Веб-сайт",c.profile.website||"—"]];
 for(const [name,value] of pairs)dl.append(textNode("dt",name),textNode("dd",value));
 panel.append(dl);
 if(c.status==="draft"&&permitted("tenant.draft.update")){
  const edit=textNode("button","Редактировать");edit.type="button";edit.className="button secondary";edit.addEventListener("click",()=>openRecord(c.tenantId));actions.append(edit);
 }
 const existing=reviews.find(r=>r.tenantId===c.tenantId&&["requested","approved"].includes(r.state));
 if(existing){$("company-dialog-notice").textContent=existing.state==="approved"?"Заявка одобрена Reviewer. Для создания Tenant DB требуется отдельный C01 START.":"Заявка на активацию отправлена. Ожидается решение Reviewer.";}
 if(c.status==="draft"&&permitted("tenant.activate")&&!existing){
  const activate=textNode("button","Запросить активацию");activate.type="button";activate.className="button primary";
  activate.addEventListener("click",()=>{
   $("company-dialog-notice").textContent="Активация требует решения независимого Reviewer. Создание Tenant DB не выполняется автоматически.";
   activate.textContent="Подтвердить запрос";activate.addEventListener("click",()=>requestActivation(c),{once:true});
   const cancel=textNode("button","Отмена");cancel.type="button";cancel.className="button secondary";cancel.addEventListener("click",()=>renderDetail());actions.insertBefore(cancel,activate);
  },{once:true});actions.append(activate);
 }
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
 $("record-dialog").close();companyPage=0;$("company-status").value="all";$("company-search").value="";renderCompanies();if(selectedId)openCompanyDetail(selectedId);
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
$("platform-login-form").addEventListener("submit",login);
document.querySelectorAll("[data-company-sort]").forEach(button=>button.addEventListener("click",()=>{const next=button.dataset.companySort;companySortDir=next===companySortKey?-companySortDir:1;companySortKey=next;companyPage=0;renderCompanies();}));
$("company-mobile-sort").addEventListener("change",()=>{const [key,dir]=$("company-mobile-sort").value.split(":");companySortKey=key;companySortDir=Number(dir)||1;companyPage=0;renderCompanies();});
$("company-status").addEventListener("change",()=>{companyPage=0;renderCompanies();});
$("company-search").addEventListener("input",()=>{companyPage=0;renderCompanies();});
$("company-prev").addEventListener("click",()=>{if(companyPage>0){companyPage--;renderCompanies();}});
$("company-next").addEventListener("click",()=>{if(companyPage<companyPageCount-1){companyPage++;renderCompanies();}});
$("company-reset").addEventListener("click",()=>{
 $("company-search").value="";$("company-status").value="all";
 companyPage=0;renderCompanies();
});
$("new-company").addEventListener("click",()=>openRecord(null));
$("record-form").addEventListener("submit",saveRecord);
$("company-dialog").addEventListener("click",event=>{if(event.target===$("company-dialog"))$("company-dialog").close();});
$("close-record").addEventListener("click",()=>$("record-dialog").close());
$("cancel-record").addEventListener("click",()=>$("record-dialog").close());

window.addEventListener("hashchange",()=>navigate(location.hash.slice(1)));
document.querySelectorAll("[data-page]").forEach(el=>el.addEventListener("click",ev=>{ev.preventDefault();navigate(el.dataset.page);}));

const invitations=[];
let showHistory=false,logShown=5;
const baseLogs=[
 {at:"2026-11-23T09:00:00Z",category:"tenant",eventType:"company.created",outcome:"success",subject:"NORTH"},
 {at:"2026-11-23T08:55:00Z",category:"auth",eventType:"platform.login",outcome:"success",subject:"fixture-owner"},
 {at:"2026-11-23T08:50:00Z",category:"review",eventType:"activation.requested",outcome:"success",subject:"NORTH"},
 {at:"2026-11-22T15:00:00Z",category:"tenant",eventType:"company.updated",outcome:"success",subject:"EAST"},
 {at:"2026-11-22T14:00:00Z",category:"auth",eventType:"platform.login",outcome:"denied",subject:"demo"},
 {at:"2026-11-22T13:00:00Z",category:"review",eventType:"activation.reviewed",outcome:"success",subject:"blue"},
 {at:"2026-11-22T12:00:00Z",category:"tenant",eventType:"company.created",outcome:"success",subject:"harbor"},
 {at:"2026-11-22T11:30:00Z",category:"tenant",eventType:"company.updated",outcome:"success",subject:"polar"},
 {at:"2026-11-22T11:00:00Z",category:"auth",eventType:"platform.login",outcome:"success",subject:"fixture-owner"},
 {at:"2026-11-22T10:30:00Z",category:"tenant",eventType:"company.created",outcome:"success",subject:"delta"},
 {at:"2026-11-22T10:00:00Z",category:"review",eventType:"activation.requested",outcome:"success",subject:"north"},
 {at:"2026-11-22T09:30:00Z",category:"tenant",eventType:"company.updated",outcome:"success",subject:"west"},
 {at:"2026-11-22T09:00:00Z",category:"auth",eventType:"platform.login",outcome:"denied",subject:"fixture-reviewer"},
 {at:"2026-11-22T08:30:00Z",category:"tenant",eventType:"company.created",outcome:"success",subject:"south"},
 {at:"2026-11-22T08:00:00Z",category:"review",eventType:"activation.reviewed",outcome:"success",subject:"blue"},
 {at:"2026-11-22T07:30:00Z",category:"auth",eventType:"platform.login",outcome:"success",subject:"fixture-owner"}
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
  $("log-more").hidden=true;$("log-more").disabled=true;$("log-range").textContent="Нет доступа";return;
 }
 const cat=$("log-category").value,batch=Number($("log-limit").value);
 const query=$("log-search").value.trim().toLocaleLowerCase("ru").normalize("NFKC");
 const dateFrom=$("log-date-from").value,dateTo=$("log-date-to").value;
 const timeFrom=$("log-time-from").value,timeTo=$("log-time-to").value;
 const hasInvalidDate=dateFrom&&dateTo&&dateFrom>dateTo;
 const hasInvalidTime=timeFrom&&timeTo&&timeFrom>timeTo;
 const invalid=hasInvalidDate||hasInvalidTime;
 $("log-filter-error").textContent=hasInvalidDate?"Начальная дата позже конечной. Исправьте диапазон.":hasInvalidTime?"Начальное время позже конечного. Исправьте диапазон UTC.":"";
 if(invalid){
  const tr=document.createElement("tr"),td=textNode("td","Исправьте диапазон дат или времени для отображения событий.");td.colSpan=5;tr.append(td);tbody.append(tr);
  $("log-range").textContent="Диапазон некорректен";
  $("log-more").hidden=true;$("log-more").disabled=true;return;
 }
 const values=baseLogs.filter(x=>{
  if(cat!=="all"&&x.category!==cat)return false;
  if(query&&![x.at,x.category,x.eventType,x.outcome,x.subject].join(" ").toLocaleLowerCase("ru").normalize("NFKC").includes(query))return false;
  const day=x.at.slice(0,10),time=x.at.slice(11,16);
  if(dateFrom&&day<dateFrom)return false;
  if(dateTo&&day>dateTo)return false;
  if(timeFrom&&time<timeFrom)return false;
  if(timeTo&&time>timeTo)return false;
  return true;
 });
 const shown=values.slice(0,logShown);
 for(const item of shown){const row=document.createElement("tr");for(const [i,key] of ["at","category","eventType","outcome","subject"].entries()){const cell=textNode("td",item[key]);cell.dataset.label=["Дата","Категория","Событие","Результат","Объект"][i];row.append(cell);}tbody.append(row);}
 if(!shown.length){const tr=document.createElement("tr"),td=textNode("td","Нет событий по выбранным условиям.");td.colSpan=5;tr.append(td);tbody.append(tr);}
 const hasMore=shown.length<values.length;
 $("log-range").textContent=values.length?"Показано "+shown.length+" из "+values.length:"Записей: 0";
 $("log-more").hidden=!hasMore;$("log-more").disabled=!hasMore;
 $("log-more").textContent="Показать ещё "+Math.min(batch,values.length-shown.length);
 $("log-more").title=hasMore?"Mock GET /platform-logs?limit="+batch+"&offset="+shown.length:"Все загруженные события показаны";
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
const onLogFilterChange=()=>{logShown=Number($("log-limit").value);renderLogs();};
for(const id of ["log-category","log-limit","log-date-from","log-date-to","log-time-from","log-time-to"])$(id).addEventListener("change",onLogFilterChange);
$("log-search").addEventListener("input",onLogFilterChange);
$("log-more").addEventListener("click",()=>{logShown+=Number($("log-limit").value);renderLogs();});
$("log-reset").addEventListener("click",()=>{
 for(const id of ["log-search","log-date-from","log-date-to","log-time-from","log-time-to"])$(id).value="";
 $("log-category").value="all";onLogFilterChange();
});

$("overview-data-mode").addEventListener("change",()=>changeDataMode($("overview-data-mode").value));
$("overview-load-demo").textContent="Загрузить "+seed.length+" демо-компаний";
$("overview-load-demo").addEventListener("click",()=>changeDataMode("demo",true));
$("login-theme").addEventListener("click",()=>$("themeToggle").click());

 function openOverviewCompany(tenantId){
 if(!permitted("tenant.read")&&!permitted("tenant.create"))return;
 const index=companies.findIndex(c=>c.tenantId===tenantId);
 if(index<0)return;
 companySortKey="";companySortDir=1;selectedId=tenantId;companyPage=Math.floor(index/companyPageSize);
 $("company-status").value="all";$("company-search").value="";
 navigate("companies");openCompanyDetail(tenantId);
}
function parityContext(){return {session,companies,reviews,reviewDecisions,permitted,feedback,navigate,openOverviewCompany,dataMode,serverMode};}
 navigate(location.hash.slice(1)||"login");updateActions();
})();
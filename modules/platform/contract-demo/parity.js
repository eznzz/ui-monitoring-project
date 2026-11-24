/* Monitoring Project / VDMS Owner and Reviewer parity. UI-only, no HTTP, credentials or timers. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const element=(tag,label,cls)=>{const node=document.createElement(tag);if(label!==undefined)node.textContent=String(label);if(cls)node.className=cls;return node;};
const empty=el=>el.replaceChildren();
const addButton=(parent,label,cb,cls="button secondary")=>{const b=element("button",label,cls);b.type="button";b.addEventListener("click",cb);parent.append(b);return b;};
const detail=(label,value)=>{const d=document.createElement("div");d.append(element("dt",label),element("dd",value));return d;};
const alert=(msg,warning=false)=>{const node=element("div",undefined,"vms-alert"+(warning?" vms-alert-warning":""));node.setAttribute("role","status");node.append(element("strong",warning?"Предупреждение":"Информация"),element("span",msg));return node;};
const restricted=(root,msg)=>{root.replaceChildren(alert("403 · "+msg,true));};
let ctx=null,chosenProvisioningId=null,mailRevision=1,mailAttempt=0;
let monitorState=null;
let mailLab=false;
const services=[
 ["platform","Platform API","Сессия отвечает, но это только mock."],
 ["central-web","Central HTTPS / Nginx","Загрузка страницы не подтверждает состояние Nginx."],
 ["platform-db","Platform PostgreSQL","Проверка сессии не является прямым health-check PostgreSQL."],
 ["claim","Reviewer Claim Operator","Доверенный IPC может отвечать, но Claim не выполнялся."],
 ["email","Reviewer Invitation + Email Operator","SMTP-доставка не тестировалась."],
 ["mail","Mail Operator","Unix IPC не подтверждает доставку почты."],
 ["c01","C01 Provisioning Operator","Наличие IPC не означает готовности C01 или создания БД."]
];
function canCompanies(){return ctx.permitted("tenant.read")||ctx.permitted("tenant.create");}
function canOperate(){return ctx.permitted("tenant.create")&&ctx.permitted("tenant.activate");}
function canReviewerAdmin(){return ctx.permitted("platform.reviewer.bootstrap");}
function canReview(){return ctx.permitted("tenant.provision.approve");}
function kpi(label,value){
 const card=element("article",undefined,"mp-card mp-stack");
 card.append(element("span",label,"mp-eyebrow"),element("strong",value,"mp-section-title"));return card;
}
// Independent, explicitly fictional Tenant fixture data; not derived from Platform API.
// Every company has an independent, fictional Tenant fixture. This is NEVER a Platform API result.
const tenantDemo={
 NORTH:{users:[{login:"captain.demo",displayName:"Капитан (demo)",active:true},{login:"operator.demo",displayName:"Оператор (demo)",active:true},{login:"auditor.demo",displayName:"Аудитор (demo)",active:false}],
 modules:[{code:"core",name:"Core (пример)",status:"demo",enabled:true},{code:"documents",name:"Documents (пример)",status:"demo",enabled:true},{code:"monitoring",name:"Monitoring (пример)",status:"demo",enabled:false}]},
 BLUE:{users:[{login:"manager.demo",displayName:"Менеджер (demo)",active:true},{login:"reader.demo",displayName:"Читатель (demo)",active:true}],
 modules:[{code:"core",name:"Core (пример)",status:"demo",enabled:true},{code:"documents",name:"Documents (пример)",status:"demo",enabled:false}]},
 EAST:{users:[{login:"provisioning.demo",displayName:"Пользователь подготовки (demo)",active:false}],
 modules:[{code:"core",name:"Core (пример)",status:"demo",enabled:false}]},
 WEST:{users:[{login:"admin.demo",displayName:"Администратор (demo)",active:false},{login:"inspector.demo",displayName:"Инспектор (demo)",active:false}],
 modules:[{code:"core",name:"Core (пример)",status:"demo",enabled:false},{code:"audit",name:"Audit (пример)",status:"demo",enabled:false}]},
 SOUTH:{users:[],modules:[]},
 HARBOR:{users:[{login:"engineer.demo",displayName:"Инженер (demo)",active:true},{login:"lead.demo",displayName:"Руководитель (demo)",active:true},{login:"quality.demo",displayName:"Контроль качества (demo)",active:true},{login:"retired.demo",displayName:"Бывший сотрудник (demo)",active:false}],
 modules:[{code:"core",name:"Core (пример)",status:"demo",enabled:true},{code:"maintenance",name:"Maintenance (пример)",status:"demo",enabled:true},{code:"documents",name:"Documents (пример)",status:"demo",enabled:true}]},
 DELTA:{users:[{login:"draft-owner.demo",displayName:"Владелец черновика (demo)",active:false}],
 modules:[]},
 POLAR:{users:[{login:"research.demo",displayName:"Исследователь (demo)",active:true},{login:"coordinator.demo",displayName:"Координатор (demo)",active:true}],
 modules:[{code:"core",name:"Core (пример)",status:"demo",enabled:true},{code:"objects",name:"Objects (пример)",status:"demo",enabled:true},{code:"analytics",name:"Analytics (пример)",status:"demo",enabled:false}]},
 ATLAS:{"users":[{"login":"fleet.demo","displayName":"Координатор флота (demo)","active":true},{"login":"captain-atlas.demo","displayName":"Капитан (demo)","active":true},{"login":"archive.demo","displayName":"Архивный пользователь (demo)","active":false}],"modules":[{"code":"core","name":"Core (пример)","status":"demo","enabled":true},{"code":"fleet","name":"Fleet (пример)","status":"demo","enabled":true},{"code":"documents","name":"Documents (пример)","status":"demo","enabled":true}]},
 ORION:{"users":[{"login":"orion-owner.demo","displayName":"Владелец черновика (demo)","active":false}],"modules":[{"code":"core","name":"Core (пример)","status":"demo","enabled":false}]},
 CEDAR:{"users":[{"login":"dispatcher.demo","displayName":"Диспетчер (demo)","active":true},{"login":"logistics.demo","displayName":"Логист (demo)","active":true}],"modules":[{"code":"core","name":"Core (пример)","status":"demo","enabled":true},{"code":"freight","name":"Freight (пример)","status":"demo","enabled":true}]},
 MERIDIAN:{"users":[{"login":"setup.demo","displayName":"Специалист внедрения (demo)","active":false}],"modules":[{"code":"core","name":"Core (пример)","status":"demo","enabled":false},{"code":"energy","name":"Energy (пример)","status":"demo","enabled":false}]},
 NIMBUS:{"users":[{"login":"roboticist.demo","displayName":"Инженер (demo)","active":true},{"login":"qa-nimbus.demo","displayName":"Тестировщик (demo)","active":true},{"login":"analyst.demo","displayName":"Аналитик (demo)","active":true}],"modules":[{"code":"core","name":"Core (пример)","status":"demo","enabled":true},{"code":"maintenance","name":"Maintenance (пример)","status":"demo","enabled":true},{"code":"analytics","name":"Analytics (пример)","status":"demo","enabled":false}]},
 SEABIRD:{"users":[],"modules":[]},
 GRANITE:{"users":[{"login":"inspector-granite.demo","displayName":"Инспектор (demo)","active":false}],"modules":[{"code":"core","name":"Core (пример)","status":"demo","enabled":false},{"code":"audit","name":"Audit (пример)","status":"demo","enabled":false}]},
 AURORA:{"users":[],"modules":[]},
 VECTOR:{"users":[{"login":"vector-admin.demo","displayName":"Администратор (demo)","active":true},{"login":"vector-reader.demo","displayName":"Оператор (demo)","active":true},{"login":"vector-archive.demo","displayName":"Архивный (demo)","active":false}],"modules":[{"code":"core","name":"Core (пример)","status":"demo","enabled":true},{"code":"objects","name":"Objects (пример)","status":"demo","enabled":true},{"code":"documents","name":"Documents (пример)","status":"demo","enabled":true},{"code":"analytics","name":"Analytics (пример)","status":"demo","enabled":false}]},
 TIDEWATER:{"users":[{"login":"draft.demo","displayName":"Создатель черновика (demo)","active":false}],"modules":[]}
};
let overviewTenantID="";
function fixtureFor(company){return tenantDemo[company?.code?.toUpperCase()]||null;}
function tableCell(value,label){
 const td=element("td",value);td.dataset.label=label;return td;
}
function overview(){
 $("overview-data-mode").value=ctx.dataMode;
 $("overview-mode-label").textContent=ctx.dataMode==="empty"?"Пустое состояние":"Демонстрационные данные";
 $("overview-kpi-source").textContent=ctx.dataMode==="empty"?"Источник: пустой mock-набор":"Источник: "+ctx.companies.length+" записей текущего mock-набора";
 const root=$("overview-kpis"),companyBody=$("overview-companies-body"),statuses=$("overview-company-statuses"),dbBody=$("overview-databases-body");
 for(const el of [root,companyBody,statuses,dbBody])empty(el);
 const allowed=canCompanies();
 const ids=["overview-open-companies","overview-open-provisioning","overview-open-monitor","overview-open-reviewer"];
 for(const id of ids)$(id).disabled=!allowed||(id==="overview-open-provisioning"||id==="overview-open-monitor"? !canOperate():id==="overview-open-reviewer"?!canReviewerAdmin():false);
 $("overview-tenant-select").disabled=!allowed;
 $("overview-tenant-kind").disabled=!allowed;
 if(!allowed){
  restricted(root,"Обзор Platform доступен при tenant.read или tenant.create.");
  restricted($("overview-tenant-kpis"),"Нельзя просматривать Tenant-демо без авторизации в Platform mock.");
  $("overview-tenant-head").replaceChildren();
  $("overview-tenant-body").replaceChildren();
  const blocked=element("tr");
  const cell=tableCell("403 · нет права чтения компаний","Доступ");cell.colSpan=5;blocked.append(cell);companyBody.append(blocked);
  return;
 }
 const companies=ctx.companies;
 const chosen=companies.find(c=>c.tenantId===overviewTenantID)||companies[0]||null;
 overviewTenantID=chosen?.tenantId||"";
 root.append(
  kpi("Компаний · загружено",companies.length),
  kpi("Активных · загружено",companies.filter(c=>c.status==="active").length),
  kpi("Provisioning · загружено",companies.filter(c=>c.status==="provisioning").length)
 );
 const fixture=fixtureFor(chosen);
 root.append(
  kpi("Пользователи · Tenant demo",fixture?fixture.users.length+" mock":ctx.dataMode==="empty"?"0":"Нет данных"),
  kpi("Модули · Tenant demo",fixture?fixture.modules.length+" mock":ctx.dataMode==="empty"?"0":"Нет данных"),
  kpi("Tenant DB · общий инвентарь","Не доступен")
 );
 const order=["draft","provisioning","active","suspended","disabled"];
 for(const status of order){
  const count=companies.filter(c=>c.status===status).length;
  statuses.append(element("span",status+" · "+count,"mp-badge"));
 }
 if(!companies.length){
  const tr=element("tr"),td=tableCell("Компаний пока нет. Переключитесь на демо-данные или создайте черновик.","Компании");
  td.colSpan=5;tr.append(td);companyBody.append(tr);
 }
 for(const company of companies){
  const tr=element("tr");
  tr.append(tableCell(company.name,"Компания"),tableCell(company.code,"Код"),tableCell(company.status,"Статус Platform"),tableCell(company.revision,"Ревизия"));
  const last=tableCell("","Действие");
  addButton(last,"Открыть",()=>{
   ctx.openOverviewCompany(company.tenantId);
  });
  tr.append(last);companyBody.append(tr);
 }
 const select=$("overview-tenant-select");
 select.replaceChildren(new Option("Выберите компанию",""));
 for(const c of companies)select.add(new Option(c.name+" · "+c.code,c.tenantId));
 select.value=overviewTenantID;
 overviewTenant();
 if(!companies.length){
  const tr=element("tr"),td=tableCell("Нет записей Tenant DB для просмотра.","Базы данных");
  td.colSpan=5;tr.append(td);dbBody.append(tr);
 }
 for(const c of companies){
  const tr=element("tr");
  const dbState=c.status==="provisioning"?"Требуется C01 проверка":"Не проверено";
  tr.append(tableCell(c.name,"Компания"),tableCell(c.status,"Статус Platform"),
    tableCell(dbState,"Tenant DB"),tableCell("Не проверено","Маршрут"),tableCell(c.status==="provisioning"?"GET /companies/{tenantID}/provisioning":"Нет Platform DB inventory","Доказательство"));
  dbBody.append(tr);
 }
}
let tenantPage=0,tenantPageCount=1,tenantSortKey="first",tenantSortDir=1;
const tenantPageSize=10;
function resetTenantTable(){tenantPage=0;tenantSortKey="first";tenantSortDir=1;$("tenant-table-search").value="";$("tenant-table-status").value="all";}
function overviewTenant(){
 const kpis=$("overview-tenant-kpis"),body=$("overview-tenant-body"),thead=$("overview-tenant-head");
 empty(kpis);empty(body);empty(thead);
 const allowed=canCompanies(),c=allowed?ctx.companies.find(x=>x.tenantId===$("overview-tenant-select").value):null,fixture=fixtureFor(c);
 const users=$("overview-tenant-kind").value==="users";
 const labels=users?["Логин","Имя","Состояние"]:["Код","Название","Состояние"];
 $("tenant-table-caption").textContent=users?"Пользователи компании":"Модули компании";
 $("tenant-table-search").placeholder=users?"Логин или имя":"Код или название";
 const status=$("tenant-table-status");status.options[1].textContent=users?"active":"enabled";
 const mobile=$("tenant-mobile-sort");
 for(let i=0;i<4;i++)mobile.options[i].textContent=labels[Math.floor(i/2)]+(i%2===0?": А—Я":": Я—А");
 const head=element("tr");
 ["first","second","status"].forEach((key,i)=>{const th=element("th");th.scope="col";const button=element("button",labels[i]+" ","sort-control");button.type="button";const active=tenantSortKey===key;button.setAttribute("aria-pressed",String(active));th.setAttribute("aria-sort",active?(tenantSortDir===1?"ascending":"descending"):"none");const arrow=element("span",active?(tenantSortDir===1?"↑":"↓"):"↕");arrow.setAttribute("aria-hidden","true");button.append(arrow);button.addEventListener("click",()=>{tenantSortDir=tenantSortKey===key?-tenantSortDir:1;tenantSortKey=key;tenantPage=0;overviewTenant();});th.append(button);head.append(th);});thead.append(head);
 let records=[];
 if(!allowed)restricted(kpis,"Нет доступа к обзору.");
 else if(!fixture)kpis.append(alert(ctx.companies.length===0?"Компаний пока нет — пользователи и модули не загружены.":"Для выбранной компании нет Tenant-фикстур. Это не означает, что на сервере отсутствуют пользователи или модули."));
 else if(users){
  if(!fixture.users.length)kpis.append(alert("Пользователей в этой тестовой компании нет."));
  kpis.append(element("span","Всего (демо): "+fixture.users.length,"mp-badge"),element("span","Активных (демо): "+fixture.users.filter(u=>u.active).length,"mp-badge"));
  records=fixture.users.map(u=>({first:u.login,second:u.displayName,status:u.active?"active":"disabled",enabled:u.active}));
 }else{
  if(!fixture.modules.length)kpis.append(alert("В этой тестовой компании не назначено модулей."));
  kpis.append(element("span","Модулей в фикстуре: "+fixture.modules.length,"mp-badge"),element("span","Enabled (демо): "+fixture.modules.filter(m=>m.enabled).length,"mp-badge"));
  records=fixture.modules.map(m=>({first:m.code,second:m.name,status:m.enabled?"enabled":"disabled",enabled:m.enabled}));
 }
 const query=$("tenant-table-search").value.trim().toLocaleLowerCase("ru"),filter=status.value;
 const filtered=records.filter(r=>(filter==="all"||(filter==="active"?r.enabled:!r.enabled))&&(!query||[r.first,r.second].some(v=>v.toLocaleLowerCase("ru").includes(query)))).sort((a,b)=>tenantSortDir*String(a[tenantSortKey]).localeCompare(String(b[tenantSortKey]),"ru",{numeric:true}));
 tenantPageCount=Math.max(1,Math.ceil(filtered.length/tenantPageSize));tenantPage=Math.min(tenantPage,tenantPageCount-1);
 const visible=filtered.slice(tenantPage*tenantPageSize,(tenantPage+1)*tenantPageSize);
 if(!visible.length){const row=element("tr"),cell=element("td",query||filter!=="all"?"По вашему запросу ничего не найдено":"Нет записей","table-empty");cell.colSpan=3;row.append(cell);body.append(row);}
 for(const r of visible){const row=element("tr"),cell=tableCell("",labels[2]),pill=element("span",r.status+" (demo)","table-status-pill");pill.dataset.status=r.enabled?"active":"disabled";cell.append(pill);row.append(tableCell(r.first,labels[0]),tableCell(r.second,labels[1]),cell);body.append(row);}
 $("tenant-table-range").textContent="Показано "+visible.length+" из "+filtered.length;
 $("tenant-table-page").textContent=(tenantPage+1)+" / "+tenantPageCount;
 $("tenant-table-prev").disabled=tenantPage===0;$("tenant-table-next").disabled=tenantPage>=tenantPageCount-1;
 mobile.value=tenantSortKey+":"+tenantSortDir;
}
function provisioning(){
 const list=$("provisioning-list"),panel=$("provisioning-detail");empty(list);empty(panel);
 if(!canCompanies()||!canOperate()){restricted(list,"Provisioning доступен Owner с tenant.create, tenant.activate и правом списка компаний.");restricted(panel,"Нет доступа к C01.");return;}
 const active=ctx.companies.filter(c=>c.status==="provisioning");
 if(!active.length){list.append(alert("Компаний в provisioning среди загруженных нет."));panel.append(element("p","Нет данных для просмотра.","mp-empty"));return;}
 if(!active.some(c=>c.tenantId===chosenProvisioningId))chosenProvisioningId=active[0].tenantId;
 for(const c of active){
  const b=addButton(list,c.name+" · "+c.code,()=>{chosenProvisioningId=c.tenantId;provisioning();},"mp-record mp-record--button");
  b.setAttribute("aria-pressed",String(c.tenantId===chosenProvisioningId));
 }
 const c=active.find(x=>x.tenantId===chosenProvisioningId);
 panel.append(element("h3",c.name,"mp-section-title"),element("p","GET /companies/"+c.tenantId+"/provisioning · fixture","mp-help"));
 const dl=element("dl",undefined,"mp-description-grid");
 const evidence=[
 ["requestId","mock-c01-request-001"],["tenantId",c.tenantId],["code",c.code],["state","provisioning"],
 ["databaseName","(скрыто в публичном демо)"],["routeEnabled","false"],["routingEpoch","0"]
 ];
 for(const [l,v] of evidence)dl.append(detail(l,v));panel.append(dl);
 panel.append(element("h3","C01 receipts · read-only","mp-section-title"));
 const timeline=element("div",undefined,"mp-stack");
 for(const [step,state,description] of [["request.accepted","confirmed","Заявка зарегистрирована"],["review.approved","not_verified","Одобрение не означает создание tenant-БД"],["database.prepare","not_verified","Подготовка схемы и миграции не подтверждены"],["route.enable","not_verified","Маршрут Tenant не включён"]]){
  const r=element("div",undefined,"mp-record");r.append(element("strong",step+" · "+state),element("small",description));timeline.append(r);
 }
 panel.append(timeline);
 addButton(panel,"Открыть компанию",()=>{ctx.navigate("companies");}, "button secondary");
}
function mailOperator(){
 const root=$("email-operator-status");empty(root);
 const allowed=canReviewerAdmin();
 const status=allowed?"configured (mock)":"403: требуется platform.reviewer.bootstrap";
 for(const [k,v] of [["configured",allowed?"true (fixture)":"—"],["enabled",allowed?"true (fixture)":"—"],["transport","SMTP не проверялся"],["status",status]])root.append(detail(k,v));
 for(const id of ["email-template-link","email-template-subject","email-template-body","email-template-save"])$(id).disabled=!allowed;
 $("email-operator-check").disabled=!allowed;
 $("email-template-revision").textContent="revision: "+mailRevision+" (mock)";
}
function mail(){
 const root=$("mail-settings");empty(root);
 if(!ctx.permitted("platform.mail.diagnose")){restricted(root,"Для GET /mail/settings требуется platform.mail.diagnose (явная SQL grant), даже если Lab UI отображается.");$("mail-check").disabled=true;return;}
 const info=[["host","smtp.example.test (fixture)"],["port","587"],["encryption","starttls"],["tlsVerify","true"],["from","noreply@example.test"],["credentialsConfigured","false"]];
 info.forEach(([k,v])=>root.append(detail(k,v)));
 $("mail-check").disabled=!mailLab;
 $("mail-result").textContent=mailLab?"LAB fixture enabled · без сети":"LAB disabled · требуется явное включение";
}
function monitor(){
 const root=$("monitor-services"),summary=$("monitor-summary");empty(root);empty(summary);
 if(!canOperate()){restricted(root,"Мониторинг служб требует tenant.create и tenant.activate.");return;}
 const mode=monitorState;
 if(!mode){summary.append(kpi("Отвечают",0),kpi("Не проверено",7),kpi("Недоступно",0));root.append(alert("Нажмите «Проверить сейчас», чтобы просмотреть выбранную фикстуру."));return;}
 const counts={live:0,configured:0,unavailable:0,unknown:0};
 for(const [id,name,note] of services){
  let state=mode==="configured"?(id==="platform"||id==="platform-db"?"live":id==="central-web"?"unknown":"configured"):mode==="unavailable"?(id==="platform"?"live":"unavailable"):"unknown";
  counts[state]++;
  const card=element("article",undefined,"mp-card mp-stack");
  card.append(element("h3",name,"mp-section-title"),element("span",state==="live"?"Отвечает":state==="configured"?"Настроен":state==="unavailable"?"Недоступен":"Не проверено","mp-badge"),alert(note));
  root.append(card);
 }
 summary.append(kpi("Отвечают",counts.live),kpi("Настроены",counts.configured),kpi("Недоступны / неизвестны",counts.unavailable+counts.unknown));
}
function render(page,context){
 ctx=context;
 if(page==="overview")overview();
 if(page==="provisioning")provisioning();
 if(page==="email-operator")mailOperator();
 if(page==="mail")mail();
 if(page==="monitor")monitor();
}
// Setup: all event handlers are local mock actions, never network requests.
$("overview-tenant-select").addEventListener("change",()=>{
 overviewTenantID=$("overview-tenant-select").value;resetTenantTable();
 overview();
});
$("overview-tenant-kind").addEventListener("change",()=>{resetTenantTable();overviewTenant();});
$("tenant-table-search").addEventListener("input",()=>{tenantPage=0;overviewTenant();});
$("tenant-table-status").addEventListener("change",()=>{tenantPage=0;overviewTenant();});
$("tenant-mobile-sort").addEventListener("change",()=>{const [key,dir]=$("tenant-mobile-sort").value.split(":");tenantSortKey=key;tenantSortDir=Number(dir);tenantPage=0;overviewTenant();});
$("tenant-table-prev").addEventListener("click",()=>{if(tenantPage>0){tenantPage--;overviewTenant();}});
$("tenant-table-next").addEventListener("click",()=>{if(tenantPage<tenantPageCount-1){tenantPage++;overviewTenant();}});
$("overview-open-monitor").addEventListener("click",()=>{if(canOperate())ctx.navigate("monitor");});
$("overview-open-reviewer").addEventListener("click",()=>{if(canReviewerAdmin())ctx.navigate("reviewer");});
$("overview-open-companies").addEventListener("click",()=>{if(canCompanies())ctx.navigate("companies");});
$("overview-open-provisioning").addEventListener("click",()=>{if(canOperate())ctx.navigate("provisioning");});
$("provisioning-refresh").addEventListener("click",()=>{provisioning();ctx.feedback("Mock GET /companies?status=provisioning → 200 · read-only.");});
$("email-operator-check").addEventListener("click",()=>{mailOperator();ctx.feedback("Mock GET /reviewer/email/status → configured / enabled. SMTP не проверялся.");});
$("email-template-save").addEventListener("click",()=>{
 if(!canReviewerAdmin()){ctx.feedback("403: требуется platform.reviewer.bootstrap.",true);return;}
 const url=$("email-template-link").value;
 if(!/^https:\/\//.test(url)){ctx.feedback("HTTPS URL обязательный для шаблона.",true);return;}
 if(!$("email-template-subject").value.trim()||!$("email-template-body").value.trim()){ctx.feedback("Укажите тему и текст.",true);return;}
 mailRevision++;mailOperator();ctx.feedback("Mock POST /reviewer/email/template → 200 revision "+mailRevision+". Пароль Owner и TOTP не запрашивались; реальных изменений нет.");
});
const mailMode=document.createElement("div");mailMode.className="mp-field";
const labLabel=element("label","LAB-доступность (только сценарий)");labLabel.htmlFor="mail-lab";
const lab=element("select",undefined);lab.id="mail-lab";
for(const [value,label] of [["off","Выключен (по умолчанию)"],["on","Включить тестовые проверки"]]){const o=new Option(label,value);lab.add(o);}
mailMode.append(labLabel,lab);
$("mail-check").parentElement.parentElement.insertBefore(mailMode,$("mail-check").parentElement);
lab.addEventListener("change",()=>{mailLab=lab.value==="on";mail();});
$("mail-check").addEventListener("click",()=>{
 const action=$("mail-action").value,recipient=$("mail-recipient").value;
 const required=action==="send"?"platform.mail.test_send":"platform.mail.diagnose";
 if(!mailLab||!ctx.permitted(required)){ctx.feedback("403: для "+action+" требуется "+required+".",true);return;}
 if((action==="tls"||action==="auth")&&recipient){ctx.feedback("400: получатель для tls/auth должен быть пустым.",true);return;}
 if((action==="envelope"||action==="send")&&!["owner","reviewer"].includes(recipient)){ctx.feedback("400: для envelope/send выберите owner или reviewer.",true);return;}
 mailAttempt++;
 const outcome=action==="send"?"failed":"passed",stage=action==="send"?"unavailable":action==="auth"?"auth":action==="envelope"?"rcpt_to":"tls";
 $("mail-result").textContent="Mock HTTP 200 · status: "+outcome+" · stage: "+stage+" · request #"+mailAttempt;
 ctx.feedback("Mock POST /mail/diagnostics; реальные SMTP-пакеты не отправлялись. Получатель: "+(recipient||"не задан")+".");
});
$("monitor-scenario").addEventListener("change",()=>{monitorState=null;monitor();});
$("monitor-refresh").addEventListener("click",()=>{
 if(!canOperate()){ctx.feedback("403: нет прав мониторинга.",true);return;}
 monitorState=$("monitor-scenario").value;
 $("monitor-last").textContent=new Date().toLocaleString("ru-RU")+" · mock";
 monitor();ctx.feedback("Mock GET /system/services → 200. Это не реальный health-check.");
});
function resetFixtures(){resetTenantTable();overviewTenantID="";chosenProvisioningId=null;monitorState=null;mailLab=false;mailAttempt=0;mailRevision=1;
 $("monitor-last").textContent="Не выполнялась";
 $("mail-result").textContent="Проверка не выполнялась";
 $("mail-lab").value="off";
}
window.MPPlatformParity={render,resetFixtures};
})();
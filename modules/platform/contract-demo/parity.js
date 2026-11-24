/* Monitoring Project / VDMS Owner and Reviewer parity. UI-only, no HTTP, credentials or timers. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const element=(tag,label,cls)=>{const node=document.createElement(tag);if(label!==undefined)node.textContent=String(label);if(cls)node.className=cls;return node;};
const empty=el=>el.replaceChildren();
const addButton=(parent,label,cb,cls="mp-btn mp-btn--secondary")=>{const b=element("button",label,cls);b.type="button";b.addEventListener("click",cb);parent.append(b);return b;};
const detail=(label,value)=>{const d=document.createElement("div");d.append(element("dt",label),element("dd",value));return d;};
const restricted=(root,msg)=>{root.replaceChildren(element("p","403 · "+msg,"mp-help"));};
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
function tableCell(value,label){const td=element("td",value);td.dataset.label=label;return td;}
function overview(){
 $("overview-data-mode").value=ctx.dataMode;
 $("overview-mode-label").textContent=ctx.dataMode==="empty"?"Пустое состояние":"Демонстрационные данные";
 $("overview-kpi-source").textContent="Источник: "+ctx.companies.length+" записей текущего mock-набора";
 const root=$("overview-kpis"),body=$("overview-companies-body"),statuses=$("overview-company-statuses");
 [root,body,statuses].forEach(empty);
 const allowed=canCompanies();
 $("overview-open-companies").disabled=!allowed;
 $("overview-open-provisioning").disabled=!allowed||!canOperate();
 $("overview-open-monitor").disabled=!canOperate();
 $("overview-open-reviewer").disabled=!canReviewerAdmin();
 if(!allowed){restricted(root,"Нет права чтения компаний.");return;}
 const companies=ctx.companies;
 root.append(kpi("Компаний · загружено",companies.length),kpi("Активных · загружено",companies.filter(c=>c.status==="active").length),kpi("Provisioning · загружено",companies.filter(c=>c.status==="provisioning").length));
 for(const status of ["draft","provisioning","active","suspended","disabled"])statuses.append(element("span",status+" · "+companies.filter(c=>c.status===status).length,"mp-badge"));
 if(!companies.length){const tr=element("tr"),td=tableCell("Компаний пока нет.","Компании");td.colSpan=5;tr.append(td);body.append(tr);}
 for(const c of companies){const tr=element("tr"),last=tableCell("","Действие");addButton(last,"Открыть",()=>ctx.openOverviewCompany(c.tenantId));tr.append(tableCell(c.name,"Компания"),tableCell(c.code,"Код"),tableCell(c.status,"Статус Platform"),tableCell(c.revision,"Ревизия"),last);body.append(tr);}
}
function provisioning(){
 const list=$("provisioning-list"),panel=$("provisioning-detail");empty(list);empty(panel);
 if(!canCompanies()||!canOperate()){restricted(list,"Provisioning доступен Owner с tenant.create, tenant.activate и правом списка компаний.");restricted(panel,"Нет доступа к C01.");return;}
 const active=ctx.companies.filter(c=>c.status==="provisioning");
 if(!active.length){list.append(element("p","Компаний в provisioning среди загруженных нет.","mp-help"));panel.append(element("p","Нет данных для просмотра.","mp-empty"));return;}
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
 addButton(panel,"Открыть компанию",()=>{ctx.navigate("companies");}, "mp-btn mp-btn--secondary");
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
 if(!mode){summary.append(kpi("Отвечают",0),kpi("Не проверено",7),kpi("Недоступно",0));root.append(element("p","Нажмите «Проверить сейчас», чтобы просмотреть выбранную фикстуру.","mp-help"));return;}
 const counts={live:0,configured:0,unavailable:0,unknown:0};
 for(const [id,name,note] of services){
  let state=mode==="configured"?(id==="platform"?"live":id==="platform-db"?"configured":id==="central-web"?"unknown":"configured"):mode==="unavailable"?(id==="platform"?"live":"unavailable"):"unknown";
  counts[state]++;
  const card=element("article",undefined,"mp-card mp-stack");
  card.append(element("h3",name,"mp-section-title"),element("span",state==="live"?"Отвечает":state==="configured"?"Настроен":state==="unavailable"?"Недоступен":"Не проверено","mp-badge"),element("p",note,"mp-help"));
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
function resetFixtures(){chosenProvisioningId=null;monitorState=null;mailLab=false;mailAttempt=0;mailRevision=1;
 $("monitor-last").textContent="Не выполнялась";
 $("mail-result").textContent="Проверка не выполнялась";
 $("mail-lab").value="off";
}
window.MPPlatformParity={render,resetFixtures};
})();
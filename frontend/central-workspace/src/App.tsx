import {useEffect,useRef,useState,type FormEvent} from "react";
import {platform,PlatformApiError,type CompanyFilter,type CompanyPage,
  type CompanyProfile,type CompanyRecord,type CompanySummary,type CompanyStatus,type PlatformSelf} from "./api";
import {tr,type Language,type TranslationKey} from "./i18n";
import MailSettings from "./MailSettings";
import P4Acceptance from "./P4Acceptance";
import ActivationReviews from "./ActivationReviews";
import Reviewers from "./Reviewers";
import EmailOperator from "./EmailOperator";
import PlatformLogs from "./PlatformLogs";
import CompanyProvisioningTimeline from "./CompanyProvisioningTimeline";
import PlatformOverview from "./PlatformOverview";
import ProvisioningWorkspace from "./ProvisioningWorkspace";
import ProvisioningStatus from "./ProvisioningStatus";
import CompanyActivationReadiness from "./CompanyActivationReadiness";
import SystemMonitor from "./SystemMonitor";
const p4LabOnly = import.meta.env.VITE_C01_P4_LAB_UI === "1";
const mailLabOnly = import.meta.env.VITE_PLATFORM_MAIL_ADMIN_UI === "1";
const reviewerTabLabel: Record<Language,string> = {
  en:"Reviewers",ru:"Reviewer",el:"Reviewers",
};
const ownerLogLabel: Record<Language,string> = {
  en:"Platform logs",ru:"Логи платформы",el:"Αρχεία πλατφόρμας",
};
const reviewTabLabel: Record<Language,string> = {
  en:"Activation requests",ru:"Заявки на активацию",el:"Αιτήματα ενεργοποίησης",
};

type WorkspaceSection="overview"|"companies"|"provisioning"|"reviews"|"reviewers"|"email-operator"|"mail"|"p4"|"logs"|"system-monitor";
const navigationLabels:Record<Language,{
 management:string;operations:string;security:string;system:string;
 overview:string;companies:string;provisioning:string;reviews:string;
 reviewers:string;emailOperator:string;mail:string;logs:string;p4:string;monitor:string;
}> = {
 en:{management:"Management",operations:"Operations",security:"Security",system:"System",overview:"Overview",companies:"Companies",provisioning:"Provisioning",reviews:"Activation reviews",reviewers:"Reviewers",emailOperator:"Email operator",mail:"Mail settings",logs:"Platform logs",p4:"Local diagnostics",monitor:"Service monitor"},
 ru:{management:"Управление",operations:"Операции",security:"Безопасность",system:"Система",overview:"Обзор",companies:"Компании",provisioning:"Активация и Provisioning",reviews:"Заявки на активацию",reviewers:"Reviewer",emailOperator:"Почтовый оператор",mail:"Настройки почты",logs:"Логи платформы",p4:"Локальная диагностика",monitor:"Мониторинг служб"},
 el:{management:"Διαχείριση",operations:"Ενέργειες",security:"Ασφάλεια",system:"Σύστημα",overview:"Επισκόπηση",companies:"Εταιρείες",provisioning:"Provisioning",reviews:"Εγκρίσεις",reviewers:"Reviewers",emailOperator:"Email operator",mail:"Ρυθμίσεις mail",logs:"Καταγραφές",p4:"Διαγνωστικά",monitor:"Παρακολούθηση υπηρεσιών"},
};
type Editor={name:string}&CompanyProfile;
type Notice={key:TranslationKey;isError:boolean};
const statuses:CompanyStatus[]=["draft","provisioning","active","suspended","disabled"];
const editableFields:{key:keyof Editor;label:TranslationKey;limit:number;multiline?:boolean}[]=[
  {key:"name",label:"companyName",limit:200},
  {key:"legalName",label:"legalName",limit:300},
  {key:"tradeName",label:"tradeName",limit:200},
  {key:"description",label:"description",limit:2000,multiline:true},
  {key:"registrationNumber",label:"registrationNumber",limit:100},
  {key:"taxNumber",label:"taxNumber",limit:100},
  {key:"countryCode",label:"countryCode",limit:2},
  {key:"contactEmail",label:"contactEmail",limit:254},
  {key:"website",label:"website",limit:300},
];

const validCode=(code:string):boolean=>
  code.length>=2&&code.length<=63&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(code);
function errorKey(error:unknown):TranslationKey {
  if(error instanceof PlatformApiError){
    switch(error.status){
      case 400:return "badRequest";
      case 401:return "unauthorized";
      case 403:return "forbidden";
      case 404:return "missing";
      case 409:return "conflict";
      default:return "serverError";
    }
  }
  return "networkError";
}
const editorFrom=(record:CompanyRecord):Editor=>({name:record.name,...record.profile});
function isValidEditor(editor:Editor):boolean{
  return editor.name.trim()!==""&&editor.name.length<=200;
}

export default function App(){
  const [language,setLanguage]=useState<Language>("en");
  const t=(key:TranslationKey)=>tr(language,key);
  useEffect(()=>{document.documentElement.lang=language;},[language]);

  // A Platform access JWT lives ONLY in React state. Never persist to local
  // storage, URL, window globals, browser-readable cookies or HTML markup.
  const [access,setAccess]=useState<string|null>(null);
  const [identity,setIdentity]=useState<PlatformSelf|null>(null);
  const [working,setWorking]=useState(false);
  const locked=useRef(false);
  const [notice,setNotice]=useState<Notice|null>(null);
  const [loginName,setLoginName]=useState("");
  const [password,setPassword]=useState("");
  const [totp,setTotp]=useState("");

  const [section,setSection]=useState<WorkspaceSection>("companies");
  // Server permissions are for display only; every HTTP route still
  // independently checks the live signed identity and effective SQL grants.
  const perms=new Set(identity?.permissions??[]);
  const canCompanies=perms.has("tenant.read")||perms.has("tenant.create");
  const canCreate=perms.has("tenant.create");
  const canReviews=perms.has("tenant.provision.approve");
  const canManageReviewers=perms.has("platform.reviewer.bootstrap");
  const canMail=perms.has("platform.mail.manage")||canManageReviewers;
  const canEmailOperator=canManageReviewers;
  const canP4=canManageReviewers;
  // Navigation follows effective permissions, not a hard-coded bootstrap login.
  // Backend SQL authorization remains independent and unchanged.
  const canLogs=perms.has("tenant.create")&&perms.has("tenant.activate");
  const permittedSection=(key:typeof section):boolean=>
    key==="overview"?canCompanies:key==="companies"?canCompanies:
    key==="provisioning"?Boolean(canLogs)&&canCompanies:key==="reviews"?canReviews:
    key==="reviewers"?canManageReviewers:key==="email-operator"?canEmailOperator:
    key==="mail"?mailLabOnly&&canMail:key==="logs"?Boolean(canLogs):
    key==="system-monitor"?Boolean(canLogs):p4LabOnly&&canP4;
  useEffect(()=>{
    if(!access||!identity)return;
    if(!permittedSection(section)){
      setSection(canReviews?"reviews":canCompanies?"companies":
        canManageReviewers?"reviewers":canLogs?"logs":"companies");
    }
  },[access,identity,section]);
  const [filter,setFilter]=useState<CompanyFilter>("all");
  const [companies,setCompanies]=useState<CompanySummary[]>([]);
  const [nextCursor,setNextCursor]=useState("");
  const [selected,setSelected]=useState<CompanyRecord|null>(null);
  const [editor,setEditor]=useState<Editor|null>(null);
  const [showCreate,setShowCreate]=useState(false);
  const [newCode,setNewCode]=useState("");
  const [newName,setNewName]=useState("");
  // Keep the same requestId across network retries: never accidentally
  // double-create a Draft if HTTP response was lost after DB COMMIT.
  const pendingCreateId=useRef<string|null>(null);
  const pendingActivationId=useRef<string|null>(null);
  const [confirmActivation,setConfirmActivation]=useState(false);
  const [activationRequested,setActivationRequested]=useState(false);

  async function exclusive(action:()=>Promise<void>){
    if(locked.current)return;
    locked.current=true;
    setWorking(true);
    setNotice(null);
    try{
      await action();
    }catch(error){
      if(error instanceof PlatformApiError&&error.status===401){
        setAccess(null);
        setIdentity(null);
        setCompanies([]);
        setSelected(null);
        setEditor(null);
      }
      setNotice({key:errorKey(error),isError:true});
    }finally{
      locked.current=false;
      setWorking(false);
    }
  }

  async function getFirstPage(token:string,status:CompanyFilter){
    try{
      const page:CompanyPage=await platform.list(token,status,"",20);
      setCompanies(page.companies);
      setNextCursor(page.nextCursor);
    }catch(error){
      // A Reviewer has only tenant.provision.approve, not tenant.read.
      // Denying the company directory must not block the independent
      // activation-review tab or invalidate a successfully issued session.
      if(error instanceof PlatformApiError&&error.status===403){
        setCompanies([]);
        setNextCursor("");
        return;
      }
      throw error;
    }
  }
  function login(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!loginName.trim()||!password||!/^[0-9]{6}$/.test(totp)){
      setNotice({key:"passwordRequired",isError:true});
      return;
    }
    void exclusive(async()=>{
      await platform.login(loginName.trim(),password,totp);
      setPassword("");
      setTotp("");
      // Must be an explicit action, not a mount/useEffect request.
      // Double refresh-token use revokes the backend Platform session.
      const issued=await platform.access();
      const self=await platform.me(issued.accessToken);
      setIdentity(self);
      setSection(self.permissions.includes("tenant.provision.approve")?"reviews":"companies");
      setAccess(issued.accessToken);
      if(self.permissions.includes("tenant.read")||self.permissions.includes("tenant.create")){
        await getFirstPage(issued.accessToken,filter);
      }
      setNotice({key:"signedIn",isError:false});
    });
  }
  function continueSession(){
    void exclusive(async()=>{
      const issued=await platform.access();
      const self=await platform.me(issued.accessToken);
      setIdentity(self);
      setSection(self.permissions.includes("tenant.provision.approve")?"reviews":"companies");
      setAccess(issued.accessToken);
      if(self.permissions.includes("tenant.read")||self.permissions.includes("tenant.create")){
        await getFirstPage(issued.accessToken,filter);
      }
      setNotice({key:"signedIn",isError:false});
    });
  }
  function logout(){
    if(locked.current)return;
    locked.current=true;
    setWorking(true);
    setNotice(null);
    void (async()=>{
      let ok=false;
      try{await platform.logout();ok=true;}catch{/* Server revocation not confirmed. */}
      finally{
        // Clearing memory-only access is safe, but never pretend that a
        // failed server-side logout revoked the live Platform session.
        setAccess(null);
        setIdentity(null);
        setCompanies([]);
        setNextCursor("");
        setSelected(null);
        setEditor(null);
        setPassword("");
        setTotp("");
        setShowCreate(false);
        setSection("companies");
        setNotice({key:ok?"logoutSucceeded":"logoutUnverified",isError:!ok});
        locked.current=false;
        setWorking(false);
      }
    })();
  }
  function reload(){
    if(!access)return;
    void exclusive(async()=>{await getFirstPage(access,filter);});
  }
  function loadNext(){
    if(!access||!nextCursor)return;
    void exclusive(async()=>{
      const page=await platform.list(access,filter,nextCursor,20);
      setCompanies(current=>{
        const ids=new Set(current.map(c=>c.tenantId));
        return [...current,...page.companies.filter(c=>!ids.has(c.tenantId))];
      });
      setNextCursor(page.nextCursor);
    });
  }
  function openCompany(tenantId:string){
    if(!access)return;
    setConfirmActivation(false);
    setActivationRequested(false);
    pendingActivationId.current=null;
    void exclusive(async()=>{
      const result=await platform.get(access,tenantId);
      setActivationRequested(Boolean(result.activation));
      setSelected(result);
      setEditor(editorFrom(result));
      setShowCreate(false);
    });
  }
  function updateNewCode(value:string){setNewCode(value);pendingCreateId.current=null;}
  function updateNewName(value:string){setNewName(value);pendingCreateId.current=null;}
  function createDraft(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!access)return;
    const code=newCode.trim();
    const name=newName.trim();
    if(!validCode(code)||name.length===0||name.length>200){
      setNotice({key:"formInvalid",isError:true});
      return;
    }
    void exclusive(async()=>{
      if(!pendingCreateId.current)pendingCreateId.current=crypto.randomUUID();
      const created=await platform.create(access,pendingCreateId.current,code,name);
      // A create succeeds independently from the optional later read right.
      // List/get may fail with 403 if Platform owner is granted create only.
      pendingCreateId.current=null;
      setNewCode("");
      setNewName("");
      setShowCreate(false);
      setFilter("all");
      setSelected(null);
      setEditor(null);
      setCompanies(current=>[
        {tenantId:created.tenantId,code:created.code,name:created.name,
          status:created.status,revision:1},
        ...current.filter(c=>c.tenantId!==created.tenantId)
      ]);
      setNotice({key:"created",isError:false});
    });
  }
  function updateEditor(key:keyof Editor,value:string){
    setEditor(current=>current?{...current,[key]:value}:current);
  }
  function saveDraft(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!access||!selected||selected.status!=="draft"||!editor||!isValidEditor(editor))return;
    void exclusive(async()=>{
      const result=await platform.edit(access,selected.tenantId,{
        expectedRevision:selected.revision,...editor,
      });
      setSelected(result);
      setEditor(editorFrom(result));
      setCompanies(current=>current.map(c=>c.tenantId===result.tenantId?{
        tenantId:result.tenantId,code:result.code,name:result.name,
        status:result.status,revision:result.revision
      }:c));
      setNotice({key:"updated",isError:false});
    });
  }

  function submitActivationRequest(){
    if(!access||!selected||selected.status!=="draft"||!editor||
       JSON.stringify(editor)!==JSON.stringify(editorFrom(selected)))return;
    void exclusive(async()=>{
      if(!pendingActivationId.current)pendingActivationId.current=crypto.randomUUID();
      const result=await platform.requestActivation(
        access,selected.tenantId,pendingActivationId.current,selected.revision,
      );
      if(result.state!=="requested"||result.tenantId!==selected.tenantId){
        throw new Error("Invalid activation request response");
      }
      setActivationRequested(true);
      setSelected(current=>current&&current.tenantId===result.tenantId
        ? {...current,activation:{requestId:result.requestId,state:result.state}}
        :current);
      setConfirmActivation(false);
      setNotice({key:"activationRequested",isError:false});
    });
  }

  const isEdited=Boolean(selected&&editor&&
    JSON.stringify(editor)!==JSON.stringify(editorFrom(selected)));
  return <div className="app">
    <header className="topbar">
      <div className="brand">
        <span className="mark">V</span>
        <div><strong>VDMS</strong><small>{t("workspace")}</small></div>
      </div>
      <div className="top-actions">
        <label className="visually-hidden" htmlFor="platform-language">Language</label>
        <select id="platform-language" value={language}
          onChange={e=>setLanguage(e.target.value as Language)}>
          <option value="en">English</option>
          <option value="ru">Русский</option>
          <option value="el">Ελληνικά</option>
        </select>
        <span className={access?"connection connected":"connection"}>
          <span className="dot" />{access?(identity?.login??t("signedIn")):t("noSession")}
        </span>
        {access&&identity&&<span className="connection" title={identity.permissions.join(", ")}>
          {canReviews&&!canCompanies?"Reviewer":"Platform"}
        </span>}
        {access&&<button className="btn btn-outline" disabled={working}
          onClick={logout}>{t("signOut")}</button>}
      </div>
    </header>
    <main className="main">
      <div className="intro">
        <div>
          <div className="eyebrow">VDMS / CENTRAL-01C</div>
          <h1>{t("overview")}</h1>
          <p>{t("noSQL")}</p>
        </div>
        <span className="release">DEVELOPMENT MVP</span>
      </div>
      {notice&&<div className={notice.isError?"alert alert-error":"alert"}
        role={notice.isError?"alert":"status"}>{t(notice.key)}</div>}
      {!access?
        <div className="auth-layout">
          <section className="panel auth-panel">
            <div className="section-heading"><h2>{t("signIn")}</h2></div>
            <form onSubmit={login} className="auth-form">
              <label>{t("loginName")}
                <input value={loginName} onChange={e=>setLoginName(e.target.value)}
                  maxLength={128} autoComplete="username" required disabled={working}/>
              </label>
              <label>{t("password")}
                <input value={password} onChange={e=>setPassword(e.target.value)}
                  type="password" autoComplete="current-password" required disabled={working}/>
              </label>
              <label>{t("totp")}
                <input value={totp} onChange={e=>setTotp(e.target.value)}
                  autoComplete="one-time-code" inputMode="numeric" maxLength={6}
                  pattern="[0-9]{6}" required disabled={working}/>
              </label>
              <button type="submit" className="btn btn-primary" disabled={working}>
                {working?t("loading"):t("signIn")}
              </button>
            </form>
            <div className="auth-divider"/>
            <p className="muted">{t("sessionFailed")}</p>
            <button className="btn btn-outline" disabled={working} onClick={continueSession}>
              {t("continueSession")}
            </button>
          </section>
          <aside className="panel info-panel">
            <div className="step-number">01C</div>
            <h2>Platform Owner</h2>
            <p>{t("noSession")}</p>
            <p className="muted">{t("activationLater")}</p>
          </aside>
        </div>:
        <>
        <div className="workspace-shell">
        <nav className="workspace-sidebar" aria-label="Platform administration">
          {([
            {title:navigationLabels[language].management,items:[
              {key:"overview",label:navigationLabels[language].overview,enabled:canCompanies},
              {key:"companies",label:navigationLabels[language].companies,enabled:canCompanies},
            ]},
            {title:navigationLabels[language].operations,items:[
              {key:"provisioning",label:navigationLabels[language].provisioning,enabled:Boolean(canLogs)&&canCompanies},
              {key:"reviews",label:navigationLabels[language].reviews,enabled:canReviews},
            ]},
            {title:navigationLabels[language].security,items:[
              {key:"reviewers",label:navigationLabels[language].reviewers,enabled:canManageReviewers},
            ]},
            {title:navigationLabels[language].system,items:[
              {key:"system-monitor",label:navigationLabels[language].monitor,enabled:Boolean(canLogs)},
              {key:"email-operator",label:navigationLabels[language].emailOperator,enabled:canEmailOperator},
              {key:"mail",label:navigationLabels[language].mail,enabled:mailLabOnly&&canMail},
              {key:"logs",label:navigationLabels[language].logs,enabled:Boolean(canLogs)},
              {key:"p4",label:navigationLabels[language].p4,enabled:p4LabOnly&&canP4},
            ]}
          ] as {title:string;items:{key:WorkspaceSection;label:string;enabled:boolean}[]}[])
            .filter(group=>group.items.some(item=>item.enabled))
            .map(group=><div className="nav-group" key={group.title}>
              <div className="nav-heading"><span className="nav-heading-marker" aria-hidden="true"/>{group.title}</div>
              {group.items.filter(item=>item.enabled).map(item=>
                <button type="button" key={item.key}
                  className={"nav-item"+(section===item.key?" nav-item-active":"")}
                  aria-current={section===item.key?"page":undefined}
                  onClick={()=>setSection(item.key)}>{item.label}</button>)}
            </div>)}
        </nav>
        <div className="workspace-content">
        {!permittedSection(section)?<div className="alert alert-error">{t("forbidden")}</div>:
        p4LabOnly&&section==="p4"?
          <P4Acceptance language={language} onOpenCompanies={()=>setSection("companies")}/>:
        mailLabOnly&&section==="mail"? <MailSettings access={access} language={language}/>:
        section==="reviews"? <ActivationReviews access={access} language={language}/>:
        section==="reviewers"? <Reviewers access={access} language={language}/>:
        section==="email-operator"? <EmailOperator access={access} language={language}/>:
        section==="logs"? <PlatformLogs access={access} language={language}/>:
        section==="system-monitor"? <SystemMonitor access={access} language={language}
          onLogs={()=>setSection("logs")}/>:
        section==="overview"? <PlatformOverview language={language} companies={companies}
          onOpenCompanies={()=>setSection("companies")}
          canProvisioning={Boolean(canLogs)} onOpenProvisioning={()=>setSection("provisioning")}/>:
        section==="provisioning"? <ProvisioningWorkspace access={access} language={language}
          onOpenCompany={id=>{setSection("companies");openCompany(id);}}/>:
        <div className="workarea">
          <section className="panel company-list">
            <div className="section-heading">
              <h2>{t("companyDirectory")}</h2>
              {canCreate&&<button className="btn btn-primary" onClick={()=>{
                setShowCreate(true);setSelected(null);setEditor(null);
              }} disabled={working}>+ {t("newCompany")}</button>}
            </div>
            <div className="filter-row">
              <label>{t("filter")}
                <select value={filter} disabled={working}
                  onChange={e=>setFilter(e.target.value as CompanyFilter)}>
                  <option value="all">{t("all")}</option>
                  {statuses.map(s=><option value={s} key={s}>{t(s)}</option>)}
                </select>
              </label>
              <button className="btn btn-outline" onClick={reload} disabled={working}>
                {t("load")}
              </button>
            </div>
            <div className="records" aria-busy={working}>
              {companies.length===0&&<div className="empty">{t("empty")}</div>}
              {companies.map(company=>
                <button key={company.tenantId} className={
                  "record "+(selected?.tenantId===company.tenantId?"record-selected":"")
                } disabled={working} onClick={()=>openCompany(company.tenantId)}>
                  <div className="record-head">
                    <strong>{company.name}</strong>
                    <span className="status-chip" data-status={company.status}>{t(company.status)}</span>
                  </div>
                  <span className="record-code">{company.code}</span>
                  <span className="record-foot">{t("revision")} {company.revision} · {t("choose")}</span>
                </button>
              )}
            </div>
            {nextCursor&&<button className="btn btn-outline load-more" onClick={loadNext}
              disabled={working}>{t("next")}</button>}
          </section>
          <section className="panel company-detail">
            {showCreate?
              <>
                <div className="section-heading">
                  <h2>{t("newCompany")}</h2>
                  <button className="btn btn-outline" onClick={()=>setShowCreate(false)}
                    disabled={working}>{t("close")}</button>
                </div>
                <form className="edit-form" onSubmit={createDraft}>
                  <label>{t("companyCode")}
                    <input required value={newCode} onChange={e=>updateNewCode(e.target.value)}
                      autoComplete="off" placeholder="acme-shipping" maxLength={63} disabled={working}/>
                  </label>
                  <p className="muted">{t("codeImmutable")}</p>
                  <label>{t("companyName")}
                    <input required value={newName} onChange={e=>updateNewName(e.target.value)}
                      maxLength={200} disabled={working}/>
                  </label>
                  <div className="edit-footer">
                    <button className="btn btn-primary" disabled={working}>{t("createDraft")}</button>
                    <button type="button" className="btn btn-outline" disabled={working}
                      onClick={()=>setShowCreate(false)}>{t("cancel")}</button>
                  </div>
                  <p className="muted">{t("activationLater")}</p>
                </form>
              </>:
              selected&&editor?
                <>
                  <div className="section-heading detail-title">
                    <div>
                      <div className="eyebrow">{t("companyCard")} · {selected.code}</div>
                      <h2>{selected.name}</h2>
                      <span className="status-chip" data-status={selected.status}>{t(selected.status)}</span>
                    </div>
                    <button className="btn btn-outline" disabled={working}
                      onClick={()=>openCompany(selected.tenantId)}>{t("load")}</button>
                  </div>
                  <p className="muted">{t("revision")} {selected.revision}</p>
                  {selected.status==="draft"?
                    <form className="edit-form" onSubmit={saveDraft}>
                      <h3>{t("editProfile")}</h3>
                      <div className="fields">
                        {editableFields.map(field=><label key={field.key}
                          className={field.multiline?"wide-field":""}>
                          {t(field.label)}
                          {field.multiline?
                            <textarea rows={3} maxLength={field.limit} disabled={working}
                              value={editor[field.key]}
                              onChange={e=>updateEditor(field.key,e.target.value)}/>:
                            <input value={editor[field.key]} disabled={working}
                              maxLength={field.limit}
                              onChange={e=>updateEditor(field.key,e.target.value)}/>}
                        </label>)}
                      </div>
                      <div className="edit-footer">
                        <button type="submit" className="btn btn-primary"
                          disabled={working||!isEdited||!isValidEditor(editor)}>{t("save")}</button>
                        <span className="muted">{t("activationLater")}</span>
                      </div>
                    </form>:
                    <div className="readonly-note">{t("readOnly")}</div>}
                  {canLogs&&
                    <CompanyActivationReadiness key={selected.tenantId} access={access} company={selected} language={language}/>}
                  {canLogs&&selected.status==="provisioning"&&
                    <ProvisioningStatus access={access} language={language} tenantId={selected.tenantId}/>}
                  {canLogs&&selected.status==="provisioning"&&
                    <CompanyProvisioningTimeline access={access} language={language} code={selected.code}/>}
                  {selected.status==="draft"&&
                    <div className="activation-request-area">
                      <h3>{t("requestActivation")}</h3>
                      {selected.activation||activationRequested?
                        <p role="status">{selected.activation?.state==="approved"
                          ? (language==="ru"?"Заявка уже одобрена Reviewer. Для создания Tenant DB требуется отдельный C01 START.":language==="el"?"Η αίτηση έχει εγκριθεί. Απαιτείται ξεχωριστή εκκίνηση C01.":"Reviewer approved this request. A separate C01 START is required.")
                          : t("activationRequested")}{selected.activation
                          ? " · "+selected.activation.state+" · "+selected.activation.requestId:""}</p>:
                        confirmActivation?
                          <div>
                            <p>{t("activationConfirmNotice")}</p>
                            <div className="edit-footer">
                              <button type="button" className="btn btn-primary"
                                disabled={working||isEdited}
                                onClick={submitActivationRequest}>{t("confirmActivation")}</button>
                              <button type="button" className="btn btn-outline" disabled={working}
                                onClick={()=>setConfirmActivation(false)}>{t("cancel")}</button>
                            </div>
                          </div>:
                          <button type="button" className="btn btn-outline"
                            disabled={working||isEdited}
                            onClick={()=>setConfirmActivation(true)}>{t("requestActivation")}</button>
                      }
                      <p className="muted">{t("activationBoundary")}</p>
                    </div>}
                </>:
                <div className="detail-placeholder">
                  <div className="placeholder-icon">VDMS</div>
                  <h2>{t("companyCard")}</h2>
                  <p>{t("selectCompany")}</p>
                  <p className="muted">{t("activationLater")}</p>
                </div>
            }
          </section>
        </div>}
        </div>
        </div>
        </>
      }
    </main>
    <footer className="footer"><span>VDMS · Central Node</span><span>Development MVP · API-first</span></footer>
  </div>;
}

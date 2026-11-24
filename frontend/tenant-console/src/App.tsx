import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { tr, type TranslationKey, type UILanguage } from "./i18n";
import { api, HttpFailure, type User, type Role, type Assignment,
  type Session, type CompanyResult, type ObjectItem, type TenantLanguage, type LanguageRegistry } from "./api";

type Tab = "profile" | "security" | "roles" | "objects" | "history";
type Section = { items: User[]; roles: Role[]; assignments: Assignment[];
  company: CompanyResult | null; objects: ObjectItem[]; revision: number | null };
const empty: Section = {items: [], roles: [], assignments: [], company: null, objects: [], revision: null};
const preAuthLanguages: TenantLanguage[] = [
 {code:"en",name:"English",isPrimary:true,isEnabled:true,sortOrder:10},
 {code:"ru",name:"Russian",isPrimary:false,isEnabled:true,sortOrder:20},
 {code:"el",name:"Greek",isPrimary:false,isEnabled:true,sortOrder:30}
];
const builtInLanguageNames: Record<string,string> = {en:"English",ru:"Русский",el:"Ελληνικά"};
function validatedLanguages(reg: LanguageRegistry): TenantLanguage[] | null {
 if(!reg||!Array.isArray(reg.languages)||!reg.primary||reg.languages.length>100)return null;
 const found=new Set<string>();let primary=0;
 for(const item of reg.languages){
  if(!item||typeof item.code!=="string"||(item.code.length>10 || !/^[a-z]{2,8}(?:-[a-z0-9]{2,7})?$/i.test(item.code))||
    typeof item.name!=="string"||!item.name.trim()||item.name.length>100||
    typeof item.isPrimary!=="boolean"||typeof item.isEnabled!=="boolean"||
    typeof item.sortOrder!=="number"||found.has(item.code))return null;
  found.add(item.code);
  if(item.isPrimary){primary++;if(reg.primary!==item.code)return null;}
  if(!item.isPrimary&&!item.isEnabled)return null;
 }
 return primary===1&&found.has(reg.primary)?reg.languages:null;
}
const tabNames: {key: Tab; title: string}[] = [
  {key:"profile",title:"Профиль"}, {key:"security",title:"Безопасность"},
  {key:"roles",title:"Роли"}, {key:"objects",title:"Объекты"}, {key:"history",title:"История"}];
const roleCount = (items: Assignment[], userID: string) =>
  items.filter(a => a.userId === userID).length;
const uid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function errorText(e: unknown, lang: UILanguage) {
 if (e instanceof HttpFailure) {
   if (e.status === 401 && e.code === "account_disabled") return tr(lang,"blockedLogin");
   if (e.status === 401) return tr(lang, e.path === "/api/v1/login" ? "badLogin" : "sessionExpired");
   const key: TranslationKey | null = e.status === 403 ? "permissionDenied"
     : e.status === 409 ? "revisionConflict"
     : e.status === 400 ? "badRequest"
     : e.status === 404 ? "missing"
     : e.status === 429 ? "tooMany"
     : null;
   return key ? tr(lang,key) : tr(lang,"serverError")+" (HTTP "+e.status+")";
 }
 return e instanceof Error ? e.message : tr(lang,"unknown");
}
function Status({children, warn=false}: {children: ReactNode; warn?: boolean}) {
 return <div className={warn ? "notice warn" : "notice"} role="status">{children}</div>;
}
export default function App() {
 const [lang,setLang]=useState<UILanguage>("ru");
 const langRef=useRef(lang);
 const [tenantLanguages,setTenantLanguages]=useState<TenantLanguage[] | null>(null);
 const [languageRegistryError,setLanguageRegistryError]=useState(false);
 const t = (key:TranslationKey)=>tr(lang,key);
 useEffect(()=>{document.documentElement.lang=lang;langRef.current=lang;},[lang]);
 const [companyCode, setCompanyCode] = useState("mvp-a");
 const [login, setLogin] = useState("sec01b-writer");
 const [password, setPassword] = useState("");
 const [session, setSession] = useState<Session | null>(null);
 const [data, setData] = useState<Section>(empty);
 const [selected, setSelected] = useState<string | null>(null);
 const [tab, setTab] = useState<Tab>("profile");
 const [busy, setBusy] = useState(false);
 const [status, setStatus] = useState(tr("ru","loginNeeded"));
 const [errors, setErrors] = useState<Record<string,unknown>>({});
 const generation = useRef(0);
 const activeCompany = useRef("");
 const [createOpen, setCreateOpen] = useState(false);
 const [createLogin, setCreateLogin] = useState("");
 const [createName, setCreateName] = useState("");
 const [createPassword, setCreatePassword] = useState("");
 const [editName, setEditName] = useState("");
 const [roleEditorAllowed,setRoleEditorAllowed]=useState(false);
 const [assignRoleID,setAssignRoleID]=useState("");
 const [assignObjectID,setAssignObjectID]=useState("");
 const [assignScope,setAssignScope]=useState<"object"|"tenant">("object");
 const [scopeID, setScopeID] = useState("");
 const [scopeResult, setScopeResult] = useState<ObjectItem | null>(null);
 const [scopeError, setScopeError] = useState<null | {kind:"validation"} | {kind:"request"; error:unknown}>(null);
 const availableLanguages = session ? (tenantLanguages ?? preAuthLanguages.filter(l=>l.isPrimary)) : preAuthLanguages;
 const currentUser = data.items.find(u=>u.id===selected) ?? null;
 const complete = data.assignments.length < 100 && data.items.length < 100;
 const roleCountFor = (u: User) => roleCount(data.assignments, u.id);
 const mayModify = Boolean(currentUser && complete && roleCountFor(currentUser)===0);
 const chosenAssignments = data.assignments.filter(a=>a.userId===selected);
 const canEditAssignments = Boolean(session&&roleEditorAllowed&&complete&&data.revision!==null&&
  !errors.users&&!errors.roles&&!errors.assignments&&!errors.policy&&currentUser?.active);
 const objectSelectionValid = !errors.objects && data.objects.length<100 &&
   data.objects.some(o=>o.id===assignObjectID);

 const reset = useCallback(() => {
   generation.current++;
   setSession(null);setData(empty);setErrors({});setSelected(null);
   setTenantLanguages(null);setLanguageRegistryError(false);setRoleEditorAllowed(false);
   setAssignRoleID("");setAssignObjectID("");setAssignScope("object");
   setScopeResult(null);setScopeError(null);setCreatePassword("");setPassword("");
   setTab("profile");setBusy(false);activeCompany.current="";
 }, []);

 const load = useCallback(async(token: string) => {
   const ticket = generation.current;
   const results = await Promise.allSettled([
     api.users(token),api.roles(token),api.assignments(token),
     api.policy(token),api.company(token),api.objects(token),api.languages(token),api.assignmentCapability(token)]);
   if (generation.current !== ticket) return;
   const keys=["users","roles","assignments","policy","company","objects"];
   const warnings: Record<string,unknown>={};
   for(let i=0;i<keys.length;i++){
     const result=results[i];
     // Keep original HTTP failure and translate only when rendering. Language changes
     // must NOT replay Tenant requests or freeze the original RU message.
     if(result.status==="rejected") warnings[keys[i]]=result.reason ?? new Error("request failed");
   }
   setErrors(warnings);
   setRoleEditorAllowed(results[7].status==="fulfilled" && results[7].value.canManage===true);
   setData({
     items: results[0].status==="fulfilled" ? results[0].value.items : [],
     roles: results[1].status==="fulfilled" ? results[1].value.items : [],
     assignments: results[2].status==="fulfilled" ? results[2].value.items : [],
     revision: results[3].status==="fulfilled" ? results[3].value.revision : null,
     company: results[4].status==="fulfilled" ? results[4].value : null,
     objects: results[5].status==="fulfilled" ? results[5].value.items : []
   });
   if(results[0].status==="rejected")setSelected(null);
   const langReply=results[6];
   const registered=langReply.status==="fulfilled" ? validatedLanguages(langReply.value) : null;
   if(!registered){
    // An unavailable or malformed Tenant registry is not permission to use
    // arbitrary local UI languages after authentication: only English.
    setTenantLanguages(preAuthLanguages.filter(l=>l.isPrimary));
    setLanguageRegistryError(true);
    setLang("en");
   }else{
    setTenantLanguages(registered);
    setLanguageRegistryError(false);
    if(!registered.some(l=>l.code===langRef.current))setLang(langReply.status==="fulfilled"?langReply.value.primary:"en");
   }
 }, []);

 async function doLogin(e: FormEvent){
   e.preventDefault();
   const tenant=companyCode.trim(), username=login.trim(), secret=password;
   const old=session;
   reset();setBusy(true);setStatus(t("loginChecking"));
   if(old) {try {await api.logout(old.accessToken);} catch { /* best effort; old token discarded */ }}
   const ticket=generation.current;
   try{
     const next=await api.login({company:tenant,login:username,password:secret});
     if(generation.current!==ticket)return;
     if(!next.accessToken||!next.refreshToken||!uid.test(next.sessionId))
       throw new Error(t("sessionInvalid"));
     activeCompany.current=tenant;
     setSession(next);setStatus(t("loginSuccess")+": "+tenant+" / "+username);
     await load(next.accessToken);
   }catch(err){if(generation.current===ticket)setStatus(errorText(err,lang));}
   finally{setPassword("");if(generation.current===ticket)setBusy(false);}
 }
 async function refresh(){
   if(!session)return;
   setBusy(true);
   const ticket=generation.current;
   try{
     const next=await api.refresh(activeCompany.current,session);
     if(generation.current!==ticket)return;
     if(!next.accessToken||!next.refreshToken||next.sessionId!==session.sessionId)
       throw new Error(t("sessionInvalid"));
     setSession(next);setStatus(t("renewed"));
   }catch(err){if(generation.current===ticket)setStatus(t("renewFailed")+": "+errorText(err,lang));}
   finally{if(generation.current===ticket)setBusy(false);}
 }
 async function logout(){
   const old=session;
   reset();
   setStatus(t("logoutLocal"));
   if(old) {
     try {await api.logout(old.accessToken);setStatus(t("logoutSuccess"));}
     catch{setStatus(t("logoutUncertain"));}
   }
 }
 async function grantRole(e: FormEvent){
   e.preventDefault();
   if(!session||!currentUser||!canEditAssignments||!uid.test(assignRoleID)||
     (assignScope==="object"&&!objectSelectionValid)){setStatus(t("actionForbidden"));return;}
   const chosenRole=data.roles.find(r=>r.id===assignRoleID);
   if(!chosenRole?.active){setStatus(t("actionForbidden"));return;}
   const ticket=generation.current;
   setBusy(true);
   try {
     const expected=await api.policy(session.accessToken);
     if(generation.current!==ticket)return;
     await api.grantAssignment(session.accessToken,{
       userId:currentUser.id,roleId:assignRoleID,
       objectId:assignScope==="object"?assignObjectID:null,policyRevision:expected.revision
     });
     if(generation.current!==ticket)return;
     setStatus(t("roleGranted"));
     await load(session.accessToken);
   }catch(err){if(generation.current===ticket){setStatus(t("roleWriteError")+": "+errorText(err,lang));await load(session.accessToken);}}
   finally{if(generation.current===ticket)setBusy(false);}
 }
 async function revokeRole(a: Assignment){
   if(!session||!canEditAssignments||!currentUser||a.userId!==currentUser.id)return;
   if(!window.confirm(t("confirmRoleRevoke")))return;
   const ticket=generation.current;
   setBusy(true);
   try {
     const policy=await api.policy(session.accessToken);
     if(generation.current!==ticket)return;
     await api.revokeAssignment(session.accessToken,a.id,{policyRevision:policy.revision,assignmentRevision:a.revision});
     if(generation.current!==ticket)return;
     setStatus(t("roleRevoked"));
     await load(session.accessToken);
   }catch(err){if(generation.current===ticket){setStatus(t("roleWriteError")+": "+errorText(err,lang));await load(session.accessToken);}}
   finally{if(generation.current===ticket)setBusy(false);}
 }
 function choose(user: User){
   setSelected(user.id);setEditName(user.displayName);setTab("profile");
   setAssignRoleID("");setAssignObjectID("");setAssignScope("object");
   setScopeResult(null);setScopeError(null);
 }
 async function mutate(body:{displayName?:string;active?:boolean}){
   if(!session||!currentUser||!mayModify){setStatus(t("actionForbidden"));return}
   if(body.active===false && !window.confirm(currentUser.login+": "+t("confirmBlock")))return;
   setBusy(true);
   try {
     const policy=await api.policy(session.accessToken);
     const result=await api.updateUser(session.accessToken,currentUser.id,{
       ...body,revision:currentUser.revision,policyRevision:policy.revision});
     setStatus(result.login+": "+
       (body.active===false ? t("userBlocked")
         : body.active===true ? t("userEnabled") : t("userRenamed"))+
       " ("+t("userRevision")+": "+result.revision+")");
     setEditName(result.displayName);
     await load(session.accessToken);
   }catch(err){setStatus(t("updatedFailed")+": "+errorText(err,lang));}
   finally{setBusy(false);}
 }
 async function createUser(e: FormEvent){
   e.preventDefault();
   if(!session)return;
   setBusy(true);
   try{
     const policy=await api.policy(session.accessToken);
     const result=await api.createUser(session.accessToken,{
       login:createLogin.trim(),displayName:createName.trim(),password:createPassword,
       policyRevision:policy.revision});
     setStatus(result.login+": "+t("created"));
     setCreateOpen(false);setCreateName("");setCreateLogin("");
     await load(session.accessToken);
     setSelected(result.id);setEditName(result.displayName);setTab("profile");
   }catch(err){setStatus(t("createFailed")+": "+errorText(err,lang));}
   finally{setCreatePassword("");setBusy(false);}
 }
 async function openObject(e:FormEvent){
   e.preventDefault();
   if(!session||!uid.test(scopeID)){setScopeError({kind:"validation"});return}
   setScopeError(null);setScopeResult(null);
   try{setScopeResult(await api.objectByID(session.accessToken,scopeID))}
   catch(err){setScopeError({kind:"request",error:err});}
 }
 const assignedRoles=chosenAssignments.map(a=>({
   ...a,code:data.roles.find(r=>r.id===a.roleId)?.code ?? a.roleId
 }));
 return <div className="shell">
  <aside className="rail">
   <div className="brand"><span className="brand-mark">V</span>
    <div><strong>VDMS</strong><small>Central Node</small></div></div>
   <div className="rail-divider"/>
   <div className="rail-title">{t("platform")}</div>
   <div className="rail-item active">◉ &nbsp; {t("usersAccess")}</div>
   <div className="rail-item">◇ &nbsp; {t("universalObjects")}</div>
   <div className="rail-item">▦ &nbsp; {t("modulesNav")}</div>
   <label className="locale-select">{t("settings")}
     <select value={availableLanguages.some(l=>l.code===lang)?lang:availableLanguages[0]?.code??"en"} onChange={e=>{const next=e.target.value as UILanguage;if(!availableLanguages.some(l=>l.code===next))return;langRef.current=next;setLang(next);setStatus(session?tr(next,"loginSuccess")+": "+activeCompany.current+" / "+login:tr(next,"loginNeeded"));}} aria-label={t("settings")}>
      {availableLanguages.map(l=><option value={l.code} key={l.code}>{builtInLanguageNames[l.code]??l.name} ({l.code.toUpperCase()})</option>)}
     </select>
   </label>
   <div className="rail-bottom">SEC-01B • React/TypeScript
     <a href="/app/">{t("oldUI")}</a></div>
  </aside>
  <main className="main">
   <header className="topbar">
    <div><div className="eyebrow">CENTRAL NODE / TENANT</div>
     <h1>{t("appTitle")}</h1></div>
    <span className="environment">{t("localMvp")}</span>
   </header>
   <section className="loginbar">
    <form onSubmit={doLogin} className="login-form">
      <label>{t("company")}<input value={companyCode} onChange={e=>setCompanyCode(e.target.value)}
       maxLength={128} autoComplete="organization" required/></label>
      <label>{t("login")}<input value={login} onChange={e=>setLogin(e.target.value)}
       autoComplete="username" required/></label>
      <label>{t("password")}<input type="password" value={password}
       onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>
      <button disabled={busy} type="submit">{t("signIn")}</button>
    </form>
    <div className="login-actions"><span>{session?"● "+t("activeSession"):"○ "+t("noSession")}</span>
      <button className="ghost" disabled={!session||busy} onClick={refresh}>{t("renew")}</button>
      <button className="ghost" disabled={!session||busy} onClick={logout}>{t("logout")}</button>
      <button className="ghost" disabled={!session||busy}
       onClick={()=>void load(session!.accessToken)}>{t("reload")}</button>
    </div>
   </section>
   {session&&languageRegistryError&&<Status warn>{t("languageRegistryError")}</Status>}
   {session&&!["en","ru","el"].includes(lang)&&<Status>{t("fallbackEnglish")}</Status>}
   <Status warn={status.includes(t("badLogin"))||status.includes(t("blockedLogin"))||status.includes(t("permissionDenied"))||status.includes(t("updatedFailed"))}>{status}</Status>
   <section className="overview">
     <div><small>{t("company")}</small><strong>{data.company?.company.name??(session?activeCompany.current:"—")}</strong></div>
     <div><small>{t("users")}</small><strong>{errors.users?t("noAccess"):data.items.length}</strong></div>
     <div><small>{t("assignments")}</small><strong>{errors.assignments?t("noAccess"):data.assignments.length}</strong></div>
     <div><small>{t("policyVersion")}</small><strong>{data.revision??"—"}</strong></div>
   </section>
   <div className="columns">
    <section className="card user-list">
     <div className="card-header"><div><div className="eyebrow">{t("tenant")}</div><h2>{t("users")}</h2></div>
       <button disabled={!session||busy||Boolean(errors.users)} onClick={()=>setCreateOpen(!createOpen)}>
         {createOpen?t("close"):"+ "+t("add")}</button>
     </div>
     {createOpen&&<form onSubmit={createUser} className="create-form">
       <label>{t("login")}<input value={createLogin} onChange={e=>setCreateLogin(e.target.value)}
         minLength={3} maxLength={64} pattern="[a-z][a-z0-9._-]{2,63}" required/></label>
       <label>{t("name")}<input value={createName} onChange={e=>setCreateName(e.target.value)}
         maxLength={120} required/></label>
       <label>{t("initialPassword")}<input type="password" autoComplete="new-password" minLength={12}
         value={createPassword} onChange={e=>setCreatePassword(e.target.value)} required/></label>
       <small>{t("createNoRoles")}</small>
       <button disabled={busy||!session}>{t("createUser")}</button>
     </form>}
     {errors.users?<Status warn>{t("userListUnavailable")}: {errorText(errors.users,lang)}</Status>:
      !session?<div className="empty">{t("loginToLoad")}</div>:
      data.items.length===0?<div className="empty">{t("emptyUsers")}</div>:
      <div className="user-rows">
       {data.items.map(u=><button key={u.id} type="button" className={"user-row "+(selected===u.id?"selected":"")}
          onClick={()=>choose(u)}>
          <span className="avatar">{u.login.slice(0,2).toUpperCase()}</span>
          <span className="user-main"><strong>{u.login}</strong><small>{u.displayName}</small></span>
          <span className={"state "+(u.active?"on":"off")}>{u.active?t("active"):t("disabledShort")}</span>
          <span className="roles-count">{complete?roleCountFor(u):"≥"+roleCountFor(u)} {t("roleAbbr")}</span>
         </button>)}
      </div>}
     {session&&data.items.length>=100&&<small className="footnote">{t("usersPartial")}</small>}
    </section>
    <section className="card detail">
     {!currentUser?<div className="empty large">{t("selectUser")}</div>:
     <>
      <div className="profile-head"><span className="profile-icon">{currentUser.login.slice(0,2).toUpperCase()}</span>
       <div><div className="eyebrow">{t("userCard")}</div><h2>{currentUser.displayName}</h2>
       <div className="sub">{currentUser.login} · <span className={currentUser.active?"green":"red"}>
       {currentUser.active?t("active"):t("blocked")}</span></div></div></div>
      <div className="tabs" role="tablist" aria-label={t("userCard")}>
       {tabNames.map(entry=><button role="tab" aria-selected={tab===entry.key}
         className={tab===entry.key?"tab selected":"tab"} key={entry.key} onClick={()=>setTab(entry.key)}>{t(entry.key)}</button>)}
      </div>
      <div className="tab-body">
       {tab==="profile"&&<div className="stack">
         <h3>{t("primaryDetails")}</h3>
         <div className="field-grid">
          <div><small>UUID</small><div className="mono tiny">{currentUser.id}</div></div>
          <div><small>{t("login")}</small><div>{currentUser.login}</div></div>
          <div><small>{t("userRevision")}</small><div>{currentUser.revision}</div></div>
          <div><small>{t("assignedRoles")}</small><div>{roleCountFor(currentUser)}</div></div>
         </div>
         <label>{t("displayName")}
          <input value={editName} onChange={e=>setEditName(e.target.value)}
           disabled={!mayModify||busy} maxLength={120}/>
         </label>
         <button className="primary-action" disabled={!mayModify||busy||!editName.trim()||editName.trim()===currentUser.displayName}
          onClick={()=>void mutate({displayName:editName.trim()})}>{t("saveName")}</button>
         {!mayModify&&<Status warn>{t("currentlyRoleless")}</Status>}
        </div>}
       {tab==="security"&&<div className="stack">
         <h3>{t("securityHeading")}</h3>
         <div className="field-grid">
           <div><small>{t("status")}</small><div>{currentUser.active?t("accessAllowed"):t("blocked")}</div></div>
           <div><small>{t("currentRevision")}</small><div>{currentUser.revision}</div></div>
         </div>
         <p>{t("userBlocked")} {t("userEnabled")}</p>
         <button className={currentUser.active?"danger":"primary-action"}
          disabled={!mayModify||busy} onClick={()=>void mutate({active:!currentUser.active})}>
          {currentUser.active?t("blockUser"):t("unblockUser")}</button>
         {!mayModify&&<Status warn>{t("securityRoleless")}</Status>}
         <div className="placeholder">{t("securityPending")}</div>
        </div>}
       {tab==="roles"&&<div className="stack">
         <h3>{t("roleHeading")}</h3>
         {errors.assignments?<Status warn>{errorText(errors.assignments,lang)}</Status>:
          assignedRoles.length===0?<div className="placeholder">{t("noRoles")}</div>:
          assignedRoles.map(a=><div className="role-line" key={a.id}>
           <strong>{a.code}</strong>
           <small>{a.objectId ? (a.objectCode??a.objectId)+" · "+a.objectId : t("wholeCompany")}</small>
           {canEditAssignments&&<button type="button" className="danger" disabled={busy} onClick={()=>void revokeRole(a)}>{t("revokeRole")}</button>}
          </div>)}
         {canEditAssignments?<form className="create-form role-grant" onSubmit={grantRole}>
           <h3>{t("grantRole")}</h3>
           <label>{t("roleCatalog")}
             <select value={assignRoleID} onChange={e=>setAssignRoleID(e.target.value)} required>
               <option value="">{t("selectRole")}</option>
               {data.roles.filter(r=>r.active).map(r=><option key={r.id} value={r.id}>{r.description||r.code} ({r.code})</option>)}
             </select>
           </label>
           <label>{t("assignmentScope")}
             <select value={assignScope} onChange={e=>setAssignScope(e.target.value as "object"|"tenant")}>
               <option value="object">{t("singleObject")}</option>
               <option value="tenant">{t("wholeCompany")}</option>
             </select>
           </label>
           {assignScope==="object"&&<label>{t("selectObject")}
             <select value={assignObjectID} onChange={e=>setAssignObjectID(e.target.value)} required>
               <option value="">{t("selectObjectPlaceholder")}</option>
               {data.objects.map(o=><option key={o.id} value={o.id}>{o.code}</option>)}
             </select>
           </label>}
           {assignScope==="object"&&data.objects.length>=100&&<small>{t("objectsPartialGrant")}</small>}
           {assignScope==="object"&&Boolean(errors.objects)&&<Status warn>{t("objectListRequired")}</Status>}
           <small>{t("scopeExactHint")}</small>
           <button disabled={busy||!assignRoleID||(assignScope==="object"&&!objectSelectionValid)}>{t("grantRole")}</button>
         </form>:<div className="placeholder">{t("rolesPending")}</div>}
         <h3>{t("roleCatalog")}</h3>
         {errors.roles?<Status warn>{errorText(errors.roles,lang)}</Status>:
          <div className="chips">{data.roles.map(r=><span className="chip" key={r.id}>{r.code}</span>)}</div>}
        </div>}
       {tab==="objects"&&<div className="stack">
         <h3>{t("objectAccess")}</h3>
         {assignedRoles.filter(a=>a.objectId).length===0?
          <div className="placeholder">{t("noObjectAssignments")}</div>:
          assignedRoles.filter(a=>a.objectId).map(a=><div className="role-line" key={a.id}>
            <strong>{a.objectCode??a.objectId}</strong><small>{t("roles")}: {a.code} · UUID: {a.objectId}</small></div>)}
         <h3>{t("objectLookup")}</h3>
         <form className="search-form" onSubmit={openObject}>
           <input value={scopeID} placeholder={t("objectUUID")} onChange={e=>setScopeID(e.target.value)}/>
           <button disabled={!session}>{t("get")}</button>
         </form>
         {scopeError&&<Status warn>{scopeError.kind==="validation"?t("objectUUIDRequired"):errorText(scopeError.error,lang)}</Status>}
         {scopeResult&&<div className="role-line"><strong>{scopeResult.code}</strong><small>{scopeResult.id}</small></div>}
         {errors.objects?<small>{t("noAccess")}: {errorText(errors.objects,lang)}.</small>:
           <small>{t("visibleObjects")}: {data.objects.length} (100 max)</small>}
        </div>}
       {tab==="history"&&<div className="stack">
         <h3>{t("readHistory")}</h3>
         <div className="placeholder">{t("historyPending")}</div>
         <p>{t("historyPlan")}</p>
        </div>}
      </div>
     </>}
    </section>
   </div>
   <section className="card lower">
    <div className="card-header"><div><div className="eyebrow">CENTRAL NODE</div><h2>{t("companyModules")}</h2></div></div>
    {errors.company?<Status warn>{t("accessError")}: {errorText(errors.company,lang)}</Status>:
     data.company?<div className="company-summary">
      <div><small>{t("company")}</small><strong>{data.company.company.name}</strong></div>
      <div><small>Code</small><strong>{data.company.company.code}</strong></div>
      <div><small>{t("modules")}</small><strong>{data.company.modules.length}</strong></div></div>:
      <div className="empty">{t("noAccess")}</div>}
    {data.company&&<div className="modules">
      {data.company.modules.map(m=><div className="module-row" key={m.code}>
       <strong>{lang==="ru" ? (m.nameRu||m.nameEn) : m.nameEn}</strong><span>{m.code}</span>
       <small>{m.status==="available"&&m.enabled?t("active"):m.status==="planned"?t("development"):t("unavailable")}</small></div>)}
     </div>}
   </section>
   <footer>VDMS · Central Node · Tenant Security · C01 &nbsp;|&nbsp;
    <a href="/app/">{t("oldUI")}</a> &nbsp;|&nbsp; {t("localFoot")}</footer>
  </main>
 </div>;
}

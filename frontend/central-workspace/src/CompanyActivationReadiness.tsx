import {useEffect,useRef,useState,type FormEvent} from "react";
import {platform,PlatformApiError,type CompanyRecord} from "./api";
import type {Language} from "./i18n";

// Live existing C01 START in the disposable platform_db_test only. The server
// performs fresh Owner MFA and authorization. Never persist password/TOTP or
// automatically resend a request after an uncertain response.
const labels={
 en:{title:"Activation and C01 readiness",approval:"Activation approval",revision:"Draft revision",
 request:"Provisioning request",none:"No registered C01 request (API 404)",exists:"C01 request registered",
 checking:"Checking C01 registry...",error:"Cannot verify C01 request state",
 approved:"Approved by Reviewer",pending:"Not approved",refresh:"Refresh",
 start:"Start C01 provisioning",confirm:"Confirm one-time C01 START",password:"Owner password",totp:"Fresh TOTP (6 digits)",
 accepted:"C01 START accepted (HTTP 202). Database creation and READY are not yet confirmed.",
 unknown:"C01 START outcome uncertain. DO NOT retry; reconcile durable records and physical Tenant DB first.",
 cancel:"Cancel",busy:"Submitting once...",
 safe:"C01 START is irreversible. Never repeat after an error/timeout without reconciling persisted claims and Tenant DB. Approval alone does not create a database."},
 ru:{title:"Одобрение и готовность C01",approval:"Согласование активации",revision:"Ревизия Draft",
 request:"Запрос Provisioning",none:"Не зарегистрирован (C01 API: 404)",exists:"Запрос C01 зарегистрирован",
 checking:"Проверка реестра C01...",error:"Не удалось проверить состояние C01",
 approved:"Одобрено Reviewer",pending:"Не одобрено",refresh:"Обновить",
 start:"Запустить Provisioning (C01 START)",confirm:"Подтвердить однократный запуск C01",
 password:"Пароль Platform Owner",totp:"Новый код TOTP (6 цифр)",
 accepted:"C01 START принят (HTTP 202). Создание Tenant DB и READY ещё не подтверждены.",
 unknown:"Результат C01 START неизвестен. НЕ повторять! Сначала сверить журналы Platform и физическую Tenant DB.",
 cancel:"Отмена",busy:"Однократная отправка...",
 safe:"C01 START необратим. После ошибки/тайм-аута повтор запрещён до сверки сохранённых данных и Tenant DB. Одобрение само по себе не создаёт базу."},
 el:{title:"Έγκριση και ετοιμότητα C01",approval:"Έγκριση ενεργοποίησης",revision:"Αναθεώρηση Draft",
 request:"Αίτημα Provisioning",none:"Δεν καταχωρήθηκε (C01 API: 404)",exists:"Το αίτημα C01 καταχωρήθηκε",
 checking:"Έλεγχος C01...",error:"Αδυναμία ελέγχου C01",
 approved:"Εγκρίθηκε",pending:"Δεν εγκρίθηκε",refresh:"Ανανέωση",
 start:"Έναρξη C01",confirm:"Επιβεβαίωση μίας εκκίνησης C01",password:"Κωδικός Owner",
 totp:"Νέο TOTP (6 ψηφία)",
 accepted:"Η εντολή C01 έγινε δεκτή (HTTP 202), όχι ακόμη READY.",
 unknown:"Άγνωστο αποτέλεσμα START. Μην επαναλάβετε πριν από τον έλεγχο.",
 cancel:"Ακύρωση",busy:"Αποστολή...",
 safe:"Μην επαναλάβετε το C01 START χωρίς συμφωνία των αποθηκευμένων στοιχείων."}
} as const;

export default function CompanyActivationReadiness({access,company,language}:{
 access:string;company:CompanyRecord;language:Language;
}){
 const t=labels[language];
 const [state,setState]=useState<"loading"|"absent"|"present"|"error">("loading");
 const [detail,setDetail]=useState("");
 const [refresh,setRefresh]=useState(0);
 const [confirm,setConfirm]=useState(false);
 const [ownerPassword,setOwnerPassword]=useState("");
 const [totp,setTotp]=useState("");
 const [submitted,setSubmitted]=useState(false);
 const [outcome,setOutcome]=useState<"accepted"|"unknown"|null>(null);
 const once=useRef(false);
 useEffect(()=>{
  let active=true;
  setState("loading");setDetail("");
  void platform.c01Status(access,company.tenantId).then(status=>{
   if(!active)return;
   setDetail(status.state);
   setState("present");
  }).catch(e=>{
   if(!active)return;
   setState(e instanceof PlatformApiError&&e.status===404?"absent":"error");
  });
  return ()=>{active=false};
 },[access,company.tenantId,refresh]);
 // The component is keyed by the selected company. Changing the company
 // unmounts its form, so credentials and local uncertainty cannot bleed over.
 const approved=company.activation?.state==="approved";
 const canStart=approved&&state==="absent"&&!submitted&&!once.current;
 const submit=(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(!canStart||!confirm||ownerPassword.length<12||!/^[0-9]{6}$/.test(totp))return;
  // Synchronize the one-shot latch before any awaited network request.
  once.current=true;setSubmitted(true);setConfirm(false);setOutcome(null);
  const password=ownerPassword;
  const code=totp;
  setOwnerPassword("");setTotp("");
  void platform.c01Start(access,company.tenantId,company.activation!.requestId,password,code)
   .then(receipt=>{
    if(receipt.requestId!==company.activation!.requestId ||
      receipt.tenantId!==company.tenantId||receipt.state!=="accepted"){
     setOutcome("unknown");return;
    }
    setOutcome("accepted");
    setRefresh(v=>v+1);
   }).catch(()=>{
    setOutcome("unknown");
    setRefresh(v=>v+1);
   });
 };
 return <section className="activation-request-area" aria-label={t.title}>
  <div className="section-heading">
   <h3>{t.title}</h3>
   <button type="button" className="btn btn-outline" onClick={()=>setRefresh(v=>v+1)}
    disabled={state==="loading"}>{t.refresh}</button>
  </div>
  <dl className="provisioning-facts">
   <div><dt>{t.approval}</dt><dd>{approved?t.approved:(company.activation?.state??t.pending)}</dd></div>
   <div><dt>{t.revision}</dt><dd>{company.revision}</dd></div>
   <div><dt>{t.request}</dt>
    <dd role="status">{state==="loading"?t.checking:state==="absent"?t.none:
      state==="present"?t.exists+" ("+detail+")":t.error}</dd></div>
  </dl>
  {outcome&&<p role="alert">{outcome==="accepted"?t.accepted:t.unknown}</p>}
  {submitted&&!outcome&&<p role="status">{t.busy}</p>}
  {canStart&&!confirm&&<button type="button" className="btn btn-primary"
    onClick={()=>setConfirm(true)}>{t.start}</button>}
  {canStart&&confirm&&<form className="auth-form" onSubmit={submit}>
    <p>{t.confirm}</p>
    <label>{t.password}
      <input type="password" value={ownerPassword} autoComplete="new-password" minLength={12}
       onChange={e=>setOwnerPassword(e.target.value)} required/>
    </label>
    <label>{t.totp}
      <input value={totp} inputMode="numeric" autoComplete="off" pattern="[0-9]{6}"
       maxLength={6} onChange={e=>setTotp(e.target.value)} required/>
    </label>
    <div className="edit-footer">
      <button type="submit" className="btn btn-primary"
       disabled={ownerPassword.length<12||!/^[0-9]{6}$/.test(totp)}>{t.confirm}</button>
      <button type="button" className="btn btn-outline"
       onClick={()=>{setConfirm(false);setOwnerPassword("");setTotp("");}}>{t.cancel}</button>
    </div>
  </form>}
  <p className="muted">{t.safe}</p>
 </section>;
}

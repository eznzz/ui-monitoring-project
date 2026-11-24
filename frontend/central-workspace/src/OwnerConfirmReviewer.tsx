import {useRef,useState,type FormEvent} from "react";
import {platform,type ReviewerOwnerConfirmationStatus} from "./api";
import type {Language} from "./i18n";

const i18n={
 en:{title:"Confirm accepted Reviewer",look:"Check confirmation state",
  pending:"Reviewer enrolled. Owner approval is still required.",
  confirmed:"Reviewer confirmed. Permission: tenant.provision.approve.",
  unavailable:"Confirmation service is not enabled or unavailable.",
  password:"Fresh Platform Owner password",totp:"New Owner TOTP (6 digits)",
  confirm:"I approve this already enrolled Reviewer and grant only tenant.provision.approve.",
  submit:"Confirm Reviewer",busy:"Confirming…",
  succeeded:"Owner confirmation completed. Check current state.",
  unknown:"Confirmation result is unknown. Check state before attempting anything else.",
  warning:"Do not reuse an MFA code from invitation or email settings."},
 ru:{title:"Подтверждение принятого Reviewer",look:"Проверить подтверждение",
  pending:"Reviewer зарегистрирован, требуется подтверждение владельцем.",
  confirmed:"Reviewer подтверждён. Право: tenant.provision.approve.",
  unavailable:"Сервис подтверждения не подключён или недоступен.",
  password:"Пароль Platform Owner",totp:"Новый TOTP владельца (6 цифр)",
  confirm:"Подтверждаю этого Reviewer и выдачу только права tenant.provision.approve.",
  submit:"Подтвердить Reviewer",busy:"Подтверждение…",
  succeeded:"Подтверждение выполнено. Проверь текущее состояние.",
  unknown:"Результат неизвестен. Сначала проверь состояние, не повторяй запрос.",
  warning:"Не используй MFA-код от предыдущих операций."},
 el:{title:"Confirm accepted Reviewer",look:"Check confirmation",
  pending:"Enrollment completed. Owner approval required.",
  confirmed:"Reviewer confirmed: tenant.provision.approve",
  unavailable:"Confirmation unavailable.",
  password:"Owner password",totp:"Fresh Owner TOTP",
  confirm:"I approve this Reviewer with only tenant.provision.approve.",
  submit:"Confirm Reviewer",busy:"Confirming…",
  succeeded:"Confirmed. Check state.",unknown:"Unknown result. Check status first.",
  warning:"Use a fresh MFA code."}
} as const;

export default function OwnerConfirmReviewer({
 access,requestId,language,
}:{access:string;requestId:string;language:Language}){
 const t=i18n[language];
 const [state,setState]=useState<ReviewerOwnerConfirmationStatus|null>(null);
 const [password,setPassword]=useState("");
 const [totp,setTotp]=useState("");
 const [approved,setApproved]=useState(false);
 const [notice,setNotice]=useState<"succeeded"|"unknown"|"unavailable"|null>(null);
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const confirmationRef=useRef<string|null>(null);
 async function check(){
  if(busyRef.current)return;
  busyRef.current=true;setBusy(true);setNotice(null);
  try{
   const result=await platform.reviewerOwnerConfirmationStatus(access,requestId);
   if(result.requestId!==requestId||
     (result.state!=="pending"&&result.state!=="confirmed"))
    throw new Error("Invalid confirmation result");
   setState(result);
   // A pending state after an ambiguous write is not proof that retrying
   // the same operation is safe. Force a fresh explicit user action.
  }catch{setState(null);setNotice("unavailable");}
  finally{busyRef.current=false;setBusy(false);}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busyRef.current||state?.state!=="pending"||!approved||
   password.length<12||!/^[0-9]{6}$/.test(totp))return;
  busyRef.current=true;setBusy(true);setNotice(null);
  if(!confirmationRef.current)confirmationRef.current=crypto.randomUUID();
  try{
   const result=await platform.confirmReviewerOwner(
    access,requestId,confirmationRef.current,password,totp);
   if(result.confirmationId!==confirmationRef.current||result.state!=="confirmed")
    throw new Error("Unexpected confirmation result");
   setState({requestId,state:"confirmed"});
   setNotice("succeeded");
  }catch{
   setState(null);
   setNotice("unknown");
  }finally{
   setPassword("");setTotp("");setApproved(false);busyRef.current=false;
   setBusy(false);
  }
 }
 return <section className="edit-form">
  <h3>{t.title}</h3>
  <p className="muted">{t.warning}</p>
  <button type="button" className="btn btn-outline" disabled={busy}
   onClick={()=>void check()}>{t.look}</button>
  {state&&<p role="status">{state.state==="confirmed"?t.confirmed:t.pending}</p>}
  {state?.state==="pending"&&<form className="edit-form"
   autoComplete="off" onSubmit={e=>void submit(e)}>
   <label>{t.password}<input type="password" value={password}
    disabled={busy} maxLength={1024} autoComplete="off"
    onChange={e=>setPassword(e.target.value)}/></label>
   <label>{t.totp}<input inputMode="numeric" autoComplete="one-time-code"
    pattern="[0-9]{6}" maxLength={6} value={totp}
    disabled={busy} onChange={e=>setTotp(e.target.value)}/></label>
   <label><input type="checkbox" checked={approved} disabled={busy}
    onChange={e=>setApproved(e.target.checked)}/>{t.confirm}</label>
   <button type="submit" className="btn btn-primary"
    disabled={busy||!approved||password.length<12||!/^[0-9]{6}$/.test(totp)}>
    {busy?t.busy:t.submit}
   </button>
  </form>}
  {notice&&<p role={notice==="succeeded"?"status":"alert"}>{t[notice]}</p>}
 </section>;
}

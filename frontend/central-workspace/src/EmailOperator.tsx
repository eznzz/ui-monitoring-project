import {useState, type FormEvent} from "react";
import {platform, type ReviewerEmailOperatorStatus} from "./api";
import type {Language} from "./i18n";
import ReviewerEmailTemplateSettings from "./ReviewerEmailTemplateSettings";

const copy={
 en:{title:"Email Operator",intro:"Reviewer invitation mail settings",inspect:"Check operator status",
 checking:"Checking…",offline:"Operator not enabled",missing:"Operator online; SMTP password not configured",
 ready:"SMTP credential configured",unavailable:"Unable to verify the operator. No email was sent.",
 transport:"SMTP TLS server",sender:"Sender",recipient:"Invitation recipient",
 smtpPassword:"New SMTP password",ownerPassword:"Platform Owner password",totp:"Fresh Owner TOTP",
 save:"Save SMTP password",saving:"Saving…",saved:"SMTP password saved. No email was sent.",
 saveFailed:"SMTP password was not confirmed saved. No email was sent.",
 note:"Saving requires Owner password and a fresh one-time code. No test email is sent."},
 ru:{title:"Email Operator",intro:"Настройки доставки приглашений Reviewer",inspect:"Проверить состояние оператора",
 checking:"Проверка…",offline:"Оператор не подключён",missing:"Оператор работает; SMTP-пароль не настроен",
 ready:"SMTP-пароль настроен",unavailable:"Не удалось проверить оператор. Письмо не отправлялось.",
 transport:"SMTP-сервер (TLS)",sender:"Отправитель",recipient:"Получатель приглашения",
 smtpPassword:"Новый SMTP-пароль",ownerPassword:"Пароль Platform Owner",totp:"Свежий код TOTP владельца",
 save:"Сохранить SMTP-пароль",saving:"Сохранение…",saved:"SMTP-пароль сохранён. Письмо не отправлялось.",
 saveFailed:"Не удалось подтвердить сохранение SMTP-пароля. Письмо не отправлялось.",
 note:"Для сохранения требуются пароль владельца и свежий одноразовый код. Тестовое письмо не отправляется."},
 el:{title:"Email Operator",intro:"Ρυθμίσεις προσκλήσεων Reviewer",inspect:"Έλεγχος κατάστασης",
 checking:"Έλεγχος…",offline:"Ο operator δεν έχει συνδεθεί",missing:"Operator online, SMTP password missing",
 ready:"SMTP credentials configured",unavailable:"Δεν ήταν δυνατός ο έλεγχος. Δεν εστάλη email.",
 transport:"SMTP TLS",sender:"Αποστολέας",recipient:"Παραλήπτης",
 smtpPassword:"New SMTP password",ownerPassword:"Platform Owner password",totp:"Fresh Owner TOTP",
 save:"Save SMTP password",saving:"Saving…",saved:"SMTP password saved. No email was sent.",
 saveFailed:"SMTP password was not confirmed saved. No email was sent.",
 note:"Owner password and a fresh one-time code are required. No test email is sent."},
} as const;

export default function EmailOperator({access,language}:{access:string;language:Language}){
 const t=copy[language];
 const [status,setStatus]=useState<ReviewerEmailOperatorStatus|null>(null);
 const [busy,setBusy]=useState(false);
 const [saving,setSaving]=useState(false);
 const [failed,setFailed]=useState(false);
 const [saveResult,setSaveResult]=useState<"saved"|"failed"|null>(null);
 const [smtpPassword,setSMTPPassword]=useState("");
 const [ownerPassword,setOwnerPassword]=useState("");
 const [totp,setTotp]=useState("");

 async function check(){
  if(busy||saving)return;
  setBusy(true);setFailed(false);setStatus(null);setSaveResult(null);
  try{
   const result=await platform.reviewerEmailStatus(access);
   if(typeof result.enabled!=="boolean"||typeof result.configured!=="boolean"){
    throw new Error("Invalid operator response");
   }
   setStatus(result);
  }catch{setFailed(true)}
  finally{setBusy(false)}
 }

 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(saving||busy||!status?.enabled||!smtpPassword||ownerPassword.length<12||
     !/^\d{6}$/.test(totp))return;
  setSaving(true);setSaveResult(null);
  try {
   const saved=await platform.reviewerEmailPasswordSave(access,smtpPassword,ownerPassword,totp);
   if(saved.saved!==true)throw new Error("Invalid operator response");
   setSaveResult("saved");
   setStatus({...status,configured:true});
  }catch {
   setSaveResult("failed");
   // An unknown transport result is not permission to retry automatically.
   setStatus(null);
  }finally{
   setSMTPPassword("");setOwnerPassword("");setTotp("");
   setSaving(false);
  }
 }

 return <section className="panel mail-admin-panel" aria-busy={busy||saving}>
  <div className="section-heading">
   <div><div className="eyebrow">VDMS / PLATFORM / EMAIL OPERATOR</div>
    <h2>{t.title}</h2><p className="muted">{t.intro}</p></div>
   <button type="button" className="btn btn-outline" disabled={busy||saving}
    onClick={()=>void check()}>{busy?t.checking:t.inspect}</button>
  </div>
  {failed&&<p role="alert">{t.unavailable}</p>}
  {status&&<p role="status"><strong>{
   !status.enabled?t.offline:status.configured?t.ready:t.missing
  }</strong></p>}
  {status?.enabled&&status.transport&&<div className="mail-admin-details">
   <div><span className="mail-admin-label">{t.transport}</span>
    <strong>{status.transport.host}:{status.transport.port} · {status.transport.encryption.toUpperCase()}</strong></div>
   <div><span className="mail-admin-label">{t.sender}</span>
    <strong>{status.transport.sender}</strong></div>
   <div><span className="mail-admin-label">{t.recipient}</span>
    <strong>{status.transport.invitationRecipient}</strong></div>
  </div>}
  {status?.enabled&&<form onSubmit={event=>void save(event)} autoComplete="off">
   <label>{t.smtpPassword}
    <input type="password" autoComplete="new-password" value={smtpPassword}
     onChange={e=>setSMTPPassword(e.target.value)} maxLength={4096} required disabled={saving||busy}/>
   </label>
   <label>{t.ownerPassword}
    <input type="password" autoComplete="off" value={ownerPassword}
     onChange={e=>setOwnerPassword(e.target.value)} maxLength={1024} required disabled={saving||busy}/>
   </label>
   <label>{t.totp}
    <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
     autoComplete="one-time-code" value={totp} onChange={e=>setTotp(e.target.value)}
     required disabled={saving||busy}/>
   </label>
   <button type="submit" className="btn" disabled={saving||busy||!smtpPassword||
    ownerPassword.length<12||!/^\d{6}$/.test(totp)}>{saving?t.saving:t.save}</button>
  </form>}
  {saveResult&&<p role={saveResult==="failed"?"alert":"status"}>
   {saveResult==="saved"?t.saved:t.saveFailed}</p>}
  <p className="muted">{t.note}</p>
  <ReviewerEmailTemplateSettings access={access} language={language}
   enabled={status?.enabled===true}/>
 </section>;
}

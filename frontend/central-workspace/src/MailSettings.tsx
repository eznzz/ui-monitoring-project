import {useRef,useState} from "react";
import {platform,PlatformApiError,type MailOperation,type MailRecipient,
  type PlatformMailResult,type PlatformMailSettings} from "./api";
import type {Language} from "./i18n";

const messages={
 en:{
  title:"Mail server",summary:"Protected Platform SMTP diagnostics",
  warning:"Server-managed credentials only. Every diagnostic requires a separately verified one-time password + MFA authorization; ordinary login alone is insufficient.",
  load:"Load approved settings",unavailable:"Not connected or not authorized",
  configured:"Credential configured on operator",missing:"SMTP credential is not configured",
  sender:"Sender",transport:"Transport",receivers:"Allowed test recipients",
  altTransport:"STARTTLS backup port",imap:"IMAP SSL/TLS port",verify:"Certificate verification",
  operation:"Operation",recipient:"Recipient",tls:"Check TLS certificate",
  auth:"Check SMTP authorization",envelope:"Check sender and recipient (no message)",
  send:"Send one test message",owner:"Platform Owner",reviewer:"Platform Reviewer",
  none:"No recipient needed",execute:"Run selected check",
  proofPassword:"Platform account password",proofTotp:"Current 6-digit authenticator code",proofHint:"A new MFA code is required for each action.",
  confirm:"I understand this will send one harmless test email to the selected recipient.",
  noSecrets:"Only the Platform step-up password and MFA code are submitted once over same-origin HTTPS; the SMTP password remains server-only.",
  passed:"Check completed",failed:"Check failed",denied:"Request denied or protected API unavailable",
  status:"Result",stage:"Step",pending:"No diagnostics requested yet",
  working:"Checking…",refresh:"Refresh settings",
 },
 ru:{
  title:"Почтовый сервер",summary:"Защищённая SMTP-диагностика платформы",
  warning:"Учётные данные хранятся только на сервере. Каждое действие требует отдельного одноразового подтверждения паролем и MFA; обычного входа недостаточно.",
  load:"Загрузить настройки",unavailable:"API не подключён либо недостаточно прав",
  configured:"SMTP-учётная запись настроена у оператора",missing:"SMTP-учётная запись пока не настроена",
  sender:"Отправитель",transport:"Подключение",receivers:"Разрешённые тестовые получатели",
  altTransport:"Резервный порт STARTTLS",imap:"Порт IMAP SSL/TLS",verify:"Проверка сертификата",
  operation:"Операция",recipient:"Получатель",tls:"Проверка TLS-сертификата",
  auth:"Проверка авторизации SMTP",envelope:"Проверка отправителя и получателя (без письма)",
  send:"Отправить одно тестовое письмо",owner:"Platform Owner",reviewer:"Platform Reviewer",
  none:"Получатель не требуется",execute:"Выполнить проверку",
  proofPassword:"Пароль учётной записи Platform",proofTotp:"Текущий 6-значный код MFA",proofHint:"Для каждого действия требуется новый код MFA.",
  confirm:"Подтверждаю отправку одного безвредного тестового письма выбранному получателю.",
  noSecrets:"В браузере вводятся только пароль Platform и код MFA для повторной проверки. Пароль SMTP остаётся исключительно на сервере.",
  passed:"Проверка выполнена",failed:"Проверка не прошла",denied:"Запрос отклонён или защищённый API недоступен",
  status:"Результат",stage:"Этап",pending:"Проверки ещё не запускались",
  working:"Проверка…",refresh:"Обновить настройки",
 },
 el:{
  title:"Διακομιστής email",summary:"Ασφαλείς διαγνωστικοί έλεγχοι SMTP της πλατφόρμας",
  warning:"Τα διαπιστευτήρια διατηρούνται στον διακομιστή. Κάθε ενέργεια απαιτεί ανεξάρτητη, εφάπαξ επιβεβαίωση κωδικού και MFA.",
  load:"Φόρτωση ρυθμίσεων",unavailable:"Το API δεν είναι διαθέσιμο ή δεν υπάρχει άδεια",
  configured:"Ο λογαριασμός SMTP είναι ρυθμισμένος",missing:"Ο λογαριασμός SMTP δεν έχει ρυθμιστεί",
  sender:"Αποστολέας",transport:"Σύνδεση",receivers:"Επιτρεπόμενοι δοκιμαστικοί παραλήπτες",
  altTransport:"Εφεδρική θύρα STARTTLS",imap:"Θύρα IMAP SSL/TLS",verify:"Έλεγχος πιστοποιητικού",
  operation:"Ενέργεια",recipient:"Παραλήπτης",tls:"Έλεγχος πιστοποιητικού TLS",
  auth:"Έλεγχος ταυτοποίησης SMTP",envelope:"Έλεγχος αποστολέα και παραλήπτη (χωρίς email)",
  send:"Αποστολή ενός δοκιμαστικού email",owner:"Platform Owner",reviewer:"Platform Reviewer",
  none:"Δεν απαιτείται παραλήπτης",execute:"Εκτέλεση ελέγχου",
  proofPassword:"Κωδικός λογαριασμού Platform",proofTotp:"Εξαψήφιος κωδικός MFA",proofHint:"Απαιτείται νέος κωδικός MFA για κάθε ενέργεια.",
  confirm:"Επιβεβαιώνω την αποστολή ενός ακίνδυνου δοκιμαστικού email.",
  noSecrets:"Μόνο ο κωδικός Platform και το MFA αποστέλλονται μέσω HTTPS. Ο κωδικός SMTP μένει στον διακομιστή.",
  passed:"Ο έλεγχος ολοκληρώθηκε",failed:"Ο έλεγχος απέτυχε",denied:"Δεν επιτρέπεται η ενέργεια ή το ασφαλές API δεν είναι διαθέσιμο",
  status:"Αποτέλεσμα",stage:"Στάδιο",pending:"Δεν έχει εκτελεστεί έλεγχος",
  working:"Έλεγχος…",refresh:"Ανανέωση ρυθμίσεων",
 }
} as const;

type Props={access:string;language:Language};
const stages:Record<PlatformMailResult["stage"],string>={
 tls:"TLS",greeting:"SMTP greeting",auth:"SMTP AUTH",
 mail_from:"MAIL FROM",rcpt_to:"RCPT TO",data:"SMTP DATA",
 complete:"Completed",unavailable:"Unavailable",
};

export default function MailSettings({access,language}:Props){
 const t=messages[language];
 const [settings,setSettings]=useState<PlatformMailSettings|null>(null);
 const [op,setOp]=useState<MailOperation>("tls");
 const [recipient,setRecipient]=useState<"owner"|"reviewer">("owner");
 const [confirm,setConfirm]=useState(false);
 const [stepPassword,setStepPassword]=useState("");
 const [stepTotp,setStepTotp]=useState("");
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const [result,setResult]=useState<PlatformMailResult|null>(null);
 const [error,setError]=useState("");
 function operation(value:MailOperation){
  setOp(value);setConfirm(false);setStepPassword("");setStepTotp("");setResult(null);setError("");
 }
 async function reload(){
  if(busyRef.current)return;
  busyRef.current=true;setBusy(true);setError("");setResult(null);
  try{
   const config=await platform.mailSettings(access);
   setSettings(config);
  }catch{
   setSettings(null);setError(t.unavailable);
  }finally{busyRef.current=false;setBusy(false)}
 }
 async function diagnose(){
  if(!settings||busyRef.current)return;
  if(op==="send"&&!confirm)return;
  if(!stepPassword||!/^[0-9]{6}$/.test(stepTotp))return;
  const destination:MailRecipient=(op==="send"||op==="envelope")?recipient:"";
  busyRef.current=true;setBusy(true);setError("");setResult(null);
  try{
   const answer=await platform.mailDiagnostic(access,crypto.randomUUID(),op,destination,
    stepPassword,stepTotp);
   if(answer.action!==op||answer.recipient!==destination&&
      !(destination===""&&answer.recipient===undefined)){
    throw new Error("Unexpected mail diagnostic response");
   }
   setResult(answer);
  }catch(e){
   // Do not display raw backend exception text, SMTP banners or credentials.
   setError(e instanceof PlatformApiError&&e.status===429
    ? t.denied:t.unavailable);
  }finally{busyRef.current=false;setBusy(false);setConfirm(false);
    setStepPassword("");setStepTotp("");}
 }
 return <section className="panel mail-admin-panel" aria-busy={busy}>
  <div className="section-heading">
   <div><div className="eyebrow">VDMS / PLATFORM / SMTP</div>
    <h2>{t.title}</h2><p className="muted">{t.summary}</p></div>
   <button type="button" className="btn btn-outline" onClick={()=>void reload()}
    disabled={busy}>{settings?t.refresh:t.load}</button>
  </div>
  <p className="mail-admin-warning" role="note">{t.warning}</p>
  {error&&<div className="alert alert-error" role="alert">{error}</div>}
  {!settings?<p className="muted">{t.unavailable}</p>:
   <>
    <div className="mail-admin-details">
     <div><span className="mail-admin-label">{t.transport}</span>
      <strong>{settings.host}:{settings.port} · {settings.encryption.toUpperCase()}</strong></div>
     <div><span className="mail-admin-label">{t.altTransport}</span>
      <strong>{settings.host}:{settings.starttlsPort} · STARTTLS</strong></div>
     <div><span className="mail-admin-label">{t.imap}</span>
      <strong>{settings.host}:{settings.imapPort} · SSL/TLS</strong></div>
     <div><span className="mail-admin-label">{t.verify}</span>
      <strong>{settings.tlsVerify?"TLS verify: true":"TLS verification unavailable"}</strong></div>
     <div><span className="mail-admin-label">{t.sender}</span>
      <strong>{settings.from}</strong></div>
     <div><span className="mail-admin-label">{t.receivers}</span>
      <strong>{settings.ownerRecipient}</strong><strong>{settings.reviewerRecipient}</strong></div>
    </div>
    <p className="muted">{settings.credentialsConfigured?t.configured:t.missing}</p>
    <div className="mail-admin-controls">
     <label>{t.operation}
      <select value={op} disabled={busy} onChange={e=>operation(e.target.value as MailOperation)}>
       <option value="tls">{t.tls}</option>
       <option value="auth">{t.auth}</option>
       <option value="envelope">{t.envelope}</option>
       <option value="send">{t.send}</option>
      </select>
     </label>
     {(op==="send"||op==="envelope")&&
      <label>{t.recipient}
       <select value={recipient} disabled={busy}
        onChange={e=>{setRecipient(e.target.value as "owner"|"reviewer");setConfirm(false)}}>
        <option value="owner">{t.owner}</option><option value="reviewer">{t.reviewer}</option>
       </select>
      </label>}
     <label>{t.proofPassword}
      <input type="password" autoComplete="off" value={stepPassword}
       disabled={busy} minLength={12} maxLength={1024} required
       onChange={e=>setStepPassword(e.target.value)}/>
     </label>
     <label>{t.proofTotp}
      <input type="text" autoComplete="one-time-code" inputMode="numeric"
       value={stepTotp} disabled={busy} pattern="[0-9]{6}" maxLength={6}
       onChange={e=>setStepTotp(e.target.value)} required/>
     </label>
     {op==="send"&&<label className="mail-admin-confirm">
       <input type="checkbox" checked={confirm} disabled={busy}
        onChange={e=>setConfirm(e.target.checked)}/>{t.confirm}
      </label>}
     <button type="button" className="btn btn-primary"
      disabled={busy||(op!=="tls"&&!settings.credentialsConfigured)||
       stepPassword.length<12||!/^[0-9]{6}$/.test(stepTotp)||
       (op==="send"&&!confirm)}
      onClick={()=>void diagnose()}>{busy?t.working:t.execute}</button>
    </div>
    <p className="muted">{t.proofHint} {t.noSecrets}</p>
    {result?<div className={result.status==="passed"?"mail-admin-result":"alert alert-error"}
     role="status"><strong>{t.status}: {result.status==="passed"?t.passed:t.failed}</strong>
     <span>{t.stage}: {stages[result.stage]}</span></div>:
     <p className="muted">{t.pending}</p>}
   </>}
 </section>;
}

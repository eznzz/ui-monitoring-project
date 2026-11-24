import {useRef,useState,type FormEvent} from "react";
import {platform,type ReviewerEmailSent} from "./api";
import type {Language} from "./i18n";

// Only explicit Owner step-up can send an existing requested/queued invitation.
// Queued retries reuse the same token. A previous ambiguous attempt might
// already have reached SMTP, so the UI requires an explicit acknowledgement.
const words={
 en:{title:"Send existing Reviewer invitation",notice:"The invitation uses the HTTPS acceptance address configured by the authorized Platform Owner in Email Operator. Confirm the recipient can access it.",warning:"An actual invitation email will be sent to the fixed Reviewer recipient.",password:"Platform Owner password",totp:"Fresh Owner TOTP",confirm:"I authorize sending the selected existing invitation email.",button:"Send invitation email",sending:"Sending…",done:"SMTP accepted the invitation. Verify state and receipt independently.",unknown:"Delivery not confirmed. Check invitation status before any further action; do not retry blindly."},
 ru:{title:"Отправить существующее приглашение Reviewer",notice:"В приглашении используется HTTPS-адрес, настроенный уполномоченным Platform Owner в Email Operator. Проверь доступность адреса для получателя.",warning:"Будет реально отправлено письмо на закреплённый адрес Reviewer.",password:"Пароль Platform Owner",totp:"Свежий TOTP владельца",confirm:"Подтверждаю отправку письма по выбранному существующему запросу.",button:"Отправить письмо Reviewer",sending:"Отправка…",done:"SMTP принял приглашение. Отдельно проверь состояние и получение письма.",unknown:"Доставка не подтверждена. Проверь состояние запроса, прежде чем предпринимать другое действие; не повторяй отправку вслепую."},
 el:{title:"Send existing Reviewer invitation",notice:"The invitation uses the HTTPS acceptance address configured in Email Operator.",warning:"This sends a real email to the pinned Reviewer address.",password:"Platform Owner password",totp:"Fresh Owner TOTP",confirm:"I authorize sending the selected invitation.",button:"Send invitation email",sending:"Sending…",done:"SMTP accepted the invitation; check its state.",unknown:"Delivery not confirmed; check state before retry."},
} as const;

export default function ReviewerEmailSend({access,language,requestId,queued,onSent}:{
 access:string;language:Language;requestId:string;queued:boolean;onSent:(id:string)=>void;
}){
 const t=words[language];
 const [password,setPassword]=useState("");
 const [totp,setTotp]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const [outcome,setOutcome]=useState<"sent"|"unknown"|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(busyRef.current||outcome!==null||!confirmed||password.length<12||
    !/^[0-9]{6}$/.test(totp))return;
  busyRef.current=true;setBusy(true);setOutcome(null);
  try{
   const result:ReviewerEmailSent=await platform.reviewerEmailSend(access,requestId,password,totp);
   if(result.requestId!==requestId||result.state!=="sent")throw new Error("Unconfirmed response");
   setOutcome("sent");onSent(requestId);
  }catch{
   // Transport failures can be ambiguous. Require an independent status check.
   setOutcome("unknown");
  }finally{
   setPassword("");setTotp("");setConfirmed(false);
   setBusy(false);busyRef.current=false;
  }
 }
 return <section className="panel mail-admin-panel" aria-label={t.title}>
  <h3>{queued?(language==="ru"?"Продолжить отправку приглашения из очереди":language==="el"?"Συνέχιση αποστολής από την ουρά":"Resume queued invitation delivery"):t.title}</h3><p className="muted">{t.notice}</p>
  <p role="note">{queued?(language==="ru"?"Будет выполнена новая попытка доставки того же одноразового приглашения. Прежняя попытка могла достичь SMTP, поэтому сначала проверь почтовый ящик.":language==="el"?"Θα επαναληφθεί η αποστολή της ίδιας πρόσκλησης. Ελέγξτε πρώτα το γραμματοκιβώτιο.":"This retries delivery of the SAME single-use invitation. A previous attempt may already have reached SMTP; check the mailbox first."):t.warning}</p>
  <form className="edit-form" onSubmit={event=>void submit(event)} autoComplete="off">
   <label>{t.password}<input required type="password" autoComplete="off"
    value={password} maxLength={1024} disabled={busy||outcome!==null}
    onChange={e=>setPassword(e.target.value)}/></label>
   <label>{t.totp}<input required type="text" inputMode="numeric"
    autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
    value={totp} disabled={busy||outcome!==null} onChange={e=>setTotp(e.target.value)}/></label>
   <label className="mail-admin-confirm"><input type="checkbox"
    checked={confirmed} disabled={busy||outcome!==null}
    onChange={e=>setConfirmed(e.target.checked)}/>{queued?(language==="ru"?"Я проверил почту Reviewer и подтверждаю повторную попытку доставки существующего приглашения.":language==="el"?"Έλεγξα το γραμματοκιβώτιο και εγκρίνω νέα προσπάθεια αποστολής της ίδιας πρόσκλησης.":"I checked the Reviewer mailbox and explicitly authorize retrying this existing invitation."):t.confirm}</label>
   <button className="btn btn-primary" type="submit" disabled={busy||outcome!==null||
    !confirmed||password.length<12||!/^[0-9]{6}$/.test(totp)}>{busy?t.sending:queued?(language==="ru"?"Повторить доставку этого приглашения":language==="el"?"Επανάληψη αποστολής πρόσκλησης":"Retry this invitation delivery"):t.button}</button>
  </form>
  {outcome&&<p role="status">{outcome==="sent"?t.done:t.unknown}</p>}
 </section>;
}

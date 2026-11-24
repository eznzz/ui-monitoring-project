import {useRef,useState,type FormEvent} from "react";
import {platform,PlatformApiError,type ReviewerEmailTemplate} from "./api";
import type {Language} from "./i18n";

const copy={
 en:{title:"Invitation link and email template",load:"Load message settings",
  reload:"Reload settings",link:"Invitation acceptance URL (HTTPS)",
  subject:"Email subject",body:"Email text",vars:"Available fields: {{reviewer_login}}, {{invitation_link}}, {{expires_utc}}. The invitation link must appear exactly once in the message body.",
  warning:"Only use a domain that serves your trusted VDMS Central. The recipient's browser must be able to reach it over HTTPS. Changing this does not send email.",
  password:"Platform Owner password",totp:"Fresh Owner TOTP",
  confirm:"I confirm this HTTPS address is controlled by our VDMS deployment.",
  save:"Save link and email text",saving:"Saving…",
  saved:"Settings saved in Email Operator. No email was sent.",
  failed:"Settings not saved. Verify permissions and TOTP; do not retry blindly.",
  conflict:"Settings changed elsewhere. Reload before editing again.",
  loadFailed:"Unable to load message settings from Email Operator.",
  initial:"Defaults are loaded but have not yet been saved. You may save them as-is.",
  unchanged:"Settings already saved. Change a field to enable saving again."},
 ru:{title:"Адрес подтверждения и шаблон приглашения",load:"Загрузить настройки письма",
  reload:"Обновить настройки",link:"Адрес подтверждения приглашения (HTTPS)",
  subject:"Тема письма",body:"Текст письма",vars:"Переменные: {{reviewer_login}}, {{invitation_link}}, {{expires_utc}}. Ссылка {{invitation_link}} должна встретиться в тексте ровно один раз.",
  warning:"Указывай только HTTPS-домен, где действительно работает VDMS Central и который доступен получателю. Иначе одноразовый токен попадёт на другой сайт. Сохранение настроек не отправляет письмо.",
  password:"Пароль Platform Owner",totp:"Свежий TOTP владельца",
  confirm:"Подтверждаю, что HTTPS-адрес принадлежит нашему VDMS.",
  save:"Сохранить адрес и текст",saving:"Сохранение…",
  saved:"Настройки сохранены в Email Operator. Письмо не отправлялось.",
  failed:"Сохранение не подтверждено. Проверь права и TOTP; не повторяй действие вслепую.",
  conflict:"Настройки изменены другим администратором. Сначала загрузи их заново.",
  loadFailed:"Не удалось загрузить шаблон письма из Email Operator.",
  initial:"Показаны значения по умолчанию, они ещё не сохранены в файле настроек. Их можно сохранить без изменений.",
  unchanged:"Настройки уже сохранены. Для повторного сохранения измени хотя бы одно поле."},
 el:{title:"Invitation link and email template",load:"Load message settings",
  reload:"Reload settings",link:"HTTPS acceptance URL",subject:"Email subject",
  body:"Email text",vars:"Fields: {{reviewer_login}}, {{invitation_link}}, {{expires_utc}}. Include the link exactly once.",
  warning:"Use only the HTTPS domain hosting your trusted VDMS Central. Saving does not send an email.",
  password:"Platform Owner password",totp:"Fresh Owner TOTP",
  confirm:"I confirm this is our VDMS HTTPS address.",save:"Save settings",saving:"Saving…",
  saved:"Settings saved. No email sent.",failed:"Settings not confirmed saved.",
  conflict:"Settings changed elsewhere. Reload.",loadFailed:"Unable to load settings.",
  initial:"Default values are not yet persisted. You can save them as-is.",
  unchanged:"Settings already saved. Change a field to save again."},
} as const;

export default function ReviewerEmailTemplateSettings({
 access,language,enabled,
}:{access:string;language:Language;enabled:boolean}){
 const t=copy[language];
 const [source,setSource]=useState<ReviewerEmailTemplate|null>(null);
 const [draft,setDraft]=useState<ReviewerEmailTemplate|null>(null);
 const [password,setPassword]=useState("");
 const [totp,setTotp]=useState("");
 const [confirm,setConfirm]=useState(false);
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const [notice,setNotice]=useState<"saved"|"failed"|"conflict"|"loadFailed"|null>(null);
 async function load(){
  if(!enabled||busyRef.current)return;
  busyRef.current=true;setBusy(true);setNotice(null);
  // Never retain old proof while refreshing settings, even on a failed reload.
  setPassword("");setTotp("");setConfirm(false);
  try{
   const next=await platform.reviewerEmailTemplate(access);
   if(typeof next.linkBaseURL!=="string"||typeof next.subject!=="string"||
      typeof next.body!=="string"||!Number.isSafeInteger(next.revision))
    throw new Error("Invalid settings");
   setSource(next);setDraft(next);setConfirm(false);
  }catch{
   setSource(null);setDraft(null);setNotice("loadFailed");
  }finally{setBusy(false);busyRef.current=false;}
 }
 // Revision 0 is a server-generated default, not a persisted configuration.
 // Permit a one-time explicit save of those defaults without editing fields.
 // Once revision >= 1, unchanged settings must not consume Owner MFA.
 const needsSave=Boolean(source&&draft&&(
  source.revision===0 ||
  draft.linkBaseURL!==source.linkBaseURL ||
  draft.subject!==source.subject||draft.body!==source.body));
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!enabled||!needsSave||!draft||!confirm||busyRef.current||
     password.length<12||!/^[0-9]{6}$/.test(totp))return;
  busyRef.current=true;setBusy(true);setNotice(null);
  try{
   const next=await platform.saveReviewerEmailTemplate(access,draft,password,totp);
   if(next.revision!==draft.revision+1||
      next.linkBaseURL!==draft.linkBaseURL||
      next.subject!==draft.subject||next.body!==draft.body)
     throw new Error("Unexpected settings response");
   setSource(next);setDraft(next);setNotice("saved");
  }catch(e){
   setNotice(e instanceof PlatformApiError&&e.status===409?"conflict":"failed");
  }finally{
   setPassword("");setTotp("");setConfirm(false);setBusy(false);
   busyRef.current=false;
  }
 }
 return <section className="mail-admin-template">
  <h3>{t.title}</h3>
  <p className="muted">{t.warning}</p>
  <button className="btn btn-outline" type="button" onClick={()=>void load()}
   disabled={busy||!enabled}>{source?t.reload:t.load}</button>
  {draft&&<form className="edit-form" autoComplete="off"
    onSubmit={e=>void save(e)}>
   <label>{t.link}
    <input type="url" required value={draft.linkBaseURL} maxLength={300}
     disabled={busy} onChange={e=>setDraft({...draft,linkBaseURL:e.target.value})}/>
   </label>
   <label>{t.subject}
    <input required value={draft.subject} maxLength={180} disabled={busy}
     onChange={e=>setDraft({...draft,subject:e.target.value})}/>
   </label>
   <label>{t.body}
    <textarea required rows={10} maxLength={2800} value={draft.body}
     disabled={busy} onChange={e=>setDraft({...draft,body:e.target.value})}/>
   </label>
   <p className="muted">{t.vars}</p>
   <p className="muted" role="status">{source?.revision===0?t.initial:!needsSave?t.unchanged:null}</p>
   <label>{t.password}
    <input type="password" autoComplete="off" maxLength={1024}
     disabled={busy} value={password}
     onChange={e=>setPassword(e.target.value)}/>
   </label>
   <label>{t.totp}
    <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}"
     maxLength={6} disabled={busy} value={totp}
     onChange={e=>setTotp(e.target.value)}/>
   </label>
   <label className="mail-admin-confirm">
    <input type="checkbox" checked={confirm} disabled={busy}
     onChange={e=>setConfirm(e.target.checked)}/>{t.confirm}
   </label>
   <button type="submit" className="btn btn-primary" disabled={busy||!needsSave||
      !confirm||password.length<12||!/^[0-9]{6}$/.test(totp)}>
    {busy?t.saving:t.save}
   </button>
  </form>}
  {notice&&<p role={notice==="saved"?"status":"alert"}>{t[notice]}</p>}
 </section>;
}

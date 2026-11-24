import { demoFetch } from "./demo-fetch";
import {useEffect,useState,type FormEvent} from "react";
import {PlatformApiError} from "./api";

type Language = "en" | "ru" | "el";
const texts = {
 en:{
  title:"Accept Reviewer invitation",intro:"Set your own password and authenticator before your Platform Owner confirms your access.",
  noToken:"No valid invitation token. Open your personal email link.",notReady:"Registration is not yet enabled on this server.",
  setup:"Set up authenticator",generate:"Generate my MFA key",
  manual:"Enter this key manually in your authenticator (TOTP, SHA1, 6 digits, 30 seconds):",
  password:"New personal password (at least 12 characters)",again:"Repeat password",
  code:"6-digit authenticator code",accept:"Create my Reviewer account",
  done:"Account enrolled without permissions. Wait for your Platform Owner to confirm access.",
  error:"Registration was not accepted. The token may be missing, expired or used, or the MFA code incorrect.",
  unavailable:"Claim service not available. No account created.",
  invalid:"Confirm matching passwords, MFA setup and a current 6-digit code.",
  back:"Back to Central Workspace",security:"The invitation token and MFA key are kept only in this page's memory. Never share them.",
 },
 ru:{
  title:"Принятие приглашения Reviewer",intro:"Задайте свой пароль и собственный TOTP. Права появятся только после подтверждения Platform Owner.",
  noToken:"Нет действительного токена. Откройте личную ссылку из письма.",notReady:"Регистрация Reviewer ещё не включена на этом сервере.",
  setup:"Настройка аутентификатора",generate:"Создать мой ключ MFA",
  manual:"Добавьте ключ вручную в приложение-аутентификатор (TOTP, SHA1, 6 цифр, 30 секунд):",
  password:"Новый личный пароль (не менее 12 символов)",again:"Повторите пароль",
  code:"6-значный код приложения",accept:"Создать мою учётную запись Reviewer",
  done:"Учётная запись создана без полномочий. Ожидайте подтверждения Platform Owner.",
  error:"Регистрация отклонена. Проверьте ссылку, срок действия и код MFA.",
  unavailable:"Сервис регистрации недоступен. Учётная запись не создана.",
  invalid:"Проверьте совпадение паролей, настройку MFA и актуальный шестизначный код.",
  back:"Вернуться в Central Workspace",security:"Токен и ключ MFA хранятся только в памяти текущей страницы. Никому их не сообщайте.",
 },
 el:{
  title:"Αποδοχή πρόσκλησης Reviewer",intro:"Ορίστε προσωπικό κωδικό και MFA. Η πρόσβαση απαιτεί έγκριση Owner.",
  noToken:"Λείπει έγκυρο token πρόσκλησης.",notReady:"Η εγγραφή δεν έχει ενεργοποιηθεί.",setup:"Ρύθμιση authenticator",
  generate:"Δημιουργία κλειδιού MFA",manual:"Εισαγάγετε το κλειδί σε TOTP (SHA1, 6 ψηφία, 30 δευτερόλεπτα):",
  password:"Νέος κωδικός (τουλάχιστον 12 χαρακτήρες)",again:"Επαναλάβετε κωδικό",
  code:"6-ψήφιος κωδικός",accept:"Δημιουργία λογαριασμού",
  done:"Ο λογαριασμός δημιουργήθηκε χωρίς δικαιώματα. Αναμένεται επιβεβαίωση Owner.",
  error:"Η εγγραφή απορρίφθηκε. Ελέγξτε τον σύνδεσμο και το MFA.",
  unavailable:"Η υπηρεσία εγγραφής δεν είναι διαθέσιμη.",
  invalid:"Ελέγξτε κωδικούς και MFA.",
  back:"Επιστροφή",security:"Το token και το κλειδί MFA παραμένουν μόνο στη μνήμη.",
 }
} satisfies Record<Language,Record<string,string>>;

let claimBearer: string|null=null;
if(new URLSearchParams(window.location.search).has("claim")){
 const fragment=window.location.hash;
 window.history.replaceState(null,"","/central/reviewer/accept");
 if(/^#token=[A-Za-z0-9_-]{43}$/.test(fragment))claimBearer=fragment.slice(7);
}
function encodeBase32(bytes:Uint8Array):string {
 const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
 let bits=0,value=0,result="";
 for(const byte of bytes){
  value=(value<<8)|byte;bits+=8;
  while(bits>=5){bits-=5;result+=alphabet[(value>>>bits)&31];}
 }
 if(bits>0)result+=alphabet[(value<<(5-bits))&31];
 return result;
}
function encodeBase64URL(bytes:Uint8Array):string{
 let binary="";
 for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=/g,"");
}

export default function ReviewerAccept(){
 const [language,setLanguage]=useState<Language>("en");
 const [claimEnabled,setClaimEnabled]=useState(false);
 const [readinessChecked,setReadinessChecked]=useState(false);
 useEffect(()=>{
  let active=true;
  demoFetch("/internal/platform-admin/reviewer/claim/readiness",{
   method:"GET",cache:"no-store",credentials:"omit",redirect:"error",
  }).then(async response=>{
   if(!response.ok)return false;
   const value:unknown=await response.json();
   return typeof value==="object"&&value!==null&&
    "claimEnabled" in value&&value.claimEnabled===true;
  }).then(enabled=>{
   if(active){setClaimEnabled(enabled);setReadinessChecked(true);}
  }).catch(()=>{
   if(active){setClaimEnabled(false);setReadinessChecked(true);}
  });
  return ()=>{active=false};
 },[]);

 const [secret,setSecret]=useState<Uint8Array|null>(null);
 const [password,setPassword]=useState("");
 const [repeat,setRepeat]=useState("");
 const [totp,setTotp]=useState("");
 const [busy,setBusy]=useState(false);
 const [outcome,setOutcome]=useState<"done"|"error"|"unavailable"|"invalid"|null>(null);
 const t=texts[language];
 function generate(){
  if(secret||busy||!claimBearer)return;
  const bytes=new Uint8Array(20);
  crypto.getRandomValues(bytes);
  setSecret(bytes);
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!claimBearer||!claimEnabled||busy||!secret)return;
  if(password!==repeat||new TextEncoder().encode(password).length<12||
     new TextEncoder().encode(password).length>1024||!/^[0-9]{6}$/.test(totp)){
    setOutcome("invalid");return;
  }
  setBusy(true);setOutcome(null);
  const body={token:claimBearer,password,totpSecret:encodeBase64URL(secret),totp};
  try{
   const response=await demoFetch("/internal/platform-admin/reviewer/claim",{
    method:"POST",cache:"no-store",credentials:"omit",redirect:"error",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
   });
   if(!response.ok)throw new PlatformApiError(response.status);
   const result:unknown=await response.json();
   if(typeof result!=="object"||result===null||
    !("state" in result)||result.state!=="enrolled")throw new Error("Invalid result");
   claimBearer=null;
   secret.fill(0);setSecret(null);setPassword("");setRepeat("");setTotp("");
   setOutcome("done");
  }catch(error){
   setOutcome(error instanceof PlatformApiError&&
    (error.status===404||error.status===503)?"unavailable":"error");
   setPassword("");setRepeat("");setTotp("");
  }finally{setBusy(false);}
 }
 return <div className="app">
  <header className="topbar"><div className="brand"><span className="mark">V</span>
   <div><strong>VDMS</strong><small>Central / Reviewer</small></div></div>
   <div className="top-actions">
    <label className="visually-hidden" htmlFor="accept-lang">Language</label>
    <select id="accept-lang" value={language} onChange={e=>setLanguage(e.target.value as Language)}>
     <option value="en">English</option><option value="ru">Русский</option><option value="el">Ελληνικά</option>
    </select>
   </div>
  </header>
  <main className="main">
   <section className="panel auth-panel">
    <h1>{t.title}</h1><p>{t.intro}</p>
    {!claimBearer&&outcome!=="done"&&<p role="alert">{t.noToken}</p>}
    {claimBearer&&readinessChecked&&!claimEnabled&&<p role="status">{t.notReady}</p>}
    {claimBearer&&claimEnabled&&outcome!=="done"&&<form className="edit-form" onSubmit={e=>void submit(e)}>
     <h2>{t.setup}</h2>
     {!secret&&<button type="button" className="btn btn-outline" onClick={generate}>{t.generate}</button>}
     {secret&&<>
      <label>{t.manual}
       <code style={{display:"block",overflowWrap:"anywhere",userSelect:"all"}}>{encodeBase32(secret)}</code>
      </label>
      <label>{t.password}<input type="password" value={password} autoComplete="new-password"
       required minLength={12} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
      <label>{t.again}<input type="password" value={repeat} autoComplete="new-password"
       required minLength={12} onChange={e=>setRepeat(e.target.value)} disabled={busy}/></label>
      <label>{t.code}<input value={totp} required maxLength={6} pattern="[0-9]{6}"
       autoComplete="one-time-code" inputMode="numeric" onChange={e=>setTotp(e.target.value)} disabled={busy}/></label>
      <button type="submit" className="btn btn-primary" disabled={busy}>{t.accept}</button>
     </>}
    </form>}
    {outcome&&<p role={outcome==="done"?"status":"alert"}>{t[outcome]}</p>}
    <p className="muted">{t.security}</p><a className="btn btn-outline" href="/central/">{t.back}</a>
   </section>
  </main>
 </div>;
}

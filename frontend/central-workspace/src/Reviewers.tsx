import {useRef,useState,type FormEvent} from "react";
import {platform,type ReviewerStatus,type ReviewerInvitationStatus,type ReviewerInvitationListItem,PlatformApiError} from "./api";
import type {Language} from "./i18n";
import ReviewerEmailSend from "./ReviewerEmailSend";
import OwnerConfirmReviewer from "./OwnerConfirmReviewer";

/**
 * Reviewer onboarding is intentionally disabled until the trusted invitation
 * service and independent Owner step-up are connected to a separately
 * authorized backend. Do not simulate an invite or call Platform API directly:
 * the Platform HTTP database role must not access reviewer bootstrap tables.
 */
const words = {
  en: {
    title: "Reviewers",
    existing:"Existing invitation request", checkExisting:"Check request", stateLabel:"Request state", statusError:"Unable to retrieve this request. Check the UUID and Owner session.",
    reviewerLogin:"Reviewer login", email:"Reviewer email", ownerPassword:"Your Platform Owner password", ownerTotp:"Fresh Owner MFA code", invite:"Register invitation request", requesting:"Submitting…", invited:"Request recorded in Platform DB. No email has been sent.", inviteFailed:"Invitation request failed.", inviteDenied:"Request denied (HTTP 403). Check Owner password, fresh MFA, bootstrap permission and whether the login already exists.", inviteUnavailable:"Reviewer service unavailable (HTTP 503). The server operator or database is not ready.", inviteBadRequest:"Invalid request (HTTP 400). Check login, email and request format.", inviteSession:"Platform session expired (HTTP 401). Sign in again.",
    check: "Check live status", loading: "Checking…", count: "Active Reviewers", denied: "Only an authorized Platform Owner can view Reviewer status.", failed: "Status unavailable. Check Platform API connection.",
    introduction: "Independent Platform Reviewers approve company activation requests. A Reviewer must be a different person from the requesting Platform Owner.",
    heading: "Reviewer invitation",
    status: "Not enabled in this deployment",
    explanation: "Invitations, email delivery, Reviewer password and MFA enrollment, and Owner confirmation are implemented as separate trusted backend stages but are not connected to the live Central API. This page cannot create users or send invitations yet.",
    stepsTitle: "Required secure workflow",
    steps: [
      "Platform Owner invites a separate person using their login and email address.",
      "A trusted delivery service sends a single-use invitation to that person.",
      "The Reviewer chooses their own password and enrolls their own authenticator.",
      "Platform Owner independently confirms the Reviewer. Only tenant.provision.approve is granted.",
      "The Reviewer signs in and approves an eligible company request with fresh MFA."
    ],
    boundary: "No reviewer permissions or Tenant database changes are performed on this page."
  },
  ru: {
    title: "Reviewer — проверяющие",
    existing:"Ранее зарегистрированный запрос", checkExisting:"Проверить запрос", stateLabel:"Состояние запроса", statusError:"Не удалось получить состояние. Проверь UUID и сессию владельца.",
    reviewerLogin:"Логин Reviewer", email:"Email Reviewer", ownerPassword:"Ваш пароль Platform Owner", ownerTotp:"Новый код MFA владельца", invite:"Зарегистрировать запрос приглашения", requesting:"Регистрация…", invited:"Запрос зарегистрирован в Platform DB. Письмо ещё не отправлено.", inviteFailed:"Запрос отклонён. Сетевая ошибка или неожиданный ответ сервера.", inviteDenied:"Отказ (HTTP 403): проверь пароль владельца, новый код MFA, право приглашения и отсутствие такого логина.", inviteUnavailable:"Сервис Reviewer недоступен (HTTP 503): ошибка связи с оператором или базой данных.", inviteBadRequest:"Некорректный запрос (HTTP 400): проверь логин, email и параметры.", inviteSession:"Сессия истекла (HTTP 401). Войди заново.",
    check: "Проверить состояние", loading: "Проверка…", count: "Активных Reviewer", denied: "Доступ к состоянию Reviewer имеет только уполномоченный Platform Owner.", failed: "Не удалось получить состояние из Platform API.",
    introduction: "Независимый Reviewer подтверждает заявки на активацию компаний. Это должен быть другой человек, не тот, кто отправил заявку.",
    heading: "Приглашение Reviewer",
    status: "Пока не подключено в этой среде",
    explanation: "Приглашение, отправка email, настройка пароля и MFA и подтверждение владельцем существуют как отдельные доверенные серверные этапы, но ещё не подключены к рабочему Central API. Эта страница пока не создаёт пользователей и не отправляет приглашения.",
    stepsTitle: "Необходимый порядок регистрации",
    steps: [
      "Platform Owner приглашает другого человека по логину и email.",
      "Доверенный сервис доставляет персональное одноразовое приглашение.",
      "Reviewer самостоятельно задаёт пароль и подключает аутентификатор.",
      "Platform Owner отдельно подтверждает Reviewer; выдаётся только tenant.provision.approve.",
      "Reviewer входит в систему и подтверждает подходящую заявку с новым MFA-кодом."
    ],
    boundary: "Эта страница не выдаёт права Reviewer и не изменяет базы компаний."
  },
  el: {
    title: "Reviewers",
    existing:"Υπάρχον αίτημα πρόσκλησης",checkExisting:"Έλεγχος αιτήματος",stateLabel:"Κατάσταση",statusError:"Δεν είναι διαθέσιμη η κατάσταση του αιτήματος.",
    reviewerLogin:"Login Reviewer", email:"Email Reviewer", ownerPassword:"Κωδικός Platform Owner", ownerTotp:"Νέος κωδικός MFA Owner", invite:"Καταχώριση αιτήματος πρόσκλησης", requesting:"Υποβολή…", invited:"Το αίτημα καταχωρίστηκε στο Platform DB. Δεν έχει σταλεί email.", inviteFailed:"Το αίτημα απέτυχε.", inviteDenied:"Απόρριψη (HTTP 403): έλεγξε κωδικό, νέο MFA και δικαιώματα Owner.", inviteUnavailable:"Μη διαθέσιμο (HTTP 503): ο Reviewer Operator ή η βάση δεν λειτουργεί.", inviteBadRequest:"Μη έγκυρο αίτημα (HTTP 400).", inviteSession:"Η συνεδρία έληξε (HTTP 401).",
    check: "Έλεγχος κατάστασης", loading: "Έλεγχος…", count: "Ενεργοί Reviewers", denied: "Μόνο εξουσιοδοτημένος Platform Owner μπορεί να δει την κατάσταση.", failed: "Η κατάσταση δεν είναι διαθέσιμη.",
    introduction: "Οι ανεξάρτητοι Reviewers εγκρίνουν αιτήματα ενεργοποίησης εταιρειών και πρέπει να είναι διαφορετικά πρόσωπα από τον αιτούντα.",
    heading: "Πρόσκληση Reviewer",
    status: "Δεν έχει ενεργοποιηθεί σε αυτήν την εγκατάσταση",
    explanation: "Η πρόσκληση, η αποστολή email, ο προσωπικός κωδικός και το MFA και η επιβεβαίωση από τον Owner υπάρχουν ως ξεχωριστά έμπιστα στάδια backend, αλλά δεν έχουν συνδεθεί ακόμη στο ενεργό Central API. Αυτή η σελίδα δεν δημιουργεί λογαριασμούς ούτε στέλνει προσκλήσεις.",
    stepsTitle: "Απαραίτητη ασφαλής διαδικασία",
    steps: [
      "Ο Platform Owner προσκαλεί διαφορετικό πρόσωπο με login και email.",
      "Έμπιστη υπηρεσία παραδίδει προσωπική πρόσκληση μίας χρήσης.",
      "Ο Reviewer ορίζει δικό του κωδικό και MFA.",
      "Ο Platform Owner επιβεβαιώνει ξεχωριστά τον Reviewer και εκχωρεί μόνο tenant.provision.approve.",
      "Ο Reviewer συνδέεται και εγκρίνει επιτρεπτό αίτημα με νέο MFA."
    ],
    boundary: "Αυτή η σελίδα δεν εκχωρεί δικαιώματα ούτε αλλάζει βάσεις Tenant."
  }
} satisfies Record<Language,{
  title:string; existing:string; checkExisting:string; stateLabel:string; statusError:string; check:string; loading:string; count:string; denied:string; failed:string; introduction:string; heading:string; status:string;
  reviewerLogin:string; email:string; ownerPassword:string; ownerTotp:string; invite:string; requesting:string; invited:string; inviteFailed:string; inviteDenied:string; inviteUnavailable:string; inviteBadRequest:string; inviteSession:string;
  explanation:string; stepsTitle:string; steps:string[]; boundary:string;
}>;

export default function Reviewers({access,language}:{access:string;language:Language}) {
  const t = words[language];
  const [live,setLive]=useState<ReviewerStatus|null>(null);
  const [existingID,setExistingID]=useState("");
  const [invitationOptions,setInvitationOptions]=useState<ReviewerInvitationListItem[]>([]);
  const [listError,setListError]=useState(false);
  const [existingStatus,setExistingStatus]=useState<ReviewerInvitationStatus|null>(null);
  const [statusBusy,setStatusBusy]=useState(false);
  const [statusFailed,setStatusFailed]=useState(false);
  // A fresh independent status lookup is required before re-enabling a
  // delivery attempt that returned an ambiguous response.
  const [statusLookupVersion,setStatusLookupVersion]=useState(0);
  async function lookupExisting(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(statusBusy||!live?.invitationEnabled||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(existingID))return;
    setStatusBusy(true);setStatusFailed(false);
    try{
      const status=await platform.invitationStatus(access,existingID);
      setExistingStatus(status);
      setStatusLookupVersion(v=>v+1);
    }
    catch{setStatusFailed(true);}
    finally{setStatusBusy(false);}
  }
  const [loading,setLoading]=useState(false);
  const [failure,setFailure]=useState<"denied"|"failed"|null>(null);
  const [login,setLogin]=useState("");
  const [email,setEmail]=useState("");
  const [ownerPassword,setOwnerPassword]=useState("");
  const [ownerTotp,setOwnerTotp]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [inviteNotice,setInviteNotice]=useState<"invited"|"inviteFailed"|"inviteDenied"|"inviteUnavailable"|"inviteBadRequest"|"inviteSession"|null>(null);
  const [recordedRequestId,setRecordedRequestId]=useState<string|null>(null);
  // Retain the same request UUID over an ambiguous network retry.
  const invitationRequestID=useRef<string|null>(null);
  function changeLogin(value:string){setLogin(value);invitationRequestID.current=null;setInviteNotice(null);setRecordedRequestId(null);}
  function changeEmail(value:string){setEmail(value);invitationRequestID.current=null;setInviteNotice(null);setRecordedRequestId(null);}
  async function submitInvitation(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(submitting||!live?.invitationEnabled)return;
    const reviewerLogin=login.trim();
    const recipientEmail=email.trim();
    if(!/^[a-z][a-z0-9._-]{1,127}$/.test(reviewerLogin)||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)||
      ownerPassword.length<12||!/^[0-9]{6}$/.test(ownerTotp))return;
    setSubmitting(true);setInviteNotice(null);
    try{
      if(!invitationRequestID.current)invitationRequestID.current=crypto.randomUUID();
      const result=await platform.inviteReviewer(access,invitationRequestID.current,reviewerLogin,recipientEmail,ownerPassword,ownerTotp);
      if(result.requestId!==invitationRequestID.current||result.state!=="requested")throw new Error("Unverified invitation response");
      setRecordedRequestId(result.requestId);
      setExistingID(result.requestId);
      setInvitationOptions(previous=>[{
        requestId:result.requestId,reviewerLogin,recipientEmail,state:"requested",
        createdAt:new Date().toISOString(),
      },...previous.filter(item=>item.requestId!==result.requestId)]);
      setExistingStatus({requestId:result.requestId,reviewerLogin,recipientEmail,state:"requested"});
      setInviteNotice("invited");setOwnerPassword("");setOwnerTotp("");
    }catch(error){
      const status=error instanceof PlatformApiError?error.status:0;
      setInviteNotice(status===403?"inviteDenied":status===503?"inviteUnavailable":
        status===400?"inviteBadRequest":status===401?"inviteSession":"inviteFailed");
      setOwnerPassword("");setOwnerTotp("");
    }
    finally{setSubmitting(false);}
  }
  async function checkStatus(){
    if(loading)return;
    setLoading(true);setFailure(null);setLive(null);
    try{
      const status=await platform.reviewerStatus(access);
      setLive(status);
      if(status.invitationEnabled){
        try{
          const page=await platform.invitationList(access);
          setInvitationOptions(page.invitations);
          setListError(false);
        }catch{setListError(true);setInvitationOptions([]);}
      }
    }
    catch(error){setFailure(error instanceof PlatformApiError&&error.status===403?"denied":"failed");}
    finally{setLoading(false);}
  }
  return <section className="panel reviewer-panel" aria-labelledby="reviewer-heading">
    <div className="section-heading"><h2 id="reviewer-heading">{t.title}</h2></div>
    <p>{t.introduction}</p>
    <button type="button" className="btn btn-outline" disabled={loading} onClick={()=>void checkStatus()}>{loading?t.loading:t.check}</button>
    {live&&<p role="status">{t.count}: <strong>{live.activeReviewers}</strong></p>}
    {failure&&<p role="alert">{t[failure]}</p>}
    <h3>{t.heading}</h3>
    {live?.invitationEnabled&&<form className="edit-form" onSubmit={event=>void lookupExisting(event)}>
      <label>{t.existing}
        <select value={existingID} onChange={event=>{
          setExistingID(event.target.value);setExistingStatus(null);setStatusFailed(false);
        }}>
          <option value="">{language==="ru"?"Выберите запрос":language==="el"?"Επιλέξτε αίτημα":"Select an invitation"}</option>
          {invitationOptions.map(item=><option key={item.requestId} value={item.requestId}>
            {item.reviewerLogin} · {item.recipientEmail} · {item.state} · {new Date(item.createdAt).toLocaleString(language)}
          </option>)}
        </select>
      </label>
      <button className="btn btn-outline" type="submit" disabled={statusBusy||!existingID}>{t.checkExisting}</button>
      {existingStatus&&<p role="status">{t.stateLabel}: <strong>{existingStatus.state}</strong> · {existingStatus.reviewerLogin} · {existingStatus.recipientEmail}</p>}
      {listError&&<p role="alert">{language==="ru"?"Не удалось загрузить список запросов.":language==="el"?"Η λίστα δεν είναι διαθέσιμη.":"Unable to load invitation list."}</p>}
      {statusFailed&&<p role="alert">{t.statusError}</p>}
    </form>}
    {live?.invitationEnabled&&existingStatus?.state==="claimed"&&
      <OwnerConfirmReviewer key={existingStatus.requestId} access={access}
        language={language} requestId={existingStatus.requestId}/>}
    {live?.invitationEnabled&&existingStatus?.state==="queued"&&
      <p role="status">{language==="ru"
        ?"Приглашение уже поставлено в очередь. Повторная регистрация не нужна. Перед новой попыткой отправки проверь почтовый ящик Reviewer: предыдущая SMTP-попытка могла быть принята без подтверждения в базе."
        :language==="el"
        ?"Η πρόσκληση βρίσκεται ήδη στην ουρά. Μην δημιουργήσετε νέα αίτηση. Ελέγξτε πρώτα το γραμματοκιβώτιο του Reviewer πριν από νέα προσπάθεια."
        :"This invitation is already queued. Do not register another request. Check the Reviewer mailbox before another send: the previous SMTP attempt might have succeeded without a database confirmation."}</p>}
    {live?.invitationEnabled&&(existingStatus?.state==="requested"||existingStatus?.state==="queued")&&
      <ReviewerEmailSend key={existingStatus.requestId+"-"+statusLookupVersion} access={access} language={language}
        requestId={existingStatus.requestId} queued={existingStatus.state==="queued"}
        onSent={id=>{
          setExistingStatus(current=>current?.requestId===id?{...current,state:"sent"}:current);
          setInvitationOptions(current=>current.map(item=>
            item.requestId===id?{...item,state:"sent"}:item));
        }}/>}
    {live?.invitationEnabled&&existingStatus?.state==="sent"&&
      <p role="status">{language==="ru"
        ?"SMTP принял приглашение. Проверь его получение в почтовом ящике Reviewer; повторная отправка не требуется."
        :language==="el"
        ?"Ο SMTP αποδέχθηκε την πρόσκληση. Ελέγξτε το γραμματοκιβώτιο του Reviewer."
        :"SMTP accepted this invitation. Check the Reviewer mailbox; no resend is needed."}</p>}
    {live?.invitationEnabled&&existingID&&!existingStatus&&!statusBusy&&!statusFailed&&
      <p className="muted">{language==="ru"
        ?"Выбрано существующее приглашение. Нажми Check request для получения актуального состояния и доступных действий."
        :language==="el"
        ?"Επιλέχθηκε υπάρχουσα πρόσκληση. Πατήστε Check request για την ενημερωμένη κατάστασή της."
        :"Existing invitation selected. Press Check request to load its latest status and available actions."}</p>}
    {live?.invitationEnabled&&existingStatus&&
      <p className="muted">{language==="ru"
        ?"Этот запрос уже существует. Для нового приглашения сначала выбери пустой пункт в списке Existing invitation request."
        :language==="el"
        ?"Αυτό το αίτημα υπάρχει ήδη. Επιλέξτε το κενό στοιχείο για να δημιουργήσετε νέο αίτημα."
        :"This request already exists. Select the empty option above before registering a different invitation."}</p>}
    {live?.invitationEnabled&&!existingID&&!existingStatus&&
      <form className="edit-form" onSubmit={event=>void submitInvitation(event)}>
        <div className="fields">
          <label>{t.reviewerLogin}
            <input required autoComplete="off" maxLength={128} value={login}
              onChange={event=>changeLogin(event.target.value)} disabled={submitting}/>
          </label>
          <label>{t.email}
            <input required type="email" autoComplete="email" maxLength={254} value={email}
              onChange={event=>changeEmail(event.target.value)} disabled={submitting}/>
          </label>
          <label>{t.ownerPassword}
            <input required type="password" autoComplete="current-password" value={ownerPassword}
              onChange={event=>setOwnerPassword(event.target.value)} disabled={submitting}/>
          </label>
          <label>{t.ownerTotp}
            <input required inputMode="numeric" autoComplete="one-time-code"
              maxLength={6} pattern="[0-9]{6}" value={ownerTotp}
              onChange={event=>setOwnerTotp(event.target.value)} disabled={submitting}/>
          </label>
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting?t.requesting:t.invite}
        </button>
        {inviteNotice&&<p role={inviteNotice==="invited"?"status":"alert"}>{t[inviteNotice]}{recordedRequestId&&<><br />Request ID: <code>{recordedRequestId}</code></>}</p>}
      </form>}
    {!live?.invitationEnabled&&<div className="readonly-note" role="status">
        <strong>{t.status}</strong>
        <p>{t.explanation}</p>
      </div>}
    <h3>{t.stepsTitle}</h3>
    <ol>{t.steps.map(step=><li key={step}>{step}</li>)}</ol>
    <p className="muted">{t.boundary}</p>
  </section>;
}

import {useEffect,useState,type FormEvent} from "react";
import {platform,PlatformApiError,type ActivationReviewItem,type ReviewDecisionItem} from "./api";
import type {Language} from "./i18n";

// Approval UI is compiled only for explicitly approved local deployments.
// Both P4 disposable and restricted permanent routes require fresh Reviewer MFA.
// Neither handler provisions a Tenant database or activates a route.
const approvalUIEnabled = import.meta.env.VITE_C01_P4_LAB_UI === "1" ||
  import.meta.env.VITE_C01_RESTRICTED_REVIEW_APPROVAL === "1";
type Copy = {
  title:string; intro:string; load:string; more:string; empty:string;
  denied:string; expired:string; failed:string; created:string;
  requester:string; revision:string; eligible:string; own:string;
  copy:string; copied:string; copyFailed:string; boundary:string;
  approve:string; password:string; totp:string; approvalSuccess:string; approvalFailed:string;
  pendingTab:string; approvedTab:string; rejectedTab:string; historyUnavailable:string;
  reject:string; reason:string; rejectSuccess:string; rejectFailed:string;
};
const labels:Record<Language,Copy>={
  en:{
    title:"Activation requests",intro:"Pending company requests for independent Reviewer assessment.",
    load:"Reload requests",more:"Load more",empty:"No pending requests.",
    denied:"Sign in as an MFA-enabled Reviewer with tenant.provision.approve. Platform Owner cannot approve their own request.",
    expired:"Your Platform session expired. Sign in again.",failed:"Unable to load review queue.",
    created:"Requested",requester:"Requested by",revision:"Draft revision",
    eligible:"Independent review eligible",own:"Not eligible for this Reviewer",
    copy:"Copy request details",copied:"Copied",copyFailed:"Copy unavailable",
    boundary:"Approval uses your signed-in Reviewer identity. Confirm with your password and a fresh MFA code. Approval does not create a Tenant database.",
    pendingTab:"Pending",approvedTab:"Approved by me",rejectedTab:"Rejected by me",historyUnavailable:"Decision history unavailable until Platform v58 is installed.",
    reject:"Reject request",reason:"Rejection reason",rejectSuccess:"Request rejected",rejectFailed:"Rejection was not accepted",
    approve:"Approve request",password:"Reviewer password",totp:"Fresh MFA code",approvalSuccess:"Request approved",approvalFailed:"Approval rejected",
  },
  ru:{
    title:"Заявки на активацию",intro:"Ожидающие заявки компаний для независимой проверки Reviewer.",
    load:"Обновить заявки",more:"Загрузить ещё",empty:"Нет ожидающих заявок.",
    denied:"Войдите как Reviewer с MFA и правом tenant.provision.approve. Создатель заявки не может одобрить её сам.",
    expired:"Сессия Platform истекла. Войдите заново.",failed:"Не удалось получить очередь заявок.",
    created:"Создана",requester:"Запросил",revision:"Версия черновика",
    eligible:"Доступна независимая проверка",own:"Недоступна этому Reviewer",
    copy:"Скопировать реквизиты",copied:"Скопировано",copyFailed:"Не удалось скопировать",
    boundary:"Для одобрения используется текущая сессия Reviewer. Подтвердите действие паролем и новым кодом MFA. Подтверждение не создаёт Tenant DB.",
    pendingTab:"Ожидают",approvedTab:"Мои одобрения",rejectedTab:"Мои отказы",historyUnavailable:"История станет доступна после установки Platform v58.",
    reject:"Отклонить заявку",reason:"Причина отказа",rejectSuccess:"Заявка отклонена",rejectFailed:"Не удалось отклонить заявку",
    approve:"Подтвердить заявку",password:"Пароль Reviewer",totp:"Новый код MFA",approvalSuccess:"Заявка одобрена",approvalFailed:"Одобрение отклонено",
  },
  el:{
    title:"Αιτήματα ενεργοποίησης",intro:"Εκκρεμή αιτήματα εταιρειών για ανεξάρτητο έλεγχο.",
    load:"Ανανέωση",more:"Περισσότερα",empty:"Δεν υπάρχουν εκκρεμή αιτήματα.",
    denied:"Συνδεθείτε ως Reviewer με MFA και δικαίωμα tenant.provision.approve. Ο αιτών δεν εγκρίνει το αίτημά του.",
    expired:"Η συνεδρία έληξε. Συνδεθείτε ξανά.",failed:"Αδυναμία φόρτωσης αιτημάτων.",
    created:"Υποβλήθηκε",requester:"Αιτών",revision:"Έκδοση προσχεδίου",
    eligible:"Διαθέσιμο για ανεξάρτητο έλεγχο",own:"Μη διαθέσιμο για αυτόν τον Reviewer",
    copy:"Αντιγραφή στοιχείων",copied:"Αντιγράφηκε",copyFailed:"Αποτυχία αντιγραφής",
    boundary:"Η έγκριση χρησιμοποιεί την τρέχουσα σύνδεση Reviewer και απαιτεί κωδικό πρόσβασης και νέο MFA. Δεν δημιουργείται βάση Tenant.",
    pendingTab:"Εκκρεμή",approvedTab:"Εγκρίθηκαν από εμένα",rejectedTab:"Απορρίφθηκαν από εμένα",historyUnavailable:"Το ιστορικό απαιτεί Platform v58.",
    reject:"Απόρριψη",reason:"Αιτιολογία απόρριψης",rejectSuccess:"Το αίτημα απορρίφθηκε",rejectFailed:"Η απόρριψη απέτυχε",
    approve:"Έγκριση αιτήματος",password:"Κωδικός Reviewer",totp:"Νέος κωδικός MFA",approvalSuccess:"Εγκρίθηκε",approvalFailed:"Απορρίφθηκε η έγκριση",
  },
};
export default function ActivationReviews({access,language}:{access:string;language:Language}){
  const t=labels[language];
  const [items,setItems]=useState<ActivationReviewItem[]>([]);
  const [cursor,setCursor]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<"denied"|"expired"|"failed"|null>(null);
  const [copied,setCopied]=useState<string|null>(null);
  const [reviewerPassword,setReviewerPassword]=useState("");
  const [reviewerTotp,setReviewerTotp]=useState("");
  const [approvalError,setApprovalError]=useState(false);
  const [approved,setApproved]=useState(false);
  const [rejected,setRejected]=useState(false);
  const [decision,setDecision]=useState<"approve"|"reject">("approve");
  const [reason,setReason]=useState("");
  const [selected,setSelected]=useState<ActivationReviewItem|null>(null);
  const [mode,setMode]=useState<"pending"|"approved"|"rejected">("pending");
  const [history,setHistory]=useState<ReviewDecisionItem[]>([]);
  const [historyCursor,setHistoryCursor]=useState("");
  const [historyError,setHistoryError]=useState(false);
  const [historyBusy,setHistoryBusy]=useState(false);
  async function loadHistory(after=""){
    if(historyBusy)return;
    setHistoryBusy(true);setHistoryError(false);
    try{
      const page=await platform.reviewHistory(access,after);
      setHistory(previous=>after?[...previous,...page.decisions.filter(
        item=>!previous.some(x=>x.requestId===item.requestId))]:page.decisions);
      setHistoryCursor(page.nextCursor);
    }catch{setHistoryError(true)}
    finally{setHistoryBusy(false)}
  }
  useEffect(()=>{
    if(mode==="pending")return;
    void loadHistory();
  },[mode,access]);


  useEffect(()=>{
    let mounted=true;
    setBusy(true);
    setError(null);
    setItems([]);
    setCursor("");
    platform.activationReviews(access).then(page=>{
      if(!mounted)return;
      setItems(page.requests);
      setCursor(page.nextCursor);
    }).catch((e:unknown)=>{
      if(!mounted)return;
      setError(e instanceof PlatformApiError&&e.status===403?"denied":
        e instanceof PlatformApiError&&e.status===401?"expired":"failed");
    }).finally(()=>{if(mounted)setBusy(false)});
    return ()=>{mounted=false};
  },[access]);

  async function reload(after=""){
    if(busy)return;
    setBusy(true);setError(null);
    try{
      const page=await platform.activationReviews(access,after);
      if(after){
        setItems(current=>{
          const seen=new Set(current.map(x=>x.requestId));
          return [...current,...page.requests.filter(x=>!seen.has(x.requestId))];
        });
      }else{setItems(page.requests)}
      setCursor(page.nextCursor);
    }catch(e){
      setError(e instanceof PlatformApiError&&e.status===403?"denied":
        e instanceof PlatformApiError&&e.status===401?"expired":"failed");
    }finally{setBusy(false)}
  }
  async function copy(item:ActivationReviewItem){
    const details="Request UUID: "+item.requestId+"\nTenant UUID: "+item.tenantId+
      "\nExpected Draft revision: "+item.expectedRevision;
    try{
      await navigator.clipboard.writeText(details);
      setCopied(item.requestId);
    }catch{setCopied("error")}
  }
  async function approve(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!selected||busy||!selected.canApprove||!/^[0-9]{6}$/.test(reviewerTotp))return;
    setBusy(true);setApprovalError(false);setApproved(false);
    try{
      const result=await platform.approveReview(access,selected.requestId,
        selected.tenantId,selected.expectedRevision,
        reviewerPassword,reviewerTotp);
      if(result.state!=="approved"||result.requestId!==selected.requestId)
        throw new Error("Unexpected approval result");
      setItems(current=>current.filter(item=>item.requestId!==selected.requestId));
      setSelected(null);setApproved(true);
    }catch{setApprovalError(true)}
    finally{setReviewerPassword("");setReviewerTotp("");setBusy(false)}
  }
  async function reject(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!selected||busy||!selected.canApprove||reason.trim()!==reason||
      !reason||reason.length>8000||[...reason].length>2000||
      !/^[0-9]{6}$/.test(reviewerTotp))return;
    setBusy(true);setApprovalError(false);setRejected(false);
    try{
      const result=await platform.rejectReview(access,selected.requestId,
        selected.tenantId,selected.expectedRevision,reason,reviewerPassword,reviewerTotp);
      if(result.state!=="rejected"||result.requestId!==selected.requestId)
        throw new Error("Unexpected rejection result");
      setItems(current=>current.filter(item=>item.requestId!==selected.requestId));
      setSelected(null);setRejected(true);setReason("");
    }catch{setApprovalError(true)}
    finally{setReviewerPassword("");setReviewerTotp("");setBusy(false)}
  }
  return <section className="panel review-panel" aria-busy={busy||historyBusy}>
    <div className="review-actions" role="group" aria-label={t.title}>
      <button className={"btn "+(mode==="pending"?"btn-primary":"btn-outline")} type="button"
        onClick={()=>setMode("pending")}>{t.pendingTab}</button>
      <button className={"btn "+(mode==="approved"?"btn-primary":"btn-outline")} type="button"
        onClick={()=>setMode("approved")}>{t.approvedTab}</button>
      <button className={"btn "+(mode==="rejected"?"btn-primary":"btn-outline")} type="button"
        onClick={()=>setMode("rejected")}>{t.rejectedTab}</button>
    </div>
    {mode!=="pending"&&<div>
      <div className="section-heading">
        <h2>{mode==="approved"?t.approvedTab:t.rejectedTab}</h2>
        <button type="button" className="btn btn-outline"
          disabled={historyBusy} onClick={()=>void loadHistory()}>{t.load}</button>
      </div>
      {historyError&&<p role="alert" className="alert alert-error">{t.historyUnavailable}</p>}
      {!historyError&&history.filter(x=>x.decision===mode).length===0&&!historyBusy&&
       <p className="empty">{t.empty}</p>}
      <div className="review-grid">
        {history.filter(x=>x.decision===mode).map(x=><article className="review-card" key={x.requestId}>
          <div className="record-head"><strong>{x.tenantName}</strong>
           <span className="status-chip">{x.decision}</span></div>
          <p className="record-code">{x.tenantCode}</p>
          <dl className="review-fields">
            <div><dt>{t.requester}</dt><dd>{x.requesterLogin}</dd></div>
            <div><dt>{t.revision}</dt><dd>{x.expectedRevision}</dd></div>
            <div><dt>{x.decision==="approved"?t.approvedTab:t.rejectedTab}</dt>
              <dd>{new Date(x.decidedAt).toLocaleString(language)}</dd></div>
          </dl>
          {x.reason&&<p>{x.reason}</p>}
        </article>)}
      </div>
      {historyCursor&&<button className="btn btn-outline" type="button"
        disabled={historyBusy} onClick={()=>void loadHistory(historyCursor)}>{t.more}</button>}
    </div>}
    {mode==="pending"&&<>
    <div className="section-heading">
      <div><h2>{t.title}</h2><p className="muted">{t.intro}</p></div>
      <button type="button" className="btn btn-outline" disabled={busy}
        onClick={()=>void reload()}>{t.load}</button>
    </div>
    {error&&<div role="alert" className="alert alert-error">{t[error]}</div>}
    {!error&&items.length===0&&!busy&&<p className="empty">{t.empty}</p>}
    <div className="review-grid">
      {items.map(item=><article className="review-card" key={item.requestId}>
        <div className="record-head">
          <strong>{item.tenantName}</strong>
          <span className="status-chip" data-status="draft">Draft</span>
        </div>
        <p className="record-code">{item.tenantCode}</p>
        <dl className="review-fields">
          <div><dt>{t.requester}</dt><dd>{item.requesterLogin}</dd></div>
          <div><dt>{t.revision}</dt><dd>{item.expectedRevision}</dd></div>
          <div><dt>{t.created}</dt><dd>{new Date(item.createdAt).toLocaleString(language)}</dd></div>
        </dl>
        <p className="muted">{item.canApprove?t.eligible:t.own}</p>
        <div className="review-actions">
          <button type="button" className="btn btn-outline"
            onClick={()=>void copy(item)}>{copied===item.requestId?t.copied:
              copied==="error"?t.copyFailed:t.copy}</button>
          {item.canApprove&&approvalUIEnabled&&<>
          <button type="button" className="btn btn-primary"
            onClick={()=>{setSelected(item);setDecision("approve");setApprovalError(false);setApproved(false);setRejected(false)}}>{t.approve}</button>
          <button type="button" className="btn btn-outline"
            onClick={()=>{setSelected(item);setDecision("reject");setApprovalError(false);setApproved(false);setRejected(false)}}>{t.reject}</button>
          </>}
        </div>
      </article>)}
    </div>
    {cursor&&!error&&<button type="button" className="btn btn-outline load-more"
      disabled={busy} onClick={()=>void reload(cursor)}>{t.more}</button>}
    {approved&&<div role="status" className="alert">{t.approvalSuccess}</div>}
    {rejected&&<div role="status" className="alert">{t.rejectSuccess}</div>}
    {selected&&<form className="review-approve-form" onSubmit={e=>void (decision==="approve"?approve(e):reject(e))}>
      <h3>{decision==="approve"?t.approve:t.reject}: {selected.tenantName}</h3>
      {decision==="reject"&&<label>{t.reason}<textarea value={reason} required maxLength={8000}
        onChange={e=>setReason(e.target.value)} disabled={busy} rows={4}/></label>}
      <label>{t.password}<input value={reviewerPassword}
        onChange={e=>setReviewerPassword(e.target.value)} type="password"
        autoComplete="current-password" required disabled={busy}/></label>
      <label>{t.totp}<input value={reviewerTotp}
        onChange={e=>setReviewerTotp(e.target.value)} maxLength={6}
        pattern="[0-9]{6}" autoComplete="one-time-code" inputMode="numeric"
        required disabled={busy}/></label>
      {approvalError&&<p className="alert alert-error" role="alert">{decision==="approve"?t.approvalFailed:t.rejectFailed}</p>}
      <div className="edit-footer">
        <button type="submit" className="btn btn-primary" disabled={busy}>{decision==="approve"?t.approve:t.reject}</button>
        <button type="button" className="btn btn-outline" disabled={busy}
          onClick={()=>{setSelected(null);setReason("");setReviewerPassword("");setReviewerTotp("")}}>{language==="ru"?"Отмена":language==="el"?"Ακύρωση":"Cancel"}</button>
      </div>
    </form>}
    <p className="mail-admin-warning">{t.boundary}</p>
    </>}
  </section>;
}

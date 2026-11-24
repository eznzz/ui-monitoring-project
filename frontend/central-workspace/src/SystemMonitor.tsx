import {useCallback,useEffect,useRef,useState} from "react";
import {platform,type ReviewerEmailOperatorStatus,type SystemServiceHealth} from "./api";
import type {Language} from "./i18n";

type State="live"|"configured"|"unavailable"|"unknown";
type ServiceID="platform"|"central-web"|"platform-db"|"claim"|"email"|"mail"|"c01";
type Service={id:ServiceID;state:State;note:string};
const names:Record<ServiceID,string>={
 platform:"Platform API", "central-web":"Central HTTPS / Nginx", "platform-db":"Platform PostgreSQL",
 claim:"Reviewer Claim Operator",
 email:"Reviewer Invitation + Email Operator",mail:"Mail Operator",c01:"C01 Provisioning Operator",
};
const strings={
 en:{title:"Service monitor",intro:"Read-only checks of the existing Central components. A configured endpoint is not proof that its process is healthy.",
 refresh:"Check now",checking:"Checking…",auto:"Automatically checks every 30 seconds while this page is open.",
 live:"Responding",configured:"Configured",unknown:"Not verified",unavailable:"Unavailable",
 verified:"Responding",notVerified:"Not verified",issues:"Unavailable",
 details:"Current signal",checked:"Last check",never:"No check yet",logs:"Open platform logs",
 platform:"The authenticated Platform API responded.",
 "central-web":"The page was loaded, but Nginx process health is not directly probed.",
 "platform-db":"Platform API validated the session via PostgreSQL; not a standalone PostgreSQL process probe.",
 claim:"Verified Unix peer accepted a connection; claim transaction health is not proven.",
 email:"Email operator returned an authenticated status; SMTP delivery is not tested.",
 emailOff:"The status endpoint is available, but the email operator is disabled.",
 mail:"Verified Unix peer accepted a connection; sending SMTP was not tested.",
 c01:"C01 Operator IPC responded through an authenticated peer check. Provisioning readiness and database creation have NOT been verified.",
 c01Off:"C01 Operator has not been connected to the Platform service-monitor endpoint. This is NOT a provisioning failure.",
 c01Unavailable:"C01 Operator IPC is configured but unreachable. Provisioning readiness has NOT been verified.",
 ipc:"Unix socket responded with verified owner and peer UID; application-level work was not tested.",
 ipcOff:"Operator IPC is not configured in this deployment.",
 ipcFailure:"Trusted Unix socket did not accept the connection. Process availability not confirmed.",
 failure:"Read-only endpoint did not confirm availability; no retry of any write operation.",
 noProbe:"A process probe is not available. Not a failure indication.",
 warning:"No SQL, container, SMTP send or service restart is triggered by this page.",
 },
 ru:{title:"Мониторинг служб",intro:"Проверки существующих компонентов Central только на чтение. Настройка маршрута не доказывает, что процесс работает.",
 refresh:"Проверить сейчас",checking:"Проверяем…",auto:"Автопроверка каждые 30 секунд, пока открыта страница.",
 live:"Отвечает",configured:"Настроен",unknown:"Не проверено",unavailable:"Недоступно",
 verified:"Ответили",notVerified:"Не проверено",issues:"Недоступны",
 details:"Результат проверки",checked:"Последняя проверка",never:"Ещё не проверялось",logs:"Открыть логи платформы",
 platform:"Platform API ответил на запрос с действующей сессией.",
 "central-web":"Страница загружена, но отдельной проверки состояния процесса Nginx пока нет.",
 "platform-db":"Platform API проверил сессию через PostgreSQL; прямого мониторинга процесса PostgreSQL пока нет.",
 claim:"Unix socket проверен по владельцу и UID; выполнение регистрации не проверялось.",
 email:"Получен защищённый ответ Email Operator. SMTP-доставка не проверялась.",
 emailOff:"Endpoint отвечает, но Email Operator выключен.",
 mail:"Unix socket проверен по владельцу и UID; отправка почты не проверялась.",
 c01:"Unix IPC оператора C01 отвечает с проверкой доверенного узла. Готовность Provisioning и возможность создавать базы НЕ подтверждены.",
 c01Off:"C01 Operator ещё не подключён к мониторингу Platform. Это не ошибка Provisioning.",
 c01Unavailable:"IPC C01 Operator настроен, но недоступен. Готовность Provisioning не подтверждена.",
 ipc:"Unix socket ответил, владелец и UID проверены; выполнение рабочих операций не проверялось.",
 ipcOff:"IPC оператора не настроен в этой установке.",
 ipcFailure:"Доверенный Unix socket не принял соединение. Доступность процесса не подтверждена.",
 failure:"Доступность не подтверждена; никаких повторов изменяющих операций не выполнялось.",
 noProbe:"Прямой проверки процесса нет. Это не означает ошибку.",
 warning:"Страница не выполняет SQL-команды, отправку писем, перезапуск контейнеров или изменение служб.",
 },
 el:{title:"Παρακολούθηση υπηρεσιών",intro:"Έλεγχοι μόνο για ανάγνωση. Η ρύθμιση ενός endpoint δεν αποδεικνύει τη λειτουργία της διεργασίας.",
 refresh:"Έλεγχος τώρα",checking:"Έλεγχος…",auto:"Έλεγχος κάθε 30 δευτερόλεπτα όταν η σελίδα είναι ανοικτή.",
 live:"Απαντά",configured:"Ρυθμισμένο",unknown:"Μη επαληθευμένο",unavailable:"Μη διαθέσιμο",
 verified:"Απαντούν",notVerified:"Μη επαληθευμένα",issues:"Μη διαθέσιμα",
 details:"Ένδειξη",checked:"Τελευταίος έλεγχος",never:"Δεν ελέγχθηκε",logs:"Καταγραφές πλατφόρμας",
 platform:"Το Platform API απάντησε με έγκυρη συνεδρία.",
 "central-web":"Η σελίδα φορτώθηκε, χωρίς ανεξάρτητο έλεγχο Nginx.",
 "platform-db":"Η συνεδρία ελέγχθηκε μέσω PostgreSQL, όχι η ίδια η διεργασία.",
 claim:"Ο έμπιστος Unix peer δέχτηκε σύνδεση. Δεν ελέγχθηκε εκτέλεση.",
 email:"Ο Email Operator απάντησε. Δεν ελέγχθηκε παράδοση SMTP.",
 emailOff:"Το endpoint απαντά αλλά ο Email Operator είναι απενεργοποιημένος.",
 mail:"Ο έμπιστος Unix peer δέχτηκε σύνδεση. Δεν εστάλη email.",
 c01:"Το έμπιστο C01 Operator IPC απάντησε. Η ετοιμότητα provisioning ΔΕΝ έχει επαληθευτεί.",
 c01Off:"Το C01 Operator δεν έχει συνδεθεί στην παρακολούθηση Platform.",
 c01Unavailable:"Το C01 Operator IPC έχει ρυθμιστεί αλλά δεν ανταποκρίνεται.",
 ipc:"Ο έμπιστος Unix socket απάντησε. Δεν ελέγχθηκε η εφαρμογή.",
 ipcOff:"Το IPC του operator δεν έχει ρυθμιστεί.",
 ipcFailure:"Ο έμπιστος Unix socket δεν δέχτηκε σύνδεση.",
 failure:"Η διαθεσιμότητα δεν επαληθεύτηκε. Δεν εκτελέστηκαν εγγραφές.",
 noProbe:"Δεν υπάρχει έλεγχος διεργασίας. Αυτό δεν σημαίνει σφάλμα.",
 warning:"Δεν εκτελείται SQL, αποστολή SMTP ή επανεκκίνηση υπηρεσιών.",
 },
} satisfies Record<Language,Record<string,string>>;
const initial:Service[]=(Object.keys(names) as ServiceID[]).map(id=>({id,state:"unknown",note:"noProbe"}));

export default function SystemMonitor({access,language,onLogs}:{
 access:string;language:Language;onLogs:()=>void;
}){
 const t=strings[language];
 const [services,setServices]=useState<Service[]>(initial);
 const [checkedAt,setCheckedAt]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const inFlight=useRef(false);
 const generation=useRef(0);
 const refresh=useCallback(async()=>{
  if(inFlight.current)return;
  inFlight.current=true;setBusy(true);
  const gen=generation.current;
  // All checks use existing authenticated, read-only endpoints. No
  // route is called merely to pretend a container is healthy.
  const checks=await Promise.allSettled([
   platform.me(access),
   platform.reviewerEmailStatus(access),platform.systemServices(access),
  ]);
  if(gen!==generation.current)return;
  const next=initial.map(s=>({...s}));
  const update=(id:ServiceID,state:State,note:string)=>{
   const item=next.find(s=>s.id===id);
   if(item){item.state=state;item.note=note}
  };
  update("platform",checks[0].status==="fulfilled"?"live":"unavailable",
   checks[0].status==="fulfilled"?"platform":"failure");
  // Nginx and PostgreSQL do not have separate authenticated process
  // probes yet. The database response is only inferred from /me.
  update("central-web","unknown","central-web");
  update("platform-db",checks[0].status==="fulfilled"?"configured":"unknown",
    checks[0].status==="fulfilled"?"platform-db":"noProbe");
  if(checks[1].status==="fulfilled"){
   const email=checks[1].value as ReviewerEmailOperatorStatus;
   update("email",email.enabled?"live":"unknown",email.enabled?"email":"emailOff");
  }else update("email","unavailable","failure");
  // Health endpoint proves only a verified local IPC peer connection;
  // it must never be presented as proof of SQL or SMTP readiness.
  if(checks[2].status==="fulfilled"){
   const health=checks[2].value as SystemServiceHealth;
   const mapPeer=(id:ServiceID,key:keyof SystemServiceHealth["peers"])=>{
    const state=health.peers?.[key];
    if(state==="ipc_reachable")update(id,"live",id==="c01"?"c01":"ipc");
    else if(state==="ipc_unavailable")update(id,"unavailable",id==="c01"?"c01Unavailable":"ipcFailure");
    else update(id,"unknown",id==="c01"?"c01Off":"ipcOff");
   };
   mapPeer("claim","reviewer_claim");
   mapPeer("email","reviewer_email");
   mapPeer("mail","mail_operator");
   mapPeer("c01","c01_operator");
  }else{
   update("claim","unknown","claim");
   update("mail","unknown","mail");
   update("c01","unknown","c01");
  }
  setServices(next);setCheckedAt(new Date().toLocaleString(language==="ru"?"ru-RU":language==="el"?"el-GR":"en-GB"));
  inFlight.current=false;setBusy(false);
 },[access,language]);
 useEffect(()=>{
  generation.current++;
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},30000);
  return ()=>{generation.current++;window.clearInterval(timer);inFlight.current=false};
 },[refresh]);
 const live=services.filter(s=>s.state==="live").length;
 const unknown=services.filter(s=>s.state==="unknown"||s.state==="configured").length;
 const unavailable=services.filter(s=>s.state==="unavailable").length;
 return <div className="service-monitor">
  <section className="panel">
   <div className="service-monitor-head">
    <div><div className="eyebrow">VDMS / CENTRAL / SYSTEM</div>
     <h2>{t.title}</h2><p className="muted">{t.intro}</p></div>
    <button className="btn btn-outline" type="button" disabled={busy}
      onClick={()=>void refresh()}>{busy?t.checking:t.refresh}</button>
   </div>
   <div className="service-monitor-summary" aria-live="polite">
    <div><span>{t.verified}</span><strong>{live}</strong></div>
    <div><span>{t.notVerified}</span><strong>{unknown}</strong></div>
    <div><span>{t.issues}</span><strong>{unavailable}</strong></div>
   </div>
   <p className="muted">{t.checked}: {checkedAt??t.never}. {t.auto}</p>
  </section>
  <section className="service-monitor-grid" aria-label={t.title}>
   {services.map(service=><article key={service.id} className="service-monitor-item">
    <div className="service-monitor-item-head"><h3>{names[service.id]}</h3>
     <span className={"service-monitor-state "+service.state}>{t[service.state]}</span></div>
    <p>{t[service.note as keyof typeof t]}</p>
    <span className="service-monitor-meta">{t.details}: {service.id}</span>
   </article>)}
  </section>
  <section className="panel">
   <div className="service-monitor-footer">
    <p className="muted">{t.warning}</p>
    <button className="btn btn-outline" type="button" onClick={onLogs}>{t.logs}</button>
   </div>
  </section>
 </div>;
}

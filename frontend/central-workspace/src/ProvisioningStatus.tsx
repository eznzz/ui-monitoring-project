import {useEffect,useState} from "react";
import {platform,PlatformApiError,type PlatformC01Status} from "./api";
import type {Language} from "./i18n";

const copy={
 en:{title:"Durable provisioning status",loading:"Reading authoritative Platform records...",notInstalled:"Authoritative status API requires Platform v61. Existing audit history remains available.",missing:"No provisioning request registered for this company.",error:"Unable to read status",request:"Request",database:"Database",state:"State",route:"Route",enabled:"Enabled",disabled:"Disabled",receipts:"Verified/claimed step receipts",progress:"Verified milestones",of:"of",stopped:"Execution stopped or was blocked. Reconcile before continuing.",pending:"A stage is pending verification. It may be progressing or require reconciliation; progress is not confirmed.",none:"No step receipts yet",preMigrator:"No migrator receipt exists. The preceding Closed Roles stage is not represented by these receipts; its result must be verified independently before continuation.",noAction:"Read-only for now. Automatic execution through the existing C01 Operator is not connected yet."},
 ru:{title:"Зафиксированное состояние C01",loading:"Чтение реестра Platform...",notInstalled:"Точный API состояния появится после установки Platform v61. История аудита по-прежнему доступна.",missing:"Для компании нет записи Provisioning.",error:"Не удалось прочитать состояние",request:"Заявка",database:"База",state:"Состояние",route:"Маршрут",enabled:"Включён",disabled:"Отключён",receipts:"Квитанции этапов",progress:"Подтверждено этапов",of:"из",stopped:"Выполнение остановлено или заблокировано. Перед продолжением нужна проверка.",pending:"Этап ожидает подтверждения. Он может выполняться либо требовать сверки; успешное завершение пока не установлено.",none:"Квитанций пока нет",preMigrator:"Квитанция Migrator ещё не создана. Результат Closed Roles здесь не хранится; координатор должен отдельно подтвердить этот этап перед продолжением.",noAction:"Пока только чтение. Автоматическое выполнение через существующий C01 Operator ещё не подключено."},
 el:{title:"Καταγεγραμμένη κατάσταση C01",loading:"Ανάγνωση...",notInstalled:"Απαιτείται Platform v61.",missing:"Δεν υπάρχει αίτημα.",error:"Σφάλμα",request:"Αίτημα",database:"Βάση",state:"Κατάσταση",route:"Διαδρομή",enabled:"Ενεργή",disabled:"Ανενεργή",receipts:"Αποδεικτικά",progress:"Επιβεβαιωμένα ορόσημα",of:"από",stopped:"Η εκτέλεση σταμάτησε ή αποκλείστηκε.",pending:"Αναμονή επαλήθευσης του σταδίου.",none:"Δεν υπάρχουν",preMigrator:"Δεν υπάρχει ακόμη απόδειξη migrator. Το Closed Roles απαιτεί ξεχωριστή επιβεβαίωση πριν από τη συνέχεια.",noAction:"Προς το παρόν μόνο ανάγνωση. Η αυτόματη εκτέλεση από τον υπάρχοντα C01 Operator δεν έχει συνδεθεί."},
} as const;

// Progress is counted only from persisted, independently observable milestones.
// The progress bar is NOT a timer and does not assert that an operator is running.
// closed-roles and schema-grant are NOT included: neither has a durable
// receipt in the current status endpoint.
const milestoneTotal=10;
function confirmedMilestones(status:PlatformC01Status):number{
 const verified=new Set(status.receipts.filter(r=>r.state==="verified").map(r=>r.step));
 let result=0;
 // Provisioning request means the original reservation is persisted.
 if(["reserved","database_created","migrations_applied","ready","failed"].includes(status.state))result++;
 if(["database_created","migrations_applied","ready"].includes(status.state))result++;
 if(verified.has("migrator_login"))result++;
 if(verified.has("migrator_db_open"))result++;
 if(["migrations_applied","ready"].includes(status.state))result++;
 for(const name of ["runtime_acl","runtime_login","authn_login","authz_login"]){
  if(verified.has(name))result++;
 }
 if(status.state==="ready"&&status.routeEnabled)result++;
 return result;
}

export default function ProvisioningStatus({access,tenantId,language}:{access:string;tenantId:string;language:Language}){
 const t=copy[language];
 const [value,setValue]=useState<PlatformC01Status|null>(null);
 const [code,setCode]=useState<"loading"|"not-installed"|"missing"|"error"|"ready">("loading");
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  let inFlight=false;
  let completed=false;
  setCode("loading");setValue(null);
  const load=async()=>{
   if(cancelled||inFlight||completed)return;
   inFlight=true;
   try{
    const status=await platform.c01Status(access,tenantId);
    if(cancelled)return;
    setValue(status);setCode("ready");
    // A confirmed READY route is terminal; further requests are unnecessary.
    if(status.state==="ready"&&status.routeEnabled)completed=true;
   }catch(err){
    if(cancelled)return;
    setCode(err instanceof PlatformApiError&&err.status===404?"not-installed":"error");
    if(err instanceof PlatformApiError&&err.status===403)completed=true;
   }finally{inFlight=false;}
  };
  void load();
  // Polling only reads server-persisted evidence. It neither starts jobs nor
  // advances the bar by time; closing the tab has no effect on the operator.
  const timer=window.setInterval(()=>{void load();},7000);
  return ()=>{cancelled=true;window.clearInterval(timer);};
 },[access,tenantId,refresh]);
 return <section className="provisioning-status" aria-label={t.title}>
  <div className="section-heading"><h3>{t.title}</h3>
   <button type="button" className="btn btn-outline" onClick={()=>setRefresh(v=>v+1)}
    disabled={code==="loading"}>↻</button>
  </div>
  {code==="loading"?<p role="status">{t.loading}</p>:
   code!=="ready"||!value?<p className="muted">{code==="not-installed"?t.notInstalled:code==="missing"?t.missing:t.error}</p>:
   <>
    <div className="provisioning-progress">
      <div className="provisioning-progress-label"><strong>{t.progress}</strong>
        <span>{confirmedMilestones(value)} {t.of} {milestoneTotal}</span>
      </div>
      <progress max={milestoneTotal} value={confirmedMilestones(value)}
        aria-label={t.progress} />
      {(value.state==="failed"||value.receipts.some(r=>r.state==="blocked"))&&
        <p className="muted" role="status">{t.stopped}</p>}
      {value.state!=="failed"&&
        !value.receipts.some(r=>r.state==="blocked")&&
        value.receipts.some(r=>r.state==="pending")&&
        <p className="muted" role="status">{t.pending}</p>}
    </div>
    <dl className="provisioning-facts">
     <div><dt>{t.state}</dt><dd>{value.state}</dd></div>
     <div><dt>{t.database}</dt><dd>{value.databaseName}</dd></div>
     <div><dt>{t.route}</dt><dd>{value.routeEnabled?t.enabled:t.disabled}</dd></div>
     <div><dt>{t.request}</dt><dd className="mono">{value.requestId}</dd></div>
    </dl>
    <h4>{t.receipts}</h4>
    {value.receipts.length===0?<><p className="muted">{t.none}</p>
      {value.state==="database_created"&&<p className="muted">{t.preMigrator}</p>}</>:
     <ul className="provisioning-receipts">{value.receipts.map(receipt=>
      <li key={receipt.step}><strong>{receipt.step}</strong>
       <span>{receipt.state}</span><small>{receipt.updatedAt}</small>
      </li>)}</ul>}
   </>}
  <p className="muted">{t.noAction}</p>
 </section>;
}

import {useEffect,useState} from "react";
import {platform,type PlatformLogEvent} from "./api";
import type {Language} from "./i18n";

const labels={
 en:{title:"Tenant provisioning",summary:"Recent C01 events recorded in Platform DB. This is monitoring only; stage execution from UI is not enabled.",refresh:"Refresh progress",loading:"Loading recent C01 audit...",empty:"No C01 events found in the recent log window.",error:"Unable to read C01 audit",at:"Time",event:"Event",outcome:"Outcome"},
 ru:{title:"Создание Tenant DB",summary:"Последние события C01 из Platform DB. Сейчас только наблюдение: запуск этапов из UI ещё не подключён.",refresh:"Обновить состояние",loading:"Загрузка истории C01...",empty:"В последних записях журнала нет событий C01.",error:"Не удалось прочитать журнал C01",at:"Время",event:"Событие",outcome:"Результат"},
 el:{title:"Δημιουργία βάσης Tenant",summary:"Πρόσφατα συμβάντα C01 στην Platform DB. Μόνο παρακολούθηση, χωρίς εκτέλεση σταδίων.",refresh:"Ανανέωση",loading:"Φόρτωση ιστορικού C01...",empty:"Δεν βρέθηκαν πρόσφατα συμβάντα C01.",error:"Αδυναμία ανάγνωσης του C01",at:"Ώρα",event:"Συμβάν",outcome:"Αποτέλεσμα"},
} as const;

export default function CompanyProvisioningTimeline({access,language,code}:{access:string;language:Language;code:string}){
 const t=labels[language];
 const [events,setEvents]=useState<PlatformLogEvent[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  let inFlight=false;
  setLoading(true);setError("");
  const load=async()=>{
   if(cancelled||inFlight)return;
   inFlight=true;
   try{
    const page=await platform.platformLogs(access,0,100);
    if(cancelled)return;
    setEvents(page.events.filter(e=>e.subject===code&&
     (e.category==="provisioning"||e.category==="provisioning-step")));
    setError("");
   }catch{
    if(cancelled)return;
    // Preserve earlier audit records, but mark them as potentially stale.
    setError(t.error);
   }finally{
    inFlight=false;
    if(!cancelled)setLoading(false);
   }
  };
  void load();
  // Recent, bounded owner-audit window; not a full C01 job history.
  const timer=window.setInterval(()=>{void load();},10000);
  return ()=>{cancelled=true;window.clearInterval(timer);};
 },[access,code,revision,language]);
 return <section className="activation-request-area" aria-label={t.title}>
  <div className="section-heading">
   <h3>{t.title}</h3>
   <button type="button" className="btn btn-outline" disabled={loading}
    onClick={()=>setRevision(v=>v+1)}>{t.refresh}</button>
  </div>
  <p className="muted">{t.summary}</p>
  {error&&<p role="alert">{error}</p>}
  {loading?<p role="status">{t.loading}</p>:
   events.length===0?<p className="muted">{t.empty}</p>:
   <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",textAlign:"left"}}>
     <thead><tr><th>{t.at}</th><th>{t.event}</th><th>{t.outcome}</th></tr></thead>
     <tbody>{events.map((event,i)=><tr key={event.at+event.eventType+i}>
      <td>{new Date(event.at).toLocaleString(language)}</td>
      <td>{event.eventType}</td><td>{event.outcome}</td>
     </tr>)}</tbody>
    </table>
   </div>}
 </section>;
}

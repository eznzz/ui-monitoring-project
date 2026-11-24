import {useEffect,useState} from "react";
import {platform,PlatformApiError,type PlatformLogEvent} from "./api";
import type {Language} from "./i18n";

const PAGE_SIZE=15;
const labels={
 en:{title:"Platform logs",refresh:"Refresh",previous:"Previous page",next:"Next page",page:"Page",all:"All categories",time:"Time",category:"Category",event:"Event",outcome:"Outcome",subject:"Company / actor",empty:"No recorded events",loading:"Loading logs...",failed:"Unable to load logs",limit:"Read-only Platform audit. No secrets or raw HTTP requests are exposed."},
 ru:{title:"Логи платформы",refresh:"Обновить",previous:"Предыдущая страница",next:"Следующая страница",page:"Страница",all:"Все категории",time:"Время",category:"Категория",event:"Событие",outcome:"Результат",subject:"Компания / исполнитель",empty:"Записей нет",loading:"Загрузка логов...",failed:"Не удалось загрузить логи",limit:"Только чтение аудита Platform. Секреты и содержимое HTTP-запросов не показываются."},
 el:{title:"Αρχεία καταγραφής πλατφόρμας",refresh:"Ανανέωση",previous:"Προηγούμενη σελίδα",next:"Επόμενη σελίδα",page:"Σελίδα",all:"Όλες οι κατηγορίες",time:"Ώρα",category:"Κατηγορία",event:"Συμβάν",outcome:"Αποτέλεσμα",subject:"Εταιρεία / χειριστής",empty:"Δεν υπάρχουν καταγραφές",loading:"Φόρτωση...",failed:"Αδυναμία φόρτωσης",limit:"Μόνο ανάγνωση ελέγχου πλατφόρμας."},
} as const;

export default function PlatformLogs({access,language}:{access:string;language:Language}){
 const t=labels[language];
 const [events,setEvents]=useState<PlatformLogEvent[]>([]);
 const [offset,setOffset]=useState(0);
 const [next,setNext]=useState<number|null>(null);
 const [category,setCategory]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  let cancelled=false;
  setBusy(true);setError("");
  void platform.platformLogs(access,offset,PAGE_SIZE).then(page=>{
   if(cancelled)return;
   setEvents(page.events);
   setNext(page.nextOffset);
  }).catch(e=>{
   if(cancelled)return;
   setEvents([]);setNext(null);
   setError(e instanceof PlatformApiError ? "HTTP "+e.status : t.failed);
  }).finally(()=>{if(!cancelled)setBusy(false);});
  return ()=>{cancelled=true;};
 },[access,offset,revision,language]);
 const visible=category?events.filter(e=>e.category===category):events;
 const categories=[...new Set(events.map(e=>e.category))].sort();
 return <section className="panel">
  <div className="section-heading">
   <h2>{t.title}</h2>
   <button type="button" className="btn btn-outline" disabled={busy}
     onClick={()=>{setOffset(0);setRevision(v=>v+1);}}>{t.refresh}</button>
  </div>
  <p className="muted">{t.limit}</p>
  <div className="filter-row">
   <label>{t.category}{" "}
    <select value={category} onChange={e=>setCategory(e.target.value)}>
     <option value="">{t.all}</option>
     {categories.map(c=><option key={c} value={c}>{c}</option>)}
    </select>
   </label>
  </div>
  {error&&<div className="alert alert-error" role="alert">{error}</div>}
  {busy?<p role="status">{t.loading}</p>:
   visible.length===0?<p className="muted">{t.empty}</p>:
   <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",textAlign:"left"}}>
     <thead><tr><th>{t.time}</th><th>{t.category}</th><th>{t.event}</th><th>{t.outcome}</th><th>{t.subject}</th></tr></thead>
     <tbody>{visible.map((e,i)=><tr key={e.at+"|"+e.category+"|"+e.eventType+"|"+i}>
      <td>{new Date(e.at).toLocaleString(language)}</td>
      <td>{e.category}</td><td>{e.eventType}</td><td>{e.outcome}</td><td>{e.subject}</td>
     </tr>)}</tbody>
    </table>
   </div>}
  <div className="filter-row">
   <button type="button" className="btn btn-outline" disabled={busy||offset===0}
     onClick={()=>{setOffset(Math.max(0,offset-PAGE_SIZE));}}>{t.previous}</button>
   <span className="muted">{t.page} {Math.floor(offset/PAGE_SIZE)+1} · {events.length===0?0:offset+1}–{offset+events.length}</span>
   <button type="button" className="btn btn-outline" disabled={busy||next===null}
     onClick={()=>{if(next!==null){setOffset(next);}}}>{t.next}</button>
  </div>
 </section>;
}

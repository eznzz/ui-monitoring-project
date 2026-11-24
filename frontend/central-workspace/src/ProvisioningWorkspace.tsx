import {useEffect,useState} from "react";
import type {Language} from "./i18n";
import {platform,type CompanySummary} from "./api";
import CompanyProvisioningTimeline from "./CompanyProvisioningTimeline";
import ProvisioningStatus from "./ProvisioningStatus";
type Props={access:string;language:Language;onOpenCompany:(tenantId:string)=>void};
const labels={
 en:{title:"Tenant provisioning",subtitle:"Review live C01 evidence without restarting irreversible steps.",empty:"No provisioning companies in the currently loaded company list.",choose:"Inspect",loaded:"Companies in provisioning are loaded directly from the Platform registry (first 20 records).",readOnly:"One-click automatic provisioning will be enabled after the existing operator is securely connected and tested."},
 ru:{title:"Активация и Provisioning",subtitle:"Мониторинг подтверждённых событий C01 без повторного запуска необратимых этапов.",empty:"В текущем загруженном списке нет компаний на стадии Provisioning.",choose:"Посмотреть",loaded:"Компании со статусом provisioning загружаются из реестра Platform (первые 20 записей).",readOnly:"Автоматическое создание одним запуском будет доступно после защищённого подключения существующего C01 Operator и тестов."},
 el:{title:"Ενεργοποίηση και Provisioning",subtitle:"Έλεγχος καταγραφών C01 χωρίς επανεκτέλεση.",empty:"Δεν υπάρχουν φορτωμένες εταιρείες σε provisioning.",choose:"Προβολή",loaded:"Φορτώνονται οι πρώτες 20 εταιρείες από το Platform.",readOnly:"Η αυτόματη εκτέλεση θα ενεργοποιηθεί μετά τον ασφαλή έλεγχο του υπάρχοντος C01 Operator."},
} as const;
export default function ProvisioningWorkspace({access,language,onOpenCompany}:Props){
 const t=labels[language];
 const [waiting,setWaiting]=useState<CompanySummary[]>([]);
 const [loading,setLoading]=useState(true);
 const [loadError,setLoadError]=useState(false);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let cancelled=false;setLoading(true);setLoadError(false);
  void platform.list(access,"provisioning","",20).then(page=>{
   if(!cancelled)setWaiting(page.companies.filter(c=>c.status==="provisioning"));
  }).catch(()=>{if(!cancelled){setWaiting([]);setLoadError(true);}})
    .finally(()=>{if(!cancelled)setLoading(false);});
  return ()=>{cancelled=true;};
 },[access,refresh]);
 const [selected,setSelected]=useState<string|null>(null);
 const chosen=waiting.find(c=>c.tenantId===selected)??waiting[0];
 return <div className="central-provisioning">
  <section className="panel">
   <div className="section-heading"><div><h2>{t.title}</h2><p className="muted">{t.subtitle}</p></div></div>
   <p className="muted">{t.loaded}</p>
   <div className="edit-footer"><button type="button" className="btn btn-outline" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>↻ {language==="ru"?"Обновить":language==="el"?"Ανανέωση":"Refresh"}</button></div>
   {loadError?<p role="alert">{language==="ru"?"Не удалось загрузить список":language==="el"?"Σφάλμα φόρτωσης":"Unable to load companies"}</p>:loading?<p role="status">{language==="ru"?"Загрузка…":"Loading…"}</p>:waiting.length===0?<p className="empty">{t.empty}</p>:
   <div className="records">{waiting.map(c=><button key={c.tenantId}
     type="button" className={"record "+(chosen?.tenantId===c.tenantId?"record-selected":"")}
     onClick={()=>setSelected(c.tenantId)}>
    <span className="record-head"><strong>{c.name}</strong><span className="status-chip" data-status={c.status}>{c.status}</span></span>
    <span className="record-code">{c.code}</span>
   </button>)}</div>}
  </section>
  <section className="panel">
   {chosen?<><div className="section-heading">
    <div><h2>{chosen.name}</h2><p className="muted">{chosen.code}</p></div>
    <button type="button" className="btn btn-outline" onClick={()=>onOpenCompany(chosen.tenantId)}>{t.choose}</button>
   </div>
   <ProvisioningStatus access={access} language={language} tenantId={chosen.tenantId}/>
   <CompanyProvisioningTimeline access={access} language={language} code={chosen.code}/>
   <p className="muted">{t.readOnly}</p></>:
    <p className="empty">{t.empty}</p>}
  </section>
 </div>;
}

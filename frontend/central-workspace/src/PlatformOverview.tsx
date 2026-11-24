import type {Language} from "./i18n";
import type {CompanySummary} from "./api";

type Props={
 language:Language;
 companies:CompanySummary[];
 onOpenCompanies:()=>void;
 onOpenProvisioning:()=>void;
 canProvisioning:boolean;
};
const strings={
 en:{title:"Platform overview",subtitle:"Central management and current operational areas",companies:"Companies loaded",provisioning:"Provisioning in progress",active:"Active among loaded",companyNote:"Counts reflect the company records currently loaded in this browser, not platform-wide totals.",companyAction:"Open companies",operationsAction:"Open provisioning",security:"Security",securityText:"Reviewer approvals and Platform Owner controls remain independent.",system:"System settings",systemText:"Mail services, diagnostics and owner-only logs are grouped separately."},
 ru:{title:"Обзор платформы",subtitle:"Управление Central и состояние доступных рабочих областей",companies:"Загружено компаний",provisioning:"Компаний в Provisioning",active:"Активных среди загруженных",companyNote:"Показатели рассчитаны по загруженным в браузере компаниям, а не по всей платформе.",companyAction:"Открыть компании",operationsAction:"Открыть Provisioning",security:"Безопасность",securityText:"Подтверждение Reviewer и полномочия Platform Owner разделены.",system:"Системные настройки",systemText:"Почта, диагностика и логи владельца находятся в отдельных разделах."},
 el:{title:"Επισκόπηση πλατφόρμας",subtitle:"Κεντρική διαχείριση",companies:"Φορτωμένες εταιρείες",provisioning:"Σε provisioning",active:"Ενεργές",companyNote:"Οι μετρήσεις αφορούν μόνο τις φορτωμένες εγγραφές.",companyAction:"Εταιρείες",operationsAction:"Provisioning",security:"Ασφάλεια",securityText:"Ανεξάρτητα δικαιώματα έγκρισης.",system:"Ρυθμίσεις",systemText:"Ξεχωριστές ενότητες υπηρεσιών και καταγραφής."},
} as const;
export default function PlatformOverview({language,companies,onOpenCompanies,onOpenProvisioning,canProvisioning}:Props){
 const t=strings[language];
 const provisioning=companies.filter(c=>c.status==="provisioning").length;
 const active=companies.filter(c=>c.status==="active").length;
 return <div className="central-overview">
  <section className="panel">
   <div className="section-heading"><div><h2>{t.title}</h2><p className="muted">{t.subtitle}</p></div></div>
   <div className="overview-metrics">
    <div><span>{t.companies}</span><strong>{companies.length}</strong></div>
    <div><span>{t.provisioning}</span><strong>{provisioning}</strong></div>
    <div><span>{t.active}</span><strong>{active}</strong></div>
   </div>
   <p className="muted">{t.companyNote}</p>
   <div className="edit-footer">
    <button type="button" className="btn btn-primary" onClick={onOpenCompanies}>{t.companyAction}</button>
    {canProvisioning&&<button type="button" className="btn btn-outline" onClick={onOpenProvisioning}>{t.operationsAction}</button>}
   </div>
  </section>
  <div className="overview-secondary">
   <section className="panel"><h3>{t.security}</h3><p className="muted">{t.securityText}</p></section>
   <section className="panel"><h3>{t.system}</h3><p className="muted">{t.systemText}</p></section>
  </div>
 </div>;
}

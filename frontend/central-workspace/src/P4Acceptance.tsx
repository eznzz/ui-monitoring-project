import {useState} from "react";
import type {Language} from "./i18n";

// Browser-only acceptance guide. It NEVER reads SQL, runs migrations, marks
// receipts as verified, publishes READY or calls the privileged C01 operator.
type CopyState = "idle" | "copied" | "blocked";
const reviewed = "532f28b26beacfd3d2d46fd60875407edb4033fb";
const checks = [
  "Git / Docker Desktop / existing Compose project inventory",
  "New disposable Platform and independent Tenant PostgreSQL clusters",
  "Requester Draft / independent Reviewer MFA approval",
  "Restricted reserve / closed create / NOLOGIN role broker",
  "SCRAM migrator login, verified open, pinned Tenant v29",
  "Runtime ACL / Runtime, AuthN, AuthZ logins / six receipts",
  "READY routing, signed proof, Central restart and negative tests",
] as const;
const labels: Record<Language,{
  title:string;intro:string;readOnly:string;source:string;run:string;
  inspect:string;copy:string;copied:string;blocked:string;owner:string;
  instruction:string;steps:string;pending:string;ids:string;request:string;tenant:string;
  valid:string;companies:string;warning:string;reference:string;testResult:string;
  noEvidence:string;privacy:string;
}> = {
  en:{
    title:"P4 manual acceptance",intro:"A guided review of a NEW isolated local lab; not the CI run or a production deployment.",
    readOnly:"Guided mode — no privileged operations",source:"Reviewed C01 source",run:"Last successful OPS-02 run",
    inspect:"Windows safe inventory",copy:"Copy read-only commands",copied:"Copied",blocked:"Clipboard unavailable",
    owner:"Requester / Reviewer",instruction:"Use the existing Companies screen to create a Draft and submit the activation request. Independent Reviewer approval and operator stages are separate protected operations.",
    steps:"Acceptance evidence",pending:"Not independently verified",ids:"Test identities (held only in browser memory)",
    request:"Activation Request UUID",tenant:"Tenant UUID",valid:"These IDs are reference-only. Entering them never advances a stage.",
    companies:"Go to Companies",warning:"Never repeat an uncertain or committed attempt, reuse an AttemptID, run against an existing Docker volume, or paste secrets into this screen.",
    reference:"CI proof is not Windows acceptance",testResult:"Automated acceptance: PASS. Local manual acceptance: NOT VERIFIED.",
    noEvidence:"The current Platform API has no protected C01 stage-evidence endpoint. No step below is shown as PASS until the backend can attest it.",
    privacy:"No passwords, TOTP values, SQL URLs or operator secrets belong in this UI."
  },
  ru:{
    title:"Ручная приёмка P4",intro:"Пошаговая проверка НОВОЙ изолированной локальной среды, отдельно от CI и рабочих серверов.",
    readOnly:"Режим навигации — без привилегированных операций",source:"Проверенный исходный код C01",run:"Последняя успешная проверка OPS-02",
    inspect:"Безопасная проверка Windows",copy:"Скопировать команды просмотра",copied:"Скопировано",blocked:"Буфер обмена недоступен",
    owner:"Requester / Reviewer",instruction:"Создай Draft и заявку на активацию через существующую вкладку «Компании». Независимое MFA-согласование Reviewer и действия оператора выполняются отдельно.",
    steps:"Этапы и доказательства",pending:"Факт выполнения не подтверждён",ids:"Идентификаторы теста (только в памяти браузера)",
    request:"UUID заявки на активацию",tenant:"UUID Tenant",valid:"Эти UUID служат только ориентиром. Ввод не запускает этапы.",
    companies:"Открыть «Компании»",warning:"Запрещено повторять операцию с неопределённым результатом, переиспользовать AttemptID, подключать существующие Docker-тома и вводить сюда секреты.",
    reference:"Успешный CI не равен приёмке Windows",testResult:"Автоматический P4: PASS. Локальная ручная приёмка: НЕ ПОДТВЕРЖДЕНА.",
    noEvidence:"Существующий Platform API не предоставляет защищённый эндпоинт доказательств этапов C01. Ни один этап не помечается PASS без независимого подтверждения сервером.",
    privacy:"Пароли, TOTP, SQL-адреса и секреты оператора здесь не вводятся."
  },
  el:{
    title:"Χειροκίνητη αποδοχή P4",intro:"Οδηγός για ένα ΝΕΟ απομονωμένο τοπικό περιβάλλον, ανεξάρτητο από το CI και την παραγωγή.",
    readOnly:"Λειτουργία καθοδήγησης — χωρίς προνομιούχες ενέργειες",source:"Ελεγμένη έκδοση C01",run:"Τελευταία επιτυχής δοκιμή OPS-02",
    inspect:"Ασφαλής έλεγχος Windows",copy:"Αντιγραφή εντολών μόνο ανάγνωσης",copied:"Αντιγράφηκε",blocked:"Το πρόχειρο δεν είναι διαθέσιμο",
    owner:"Requester / Reviewer",instruction:"Δημιουργήστε Draft και αίτημα ενεργοποίησης στην καρτέλα Companies. Η ανεξάρτητη έγκριση MFA και ο operator παραμένουν ξεχωριστές ενέργειες.",
    steps:"Στάδια και αποδεικτικά",pending:"Δεν έχει επαληθευτεί",ids:"Αναγνωριστικά δοκιμής (μόνο στη μνήμη)",
    request:"UUID αιτήματος ενεργοποίησης",tenant:"UUID Tenant",valid:"Τα UUID είναι μόνο για αναφορά. Δεν εκτελείται καμία ενέργεια.",
    companies:"Μετάβαση στις εταιρείες",warning:"Μην επαναλαμβάνετε αβέβαιες ενέργειες, μην επαναχρησιμοποιείτε AttemptID και μην εισάγετε μυστικά στοιχεία.",
    reference:"Η επιτυχία του CI δεν ισοδυναμεί με αποδοχή Windows",testResult:"Αυτόματη αποδοχή: PASS. Τοπική αποδοχή: ΜΗ ΕΠΑΛΗΘΕΥΜΕΝΗ.",
    noEvidence:"Το Platform API δεν έχει ακόμη προστατευμένο endpoint αποδείξεων C01. Κανένα στάδιο δεν εμφανίζεται ως PASS χωρίς έλεγχο.",
    privacy:"Μην εισάγετε κωδικούς, TOTP, SQL URLs ή μυστικά του operator."
  }
};
const commands = [
  "git status -sb",
  "git rev-parse HEAD",
  "docker context show",
  "docker info --format '{{.OSType}}'",
  "docker compose ls --all",
  "docker volume ls",
].join("\n");

export default function P4Acceptance({language,onOpenCompanies}:{
  language:Language;onOpenCompanies:()=>void;
}){
  const t=labels[language];
  const [requestId,setRequestId]=useState("");
  const [tenantId,setTenantId]=useState("");
  const [copyState,setCopyState]=useState<CopyState>("idle");
  async function copyPreflight(){
    try{
      await navigator.clipboard.writeText(commands);
      setCopyState("copied");
    }catch{setCopyState("blocked");}
  }
  const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
  const cleanId=(s:string)=>s.trim().slice(0,36);
  return <section className="panel p4-panel" aria-label={t.title}>
    <div className="section-heading">
      <div><span className="eyebrow">CENTRAL-01 · P4 / LOCAL LAB</span><h2>{t.title}</h2></div>
      <span className="status-chip">{t.readOnly}</span>
    </div>
    <p className="p4-intro">{t.intro}</p>
    <div className="p4-metadata">
      <div><span className="mail-admin-label">{t.source}</span>
        <code>{reviewed.slice(0,12)}</code></div>
      <div><span className="mail-admin-label">{t.run}</span>
        <a href="https://github.com/developerpiter/vdms/actions/runs/43183593714" target="_blank" rel="noopener noreferrer">#43183593714</a></div>
    </div>
    <p className="p4-notice"><strong>{t.reference}.</strong> {t.testResult}</p>
    <div className="p4-guide">
      <section>
        <h3>{t.inspect}</h3>
        <pre className="p4-code">{commands}</pre>
        <button className="btn btn-outline" type="button" onClick={()=>void copyPreflight()}>
          {copyState==="copied"?t.copied:copyState==="blocked"?t.blocked:t.copy}
        </button>
      </section>
      <section>
        <h3>{t.owner}</h3>
        <p>{t.instruction}</p>
        <button className="btn btn-primary" type="button" onClick={onOpenCompanies}>
          {t.companies}
        </button>
      </section>
    </div>
    <h3>{t.ids}</h3>
    <div className="p4-identities">
      <label>{t.request}
        <input value={requestId} onChange={e=>setRequestId(cleanId(e.target.value))}
          inputMode="text" maxLength={36} autoComplete="off"
          aria-invalid={requestId!==""&&!uuid.test(requestId)}/>
      </label>
      <label>{t.tenant}
        <input value={tenantId} onChange={e=>setTenantId(cleanId(e.target.value))}
          inputMode="text" maxLength={36} autoComplete="off"
          aria-invalid={tenantId!==""&&!uuid.test(tenantId)}/>
      </label>
    </div>
    <p className="muted">{t.valid}</p>
    <h3>{t.steps}</h3>
    <p className="p4-notice">{t.noEvidence}</p>
    <ol className="p4-steps">
      {checks.map((step,i)=><li key={step}>
        <span className="p4-number">{String(i+1).padStart(2,"0")}</span>
        <span>{step}</span>
        <span className="p4-unverified">{t.pending}</span>
      </li>)}
    </ol>
    <p className="p4-warning"><strong>{t.warning}</strong></p>
    <p className="muted">{t.privacy}</p>
  </section>;
}

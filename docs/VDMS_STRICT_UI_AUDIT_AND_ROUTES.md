# VDMS Central Platform — UI contract audit and route model

**Актуализировано:** 2026-11-23. **Целевой Preview:** HTML/CSS/JS, без сети и без реального доступа. Изменяем только `eznzz/ui-monitoring-project`.

## Источник истины

- [VDMS Central Workspace](https://github.com/developerpiter/vdms/blob/main/web/central-workspace/src/App.tsx): `permittedSection` (секции, permission и feature flags), старт после login, Owner/Reviewer separation.
- [Platform API types/endpoints](https://github.com/developerpiter/vdms/blob/main/web/central-workspace/src/api.ts).
- [Reviewer decision UI](https://github.com/developerpiter/vdms/blob/main/web/central-workspace/src/ActivationReviews.tsx): `canApprove`, личная история, независимость, feature gates, MFA.
- [Platform API contract](https://github.com/developerpiter/vdms/blob/docs/central-platform-api/docs/api/central-platform.md): права, endpoint, ошибки, поля.
- [Platform SQL permissions](https://github.com/developerpiter/vdms/blob/main/migrations/platform/000040_independent_reviewer.up.sql).
- **Visual:** `eznzz/ui-monitoring-project` `components/`, `modules/`, `tokens/`, `style.css`, `modules/shared/{ui,template}.css`. Никаких альтернативных дизайн-токенов.

## Главный принцип

**VDMS не имеет фиксированного `Platform Viewer`/ `Platform Reader` как типовой роли.** Platform реализован через `admin_principals` + явные `admin_permissions`. Право `tenant.read` реально существует, но не означает предустановленную роль или учётную запись Reader. Предыдущая тестовая фикстура удалена. В демо оставлены только две сквозные персоны: Owner и независимый Reviewer.

## Простая карта экранов

**Точка входа:** `/preview/` → отдельная карточка Owner или Reviewer → общий стандартный Login → соответствующее workspace. Без заданного маршрута Owner попадает в `#overview`, Reviewer — в `#activation`. Прямые ссылки на разрешённые разделы сохраняются. Прямая ссылка в недоступный раздел не обходит permission checks; показывается разрешённая стартовая страница.

| Workspace / route | Серверный permission | Feature flags / условия | Демонстрационный результат |
| --- | --- | --- | --- |
| Owner `#companies` | `tenant.read` или `tenant.create` в nav; чтение фактически `tenant.read` | JWT + /me | Реестр (из memory fixtures), «Показать ещё» по 5/10 записей над cursor-like dataset; create draft, edit expectedRevision, 409 |
| Owner `#overview` | `tenant.read` или `tenant.create` | Загруженные CompanySummary | KPI только по загруженным компаниям, фиктивные Tenant users/modules **отдельно от Platform API** |
| Owner `#provisioning` | `tenant.create` + `tenant.activate` + чтение | C01 endpoint и operators | read-only C01 evidence; никакого запуска SQL, создания базы или маршрута |
| Reviewer `#activation` | `tenant.provision.approve` | Queue read независимо от режима approval | Только очереди Owner-запросов и личная история текущего Reviewer |
| Reviewer Approve / Reject | `tenant.provision.approve`, независимая идентичность, `canApprove` | `VITE_C01_P4_LAB_UI` или `VITE_C01_RESTRICTED_REVIEW_APPROVAL`; backend `VDMS_PLATFORM_API_RESTRICTED_REVIEW_APPROVAL_ENABLE=1` + SQL v57/v59 | В стандартном режиме только чтение; restricted/lab — mock consent + validated reason, без секретов и записи в сервер |
| Owner `#reviewer` | `platform.reviewer.bootstrap` | Reviewer Operator, owner step-up | Приглашение → статус → Email Send → Claim → Owner Confirmation; никакой настоящей выдачи права |
| Owner `#email-operator` | `platform.reviewer.bootstrap` | Reviewer Email Operator | status/template revision mock; SMTP не отправляется |
| Owner `#monitor`, `#logs` | `tenant.create` + `tenant.activate` | JWT, owner verification | Health IPC и platform logs на фикстурах |
| Owner `#mail` | `platform.mail.manage` или `platform.reviewer.bootstrap` (as VDMS App.tsx nav) | `VITE_PLATFORM_MAIL_ADMIN_UI=1`, отдельные backend permissions для diagnostics | Только LAB, выключено по умолчанию |
| Owner `#p4` | `platform.reviewer.bootstrap` | `VITE_C01_P4_LAB_UI=1` | read-only checklist без acceptance действий |
| Общий `#contract` | публичные правила DEMO | — | Оформление `mp-info-strip`, архитектурные предупреждения |

**Ограничения:** `#contract` — документационная страница нашего макета, не серверный раздел VDMS. Все серверные флаги конфигурируются администраторами вне браузера; переключатель на Login лишь задаёт тестовую фикстуру доступности этих функций.

## Сквозные данные и инварианты

- `companies` и `reviews` хранятся в одном JavaScript-контексте вкладки, без `localStorage` и без HTTP. Восемь CompanySummary и отдельные Tenant-фактурные users/modules не претендуют на действительное состояние VDMS.
- `CompanySummary.code` соответствует `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` (длина 2–63). Восемь seed-кодов нормализованы в lowercase. `Tenant` mock mapping использует верхний регистр только как внутренний ключ фикстуры.
- `company.status` ограничен `draft | provisioning | active | suspended | disabled`; наличие разрешённой заявки или approval само по себе статус не изменяет.
- Owner создаёт draft и может запросить активацию, не может принимать решения Reviewer. Reviewer видит только поля queue, не Platform company directory/overview, и не может пригласить Reviewer.
- Reviewer очередь доступна в режиме standard (read-only), но кнопки решения показываются только при явном restricted/lab тестовом флаге. Реальное подтверждение требует пароль + свежий MFA; публичная форма их не принимает.
- В `reviewDecisions` хранится `reviewerActorId`; вкладки истории выбирают решения только текущего Reviewer. Вторая заявка с `state=requested` к тому же draft не создаётся. Перед решением проверяется draft+expectedRevision, иначе mock 409.
- Для непосредственного просмотра возможностей Reviewer кнопка `Загрузить 2 демо-заявки` создаёт заявки **отдельного Owner** на существующие компании `north` и `delta`. Действие невозможно в пустом режиме и не изменяет CompanySummary.
- Отображаемые Dataset (demo/empty) согласованно переключают компании/заявки/пользователей/модули и сбрасывают mock изменения; реальной Tenant DB и лицензий не касаются.

## Почему не пересоздавали дизайн

Существующая эталонная система уже имеет `sidebar`, `topbar`, `mp-card`, `mp-btn`, `mp-basic-table`, `mp-info-strip`, `mp-login--split`. Новая навигация использует те же узлы и скрывает недоступные `li`, а не создаёт новую систему CSS. Preview упрощён до двух рабочих пространств.

## До настоящей 100% функциональности с VDMS

UI mock остаётся **концептом**; он не может подтверждать реальную работу сервера. Для реальной parity необходимы React/TypeScript port, `/me` permissions из текущей сессии, API adapter, Server Feature Flags, bearer token только в памяти, HttpOnly refresh cookie, запросы с UUIDv4/expectedRevision, реальные ошибки и проверка по тестовому стенду VDMS. Только после этого уместно говорить о 100% контрактной и runtime функциональной эквивалентности.

## Главный экран и постепенная загрузка

Owner после mock-входа без явной цели открывает **Обзор платформы**. Reviewer — заявки на активацию. Явная ссылка `#companies` ведёт непосредственно к реестру после mock-входа.

Компании: первые 5 записей, далее `Показать ещё N`; выбор 5/10; фильтр и поиск работают по всему загруженному в браузере набору. Выбор компании из Overview раскрывает достаточное число строк для доступа к её карточке. Реальный VDMS `GET /companies` использует cursor и nextCursor, который в будущем должен использоваться для догрузки данных.

Журнал: первые 5 записей, далее `Показать ещё N`; выбор 5/10; смена категории сбрасывает отображение на первую порцию. Реальный VDMS `GET /platform-logs` использует limit/offset. При реальном подключении следующая порция должна запрашиваться с offset равным количеству ранее загруженных строк, без повторного отображения.

Кнопка скрыта после последней записи и при пустом результате. Стили только штатные `mp-page-tools`, `mp-btn`, `mp-field`, `mp-help`, `mp-basic-table`.

## Поиск по компаниям и календарно-временные фильтры журнала

- **Компании:** поиск без учёта регистра по `CompanySummary.name`, `code`, `tenantId` и полям загруженного `profile`; совместим с фильтром статуса, кнопкой сброса и догрузкой по 5/10 записей. В UI это **локальный поиск по загруженным данным**. Серверный `GET /companies` поддерживает только `status`, `after`, `limit`; произвольный `search` нельзя добавлять в API-запрос без расширения контракта.
- **Журнал:** отдельные поля `Дата с`, `Дата по`, `Время с`, `Время по`, плюс категория и поиск по событию, объекту и результату. Диапазоны включительные, время суток фильтруется для **каждой даты** в диапазоне; `at` в фикстуре хранится ISO UTC. Интервал с началом позже конца помечается ошибкой; переход через полночь требует отдельного диапазона, либо дополнительной договорённости о UX.
- **Сброс фильтров** восстанавливает начальные 5 записей. Поиск и фильтры применяются к текущим загруженным 16 mock-событиям, а `Показать ещё` добавляет новые строки уже отфильтрованного набора без дублирования.
- **Контракт:** `GET /platform-logs` принимает только `limit` и `offset`, возвращает `events` и `nextOffset`. Фильтрация по датам, времени, категории и тексту пока **не поддерживается сервером**, поэтому нельзя считать её полной исторической выборкой без загрузки всех доступных страниц или отдельного расширения API. При подключении real API требуется обеспечить корректность полноты и права Owner.

## Экран входа, согласованный с актуальным VDMS

- Поля формы: `Platform login` (строка до 128 символов), `Password` (`type=password`) и `Authenticator code` (ровно шесть цифр из стороннего приложения TOTP), кнопка `Sign in`. Это те же три поля, что и в `web/central-workspace/src/App.tsx` VDMS.
- Публичный mock не запрашивает и не проверяет настоящие секреты или MFA. Для демонстрации используйте **только вымышленные значения**: `owner.demo` / `reviewer.demo`, пароль `demo-only`, код `000000`. Никакого HTTP, записи в cookie, storage, лог или URL. Поля пароля и кода очищаются после отправки.
- Роль не выбирается в форме отдельным селектором: `owner.demo` сразу открывает `#overview`, `reviewer.demo` — `#activation`. Прямые разрешённые ссылки сохраняются. Неавторизованный переход не минует форму.
- Для специальных тестов доступны отдельные исключительно mock-логины `lab.owner.demo` (LAB права почтовой диагностики) и `readonly.reviewer.demo` (Reviewer queue без approve). **Это не реальные роли, учётные записи или способы включения серверных flags VDMS**.
- Убраны управляемые пользователем статусы HTTP и серверный режим. Реальная аутентификация VDMS использует `POST /login` + `POST /access` + `GET /me` с server-side verification, но ни один из этих запросов не вызывается в концепте.

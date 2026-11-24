# VDMS ↔ Monitoring Project: матрица соответствия UI и API (v0.1)

**Дата анализа:** 2026-11-23  
**Статус:** рабочая спецификация, не утверждённый production-контракт  
**Место изменений:** только `eznzz/ui-monitoring-project`. Источники `developerpiter/vdms` используются исключительно для чтения.

## 1. Источники и приоритет

1. [VDMS Platform API](https://github.com/developerpiter/vdms/blob/docs/central-platform-api/docs/api/central-platform.md), ветка `docs/central-platform-api`: описание маршрутов и требований к запросам. Документ сообщает, что маршруты сверены с `main` на коммите `a651ddd0`; конфигурация конкретного стенда требует отдельной проверки.
2. [VDMS Central Workspace API client](https://github.com/developerpiter/vdms/blob/main/web/central-workspace/src/api.ts), `main`: текущие клиентские интерфейсы и пример правил сетевого взаимодействия. Версия `main` может быть новее снимка из документации.
3. [VDMS architectural decisions](https://github.com/developerpiter/vdms/blob/main/docs/DECISIONS.md), [Central Node ADR](https://github.com/developerpiter/vdms/blob/main/docs/ADR_CENTRAL_CATALOG_REACT_UI_2026-10-31.md): одобренная целевая архитектура; «accepted» не означает, что поведение уже работает на стенде.
4. [Monitoring Project modules README](../modules/README.md), [Platform UI](../modules/platform/platform.js), [Tenant UI](../modules/tenant/tenant.js), [mock store](../modules/shared/app.js): текущее визуальное демо.
5. [Monitoring Project frontend decisions](../architecture/DECISIONS.md) — первоначальная концепция. При конфликте с подтверждённым VDMS API нельзя незаметно превращать пожелание UI в существующий маршрут backend.

**Правило достоверности:** «есть в коде», «описано в API», «условно подключено на сервере», «планируется» и «показывается только в демо» — разные статусы. Перед реализацией каждого сценария фиксировать версию/commit исходного API и наличие маршрута на конкретном стенде. В документации API есть флаги операторов и SQL-предпосылки для ряда операций.

## 2. Матрица Platform UI

| UI / сценарий | Существующее демо | Контракт Central Platform API (все пути имеют префикс `/internal/platform-admin`) | Результат анализа / действие |
|---|---|---|---|
| Platform Login | `modules/auth/login.html`: демонстрационный переход по роли | `POST /login` (loginName/password/totp) → `POST /access` → `GET /me` | **Переделать сценарий:** отдельная Platform-сессия, MFA, только разрешения с сервера; демо-вход не выдавать за аутентификацию |
| Профиль и права | Роли выбираются/имитируются в демо | `GET /me` → `actorId, login, permissions` | Построить матрицу доступных разделов по permissions; сервер — окончательная проверка |
| Выход/истечение сессии | Демо-навигация | `POST /logout`, `POST /access`, `POST /refresh` | Макетировать 401, истечение токена и отказ восстановления; не хранить токены/пароли в localStorage |
| Список компаний | `modules/platform/`: массив `data.companies` из localStorage | `GET /companies?status&after&limit`, `tenant.read`; `{companies,nextCursor}` | Сохранить компоновку; заменить форму данных на `tenantId/code/name/status/revision`; cursor pagination |
| Создание компании | Локальная форма: выбор `objectTypes`, привязка дополнительных demo-полей | `POST /companies` с `requestId` UUID v4, `code`, `name`, `tenant.create`; результат `draft` | **Расхождение:** backend-запрос НЕ содержит объектный тип или owner email. Не представлять эти поля как действующие поля Platform API |
| Просмотр компании | Локальная карточка и связанные mock-записи | `GET /companies/{tenantID}`, `tenant.read`, карточка с `profile` | Карточка по UUID Tenant, без строк подключения к БД |
| Редактирование компании | Прямое изменение demo-объекта | `PATCH /companies/{tenantID}` с `expectedRevision`, `tenant.draft.update`; только draft | Показать ограничения статуса и ошибку 409; форма `name` + profile fields |
| Состояния компании | Статусы/архивирование в концепции UI | `draft, provisioning, active, suspended, disabled` | Не вводить `archived` как реальный API-status без отдельного контракта; status ≠ готовность C01 |
| Заявка на активацию | Не соответствует отдельному процессу Reviewer | `POST /companies/{tenantID}/activation-requests`, `requestId, expectedRevision`, `tenant.activate` | Добавить отдельный сценарий, ожидание и показ статуса заявки |
| Очередь Reviewer | Нет полноценного экрана в текущем макете | `GET /activation-reviews`, `tenant.provision.approve`; `canApprove` — подсказка | Добавить очередь, фильтры/пагинацию; `canApprove` не является разрешением на сервере |
| Одобрение/отклонение Reviewer | Нет полноценного сценария | `POST /activation-reviews/{requestID}/approve|reject` с password/totp; условия SQL-функций/флагов | Добавить диалог повторного подтверждения, запрет self-approval и ошибки; доступность зависит от стенда |
| История решений | Нет | `GET /activation-reviews/history` | Отдельная read-only страница; маршрут конфигурационно зависим |
| Приглашения Reviewer | Нет | `/reviewers/status`, `/reviewers/invitations`, `/reviewer/claim`, owner-confirm | Отдельный workflow со статусами requested/queued/sent/claimed; Claim без Platform JWT; оператор/флаги |
| Почта Reviewer | Нет | `/reviewer/email/status`, `/reviewer/email/template`, `/reviewer/email/password`, send | Создать отдельные экраны и состояния «оператор недоступен»; не имитировать отправку письма как факт |
| Platform Mail | Нет | `GET /mail/settings`, `POST /mail/diagnostics` | Диагностика `status=passed|failed` даже при HTTP 200; секреты не сохранять в браузере |
| Журнал платформы | Нет | `GET /platform-logs?limit&offset`, `platform-owner` + MFA и требуемые права | Read-only журнал с `nextOffset`, без придуманных уровней доступа |
| Модули/лицензии | Mock `modules`, `licenses`, `licenseRequests`, ручное «оплачено» | В рассматриваемом Platform API отсутствует прямое соответствие существующим демо-кнопкам | Оставить только явно обозначенным концептом до проверки другого контракта/реальных endpoint. Нельзя выдавать имитацию за Platform API |

## 3. Tenant UI — отдельная область проверки

| Существующий экран | Что реально известно | Следующий шаг |
|---|---|---|
| `modules/tenant/index.html` — пользователи | VDMS разделяет Platform identity и Tenant identity/RBAC; Tenant запросы проходят через `/api/v1/*`, не Platform JWT | Отдельная матрица Tenant REST API, прав, object scope, состояний пользователя |
| Суда и `modules/tenant/vessel.html` | VDMS развивает универсальные `core.objects`, типы и атрибуты; морская специфика — предметный слой | Проверить object CRUD, схемы полей, права на конкретные объекты и статус реализации |
| Лицензии/подписки | Модульные entitlements централизованы и не равны разрешениям Tenant-пользователя | Не допускать включение модулей обычным Tenant-UI без подтверждённого Platform API |
| Языки | Существуют `core.languages` и отдельные правила UI-localization; часть маршрутов описана как кандидат | Проверить фактическую доступность `GET /api/v1/tenant/languages` в целевом runtime, не считать кандидата production |
| Offline/Remote Node | Целевая архитектура, а не доказательство готового сценария | Отдельная будущая UX-матрица по фактически реализованным контрактам |

## 4. Правила прототипирования

- Реализуем **только HTML/CSS/JS** в `ui-monitoring-project`; существующую дизайн-систему, корневой шаблон, Light/Dark и мобильную адаптацию сохраняем.
- В макете допустимы fixture/mock-ответы, но их структура и границы ошибок совпадают с соответствующей версией API. Никакой mock не должен выдавать себя за реально выполненную серверную операцию.
- Каждое действие помечаем `API-confirmed`, `feature-gated`, `candidate` либо `concept-only` в проектной документации. Эти метки **не** являются реальными backend enum.
- Platform access token в реальном клиенте — только в памяти; refresh-cookie HttpOnly/Secure/SameSite=Strict; same-origin HTTPS; не показывать/сохранять реальные пароли, TOTP, токены, DB DSN/credentials в публичном демо.
- Ошибки `400/401/403/404/409/429/503` моделируем раздельно. Ошибки сервера могут быть `text/plain`, а 503 может скрывать отказ аудита/доступности; после неопределённой записи сначала перечитать состояние.
- `requestId` для идемпотентных операций не генерировать заново при точном повторе; `expectedRevision` брать из последнего GET; `nextCursor` — только из ответа.
- Защита кнопки в браузере не является авторизацией. Client-side selected tenant, permissions и URL никогда не заменяют серверные проверки.

## 5. Порядок работ / критерии приёмки

1. **Platform Login:** отдельный макет MFA и последовательности login/access/me; состояния отказа и прекращения сессии.
2. **Companies:** список и карточка с точными формами, status/revision, draft-only editing, cursor pagination; mock 409 и 503.
3. **Activation:** заявка, очередь Reviewer, проверка `canApprove`, approve/reject, история, условия доступности.
4. **Admin tools:** приглашения Reviewer, почта, аудит и диагностика с отличием HTTP success от бизнес-статуса.
5. **Tenant contract inventory:** отдельная таблица реальных маршрутов Tenant, универсальных объектов, назначений и прав до изменения Tenant-экрана.
6. **React migration readiness:** неизменяемые snapshot fixtures, сценарные тест-кейсы, визуальные снимки и таблица `UI state → API response`.

### Definition of Done для каждого UI-сценария

- Указаны источник и ревизия/коммит контракта.
- Указаны endpoint, метод, входные поля, ответ и необходимые permissions.
- Отдельно описаны success, empty, forbidden, expired session, conflict и unavailable (когда применимы).
- Демо не сохраняет секреты и не выполняет реальных мутаций VDMS.
- Подтверждены desktop/mobile и light/dark состояния.

## 6. Открытые вопросы (не подменять предположениями)

- Различия между `docs/central-platform-api` и текущим `main`: для прототипа принять фиксированную ревизию после повторной сверки контрактов.
- Какие опциональные Reviewer/Mail/C01 маршруты фактически включены на целевом стенде?
- Какому API соответствуют будущие операции лицензий/модулей и создания владельца компании из первоначального Monitoring Project?
- Какие Tenant API маршруты доступны не только в disposable `mvp-dev`, но и в целевом Central Runtime?
- Какой отдельный UX для статусов Provisioning/C01 подтверждён backend?

**Вывод:** существующая оболочка UI годится для макета; нынешняя mock-бизнес-логика компаний, лицензий и пользователей **не является контрактом VDMS**. Первая имплементация должна быть контрактной моделью Platform Login + Companies, а не общей заменой `localStorage` на HTTP-запросы.

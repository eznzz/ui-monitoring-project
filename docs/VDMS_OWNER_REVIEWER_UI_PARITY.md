# VDMS Central Workspace → Monitoring Project UI: Owner / Reviewer parity

**Проверка:** 2026-11-23 · рабочая спецификация для HTML/CSS/JS-прототипа.  
**VDMS source (read-only):** [developerpiter/vdms / web/central-workspace/src](https://github.com/developerpiter/vdms/tree/main/web/central-workspace/src) и [Platform API docs](https://github.com/developerpiter/vdms/blob/docs/central-platform-api/docs/api/central-platform.md).  
**Изменения:** только `eznzz/ui-monitoring-project` (PR #10 → `preview`), без коммитов в VDMS.

## Источник истины

VDMS определяет платформенные операции, права и серверные ограничения. `components/`, `tokens/`, `style.css` и `modules/shared/` Monitoring Project определяют оформление. HTML-демо не выполняет защищённые API-запросы, не хранит access token/пароли/TOTP, не создаёт Tenant DB и не отправляет почту.

| Эталон VDMS | Покрытие до сверки | Обновление концепта | Ограничение |
|---|---|---|---|
| `App.tsx` / Platform authentication | Mock последовательность login/access/me | Сохранено; роли фикстур, ошибки 401/503 | Реальный пароль/TOTP не вводятся |
| `PlatformOverview.tsx` | Не было | **Добавлен** `#overview` — три метрики, переходы | Счётчики по загруженным mock-компаниям, не platform-wide |
| `App.tsx` / Company directory | Список, draft, revision, конфликт | **Расширено:** профиль по 8 полям, точные ограничения длины, нормализация формата `code` по Central Workspace (`lower-case hyphenated`) | Только draft редактируется, серверный expectedRevision моделируется |
| `App.tsx` / Activation Request | Mock запрос на активацию | Сохранено, separate requester/reviewer | Требуется независимое одобрение; нет автосоздания БД |
| `ActivationReviews.tsx` | Одна очередь, instant mock approve/reject | **Добавлено:** вкладки Pending / My Approvals / My Rejections; форма решения с обязательной причиной отказа, ограничением длины и mock-подтверждением | Реальные Owner/Reviewer MFA и флаги approval не выполняются; история зависит от версии сервера |
| `Reviewers.tsx` | Создание и ручная смена статуса | **Расширено:** проверка mock Reviewer status, список приглашений, выбор existing request и отдельный status lookup | Реальные permission grants выполняет backend |
| `ReviewerEmailSend.tsx` | Статус менялся одной кнопкой | **Расширено:** отдельные сценарии first-send и queued retry с подтверждением и предупреждением о неизвестной SMTP-доставке | Письмо НЕ отправляется, результат SMTP не проверяется |
| `ReviewerAccept.tsx` | Нет | **Симуляция перехода sent → claimed**, обозначена граница внешнего Claim | Реальный Claim с одноразовым токеном, MFA enrollment и WebAuthn не реализуется в публичном демо |
| `OwnerConfirmReviewer.tsx` | Одна кнопка owner confirmation | **Расширено:** отдельное проверяемое состояние pending/confirmed и mock consent | Backend требует Owner password + свежий TOTP; публичный макет не принимает секреты |
| `ReviewerEmailTemplateSettings.tsx` | Не было | **Добавлен** `#email-operator`, шаблон URL/subject/body, revision | Хранение шаблона — только JS-память, без SMTP-конфигурации и серверных изменений |
| `EmailOperator.tsx` | Только общий статус Reviewer | **Добавлено:** включённость и mock transport status | `configured` не означает доступность SMTP |
| `MailSettings.tsx` | Не было | **Добавлен** `#mail`, TLS/auth/envelope/send, outcome status/stage | LAB-only, выключено по умолчанию; даже HTTP 200 может иметь `status=failed` |
| `ProvisioningWorkspace.tsx`, `ProvisioningStatus.tsx`, `CompanyProvisioningTimeline.tsx` | Не было | **Добавлен** `#provisioning`: компании в provisioning, C01 receipt states, routeEnabled, routingEpoch | Только чтение; нет C01 повторов, миграций и создания баз |
| `SystemMonitor.tsx` | Не было | **Добавлен** `#monitor`: 7 сервисов, live/configured/unknown/unavailable | Нельзя приравнивать IPC-сигнал к состоянию PostgreSQL/SMTP/C01 операции |
| `PlatformLogs.tsx` | Таблица событий | Сохранено: offset/limit, доступ Owner | Фильтрация категории локальная fixture, не серверный API |
| `P4Acceptance.tsx` | Не было | **Не дублируется** в основном UI: специализированная LAB acceptance-процедура остается источником для будущего стендового чек-листа | Требует VITE_C01_P4_LAB_UI и подтверждения приёмочной среды |

## Операционные роли

- **Platform Owner** fixture: `tenant.read`, `tenant.create`, `tenant.draft.update`, `tenant.activate`, `platform.reviewer.bootstrap`. Список компаний и создание draft; Reviewer approval *не* предоставляется Owner только за статус Owner.
- **Platform Reader** fixture: `tenant.read`. Просмотр компаний; нет Owner-операций.
- **Reviewer** fixture: `tenant.provision.approve`. Очередь и решения; нет доступа к Owner workspace, mail, reviewer's invitation bootstrap и мониторингу.
- В VDMS навигация вычисляется из `GET /me.permissions`; browser-side restrictions служат только отображению и не заменяют серверные проверки.

## Что нельзя выдавать за работающий backend

1. `POST /reviewers/invitations` и `owner-confirm` требуют свежий MFA, привилегии и состояние операторов; demo-галочка не заменяет MFA.
2. `requested`, `queued`, `sent`, `claimed`, `confirmed` моделируются в JS. На реальном сервере запрос мог попасть в SMTP, даже если клиент получил неопределённый ответ.
3. `GET /system/services`: `configured` не эквивалентно `live`; C01 IPC не подтверждает создание tenant-БД.
4. `GET /companies/{tenantID}/provisioning` возвращает свидетельства/receipts. UI никогда не переводит компанию в `active` без backend confirmation.
5. `POST /mail/diagnostics` доступен только в разрешённой конфигурации; `status=failed` возможен при HTTP 200.
6. Platform API и Tenant API раздельны. Интерфейс Tenant не расширялся в этом PR.
7. Симуляция внешнего Reviewer Claim — **не** замена защищённого одноразового enrollment, не сохраняет секреты и не выдаёт действующих полномочий.

## Критерии приёмки

- Нет новых системных CSS: используется утверждённая дизайн-система Monitoring Project.
- Owner видит overview → companies → provisioning → monitor → reviewer/bootstrap → email operator; Reviewer видит только доступные ему сценарии; ошибки доступа остаются явными.
- Компании: lowercase `code` по условию Central Workspace, редактирование только draft, все поля `CompanyProfile`, `expectedRevision`, конфликт 409.
- Reviewer: existing invitation/status, отдельный mock send (с предупреждением о duplicate delivery), Claim и owner confirmation; заявки с обязательной причиной отказа.
- Chromium: старые и новые сценарии, светлая/тёмная тема, адаптивность; внешние сервисы и SQL не вызываются.

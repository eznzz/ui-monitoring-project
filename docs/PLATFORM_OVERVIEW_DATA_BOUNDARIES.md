# Overview Platform: компании, пользователи, модули и базы данных

**Состояние:** HTML/CSS/JS prototype, дата сверки 2026-11-23. Рабочий репозиторий: только `eznzz/ui-monitoring-project`. Исходный VDMS используется для чтения.

## Почему разделены источники

- **Platform API** ([VDMS `web/central-workspace/src/api.ts`](https://github.com/developerpiter/vdms/blob/main/web/central-workspace/src/api.ts)): `GET /internal/platform-admin/companies` с курсором; список `tenantId, code, name, status, revision`. `GET /companies/{tenantID}/provisioning` отражает *конкретные C01 receipts*, но не является инвентарём или health-check всех PostgreSQL DB.
- **Tenant API** ([VDMS `web/tenant-console/src/api.ts`](https://github.com/developerpiter/vdms/blob/main/web/tenant-console/src/api.ts)): `GET /api/v1/tenant-admin/users` возвращает пользователей **одного авторизованного Tenant**, а `GET /api/v1/company` — профиль и список `modules`. Platform JWT не применяется к этим endpoint.
- **Не представлен Platform API:** общий счётчик пользователей по всем Tenant, централизованный полный список модулей с entitlements каждого Tenant, список баз данных/DSN/размеров/их готовности. Нельзя выдавать эти цифры за реальные без подтверждённого безопасного контракта.

## Реализованный UX

В `#overview` используются только компоненты из утверждённой дизайн-системы `components/`, `modules/shared/ui.css`, `template.css`, `tokens/`; не добавлены отдельные CSS.

1. **Platform KPI:** количество загруженных компаний, из них active и provisioning; не считать глобальными totals.
2. **Tenant KPI (mock):** количество демонстрационных пользователей и модулей **только выбранной компании**, маркировка mock. Для компаний без вымышленных записей отображается «Нет данных», а не 0 пользователей.
3. **Реестр компаний:** все загруженные записи с реальными enum Platform `draft, provisioning, active, suspended, disabled`, ревизиями и переходом к реестру.
4. **Tenant selector:** переключение нескольких исключительно синтетических наборов пользователей и модулей. User fixture использует `login, displayName, active`; Module fixture — `code, name, status, enabled`. Ничего не читается через Tenant API.
5. **Состояние Tenant DB:** таблица показывает «Не проверено» либо «Требуется C01 проверка», маршруты не считаются автоматически включёнными. Никаких настоящих DSN, имён БД, паролей, объёмов.
6. **Навигация:** из Overview в Platform Companies, Provisioning, Service Monitor, Reviewer — только при mock permissions.

## Ролевые границы

- Owner: все Platform KPI и отдельные mock Tenant-наборы; может перейти к C01 и системным разделам.
- Отдельной фикстуры Reader/Viewer больше нет. VDMS поддерживает разрешение `tenant.read` как capability, но не предустановленную роль Platform Viewer.
- Reviewer без `tenant.read`: Overview исключён из его меню. Прямая ссылка перенаправляется к доступной очереди, как в `App.tsx` VDMS.
- Tenant-данные нельзя напрямую смешивать с Platform API или использовать Platform access token.

## Проверка

Chromium smoke: KPI, список компаний, переключение Tenant, users/modules, отсутствие фикстуры, признаки C01, 403 Reviewer, изолированную навигацию Reviewer, mobile table labels и отсутствие горизонтального переполнения. Отдельное визуальное согласование по эталону `components/` остаётся обязательным.

## Переключатель пустого / демонстрационного набора (2026-11-23)

В разделе `#overview` доступен штатный `mp-field` / `select` «Режим отображения»:

- **Демо-данные** — восемь вымышленных компаний (NORTH, BLUE, EAST, WEST, SOUTH, HARBOR, DELTA, POLAR) с разными допустимыми Platform статусами. У каждой компании отдельный примерный набор Tenant users/modules: от нулевых списков до нескольких активных и неактивных пользователей и включённых/отключённых модулей.
- **Пустое состояние** — ноль компаний, пустые KPI и таблицы компаний/пользователей/модулей/Tenant DB, понятные подсказки. Создание нового `draft` в mock Companies по-прежнему доступно, если выбранная фикстура Owner имеет право `tenant.create`.
- **При переключении** новый набор создаётся заново в памяти вкладки; ранее вручную добавленные компании, приглашения и заявки в прототипе сбрасываются. Сброс не отправляет запросы и не изменяет реальный VDMS.
- **После перезагрузки страницы** возвращается демонстрационный режим. Business fixtures не сохраняются в `localStorage`; лишь исходная штатная настройка темы может храниться отдельно.
- **Границы:** переключатель относится к Company/Tenant Overview, реестру Companies и Provisioning. Независимые mock-события Platform Logs и конфигурационно зависимые LAB-инструменты не являются реальной статистикой или статусом инфраструктуры.

Для сопоставления используются те же структурные поля, что и в документации VDMS: `CompanySummary`, `Tenant User`, `Tenant Module`. Состояния Tenant DB никогда не вычисляются из факта наличия компании или Platform-status `active` — только «не проверено» или «нужна C01 проверка»; реальные DSN/имена БД и секреты не используются.

Проверять оба состояния на Desktop/Mobile, переключение Tenant, права Owner/Reviewer, создание draft на пустом наборе и возврат к фиксированным исходным данным.

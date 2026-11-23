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
- Reader: обзор загруженных компаний, но без Owner-операций.
- Reviewer без `tenant.read`: Platform overview закрыт демонстрационным 403. Reviewer review queue продолжает работать независимо.
- Tenant-данные нельзя напрямую смешивать с Platform API или использовать Platform access token.

## Проверка

Chromium smoke: KPI, список компаний, переключение Tenant, users/modules, отсутствие фикстуры, признаки C01, 403 Reviewer, ограничение Reader, mobile table labels и отсутствие горизонтального переполнения. Отдельное визуальное согласование по эталону `components/` остаётся обязательным.

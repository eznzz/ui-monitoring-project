# UI ↔ VDMS API: границы проверки и следующий контракт

**Дата:** 13.10.2026. Проверены архитектурные документы и mock-код eznzz/ui-monitoring-project. Репозиторий developerpiter/vdms через доступное GitHub-подключение возвращал 404; исходники VDMS **не проверены**. Приложенный пользователем m_currentstate.md — предварительная реконструкция из чатов, **не результат аудита кода**.

## Что реализовано в mock UI

- Каталог Object Types на Platform, выбор одного типа при создании компании и tenant-реестр экземпляров Objects.
- Устойчивая Object ID, статусы active/inactive/archived; новое судно inactive, восстановление архива только в inactive, история и сохранение связей.
- Множественные назначения Office/Vessel по Object ID, независимые права на модули и пересечение scopes.
- Отдельные системная лицензия и подписки с ручным управлением Super Admin, Fleet 3/5/10/30/50/Unlimited, необязательные обращения.
- Синхронный mock adapter для чтения/записи localStorage; миграция прежнего ключа браузера с сохранением Ship Particulars и связей.

**Не реализованы:** настоящие AuthN/session, API, авторизация backend, доверенное разрешение Tenant, реальные платежи и PostgreSQL. Демо-доступ и права в браузере легко изменить; это не production security.

## Заявлено в m_currentstate.md без самостоятельной проверки

Go/PostgreSQL, Ed25519 claims, доверенный PlatformProvider, RBAC на уровне объектов, глобальная ревизия политик, TransactionalWriter. Полный HTTP GET /api/v1/objects/{objectID} и PostgreSQL session verification описаны как требующие проверки; race с конкурентным отзывом прав остаётся открытым.

## Контракты, необходимые до интеграции

| Область | Требование к API |
| --- | --- |
| AuthN | login, текущий principal, сессии, logout, безопасная смена пароля |
| Tenant | компания, Object Type, доверенная изоляция компании и архивирование |
| RBAC | server permissions, object scopes, policy conflict, отказ после отзыва |
| Object | стабильный objectID, typed attributes, CRUD, статусы, история |
| User ↔ Objects | many-to-many назначения и effective module scopes |
| Licensing | system license, module subscription, периоды, Fleet cap, блокировки |
| Errors | 401/403/404/409 и различимые причины блокировок/конфликтов |

Backend обязан проверять tenant, session, RBAC, активные объекты и действующие права на каждом защищённом запросе. Форматы и имена текущего mock не превращаются автоматически в OpenAPI/HTTP-контракт.

## Ограничения безопасности

Не изменять рабочую базу VDMS tenant_db_000001 и миграции 1–29; не сливать docs/architecture-baseline в main без разрешения. Интеграционные тесты — только в disposable-БД. Эталонный Dashboard Template, tokens/ и components/ не изменяются.

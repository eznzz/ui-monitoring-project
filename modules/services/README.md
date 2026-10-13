# Frontend data services

**mock-adapter.js** — тонкая синхронная граница между демонстрационными экранами и localStorage.

Подключается после modules/shared/app.js и до контроллера соответствующего экрана. Методы: MP_DATA.load, persist, company, tenant, objects. Модель и операции mock находятся в MP и MP_LICENSE.

Это **не готовый API adapter** и не средство защиты данных. Для настоящего VDMS потребуется асинхронный сервис с согласованным API: AuthN principal/session, trusted tenant, RBAC scopes, Object CRUD/status, license/subscription, loading/error/retry/conflict. Нельзя автоматически заменить синхронный localStorage сетевым fetch без рефакторинга контроллеров. Текущие поля являются форматом демо, а не контрактом backend.

См. [UI_API_ALIGNMENT.md](../../architecture/UI_API_ALIGNMENT.md).

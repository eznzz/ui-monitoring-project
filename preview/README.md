# Monitoring Project — единый Preview

**Рабочий адрес:** https://eznzz.github.io/ui-monitoring-project/preview/

Ветка `preview` — источник GitHub Pages и единственная рабочая точка дальнейшей разработки. `main` синхронизируется с ней как стабильная точка исходников. Старые feature-ветки сохранены для истории; новые демо не развиваются там независимо.

## Карта экранов

- [Preview](index.html) — единый каталог рабочих пространств.
- [Platform Owner / Reviewer](../modules/platform/contract-demo/index.html#login) — актуальный контрактный прототип из preview от 24.11.2026, включая Overview, Companies, C01, Reviewer, почту и журналы.
- [Tenant Login](../modules/auth/login.html?workspace=tenant) и [Tenant Console](../modules/tenant/index.html#users) — контрактная модель пользователей/ролей/назначений и объектных данных.
- [Business Platform](../modules/concepts/business/platform/index.html) и [Business Tenant](../modules/concepts/business/tenant/index.html) — отдельно маркированная продуктовая концепция: лицензии, подписки, Fleet, Etalon, Ship Particulars и жизненный цикл.
- [Design System](../components/index.html) и [Dashboard Template](dashboard-template.html) — общий визуальный эталон.

## Границы

Все данные синтетические. VDMS read-only. Platform contract использует memory fixtures; Tenant contract — localStorage; бизнес-концепция — отдельный namespace. Они пока не являются одним общим набором компаний. Не смешивать неподтверждённые бизнес-поля с реальным контрактом. Старый `modules/platform/index.html` сохранён ради совместимости ссылок, не актуальный Platform.

[Инвентаризация веток и правила](../architecture/UNIFIED_PREVIEW.md) · [UI Constitution](../docs/DESIGN_SYSTEM_CONSTITUTION.md) · [API mapping](../docs/VDMS_UI_API_MAPPING.md) · [Tenant parity](../architecture/VDMS_TENANT_PARITY.md).

## Публикация

Workflow `.github/workflows/platform-concept-browser.yml` проверяет Chromium и публикует `preview` в GitHub Pages (Settings → Pages → GitHub Actions). Внешнее состояние публикации определяется только успешным deploy и проверкой SHA на github.io. 

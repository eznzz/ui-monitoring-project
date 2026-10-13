# Object Types on Platform → Objects in Tenant

**Статус:** бизнес-архитектура согласована 13.10.2026; схема БД и API VDMS остаются на проверку.

## Согласовано

1. Platform владеет справочником типов объектов: **vessels** — первый поддерживаемый тип; trucks/bikes — возможное будущее расширение, сейчас не реализованы.
2. Super Admin выбирает **один Object Type** при создании компании. Этот тип не является коммерческим модулем; из Tenant UI его нельзя произвольно менять или создавать.
3. Backend подготавливает логический Tenant с поддержкой выбранного типа; в Tenant хранятся **конкретные объекты**, предметные данные, история и назначения, а не глобальный список всех экземпляров разных компаний.
4. У объекта есть стабильный внутренний **Object ID**. Для судна IMO — изменяемый атрибут Ship Particulars, не универсальный идентификатор.
5. Единые AuthN, RBAC, tenant/object isolation, аудит и назначение объектов могут переиспользоваться для следующих типов, но специфичные атрибуты и применимость модулей зависят от типа.
6. Физическая реализация tenant provisioning (общие таблицы, типизированные атрибуты или схемы) **не определена**. Клиент никогда не определяет PostgreSQL DSN или доверенный tenant через произвольный URL.

## Реализация в UI Demo

- Источник каталога: MP.OBJECT_TYPES (Platform); сейчас только Vessels.
- Компания: company.objectTypeId, company.ownerEmail и company.status (demo, без настоящей регистрации Owner).
- Единый реестр внутри Tenant: tenants[tenantId].objects; каждый объект имеет id, objectTypeId, status, fields и history.
- Типовой экран Ship Particulars сохраняет полный существующий набор полей.
- Прежние localStorage vessels и пользовательские привязки по IMO мигрируют в объекты с постоянными ID.

## Открыто для VDMS API

Проверка каталога типов, provisioning, objectID/typed attributes, сериализации Ship Particulars, AuthN/RBAC и серверной валидации. Нельзя объявлять mock-структуру утверждённым форматом API.

Связанные материалы: [UI_API_ALIGNMENT.md](UI_API_ALIGNMENT.md), [SHIP_PARTICULARS_AND_USER_ASSIGNMENTS.md](SHIP_PARTICULARS_AND_USER_ASSIGNMENTS.md).

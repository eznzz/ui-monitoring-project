# VDMS tenant registry: проверка и влияние на UI (13.10.2026)

Источник: [TENANT_REGISTRY_RESILIENCE.md](https://github.com/developerpiter/vdms/blob/docs/architecture-baseline/docs/architecture/TENANT_REGISTRY_RESILIENCE.md), ветка `docs/architecture-baseline`. Это архитектурный документ, обновляемый по этапам. **Не все элементы из целевой схемы уже реализованы**; статус в разделе 9 и дополнениях важнее предварительных фраз «ещё не реализован» в разделе 2.

## Подтверждённые требования архитектуры API

- `platform_db` — источник истины маршрутов Tenant; `tenant_id` — неизменяемый UUID, `database_id` — внутренний серверный идентификатор подключения, `database_name` — физическое имя. **Это разные сущности**.
- Проверенный Ed25519 `tenantID` маршрутизирует запрос через доверенный реестр; нельзя брать Tenant из query, HTTP header, UUID объекта или неподписанного токена. Frontend demo `?tenant=tenant_db_000001` — только временная навигация mock, не контракт API и не защита.
- При временной недоступности Platform допустимо ограниченное использование последнего доверенного маршрута с продолжением проверки подписи, PostgreSQL-сессии и RBAC; неизвестная/заблокированная компания, истёкшая запись или недоступная Tenant DB — отказ.
- Значения «5 минут refresh / 30 минут max age» — предварительные проектные ориентиры, не утверждённые production SLA.
- Для записи нужна повторная проверка прав внутри транзакции в том же tenant pool. События и отказ не должны раскрывать DSN, секреты и структуру чужих БД.

## Фактическое состояние согласно документу

В разделе 9 и последующей истории описаны реализованные `SingleTenantProvider`, простой `PlatformProvider`, `AccessCodec.VerifyClaims`, `TenantSessionReader`, `PostgresTenantRegistry`, `CachedTenantRegistry`, а также SQL миграция `platform_db` и тесты. Сообщения PASS для отдельных PostgreSQL integration проверок приведены со слов пользователя, без полной публикации журналов. Snapshot-основа реализована отдельно, но не подключена к серверу и не production-ready; защищённый `SnapshotWatermark`, `routing_epoch` pool manager и сквозная HTTP multi-tenant цепочка ещё не готовы.

**Не заявляем**, что прочитанный файл подтверждает `etalon_db`, Tenant provisioning, Object Type API, Fleet лимиты или окончательный контракт Ship Particulars.

## Выводы и последствия для UI

1. Frontend не должен использовать `tenant_db_000001` как идентичность/авторизацию: будущий API получает server-signed `tenant_id` и сам сопоставляет его с физической БД.
2. UI должен иметь отдельные состояния *Company archived/disabled*, *Tenant unavailable*, *Registry route expired* и *Temporary backend error*, но точные HTTP error codes и UX-строки ещё не утверждены.
3. Архивирование компании в бизнес-архитектуре предполагает немедленный запрет, однако отказоустойчивый кэш создаёт ограниченное окно отзыва при полной потере связи. Это **открытое межкомандное противоречие/угроза**, нуждается в единой политике emergency revocation; frontend никогда не обещает мгновенного отключения при недоступной Platform.
4. Новые demo Object ID независимы от IMO. `objects` в VDMS и Vessel Particulars пока соединены только по логическому принципу, без подтверждённых полей API.

## Границы второго этапа demo

В ветке `feature/demo-vessels-object-lifecycle-20261013` начата модель Object ID + Vessel status: новый mock объект `inactive`, история изменений, архив без удаления и восстановление **только в inactive**. Кнопка `active` не добавлена, пока отсутствует серверный контракт Fleet/per-module лимитов и прав. Старый demo-путь через IMO поддерживается для совместимости, но после редактирования заменяется ссылкой по `object`.

**На следующем этапе:** пользовательские many-to-many назначения и общий объектный слой, tenant UUID abstraction, service adapters и подтверждение API контрактов. Корневой Dashboard Template, токены и компоненты не изменяются.

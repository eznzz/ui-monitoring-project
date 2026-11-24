# Business concept — отдельная демонстрационная модель

Снимок [feat/platform-object-types-ui-demo](https://github.com/eznzz/ui-monitoring-project/tree/a368c75cccefc5fe207b70f155e895fe2de15488), перенесённый в общий Preview. Содержит системную лицензию, модульные подписки, Fleet, типы и жизненный цикл объектов, Office/Vessel, назначения, Ship Particulars, архивирование. Это согласуемая продуктовая концепция, не утверждённый VDMS API.

[Platform](platform/index.html) · [Tenant](tenant/index.html) · [Вход](auth/login.html) · [Preview](../../../preview/index.html).

Использует общие корневые токены и стили, собственный namespace localStorage `mp-ui-business-concept-v1`; не смешивает данные с контрактным Tenant `mp-ui-prototype-v1` или Platform memory fixtures. Перенос не удаляет существующее browser storage и не копирует реальные секреты. Исторические данные из других веток не перезаписываются. Код снят с зафиксированного коммита; изменения относительных путей и namespace сделаны для общей публикации.

# Tenant Console parity — 2026-11-24

Source: [VDMS API client](https://github.com/developerpiter/vdms/blob/main/web/tenant-console/src/api.ts) (blob ca1607a2e01c01f712c7e7081e411010abba5573), [VDMS UI](https://github.com/developerpiter/vdms/blob/main/web/tenant-console/src/App.tsx) (blob edf8d795a1ac2070d272ff98d0535bd08e1fbbe4).

Demo only. No requests to VDMS, no real credentials or tokens. Existing shell, tokens and Ship Particulars retained.

| Contract | Demo coverage |
|---|---|
| User | id, login, displayName, active, revision; create password min 12 discarded |
| Role | id, code, description, active, revision |
| Assignment | id, userId, roleId, objectId nullable, objectCode optional, revision |
| Policy / capability | revision, canManage |
| Company | id, code, name, legalName, tradeName, status |
| Module | code, nameEn, nameRu, status, enabled |
| ObjectItem | id, code, objectTypeId, revision |
| LanguageRegistry | primary; code, name, isPrimary, isEnabled, sortOrder |

User creation is roleless; edits/security only for roleless accounts; grants/revokes separated, scope tenant or object. Existing local data is migrated on access; legacy fields retained for compatibility. UUIDs and roles/modules/languages are synthetic, not actual VDMS records. Object type and module availability are demo values, not server-confirmed. The original local login/session and licensing concepts remain; exact Tenant login/refresh, localization and server permission/error handling need a separate iteration. Browser QA not yet run.


## Follow-up
Login presents separate Platform TOTP and Tenant company contexts; still navigation only. Dashboard owns the company summary; role edits respect the 100-record completeness guard. Vessel edits advance mock object revision; assignment object code follows IMO changes. Module availability is explicitly unconfirmed. New language fixtures match the default VDMS migration (en primary, ru secondary). No live session, backend error handling or full translation implemented.

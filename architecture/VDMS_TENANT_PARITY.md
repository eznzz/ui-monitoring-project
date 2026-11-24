# VDMS-first scope (24 November 2026)

Source snapshot: [VDMS main 24ad075](https://github.com/developerpiter/vdms/tree/24ad075ac45822ac25b9421bbabe4993d33e44c8). Only implemented client contracts and existing screens define scope. UI-only fixtures, no network or backend credentials. Design tokens/components remain independent visual assets.

- Platform: login, company directory/draft/activation, reviewer workflow/history, provisioning, email, mail LAB, system monitor, logs, P4 LAB. Overview is restricted to loaded company records; no Tenant users/modules or DB inventory.
- Tenant: [api.ts](https://github.com/developerpiter/vdms/blob/24ad075ac45822ac25b9421bbabe4993d33e44c8/web/tenant-console/src/api.ts), App.tsx; company code login, session actions, users, role assignments, object lookup, read-only company/modules/language registry. Fixture permissions differ for writer and delegator. No standalone Office/Vessel roles, no local persistent data. Module catalog from migrations/platform/000034_erp_modules.up.sql; planned modules are metadata only, not screens.
- Removed speculative Etalon, Ship Particulars, vessel lifecycle, Fleet limits, paid subscriptions, licensing/keys and old platform. Historical Git commits are retained, not active source. Existing Platform mock documentation and API rules are explanatory, not additional backend features.
- No claim of exhaustive runtime parity: C01 backend remains in development; protected actions and server error handling remain mock. Only actual new VDMS functionality may be added.

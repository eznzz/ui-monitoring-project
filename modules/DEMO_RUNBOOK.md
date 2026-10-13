# Monitoring Project — runnable UI demo

**Branch:** `feature/demo-complete-users-vessels-20261013` (stacked on earlier demo PRs). This is a **static HTML/CSS/JS localStorage prototype**, not a VDMS API server, production authentication, or PostgreSQL provisioning. Original Dashboard Template, shared root CSS/JS, `tokens/`, `components/` and the themes are untouched.

## Run locally

1. Download the branch archive: https://github.com/eznzz/ui-monitoring-project/archive/refs/heads/feature/demo-complete-users-vessels-20261013.zip
2. Extract it and open a terminal **in the extracted repository root**.
3. Start a static server: `python3 -m http.server 8000` (or `npx serve .`).
4. Open `http://localhost:8000/modules/`. The intro redirects to `auth/login.html`.
5. In the mock Login choose Platform Admin or Company Admin — this is demo navigation, not password-based login.

Avoid opening the pages by `file://`: a local HTTP server gives relative scripts/styles a consistent origin and localStorage behavior.

## Functional walkthrough

1. **Platform Admin:** Create a company by entering name, **first owner e-mail**, and the single allowed mock Etalon Object Type `Vessels`. The company card shows `templateId`, owner and mock Tenant ready status. Archive/restore preserves data.
2. **Company Admin / Vessels:** Create a vessel. Fill only required **Ship's Name** and **IMO**. Save; it receives an immutable mock Object ID and `inactive` status. Ship Particulars includes 96 fields / 10 sections plus cargo holds.
3. **Activation:** In the vessel list, select `Активировать (mock)` and confirm. This checks local simulated module Fleet assignments/caps only — **not** API permissions or real subscription limits. Use the status filter to view active/inactive/archived vessels. Archive and restore retains particulars/history; archived restores **only to inactive**.
4. **Users:** Create Office user **without assigned vessels** or with several active vessels. Create Vessel user with **at least one active vessel**. Use Ctrl/Cmd multi-select (or native multi-select on mobile). The user's `Назначения` control lets you edit active links while keeping old archived/inactive associations for history.
5. **Edit ship:** Reopen by Object ID. Change IMO; user assignments still point to the same Object ID. Open `История изменений объекта` on the card. Archived cards become read-only until restored.

Demo passwords are not persisted and do not authenticate a real user. Do not enter actual credentials, personal information, or secrets. Stored demo data lives under `localStorage['mp-ui-prototype-v1']`; to reset it, clear that key in the browser's storage. Nothing in the UI creates a real PostgreSQL database.

## Tests

Use Node.js 22+:

```bash
node tests/demo-foundation.test.cjs
node tests/vessel-lifecycle.test.cjs
node tests/user-assignments.test.cjs
```

A GitHub Actions `Demo smoke checks` workflow verifies the JS syntax and these tests when runs are enabled. Browser Light/Dark and mobile widths must be verified before claiming a fully tested production UI.

## Known API boundaries

- `etalon_db` provisioning, platform Object Type publication and physical tenant DB creation are not verified as implemented in VDMS.
- VDMS tenant identity must be the trusted logical `tenant_id` UUID; demo `?tenant=tenant_db_...` remains an **unsafe mock navigation label**, not a production routing pattern.
- Fleet checks, subscriptions, RBAC and archived-company revocation are server responsibilities. UI simulations are not security controls.
- The old license-key demo workflow still exists for compatibility; it is not the approved production subscription workflow. This remains a separate later refactor.

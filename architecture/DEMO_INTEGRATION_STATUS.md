# Demo modernization — integration readiness (13.10.2026)

## Evidence and boundaries

- Agreed UI architecture: [ETALON_PLATFORM_TENANT.md](ETALON_PLATFORM_TENANT.md).
- The provided `m_currentstate.md` is a preliminary reconstruction of VDMS API discussions, **not** an independent code audit.
- Direct retrieval of three ChatGPT shared conversations was unavailable.
- `developerpiter/vdms` was not accessible through the connected GitHub account (404). Therefore no claim is made about actual provisioning, etalon_db, active HTTP endpoints or test results.

## Stage 1: implemented on a feature branch — MOCK ONLY

- Mock `ETALON_OBJECT_TYPES` catalog provides only `vessels`. The `templateId='mock-etalon-vessels-v1'` is expressly a demo marker, not a real database template version or API field.
- Platform company creation requires company name, first-owner e-mail and Object Type, with mock duplicate email checks. It creates a local `ready` mock Tenant without SQL, actual owner account, e-mail delivery or remote API calls.
- Previously saved company records get backward-compatible defaults for the new display fields, without discarding existing users, vessels, keys or request history.
- Company archive/restore preserves all mock Tenant data. Archive blocks demo Tenant views; this is **not server authorization**. Super Admin's Platform context remains accessible.
- The original Dashboard Template and design-system code remain untouched.

## Stage 2: Vessels, object identities and user assignments — mock only

Implemented in stacked branch `feature/demo-vessels-lifecycle-assignments-20261013` over Stage 1:

- New vessels have a generated **stable Object ID** and start `inactive`; editing IMO does not change ID or user references.
- Lifecycle `inactive → active → inactive / archived → inactive` is presented in the vessel registry; archived vessels are visible only with the archive filter. No physical vessel deletion is possible through the UI.
- The complete Ship Particulars editor is preserved; mock modification/status history is retained. Legacy IMO links remain readable, but new navigation uses `objectId`.
- Office and Vessel users can be assigned **multiple active vessels** by ID; existing inactive/archived links remain stored when the vessel status changes. User assignments can be edited.
- Stored demo data migrate from `vesselImo` to `vesselIds`. Previous vessels are treated as active to preserve previous demo behaviour, but **new** vessels start inactive.
- Smoke tests are in `tests/demo-vessels.test.cjs`; they never access PostgreSQL.
- No API, AuthN, live RBAC, subscription/Fleet caps or authoritative audit exists in the demo. Activating a vessel is purely illustrative; the real backend must atomically check module quotas and permissions.

**Review / preview:** changes are stacked on Stage 1. For local preview, download the branch ZIP and open `modules/platform/index.html` or `modules/tenant/index.html`; if `file://` localStorage restrictions occur, run `python3 -m http.server 8000` from project root.

## Later demo milestones, deliberately not implemented here

1. Replace obsolete demo licensing key workflow with the already agreed business model for manual subscription and Fleet limits.
2. Service adapters, real AuthN/session/RBAC, tenant resolution and contracts after verification of the actual VDMS backend.
3. Complete frontend role-specific permission matrix; confirm with the API team before representing it as production authority.

## Verification checklist

- `node tests/demo-foundation.test.cjs` — pure mock model tests (no DB, no HTTP).
- Manually test the Platform create-company dialog, company archive/restore and existing saved localStorage migration.
- Test that archived tenants cannot be opened through the demo Company Admin or Vessel routes.
- Check Light/Dark and desktop/mobile layouts; do not change any root template, tokens or components files.
- Do not touch `tenant_db_000001` in PostgreSQL or migrations 1–29 of VDMS.

**Not a backend contract:** physical tenant provisioning, Object Type APIs, template versioning, HTTP route names, AuthN and object-level RBAC remain to be verified with the API team.

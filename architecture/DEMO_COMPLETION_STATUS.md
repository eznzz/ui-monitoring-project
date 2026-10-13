# Demo integration status — 13 October 2026

## Mock UI verified in current branch

- **Object Types:** mock `ETALON_OBJECT_TYPES` exposes exactly `vessels`. Company creation records first owner e-mail and a mock Etalon template ID. No real provisioning.
- **Company:** archive/restore keeps user and vessel data; archived Company Admin is blocked by a client-only guard, which is not security.
- **Vessels:** new vessels start `inactive`, have Object ID independent from IMO, editable 96-field Ship Particulars, cargo holds, history; non-destructive archive and restore-to-inactive; archived forms read-only. Demo activation simulates Fleet cap *only for module-assigned vessels*; transactional server checks are not implemented.
- **Users:** Office has optional 0..N active vessel assignments, Vessel needs >=1 active on creation. Edit assignments by Object ID; inactive/archived historical links persist. No real AuthN.
- **Migration:** normalization to version 7 converts ID=IMO legacy vessels to stable deterministic IDs and converts `vesselImo` to `objectIds`, while preserving cargo holds, totals and original particulars; destructive vessel deletion removed.
- **Testing:** pure JS smoke checks for Etalon/Company, vessel status/Fleet simulation/migration and Office/Vessel assignments. GitHub Actions Node tests added. Full cross-browser mobile/Light/Dark functional regression should still be checked.
- **Reference:** [DEMO_RUNBOOK.md](../modules/DEMO_RUNBOOK.md).

## VDMS

Source reviewed: [TENANT_REGISTRY_RESILIENCE.md](https://github.com/developerpiter/vdms/blob/docs/architecture-baseline/docs/architecture/TENANT_REGISTRY_RESILIENCE.md). Trust signed `tenant_id`, not query or physical `database_name`. An API connection is not part of these mock changes; backend `etalon_db` availability and provisioning remain to be confirmed. The register's eventual outage cache creates a policy question against instantaneous company-archive revocation.

## Out of scope

- Real SQL migrations, DB creation, use of `tenant_db_000001` PostgreSQL, Ed25519 authentication or production RBAC.
- Reworking licensing/subscriptions into final Super Admin-managed workflow.
- Approval of deferred Module Permissions & Navigation blocks.
- Modification of the frozen root Dashboard Template, components, tokens or visual design system.

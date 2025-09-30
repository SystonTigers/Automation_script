# Unified Automation + App Spec (v7.0)

This document centralizes the automation program guardrails for the Apps Script codebase. All follow-on change requests must comply with these standards.

## Priority Stack

| Priority | Theme | Description |
| --- | --- | --- |
| P0 | Service Integrity | Keep production Apps Script executions green and idempotent. Fix breakages, quota issues, or security regressions before taking on feature work. |
| P1 | Customer Trust | Preserve customer-facing automation flows, ensuring Sheet Config remains the single source of truth and setup remains zero-code. |
| P2 | Delivery Efficiency | Optimize engineering throughput with reusable modules, declarative config, and guardrails that prevent regressions. |
| P3 | Roadmap Velocity | Implement net-new automation capabilities that build on the unified runtime contract without violating higher priorities. |

## Capability Taxonomy

| Track | Pillar | Scope |
| --- | --- | --- |
| Automation Orchestration | Schedulers & Jobs | Time-based and event-based triggers, job routing, health monitors, and retry controllers. |
| Data Layer | Sheet Config & Persistence | Config tab schema, Script Properties projection, caching tiers, and migration pathways. |
| Integration Surface | HTTP & Webhooks | External API contracts, Make.com payload standards, OAuth scope boundaries, and structured logging. |
| Experience | UI & Comms | Web app HTML shells, templated email/slack payloads, and consent-aware messaging. |
| Governance | Security & Compliance | Secret handling, audit logging, consent enforcement, and rollout governance. |

## Runtime Configuration Contract

| Source | Key | Purpose | Notes |
| --- | --- | --- | --- |
| Sheet Config (tab) | `SHEET_ID` | Primary spreadsheet binding | Must be validated by installer before writing to Script Properties. |
| Sheet Config (tab) | `ENV` | Runtime environment label | Drives logging level and test harness toggles. |
| Sheet Config (tab) | `SYSTEM_VERSION` | Declarative version string | Bumped on each production rollout; surfaced by `SA_Version()`. |
| Sheet Config (tab) | `WEBHOOK_MAKE_URL` | External automation endpoint | Used by job runners via safe fetch with backoff; never hardcode URLs. |
| Script Properties | `CACHE_TTL_MINUTES` | Cache lifetime for shared datasets | Read once per execution; default to 30 if missing. |
| Script Properties | `ALLOWED_TRIGGERS` | Comma-delimited handler list | Ensures idempotent setup avoids duplicate triggers. |

## Idempotency Keys & Patterns

| Context | Key / Strategy | Enforcement |
| --- | --- | --- |
| Trigger Creation | `ensureTimeTrigger(handler, spec)` | Do not create duplicates; short-circuit when trigger already exists. |
| External Calls | `requestId = hash(eventTimestamp + payloadType)` | Attach as header to outbound requests to prevent duplicate processing upstream. |
| Sheet Mutations | `operationId` stored in hidden log sheet | Skip updates when the latest log matches the incoming operation. |
| Deployments | Git SHA + version string | Used in CI deploy descriptions and Script Properties to prevent mismatched pushes. |

## Agent Acceptance Criteria (ACs)

1. Changes MUST read/write config via Sheet Config + Script Properties; no inline constants for customer-owned values.
2. All HTTP calls implement the enterprise client pattern with exponential backoff, JSON validation, and structured error logs.
3. Spreadsheet interactions use full-range `getValues()` / `setValues()` with header validation; never rely on positional magic numbers.
4. Trigger management is idempotent and uses named helper functions; no duplicate triggers on repeated installs.
5. Error handling avoids leaking PII and routes failures to central logging utilities.
6. Unit or integration hooks are updated when behavior changes, and CI must remain green.

## Deployment Notes

- CI/CD uses `@google/clasp` with a single `WEBAPP_DEPLOYMENT_ID`; never create extra deployments.
- Committing to `main` triggers CI that pushes the Apps Script project, bumps the clasp version with branch + SHA, and redeploys the existing web app.
- When OAuth scopes change, flag it in the PR body; expect manual re-auth inside the Apps Script editor.
- Version increments are captured via `SYSTEM_VERSION` and must align with `SA_Version()` responses post-deploy.
- Install flows must remain idempotent: rerunning installers should refresh Script Properties and triggers without duplication.

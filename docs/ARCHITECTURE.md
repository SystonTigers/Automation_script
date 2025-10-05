# Platform Architecture

This document summarizes the dual-stack automation platform that pairs a Cloudflare Workers backend with a Google Apps Script orchestrator.

## System Diagram (Text)

```
Mobile App (Capacitor)
    ↓ JWT + HTTPS
Cloudflare Worker (../backend/src/index.ts)
    ├─ Queue producer (post events)
    ├─ Durable Object rate limiter (tenant-scoped)
    └─ Adapter bridge → Make.com
        ↓
Make.com Scenarios (../workers/fixtures.ts)
        ↓
Apps Script Automation (../src/main.gs)
    ├─ Sheet Config installer (../src/config-install-svc.gs)
    ├─ Trigger management (../src/trigger-management-svc.gs)
    └─ Feature services (../src/*.gs)
        ↓
Google Sheets (Config + Data tabs)
```

## Component Responsibilities

| Layer | Purpose | Key Files |
| --- | --- | --- |
| Cloudflare Worker | Tenant-authenticated REST API, queueing, idempotency enforcement | `../backend/src/index.ts`, `../backend/src/queue.ts` |
| Queue Consumer | Processes queued posts, reconciles Make fallback, updates KV | `../backend/src/consumer.ts` |
| Durable Objects | Rate-limit per tenant + track last activity | `../backend/src/rate-limiter.ts` |
| Apps Script | Reads Sheet config, orchestrates content automation, surfaces admin UI | `../src/config-install-svc.gs`, `../src/make-integrations.gs` |
| Sheet Config | Customer-editable configuration for installers and runtime | Spreadsheet tab `CONFIG` |

> 🔐 **Security boundary:** JWT validation happens in the Worker; Apps Script trusts only `ScriptProperties` populated by the installer.

## Runtime Configuration Flow

1. Customer fills out the Sheet `CONFIG` tab.
2. Installer (`installForCustomer`) copies values into Script Properties and provisions triggers via `setupTriggers()`.
3. Runtime services (e.g., `make-integrations.gs`) read Script Properties through helper `getConfigValue`.
4. Outbound requests use `fetchJson` with exponential backoff (see `../src/http_util_svc.gs`).

## Deployment Surface

| Stack | Tooling | Notes |
| --- | --- | --- |
| Cloudflare Worker | GitHub Actions → Wrangler deploy | Secrets managed via `wrangler secret put` per environment. |
| Apps Script | GitHub Actions → `clasp push` | Single deployment identified by `WEBAPP_DEPLOYMENT_ID`; workflow updates in place. |
| Make.com | Manual scenario versioning | Worker adapters fall back here when direct integrations fail. |

## Observability

- Worker logs via Cloudflare dashboard (`wrangler tail`) with structured JSON.
- Apps Script logs via Stackdriver; errors tagged with tenant + `requestId`.
- Sheets-based health metrics stored in `Health` tab (populated by `../src/system-health.gs`).

---

_Last updated: 2025-10-05_

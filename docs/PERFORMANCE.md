# Performance Playbook

This document captures the baseline performance targets, instrumentation, and tuning levers for the automation stack.

## Targets

| Metric | Target | Notes |
| --- | --- | --- |
| Worker P95 latency | ≤ 450 ms | Measured via Cloudflare analytics for `/api/v1/post` with auth cache warm. |
| Queue drain time | < 2 minutes | From enqueue to adapter confirmation during peak traffic. |
| Apps Script health job | ≤ 45 s | `runHealthCheck()` must finish before trigger timeout. |
| Sheet sync batch | ≤ 5 s | `syncFixturesBatch()` (../src/batch-fixtures.gs) across 50 rows. |

## Instrumentation

- Worker metrics stream to Grafana via Cloudflare logpush (request/response size, latency, status).
- Apps Script logs include `durationMs` fields emitted by `logWithTiming()` from `../src/logger.gs`.
- Sheet-based dashboards refresh hourly using `../src/performance-optimization.gs` caching helpers.

## Optimization Levers

1. **Caching:** Use `CacheService.getScriptCache()` for read-heavy endpoints like `getUpcomingFixtures()`.
2. **Batching:** Always call `getValues()`/`setValues()` on contiguous ranges; avoid per-row writes.
3. **Backoff:** All HTTP calls rely on `fetchJson` with exponential backoff to smooth transient latency spikes.
4. **Queue sizing:** Adjust Cloudflare queue `max_batch_size` during tournaments to keep drain time inside target.
5. **Sheet formulas:** Move heavy formulas into `ARRAYFORMULA` and use pivot caches where possible.

## Monitoring Runbook

| Check | Frequency | Action |
| --- | --- | --- |
| Grafana latency dashboard | Daily | Investigate when Worker P95 > target for >2 consecutive points. |
| Apps Script execution logs | Daily | Filter for `durationMs > 45000`; open incident if repeated. |
| Sheet cache hit ratio | Weekly | Logged by `reportCacheUsage()`; raise task if <70%. |

---

_Last updated: 2025-10-05_

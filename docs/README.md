# Syston Post Bus Architecture

**Version:** 1.0 (Updated 2025-09-30)  
**Completion:** 82%  
**Status:** Production-Ready

The Post Bus is a **Cloudflare Workers** backend that queues and delivers social posts, attendance events, and live stream metadata for Syston FC mobile applications.

---

## High-Level Architecture

```
Mobile App (iOS/Android)
    ↓ HTTPS + JWT
HTTP Worker (index.ts)
    ├─ JWT Auth (jose)
    ├─ Rate Limiting (Durable Objects)
    ├─ Idempotency (KV_IDEMP)
    └─ POST_QUEUE (async)
    ↓
Queue Consumer (queue-consumer.ts)
    ├─ Batch Processing (25 messages)
    ├─ Tenant Resolution
    └─ Adapter Routing
    ↓
Publisher Orchestrator (adapters/publisher.ts)
    ├─ Make.com (✅ 100%)
    ├─ YouTube (⚠️ 30% stub)
    └─ Facebook/Instagram/TikTok (⚠️ stubs)
    ↓
Make.com + Canva → Social Media (all channels)
```

---

## Components

| Component | Purpose | Status |
| --- | --- | --- |
| **HTTP Worker** | REST API, rate limits, idempotency | ✅ 90% |
| **Queue Consumer** | Async post processing | ✅ 100% |
| **Durable Object** | Token bucket rate limiting | ✅ 100% |
| **Adapters** | Make.com + social APIs | ⚠️ 65% |
| **Services** | Auth, tenants, cache | ✅ 85% |
| **Fixtures Worker** | FA parser, Apps Script publisher | ⚠️ 95% |

---

## Cloudflare Bindings

| Binding | Type | Description |
| --- | --- | --- |
| `KV_CACHE` | KV | Fixtures, table, tenants, i18n |
| `KV_IDEMP` | KV | Idempotency responses (24h TTL) |
| `POST_QUEUE` | Queue | Async job queue |
| `TenantRateLimiter` | DO | Per-tenant rate limiting (5 req/sec) |
| `R2_MEDIA` | R2 | Media assets (future) |

---

## API Endpoints

### Public (JWT Required)
- `GET /healthz` — Health check
- `GET /api/v1/events` — Fixtures
- `POST /api/v1/post` — **Post Bus** (queue)
- `POST /api/v1/attendance` — Mark attendance
- `POST /api/v1/votes` — MOTM vote

### Admin (Not Implemented) ⚠️
- `PUT /api/v1/admin/tenants/{id}`
- `PATCH /api/v1/admin/tenants/{id}/flags`
- `POST /api/v1/admin/tenants/{id}/youtube-token`

---

## Security

- **JWT:** issuer `syston.app`, audience `syston-mobile`
- **Rate Limiting:** 5 req/sec per tenant per bucket
- **Idempotency:** SHA-256 payload hashing + KV storage
- **Tenant Isolation:** All keys tenant-scoped

---

## Deployment

### Backend Worker
```bash
cd backend
wrangler deploy
```

### Fixtures Worker (⚠️ needs wrangler.toml)
```bash
cd workers
# Create wrangler.toml first (see NEXT_STEPS.md)
wrangler deploy
```

---

## Known Limitations

| Limitation | Impact | Mitigation |
| --- | --- | --- |
| Admin endpoints missing | Manual KV required | Implement in next sprint |
| YouTube adapter stub | No direct scheduling | Make.com provides full functionality |
| Fixtures worker deployment | Manual deployment | Create wrangler.toml |

---

## Documentation

- [../README.md](../README.md) — Project overview
- [../IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) — Component breakdown
- [../NEXT_STEPS.md](../NEXT_STEPS.md) — Immediate actions
- [../openapi.yaml](../openapi.yaml) — API spec v1.0.0

---

**Architecture Version:** 1.0  
**Last Updated:** 2025-09-30  
**Status:** Production-Ready (82%)

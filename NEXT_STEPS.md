# Next Steps — Immediate Action Items

**Date:** 2025-09-30  
**Current Status:** 82% Complete  
**Target:** 95% Production-Complete

---

## This Week (Priority 1)

### 1. Create Fixtures Worker Deployment Configuration ⚠️ BLOCKING

**Effort:** 1 day

**Tasks:**
- Create `workers/wrangler.toml`
- Create KV namespace for fixtures
- Add GitHub Actions workflow
- Deploy and verify

**Definition of Done:**
- ✅ wrangler.toml exists and configured
- ✅ Fixtures Worker deployed to Cloudflare
- ✅ Health check passes

### 2. Deploy Backend Worker to Production

**Effort:** 2 hours

**Tasks:**
- Create production KV namespaces and queue
- Set production secrets (JWT_SECRET, MAKE_WEBHOOK_BASE, YT_API_KEY)
- Deploy via wrangler
- Verify health check and test post

**Definition of Done:**
- ✅ Worker deployed
- ✅ Health check returns 200
- ✅ Test post queued and processed

### 3. Implement Admin Endpoints

**Effort:** 2-3 days

**Required Endpoints:**
```
GET    /api/v1/admin/tenants/{id}
PUT    /api/v1/admin/tenants/{id}
PATCH  /api/v1/admin/tenants/{id}/flags  
POST   /api/v1/admin/tenants/{id}/youtube-token
DELETE /api/v1/admin/tenants/{id}/tokens/{provider}
```

**Tasks:**
- Add `requireAdmin()` middleware
- Implement tenant CRUD endpoints
- Implement token management endpoints
- Update OpenAPI spec
- Add tests

**Definition of Done:**
- ✅ All 5 endpoints operational
- ✅ Tests passing
- ✅ Deployed to production

---

## This Month (Priority 2)

### 4. Add Backend Test Suite
**Effort:** 1 week | **Target:** 70%+ coverage

- Unit tests for services (idempotency, auth, tenants, rate limiting)
- Adapter tests with mocked HTTP
- Integration tests for critical paths

### 5. YouTube Integration Decision
**Effort:** 1 day (document) OR 3-4 days (build)

**Option A:** Document Make.com as primary path (recommended)
**Option B:** Build full YouTube Data API v3 integration

**Recommendation:** Option A - Make.com provides full functionality

### 6. Enhanced Monitoring
**Effort:** 2-3 days

- Configure Logpush
- Add Sentry integration
- Create custom dashboards
- Configure alerts

---

## Deployment Commands

### Fixtures Worker Setup
```bash
cd workers
cat > wrangler.toml << 'WRANGLEREOF'
name = "syston-fixtures"
main = "dist/fixtures.js"
compatibility_date = "2025-09-30"

[[kv_namespaces]]
binding = "KV_FIXTURES"
id = "YOUR_KV_ID_HERE"

[vars]
FIXTURES_SOURCE_URL = "https://..."
APPSSCRIPT_EVENTS_ENDPOINT = "https://script.google.com/macros/s/..."
WRANGLEREOF

wrangler kv:namespace create KV_FIXTURES
# Update wrangler.toml with returned ID
wrangler deploy
```

### Backend Worker Deployment
```bash
cd backend
wrangler kv:namespace create KV_CACHE --env production
wrangler kv:namespace create KV_IDEMP --env production
wrangler queues create post-queue

wrangler secret put JWT_SECRET
wrangler secret put MAKE_WEBHOOK_BASE  
wrangler secret put YT_API_KEY

wrangler deploy
```

### Verify Deployment
```bash
curl https://your-worker.workers.dev/healthz
```

---

**Document Version:** 1.0  
**Last Updated:** 2025-09-30

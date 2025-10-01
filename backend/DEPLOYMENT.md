# Backend Worker Deployment Guide

Quick guide to deploying the Syston Post Bus backend to Cloudflare Workers.

## Prerequisites

- Cloudflare account with Workers Paid plan (required for Durable Objects)
- wrangler CLI: `npm install -g wrangler`  
- Authenticated: `wrangler login`

---

## Deployment Steps

### 1. Create Cloudflare Resources

```bash
cd backend

# KV namespaces
wrangler kv:namespace create KV_CACHE
wrangler kv:namespace create KV_IDEMP

# Queue
wrangler queues create post-queue

# R2 bucket (optional)
wrangler r2 bucket create media-bucket
```

Save the IDs returned!

### 2. Update wrangler.toml

Replace these placeholders with actual IDs from step 1:
- `kv_cache_id` 
- `kv_idemp_id`

### 3. Set Secrets

```bash
# Generate strong JWT secret
openssl rand -base64 32

# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put MAKE_WEBHOOK_BASE  
wrangler secret put YT_API_KEY
```

### 4. Build and Deploy

```bash
npm install
npm run build
npm run deploy
```

### 5. Verify

```bash
curl https://syston-postbus.YOUR_SUBDOMAIN.workers.dev/healthz
```

Expected response:
```json
{"success":true,"version":"1.0.0","timestamp":"..."}
```

---

## Testing

Create test JWT at jwt.io with payload:
```json
{
  "iss": "syston.app",
  "aud": "syston-mobile",
  "sub": "test-tenant",
  "tenant_id": "test-tenant",
  "user_id": "test-user",
  "roles": ["user"],
  "exp": 1735689600
}
```

Test API endpoint:
```bash
TOKEN="your-jwt"

curl -H "Authorization: Bearer $TOKEN" \
  https://syston-postbus.YOUR_SUBDOMAIN.workers.dev/api/v1/events
```

Test Post Bus:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "idempotency-key: test-123" \
  -d '{"template":"test","channels":["make"],"data":{"msg":"Hello"}}' \
  https://syston-postbus.YOUR_SUBDOMAIN.workers.dev/api/v1/post
```

---

## Tenant Configuration (Manual)

Until admin endpoints are implemented:

```bash
# Create tenant config
cat > tenant.json << 'TENANT'
{
  "id": "syston-tigers",
  "name": "Syston Tigers",
  "plan": "BYO",
  "makeWebhookUrl": "https://hook.make.com/YOUR_ID",
  "flags": {
    "use_make": true,
    "direct_yt": false,
    "direct_fb": false,
    "direct_ig": false
  }
}
TENANT

# Write to KV
wrangler kv:key put --binding=KV_CACHE \
  "tenant:syston-tigers" \
  --path=tenant.json
```

---

## GitHub Actions

Add repository secrets:
- `CLOUDFLARE_API_TOKEN` 
- `CLOUDFLARE_ACCOUNT_ID`

Workflow at `.github/workflows/deploy.yml` will auto-deploy on push to main.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Namespace not found | Update KV IDs in wrangler.toml |
| Queue not found | Run `wrangler queues create post-queue` |
| 401 errors | Verify JWT_SECRET and token payload |
| 429 errors | Rate limiter working (5 req/sec limit) |

---

**Last Updated:** 2025-09-30

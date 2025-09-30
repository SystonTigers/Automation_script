# Fixtures Worker Deployment Guide

This guide covers deploying the Fixtures Worker to Cloudflare.

## Prerequisites

1. Cloudflare account with Workers access
2. `wrangler` CLI installed: `npm install -g wrangler`
3. Authenticated: `wrangler login`

## One-Time Setup

### 1. Create KV Namespaces

```bash
# Production namespace
wrangler kv:namespace create KV_FIXTURES --env production

# Preview namespace (for testing)
wrangler kv:namespace create KV_FIXTURES --env production --preview
```

This will output IDs like:
```
✅ Created namespace: KV_FIXTURES
ID: abc123def456...
```

### 2. Update wrangler.toml

Replace the KV namespace IDs in `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV_FIXTURES"
id = "abc123def456..."  # Use the ID from step 1

[[kv_namespaces]]
binding = "KV_FIXTURES"
preview_id = "xyz789..."  # Use the preview ID from step 1
```

### 3. Configure Environment Variables

Update these values in `wrangler.toml`:

```toml
FIXTURES_SOURCE_URL = "https://your-domain.com/fixtures.json"
APPS_SCRIPT_EVENTS_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
CLUB_NAME = "Your Club Name"
```

### 4. Set Secrets (if using API key for Apps Script)

```bash
wrangler secret put APPS_SCRIPT_EVENTS_API_KEY
# Enter your API key when prompted
```

### 5. Configure GitHub Secrets (for CI/CD)

Add to your repository secrets (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN` — Get from Cloudflare dashboard → Profile → API Tokens → Create Token → Edit Cloudflare Workers template

## Manual Deployment

```bash
# From project root
npm run build:fixtures

# Deploy
cd workers
wrangler deploy

# Verify
curl https://syston-fixtures.YOUR_SUBDOMAIN.workers.dev
```

## Automatic Deployment

GitHub Actions will automatically deploy when:
- Code changes to `workers/fixtures.ts` or related files
- Changes pushed to `main` branch

See `.github/workflows/fixtures-deploy.yml`

## Testing

### Local Development

```bash
# Run worker locally
wrangler dev

# Test in another terminal
curl http://localhost:8787
```

### Test Fixture Parsing

```bash
# Force cache refresh
curl https://syston-fixtures.YOUR_SUBDOMAIN.workers.dev?force=true
```

## Troubleshooting

### KV Namespace ID Not Found

**Error:** `Namespace with ID "REPLACE_WITH_KV_NAMESPACE_ID" not found`

**Solution:** Run `wrangler kv:namespace create KV_FIXTURES` and update `wrangler.toml` with the returned ID.

### Apps Script Endpoint Not Responding

**Error:** `Failed to publish to Apps Script`

**Solution:** 
1. Verify `APPS_SCRIPT_EVENTS_URL` is correct
2. Ensure Apps Script web app is deployed as "Anyone"
3. Check Apps Script logs for errors

### Build Fails

**Error:** `Cannot find module...`

**Solution:** Run `npm install` from project root first

## Monitoring

View logs in Cloudflare dashboard:
1. Go to Workers & Pages
2. Select `syston-fixtures`
3. Click "Logs" tab

## Manual Override Examples

To override specific fixtures, set in `wrangler.toml`:

```toml
FIXTURE_MANUAL_OVERRIDES = '[{"id":"match123","opposition":"Updated Team Name","kickoff":"2025-10-15T15:00:00Z"}]'
```

Or use multiple override env vars:
```toml
MANUAL_FIXTURE_OVERRIDES = '[...]'
MANUAL_FIXTURES = '[...]'
```

The worker will merge all three sources.

---

**Last Updated:** 2025-09-30

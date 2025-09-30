# Pre-Deployment Checklist

Complete before deploying backend Worker to production.

## Infrastructure

- [ ] Cloudflare Workers Paid plan activated ($5/month)
- [ ] wrangler CLI installed: `npm install -g wrangler`
- [ ] Authenticated: `wrangler login`
- [ ] KV namespace KV_CACHE created
- [ ] KV namespace KV_IDEMP created  
- [ ] Queue post-queue created
- [ ] R2 bucket media-bucket created (optional)

## Configuration

- [ ] wrangler.toml updated with actual KV namespace IDs
- [ ] wrangler.toml updated with actual queue name
- [ ] JWT_SECRET generated (32+ bytes random)
- [ ] JWT_SECRET set via `wrangler secret put JWT_SECRET`
- [ ] MAKE_WEBHOOK_BASE configured for managed tenants
- [ ] YT_API_KEY configured (if using YouTube Direct)

## Code

- [ ] Backend dependencies installed: `npm install`
- [ ] TypeScript builds without errors: `npm run build`
- [ ] Linter passes: `npm run lint`
- [ ] Tests pass: `npm test` (when tests added)

## Testing

- [ ] Test JWT created with correct issuer/audience
- [ ] Local testing completed: `wrangler dev`
- [ ] Health check endpoint tested locally

## GitHub Actions

- [ ] CLOUDFLARE_API_TOKEN added to repository secrets
- [ ] CLOUDFLARE_ACCOUNT_ID added to repository secrets
- [ ] CI workflow passes on latest commit

## Security

- [ ] Secrets stored via wrangler (never in code)
- [ ] CORS_ALLOWED configured with app domains only
- [ ] Rate limiting tested (5 req/sec limit)
- [ ] JWT validation tested (invalid tokens rejected)

## Monitoring

- [ ] Cloudflare dashboard access verified
- [ ] Workers analytics enabled
- [ ] Error alerting configured (email or webhook)

## Deployment

- [ ] Staging deployment tested first (if available)
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

## Post-Deployment

- [ ] Health check returns 200: `curl .../healthz`
- [ ] Test API calls with JWT succeed
- [ ] Queue consumer processing messages
- [ ] Rate limiting working (429 after 5 requests)
- [ ] Idempotency working (duplicate requests cached)
- [ ] Tenant configuration verified in KV

---

**Date:** ___________  
**Deployed By:** ___________  
**Worker URL:** ___________

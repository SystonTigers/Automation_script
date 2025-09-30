# Syston Post Bus Architecture

The Post Bus is a Cloudflare Workers based backend that queues and delivers social posts, attendance events, and live stream metadata for Syston FC applications.

## Components

| Component | Purpose | Key Files |
| --- | --- | --- |
| HTTP Worker | Handles REST API traffic, rate limits, and idempotency | `../backend/src/index.ts` |
| Queue Consumer | Processes `POST_QUEUE` jobs, invokes channel adapters | `../backend/src/queue-consumer.ts` |
| Durable Object | Token bucket implementation per tenant | `../backend/src/do/rateLimiter.ts` |
| Adapters | Integrations for Make.com, Canva, and direct social APIs | `../backend/src/adapters/*.ts` |
| Services | Tenant config, fixtures cache, table cache, auth helpers | `../backend/src/services/*.ts` |

## Cloudflare Bindings

| Binding | Type | Description |
| --- | --- | --- |
| `KV_CACHE` | KV Namespace | Cached fixtures, table, tenant records, localization bundles |
| `KV_IDEMP` | KV Namespace | Stores idempotent responses for POST requests |
| `POST_QUEUE` | Queue | Post Bus producer queue |
| `TenantRateLimiter` | Durable Object | Per-tenant rate limiting buckets |
| `R2_MEDIA` | R2 Bucket | Reserved for media assets rendered via Canva |

## Runtime Flow

1. Clients call `/api/v1/post` (and other endpoints) with JWT bearer tokens.
2. The Worker validates the payload with Zod, enforces tenant rate limits, and issues a job onto `POST_QUEUE`.
3. Queue consumer resolves tenant configuration, chooses either Make.com fallback or a direct publisher, and writes the final idempotent response.
4. Durable Object throttles each tenant endpoint bucket, returning `429` when limits are exceeded.
5. Nightly synthetics hit `/healthz` and queue a sandbox post to verify the pipeline.

_Last updated: 2024-05-05T00:00:00Z_

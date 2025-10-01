
// v1: simple KV map; later you can swap to Durable Object or D1/Firestore
export async function getTenant(env: any, tenantId: string) {
  const raw = await env.KV_IDEMP.get("tenant:" + tenantId); // reuse KV namespace; or add KV_TENANTS
  if (!raw) {
    // Default flags: use Make fallback until direct publishers exist
    return { id: tenantId, flags: { use_make: true, direct_fb: false, direct_ig: false, direct_yt: true }, makeWebhookUrl: env.MAKE_WEBHOOK_BASE };
  }
  return JSON.parse(raw);
import type { Env, TenantConfig, TenantFlags } from '../types';

const TENANT_PREFIX = 'tenant:';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function defaultFlags(env: Env): TenantFlags {
  return {
    use_make: parseBoolean(env.FEATURE_USE_MAKE, true),
    direct_fb: parseBoolean(env.FEATURE_DIRECT_FB, false),
    direct_ig: parseBoolean(env.FEATURE_DIRECT_IG, false),
    direct_yt: parseBoolean(env.FEATURE_DIRECT_YT, true),
  };
}

export async function getTenant(env: Env, tenantId: string): Promise<TenantConfig> {
  const key = `${TENANT_PREFIX}${tenantId}`;
  const cached = await env.KV_CACHE.get<TenantConfig>(key, 'json');
  if (cached) {
    return normalizeTenant(env, cached);
  }
  const fallback: TenantConfig = {
    id: tenantId,
    plan: 'BYO',
    channels: {},
    flags: defaultFlags(env),
    limits: { posts_per_day: 200 },
    makeWebhookUrl: env.MAKE_WEBHOOK_BASE,
    updatedAt: Date.now(),
  };
  return fallback;
}

export async function putTenant(env: Env, tenant: TenantConfig): Promise<void> {
  const key = `${TENANT_PREFIX}${tenant.id}`;
  const payload = { ...tenant, updatedAt: Date.now() } satisfies TenantConfig;
  await env.KV_CACHE.put(key, JSON.stringify(payload));
}

export function normalizeTenant(env: Env, tenant: TenantConfig): TenantConfig {
  return {
    ...tenant,
    flags: {
      ...defaultFlags(env),
      ...tenant.flags,
    },
    updatedAt: tenant.updatedAt ?? Date.now(),
  };
}

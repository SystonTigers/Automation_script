import type { AutomationEnv, TenantFlags, TenantRecord } from '../types';

const TENANT_PREFIX = 'tenant:';

export async function getTenant(env: Pick<AutomationEnv, 'KV_TENANT_FLAGS'>, tenantId: string): Promise<TenantRecord | null> {
  const raw = await env.KV_TENANT_FLAGS.get(TENANT_PREFIX + tenantId);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as TenantRecord;
    if (!parsed.flags) {
      parsed.flags = {};
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse tenant record', { tenantId, error });
    return null;
  }
}

export async function saveTenant(
  env: Pick<AutomationEnv, 'KV_TENANT_FLAGS'>,
  tenantId: string,
  update: Partial<TenantRecord>
): Promise<TenantRecord> {
  const existing = await getTenant(env, tenantId);
  const merged: TenantRecord = {
    ...existing,
    ...update,
    id: tenantId,
    flags: { ...existing?.flags, ...(update.flags || {}) },
    updatedAt: new Date().toISOString()
  };
  await env.KV_TENANT_FLAGS.put(TENANT_PREFIX + tenantId, JSON.stringify(merged));
  return merged;
}

export function applyFlagUpdate(record: TenantRecord, flags: TenantFlags): TenantRecord {
  record.flags = { ...record.flags, ...flags };
  record.updatedAt = new Date().toISOString();
  return record;
}

import { fetchWithBackoff } from '../utils/http';
import type { AutomationEnv, PublishResult, TenantRecord } from '../types';

export async function publishViaMake(
  env: Pick<AutomationEnv, 'MAKE_WEBHOOK_URL'>,
  tenant: TenantRecord,
  template: string,
  data: Record<string, unknown>,
  idempotencyKey?: string
): Promise<PublishResult> {
  if (!env.MAKE_WEBHOOK_URL) {
    throw new Error('Make webhook not configured');
  }

  const payload = {
    tenant: tenant.id,
    template,
    data,
    flags: tenant.flags,
    idempotencyKey
  };

  const response = await fetchWithBackoff(env.MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
    },
    body: JSON.stringify(payload)
  });

  return {
    ok: true,
    status: response.status,
    forwarded: true,
    data: response.data
  } as PublishResult;
}

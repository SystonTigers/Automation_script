import type { KVNamespace } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import { ensureIdempotent } from '../runtime/idempotency';
import type { AutomationEnv } from '../types';

function createMockKV() {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    }
  } as unknown as KVNamespace;
}

describe('ensureIdempotent', () => {
  it('stores and retrieves idempotent responses', async () => {
    const env = {
      KV_IDEMP: createMockKV(),
      IDEMPOTENCY_TTL_SECONDS: '60'
    } as unknown as AutomationEnv;

    const payload = { tenant: 'clubA', template: 'fixture', data: { msg: 'hello' } };
    const idem1 = await ensureIdempotent(env, 'clubA', payload);

    expect(idem1.hit).toBe(false);

    const response = { success: true, message: 'stored' };
    await idem1.store(response);

    const idem2 = await ensureIdempotent<typeof response>(env, 'clubA', payload);
    expect(idem2.hit).toBe(true);
    expect(idem2.response).toEqual(response);
  });

  it('uses explicit keys when provided', async () => {
    const env = {
      KV_IDEMP: createMockKV()
    } as unknown as AutomationEnv;

    const idem1 = await ensureIdempotent(env, 'clubB', { value: 1 }, 'custom-key');
    expect(idem1.hit).toBe(false);
    await idem1.store({ ok: true });

    const idem2 = await ensureIdempotent(env, 'clubB', { value: 99 }, 'custom-key');
    expect(idem2.hit).toBe(true);
  });
});

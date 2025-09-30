import type { DurableObjectStorage } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import { evaluateRateLimit } from '../runtime/rate-limit';

function createMemoryStorage(): DurableObjectStorage {
  const store = new Map<string, unknown>();
  return {
    async get<T>(key: string): Promise<T | undefined> {
      return store.get(key) as T | undefined;
    },
    async put<T>(key: string, value: T): Promise<void> {
      store.set(key, value);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list() {
      return { keys: [] } as unknown as Awaited<ReturnType<DurableObjectStorage['list']>>;
    }
  } as unknown as DurableObjectStorage;
}

describe('Rate limiter durable object logic', () => {
  it('enforces limits within the same window', async () => {
    const storage = createMemoryStorage();
    const now = Date.now();

    const first = await evaluateRateLimit(storage, 'tenantA', 2, 60, now);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await evaluateRateLimit(storage, 'tenantA', 2, 60, now + 1000);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = await evaluateRateLimit(storage, 'tenantA', 2, 60, now + 2000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('resets after the window elapses', async () => {
    const storage = createMemoryStorage();
    const now = Date.now();

    await evaluateRateLimit(storage, 'tenantB', 1, 5, now);
    const blocked = await evaluateRateLimit(storage, 'tenantB', 1, 5, now + 1000);
    expect(blocked.allowed).toBe(false);

    const afterWindow = await evaluateRateLimit(storage, 'tenantB', 1, 5, now + 6000);
    expect(afterWindow.allowed).toBe(true);
  });
});

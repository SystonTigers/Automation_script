import type { AutomationEnv } from '../types';

declare const Buffer: undefined | { from(input: Uint8Array | string, encoding?: string): { toString(encoding: string): string } };

const DEFAULT_TTL_SECONDS = 60 * 60 * 24;
const IDEMPOTENCY_PREFIX = 'idem:';

export interface IdempotentResult<T> {
  key: string;
  hit: boolean;
  response?: T;
  store(response: T): Promise<void>;
}

interface StoredPayload<T> {
  storedAt: string;
  response: T;
}

const encoder = new TextEncoder();

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes)
    .map(byte => String.fromCharCode(byte))
    .join('');
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(bytes).toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function digestSha256(input: string): Promise<string> {
  const bytes = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return toBase64Url(hashBuffer);
}

export async function ensureIdempotent<T = unknown>(
  env: Pick<AutomationEnv, 'KV_IDEMP' | 'IDEMPOTENCY_TTL_SECONDS'>,
  tenantId: string,
  payload: unknown,
  explicitKey?: string
): Promise<IdempotentResult<T>> {
  const baseKey = explicitKey || `${tenantId}:${await digestSha256(JSON.stringify(payload ?? {}))}`;
  const kvKey = IDEMPOTENCY_PREFIX + baseKey;
  const ttl = Number.parseInt(env.IDEMPOTENCY_TTL_SECONDS || '', 10);
  const expirationTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_SECONDS;

  const storedRaw = await env.KV_IDEMP.get(kvKey);
  if (storedRaw) {
    try {
      const parsed = JSON.parse(storedRaw) as StoredPayload<T>;
      return {
        key: baseKey,
        hit: true,
        response: parsed.response,
        store: async () => {}
      };
    } catch (error) {
      console.warn('Failed to parse stored idempotent payload', error);
    }
  }

  return {
    key: baseKey,
    hit: false,
    store: async (response: T) => {
      const payloadToStore: StoredPayload<T> = {
        storedAt: new Date().toISOString(),
        response
      };
      await env.KV_IDEMP.put(kvKey, JSON.stringify(payloadToStore), {
        expirationTtl
      });
    }
  };
}

export function clearIdempotentKey(env: Pick<AutomationEnv, 'KV_IDEMP'>, key: string): Promise<void> {
  return env.KV_IDEMP.delete(IDEMPOTENCY_PREFIX + key);
}

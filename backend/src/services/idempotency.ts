import type { ApiResponse, Env } from '../types';

const IDEMP_PREFIX = 'idem:';
const TTL_SECONDS = 60 * 60 * 24;

async function hashPayload(value: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(typeof value === 'string' ? value : JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function keyFor(tenantId: string, hash: string): string {
  return `${IDEMP_PREFIX}${tenantId}:${hash}`;
}

export interface IdempotencyResult<T = unknown> {
  key: string;
  hit: boolean;
  response?: ApiResponse<T>;
  store: (response: ApiResponse<T>) => Promise<void>;
}

export async function ensureIdempotent<T>(
  env: Env,
  tenantId: string,
  payload: unknown,
  explicitKey?: string,
): Promise<IdempotencyResult<T>> {
  const hash = explicitKey ?? (await hashPayload(payload));
  const key = keyFor(tenantId, hash);
  const cached = await env.KV_IDEMP.get<ApiResponse<T>>(key, 'json');
  if (cached) {
    return {
      key,
      hit: true,
      response: cached,
      store: async () => Promise.resolve(),
    };
  }
  return {
    key,
    hit: false,
    store: async (response: ApiResponse<T>) => {
      await env.KV_IDEMP.put(key, JSON.stringify(response), { expirationTtl: TTL_SECONDS });
    },
  };
}

export async function setFinalIdempotent<T>(
  env: Env,
  key: string,
  response: ApiResponse<T>,
): Promise<void> {
  await env.KV_IDEMP.put(key, JSON.stringify(response), { expirationTtl: TTL_SECONDS });
}

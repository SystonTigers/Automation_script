
import { json } from "./util";

export async function ensureIdempotent(env: any, tenantId: string, body: unknown, explicitKey?: string) {
  const key = explicitKey || await hashKey(tenantId, body);
  const existing = await env.KV_IDEMP.get(key);
  if (existing) return { hit: true as const, key, response: JSON.parse(existing) };
  return {
    hit: false as const,
    key,
    store: async (resp: unknown) => { await env.KV_IDEMP.put(key, JSON.stringify(resp), { expirationTtl: 60 * 60 * 24 }); }
  };
}

export async function setFinalIdempotent(env: any, key: string, resp: unknown) {
  await env.KV_IDEMP.put(key, JSON.stringify(resp), { expirationTtl: 60 * 60 * 24 });
}

async function hashKey(tenantId: string, body: unknown) {
  const txt = tenantId + ":" + JSON.stringify(body);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
  return "idem:" + tenantId + ":" + hex(digest);
}
function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
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

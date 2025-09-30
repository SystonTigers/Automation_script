import type { Env, RateLimitResult } from '../types';

export class RateLimitError extends Error {
  public readonly result: RateLimitResult;
  constructor(result: RateLimitResult) {
    super('Rate limit exceeded');
    this.result = result;
  }
}

async function requestLimit(
  env: Env,
  tenantId: string,
  bucket: string,
): Promise<RateLimitResult> {
  const id = env.TenantRateLimiter.idFromName(tenantId);
  const stub = env.TenantRateLimiter.get(id);
  const url = `https://tenant-rate-limiter/check?bucket=${encodeURIComponent(bucket)}`;
  const response = await stub.fetch(url, {
    method: 'POST',
  });
  const result = (await response.json()) as RateLimitResult;
  if (!response.ok || !result.ok) {
    throw new RateLimitError(result);
  }
  return result;
}

export function tenantLimiter(env: Env, tenantId: string) {
  return {
    async check(bucket: string): Promise<RateLimitResult> {
      return requestLimit(env, tenantId, bucket);
    },
  };
}

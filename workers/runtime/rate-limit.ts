import type { DurableObjectState, DurableObjectStorage } from '@cloudflare/workers-types';
import type { AutomationEnv } from '../types';

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_SECONDS = 60;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

interface StoredCounter {
  count: number;
  resetAt: number;
}

export async function evaluateRateLimit(
  storage: DurableObjectStorage,
  key: string,
  limit: number,
  windowSeconds: number,
  now: number
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const record = (await storage.get<StoredCounter>(key)) || { count: 0, resetAt: now + windowMs };

  if (!record.resetAt || record.resetAt <= now) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  const allowed = record.count <= limit;
  const remaining = allowed ? limit - record.count : 0;

  await storage.put(key, record);

  return {
    allowed,
    remaining,
    resetSeconds: Math.max(0, Math.ceil((record.resetAt - now) / 1000))
  };
}

export class RateLimiterDurableObject {
  private defaultLimit: number;
  private defaultWindow: number;

  constructor(private state: DurableObjectState, env: AutomationEnv) {
    const parsedLimit = Number.parseInt(env.RATE_LIMIT_DEFAULT_LIMIT || '', 10);
    const parsedWindow = Number.parseInt(env.RATE_LIMIT_DEFAULT_WINDOW || '', 10);
    this.defaultLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_LIMIT;
    this.defaultWindow = Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : DEFAULT_WINDOW_SECONDS;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { 'Allow': 'POST' }
      });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.key !== 'string') {
      return jsonResponse({ success: false, error: 'Invalid rate limit request' }, 400);
    }

    const limit = typeof body.limit === 'number' && body.limit > 0 ? body.limit : this.defaultLimit;
    const windowSeconds = typeof body.windowSeconds === 'number' && body.windowSeconds > 0
      ? body.windowSeconds
      : this.defaultWindow;

    const now = typeof body.now === 'number' && Number.isFinite(body.now) ? body.now : Date.now();
    const result = await evaluateRateLimit(this.state.storage, body.key, limit, windowSeconds, now);

    return jsonResponse({ success: true, result });
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

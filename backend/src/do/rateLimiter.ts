import type { DurableObjectState } from '@cloudflare/workers-types';

interface BucketState {
  tokens: number;
  updatedAt: number;
}

const LIMIT = 5;
const REFILL_RATE = 1; // tokens per second

export class TenantRateLimiter {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async load(bucket: string): Promise<BucketState> {
    const stored = await this.state.storage.get<BucketState>(bucket);
    if (stored) {
      return stored;
    }
    return { tokens: LIMIT, updatedAt: Date.now() };
  }

  private save(bucket: string, data: BucketState) {
    return this.state.storage.put(bucket, data);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/check') {
      return new Response('Not found', { status: 404 });
    }
    const bucket = url.searchParams.get('bucket') ?? 'default';
    const now = Date.now();
    const state = await this.load(bucket);
    const elapsed = (now - state.updatedAt) / 1000;
    const refill = Math.floor(elapsed * REFILL_RATE);
    const tokens = Math.min(LIMIT, state.tokens + refill);
    if (tokens <= 0) {
      const reset = Math.ceil(state.updatedAt / 1000) + LIMIT;
      return new Response(
        JSON.stringify({ ok: false, limit: LIMIT, remaining: 0, reset }),
        { status: 429, headers: { 'content-type': 'application/json' } },
      );
    }

    const remaining = Math.max(tokens - 1, 0);
    const reset = Math.ceil(now / 1000) + 1;
    const nextState: BucketState = {
      tokens: remaining,
      updatedAt: now,
    };
    await this.save(bucket, nextState);

    return new Response(
      JSON.stringify({ ok: true, limit: LIMIT, remaining, reset }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }
}

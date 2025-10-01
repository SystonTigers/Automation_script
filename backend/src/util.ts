import { z } from 'zod';
import type { ApiResponse, Env, RateLimitResult } from './types';

const DEFAULT_HEADERS = 'authorization,content-type,idempotency-key';
const DEFAULT_METHODS = 'GET,POST,OPTIONS';

const corsHeaders = (env: Env): Record<string, string> => {
  const configured = env.CORS_ALLOWED;
  return {
    'access-control-allow-origin': configured ?? '*',
    'access-control-allow-headers': DEFAULT_HEADERS,
    'access-control-allow-methods': DEFAULT_METHODS,
    'access-control-max-age': '86400',
  };
};

export function withCORS(response: Response, env: Env): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(env);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function json<T>(body: ApiResponse<T>, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers({ 'content-type': 'application/json' });
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      responseHeaders.set(key, value as string);
    }
  }
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export async function parseJSON<T>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) {
    throw new Error('EMPTY_BODY');
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error('INVALID_JSON');
  }
}

export const postRequestSchema = z.object({
  tenant: z.string().min(1),
  template: z.string().min(1),
  channels: z.array(z.enum(['fb', 'ig', 'yt', 'tt', 'make'])).nonempty(),
  data: z.record(z.any()),
});

export function validatePostReq(payload: unknown) {
  const result = postRequestSchema.safeParse(payload);
  if (!result.success) {
    return { error: result.error.flatten(), value: undefined };
  }
  return { value: result.data, error: undefined };
}

export function rateLimitHeaders(result: RateLimitResult | undefined): HeadersInit {
  if (!result) return {};
  return {
    'x-ratelimit-limit': result.limit.toString(),
    'x-ratelimit-remaining': result.remaining.toString(),
    'x-ratelimit-reset': result.reset.toString(),
  };
}

export function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function failure(code: string, message: string, details?: unknown): ApiResponse<never> {
  return { success: false, error: { code, message, details } };
}

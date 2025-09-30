import type { ExecutionContext, ExportedHandler } from '@cloudflare/workers-types';
import { ensureIdempotent } from './runtime/idempotency';
import { getTenant, saveTenant } from './runtime/tenant';
import { storeYouTubeCredentials } from './runtime/tokens';
import type { AutomationEnv, PublishJobBody, TenantRecord } from './types';

interface JwtPayload {
  sub?: string;
  tenant?: string;
  role?: string;
  [key: string]: unknown;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

declare const Buffer: undefined | { from(input: string, encoding?: string): { toString(encoding: string): string } };

const worker: ExportedHandler<AutomationEnv> = {
  async fetch(request: Request, env: AutomationEnv, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);
    const apiVersion = env.API_VERSION || 'v1';
    const corsHeaders = buildCorsHeaders();

    if (url.pathname === '/healthz') {
      return jsonResponse({ ok: true, status: 'healthy' }, 200, corsHeaders);
    }

    if (url.pathname === `/api/${apiVersion}/post` && request.method === 'POST') {
      return handlePost(request, env, corsHeaders);
    }

    if (url.pathname === `/api/${apiVersion}/admin/tenant/flags` && request.method === 'POST') {
      return handleTenantFlags(request, env, corsHeaders);
    }

    if (url.pathname === `/api/${apiVersion}/admin/tenant/youtube-token` && request.method === 'POST') {
      return handleTenantYouTubeToken(request, env, corsHeaders);
    }

    if (url.pathname === `/api/${apiVersion}/admin/tenant/force-make` && request.method === 'POST') {
      return handleForceMake(request, env, corsHeaders);
    }

    return jsonResponse({ success: false, error: 'Not Found' }, 404, corsHeaders);
  }
};

export default worker;

async function handlePost(
  request: Request,
  env: AutomationEnv,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const payload = await authenticate(request, env, { requireAdmin: false });
  if (!payload) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.tenant !== 'string' || !Array.isArray(body.channels) || typeof body.template !== 'string') {
    return jsonResponse({ success: false, error: 'Invalid request body' }, 400, corsHeaders);
  }

  if (payload.tenant && payload.tenant !== body.tenant && payload.role !== 'admin') {
    return jsonResponse({ success: false, error: 'Tenant mismatch' }, 403, corsHeaders);
  }

  const idempotencyKeyHeader = request.headers.get('Idempotency-Key') || undefined;
  const idempotency = await ensureIdempotent<{ success: boolean; data: unknown }>(
    env,
    body.tenant,
    { template: body.template, channels: body.channels, data: body.data },
    idempotencyKeyHeader
  );

  if (idempotency.hit && idempotency.response) {
    return jsonResponse(idempotency.response, 200, corsHeaders);
  }

  const job: PublishJobBody = {
    tenant: body.tenant,
    template: body.template,
    channels: body.channels.map((channel: unknown) => String(channel)).filter(Boolean),
    data: typeof body.data === 'object' && body.data ? body.data : {},
    idempotencyKey: idempotency.key
  };

  await env.POST_QUEUE.send(job);

  const responsePayload = {
    success: true,
    data: {
      enqueued: true,
      idempotencyKey: idempotency.key
    }
  };

  await idempotency.store(responsePayload);

  return jsonResponse(responsePayload, 202, corsHeaders);
}

async function handleTenantFlags(request: Request, env: AutomationEnv, corsHeaders: Record<string, string>): Promise<Response> {
  const payload = await authenticate(request, env, { requireAdmin: true });
  if (!payload) {
    return jsonResponse({ success: false, error: 'Forbidden' }, 403, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.tenant !== 'string' || typeof body.flags !== 'object') {
    return jsonResponse({ success: false, error: 'tenant and flags required' }, 400, corsHeaders);
  }

  const existing = (await getTenant(env, body.tenant)) || {
    id: body.tenant,
    flags: {},
    updatedAt: new Date().toISOString()
  } as TenantRecord;
  const mergedFlags = { ...existing.flags, ...(body.flags || {}) };
  const updated = await saveTenant(env, body.tenant, { flags: mergedFlags });

  return jsonResponse({ success: true, data: { tenant: body.tenant, flags: updated.flags } }, 200, corsHeaders);
}

async function handleTenantYouTubeToken(request: Request, env: AutomationEnv, corsHeaders: Record<string, string>): Promise<Response> {
  const payload = await authenticate(request, env, { requireAdmin: true });
  if (!payload) {
    return jsonResponse({ success: false, error: 'Forbidden' }, 403, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.tenant !== 'string' || typeof body.client_id !== 'string' || typeof body.client_secret !== 'string' || typeof body.refresh_token !== 'string') {
    return jsonResponse({ success: false, error: 'tenant, client_id, client_secret, refresh_token required' }, 400, corsHeaders);
  }

  await storeYouTubeCredentials(env, body.tenant, {
    client_id: body.client_id,
    client_secret: body.client_secret,
    refresh_token: body.refresh_token,
    channel_id: typeof body.channel_id === 'string' ? body.channel_id : null
  });

  return jsonResponse({ success: true, data: { stored: true } }, 200, corsHeaders);
}

async function handleForceMake(request: Request, env: AutomationEnv, corsHeaders: Record<string, string>): Promise<Response> {
  const payload = await authenticate(request, env, { requireAdmin: true });
  if (!payload) {
    return jsonResponse({ success: false, error: 'Forbidden' }, 403, corsHeaders);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.tenant !== 'string') {
    return jsonResponse({ success: false, error: 'tenant required' }, 400, corsHeaders);
  }

  const existing = (await getTenant(env, body.tenant)) || {
    id: body.tenant,
    flags: {},
    updatedAt: new Date().toISOString()
  } as TenantRecord;
  const updated = await saveTenant(env, body.tenant, {
    flags: { ...existing.flags, use_make: true }
  });

  return jsonResponse({ success: true, data: { tenant: updated.id, flags: updated.flags } }, 200, corsHeaders);
}

async function authenticate(
  request: Request,
  env: AutomationEnv,
  options: { requireAdmin: boolean }
): Promise<JwtPayload | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7);
  const secrets = [env.JWT_SECRET, env.ADMIN_JWT_SECRET].filter((value): value is string => Boolean(value));
  for (const secret of secrets) {
    try {
      const payload = await verifyJwt(token, secret);
      if (!options.requireAdmin || payload.role === 'admin') {
        return payload;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Malformed token');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const valid = await crypto.subtle.verify('HMAC', key, signature, data);
  if (!valid) {
    throw new Error('Invalid signature');
  }

  const payloadJson = JSON.parse(new TextDecoder().decode(base64UrlToUint8Array(payloadB64)));
  return payloadJson as JwtPayload;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const paddedBase64 = padded + '='.repeat(padLength);
  const binary = typeof atob === 'function'
    ? atob(paddedBase64)
    : Buffer.from(paddedBase64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function buildCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization,content-type,Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...corsHeaders
    }
  });
}

function corsResponse(response: Response): Response {
  const corsHeaders = buildCorsHeaders();
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => newHeaders.set(key, value));
  return new Response(response.body, { status: response.status, headers: newHeaders });
}

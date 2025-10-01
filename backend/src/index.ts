
import { z } from "zod";
import { json, cors, PostReqSchema, readIdempotencyKey } from "./services/util";
import { requireJWT } from "./services/auth";
import { ensureIdempotent } from "./services/idempotency";

export default {
  async fetch(req: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(req.url);
    const allowed = (env.CORS_ALLOWED ? String(env.CORS_ALLOWED).split(",") : null);
    const corsHdrs = cors(allowed, req.headers.get("origin"));

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHdrs });

    if (url.pathname === "/healthz") {
      return json({ ok: true, ts: Date.now() }, 200, corsHdrs);
    }

    // Example: /api/v1/post (enqueue a job)
    if (url.pathname === `/api/${env.API_VERSION}/post` && req.method === "POST") {
      // auth
      const user = await requireJWT(req, env).catch((e) => { throw e; });

      let body: unknown;
      try { body = await req.json(); } catch { return json({ success: false, error: { code: "BAD_JSON", message: "Invalid JSON" } }, 400, corsHdrs); }

      const parsed = PostReqSchema.safeParse(body);
      if (!parsed.success) return json({ success: false, error: { code: "VALIDATION", message: parsed.error.message } }, 400, corsHdrs);

      const idemHeader = readIdempotencyKey(req);
      const idem = await ensureIdempotent(env, parsed.data.tenant, parsed.data, idemHeader || undefined);
      if (idem.hit) return json(idem.response, 200, corsHdrs);

      await env.POST_QUEUE.send({
        tenant: parsed.data.tenant,
        template: parsed.data.template,
        channels: parsed.data.channels,
        data: parsed.data.data,
        createdAt: Date.now(),
        idemKey: idem.key
      });

      const resp = { success: true, data: { queued: true } };
      await idem.store(resp);
      return json(resp, 202, corsHdrs);
    }

    return json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }, 404, corsHdrs);
  }
import { ensureIdempotent } from './services/idempotency';
import { handleAdminRoute } from './admin';
import { RateLimitError, tenantLimiter } from './services/ratelimit';
import { AuthError, requireJWT, unauthorized } from './services/auth';
import { listFixtures } from './services/fixtures';
import { getLeagueTable } from './services/table';
import type {
  AttendancePayload,
  Env,
  PostJob,
  StreamInfo,
  StreamScheduleRequest,
  UserContext,
  VotePayload,
  VoteTallyEntry,
} from './types';
import { failure, json, parseJSON, rateLimitHeaders, success, validatePostReq, withCORS } from './util';

function requiresAuth(path: string): boolean {
  if (path === '/healthz') return false;
  if (path.startsWith('/i18n/')) return false;
  return true;
}

async function loadStream(env: Env, tenantId: string, matchId: string): Promise<StreamInfo | null> {
  const key = `stream:${tenantId}:${matchId}`;
  const cached = await env.KV_CACHE.get<StreamInfo>(key, 'json');
  return cached ?? null;
}

async function saveStream(env: Env, tenantId: string, stream: StreamInfo): Promise<void> {
  const key = `stream:${tenantId}:${stream.matchId}`;
  await env.KV_CACHE.put(key, JSON.stringify(stream));
}

async function recordVote(env: Env, tenantId: string, vote: VotePayload): Promise<void> {
  const key = `votes:${tenantId}:${vote.matchId}`;
  const current = (await env.KV_CACHE.get<VoteTallyEntry[]>(key, 'json')) ?? [];
  const updated = [...current];
  const existing = updated.find((entry) => entry.candidateId === vote.candidateId);
  if (existing) {
    existing.votes += 1;
  } else {
    updated.push({ candidateId: vote.candidateId, votes: 1 });
  }
  await env.KV_CACHE.put(key, JSON.stringify(updated));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return withCORS(new Response(null, { status: 204 }), env);
    }

    const url = new URL(request.url);

    if (url.pathname === '/healthz') {
      return withCORS(
        json(success({ ok: true, version: env.API_VERSION ?? 'v1' })),
        env,
      );
    }

    if (url.pathname.startsWith('/i18n/')) {
      const locale = url.pathname.split('/').pop() ?? 'en';
      const key = `i18n:${locale}`;
      const bundle = await env.KV_CACHE.get(key, 'text');
      const payload = bundle ? JSON.parse(bundle) : { locale, messages: {} };
      return withCORS(json(success(payload)), env);
    }

    let user: UserContext | null = null;
    if (requiresAuth(url.pathname)) {
      try {
        user = await requireJWT(request, env);
      } catch (error) {
        if (error instanceof AuthError) {
          return unauthorized(env, error.message);
        }
        throw error;
      }
    }

    try {
      if (url.pathname === '/api/v1/events' && request.method === 'GET') {
        if (!user) return unauthorized(env, 'Authentication required');
        const limiter = tenantLimiter(env, user.tenantId);
        const rate = await limiter.check('events');
        const events = await listFixtures(env);
        return withCORS(json(success({ events }), 200, rateLimitHeaders(rate)), env);
      }

      if (url.pathname === '/api/v1/post' && request.method === 'POST') {
        if (!user) {
          return unauthorized(env, 'Authentication required');
        }
        const payload = await parseJSON<Partial<PostJob>>(request);
        const { value, error } = validatePostReq(payload);
        if (error || !value) {
          return withCORS(json(failure('INVALID_REQUEST', 'Invalid payload', error), 400), env);
        }
        const limiter = tenantLimiter(env, user.tenantId);
        const rate = await limiter.check('post');
        const idemHeader = request.headers.get('idempotency-key') ?? undefined;
        const idem = await ensureIdempotent(env, user.tenantId, payload, idemHeader);
        if (idem.hit && idem.response) {
          return withCORS(json(idem.response, 200, rateLimitHeaders(rate)), env);
        }
        await env.POST_QUEUE.send({
          tenant: user.tenantId,
          template: value.template,
          channels: value.channels,
          data: value.data,
          createdAt: Date.now(),
          idemKey: idem.key,
        });
        const response = success({ queued: true });
        await idem.store(response);
        return withCORS(json(response, 202, rateLimitHeaders(rate)), env);
      }

      if (url.pathname === '/api/v1/attendance' && request.method === 'POST') {
        if (!user) return unauthorized(env, 'Authentication required');
        const limiter = tenantLimiter(env, user.tenantId);
        const rate = await limiter.check('attendance');
        const payload = await parseJSON<AttendancePayload>(request);
        const idem = await ensureIdempotent(env, user.tenantId, payload, request.headers.get('idempotency-key') ?? undefined);
        if (idem.hit && idem.response) {
          return withCORS(json(idem.response, 200, rateLimitHeaders(rate)), env);
        }
        const key = `attendance:${user.tenantId}:${payload.matchId}:${payload.playerId}`;
        await env.KV_CACHE.put(key, JSON.stringify(payload));
        const response = success({ recorded: true });
        await idem.store(response);
        return withCORS(json(response, 200, rateLimitHeaders(rate)), env);
      }

      if (url.pathname === '/api/v1/votes' && request.method === 'POST') {
        if (!user) return unauthorized(env, 'Authentication required');
        const limiter = tenantLimiter(env, user.tenantId);
        const rate = await limiter.check('votes');
        const payload = await parseJSON<VotePayload>(request);
        const idem = await ensureIdempotent(
          env,
          user.tenantId,
          payload,
          request.headers.get('idempotency-key') ?? undefined,
        );
        if (idem.hit && idem.response) {
          return withCORS(json(idem.response, 200, rateLimitHeaders(rate)), env);
        }
        await recordVote(env, user.tenantId, payload);
        const response = success({ recorded: true });
        await idem.store(response);
        return withCORS(json(response, 200, rateLimitHeaders(rate)), env);
      }

      if (url.pathname === '/api/v1/votes/tally' && request.method === 'GET') {
        if (!user) return unauthorized(env, 'Authentication required');
        const limiter = tenantLimiter(env, user.tenantId);
        const rate = await limiter.check('votes');
        const matchId = url.searchParams.get('matchId') ?? 'latest';
        const key = `votes:${user.tenantId}:${matchId}`;
        const tally = (await env.KV_CACHE.get<VoteTallyEntry[]>(key, 'json')) ?? [];
        return withCORS(json(success({ tally }), 200, rateLimitHeaders(rate)), env);
      }

      if (url.pathname.startsWith('/api/v1/streams/') && request.method === 'GET') {
        if (!user) return unauthorized(env, 'Authentication required');
        const limiter = tenantLimiter(env, user.tenantId);
        const rate = await limiter.check('streams');
        const matchId = url.pathname.split('/').pop() ?? '';
        const stream = await loadStream(env, user.tenantId, matchId);
        if (!stream) {
          return withCORS(json(failure('NOT_FOUND', 'Stream not found'), 404), env);
        }
        return withCORS(json(success(stream), 200, rateLimitHeaders(rate)), env);
      }

      if (url.pathname === '/api/v1/streams/schedule' && request.method === 'POST') {
        if (!user) return unauthorized(env, 'Authentication required');
        const limiter = tenantLimiter(env, user.tenantId);
        const rate = await limiter.check('streams');
        const payload = await parseJSON<StreamScheduleRequest>(request);
        const stream: StreamInfo = {
          matchId: payload.matchId,
          platform: payload.platform,
          scheduledFor: payload.scheduledFor,
          status: 'scheduled',
        };
        await saveStream(env, user.tenantId, stream);
        return withCORS(json(success(stream), 201, rateLimitHeaders(rate)), env);
      }

      if (url.pathname === '/api/v1/table' && request.method === 'GET') {
        if (!user) return unauthorized(env, 'Authentication required');
        const limiter = tenantLimiter(env, user.tenantId);
        const rate = await limiter.check('table');
        const table = await getLeagueTable(env);
        return withCORS(json(success(table), 200, rateLimitHeaders(rate)), env);
      }

      // Admin routes
      if (url.pathname.startsWith('/api/v1/admin/')) {
        if (!user) return unauthorized(env, 'Authentication required');
        return handleAdminRoute(request, env, user, url.pathname);
      }

      return withCORS(json(failure('NOT_FOUND', 'Route not found'), 404), env);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return withCORS(
          json(failure('RATE_LIMITED', 'Too many requests'), 429, rateLimitHeaders(error.result)),
          env,
        );
      }
      console.error('Request failed', { error });
      return withCORS(json(failure('INTERNAL', 'Internal error'), 500), env);
    }
  },
};

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
};

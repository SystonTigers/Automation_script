export default {
  async fetch(req: Request, env: any) {
    const url = new URL(req.url);
    if (url.pathname === "/healthz") return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });

    if (url.pathname === "/fixtures.json") {
      const league = url.searchParams.get("league") || "default";
      const cacheKey = `fx:${league}`;
      const cached = await env.KV_FIXTURES.get(cacheKey);
      if (cached) return respondJSON(cached, 200, true);

      // TODO: fetch the FA Full-Time snippet URL for this league/team from config
      // const html = await (await fetch(SNIPPET_URL)).text();
      // const data = parseFixtureHtml(html); // implement a tolerant parser

      const data = { updated_iso: new Date().toISOString(), items: [] }; // placeholder
      const body = JSON.stringify(data);
      await env.KV_FIXTURES.put(cacheKey, body, { expirationTtl: Number(env.CACHE_TTL_SECS || 3600) });
      return respondJSON(body);
    }

    return new Response("Not found", { status: 404 });
  }
};

function respondJSON(body: string, status = 200, cached = false) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": cached ? "public, max-age=300, stale-while-revalidate=600" : "no-cache"
    }
  });
}

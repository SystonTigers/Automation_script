// v1: simple KV map; later you can swap to Durable Object or D1/Firestore
export async function getTenant(env: any, tenantId: string) {
  const raw = await env.KV_IDEMP.get("tenant:" + tenantId); // reuse KV namespace; or add KV_TENANTS
  if (!raw) {
    // Default flags: use Make fallback until direct publishers exist
    return { id: tenantId, flags: { use_make: true, direct_fb: false, direct_ig: false, direct_yt: true }, makeWebhookUrl: env.MAKE_WEBHOOK_BASE };
  }
  return JSON.parse(raw);
}

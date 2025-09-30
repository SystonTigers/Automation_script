type MakePayload = { template: string; data: Record<string, unknown>; tenant: string };

export async function publishViaMake(env: any, tenant: any, template: string, data: Record<string, unknown>) {
  const url = tenant.makeWebhookUrl || env.MAKE_WEBHOOK_BASE;
  if (!url) throw new Error("Make webhook not configured");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ template, data, tenant: tenant.id } satisfies MakePayload)
  });
  if (!res.ok) throw new Error(`Make failed ${res.status}`);
  // Some Make webhooks return empty bodies; normalize:
  let out: any = { ok: true };
  try { out = await res.json(); } catch {}
  return out;
}

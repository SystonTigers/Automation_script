
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
import type { Env, TenantConfig } from '../types';

export async function publishViaMake(
  env: Env,
  tenant: TenantConfig,
  template: string,
  data: Record<string, unknown>,
) : Promise<Record<string, unknown>> {
  const url = tenant.makeWebhookUrl ?? env.MAKE_WEBHOOK_BASE;
  if (!url) {
    throw new Error('Missing Make webhook URL');
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ template, data, tenant: tenant.id }),
  });
  if (!response.ok) {
    throw new Error(`Make failed ${response.status}`);
  }
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    return { ok: true };
  }
}

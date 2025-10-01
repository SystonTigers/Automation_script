import type { Env, TenantConfig } from '../types';

export async function publishToCanva(
  _env: Env,
  _tenant: TenantConfig,
  template: string,
  data: Record<string, unknown>,
) {
  return { ok: true, template, data };
}

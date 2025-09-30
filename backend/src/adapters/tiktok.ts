import type { Env, TenantConfig } from '../types';

export async function publishTikTok(
  _env: Env,
  tenant: TenantConfig,
  template: string,
  data: Record<string, unknown>,
) {
  if (!tenant.flags.use_make) {
    throw new Error('TikTok direct support not available');
  }
  return { ok: true, template, data };
}

import type { Env, TenantConfig } from '../types';

export async function publishFacebook(
  _env: Env,
  tenant: TenantConfig,
  template: string,
  data: Record<string, unknown>,
) {
  if (!tenant.flags.direct_fb) {
    throw new Error('Facebook direct publishing disabled');
  }
  return { ok: true, template, data };
}

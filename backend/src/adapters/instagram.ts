import type { Env, TenantConfig } from '../types';

export async function publishInstagram(
  _env: Env,
  tenant: TenantConfig,
  template: string,
  data: Record<string, unknown>,
) {
  if (!tenant.flags.direct_ig) {
    throw new Error('Instagram direct publishing disabled');
  }
  return { ok: true, template, data };
}

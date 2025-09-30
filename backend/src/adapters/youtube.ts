import type { Env, TenantConfig } from '../types';

export async function publishYouTube(
  env: Env,
  tenant: TenantConfig,
  template: string,
  data: Record<string, unknown>,
) {
  if (!tenant.flags.direct_yt) {
    throw new Error('YouTube direct publishing disabled');
  }
  const apiKey = env.YT_API_KEY;
  if (!apiKey) {
    throw new Error('Missing YouTube API key');
  }
  return { ok: true, template, data, apiKey };
}

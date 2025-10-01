import type { Channel, Env, TenantConfig } from '../types';
import { publishViaMake } from './make';
import { publishToCanva } from './canva';
import { publishFacebook } from './facebook';
import { publishInstagram } from './instagram';
import { publishYouTube } from './youtube';
import { publishTikTok } from './tiktok';

export type PublishResult = Record<string, unknown>;

export async function publishDirect(
  env: Env,
  tenant: TenantConfig,
  channel: Channel,
  template: string,
  data: Record<string, unknown>,
): Promise<PublishResult> {
  switch (channel) {
    case 'fb':
      return publishFacebook(env, tenant, template, data);
    case 'ig':
      return publishInstagram(env, tenant, template, data);
    case 'yt':
      return publishYouTube(env, tenant, template, data);
    case 'tt':
      return publishTikTok(env, tenant, template, data);
    case 'make':
      return publishViaMake(env, tenant, template, data);
    default:
      throw new Error(`Unsupported channel ${channel}`);
  }
}

export async function publishWithFallback(
  env: Env,
  tenant: TenantConfig,
  channel: Channel,
  template: string,
  data: Record<string, unknown>,
): Promise<PublishResult> {
  if (tenant.flags.use_make || channel === 'make') {
    return publishViaMake(env, tenant, template, data);
  }
  try {
    if (channel === 'yt' && !tenant.flags.direct_yt) {
      return publishViaMake(env, tenant, template, data);
    }
    if (channel === 'fb' && !tenant.flags.direct_fb) {
      return publishViaMake(env, tenant, template, data);
    }
    if (channel === 'ig' && !tenant.flags.direct_ig) {
      return publishViaMake(env, tenant, template, data);
    }
    return publishDirect(env, tenant, channel, template, data);
  } catch (error) {
    console.error('Direct publish failed, falling back', { channel, error });
    return publishViaMake(env, tenant, template, data);
  }
}

export async function renderWithCanva(
  env: Env,
  tenant: TenantConfig,
  template: string,
  data: Record<string, unknown>,
) {
  return publishToCanva(env, tenant, template, data);
}

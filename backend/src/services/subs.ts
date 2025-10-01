import type { Env } from '../types';

export interface SubscriptionStatus {
  active: boolean;
  expiresAt?: string;
  source: 'appstore' | 'playstore' | 'stripe' | 'unknown';
}

export async function verifySubscription(
  env: Env,
  token: string,
): Promise<SubscriptionStatus> {
  const url = env.IAP_VERIFY_URL;
  if (!url) {
    return { active: false, source: 'unknown' };
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    return { active: false, source: 'unknown' };
  }
  return (await response.json()) as SubscriptionStatus;
}

export async function currentSubscription(env: Env, userId: string): Promise<SubscriptionStatus> {
  const key = `subs:${userId}`;
  const cached = await env.KV_CACHE.get<SubscriptionStatus>(key, 'json');
  return (
    cached ?? {
      active: false,
      source: 'unknown',
    }
  );
}

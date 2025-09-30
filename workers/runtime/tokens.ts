import type { AutomationEnv, YouTubeCredentials } from '../types';

const YOUTUBE_PREFIX = 'yt:';

export async function storeYouTubeCredentials(
  env: Pick<AutomationEnv, 'KV_YOUTUBE_TOKENS'>,
  tenantId: string,
  credentials: YouTubeCredentials
): Promise<void> {
  await env.KV_YOUTUBE_TOKENS.put(YOUTUBE_PREFIX + tenantId, JSON.stringify({
    ...credentials,
    storedAt: new Date().toISOString()
  }));
}

export async function getYouTubeCredentials(
  env: Pick<AutomationEnv, 'KV_YOUTUBE_TOKENS'>,
  tenantId: string
): Promise<YouTubeCredentials | null> {
  const raw = await env.KV_YOUTUBE_TOKENS.get(YOUTUBE_PREFIX + tenantId);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as YouTubeCredentials;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse YouTube credentials', { tenantId, error });
    return null;
  }
}

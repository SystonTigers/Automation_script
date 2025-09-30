import type { AutomationEnv, TenantRecord, YouTubeCredentials, YouTubePublishResult } from '../types';
import { fetchWithBackoff } from '../utils/http';
import { getYouTubeCredentials } from '../runtime/tokens';

interface LiveBroadcastResponse {
  id: string;
}

interface LiveStreamResponse {
  id: string;
}

export async function publishYouTube(
  env: AutomationEnv,
  tenant: TenantRecord,
  template: string,
  data: Record<string, unknown>
): Promise<YouTubePublishResult> {
  const credentials = await getYouTubeCredentials(env, tenant.id);
  if (!credentials) {
    throw new Error('YouTube not configured for tenant');
  }

  const accessToken = await getGoogleAccessToken(credentials);
  const privacy = normalizePrivacy(data.privacy);
  const startTime = normalizeStartTime(data.start_iso);
  const title = String(data.title || template || 'Match Live');
  const description = String(data.description || 'Live stream');

  const broadcast = await createLiveBroadcast(accessToken, {
    title,
    description,
    scheduledStartTime: startTime,
    privacyStatus: privacy
  });
  const stream = await createLiveStream(accessToken, { title: `${title} Stream` });
  await bindBroadcast(accessToken, broadcast.id, stream.id);

  return {
    ok: true,
    watch_url: `https://www.youtube.com/watch?v=${broadcast.id}`,
    broadcast_id: broadcast.id,
    stream_id: stream.id,
    start_iso: startTime
  };
}

function normalizePrivacy(input: unknown): 'public' | 'unlisted' | 'private' {
  const allowed = ['public', 'unlisted', 'private'] as const;
  const value = typeof input === 'string' ? input.toLowerCase() : 'unlisted';
  return allowed.includes(value as (typeof allowed)[number])
    ? (value as 'public' | 'unlisted' | 'private')
    : 'unlisted';
}

function normalizeStartTime(input: unknown): string {
  if (typeof input === 'string' && input) {
    return input;
  }
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

async function getGoogleAccessToken(credentials: YouTubeCredentials): Promise<string> {
  const params = new URLSearchParams({
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    refresh_token: credentials.refresh_token,
    grant_type: 'refresh_token'
  });

  const result = await fetchWithBackoff<{ access_token?: string }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!result.data?.access_token) {
    throw new Error('OAuth token refresh failed');
  }
  return result.data.access_token;
}

async function createLiveBroadcast(
  accessToken: string,
  options: { title: string; description: string; scheduledStartTime: string; privacyStatus: 'public' | 'unlisted' | 'private' }
): Promise<LiveBroadcastResponse> {
  const payload = {
    snippet: {
      title: options.title,
      description: options.description,
      scheduledStartTime: options.scheduledStartTime
    },
    status: { privacyStatus: options.privacyStatus },
    contentDetails: { enableAutoStart: true, enableAutoStop: true }
  };

  const result = await fetchWithBackoff<LiveBroadcastResponse>(
    'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,contentDetails,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!result.data?.id) {
    throw new Error('createLiveBroadcast failed');
  }
  return result.data;
}

async function createLiveStream(
  accessToken: string,
  options: { title: string }
): Promise<LiveStreamResponse> {
  const payload = {
    snippet: { title: options.title },
    cdn: { format: '1080p', ingestionType: 'rtmp' }
  };

  const result = await fetchWithBackoff<LiveStreamResponse>(
    'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!result.data?.id) {
    throw new Error('createLiveStream failed');
  }
  return result.data;
}

async function bindBroadcast(accessToken: string, broadcastId: string, streamId: string): Promise<void> {
  const url = new URL('https://www.googleapis.com/youtube/v3/liveBroadcasts/bind');
  url.searchParams.set('id', broadcastId);
  url.searchParams.set('part', 'id,contentDetails');
  url.searchParams.set('streamId', streamId);

  const response = await fetchWithBackoff(url.toString(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    parseJson: false
  });

  if (!response.ok) {
    throw new Error('bindBroadcast failed');
  }
}

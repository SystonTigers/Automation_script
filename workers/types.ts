import type { KVNamespace, MessageSendOptions, Queue } from '@cloudflare/workers-types';

export interface TenantFlags {
  use_make?: boolean;
  direct_yt?: boolean;
  [key: string]: unknown;
}

export interface TenantRecord {
  id: string;
  flags: TenantFlags;
  updatedAt: string;
  [key: string]: unknown;
}

export interface PublishJobBody {
  tenant: string;
  template: string;
  channels: string[];
  data: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface AutomationEnv {
  API_VERSION?: string;
  JWT_SECRET?: string;
  ADMIN_JWT_SECRET?: string;
  MAKE_WEBHOOK_URL?: string;
  IDEMPOTENCY_TTL_SECONDS?: string;
  RATE_LIMIT_DEFAULT_LIMIT?: string;
  RATE_LIMIT_DEFAULT_WINDOW?: string;
  POST_QUEUE: Queue<PublishJobBody>;
  KV_TENANT_FLAGS: KVNamespace;
  KV_YOUTUBE_TOKENS: KVNamespace;
  KV_IDEMP: KVNamespace;
  ALERT_WEBHOOK_URL?: string;
}

export type QueueSendOptions = MessageSendOptions | undefined;

export interface TenantContext {
  record: TenantRecord;
}

export interface PublishResult {
  ok: boolean;
  [key: string]: unknown;
}

export interface YouTubeCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  channel_id?: string | null;
}

export interface YouTubePublishResult extends PublishResult {
  watch_url: string;
  broadcast_id: string;
  stream_id: string;
  start_iso: string;
}

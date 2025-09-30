import type { DurableObjectNamespace } from '@cloudflare/workers-types';

export type Channel = 'fb' | 'ig' | 'yt' | 'tt' | 'make';

export interface TenantFlags {
  use_make: boolean;
  direct_fb: boolean;
  direct_ig: boolean;
  direct_yt: boolean;
}

export interface TenantLimits {
  posts_per_day: number;
  [key: string]: number;
}

export interface TenantConfig {
  id: string;
  plan: 'BYO' | 'MANAGED';
  makeWebhookUrl?: string;
  channels: {
    fbPageId?: string;
    igBizId?: string;
    ytChannelId?: string;
    tiktokProfileId?: string;
  };
  flags: TenantFlags;
  limits: TenantLimits;
  updatedAt: number;
}

export interface Env {
  KV_CACHE: KVNamespace;
  KV_IDEMP: KVNamespace;
  POST_QUEUE: Queue<PostJob>;
  TenantRateLimiter: DurableObjectNamespace;
  R2_MEDIA: R2Bucket;
  API_VERSION: string;
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  FEATURE_DIRECT_FB: string;
  FEATURE_DIRECT_IG: string;
  FEATURE_DIRECT_YT: string;
  FEATURE_USE_MAKE: string;
  MAKE_WEBHOOK_BASE?: string;
  CORS_ALLOWED?: string;
  YT_API_KEY?: string;
  IAP_VERIFY_URL?: string;
}

export interface UserContext {
  sub: string;
  tenantId: string;
  roles: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PostJob {
  tenant: string;
  template: string;
  channels: Channel[];
  data: Record<string, unknown>;
  createdAt: number;
  idemKey: string;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface StreamScheduleRequest {
  matchId: string;
  platform: Channel;
  scheduledFor: string;
  metadata?: Record<string, unknown>;
}

export interface VotePayload {
  candidateId: string;
  matchId: string;
}

export interface AttendancePayload {
  matchId: string;
  playerId: string;
  attendedAt: string;
}

export type Fixture = {
  id: string;
  opponent: string;
  competition: string;
  kickoff: string;
  venue: string;
};

export interface StreamInfo {
  matchId: string;
  status: 'scheduled' | 'live' | 'ended';
  platform: Channel;
  url?: string;
  scheduledFor?: string;
}

export interface VoteTallyEntry {
  candidateId: string;
  votes: number;
}

export interface LocaleBundle {
  locale: string;
  messages: Record<string, string>;
}

export interface SyntheticResult {
  ok: boolean;
  message: string;
}

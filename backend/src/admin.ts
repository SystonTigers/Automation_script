/**
 * Admin API endpoints for tenant management, feature flags, and OAuth token storage.
 * All endpoints require JWT authentication with "admin" role.
 */

import { AuthError, requireJWT } from './services/auth';
import { requireAdmin } from './services/admin-auth';
import { getTenant, putTenant } from './services/tenants';
import { failure, json, parseJSON, success, withCORS } from './util';
import type { Env, TenantConfig, TenantFlags, UserContext } from './types';

/**
 * Handles admin API routes.
 * Path format: /api/v1/admin/*
 */
export async function handleAdminRoute(
  request: Request,
  env: Env,
  user: UserContext,
  pathname: string,
): Promise<Response> {
  // Require admin role for all admin routes
  try {
    requireAdmin(user);
  } catch (error) {
    if (error instanceof AuthError) {
      return withCORS(json(failure('FORBIDDEN', error.message), 403), env);
    }
    throw error;
  }

  const method = request.method;
  const parts = pathname.split('/').filter(Boolean); // ['api', 'v1', 'admin', ...]

  // GET /api/v1/admin/tenants/{id}
  if (method === 'GET' && parts[3] === 'tenants' && parts.length === 5) {
    return handleGetTenant(env, parts[4]);
  }

  // PUT /api/v1/admin/tenants/{id}
  if (method === 'PUT' && parts[3] === 'tenants' && parts.length === 5) {
    return handlePutTenant(request, env, parts[4]);
  }

  // PATCH /api/v1/admin/tenants/{id}/flags
  if (method === 'PATCH' && parts[3] === 'tenants' && parts[5] === 'flags' && parts.length === 6) {
    return handlePatchFlags(request, env, parts[4]);
  }

  // POST /api/v1/admin/tenants/{id}/youtube-token
  if (method === 'POST' && parts[3] === 'tenants' && parts[5] === 'youtube-token' && parts.length === 6) {
    return handlePostYouTubeToken(request, env, parts[4]);
  }

  // DELETE /api/v1/admin/tenants/{id}/tokens/{provider}
  if (method === 'DELETE' && parts[3] === 'tenants' && parts[5] === 'tokens' && parts.length === 7) {
    return handleDeleteToken(env, parts[4], parts[6]);
  }

  return withCORS(json(failure('NOT_FOUND', 'Admin endpoint not found'), 404), env);
}

/**
 * GET /api/v1/admin/tenants/{id}
 * Retrieves tenant configuration.
 */
async function handleGetTenant(env: Env, tenantId: string): Promise<Response> {
  try {
    const tenant = await getTenant(env, tenantId);
    return withCORS(json(success(tenant)), env);
  } catch (error) {
    return withCORS(json(failure('INTERNAL_ERROR', String(error)), 500), env);
  }
}

/**
 * PUT /api/v1/admin/tenants/{id}
 * Updates entire tenant configuration.
 */
async function handlePutTenant(request: Request, env: Env, tenantId: string): Promise<Response> {
  const body = await parseJSON<Partial<TenantConfig>>(request);
  if (!body) {
    return withCORS(json(failure('BAD_REQUEST', 'Invalid JSON body'), 400), env);
  }

  if (body.plan && !['BYO', 'MANAGED'].includes(body.plan)) {
    return withCORS(json(failure('BAD_REQUEST', 'Invalid plan'), 400), env);
  }

  try {
    const existing = await getTenant(env, tenantId);
    const updated: TenantConfig = {
      ...existing,
      ...body,
      id: tenantId,
      updatedAt: Date.now(),
    };

    await putTenant(env, updated);
    return withCORS(json(success({ tenant: updated })), env);
  } catch (error) {
    return withCORS(json(failure('INTERNAL_ERROR', String(error)), 500), env);
  }
}

/**
 * PATCH /api/v1/admin/tenants/{id}/flags
 * Toggles feature flags (partial update).
 */
async function handlePatchFlags(request: Request, env: Env, tenantId: string): Promise<Response> {
  const body = await parseJSON<Partial<TenantFlags>>(request);
  if (!body) {
    return withCORS(json(failure('BAD_REQUEST', 'Invalid JSON body'), 400), env);
  }

  try {
    const tenant = await getTenant(env, tenantId);
    tenant.flags = { ...tenant.flags, ...body };
    tenant.updatedAt = Date.now();
    await putTenant(env, tenant);

    return withCORS(json(success({ flags: tenant.flags })), env);
  } catch (error) {
    return withCORS(json(failure('INTERNAL_ERROR', String(error)), 500), env);
  }
}

/**
 * POST /api/v1/admin/tenants/{id}/youtube-token
 * Stores YouTube OAuth credentials.
 */
async function handlePostYouTubeToken(request: Request, env: Env, tenantId: string): Promise<Response> {
  const body = await parseJSON<{
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
    channel_id?: string;
  }>(request);

  if (!body || !body.client_id || !body.client_secret || !body.refresh_token) {
    return withCORS(json(failure('BAD_REQUEST', 'Missing required fields'), 400), env);
  }

  try {
    const key = `yt:${tenantId}`;
    const payload = {
      client_id: body.client_id,
      client_secret: body.client_secret,
      refresh_token: body.refresh_token,
      channel_id: body.channel_id,
      stored_at: Date.now(),
    };

    await env.KV_CACHE.put(key, JSON.stringify(payload));
    return withCORS(json(success({ stored: true, provider: 'youtube', tenant: tenantId })), env);
  } catch (error) {
    return withCORS(json(failure('INTERNAL_ERROR', String(error)), 500), env);
  }
}

/**
 * DELETE /api/v1/admin/tenants/{id}/tokens/{provider}
 * Deletes OAuth token for a provider.
 */
async function handleDeleteToken(env: Env, tenantId: string, provider: string): Promise<Response> {
  const providerMap: Record<string, string> = {
    youtube: 'yt',
    facebook: 'fb',
    instagram: 'ig',
    tiktok: 'tt',
  };

  const prefix = providerMap[provider.toLowerCase()];
  if (!prefix) {
    return withCORS(json(failure('BAD_REQUEST', 'Invalid provider'), 400), env);
  }

  try {
    const key = `${prefix}:${tenantId}`;
    await env.KV_CACHE.delete(key);
    return withCORS(json(success({ deleted: true, provider, tenant: tenantId })), env);
  } catch (error) {
    return withCORS(json(failure('INTERNAL_ERROR', String(error)), 500), env);
  }
}

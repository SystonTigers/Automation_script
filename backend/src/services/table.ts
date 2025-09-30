import type { Env } from '../types';

const TABLE_KEY = 'table:latest';

export async function getLeagueTable(env: Env) {
  const cached = await env.KV_CACHE.get(TABLE_KEY, 'json');
  if (cached) {
    return cached;
  }
  return { updatedAt: new Date().toISOString(), standings: [] };
}

export async function setLeagueTable(env: Env, payload: unknown) {
  await env.KV_CACHE.put(TABLE_KEY, JSON.stringify(payload), { expirationTtl: 300 });
}

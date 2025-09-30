import type { Env, Fixture } from '../types';

const EVENTS_KEY = 'fixtures:latest';

export async function listFixtures(env: Env): Promise<Fixture[]> {
  const cached = await env.KV_CACHE.get<Fixture[]>(EVENTS_KEY, 'json');
  if (cached) {
    return cached;
  }
  return [];
}

export async function updateFixtures(env: Env, fixtures: Fixture[]): Promise<void> {
  await env.KV_CACHE.put(EVENTS_KEY, JSON.stringify(fixtures), { expirationTtl: 300 });
}

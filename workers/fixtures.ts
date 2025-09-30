/* eslint-disable no-console */
declare const caches: CacheStorage & { default: Cache };

/**
 * Cloudflare Worker that syncs fixtures JSON into the Events sheet.
 *
 * The worker implements a fetch → parse → cache → publish pipeline that:
 * 1. Downloads `/fixtures.json` from the configured source.
 * 2. Normalizes and validates the payload.
 * 3. Applies manual overrides supplied either inline or via environment binding.
 * 4. Builds snippet variants that downstream templates can consume.
 * 5. Publishes the combined data to the Apps Script endpoint responsible for persisting rows in the Events sheet.
 */

export interface WorkerEnv {
  FIXTURES_SOURCE_URL?: string;
  FIXTURES_BASE_URL?: string;
  FIXTURE_MANUAL_OVERRIDES?: string;
  MANUAL_FIXTURE_OVERRIDES?: string;
  MANUAL_FIXTURES?: string;
  CACHE_TTL_SECONDS?: string;
  APPS_SCRIPT_EVENTS_URL?: string;
  APPS_SCRIPT_EVENTS_API_KEY?: string;
  APPS_SCRIPT_EVENTS_ACTION?: string;
  CLUB_NAME?: string;
  DEFAULT_SNIPPET_VARIANTS?: string;
  FIXTURE_EVENT_TYPE?: string;
}

export interface RawFixture {
  id?: string | number;
  fixtureId?: string | number;
  matchId?: string | number;
  slug?: string;
  date?: string;
  kickoff?: string;
  time?: string;
  opposition?: string;
  opponent?: string;
  oppositionName?: string;
  competition?: string;
  venue?: string;
  location?: string;
  homeAway?: string;
  status?: string;
  publish?: boolean;
  snippetTemplates?: string[];
  variants?: string[];
  [key: string]: unknown;
}

type FixtureFields = {
  opponent: string;
  competition: string;
  venue: string;
  isoKickoff: string;
  kickoffLabel: string;
  kickoffTime: string;
  homeAway?: string;
  [key: string]: string | undefined;
};

interface VariantOverride {
  enabled?: boolean;
  text?: string;
  fields?: Record<string, unknown>;
}

export interface ManualOverride {
  publish?: boolean;
  fields?: Record<string, unknown>;
  variants?: Record<string, VariantOverride>;
}

export type ManualOverrideMap = Record<string, ManualOverride>;

export interface NormalizedFixture {
  id: string;
  publish: boolean;
  fields: FixtureFields;
  variantKeys: string[];
  variantOverrides: Record<string, VariantOverride>;
  source: RawFixture;
}

export interface SnippetVariant {
  key: string;
  text: string;
  fields: Record<string, unknown>;
}

export interface PreparedEvent {
  event_type: string;
  match_id: string;
  variant: string;
  snippet_text: string;
  club_name?: string;
  opponent: string;
  competition: string;
  venue: string;
  kickoff_label: string;
  kickoff_time: string;
  kickoff_iso: string;
  metadata: Record<string, unknown>;
}

interface FixturesPayload {
  fixtures: RawFixture[];
  overrides: ManualOverrideMap;
}

interface PublishResult {
  attempted: number;
  status: 'published' | 'noop' | 'skipped';
  skipped: boolean;
  reason?: string;
  responseStatus?: number;
  responseBody?: unknown;
}

const DEFAULT_VARIANT_KEYS = ['default', 'square', 'story'];
const DEFAULT_EVENT_TYPE = 'fixtures_worker_event';
const DEFAULT_CACHE_TTL = 900; // 15 minutes

/** Extract fixtures + overrides from any supported payload shape. */
export function extractFixturesPayload(data: unknown): FixturesPayload {
  if (!data) {
    throw new Error('Fixtures payload is empty');
  }

  const result: FixturesPayload = { fixtures: [], overrides: {} };

  const attachOverrides = (value: unknown) => {
    const overrides = parseManualOverrides(value as ManualOverrideMap | string | undefined);
    if (Object.keys(overrides).length) {
      result.overrides = mergeOverrides(result.overrides, overrides);
    }
  };

  if (Array.isArray(data)) {
    result.fixtures = data.filter(isPlainObject) as RawFixture[];
    return result;
  }

  if (isPlainObject(data)) {
    const obj = data as Record<string, unknown>;
    const fixturesArray = Array.isArray(obj.fixtures)
      ? (obj.fixtures as unknown[])
      : Array.isArray(obj.data)
        ? (obj.data as unknown[])
        : [];

    result.fixtures = fixturesArray.filter(isPlainObject) as RawFixture[];

    if ('overrides' in obj) {
      attachOverrides(obj.overrides);
    }
    if ('manualOverrides' in obj) {
      attachOverrides(obj.manualOverrides);
    }
    if ('meta' in obj && isPlainObject(obj.meta) && 'overrides' in (obj.meta as Record<string, unknown>)) {
      attachOverrides((obj.meta as Record<string, unknown>).overrides);
    }

    return result;
  }

  throw new Error('Unsupported fixtures payload');
}

/** Parse manual overrides from JSON string or object. */
export function parseManualOverrides(source?: ManualOverrideMap | string | null): ManualOverrideMap {
  if (!source) {
    return {};
  }

  let data: unknown = source;
  if (typeof source === 'string') {
    if (!source.trim()) {
      return {};
    }
    try {
      data = JSON.parse(source);
    } catch (error) {
      console.warn('Failed to parse manual overrides JSON', error);
      return {};
    }
  }

  if (!isPlainObject(data)) {
    return {};
  }

  const overrides: ManualOverrideMap = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (!value || !isPlainObject(value)) {
      continue;
    }
    const entry = value as Record<string, unknown>;
    const normalized: ManualOverride = {};

    if (typeof entry.publish === 'boolean') {
      normalized.publish = entry.publish;
    }

    const fieldOverrides: Record<string, unknown> = {};
    if (isPlainObject(entry.fields)) {
      Object.assign(fieldOverrides, entry.fields as Record<string, unknown>);
    }

    // Allow top-level field overrides without nesting under `fields`
    for (const [fieldKey, fieldValue] of Object.entries(entry)) {
      if (['publish', 'fields', 'variants'].includes(fieldKey)) {
        continue;
      }
      fieldOverrides[fieldKey] = fieldValue;
    }

    if (Object.keys(fieldOverrides).length) {
      normalized.fields = fieldOverrides;
    }

    if (isPlainObject(entry.variants)) {
      normalized.variants = normalizeVariantOverrides(entry.variants as Record<string, unknown>);
    }

    overrides[key] = normalized;
  }

  return overrides;
}

function normalizeVariantOverrides(source: Record<string, unknown>): Record<string, VariantOverride> {
  const variants: Record<string, VariantOverride> = {};

  for (const [variantKey, raw] of Object.entries(source)) {
    if (!raw || !isPlainObject(raw)) {
      continue;
    }

    const rawVariant = raw as Record<string, unknown>;
    const normalized: VariantOverride = {};

    if (typeof rawVariant.enabled === 'boolean') {
      normalized.enabled = rawVariant.enabled;
    }

    if (typeof rawVariant.text === 'string') {
      normalized.text = rawVariant.text;
    }

    const fieldOverrides: Record<string, unknown> = {};
    if (isPlainObject(rawVariant.fields)) {
      Object.assign(fieldOverrides, rawVariant.fields as Record<string, unknown>);
    }

    for (const [fieldKey, fieldValue] of Object.entries(rawVariant)) {
      if (['enabled', 'text', 'fields'].includes(fieldKey)) {
        continue;
      }
      fieldOverrides[fieldKey] = fieldValue;
    }

    if (Object.keys(fieldOverrides).length) {
      normalized.fields = fieldOverrides;
    }

    variants[variantKey] = normalized;
  }

  return variants;
}

/** Combine override maps, later entries win. */
export function mergeOverrides(...overrides: ManualOverrideMap[]): ManualOverrideMap {
  const result: ManualOverrideMap = {};

  for (const override of overrides) {
    for (const [fixtureId, entry] of Object.entries(override)) {
      if (!result[fixtureId]) {
        result[fixtureId] = { publish: entry.publish, fields: {}, variants: {} };
      }

      const target = result[fixtureId];

      if (typeof entry.publish === 'boolean') {
        target.publish = entry.publish;
      }

      if (entry.fields) {
        target.fields = { ...(target.fields || {}), ...entry.fields };
      }

      if (entry.variants) {
        target.variants = target.variants || {};
        for (const [variantKey, variantEntry] of Object.entries(entry.variants)) {
          const existingVariant = target.variants[variantKey] || {};
          target.variants[variantKey] = {
            ...existingVariant,
            ...variantEntry,
            fields: {
              ...(existingVariant.fields || {}),
              ...(variantEntry.fields || {})
            }
          };
        }
      }
    }
  }

  return result;
}

/** Normalize a single raw fixture into the canonical representation. */
export function normalizeFixture(raw: RawFixture): NormalizedFixture {
  const id = String(
    raw.id ??
      raw.fixtureId ??
      raw.matchId ??
      raw.slug ??
      ''
  ).trim();

  if (!id) {
    throw new Error('Fixture is missing an identifier');
  }

  const opponent = firstTruthy([
    raw.opponent,
    raw.opposition,
    raw.oppositionName,
    raw['opponentName']
  ]) ?? 'TBC';

  const competition = firstTruthy([raw.competition, raw['league'], raw['group']]) ?? 'Competition TBC';
  const venue = firstTruthy([raw.venue, raw.location]) ?? '';
  const homeAway = firstTruthy([raw.homeAway, raw['home_away']]);

  const kickoff = normalizeKickoff(raw.date, raw.kickoff ?? raw.time);

  const variantKeys = uniqueArray(
    Array.isArray(raw.snippetTemplates) && raw.snippetTemplates.length
      ? raw.snippetTemplates
      : Array.isArray(raw.variants) && raw.variants.length
        ? raw.variants
        : DEFAULT_VARIANT_KEYS
  );

  return {
    id,
    publish: derivePublishFlag(raw),
    fields: {
      opponent,
      competition,
      venue,
      isoKickoff: kickoff.iso,
      kickoffLabel: kickoff.label,
      kickoffTime: kickoff.time,
      homeAway
    },
    variantKeys,
    variantOverrides: {},
    source: raw
  };
}

/** Apply manual overrides to fixtures without mutating the source list. */
export function applyManualOverrides(
  fixtures: NormalizedFixture[],
  overrides: ManualOverrideMap
): NormalizedFixture[] {
  if (!fixtures.length || !Object.keys(overrides).length) {
    return fixtures;
  }

  return fixtures.map((fixture) => {
    const override = overrides[fixture.id];
    if (!override) {
      return fixture;
    }

    const merged: NormalizedFixture = {
      ...fixture,
      publish: typeof override.publish === 'boolean' ? override.publish : fixture.publish,
      fields: { ...fixture.fields },
      variantKeys: [...fixture.variantKeys],
      variantOverrides: { ...fixture.variantOverrides }
    };

    if (override.fields) {
      for (const [key, value] of Object.entries(override.fields)) {
        if (value === undefined || value === null) {
          continue;
        }
        merged.fields[key] = String(value);
      }
    }

    if (override.variants) {
      for (const [variantKey, variantOverride] of Object.entries(override.variants)) {
        if (!merged.variantKeys.includes(variantKey)) {
          merged.variantKeys.push(variantKey);
        }
        const existing = merged.variantOverrides[variantKey] || {};
        merged.variantOverrides[variantKey] = {
          ...existing,
          ...variantOverride,
          fields: {
            ...(existing.fields || {}),
            ...(variantOverride.fields || {})
          }
        };
      }
    }

    return merged;
  });
}

/** Build snippet variants for a normalized fixture. */
export function buildSnippetVariants(fixture: NormalizedFixture): SnippetVariant[] {
  const variants: SnippetVariant[] = [];

  for (const key of fixture.variantKeys) {
    const override = fixture.variantOverrides[key] || {};
    if (override.enabled === false) {
      continue;
    }

    const base = computeVariantBlueprint(fixture, key);
    const fields = {
      ...base.fields,
      ...(override.fields || {})
    };

    const text = typeof override.text === 'string' && override.text.trim().length
      ? override.text
      : base.text;

    variants.push({ key, text, fields });
  }

  return variants;
}

/** Prepare events payload from fixtures. */
export function prepareEvents(
  fixtures: NormalizedFixture[],
  options: { clubName?: string; eventType?: string } = {}
): PreparedEvent[] {
  if (!fixtures.length) {
    return [];
  }

  const clubName = options.clubName?.trim() || undefined;
  const eventType = options.eventType || DEFAULT_EVENT_TYPE;

  const events: PreparedEvent[] = [];

  for (const fixture of fixtures) {
    if (!fixture.publish) {
      continue;
    }

    const variants = buildSnippetVariants(fixture);
    for (const variant of variants) {
      events.push({
        event_type: eventType,
        match_id: fixture.id,
        variant: variant.key,
        snippet_text: variant.text,
        club_name: clubName,
        opponent: fixture.fields.opponent,
        competition: fixture.fields.competition,
        venue: fixture.fields.venue,
        kickoff_label: fixture.fields.kickoffLabel,
        kickoff_time: fixture.fields.kickoffTime,
        kickoff_iso: fixture.fields.isoKickoff,
        metadata: {
          ...variant.fields,
          fixture_id: fixture.id,
          source_status: fixture.source.status,
          home_away: fixture.fields.homeAway
        }
      });
    }
  }

  return events;
}

function computeVariantBlueprint(fixture: NormalizedFixture, variantKey: string): SnippetVariant {
  const kickoffLabel = fixture.fields.kickoffLabel || fixture.fields.isoKickoff;
  const location = fixture.fields.venue || (fixture.fields.homeAway ? fixture.fields.homeAway.toUpperCase() : 'TBC');
  const opponent = fixture.fields.opponent;
  const competition = fixture.fields.competition;

  let text: string;
  switch (variantKey) {
    case 'story':
      text = `${opponent} • ${competition} • Kick-off ${kickoffLabel}`;
      break;
    case 'square':
      text = `${opponent.toUpperCase()} | ${competition} | ${location} | ${kickoffLabel}`;
      break;
    default:
      text = `${opponent} (${competition}) @ ${location} — ${kickoffLabel}`;
  }

  return {
    key: variantKey,
    text,
    fields: {
      opponent,
      competition,
      venue: location,
      kickoff_label: kickoffLabel,
      kickoff_time: fixture.fields.kickoffTime,
      kickoff_iso: fixture.fields.isoKickoff
    }
  };
}

function derivePublishFlag(raw: RawFixture): boolean {
  if (typeof raw.publish === 'boolean') {
    return raw.publish;
  }

  if (typeof raw.status === 'string') {
    const lowered = raw.status.toLowerCase();
    if (['cancelled', 'postponed', 'hidden'].includes(lowered)) {
      return false;
    }
  }

  return true;
}

function normalizeKickoff(dateInput?: string, timeInput?: string): { iso: string; label: string; time: string } {
  const datePart = typeof dateInput === 'string' ? dateInput.trim() : '';
  const timePart = typeof timeInput === 'string' ? timeInput.trim() : '';
  const isoDate = buildIsoDate(datePart, timePart);
  const kickoffDate = isoDate ? new Date(isoDate) : undefined;

  const label = kickoffDate && !Number.isNaN(kickoffDate.getTime())
    ? new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(kickoffDate)
    : [datePart, timePart].filter(Boolean).join(' ');

  const time = kickoffDate && !Number.isNaN(kickoffDate.getTime())
    ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(kickoffDate)
    : timePart;

  return {
    iso: isoDate,
    label,
    time
  };
}

function buildIsoDate(datePart: string, timePart: string): string {
  if (!datePart) {
    return '';
  }

  const normalizedDate = datePart.replace(/\//g, '-');
  const iso = timePart ? `${normalizedDate}T${normalizeTime(timePart)}` : `${normalizedDate}T00:00:00`;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return normalizedDate;
  }

  return date.toISOString();
}

function normalizeTime(time: string): string {
  const trimmed = time.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const parts = trimmed.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}:00`;
  }
  if (/^\d{1,2}$/.test(trimmed)) {
    return `${trimmed.padStart(2, '0')}:00:00`;
  }
  return trimmed;
}

function firstTruthy(values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function uniqueArray(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    const trimmed = value.trim();
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit = {}, attempts = 4, baseDelay = 400): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      const body = await response.clone().text().catch(() => '');
      lastError = new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < attempts - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await wait(delay);
    }
  }

  throw lastError ?? new Error('Request failed');
}

function resolveFixturesUrl(env: WorkerEnv): string {
  if (env.FIXTURES_SOURCE_URL && env.FIXTURES_SOURCE_URL.trim()) {
    return env.FIXTURES_SOURCE_URL.trim();
  }
  if (env.FIXTURES_BASE_URL && env.FIXTURES_BASE_URL.trim()) {
    const base = env.FIXTURES_BASE_URL.trim();
    return new URL('/fixtures.json', base.endsWith('/') ? base : `${base}/`).toString();
  }
  throw new Error('Missing FIXTURES_SOURCE_URL or FIXTURES_BASE_URL');
}

async function loadFixtures(env: WorkerEnv): Promise<{ fixtures: NormalizedFixture[]; overrides: ManualOverrideMap; signature: string }> {
  const url = resolveFixturesUrl(env);
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  const rawText = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Failed to parse fixtures JSON: ${(error as Error).message}`);
  }

  const payload = extractFixturesPayload(parsed);
  const normalizedFixtures = payload.fixtures.map(normalizeFixture);

  const envOverrides = parseManualOverrides(
    env.FIXTURE_MANUAL_OVERRIDES ?? env.MANUAL_FIXTURE_OVERRIDES ?? env.MANUAL_FIXTURES ?? undefined
  );
  const overrides = mergeOverrides(payload.overrides, envOverrides);

  const mergedFixtures = applyManualOverrides(normalizedFixtures, overrides);
  const signature = createSignature(mergedFixtures.map((fixture) => ({ id: fixture.id, updated: fixture.fields.isoKickoff, publish: fixture.publish })));

  return { fixtures: mergedFixtures, overrides, signature };
}

function createSignature(value: unknown): string {
  const json = JSON.stringify(value);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = (hash << 5) - hash + json.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `sig-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

async function publishEvents(events: PreparedEvent[], env: WorkerEnv): Promise<PublishResult> {
  if (!events.length) {
    return { attempted: 0, status: 'noop', skipped: true, reason: 'No events to publish' };
  }

  const endpoint = env.APPS_SCRIPT_EVENTS_URL?.trim();
  if (!endpoint) {
    return {
      attempted: events.length,
      status: 'skipped',
      skipped: true,
      reason: 'Missing APPS_SCRIPT_EVENTS_URL environment binding'
    };
  }

  const action = env.APPS_SCRIPT_EVENTS_ACTION?.trim() || 'record_events';
  const payload = {
    action,
    source: 'fixtures_worker',
    events
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (env.APPS_SCRIPT_EVENTS_API_KEY) {
    headers['Authorization'] = `Bearer ${env.APPS_SCRIPT_EVENTS_API_KEY}`;
  }

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let responseBody: unknown = text;
  try {
    responseBody = JSON.parse(text);
  } catch (error) {
    // Keep raw text when JSON parsing fails
  }

  return {
    attempted: events.length,
    status: 'published',
    skipped: false,
    responseStatus: response.status,
    responseBody
  };
}

async function processFixtures(env: WorkerEnv): Promise<{
  fixtures: NormalizedFixture[];
  overrides: ManualOverrideMap;
  events: PreparedEvent[];
  publishResult: PublishResult;
  signature: string;
}> {
  const { fixtures, overrides, signature } = await loadFixtures(env);

  const defaultVariants = env.DEFAULT_SNIPPET_VARIANTS
    ? env.DEFAULT_SNIPPET_VARIANTS.split(',').map((value) => value.trim()).filter(Boolean)
    : null;

  const fixturesWithVariants = fixtures.map((fixture) =>
    defaultVariants && !fixture.variantKeys.length
      ? { ...fixture, variantKeys: [...defaultVariants] }
      : fixture
  );

  const events = prepareEvents(fixturesWithVariants, {
    clubName: env.CLUB_NAME,
    eventType: env.FIXTURE_EVENT_TYPE || DEFAULT_EVENT_TYPE
  });

  const publishResult = await publishEvents(events, env);

  return {
    fixtures: fixturesWithVariants,
    overrides,
    events,
    publishResult,
    signature
  };
}

const worker: ExportedHandler<WorkerEnv> = {
  async fetch(request, env, ctx) {
    const cache = caches.default;
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === '1' || request.method === 'POST';
    const cacheKey = new Request(`${url.origin}/fixtures-worker-cache-key`);

    if (!forceRefresh) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const result = await processFixtures(env);
      const ttl = Number.parseInt(env.CACHE_TTL_SECONDS || '', 10);
      const maxAge = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_CACHE_TTL;

      const responseBody = JSON.stringify({
        success: true,
        signature: result.signature,
        fixtures_processed: result.fixtures.length,
        events_published: result.events.length,
        publish_status: result.publishResult.status,
        publish_details: {
          attempted: result.publishResult.attempted,
          skipped: result.publishResult.skipped,
          reason: result.publishResult.reason,
          responseStatus: result.publishResult.responseStatus
        },
        overrides_applied: Object.keys(result.overrides).length
      });

      const response = new Response(responseBody, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${maxAge}`
        }
      });

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      console.error('Fixtures worker error', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ success: false, error: message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};

export default worker;

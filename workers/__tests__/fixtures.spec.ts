import { describe, expect, it } from 'vitest';
import {
  extractFixturesPayload,
  normalizeFixture,
  parseManualOverrides,
  applyManualOverrides,
  buildSnippetVariants,
  prepareEvents,
  mergeOverrides
} from '../fixtures';
import type { PreparedEvent, SnippetVariant } from '../fixtures';

describe('extractFixturesPayload', () => {
  it('supports array payloads', () => {
    const payload = extractFixturesPayload([
      { id: 'fx1', opponent: 'United', date: '2024-08-10' },
      { id: 'fx2', opponent: 'City', date: '2024-08-17' }
    ]);

    expect(payload.fixtures).toHaveLength(2);
    expect(payload.overrides).toEqual({});
  });

  it('parses overrides from object payload', () => {
    const payload = extractFixturesPayload({
      fixtures: [{ id: 'fx1', opponent: 'County', date: '2024-08-10' }],
      overrides: {
        fx1: {
          publish: false,
          fields: { competition: 'Cup' }
        }
      }
    });

    expect(payload.fixtures).toHaveLength(1);
    expect(payload.overrides.fx1).toMatchObject({ publish: false });
  });
});

describe('manual overrides', () => {
  it('applies overrides to fixtures and variants', () => {
    const rawFixture = {
      id: 'fx100',
      date: '2024-09-01',
      time: '15:00',
      opponent: 'Leicester Falcons',
      competition: 'League',
      venue: 'Home',
      snippetTemplates: ['default', 'story']
    };

    const normalized = normalizeFixture(rawFixture);

    const overrides = parseManualOverrides({
      fx100: {
        fields: { venue: 'Stadium Field' },
        variants: {
          story: {
            text: 'Custom story snippet',
            fields: { banner: 'story-mode' }
          },
          square: {
            enabled: false
          }
        }
      }
    });

    const merged = applyManualOverrides([normalized], overrides);
    expect(merged[0].fields.venue).toBe('Stadium Field');

    const variants = buildSnippetVariants(merged[0]);
    const storyVariant = variants.find((variant: SnippetVariant) => variant.key === 'story');

    expect(variants.some((variant: SnippetVariant) => variant.key === 'square')).toBe(false);
    expect(storyVariant).toBeDefined();
    expect(storyVariant?.text).toBe('Custom story snippet');
    expect(storyVariant?.fields.banner).toBe('story-mode');
  });

  it('merges multiple override sources', () => {
    const combined = mergeOverrides(
      parseManualOverrides({
        fx1: { publish: false }
      }),
      parseManualOverrides({
        fx1: { fields: { competition: 'Cup' } },
        fx2: { publish: true }
      })
    );

    expect(combined.fx1).toMatchObject({ publish: false });
    expect(combined.fx1?.fields?.competition).toBe('Cup');
    expect(combined.fx2?.publish).toBe(true);
  });
});

describe('prepareEvents', () => {
  it('builds events for multiple variants with overrides', () => {
    const rawFixture = {
      id: 'fx900',
      date: '2024-10-05',
      time: '19:30',
      opponent: 'City Rovers',
      competition: 'League',
      venue: 'Syston Park',
      snippetTemplates: ['default', 'story', 'square']
    };

    const normalized = normalizeFixture(rawFixture);
    const overrides = parseManualOverrides({
      fx900: {
        variants: {
          default: {
            text: 'Default override'
          },
          story: {
            fields: { layout: 'story' }
          }
        }
      }
    });

    const mergedFixtures = applyManualOverrides([normalized], overrides);
    const events = prepareEvents(mergedFixtures, {
      clubName: 'Syston Tigers',
      eventType: 'fixtures_test_event'
    });

    expect(events).toHaveLength(3);
    expect(events[0].event_type).toBe('fixtures_test_event');
    expect(events[0].club_name).toBe('Syston Tigers');

    const defaultEvent = events.find((event: PreparedEvent) => event.variant === 'default');
    const storyEvent = events.find((event: PreparedEvent) => event.variant === 'story');

    expect(defaultEvent?.snippet_text).toBe('Default override');
    expect(storyEvent?.metadata.layout).toBe('story');
  });
});

import {
  clampOrreryLevelToBudget,
  getOrreryLevelFromRadius,
  getOrreryLevelRadius,
  getOrreryRadialDistanceCost,
  normalizeOrrerySessionState,
  normalizeOrreryVector,
  resolveOrreryVibeForVector
} from './vibes';

describe('orrery five-stage radial budget helpers', () => {
  test('measures radial movement by explicit 0-5 stages', () => {
    expect(getOrreryLevelFromRadius(getOrreryLevelRadius(0))).toBe(0);
    expect(getOrreryLevelFromRadius(getOrreryLevelRadius(3))).toBe(3);
    expect(getOrreryLevelFromRadius(getOrreryLevelRadius(5))).toBe(5);
    expect(getOrreryRadialDistanceCost(2, 4)).toBe(2);
    expect(getOrreryRadialDistanceCost(4, 3)).toBe(1);
    expect(getOrreryRadialDistanceCost(0, 5)).toBe(5);
  });

  test('clamps an over-budget stage move to the farthest affordable level', () => {
    expect(clampOrreryLevelToBudget(2, 5, 1)).toBe(3);
    expect(clampOrreryLevelToBudget(2, 5, 2)).toBe(4);
    expect(clampOrreryLevelToBudget(4, 0, 2)).toBe(2);
  });

  test('normalizes session vector, derived positions, and legacy slide budget aliases', () => {
    const normalized = normalizeOrrerySessionState({
      current_vibe: 'crown4_veil3_warden2',
      number_of_available_slides: 4,
      orrery_vector: {
        forge: 4.3,
        crown: 9
      },
      page_texture_identity: {
        alignmentKey: 'crown4_veil3_warden2'
      }
    });

    expect(normalized.current_vibe).toBe('crown4_veil3_warden2');
    expect(normalized.orrery_radial_distance_budget).toBe(4);
    expect(normalized.number_of_available_slides).toBe(4);
    expect(normalized.orrery_vector).toEqual(expect.objectContaining({
      forge: 4,
      crown: 5
    }));
    expect(normalized.orrery_positions.forge).toBe(getOrreryLevelRadius(4));
    expect(normalized.page_texture_identity.alignmentKey).toBe('crown4_veil3_warden2');
  });

  test('keeps old radius positions compatible by deriving nearest stages', () => {
    const vector = normalizeOrreryVector({}, {
      forge: getOrreryLevelRadius(4)
    });

    expect(vector.forge).toBe(4);
    expect(resolveOrreryVibeForVector(vector)?.id).toBe('forge_ember');
  });
});

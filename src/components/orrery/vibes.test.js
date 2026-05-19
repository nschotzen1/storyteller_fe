import {
  clampOrreryRadiusToBudget,
  getOrreryBand,
  getOrreryRadialDistanceCost,
  normalizeOrrerySessionState
} from './vibes';

describe('orrery vibe radial budget helpers', () => {
  test('measures radial movement by discrete band distance', () => {
    expect(getOrreryBand(0.1)).toBe('inner');
    expect(getOrreryBand(0.5)).toBe('middle');
    expect(getOrreryBand(0.9)).toBe('outer');
    expect(getOrreryRadialDistanceCost(0.9, 0.1)).toBe(2);
    expect(getOrreryRadialDistanceCost(0.9, 0.5)).toBe(1);
    expect(getOrreryRadialDistanceCost(0.5, 0.1)).toBe(1);
  });

  test('clamps an over-budget radial move to the farthest affordable level', () => {
    expect(getOrreryBand(clampOrreryRadiusToBudget(0.9, 0.1, 1))).toBe('middle');
    expect(getOrreryBand(clampOrreryRadiusToBudget(0.9, 0.1, 2))).toBe('inner');
  });

  test('normalizes new radial budget and legacy slide budget as aliases', () => {
    expect(normalizeOrrerySessionState({}).orrery_radial_distance_budget).toBe(2);
    expect(normalizeOrrerySessionState({ number_of_available_slides: 4 }).orrery_radial_distance_budget).toBe(4);
    expect(normalizeOrrerySessionState({ orrery_radial_distance_budget: 3 }).number_of_available_slides).toBe(3);
  });
});

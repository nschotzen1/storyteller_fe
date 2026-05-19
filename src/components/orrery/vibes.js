import { archetypes } from './archetypes';

const SERVER_ASSET_ORIGIN = 'http://localhost:5001';
const INNER_MAX = 0.33;
const MIDDLE_MAX = 0.66;
const ORRERY_BAND_LEVELS = {
  inner: 0,
  middle: 1,
  outer: 2
};
const ORRERY_BAND_CENTERS = {
  inner: 0.16,
  middle: 0.5,
  outer: 0.84
};

export const ORRERY_INITIAL_RADIAL_DISTANCE_BUDGET = 2;
export const ORRERY_SLIDE_COMMIT_EPSILON = 0.04;
export const DEFAULT_ORRERY_POSITIONS = archetypes.reduce((acc, archetype) => {
  acc[archetype.id] = 0.8;
  return acc;
}, {});

const serverAssetUrl = (assetPath) => `${SERVER_ASSET_ORIGIN}${assetPath}`;

export const ORRERY_VIBES = [
  {
    id: 'forge_ember',
    label: 'Forge Ember',
    backgroundUrl: serverAssetUrl('/assets/typewriter_page_images/film_page1.png'),
    alignment: {
      forge: 'inner'
    },
    writingStyle: {
      font: "'IM Fell English SC', serif",
      font_size: '32px',
      font_color: '#6b291b',
      mood: 'warm, decisive, metal-and-ash'
    }
  },
  {
    id: 'veilwood_cold',
    label: 'Veilwood Cold',
    backgroundUrl: serverAssetUrl('/assets/typewriter_page_images/film_page2.png'),
    alignment: {
      veil: 'inner',
      warden: 'outer'
    },
    writingStyle: {
      font: "'Uncial Antiqua', serif",
      font_size: '31px',
      font_color: '#27455f',
      mood: 'cold, watchful, folkloric'
    }
  },
  {
    id: 'rift_sigil',
    label: 'Rift Sigil',
    backgroundUrl: serverAssetUrl('/assets/typewriter_page_images/film_page4.png'),
    alignment: {
      rift: 'inner',
      sigil: 'middle'
    },
    writingStyle: {
      font: "'EB Garamond', serif",
      font_size: '33px',
      font_color: '#30255f',
      mood: 'strange, fractured, ceremonial'
    }
  }
];

export const getOrreryBand = (radius) => {
  const numeric = Number(radius);
  const safeRadius = Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0;
  if (safeRadius <= INNER_MAX) return 'inner';
  if (safeRadius <= MIDDLE_MAX) return 'middle';
  return 'outer';
};

export const getOrreryBandLevel = (radius) => ORRERY_BAND_LEVELS[getOrreryBand(radius)];

export const getOrreryBandCenter = (band) => ORRERY_BAND_CENTERS[band] ?? ORRERY_BAND_CENTERS.middle;

export const getOrreryRadialDistanceCost = (fromRadius, toRadius) =>
  Math.abs(getOrreryBandLevel(fromRadius) - getOrreryBandLevel(toRadius));

export const clampOrreryRadiusToBudget = (fromRadius, toRadius, radialBudget) => {
  const safeBudget = Math.max(0, Math.floor(Number(radialBudget) || 0));
  const fromLevel = getOrreryBandLevel(fromRadius);
  const toLevel = getOrreryBandLevel(toRadius);
  const levelDelta = toLevel - fromLevel;
  if (Math.abs(levelDelta) <= safeBudget) return toRadius;

  const clampedLevel = fromLevel + Math.sign(levelDelta) * safeBudget;
  const clampedBand = Object.entries(ORRERY_BAND_LEVELS)
    .find(([, level]) => level === clampedLevel)?.[0] || getOrreryBand(fromRadius);
  return getOrreryBandCenter(clampedBand);
};

export const normalizeOrreryPositions = (positions = {}) => {
  const source = positions && typeof positions === 'object' && !Array.isArray(positions)
    ? positions
    : {};
  return archetypes.reduce((acc, archetype) => {
    const numeric = Number(source[archetype.id]);
    acc[archetype.id] = Number.isFinite(numeric)
      ? Math.max(0, Math.min(1, numeric))
      : DEFAULT_ORRERY_POSITIONS[archetype.id];
    return acc;
  }, {});
};

export const getOrreryVibeById = (vibeId = '') =>
  ORRERY_VIBES.find((vibe) => vibe.id === vibeId) || null;

export const resolveOrreryVibeForPositions = (positions = {}) => {
  const normalized = normalizeOrreryPositions(positions);
  return ORRERY_VIBES.find((vibe) =>
    Object.entries(vibe.alignment || {}).every(([archetypeId, expectedBand]) =>
      getOrreryBand(normalized[archetypeId]) === expectedBand
    )
  ) || null;
};

export const normalizeOrrerySessionState = (worldState = {}) => {
  const source = worldState && typeof worldState === 'object' && !Array.isArray(worldState)
    ? worldState
    : {};
  const radialBudget = Number(
    source.orrery_radial_distance_budget ?? source.number_of_available_slides
  );
  const currentVibe = typeof source.current_vibe === 'string' ? source.current_vibe.trim() : '';
  const normalizedBudget = Number.isFinite(radialBudget)
    ? Math.max(0, Math.floor(radialBudget))
    : ORRERY_INITIAL_RADIAL_DISTANCE_BUDGET;
  return {
    current_vibe: getOrreryVibeById(currentVibe) ? currentVibe : '',
    orrery_positions: normalizeOrreryPositions(source.orrery_positions),
    orrery_radial_distance_budget: normalizedBudget,
    number_of_available_slides: normalizedBudget
  };
};

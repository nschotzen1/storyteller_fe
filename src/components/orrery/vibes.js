import { archetypes } from './archetypes';

const SERVER_ASSET_ORIGIN = 'http://localhost:5001';

export const ORRERY_MIN_LEVEL = 0;
export const ORRERY_MAX_LEVEL = 5;
export const ORRERY_DEFAULT_LEVEL = 2;
export const ORRERY_INITIAL_RADIAL_DISTANCE_BUDGET = 2;

export const ORRERY_STAGE_DEFINITIONS = [
  { level: 0, label: 'Absent', shortLabel: '0', radius: 0.08 },
  { level: 1, label: 'Trace', shortLabel: 'I', radius: 0.24 },
  { level: 2, label: 'Local', shortLabel: 'II', radius: 0.40 },
  { level: 3, label: 'Force', shortLabel: 'III', radius: 0.56 },
  { level: 4, label: 'Principle', shortLabel: 'IV', radius: 0.72 },
  { level: 5, label: 'Law', shortLabel: 'V', radius: 0.88 }
];

const STAGE_BY_LEVEL = ORRERY_STAGE_DEFINITIONS.reduce((acc, stage) => {
  acc[stage.level] = stage;
  return acc;
}, {});

export const DEFAULT_ORRERY_VECTOR = archetypes.reduce((acc, archetype) => {
  acc[archetype.id] = ORRERY_DEFAULT_LEVEL;
  return acc;
}, {});

export const DEFAULT_ORRERY_POSITIONS = archetypes.reduce((acc, archetype) => {
  acc[archetype.id] = STAGE_BY_LEVEL[ORRERY_DEFAULT_LEVEL].radius;
  return acc;
}, {});

const serverAssetUrl = (assetPath) => `${SERVER_ASSET_ORIGIN}${assetPath}`;

export const ORRERY_VIBES = [
  {
    id: 'forge_ember',
    label: 'Forge Ember',
    backgroundUrl: serverAssetUrl('/assets/typewriter_page_images/film_page1.png'),
    alignment: {
      forge: 4
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
      veil: 4,
      warden: 2
    },
    writingStyle: {
      font: "'Uncial Antiqua', serif",
      font_size: '31px',
      font_color: '#27455f',
      mood: 'cold, watchful, folkloric'
    }
  },
  {
    id: 'rift_scar',
    label: 'Rift Scar',
    backgroundUrl: serverAssetUrl('/assets/typewriter_page_images/film_page4.png'),
    alignment: {
      rift: 4,
      hollow: 2
    },
    writingStyle: {
      font: "'EB Garamond', serif",
      font_size: '33px',
      font_color: '#30255f',
      mood: 'strange, fractured, ceremonial'
    }
  }
];

export const clampOrreryLevel = (level) => {
  const numeric = Number(level);
  if (!Number.isFinite(numeric)) return ORRERY_DEFAULT_LEVEL;
  return Math.max(ORRERY_MIN_LEVEL, Math.min(ORRERY_MAX_LEVEL, Math.round(numeric)));
};

export const getOrreryStage = (level) => STAGE_BY_LEVEL[clampOrreryLevel(level)] || STAGE_BY_LEVEL[ORRERY_DEFAULT_LEVEL];

export const getOrreryLevelRadius = (level) => getOrreryStage(level).radius;

export const getOrreryLevelFromRadius = (radius) => {
  const numeric = Number(radius);
  const safeRadius = Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0;
  return ORRERY_STAGE_DEFINITIONS.reduce((closest, stage) => {
    const closestDistance = Math.abs(safeRadius - closest.radius);
    const stageDistance = Math.abs(safeRadius - stage.radius);
    return stageDistance < closestDistance ? stage : closest;
  }, ORRERY_STAGE_DEFINITIONS[0]).level;
};

const coerceOrreryLevelOrRadius = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return ORRERY_DEFAULT_LEVEL;
  if (Number.isInteger(numeric) && numeric >= ORRERY_MIN_LEVEL && numeric <= ORRERY_MAX_LEVEL) {
    return clampOrreryLevel(numeric);
  }
  return getOrreryLevelFromRadius(numeric);
};

export const getOrreryRadialDistanceCost = (fromLevelOrRadius, toLevelOrRadius) => {
  const fromLevel = coerceOrreryLevelOrRadius(fromLevelOrRadius);
  const toLevel = coerceOrreryLevelOrRadius(toLevelOrRadius);
  return Math.abs(fromLevel - toLevel);
};

export const clampOrreryLevelToBudget = (fromLevel, toLevel, radialBudget) => {
  const safeBudget = Math.max(0, Math.floor(Number(radialBudget) || 0));
  const safeFromLevel = clampOrreryLevel(fromLevel);
  const safeToLevel = clampOrreryLevel(toLevel);
  const delta = safeToLevel - safeFromLevel;
  if (Math.abs(delta) <= safeBudget) return safeToLevel;
  return clampOrreryLevel(safeFromLevel + Math.sign(delta) * safeBudget);
};

export const clampOrreryRadiusToBudget = (fromRadius, toRadius, radialBudget) => {
  const fromLevel = getOrreryLevelFromRadius(fromRadius);
  const toLevel = getOrreryLevelFromRadius(toRadius);
  return getOrreryLevelRadius(clampOrreryLevelToBudget(fromLevel, toLevel, radialBudget));
};

export const normalizeOrreryVector = (vector = {}, fallbackPositions = null) => {
  const source = vector && typeof vector === 'object' && !Array.isArray(vector)
    ? vector
    : {};
  const positions = fallbackPositions && typeof fallbackPositions === 'object' && !Array.isArray(fallbackPositions)
    ? fallbackPositions
    : {};
  return archetypes.reduce((acc, archetype) => {
    if (source[archetype.id] !== undefined) {
      acc[archetype.id] = clampOrreryLevel(source[archetype.id]);
      return acc;
    }
    if (positions[archetype.id] !== undefined) {
      acc[archetype.id] = getOrreryLevelFromRadius(positions[archetype.id]);
      return acc;
    }
    acc[archetype.id] = DEFAULT_ORRERY_VECTOR[archetype.id];
    return acc;
  }, {});
};

export const normalizeOrreryPositions = (positions = {}, fallbackVector = null) => {
  const source = positions && typeof positions === 'object' && !Array.isArray(positions)
    ? positions
    : {};
  const vector = normalizeOrreryVector(fallbackVector || {}, source);
  return archetypes.reduce((acc, archetype) => {
    const numeric = Number(source[archetype.id]);
    acc[archetype.id] = Number.isFinite(numeric)
      ? Math.max(0, Math.min(1, numeric))
      : getOrreryLevelRadius(vector[archetype.id]);
    return acc;
  }, {});
};

export const positionsFromOrreryVector = (vector = {}) => {
  const normalized = normalizeOrreryVector(vector);
  return archetypes.reduce((acc, archetype) => {
    acc[archetype.id] = getOrreryLevelRadius(normalized[archetype.id]);
    return acc;
  }, {});
};

export const getOrreryVibeById = (vibeId = '') =>
  ORRERY_VIBES.find((vibe) => vibe.id === vibeId) || null;

export const resolveOrreryVibeForVector = (vector = {}) => {
  const normalized = normalizeOrreryVector(vector);
  return ORRERY_VIBES.find((vibe) =>
    Object.entries(vibe.alignment || {}).every(([archetypeId, expectedLevel]) =>
      normalized[archetypeId] === clampOrreryLevel(expectedLevel)
    )
  ) || null;
};

export const resolveOrreryVibeForPositions = (positions = {}) =>
  resolveOrreryVibeForVector(normalizeOrreryVector({}, positions));

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
  const orrery_vector = normalizeOrreryVector(source.orrery_vector, source.orrery_positions);
  return {
    current_vibe: currentVibe,
    orrery_vector,
    orrery_positions: positionsFromOrreryVector(orrery_vector),
    page_texture_identity: source.page_texture_identity || null,
    orrery_radial_distance_budget: normalizedBudget,
    number_of_available_slides: normalizedBudget
  };
};

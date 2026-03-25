export const ROSE_COURT_BOARD_DIMENSIONS = Object.freeze({
  width: 1600,
  height: 1180
});

const BASE_NODE_LAYOUT = Object.freeze({
  outer_wall_plateau: {
    x: 468,
    y: 430,
    rotation: -2.4,
    zone: 'Outer wall',
    emphasis: 'anchor'
  },
  mural_attic_panel: {
    x: 182,
    y: 244,
    rotation: -6.8,
    zone: 'City branch',
    emphasis: 'branch'
  },
  mural_cabin_panel: {
    x: 472,
    y: 176,
    rotation: 1.8,
    zone: 'Weather branch',
    emphasis: 'branch'
  },
  mural_cottage_panel: {
    x: 768,
    y: 242,
    rotation: 5.6,
    zone: 'Domestic branch',
    emphasis: 'branch'
  },
  rock_scatter: {
    x: 534,
    y: 704,
    rotation: -1.6,
    zone: 'Signal trail',
    emphasis: 'trail'
  },
  phone_found: {
    x: 696,
    y: 914,
    rotation: 2.2,
    zone: 'Recovered handset',
    emphasis: 'trail'
  },
  location_mural_gallery: {
    x: 950,
    y: 652,
    rotation: -1.4,
    zone: 'Second wall',
    emphasis: 'anchor'
  },
  location_mural_high_room: {
    x: 1212,
    y: 430,
    rotation: -5.2,
    zone: 'Elevation',
    emphasis: 'branch'
  },
  location_mural_weather_cabin: {
    x: 1420,
    y: 252,
    rotation: 2.4,
    zone: 'Exposure',
    emphasis: 'branch'
  },
  location_mural_quiet_cottage: {
    x: 1412,
    y: 602,
    rotation: 6.4,
    zone: 'Hearth',
    emphasis: 'branch'
  },
  inner_court_well_approach: {
    x: 1198,
    y: 900,
    rotation: -2.2,
    zone: 'Inner court',
    emphasis: 'trail'
  },
  inner_court_well: {
    x: 1398,
    y: 994,
    rotation: 1.4,
    zone: 'Well',
    emphasis: 'destination'
  },
  inner_court_blackout: {
    x: 1522,
    y: 1098,
    rotation: -0.8,
    zone: 'Curtain fall',
    emphasis: 'ending'
  }
});

const hashCode = (value = '') => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getRoseCourtBoardNodeMeta = (screenId = '') => {
  const known = BASE_NODE_LAYOUT[screenId];
  if (known) return known;

  const hash = hashCode(screenId || 'rose-court');
  return {
    x: 320 + (hash % 880),
    y: 220 + ((hash >> 4) % 720),
    rotation: ((hash % 13) - 6),
    zone: 'Archive',
    emphasis: 'hint'
  };
};


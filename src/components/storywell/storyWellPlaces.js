export const STORY_WELL_LEVER_IDS = ['crown', 'forge', 'cave', 'rift', 'veil', 'verdant'];

export const STORY_WELL_LEVER_LABELS = {
  crown: 'Crown',
  forge: 'Forge',
  cave: 'Cave',
  rift: 'Rift',
  veil: 'Veil',
  verdant: 'Verdant',
};

export const STORY_WELL_INITIAL_LEVER_STATE = {
  crown: 0,
  forge: 1,
  cave: 0,
  rift: -1,
  veil: 1,
  verdant: 0,
};

export const STORY_WELL_LEVER_VALUES = [-1, 0, 1];

const PAGE_TEXTURES = {
  dusk: '/textures/decor/film_frame_desert.png',
  mechanism: '/textures/paper_texture_rugged.png',
  sealing: '/textures/typewriter_paper.png',
};

export const STORY_WELL_PLACES = [
  {
    id: 'sukuma-well-dusk',
    pageId: 'page_sukuma_well_003',
    title: 'Sukuma Well',
    depth: 3,
    textureId: 'verdant_veil_parchment_03',
    textureUrl: PAGE_TEXTURES.dusk,
    font: {
      font: 'IM Fell English SC',
      font_size: '1.82rem',
      font_color: '#3d2114',
    },
    cells: [
      {
        id: 'cell_baobab_001',
        text: 'It was not by all means the oldest baobab tree in Sukuma Valley, but it was definitely that.',
        depth: 2,
        pageId: 'page_sukuma_well_003',
        x: 0.28,
        y: 0.32,
        type: 'place',
        pagePosition: { anchor: 'after', x: 0.18, y: 0.18 },
      },
      {
        id: 'cell_leopards_001',
        text: 'The pack of white leopards circled the well.',
        depth: 3,
        pageId: 'page_sukuma_well_003',
        x: 0.55,
        y: 0.44,
        type: 'creature',
        pagePosition: { anchor: 'after', x: 0.46, y: 0.42 },
      },
      {
        id: 'cell_wait_001',
        text: '"We should wait until morning."',
        depth: 4,
        pageId: 'page_sukuma_well_003',
        x: 0.68,
        y: 0.66,
        type: 'dialogue',
        pagePosition: { anchor: 'before', x: 0.62, y: 0.72 },
      },
      {
        id: 'cell_supper_001',
        text: 'Making supper was finally their first concern after the long-',
        depth: 1,
        pageId: 'page_sukuma_well_003',
        x: 0.36,
        y: 0.72,
        type: 'event',
        pagePosition: { anchor: 'after', x: 0.22, y: 0.82 },
      },
    ],
  },
  {
    id: 'sukuma-well-hidden-mechanism',
    pageId: 'page_sukuma_well_004',
    title: 'Hidden Mechanism',
    depth: 4,
    textureId: 'forge_veil_parchment_04',
    textureUrl: PAGE_TEXTURES.mechanism,
    font: {
      font: 'Special Elite',
      font_size: '1.72rem',
      font_color: '#452112',
    },
    cells: [
      {
        id: 'cell_bucket_001',
        text: 'The bucket came up warm.',
        depth: 4,
        pageId: 'page_sukuma_well_004',
        x: 0.45,
        y: 0.38,
        type: 'object',
        pagePosition: { anchor: 'after', x: 0.4, y: 0.4 },
      },
      {
        id: 'cell_bronze_teeth_001',
        text: 'Bronze teeth clicked below the lip of the stones.',
        depth: 2,
        pageId: 'page_sukuma_well_004',
        x: 0.62,
        y: 0.56,
        type: 'object',
        pagePosition: { anchor: 'after', x: 0.58, y: 0.58 },
      },
      {
        id: 'cell_warm_rope_001',
        text: 'The rope carried a pulse, as if someone breathed through it.',
        depth: 5,
        pageId: 'page_sukuma_well_004',
        x: 0.31,
        y: 0.65,
        type: 'event',
        pagePosition: { anchor: 'before', x: 0.25, y: 0.67 },
      },
    ],
  },
  {
    id: 'sukuma-well-old-sealing',
    pageId: 'page_sukuma_well_005',
    title: 'Old Sealing',
    depth: 5,
    textureId: 'cave_veil_parchment_05',
    textureUrl: PAGE_TEXTURES.sealing,
    font: {
      font: 'Cormorant Garamond',
      font_size: '1.88rem',
      font_color: '#332019',
    },
    cells: [
      {
        id: 'cell_oldwoman_001',
        text: 'The oldest woman in Sukuma Valley had sealed that well once before.',
        depth: 5,
        pageId: 'page_sukuma_well_005',
        x: 0.5,
        y: 0.51,
        type: 'memory',
        pagePosition: { anchor: 'after', x: 0.45, y: 0.55 },
      },
      {
        id: 'cell_bone_inlay_001',
        text: 'Bone inlay brightened when the old name was spoken.',
        depth: 3,
        pageId: 'page_sukuma_well_005',
        x: 0.34,
        y: 0.38,
        type: 'memory',
        pagePosition: { anchor: 'before', x: 0.28, y: 0.34 },
      },
      {
        id: 'cell_lid_breath_001',
        text: 'Under the lid, the dark made room for a breath.',
        depth: 6,
        pageId: 'page_sukuma_well_005',
        x: 0.64,
        y: 0.68,
        type: 'rumor',
        pagePosition: { anchor: 'after', x: 0.62, y: 0.76 },
      },
    ],
  },
];

export const STORY_WELL_DEFAULT_PLACE_ID = STORY_WELL_PLACES[0].id;

const PLACE_BY_ID = new Map(STORY_WELL_PLACES.map((place) => [place.id, place]));

const LEVER_PLACE_MAP = {
  crown: {
    '-1': 'sukuma-well-old-sealing',
    0: 'sukuma-well-dusk',
    1: 'sukuma-well-dusk',
  },
  forge: {
    '-1': 'sukuma-well-old-sealing',
    0: 'sukuma-well-dusk',
    1: 'sukuma-well-hidden-mechanism',
  },
  cave: {
    '-1': 'sukuma-well-dusk',
    0: 'sukuma-well-hidden-mechanism',
    1: 'sukuma-well-old-sealing',
  },
  rift: {
    '-1': 'sukuma-well-dusk',
    0: 'sukuma-well-hidden-mechanism',
    1: 'sukuma-well-old-sealing',
  },
  veil: {
    '-1': 'sukuma-well-hidden-mechanism',
    0: 'sukuma-well-old-sealing',
    1: 'sukuma-well-dusk',
  },
  verdant: {
    '-1': 'sukuma-well-hidden-mechanism',
    0: 'sukuma-well-dusk',
    1: 'sukuma-well-old-sealing',
  },
};

export function getStoryWellPlaceById(placeId) {
  return PLACE_BY_ID.get(placeId) || PLACE_BY_ID.get(STORY_WELL_DEFAULT_PLACE_ID);
}

export function getNextStoryWellLeverValue(value) {
  const currentIndex = STORY_WELL_LEVER_VALUES.indexOf(value);
  const nextIndex = currentIndex < 0 ? 1 : (currentIndex + 1) % STORY_WELL_LEVER_VALUES.length;
  return STORY_WELL_LEVER_VALUES[nextIndex];
}

export function resolveStoryWellPlaceForLever(leverId, leverValue) {
  const mappedPlaceId = LEVER_PLACE_MAP[leverId]?.[leverValue];
  return getStoryWellPlaceById(mappedPlaceId);
}

export function createStoryWellPageFromPlace(place, existingPage = {}) {
  const resolvedPlace = getStoryWellPlaceById(place?.id);
  return {
    ...existingPage,
    text: typeof existingPage?.text === 'string' ? existingPage.text : '',
    filmBgUrl: resolvedPlace.textureUrl,
    pageStyleRanges: Array.isArray(existingPage?.pageStyleRanges) ? existingPage.pageStyleRanges : [],
    pageFontStyles: resolvedPlace.font,
    storyWellCells: resolvedPlace.cells,
    storyWellPlaceId: resolvedPlace.id,
    storyWellPageId: resolvedPlace.pageId,
    storyWellTitle: resolvedPlace.title,
    storyWellDepth: resolvedPlace.depth,
  };
}

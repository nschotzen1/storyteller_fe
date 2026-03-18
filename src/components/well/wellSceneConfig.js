export const DEFAULT_FRAGMENT_LINES = [
  'It was almost night as she',
  'Nothing could prepare them for such weather',
  'Elionda was observing herself in the golden embroidered mirror',
  'The house remembered every vow spoken under rain',
  'Someone had written the answer before the question existed',
  'When the bell failed, the birds continued the ceremony',
  'No one noticed the garden leaning closer to hear',
  'By dawn the map had changed its mind again',
  'She kept the key because the lock still dreamed of it',
  'The sea withdrew only long enough to listen'
];

export const DEFAULT_WELL_SCENE_CONFIG = {
  component: {
    backgroundSrc: '/well/well_background.png',
    wordLimit: 10,
    promptDelayMs: 5200,
    fragmentSpawnMs: 1700,
    fragmentLifetimeMs: 5200,
    departureDurationMs: 3600,
    promptDock: 'side'
  },
  copy: {
    sceneEyebrow: 'Direct Debug View',
    sceneTitle: 'Well of Fragments',
    promptLabel: 'The falcon offers a parchment.',
    promptHint: 'Write one line. The ink will hold ten words at most.',
    promptPlaceholder: 'A single line for the court...',
    departureStatus: 'The falcon folds the line into its satchel and rises toward the dovecot.',
    footerWaiting: 'Waiting for the fragments to surface and the parchment to appear.',
    footerReadyPrefix: 'Parchment ready.',
    footerLatestPrefix: 'Latest fragment:',
    footerLastSubmittedPrefix: 'Last submitted line:'
  },
  fragments: DEFAULT_FRAGMENT_LINES,
  updatedAt: '',
  updatedBy: ''
};

export const DEFAULT_WELL_ROUTE_META = {
  routes: {
    publicConfig: '/api/well/config',
    adminConfig: '/api/admin/well/config',
    adminReset: '/api/admin/well/config/reset'
  },
  consumers: [
    {
      label: 'Standalone editor',
      route: '/?view=well'
    },
    {
      label: 'Quest well',
      questId: 'ruined_rose_court',
      screenId: 'periphery_well_rim'
    },
    {
      label: 'Rose Court prologue',
      questId: 'rose_court_prologue_phase_1',
      screenId: 'inner_court_well'
    }
  ]
};

const clampNumber = (value, fallback, min, max) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(min, Math.round(numeric)), max);
};

const normalizeString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  return value.trim() ? value : fallback;
};

const normalizeCopyString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  return value.length ? value : fallback;
};

export const normalizeWellSceneConfig = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const component = source.component && typeof source.component === 'object' ? source.component : {};
  const copy = source.copy && typeof source.copy === 'object' ? source.copy : {};
  const fragments = Array.isArray(source.fragments)
    ? source.fragments
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
    : [];

  return {
    component: {
      backgroundSrc: normalizeString(
        component.backgroundSrc,
        DEFAULT_WELL_SCENE_CONFIG.component.backgroundSrc
      ),
      wordLimit: clampNumber(
        component.wordLimit,
        DEFAULT_WELL_SCENE_CONFIG.component.wordLimit,
        1,
        30
      ),
      promptDelayMs: clampNumber(
        component.promptDelayMs,
        DEFAULT_WELL_SCENE_CONFIG.component.promptDelayMs,
        0,
        30000
      ),
      fragmentSpawnMs: clampNumber(
        component.fragmentSpawnMs,
        DEFAULT_WELL_SCENE_CONFIG.component.fragmentSpawnMs,
        200,
        30000
      ),
      fragmentLifetimeMs: clampNumber(
        component.fragmentLifetimeMs,
        DEFAULT_WELL_SCENE_CONFIG.component.fragmentLifetimeMs,
        800,
        45000
      ),
      departureDurationMs: clampNumber(
        component.departureDurationMs,
        DEFAULT_WELL_SCENE_CONFIG.component.departureDurationMs,
        600,
        30000
      ),
      promptDock: component.promptDock === 'bottom' ? 'bottom' : DEFAULT_WELL_SCENE_CONFIG.component.promptDock
    },
    copy: {
      sceneEyebrow: normalizeCopyString(
        copy.sceneEyebrow,
        DEFAULT_WELL_SCENE_CONFIG.copy.sceneEyebrow
      ),
      sceneTitle: normalizeCopyString(
        copy.sceneTitle,
        DEFAULT_WELL_SCENE_CONFIG.copy.sceneTitle
      ),
      promptLabel: normalizeCopyString(
        copy.promptLabel,
        DEFAULT_WELL_SCENE_CONFIG.copy.promptLabel
      ),
      promptHint: normalizeCopyString(
        copy.promptHint,
        DEFAULT_WELL_SCENE_CONFIG.copy.promptHint
      ),
      promptPlaceholder: normalizeCopyString(
        copy.promptPlaceholder,
        DEFAULT_WELL_SCENE_CONFIG.copy.promptPlaceholder
      ),
      departureStatus: normalizeCopyString(
        copy.departureStatus,
        DEFAULT_WELL_SCENE_CONFIG.copy.departureStatus
      ),
      footerWaiting: normalizeCopyString(
        copy.footerWaiting,
        DEFAULT_WELL_SCENE_CONFIG.copy.footerWaiting
      ),
      footerReadyPrefix: normalizeCopyString(
        copy.footerReadyPrefix,
        DEFAULT_WELL_SCENE_CONFIG.copy.footerReadyPrefix
      ),
      footerLatestPrefix: normalizeCopyString(
        copy.footerLatestPrefix,
        DEFAULT_WELL_SCENE_CONFIG.copy.footerLatestPrefix
      ),
      footerLastSubmittedPrefix: normalizeCopyString(
        copy.footerLastSubmittedPrefix,
        DEFAULT_WELL_SCENE_CONFIG.copy.footerLastSubmittedPrefix
      )
    },
    fragments: fragments.length ? fragments : DEFAULT_FRAGMENT_LINES,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : ''
  };
};

export const buildRoseCourtWellSceneProps = (config, overrides = {}) => {
  const normalized = normalizeWellSceneConfig(config);
  return {
    backgroundSrc: overrides.backgroundSrc || normalized.component.backgroundSrc,
    fragmentLines: normalized.fragments,
    wordLimit: normalized.component.wordLimit,
    promptDelayMs: normalized.component.promptDelayMs,
    fragmentSpawnMs: normalized.component.fragmentSpawnMs,
    fragmentLifetimeMs: normalized.component.fragmentLifetimeMs,
    departureDurationMs: normalized.component.departureDurationMs,
    promptDock: normalized.component.promptDock,
    promptLabel: normalized.copy.promptLabel,
    promptHint: normalized.copy.promptHint,
    promptPlaceholder: normalized.copy.promptPlaceholder,
    departureStatusText: normalized.copy.departureStatus,
    ...overrides
  };
};

export const serializeFragmentsDraft = (fragments = []) => fragments.join('\n');

export const parseFragmentsDraft = (value = '') => (
  String(value || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
);

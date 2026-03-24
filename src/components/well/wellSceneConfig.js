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

const clone = (value) => JSON.parse(JSON.stringify(value));

const buildDefaultTextualBank = () => DEFAULT_FRAGMENT_LINES.map((text, index) => ({
  id: `txt_${index + 1}`,
  text,
  weight: 1,
  tags: []
}));

export const DEFAULT_WELL_SCENE_CONFIG = {
  component: {
    backgroundSrc: '/well/well_background.png',
    wordLimit: 10,
    promptDelayMs: 5200,
    fragmentSpawnMs: 2200,
    fragmentLifetimeMs: 7600,
    departureDurationMs: 3600,
    promptDock: 'side'
  },
  copy: {
    sceneEyebrow: 'Direct Debug View',
    sceneTitle: 'Well of Fragments',
    promptLabel: 'What words do you remember?',
    promptHint: 'Jot down what you caught before the well swallows it again.',
    promptPlaceholder: 'A remembered line, name, or place...',
    departureStatus: 'The falcon folds the gathered bundle into its satchel and rises toward the dovecot.',
    footerWaiting: 'The well waits for the next line to surface.',
    footerReadyPrefix: 'Gathered so far:',
    footerLatestPrefix: 'Latest fragment:',
    footerLastSubmittedPrefix: 'Latest jot:',
    handoffLabel: 'Hand the bundle to the falcon',
    impatienceStatus: 'The falcon grows impatient. It wants the gathered bundle now.',
    observingHint: 'A scrap hangs in the water. Catch it before it slips your memory.',
    jotActionLabel: 'Jot this scrap'
  },
  completion: {
    required: {
      textual: 3
    }
  },
  runtime: {
    sourceMode: 'bank'
  },
  banks: {
    textual: buildDefaultTextualBank()
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

const normalizeTags = (value = []) => (
  Array.isArray(value)
    ? value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
    : []
);

export const normalizeTextualBankEntry = (value, index = 0) => {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return null;
    return {
      id: `txt_${index + 1}`,
      text,
      weight: 1,
      tags: []
    };
  }

  if (!value || typeof value !== 'object') return null;

  const text = typeof value.text === 'string' ? value.text.trim() : '';
  if (!text) return null;

  return {
    id: normalizeString(value.id, `txt_${index + 1}`),
    text,
    weight: clampNumber(value.weight, 1, 1, 10),
    tags: normalizeTags(value.tags)
  };
};

export const normalizeTextualBank = (value = [], fallbackBank = buildDefaultTextualBank()) => {
  const source = Array.isArray(value) ? value : [];
  const normalized = source
    .map((entry, index) => normalizeTextualBankEntry(entry, index))
    .filter(Boolean);
  return normalized.length ? normalized : clone(fallbackBank);
};

export const getTextualLinesFromConfig = (config = {}) => {
  const source = config && typeof config === 'object' ? config : {};
  const bank = normalizeTextualBank(source?.banks?.textual, buildDefaultTextualBank());
  return bank.map((entry) => entry.text);
};

export const normalizeWellSceneConfig = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const component = source.component && typeof source.component === 'object' ? source.component : {};
  const copy = source.copy && typeof source.copy === 'object' ? source.copy : {};
  const completion = source.completion && typeof source.completion === 'object' ? source.completion : {};
  const required = completion.required && typeof completion.required === 'object' ? completion.required : {};
  const runtime = source.runtime && typeof source.runtime === 'object' ? source.runtime : {};
  const banks = source.banks && typeof source.banks === 'object' ? source.banks : {};
  const legacyFragments = Array.isArray(source.fragments)
    ? source.fragments
    : [];
  const fallbackBank = legacyFragments.length
    ? legacyFragments.map((entry, index) => normalizeTextualBankEntry(entry, index)).filter(Boolean)
    : buildDefaultTextualBank();
  const textualBank = normalizeTextualBank(banks.textual, fallbackBank);
  const textualLines = textualBank.map((entry) => entry.text);

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
      ),
      handoffLabel: normalizeCopyString(
        copy.handoffLabel,
        DEFAULT_WELL_SCENE_CONFIG.copy.handoffLabel
      ),
      impatienceStatus: normalizeCopyString(
        copy.impatienceStatus,
        DEFAULT_WELL_SCENE_CONFIG.copy.impatienceStatus
      ),
      observingHint: normalizeCopyString(
        copy.observingHint,
        DEFAULT_WELL_SCENE_CONFIG.copy.observingHint
      ),
      jotActionLabel: normalizeCopyString(
        copy.jotActionLabel,
        DEFAULT_WELL_SCENE_CONFIG.copy.jotActionLabel
      )
    },
    completion: {
      required: {
        textual: clampNumber(
          required.textual,
          DEFAULT_WELL_SCENE_CONFIG.completion.required.textual,
          1,
          12
        )
      }
    },
    runtime: {
      sourceMode: runtime.sourceMode === 'hybrid' ? 'hybrid' : DEFAULT_WELL_SCENE_CONFIG.runtime.sourceMode
    },
    banks: {
      textual: textualBank
    },
    fragments: textualLines,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : ''
  };
};

export const buildRoseCourtWellSceneProps = (config, overrides = {}) => {
  const normalized = normalizeWellSceneConfig(config);
  return {
    backgroundSrc: overrides.backgroundSrc || normalized.component.backgroundSrc,
    textualFragments: normalized.banks.textual,
    fragmentLines: normalized.fragments,
    requiredTextualJots: normalized.completion.required.textual,
    wordLimit: normalized.component.wordLimit,
    promptDelayMs: normalized.component.promptDelayMs,
    fragmentSpawnMs: normalized.component.fragmentSpawnMs,
    fragmentLifetimeMs: normalized.component.fragmentLifetimeMs,
    departureDurationMs: normalized.component.departureDurationMs,
    promptDock: normalized.component.promptDock,
    promptLabel: normalized.copy.promptLabel,
    promptHint: normalized.copy.promptHint,
    promptPlaceholder: normalized.copy.promptPlaceholder,
    handoffLabel: normalized.copy.handoffLabel,
    impatienceStatusText: normalized.copy.impatienceStatus,
    observingHint: normalized.copy.observingHint,
    jotActionLabel: normalized.copy.jotActionLabel,
    departureStatusText: normalized.copy.departureStatus,
    ...overrides
  };
};

export const serializeTextualBankDraft = (entries = []) => entries
  .map((entry) => (typeof entry === 'string' ? entry : entry?.text || ''))
  .filter(Boolean)
  .join('\n');

export const parseTextualBankDraft = (value = '') => (
  String(value || '')
    .split('\n')
    .map((entry, index) => normalizeTextualBankEntry(entry, index))
    .filter(Boolean)
);

export const serializeFragmentsDraft = serializeTextualBankDraft;
export const parseFragmentsDraft = parseTextualBankDraft;

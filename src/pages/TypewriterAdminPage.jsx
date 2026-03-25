import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_API_BASE_URL,
  inspectTypewriterSession,
  loadLlmRouteConfigs,
  loadLlmRouteConfigVersions,
  loadOpenAiModels,
  loadTypewriterPrompts,
  loadTypewriterAiSettings,
  loadTypewriterPromptVersions,
  resetLlmRouteConfig,
  resetTypewriterAiSettings,
  saveLlmRouteConfigVersion,
  seedCurrentTypewriterPrompts,
  saveTypewriterPrompt,
  setLatestLlmRouteConfigVersion,
  setLatestTypewriterPromptVersion,
  saveTypewriterAiSettings,
  startOrSeedTypewriterSession
} from '../api/typewriterAdmin';
import WellAdminWorkspace from '../components/well/WellAdminWorkspace';
import { STORY_ADMIN_CONTROL_COMPONENTS } from './storyAdminControlCenterRegistry';
import './TypewriterAdminPage.css';

const TYPEWRITER_ADMIN_API_BASE_STORAGE_KEY = 'typewriterAdminApiBaseUrl';
const TYPEWRITER_ADMIN_KEY_STORAGE_KEY = 'typewriterAdminApiKey';
const TYPEWRITER_SESSION_STORAGE_KEY = 'sessionId';
const IMMERSIVE_RPG_PLAYER_NAME_STORAGE_KEY = 'immersiveRpgPlayerName';
const MEMORY_SPREAD_ADMIN_MODE_STORAGE_KEY = 'memorySpreadAdminMode';
const STORY_ADMIN_SECTION_STORAGE_KEY = 'storyAdminSection';
const DEFAULT_SESSION_SEED_FRAGMENT =
  'At dusk the courier reached the wind-scoured pass below a rusted watchtower, carrying a rain-dark satchel sealed with ash. No one answered the signal bell, but boot prints ringed the threshold and vanished into the shale. When the courier touched the gate, a hidden mechanism groaned awake beneath the stone.';
const EMPTY_MODELS_PAYLOAD = {
  textModels: [],
  imageModels: [],
  source: 'fallback',
  fetchedAt: '',
  providers: {}
};
const FALLBACK_ANTHROPIC_TEXT_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'claude-opus-4-1-20250805',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest',
  'claude-3-opus-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest'
];

const SETTING_PIPELINES = [
  {
    key: 'story_continuation',
    label: 'Story continuation',
    description: '/api/send_typewriter_text',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai'
  },
  {
    key: 'xerofag_inspection',
    label: 'Xerofag inspection',
    description: '/api/shouldAllowXerofag',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai'
  },
  {
    key: 'messenger_chat',
    label: 'Messenger chat',
    description: '/api/messenger/chat',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai'
  },
  {
    key: 'immersive_rpg_gm',
    label: 'Immersive RPG GM',
    description: '/api/immersive-rpg/chat',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai'
  },
  {
    key: 'memory_creation',
    label: 'Memory creation',
    description: '/api/fragmentToMemories',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai',
    supportsCount: true,
    countProperty: 'memoryCount',
    countLabel: 'Default memory count',
    minCount: 1,
    maxCount: 10,
    defaultCount: 3
  },
  {
    key: 'entity_creation',
    label: 'Entity creation',
    description: '/api/textToEntity',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai',
    supportsCount: true,
    countProperty: 'entityCount',
    countLabel: 'Default entity count',
    minCount: 1,
    maxCount: 12,
    defaultCount: 8
  },
  {
    key: 'storyteller_creation',
    label: 'Storyteller creation',
    description: '/api/textToStoryteller (persona stage)',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai',
    supportsCount: true,
    countProperty: 'storytellerCount',
    countLabel: 'Default storyteller count',
    minCount: 1,
    maxCount: 10,
    defaultCount: 4
  },
  {
    key: 'storyteller_intervention',
    label: 'Storyteller intervention',
    description: '/api/send_storyteller_typewriter_text',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai'
  },
  {
    key: 'typewriter_key_verification',
    label: 'Typewriter key verification',
    description: '/api/typewriter/keys/shouldAllow',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai'
  },
  {
    key: 'storyteller_mission',
    label: 'Storyteller mission',
    description: '/api/sendStorytellerToEntity',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai'
  },
  {
    key: 'relationship_evaluation',
    label: 'Relationship evaluation',
    description: '/api/arena/relationships/propose',
    modelKind: 'text',
    supportedProviders: ['openai', 'anthropic'],
    defaultProvider: 'openai'
  },
  {
    key: 'texture_creation',
    label: 'Texture creation',
    description: 'Card/front/back image generation',
    modelKind: 'image',
    supportedProviders: ['openai'],
    defaultProvider: 'openai'
  },
  {
    key: 'illustration_creation',
    label: 'Illustration creation',
    description: '/api/textToStoryteller (illustration stage)',
    modelKind: 'image',
    supportedProviders: ['openai'],
    defaultProvider: 'openai'
  }
];

const PROMPT_PIPELINES = [
  {
    key: 'story_continuation',
    label: 'Story continuation',
    description: '/api/send_typewriter_text',
    settingsKey: 'story_continuation'
  },
  {
    key: 'xerofag_inspection',
    label: 'Xerofag inspection',
    description: '/api/shouldAllowXerofag',
    settingsKey: 'xerofag_inspection'
  },
  {
    key: 'messenger_chat',
    label: 'Messenger chat',
    description: '/api/messenger/chat assistant prompt',
    settingsKey: 'messenger_chat'
  },
  {
    key: 'immersive_rpg_gm',
    label: 'Immersive RPG GM',
    description: '/api/immersive-rpg/chat GM orchestration prompt',
    settingsKey: 'immersive_rpg_gm'
  },
  {
    key: 'memory_creation',
    label: 'Memory creation',
    description: '/api/fragmentToMemories memory extraction',
    settingsKey: 'memory_creation'
  },
  {
    key: 'memory_card_front',
    label: 'Memory card front',
    description: '/api/memories/:memoryId/textToImage/front',
    settingsKey: 'texture_creation'
  },
  {
    key: 'memory_card_back',
    label: 'Memory card back',
    description: '/api/memories/:memoryId/textToImage/back',
    settingsKey: 'texture_creation'
  },
  {
    key: 'entity_creation',
    label: 'Entity creation',
    description: '/api/textToEntity entity extraction',
    settingsKey: 'entity_creation'
  },
  {
    key: 'entity_card_front',
    label: 'Entity card front',
    description: '/api/textToEntity front image generation',
    settingsKey: 'texture_creation'
  },
  {
    key: 'texture_creation',
    label: 'Entity card back texture',
    description: '/api/textToEntity back texture generation',
    settingsKey: 'texture_creation'
  },
  {
    key: 'storyteller_creation',
    label: 'Storyteller creation',
    description: '/api/textToStoryteller persona generation',
    settingsKey: 'storyteller_creation'
  },
  {
    key: 'storyteller_intervention',
    label: 'Storyteller intervention',
    description: '/api/send_storyteller_typewriter_text storyteller entrance continuation',
    settingsKey: 'storyteller_intervention'
  },
  {
    key: 'typewriter_key_verification',
    label: 'Typewriter key verification',
    description: '/api/typewriter/keys/shouldAllow textual key insertion judge',
    settingsKey: 'typewriter_key_verification'
  },
  {
    key: 'storyteller_mission',
    label: 'Storyteller mission',
    description: '/api/sendStorytellerToEntity mission evaluation',
    settingsKey: 'storyteller_mission'
  },
  {
    key: 'relationship_evaluation',
    label: 'Relationship evaluation',
    description: '/api/arena/relationships/* judgment prompt',
    settingsKey: 'relationship_evaluation'
  },
  {
    key: 'storyteller_key_creation',
    label: 'Storyteller key image',
    description: '/api/textToStoryteller typewriter key image generation',
    settingsKey: 'illustration_creation'
  },
  {
    key: 'illustration_creation',
    label: 'Storyteller illustration',
    description: '/api/textToStoryteller illustration generation',
    settingsKey: 'illustration_creation'
  }
];

const ADMIN_SECTIONS = [
  { key: 'control', label: 'Control Center' },
  { key: 'runtime', label: 'Runtime' },
  { key: 'session', label: 'Session' },
  { key: 'prompts', label: 'Prompt Templates' },
  { key: 'contracts', label: 'Schemas' }
];

const TYPEWRITER_ASSET_FLOW = [
  {
    title: 'Session hydration',
    route: '/api/typewriter/session/start',
    asset: 'Current fragment plus saved textual keys',
    storage: 'NarrativeFragment + TypewriterKey',
    note: 'Bootstraps the page and returns the keyboard-facing textual key objects.'
  },
  {
    title: 'Storyteller slot generation',
    route: '/api/shouldCreateStorytellerKey',
    asset: 'Storyteller persona JSON and storyteller key PNG',
    storage: 'Storyteller',
    note: 'Unlocks one blank storyteller slot, fills it with a generated persona, and returns the current slot state.'
  },
  {
    title: 'Storyteller intervention',
    route: '/api/send_storyteller_typewriter_text',
    asset: 'Continuation text, NarrativeEntity, and TypewriterKey',
    storage: 'NarrativeEntity + TypewriterKey + Storyteller',
    note: 'Creates the storyteller entrance text and persists the new pressable textual key tied to the introduced entity.'
  },
  {
    title: 'Textual key verification',
    route: '/api/typewriter/keys/shouldAllow',
    asset: 'LLM verdict plus appendedText',
    storage: 'TypewriterKey usage state',
    note: 'Checks whether any textual key such as Xerofag or a storyteller-created key may append itself to the live narrative.'
  },
  {
    title: 'Session inspection',
    route: '/api/typewriter/session/inspect',
    asset: 'Joined session snapshot for debugging',
    storage: 'NarrativeFragment + Storyteller + TypewriterKey + NarrativeEntity',
    note: 'Read-only inspector that shows the live fragment, storyteller slots, internal entity truth, and player-facing key disclosure for one session.'
  }
];

const getInitialApiBaseUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  const stored = window.localStorage.getItem(TYPEWRITER_ADMIN_API_BASE_STORAGE_KEY);
  return stored && stored.trim() ? stored : DEFAULT_API_BASE_URL;
};

const getInitialAdminKey = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(TYPEWRITER_ADMIN_KEY_STORAGE_KEY);
  return stored && stored.trim() ? stored : '';
};

const getInitialStoredSessionId = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(TYPEWRITER_SESSION_STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : '';
};

const getInitialStoredPlayerName = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(IMMERSIVE_RPG_PLAYER_NAME_STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : '';
};

const getInitialMemorySpreadAdminMode = () => {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(MEMORY_SPREAD_ADMIN_MODE_STORAGE_KEY);
  const normalized = `${stored || ''}`.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const getInitialAdminSection = () => {
  if (typeof window === 'undefined') return 'control';
  const stored = window.localStorage.getItem(STORY_ADMIN_SECTION_STORAGE_KEY);
  return ADMIN_SECTIONS.some((section) => section.key === stored) ? stored : 'control';
};

const buildEmptySettings = (pipelineDefinitions = SETTING_PIPELINES) => {
  const pipelines = {};
  for (const pipeline of pipelineDefinitions) {
      pipelines[pipeline.key] = {
        key: pipeline.key,
        useMock: false,
        model: '',
        modelKind: pipeline.modelKind,
        provider: pipeline.defaultProvider || 'openai'
      };
      if (pipeline.supportsCount && pipeline.countProperty) {
        pipelines[pipeline.key][pipeline.countProperty] = pipeline.defaultCount;
      }
  }
  return {
    pipelines,
    updatedAt: '',
    updatedBy: ''
  };
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Never';
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return 'Never';
  return new Date(parsed).toLocaleString();
};

const formatInspectorValue = (value, fallback = 'Not available') => {
  const normalized = typeof value === 'string' ? value.trim() : `${value ?? ''}`.trim();
  return normalized || fallback;
};

const formatInspectorList = (value) => {
  const entries = Array.isArray(value)
    ? value.map((entry) => `${entry || ''}`.trim()).filter(Boolean)
    : [];
  return entries.length ? entries.join(', ') : 'None';
};

const normalizeCountDraft = (value, fallback = 1, min = 1, max = 10) => {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(Math.max(min, Math.floor(next)), max);
};

const getRouteRuntimeModeLabel = (route = null) => {
  const runtimeRows = Array.isArray(route?.runtimeRows) ? route.runtimeRows : [];
  if (!runtimeRows.length) return 'No runtime controls';
  if (runtimeRows.every((runtimeRow) => runtimeRow.useMock)) return 'Mock';
  if (runtimeRows.every((runtimeRow) => !runtimeRow.useMock)) return 'Live';
  return 'Mixed';
};

const buildRouteRuntimeSummary = (route = null) => {
  const runtimeRows = Array.isArray(route?.runtimeRows) ? route.runtimeRows : [];
  if (!runtimeRows.length) return 'No shared runtime pipeline attached.';
  return runtimeRows
    .map((runtimeRow) =>
      runtimeRow.useMock
        ? `${runtimeRow.label}: mock`
        : `${runtimeRow.label}: ${runtimeRow.provider || 'openai'} / ${runtimeRow.model || 'unset'}`
    )
    .join(' | ');
};

const collectUniqueRuntimeRows = (routes = []) => {
  const runtimeMap = new Map();
  routes.forEach((route) => {
    (route?.runtimeRows || []).forEach((runtimeRow) => {
      if (!runtimeRow?.key || runtimeMap.has(runtimeRow.key)) return;
      runtimeMap.set(runtimeRow.key, runtimeRow);
    });
  });
  return Array.from(runtimeMap.values());
};

const buildRuntimeSettingsPayload = (runtimeRows = []) => {
  const payload = { pipelines: {} };
  runtimeRows.forEach((runtimeRow) => {
    if (!runtimeRow?.key) return;
    payload.pipelines[runtimeRow.key] = {
      useMock: Boolean(runtimeRow.useMock),
      model: runtimeRow.model,
      provider: runtimeRow.provider || 'openai'
    };
    if (runtimeRow.supportsCount && runtimeRow.countProperty) {
      payload.pipelines[runtimeRow.key][runtimeRow.countProperty] = runtimeRow.countValue;
    }
  });
  return payload;
};

const stringifyJsonDraft = (value) => {
  if (value === null || value === undefined || value === '') return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
};

const normalizeOutputRulesDraft = (value) => {
  if (Array.isArray(value)) {
    return value.join('\n');
  }
  return `${value || ''}`.trim();
};

const buildLlmConfigDraft = (config = {}) => ({
  promptMode: config.promptMode === 'contract' ? 'contract' : 'manual',
  promptTemplate: config.promptTemplate || '',
  promptCore: config.promptCore || '',
  responseSchemaText: stringifyJsonDraft(config.responseSchema || {}),
  fieldDocsText: stringifyJsonDraft(config.fieldDocs || {}),
  examplePayloadText: stringifyJsonDraft(config.examplePayload),
  outputRulesText: normalizeOutputRulesDraft(config.outputRules)
});

const parseJsonDraft = (label, value, { allowBlank = false, fallback = null } = {}) => {
  const raw = `${value || ''}`.trim();
  if (!raw) {
    if (allowBlank) return fallback;
    throw new Error(`${label} is required.`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
};

const normalizeFieldDocsForPreview = (fieldDocs) => {
  if (!fieldDocs || typeof fieldDocs !== 'object' || Array.isArray(fieldDocs)) return {};
  const normalized = {};
  Object.entries(fieldDocs).forEach(([key, value]) => {
    const fieldKey = `${key || ''}`.trim();
    if (!fieldKey) return;
    if (typeof value === 'string' && value.trim()) {
      normalized[fieldKey] = value.trim();
    }
  });
  return normalized;
};

const buildStructuredPromptPreview = ({
  promptMode,
  promptTemplate,
  promptCore,
  responseSchemaText,
  fieldDocsText,
  examplePayloadText,
  outputRulesText
}) => {
  if (promptMode !== 'contract') {
    return promptTemplate || '';
  }

  const schema = parseJsonDraft('Response schema', responseSchemaText, { fallback: {} });
  const fieldDocs = parseJsonDraft('Field docs', fieldDocsText, { allowBlank: true, fallback: {} });
  const examplePayload = parseJsonDraft('Example payload', examplePayloadText, { allowBlank: true, fallback: null });
  const outputRules = `${outputRulesText || ''}`
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const sections = [];
  if (`${promptCore || ''}`.trim()) {
    sections.push(`${promptCore}`.trim());
  }
  sections.push('Return JSON only.');
  sections.push(`Output must validate against this JSON Schema:\n${JSON.stringify(schema, null, 2)}`);
  const fieldDocEntries = Object.entries(normalizeFieldDocsForPreview(fieldDocs));
  if (fieldDocEntries.length) {
    sections.push(`Field guidance:\n${fieldDocEntries.map(([key, value]) => `- ${key}: ${value}`).join('\n')}`);
  }
  if (outputRules.length) {
    sections.push(`Additional output rules:\n${outputRules.map((rule) => `- ${rule}`).join('\n')}`);
  }
  if (examplePayload !== null) {
    sections.push(`Example valid JSON:\n${JSON.stringify(examplePayload, null, 2)}`);
  }
  return sections.join('\n\n').trim();
};

const getPromptSourceLabel = (promptMode) => (promptMode === 'contract' ? 'Generated from schema' : 'Direct prompt text');

const buildLlmConfigPayload = (draft = {}) => {
  const responseSchema = parseJsonDraft('Response schema', draft.responseSchemaText, { fallback: {} });
  const fieldDocs = parseJsonDraft('Field docs', draft.fieldDocsText, { allowBlank: true, fallback: {} });
  const examplePayload = parseJsonDraft('Example payload', draft.examplePayloadText, { allowBlank: true, fallback: null });
  return {
    promptMode: draft.promptMode === 'contract' ? 'contract' : 'manual',
    promptTemplate: `${draft.promptTemplate || ''}`.trim(),
    promptCore: `${draft.promptCore || ''}`.trim(),
    responseSchema,
    fieldDocs,
    examplePayload,
    outputRules: `${draft.outputRulesText || ''}`
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)
  };
};

const buildSyncedPromptTemplate = (draft = {}) => {
  if (draft.promptMode === 'contract') {
    return buildStructuredPromptPreview(draft);
  }
  return `${draft.promptTemplate || ''}`.trim();
};

const TypewriterAdminPage = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState(getInitialApiBaseUrl);
  const [adminKey, setAdminKey] = useState(getInitialAdminKey);
  const [settings, setSettings] = useState(buildEmptySettings);
  const [settingDefinitions, setSettingDefinitions] = useState(SETTING_PIPELINES);
  const [models, setModels] = useState(EMPTY_MODELS_PAYLOAD);
  const [prompts, setPrompts] = useState({ pipelines: {} });
  const [promptDefinitions, setPromptDefinitions] = useState(PROMPT_PIPELINES);
  const [promptDrafts, setPromptDrafts] = useState({});
  const [promptVersions, setPromptVersions] = useState({});
  const [llmRouteConfigs, setLlmRouteConfigs] = useState({});
  const [llmRouteConfigDrafts, setLlmRouteConfigDrafts] = useState({});
  const [llmRouteConfigVersions, setLlmRouteConfigVersions] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [savingLlmConfigs, setSavingLlmConfigs] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(getInitialStoredSessionId);
  const [currentPlayerCharacterName, setCurrentPlayerCharacterName] = useState(getInitialStoredPlayerName);
  const [sessionFragmentDraft, setSessionFragmentDraft] = useState(DEFAULT_SESSION_SEED_FRAGMENT);
  const [memorySpreadAdminEnabled, setMemorySpreadAdminEnabled] = useState(getInitialMemorySpreadAdminMode);
  const [activeSection, setActiveSection] = useState(getInitialAdminSection);
  const [selectedControlComponentKey, setSelectedControlComponentKey] = useState('all');
  const [isSessionToolsExpanded, setIsSessionToolsExpanded] = useState(false);
  const [isSessionInspectorExpanded, setIsSessionInspectorExpanded] = useState(false);
  const [isTypewriterAssetFlowExpanded, setIsTypewriterAssetFlowExpanded] = useState(false);
  const [sessionInspectorTargetId, setSessionInspectorTargetId] = useState(getInitialStoredSessionId);
  const [sessionInspector, setSessionInspector] = useState(null);
  const [sessionInspectorLoading, setSessionInspectorLoading] = useState(false);
  const [sessionInspectorError, setSessionInspectorError] = useState('');
  const [promptFilter, setPromptFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [selectedControlRoutesByComponent, setSelectedControlRoutesByComponent] = useState({
    typewriter: 'typewriter:story_continuation_route'
  });
  const [savingControlRouteId, setSavingControlRouteId] = useState('');
  const [savingControlComponentKey, setSavingControlComponentKey] = useState('');
  const [expandedPromptKey, setExpandedPromptKey] = useState('story_continuation');
  const [expandedContractKey, setExpandedContractKey] = useState('');
  const deferredPromptFilter = useDeferredValue(promptFilter);
  const deferredContractFilter = useDeferredValue(contractFilter);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TYPEWRITER_ADMIN_API_BASE_STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TYPEWRITER_ADMIN_KEY_STORAGE_KEY, adminKey);
  }, [adminKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentSessionId) {
      window.localStorage.setItem(TYPEWRITER_SESSION_STORAGE_KEY, currentSessionId);
      return;
    }
    window.localStorage.removeItem(TYPEWRITER_SESSION_STORAGE_KEY);
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSessionId) return;
    setSessionInspectorTargetId((prev) => prev || currentSessionId);
  }, [currentSessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentPlayerCharacterName) {
      window.localStorage.setItem(IMMERSIVE_RPG_PLAYER_NAME_STORAGE_KEY, currentPlayerCharacterName);
      return;
    }
    window.localStorage.removeItem(IMMERSIVE_RPG_PLAYER_NAME_STORAGE_KEY);
  }, [currentPlayerCharacterName]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      MEMORY_SPREAD_ADMIN_MODE_STORAGE_KEY,
      memorySpreadAdminEnabled ? 'true' : 'false'
    );
  }, [memorySpreadAdminEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORY_ADMIN_SECTION_STORAGE_KEY, activeSection);
  }, [activeSection]);

  const applyLoadedAdminData = useCallback((settingsPayload, modelsPayload, promptsPayload, llmRouteConfigsPayload) => {
    const nextSettingDefinitions = Array.isArray(settingsPayload?.pipelinesMeta) && settingsPayload.pipelinesMeta.length
      ? settingsPayload.pipelinesMeta
      : SETTING_PIPELINES;
    const nextPromptDefinitions = Array.isArray(promptsPayload?.pipelinesMeta) && promptsPayload.pipelinesMeta.length
      ? promptsPayload.pipelinesMeta
      : PROMPT_PIPELINES;
    setSettingDefinitions(nextSettingDefinitions);
    setPromptDefinitions(nextPromptDefinitions);
    setSettings(settingsPayload || buildEmptySettings(nextSettingDefinitions));
    setModels(modelsPayload || EMPTY_MODELS_PAYLOAD);
    setPrompts(promptsPayload || { pipelines: {} });
    setPromptDrafts((prev) => {
      const nextDrafts = { ...prev };
      nextPromptDefinitions.forEach((pipeline) => {
        nextDrafts[pipeline.key] = promptsPayload?.pipelines?.[pipeline.key]?.promptTemplate || prev[pipeline.key] || '';
      });
      return nextDrafts;
    });
    setLlmRouteConfigs(llmRouteConfigsPayload || {});
    setLlmRouteConfigDrafts((prev) => {
      const nextDrafts = { ...prev };
      Object.values(llmRouteConfigsPayload || {}).forEach((config) => {
        nextDrafts[config.routeKey] = buildLlmConfigDraft(config);
      });
      return nextDrafts;
    });
  }, []);

  const reloadAdminData = useCallback(async () => {
    const [settingsPayload, modelsPayload, promptsPayload, llmRouteConfigsPayload] = await Promise.all([
      loadTypewriterAiSettings(apiBaseUrl, { adminKey }),
      loadOpenAiModels(apiBaseUrl, { adminKey }),
      loadTypewriterPrompts(apiBaseUrl, { adminKey }),
      loadLlmRouteConfigs(apiBaseUrl, { adminKey })
    ]);
    applyLoadedAdminData(settingsPayload, modelsPayload, promptsPayload, llmRouteConfigsPayload);
    return {
      settingsPayload,
      modelsPayload,
      promptsPayload,
      llmRouteConfigsPayload
    };
  }, [adminKey, apiBaseUrl, applyLoadedAdminData]);

  const loadSessionInspector = useCallback(
    async (requestedSessionId = sessionInspectorTargetId, { silentStatus = false } = {}) => {
      const normalizedSessionId = typeof requestedSessionId === 'string' ? requestedSessionId.trim() : '';
      if (!normalizedSessionId) {
        setSessionInspector(null);
        setSessionInspectorError('Enter a session id to inspect.');
        return null;
      }

      setSessionInspectorLoading(true);
      setSessionInspectorError('');

      try {
        const payload = await inspectTypewriterSession(apiBaseUrl, {
          sessionId: normalizedSessionId,
          adminKey
        });
        setSessionInspector(payload || null);
        setSessionInspectorTargetId(normalizedSessionId);
        if (!silentStatus) {
          setStatus(`Loaded session inspector for ${normalizedSessionId}.`);
        }
        return payload || null;
      } catch (err) {
        setSessionInspector(null);
        setSessionInspectorError(err.message || 'Unable to inspect the requested session.');
        return null;
      } finally {
        setSessionInspectorLoading(false);
      }
    },
    [adminKey, apiBaseUrl, sessionInspectorTargetId]
  );

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError('');
      setStatus('');
      try {
        const payload = await Promise.all([
          loadTypewriterAiSettings(apiBaseUrl, { adminKey }),
          loadOpenAiModels(apiBaseUrl, { adminKey }),
          loadTypewriterPrompts(apiBaseUrl, { adminKey }),
          loadLlmRouteConfigs(apiBaseUrl, { adminKey })
        ]);
        if (!active) return;
        applyLoadedAdminData(...payload);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load admin settings.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, adminKey, applyLoadedAdminData]);

  const pipelineRows = useMemo(() => {
    return settingDefinitions.map((pipeline) => {
      const current = settings?.pipelines?.[pipeline.key] || {};
      const supportedProviders = Array.isArray(pipeline.supportedProviders) && pipeline.supportedProviders.length
        ? pipeline.supportedProviders
        : ['openai'];
      const provider = typeof current.provider === 'string' && supportedProviders.includes(current.provider)
        ? current.provider
        : pipeline.defaultProvider || supportedProviders[0];
      return {
        ...pipeline,
        useMock: Boolean(current.useMock),
        model: typeof current.model === 'string' ? current.model : '',
        modelKind: current.modelKind || pipeline.modelKind,
        provider,
        supportedProviders,
        countValue: pipeline.supportsCount && pipeline.countProperty
          ? Number.isFinite(Number(current[pipeline.countProperty]))
            ? Number(current[pipeline.countProperty])
            : pipeline.defaultCount
          : undefined
      };
    });
  }, [settingDefinitions, settings]);

  const llmRouteRows = useMemo(() => {
    return Object.values(llmRouteConfigs || {}).sort((left, right) =>
      `${left?.routeKey || ''}`.localeCompare(`${right?.routeKey || ''}`)
    );
  }, [llmRouteConfigs]);

  const pipelineRowMap = useMemo(
    () => Object.fromEntries(pipelineRows.map((row) => [row.key, row])),
    [pipelineRows]
  );

  const promptDefinitionMap = useMemo(
    () => Object.fromEntries(promptDefinitions.map((definition) => [definition.key, definition])),
    [promptDefinitions]
  );

  const promptMap = useMemo(() => prompts?.pipelines || {}, [prompts]);

  const visiblePromptDefinitions = useMemo(() => {
    const needle = `${deferredPromptFilter || ''}`.trim().toLowerCase();
    if (!needle) return promptDefinitions;
    return promptDefinitions.filter((pipeline) =>
      `${pipeline.label} ${pipeline.key} ${pipeline.description}`.toLowerCase().includes(needle)
    );
  }, [deferredPromptFilter, promptDefinitions]);

  const visibleLlmRouteRows = useMemo(() => {
    const needle = `${deferredContractFilter || ''}`.trim().toLowerCase();
    if (!needle) return llmRouteRows;
    return llmRouteRows.filter((config) =>
      `${config.routeKey} ${config.routePath} ${config.description}`.toLowerCase().includes(needle)
    );
  }, [deferredContractFilter, llmRouteRows]);

  const controlComponents = useMemo(() => {
    const mappedContractKeys = new Set();

    STORY_ADMIN_CONTROL_COMPONENTS.forEach((component) => {
      (component.routes || []).forEach((route) => {
        (route.contractBindings || []).forEach((binding) => {
          mappedContractKeys.add(binding.routeKey);
        });
      });
    });

    const registryComponents = STORY_ADMIN_CONTROL_COMPONENTS.map((component) => {
      const routes = (component.routes || [])
        .map((route) => {
          const runtimeRows = (route.runtimeKeys || [])
            .map((runtimeKey) => pipelineRowMap[runtimeKey])
            .filter(Boolean);
          const directPromptEntries = (route.directPromptKeys || [])
            .map((promptKey) => {
              const definition = promptDefinitionMap[promptKey];
              if (!definition) return null;
              return {
                ...definition,
                latestPrompt: promptMap[promptKey] || null,
                draft: promptDrafts[promptKey] || promptMap[promptKey]?.promptTemplate || ''
              };
            })
            .filter(Boolean);
          const contractEntries = (route.contractBindings || [])
            .map((binding) => {
              const config = llmRouteConfigs?.[binding.routeKey];
              return {
                ...binding,
                config: config || null,
                draft: llmRouteConfigDrafts?.[binding.routeKey] || buildLlmConfigDraft(config || {}),
                routePath: config?.routePath || route.path,
                method: config?.method || route.method,
                description: config?.description || route.summary
              };
            })
            .filter((binding) => binding.config || binding.promptKey);
          return {
            ...route,
            componentKey: component.key,
            componentLabel: component.label,
            routeId: `${component.key}:${route.key}`,
            runtimeRows,
            directPromptEntries,
            contractEntries
          };
        })
        .filter(Boolean);
      if (!routes.length && !component.customPanelKey) return null;
      return {
        ...component,
        routes
      };
    }).filter(Boolean);

    const unmappedContracts = llmRouteRows
      .filter((config) => !mappedContractKeys.has(config.routeKey))
      .map((config) => {
        return {
          key: `${config.routeKey}_route`,
          label: config.routeKey,
          method: config.method,
          path: config.routePath,
          summary: config.description || 'Structured JSON route.',
          componentKey: 'unmapped',
          componentLabel: 'Other Structured Routes',
          routeId: `unmapped:${config.routeKey}`,
          runtimeRows: [],
          directPromptEntries: [],
          contractEntries: [
            {
              routeKey: config.routeKey,
              promptKey: '',
              label: 'Schema-backed route',
              config,
              draft: llmRouteConfigDrafts?.[config.routeKey] || buildLlmConfigDraft(config),
              routePath: config.routePath,
              method: config.method,
              description: config.description
            }
          ]
        };
      })
      .filter(Boolean);

    if (unmappedContracts.length) {
      registryComponents.push({
        key: 'unmapped',
        label: 'Other Structured Routes',
        description: 'Schema-backed routes not yet mapped to a named component card.',
        routes: unmappedContracts
      });
    }

    return registryComponents;
  }, [
    llmRouteConfigDrafts,
    llmRouteConfigs,
    llmRouteRows,
    pipelineRowMap,
    promptDefinitionMap,
    promptDrafts,
    promptMap
  ]);

  const controlComponentOptions = useMemo(() => {
    const options = [{ key: 'all', label: 'All Components' }];
    controlComponents.forEach((component) => {
      options.push({
        key: component.key,
        label: component.label
      });
    });
    return options;
  }, [controlComponents]);

  const visibleControlComponents = useMemo(() => {
    if (selectedControlComponentKey === 'all') {
      return controlComponents;
    }
    return controlComponents.filter((component) => component.key === selectedControlComponentKey);
  }, [controlComponents, selectedControlComponentKey]);

  const visibleControlRouteIds = useMemo(
    () => visibleControlComponents.flatMap((component) => component.routes.map((route) => route.routeId)),
    [visibleControlComponents]
  );

  const visibleControlCustomEditorCount = useMemo(
    () => visibleControlComponents.filter((component) => component.customPanelKey).length,
    [visibleControlComponents]
  );

  const controlRuntimeUsageMap = useMemo(() => {
    const usageMap = {};
    controlComponents.forEach((component) => {
      component.routes.forEach((route) => {
        route.runtimeRows.forEach((runtimeRow) => {
          if (!usageMap[runtimeRow.key]) {
            usageMap[runtimeRow.key] = [];
          }
          usageMap[runtimeRow.key].push({
            componentKey: component.key,
            componentLabel: component.label,
            routeId: route.routeId,
            routeLabel: route.label
          });
        });
      });
    });
    return usageMap;
  }, [controlComponents]);

  useEffect(() => {
    if (!visiblePromptDefinitions.length) return;
    if (!visiblePromptDefinitions.some((pipeline) => pipeline.key === expandedPromptKey)) {
      setExpandedPromptKey(visiblePromptDefinitions[0].key);
    }
  }, [expandedPromptKey, visiblePromptDefinitions]);

  useEffect(() => {
    if (!visibleLlmRouteRows.length) return;
    if (!visibleLlmRouteRows.some((config) => config.routeKey === expandedContractKey)) {
      setExpandedContractKey(visibleLlmRouteRows[0].routeKey);
    }
  }, [expandedContractKey, visibleLlmRouteRows]);

  useEffect(() => {
    if (!controlComponents.length) return;
    setSelectedControlRoutesByComponent((prev) => {
      let changed = false;
      const next = { ...prev };

      controlComponents.forEach((component) => {
        const routeIds = component.routes.map((route) => route.routeId);
        if (!routeIds.length) return;
        if (!routeIds.includes(next[component.key])) {
          next[component.key] = routeIds[0];
          changed = true;
        }
      });

      Object.keys(next).forEach((componentKey) => {
        if (!controlComponents.some((component) => component.key === componentKey)) {
          delete next[componentKey];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [controlComponents]);

  useEffect(() => {
    if (selectedControlComponentKey === 'all') return;
    if (!controlComponents.some((component) => component.key === selectedControlComponentKey)) {
      setSelectedControlComponentKey('all');
    }
  }, [controlComponents, selectedControlComponentKey]);

  const getModelOptions = (modelKind, currentModel, provider = 'openai') => {
    const normalizedProvider = provider === 'anthropic' ? 'anthropic' : 'openai';
    const providerPayload = models?.providers?.[normalizedProvider];
    let sourceModels = [];
    if (modelKind === 'image') {
      sourceModels = Array.isArray(providerPayload?.imageModels)
        ? providerPayload.imageModels
        : normalizedProvider === 'openai'
          ? models.imageModels
          : [];
    } else {
      sourceModels = Array.isArray(providerPayload?.textModels)
        ? providerPayload.textModels
        : normalizedProvider === 'openai'
          ? models.textModels
          : [];
    }
    const modelIds = (Array.isArray(sourceModels) ? sourceModels : [])
      .map((entry) => (typeof entry?.id === 'string' ? entry.id.trim() : ''))
      .filter(Boolean);
    if (normalizedProvider === 'anthropic') {
      modelIds.unshift(...FALLBACK_ANTHROPIC_TEXT_MODELS);
    }
    if (currentModel && !modelIds.includes(currentModel)) {
      modelIds.unshift(currentModel);
    }
    return Array.from(new Set(modelIds));
  };

  const updatePipeline = (pipelineKey, patch) => {
    setSettings((prev) => {
      const current = prev?.pipelines?.[pipelineKey] || {};
      return {
        ...(prev || {}),
        pipelines: {
          ...(prev?.pipelines || {}),
          [pipelineKey]: {
            ...current,
            ...patch
          }
        }
      };
    });
  };

  const updatePromptDraft = (pipelineKey, value) => {
    setPromptDrafts((prev) => ({
      ...prev,
      [pipelineKey]: value
    }));
  };

  const updateLlmRouteConfigDraft = (routeKey, patch) => {
    setLlmRouteConfigDrafts((prev) => ({
      ...prev,
      [routeKey]: {
        ...(prev?.[routeKey] || {}),
        ...patch
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        pipelines: {}
      };
      for (const row of pipelineRows) {
        payload.pipelines[row.key] = {
          useMock: Boolean(row.useMock),
          model: row.model,
          provider: row.provider || 'openai'
        };
        if (row.supportsCount && row.countProperty) {
          payload.pipelines[row.key][row.countProperty] = row.countValue;
        }
      }
      const response = await saveTypewriterAiSettings(apiBaseUrl, payload, {
        adminKey,
        updatedBy: 'story-admin-ui'
      });
      setSettingDefinitions(
        Array.isArray(response?.pipelinesMeta) && response.pipelinesMeta.length
          ? response.pipelinesMeta
          : settingDefinitions
      );
      setSettings(response || buildEmptySettings(settingDefinitions));
      setStatus('Saved runtime AI settings.');
    } catch (err) {
      setError(err.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const response = await resetTypewriterAiSettings(apiBaseUrl, {
        adminKey,
        updatedBy: 'story-admin-ui'
      });
      setSettingDefinitions(
        Array.isArray(response?.pipelinesMeta) && response.pipelinesMeta.length
          ? response.pipelinesMeta
          : settingDefinitions
      );
      setSettings(response || buildEmptySettings(settingDefinitions));
      setStatus('Reset settings to defaults.');
    } catch (err) {
      setError(err.message || 'Unable to reset settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshModels = async () => {
    setRefreshingModels(true);
    setError('');
    setStatus('');
    try {
      const payload = await loadOpenAiModels(apiBaseUrl, { adminKey, forceRefresh: true });
      setModels(payload || EMPTY_MODELS_PAYLOAD);
      setStatus('Refreshed model list.');
    } catch (err) {
      setError(err.message || 'Unable to refresh model list.');
    } finally {
      setRefreshingModels(false);
    }
  };

  const handleSavePrompt = async (pipelineKey) => {
    setSavingPrompts(true);
    setError('');
    setStatus('');
    try {
      const promptTemplate = promptDrafts[pipelineKey] || '';
      await saveTypewriterPrompt(apiBaseUrl, pipelineKey, promptTemplate, {
        adminKey,
        updatedBy: 'story-admin-ui',
        markLatest: true
      });
      const [latestPrompts, versionsPayload] = await Promise.all([
        loadTypewriterPrompts(apiBaseUrl, { adminKey }),
        loadTypewriterPromptVersions(apiBaseUrl, pipelineKey, { adminKey, limit: 10 })
      ]);
      setPromptDefinitions(
        Array.isArray(latestPrompts?.pipelinesMeta) && latestPrompts.pipelinesMeta.length
          ? latestPrompts.pipelinesMeta
          : promptDefinitions
      );
      setPrompts(latestPrompts || { pipelines: {} });
      setPromptVersions((prev) => ({
        ...prev,
        [pipelineKey]: Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : []
      }));
      setStatus(`Saved prompt for ${pipelineKey} as latest.`);
    } catch (err) {
      setError(err.message || 'Unable to save prompt.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleSeedCurrentPrompts = async () => {
    setSavingPrompts(true);
    setError('');
    setStatus('');
    try {
      await seedCurrentTypewriterPrompts(apiBaseUrl, {
        adminKey,
        updatedBy: 'story-admin-ui',
        overwrite: false
      });
      const latestPrompts = await loadTypewriterPrompts(apiBaseUrl, { adminKey });
      setPromptDefinitions(
        Array.isArray(latestPrompts?.pipelinesMeta) && latestPrompts.pipelinesMeta.length
          ? latestPrompts.pipelinesMeta
          : promptDefinitions
      );
      setPrompts(latestPrompts || { pipelines: {} });
      setPromptDrafts((prev) => {
        const nextDrafts = { ...prev };
        promptDefinitions.forEach((pipeline) => {
          nextDrafts[pipeline.key] = latestPrompts?.pipelines?.[pipeline.key]?.promptTemplate || prev[pipeline.key] || '';
        });
        return nextDrafts;
      });
      setStatus('Seeded missing prompt templates from current backend code.');
    } catch (err) {
      setError(err.message || 'Unable to seed prompt templates.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleLoadPromptVersions = async (pipelineKey) => {
    setSavingPrompts(true);
    setError('');
    try {
      const versionsPayload = await loadTypewriterPromptVersions(apiBaseUrl, pipelineKey, { adminKey, limit: 10 });
      setPromptVersions((prev) => ({
        ...prev,
        [pipelineKey]: Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : []
      }));
    } catch (err) {
      setError(err.message || 'Unable to load prompt versions.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleUsePromptVersion = async (pipelineKey, versionId) => {
    setSavingPrompts(true);
    setError('');
    setStatus('');
    try {
      await setLatestTypewriterPromptVersion(apiBaseUrl, pipelineKey, {
        adminKey,
        id: versionId
      });
      const latestPrompts = await loadTypewriterPrompts(apiBaseUrl, { adminKey });
      setPromptDefinitions(
        Array.isArray(latestPrompts?.pipelinesMeta) && latestPrompts.pipelinesMeta.length
          ? latestPrompts.pipelinesMeta
          : promptDefinitions
      );
      setPrompts(latestPrompts || { pipelines: {} });
      setPromptDrafts((prev) => ({
        ...prev,
        [pipelineKey]: latestPrompts?.pipelines?.[pipelineKey]?.promptTemplate || prev[pipelineKey] || ''
      }));
      setStatus(`Set selected prompt version as latest for ${pipelineKey}.`);
    } catch (err) {
      setError(err.message || 'Unable to set latest prompt version.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleSaveLlmRouteConfig = async (routeKey) => {
    const draft = llmRouteConfigDrafts?.[routeKey];
    if (!draft) {
      setError(`No draft found for ${routeKey}.`);
      setStatus('');
      return;
    }

    setSavingLlmConfigs(true);
    setError('');
    setStatus('');

    try {
      const payload = buildLlmConfigPayload(draft);

      await saveLlmRouteConfigVersion(apiBaseUrl, routeKey, payload, {
        adminKey,
        updatedBy: 'story-admin-ui',
        markLatest: true
      });

      const [latestConfigs, versionsPayload] = await Promise.all([
        loadLlmRouteConfigs(apiBaseUrl, { adminKey }),
        loadLlmRouteConfigVersions(apiBaseUrl, routeKey, { adminKey, limit: 10 })
      ]);

      setLlmRouteConfigs(latestConfigs || {});
      setLlmRouteConfigDrafts((prev) => ({
        ...prev,
        [routeKey]: buildLlmConfigDraft(latestConfigs?.[routeKey] || {})
      }));
      setLlmRouteConfigVersions((prev) => ({
        ...prev,
        [routeKey]: Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : []
      }));
      setStatus(`Saved schema-backed prompt settings for ${routeKey}.`);
    } catch (err) {
      setError(err.message || 'Unable to save route config.');
    } finally {
      setSavingLlmConfigs(false);
    }
  };

  const handleLoadLlmRouteConfigVersions = async (routeKey) => {
    setSavingLlmConfigs(true);
    setError('');
    try {
      const versionsPayload = await loadLlmRouteConfigVersions(apiBaseUrl, routeKey, { adminKey, limit: 10 });
      setLlmRouteConfigVersions((prev) => ({
        ...prev,
        [routeKey]: Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : []
      }));
    } catch (err) {
      setError(err.message || 'Unable to load route config versions.');
    } finally {
      setSavingLlmConfigs(false);
    }
  };

  const handleUseLlmRouteConfigVersion = async (routeKey, versionId) => {
    setSavingLlmConfigs(true);
    setError('');
    setStatus('');
    try {
      await setLatestLlmRouteConfigVersion(apiBaseUrl, routeKey, {
        adminKey,
        id: versionId
      });
      const [latestConfigs, versionsPayload] = await Promise.all([
        loadLlmRouteConfigs(apiBaseUrl, { adminKey }),
        loadLlmRouteConfigVersions(apiBaseUrl, routeKey, { adminKey, limit: 10 })
      ]);
      setLlmRouteConfigs(latestConfigs || {});
      setLlmRouteConfigDrafts((prev) => ({
        ...prev,
        [routeKey]: buildLlmConfigDraft(latestConfigs?.[routeKey] || {})
      }));
      setLlmRouteConfigVersions((prev) => ({
        ...prev,
        [routeKey]: Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : []
      }));
      setStatus(`Set selected schema version as latest for ${routeKey}.`);
    } catch (err) {
      setError(err.message || 'Unable to set latest route config version.');
    } finally {
      setSavingLlmConfigs(false);
    }
  };

  const handleResetLlmRouteConfig = async (routeKey) => {
    setSavingLlmConfigs(true);
    setError('');
    setStatus('');
    try {
      await resetLlmRouteConfig(apiBaseUrl, routeKey, {
        adminKey,
        updatedBy: 'story-admin-ui'
      });
      const latestConfigs = await loadLlmRouteConfigs(apiBaseUrl, { adminKey });
      setLlmRouteConfigs(latestConfigs || {});
      setLlmRouteConfigDrafts((prev) => ({
        ...prev,
        [routeKey]: buildLlmConfigDraft(latestConfigs?.[routeKey] || {})
      }));
      setStatus(`Reset ${routeKey} to default schema-backed settings.`);
    } catch (err) {
      setError(err.message || 'Unable to reset route config.');
    } finally {
      setSavingLlmConfigs(false);
    }
  };

  const handleSaveControlRoute = async (route) => {
    if (!route) return;
    setSavingControlRouteId(route.routeId);
    setError('');
    setStatus('');

    try {
      if (Array.isArray(route.runtimeRows) && route.runtimeRows.length) {
        const runtimePayload = buildRuntimeSettingsPayload(route.runtimeRows);
        await saveTypewriterAiSettings(apiBaseUrl, runtimePayload, {
          adminKey,
          updatedBy: 'story-admin-control-center'
        });
      }

      for (const binding of route.contractEntries || []) {
        const draft = llmRouteConfigDrafts?.[binding.routeKey];
        if (!draft) continue;
        const payload = buildLlmConfigPayload(draft);
        await saveLlmRouteConfigVersion(apiBaseUrl, binding.routeKey, payload, {
          adminKey,
          updatedBy: 'story-admin-control-center',
          markLatest: true
        });
        if (binding.promptKey) {
          const syncedPrompt = buildSyncedPromptTemplate(draft);
          await saveTypewriterPrompt(apiBaseUrl, binding.promptKey, syncedPrompt, {
            adminKey,
            updatedBy: 'story-admin-control-center',
            markLatest: true,
            meta: {
              source: 'llm-route-config-sync',
              routeKey: binding.routeKey,
              promptMode: draft.promptMode === 'contract' ? 'contract' : 'manual',
              syncedFromControlCenter: true
            }
          });
        }
      }

      for (const promptEntry of route.directPromptEntries || []) {
        await saveTypewriterPrompt(apiBaseUrl, promptEntry.key, promptDrafts[promptEntry.key] || '', {
          adminKey,
          updatedBy: 'story-admin-control-center',
          markLatest: true
        });
      }

      await reloadAdminData();
      setStatus(`Saved ${route.label} runtime, prompt, and schema settings.`);
    } catch (err) {
      setError(err.message || `Unable to save ${route.label}.`);
    } finally {
      setSavingControlRouteId('');
    }
  };

  const handleSaveControlComponentRuntime = async (component) => {
    if (!component) return;
    const componentRuntimeRows = collectUniqueRuntimeRows(component.routes);
    if (!componentRuntimeRows.length) {
      setError('');
      setStatus(`No quick runtime settings are mapped for ${component.label}.`);
      return;
    }

    setSavingControlComponentKey(component.key);
    setError('');
    setStatus('');

    try {
      const runtimePayload = buildRuntimeSettingsPayload(componentRuntimeRows);
      await saveTypewriterAiSettings(apiBaseUrl, runtimePayload, {
        adminKey,
        updatedBy: 'story-admin-control-overview'
      });
      await reloadAdminData();
      setStatus(`Saved quick runtime settings for ${component.label}.`);
    } catch (err) {
      setError(err.message || `Unable to save quick runtime settings for ${component.label}.`);
    } finally {
      setSavingControlComponentKey('');
    }
  };

  const handleGenerateSession = async () => {
    setSessionSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = await startOrSeedTypewriterSession(apiBaseUrl);
      const nextSessionId = typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : '';
      if (!nextSessionId) {
        throw new Error('Session creation did not return a sessionId.');
      }
      setCurrentSessionId(nextSessionId);
      setSessionInspectorTargetId(nextSessionId);
      await loadSessionInspector(nextSessionId, { silentStatus: true });
      setStatus(`Generated session ${nextSessionId}.`);
    } catch (err) {
      setError(err.message || 'Unable to generate session.');
    } finally {
      setSessionSaving(false);
    }
  };

  const handleGenerateSessionWithFragment = async () => {
    const fragment = `${sessionFragmentDraft || ''}`.trim();
    if (!fragment) {
      setError('Enter a fragment before generating a seeded session.');
      setStatus('');
      return;
    }
    setSessionSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = await startOrSeedTypewriterSession(apiBaseUrl, {
        fragment,
        setInitialFragment: true
      });
      const nextSessionId = typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : '';
      if (!nextSessionId) {
        throw new Error('Session creation did not return a sessionId.');
      }
      setCurrentSessionId(nextSessionId);
      setSessionInspectorTargetId(nextSessionId);
      await loadSessionInspector(nextSessionId, { silentStatus: true });
      setStatus(`Generated session ${nextSessionId} and saved the fragment to Mongo.`);
    } catch (err) {
      setError(err.message || 'Unable to generate seeded session.');
    } finally {
      setSessionSaving(false);
    }
  };

  const handleSaveFragmentToCurrentSession = async () => {
    const fragment = `${sessionFragmentDraft || ''}`.trim();
    if (!currentSessionId) {
      setError('No stored session is available.');
      setStatus('');
      return;
    }
    if (!fragment) {
      setError('Enter a fragment before saving it to the current session.');
      setStatus('');
      return;
    }
    setSessionSaving(true);
    setError('');
    setStatus('');
    try {
      await startOrSeedTypewriterSession(apiBaseUrl, {
        sessionId: currentSessionId,
        fragment,
        setInitialFragment: true
      });
      await loadSessionInspector(currentSessionId, { silentStatus: true });
      setStatus(`Saved fragment into session ${currentSessionId}.`);
    } catch (err) {
      setError(err.message || 'Unable to save fragment to the current session.');
    } finally {
      setSessionSaving(false);
    }
  };

  const handleClearStoredSession = () => {
    setCurrentSessionId('');
    setSessionInspectorTargetId('');
    setSessionInspector(null);
    setSessionInspectorError('');
    setStatus('Cleared the stored session. Typewriter will create a fresh session on next use.');
    setError('');
  };

  const sessionModeToggle = (
    <label className="typewriterAdminModeToggle">
      <input
        type="checkbox"
        checked={memorySpreadAdminEnabled}
        onChange={(event) => setMemorySpreadAdminEnabled(event.target.checked)}
      />
      <span>Enable Memory Spread admin tools</span>
    </label>
  );

  const sessionToolsGrid = (
    <div className="typewriterAdminSessionGrid">
      <label>
        Current stored session
        <input type="text" value={currentSessionId} readOnly placeholder="No session stored" />
      </label>
      <label>
        Player character name
        <input
          type="text"
          value={currentPlayerCharacterName}
          onChange={(event) => setCurrentPlayerCharacterName(event.target.value)}
          placeholder="Optional shared PC name"
        />
      </label>
      <label>
        Session inspector target
        <input
          type="text"
          value={sessionInspectorTargetId}
          onChange={(event) => setSessionInspectorTargetId(event.target.value)}
          placeholder="Session id to inspect"
        />
      </label>
      <label className="typewriterAdminSessionFragment">
        Session fragment seed
        <textarea
          value={sessionFragmentDraft}
          onChange={(event) => setSessionFragmentDraft(event.target.value)}
          rows={5}
          placeholder="Optional fragment text to save into the selected or newly generated session."
        />
      </label>
      <div className="typewriterAdminButtons">
        <button type="button" onClick={handleGenerateSession} disabled={sessionSaving}>
          {sessionSaving ? 'Working...' : 'Generate session'}
        </button>
        <button type="button" onClick={handleGenerateSessionWithFragment} disabled={sessionSaving}>
          {sessionSaving ? 'Working...' : 'Generate session + fragment'}
        </button>
        <button
          type="button"
          onClick={handleSaveFragmentToCurrentSession}
          disabled={sessionSaving || !currentSessionId}
        >
          {sessionSaving ? 'Working...' : 'Save fragment to current session'}
        </button>
        <button
          type="button"
          onClick={() => {
            void loadSessionInspector();
          }}
          disabled={sessionSaving || sessionInspectorLoading || !sessionInspectorTargetId.trim()}
        >
          {sessionInspectorLoading ? 'Inspecting...' : 'Inspect session'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!currentSessionId) return;
            setSessionInspectorTargetId(currentSessionId);
            void loadSessionInspector(currentSessionId);
          }}
          disabled={sessionSaving || sessionInspectorLoading || !currentSessionId}
        >
          Inspect stored session
        </button>
        <button type="button" onClick={handleClearStoredSession} disabled={sessionSaving}>
          Clear stored session
        </button>
      </div>
    </div>
  );

  const sessionToolsSection = (
    <section className="typewriterAdminSessionTools">
      <div className="typewriterAdminSessionHeader">
        <div>
          <h2>Session Bootstrap</h2>
          <p>Generate a session and optionally seed a fragment into Mongo. Clear the stored session to let the typewriter start fresh.</p>
        </div>
        {sessionModeToggle}
      </div>
      {sessionToolsGrid}
    </section>
  );

  const sessionInspectorContent = (
    <>
      <p className="typewriterPromptMeta">
        <strong>NarrativeEntity</strong> is the internal world truth. <strong>TypewriterKey</strong> is the live keyboard object plus the
        player-facing disclosure layer, including hidden or revealed tooltip state.
      </p>

      {sessionInspectorError ? <p className="typewriterAdminError">{sessionInspectorError}</p> : null}
      {sessionInspectorLoading ? <p className="typewriterAdminLoading">Inspecting session state...</p> : null}

      {sessionInspector ? (
        <>
          <div className="typewriterControlMetaRow">
            <span className="typewriterControlChip">Session: {sessionInspector.sessionId}</span>
            <span className="typewriterControlChip">Words: {sessionInspector.narrativeWordCount || 0}</span>
            <span className="typewriterControlChip">Storytellers: {sessionInspector.counts?.storytellerCount || 0}</span>
            <span className="typewriterControlChip">Slots filled: {sessionInspector.counts?.slotFilledCount || 0}</span>
            <span className="typewriterControlChip">Textual keys: {sessionInspector.counts?.typewriterKeyCount || 0}</span>
            <span className="typewriterControlChip">Entities: {sessionInspector.counts?.entityCount || 0}</span>
          </div>

          <div className="typewriterAdminInspectorGrid">
            <article className="typewriterAdminInspectorPanel typewriterAdminInspectorPanelWide">
              <header className="typewriterAdminInspectorPanelHeader">
                <div>
                  <h3>Narrative Snapshot</h3>
                  <p>The current fragment and the initial seeded fragment for this session.</p>
                </div>
              </header>
              <div className="typewriterAdminInspectorMeta">
                <span><strong>Session</strong> {formatInspectorValue(sessionInspector.sessionId)}</span>
                <span><strong>Initial fragment</strong> {sessionInspector.initialFragment ? 'Present' : 'Missing'}</span>
              </div>
              <div className="typewriterAdminInspectorTextBlock">
                <strong>Current fragment</strong>
                <pre className="typewriterAdminInspectorText">{formatInspectorValue(sessionInspector.fragment, 'No fragment saved yet.')}</pre>
              </div>
              <div className="typewriterAdminInspectorTextBlock">
                <strong>Initial fragment</strong>
                <pre className="typewriterAdminInspectorText">{formatInspectorValue(sessionInspector.initialFragment, 'No initial fragment saved.')}</pre>
              </div>
            </article>

            <article className="typewriterAdminInspectorPanel">
              <header className="typewriterAdminInspectorPanelHeader">
                <div>
                  <h3>Storyteller Slots</h3>
                  <p>Blank or filled storyteller image keys mapped onto the typewriter.</p>
                </div>
              </header>
              <div className="typewriterAdminInspectorList">
                {(sessionInspector.slots || []).map((slot) => (
                  <article key={slot.slotKey || slot.slotIndex} className="typewriterAdminInspectorItem">
                    <div className="typewriterAdminInspectorItemHeader">
                      <div>
                        <strong>{formatInspectorValue(slot.storytellerName, slot.slotKey || `Slot ${slot.slotIndex}`)}</strong>
                        <small>{slot.filled ? 'Filled storyteller slot' : 'Blank storyteller slot'}</small>
                      </div>
                      {slot.keyImageUrl || slot.blankTextureUrl ? (
                        <img
                          className="typewriterAdminInspectorThumb"
                          src={slot.keyImageUrl || slot.blankTextureUrl}
                          alt={`${slot.slotKey || 'storyteller slot'} preview`}
                        />
                      ) : null}
                    </div>
                    <div className="typewriterControlMetaRow">
                      <span className="typewriterControlChip">Slot index: {slot.slotIndex}</span>
                      <span className="typewriterControlChip">Shape: {formatInspectorValue(slot.keyShape)}</span>
                      <span className="typewriterControlChip">State: {slot.filled ? 'filled' : 'blank'}</span>
                    </div>
                    <p className="typewriterAdminInspectorMetaLine"><strong>Symbol</strong> {formatInspectorValue(slot.symbol, 'No symbol yet')}</p>
                    <p className="typewriterAdminInspectorMetaLine"><strong>Description</strong> {formatInspectorValue(slot.description, 'No storyteller bound yet')}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="typewriterAdminInspectorPanel typewriterAdminInspectorPanelWide">
              <header className="typewriterAdminInspectorPanelHeader">
                <div>
                  <h3>Textual Typewriter Keys</h3>
                  <p>These are the real pressable keys. The tooltip line shows what the player knows, while description stays as internal truth.</p>
                </div>
              </header>
              {(sessionInspector.typewriterKeys || []).length ? (
                <div className="typewriterAdminInspectorList">
                  {sessionInspector.typewriterKeys.map((key) => (
                    <article key={key.id || key.keyText} className="typewriterAdminInspectorItem">
                      <div className="typewriterAdminInspectorItemHeader">
                        <div>
                          <strong>{formatInspectorValue(key.keyText, 'Untitled key')}</strong>
                          <small>{formatInspectorValue(key.sourceType, 'unknown source')} {key.entityName ? `• ${key.entityName}` : ''}</small>
                        </div>
                        {key.keyImageUrl ? (
                          <img
                            className="typewriterAdminInspectorThumb"
                            src={key.keyImageUrl}
                            alt={`${key.keyText || 'typewriter key'} preview`}
                          />
                        ) : null}
                      </div>
                      <div className="typewriterControlMetaRow">
                        <span className="typewriterControlChip">Knowledge: {formatInspectorValue(key.knowledgeState, 'unknown')}</span>
                        <span className="typewriterControlChip">Pressed: {Number.isFinite(Number(key.timesPressed)) ? Number(key.timesPressed) : 0}</span>
                        <span className="typewriterControlChip">Verification: {formatInspectorValue(key.verificationKind, 'none')}</span>
                      </div>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Insert text</strong> {formatInspectorValue(key.insertText, 'No insert text')}</p>
                      <p className="typewriterAdminInspectorMetaLine">
                        <strong>Player-facing tooltip</strong> {key.playerFacingTooltip ? key.playerFacingTooltip : 'Hidden until discovered.'}
                      </p>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Internal description</strong> {formatInspectorValue(key.description, 'No internal description')}</p>
                      <p className="typewriterAdminInspectorMetaLine">
                        <strong>Entity link</strong> {key.entityId ? `${formatInspectorValue(key.entityName, 'Unnamed entity')} (${key.entityId})` : 'No linked entity'}
                      </p>
                      <p className="typewriterAdminInspectorMetaLine">
                        <strong>Storyteller provenance</strong> {key.storytellerName ? `${key.storytellerName} (${key.storytellerId || 'no id'})` : 'Not storyteller-created'}
                      </p>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Last pressed</strong> {formatDate(key.lastPressedAt)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="typewriterPromptMeta">No textual keys are active in this session yet.</p>
              )}
            </article>

            <article className="typewriterAdminInspectorPanel">
              <header className="typewriterAdminInspectorPanelHeader">
                <div>
                  <h3>Entities</h3>
                  <p>Canonical world objects currently surfaced into the typewriter.</p>
                </div>
              </header>
              {(sessionInspector.entities || []).length ? (
                <div className="typewriterAdminInspectorList">
                  {sessionInspector.entities.map((entity) => (
                    <article key={entity.id || entity.externalId || entity.name} className="typewriterAdminInspectorItem">
                      <div className="typewriterAdminInspectorItemHeader">
                        <div>
                          <strong>{formatInspectorValue(entity.name, 'Unnamed entity')}</strong>
                          <small>{formatInspectorValue(entity.type, 'unknown type')} {entity.subtype ? `• ${entity.subtype}` : ''}</small>
                        </div>
                      </div>
                      <div className="typewriterControlMetaRow">
                        <span className="typewriterControlChip">Source: {formatInspectorValue(entity.source, 'unknown')}</span>
                        <span className="typewriterControlChip">Key text: {formatInspectorValue(entity.typewriterKeyText, 'none')}</span>
                      </div>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Description</strong> {formatInspectorValue(entity.description, 'No description')}</p>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Lore</strong> {formatInspectorValue(entity.lore, 'No lore')}</p>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Tags</strong> {formatInspectorList(entity.tags)}</p>
                      <p className="typewriterAdminInspectorMetaLine">
                        <strong>Introduced by</strong> {entity.introducedByStorytellerName ? `${entity.introducedByStorytellerName} (${entity.introducedByStorytellerId || 'no id'})` : 'Not linked to a storyteller'}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="typewriterPromptMeta">No typewriter-linked entities have been persisted for this session yet.</p>
              )}
            </article>

            <article className="typewriterAdminInspectorPanel">
              <header className="typewriterAdminInspectorPanelHeader">
                <div>
                  <h3>Storytellers</h3>
                  <p>The storyteller records currently occupying typewriter slots in this session.</p>
                </div>
              </header>
              {(sessionInspector.storytellers || []).length ? (
                <div className="typewriterAdminInspectorList">
                  {sessionInspector.storytellers.map((storyteller) => (
                    <article key={storyteller.id || storyteller.name} className="typewriterAdminInspectorItem">
                      <div className="typewriterAdminInspectorItemHeader">
                        <div>
                          <strong>{formatInspectorValue(storyteller.name, 'Unnamed storyteller')}</strong>
                          <small>{formatInspectorValue(storyteller.status, 'no status')} {Number.isFinite(Number(storyteller.level)) ? `• level ${Number(storyteller.level)}` : ''}</small>
                        </div>
                        {storyteller.keyImageUrl ? (
                          <img
                            className="typewriterAdminInspectorThumb"
                            src={storyteller.keyImageUrl}
                            alt={`${storyteller.name || 'storyteller'} key`}
                          />
                        ) : null}
                      </div>
                      <div className="typewriterControlMetaRow">
                        <span className="typewriterControlChip">Slot: {Number.isInteger(storyteller.keySlotIndex) ? storyteller.keySlotIndex : 'none'}</span>
                        <span className="typewriterControlChip">Introduced: {storyteller.introducedInTypewriter ? 'yes' : 'no'}</span>
                        <span className="typewriterControlChip">Interventions: {storyteller.typewriterInterventionsCount || 0}</span>
                      </div>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Symbol</strong> {formatInspectorValue(storyteller.symbol, 'No symbol')}</p>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Key description</strong> {formatInspectorValue(storyteller.description, 'No key description')}</p>
                      <p className="typewriterAdminInspectorMetaLine"><strong>Last intervention</strong> {formatDate(storyteller.lastTypewriterInterventionAt)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="typewriterPromptMeta">No storyteller slots are filled in this session yet.</p>
              )}
            </article>
          </div>
        </>
      ) : (
        <p className="typewriterPromptMeta">
          Inspect a session to load the live typewriter state. This panel is meant to answer “what exists right now?” without digging through Mongo manually.
        </p>
      )}
    </>
  );

  const sessionInspectorSection = (
    <section className="typewriterAdminSessionInspector">
      <div className="typewriterAdminSessionHeader">
        <div>
          <h2>Typewriter Session Inspector</h2>
          <p>Read one saved session as a joined snapshot: fragment, storyteller slots, textual keys, entities, and what the player can currently know.</p>
        </div>
      </div>
      {sessionInspectorContent}
    </section>
  );

  const collapsedSessionToolsSection = (
    <details
      className="typewriterControlDisclosure"
      open={isSessionToolsExpanded}
      onToggle={(event) => setIsSessionToolsExpanded(event.currentTarget.open)}
    >
      <summary className="typewriterControlDisclosureSummary">
        <span>Session Bootstrap</span>
        <small>Generate, seed, or clear the shared typewriter session only when you need it.</small>
      </summary>
      <div className="typewriterControlDisclosureBody">
        <div className="typewriterAdminDisclosureIntro">
          <p>Generate a session and optionally seed a fragment into Mongo. Clear the stored session to let the typewriter start fresh.</p>
          {sessionModeToggle}
        </div>
        {sessionToolsGrid}
      </div>
    </details>
  );

  const collapsedSessionInspectorSection = (
    <details
      className="typewriterControlDisclosure"
      open={isSessionInspectorExpanded}
      onToggle={(event) => setIsSessionInspectorExpanded(event.currentTarget.open)}
    >
      <summary className="typewriterControlDisclosureSummary">
        <span>Typewriter Session Inspector</span>
        <small>World truth, player-facing knowledge, and live keyboard state in one joined snapshot.</small>
      </summary>
      <div className="typewriterControlDisclosureBody">
        {sessionInspectorContent}
      </div>
    </details>
  );

  const collapsedTypewriterAssetFlowSection = (
    <details
      className="typewriterControlDisclosure"
      open={isTypewriterAssetFlowExpanded}
      onToggle={(event) => setIsTypewriterAssetFlowExpanded(event.currentTarget.open)}
    >
      <summary className="typewriterControlDisclosureSummary">
        <span>Typewriter Asset Flow</span>
        <small>{TYPEWRITER_ASSET_FLOW.length} stages</small>
      </summary>
      <div className="typewriterControlDisclosureBody">
        <p className="typewriterPromptMeta">
          The typewriter now produces both visual storyteller keys and saved textual keys. This explainer stays collapsed by default so the route workspace starts higher on the page.
        </p>
        <div className="typewriterControlRouteList">
          {TYPEWRITER_ASSET_FLOW.map((item) => (
            <article key={item.title} className="typewriterControlRouteCard">
              <div className="typewriterControlRouteSummary">
                <strong>{item.title}</strong>
                <br />
                <span>{item.note}</span>
              </div>
              <div className="typewriterControlMetaRow">
                <span className="typewriterControlChip">{item.route}</span>
                <span className="typewriterControlChip">{item.asset}</span>
                <span className="typewriterControlChip">{item.storage}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </details>
  );

  return (
    <div className="typewriterAdminPage">
      <header className="typewriterAdminHeader">
        <h1>Story Admin</h1>
        <p>Control runtime AI settings, prompt versions, and optional session seeding for the main narrative flows.</p>
      </header>

      <section className="typewriterAdminConnection">
        <label>
          API Base URL
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
            placeholder={DEFAULT_API_BASE_URL}
          />
        </label>
        <label>
          Admin Key
          <input
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Optional x-admin-key"
          />
        </label>
        <div className="typewriterAdminButtons">
          <button type="button" onClick={handleRefreshModels} disabled={loading || saving || refreshingModels}>
            {refreshingModels ? 'Refreshing models...' : 'Refresh models'}
          </button>
          <button type="button" onClick={handleReset} disabled={loading || saving}>
            Reset defaults
          </button>
          <button type="button" onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </section>

      <section className="typewriterAdminMeta">
        <span>
          Last update: <strong>{formatDate(settings?.updatedAt)}</strong>
        </span>
        <span>
          Updated by: <strong>{settings?.updatedBy || 'Unknown'}</strong>
        </span>
        <span>
          Models source: <strong>{models?.source || 'unknown'}</strong>
        </span>
        <span>
          Models fetched: <strong>{formatDate(models?.fetchedAt)}</strong>
        </span>
      </section>

      {error ? <p className="typewriterAdminError">{error}</p> : null}
      {status ? <p className="typewriterAdminStatus">{status}</p> : null}
      {loading ? <p className="typewriterAdminLoading">Loading settings...</p> : null}

      <nav className="typewriterAdminSectionTabs" aria-label="Story Admin sections">
        {ADMIN_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            className={section.key === activeSection ? 'typewriterAdminSectionTab isActive' : 'typewriterAdminSectionTab'}
            onClick={() => setActiveSection(section.key)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {activeSection === 'control' ? (
      <section className="typewriterControlCenter">
        <div className="typewriterPromptEditorHeader">
          <div>
            <h2>Component Control Center</h2>
            <p>Pick a component, follow its routes in flow order, change mock/model settings on the selected route, then edit prompts and schemas in a separate workspace.</p>
          </div>
        </div>

        {collapsedSessionToolsSection}

        {selectedControlComponentKey === 'typewriter' ? (
          <>
            {collapsedTypewriterAssetFlowSection}
            {collapsedSessionInspectorSection}
          </>
        ) : null}

        <div className="typewriterAdminListToolbar">
          <div className="typewriterControlSelector" role="tablist" aria-label="Story Admin components">
            {controlComponentOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={
                  option.key === selectedControlComponentKey
                    ? 'typewriterControlSelectorChip isActive'
                    : 'typewriterControlSelectorChip'
                }
                onClick={() => setSelectedControlComponentKey(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="typewriterAdminListCount">
            Showing {visibleControlRouteIds.length} route{visibleControlRouteIds.length === 1 ? '' : 's'}
            {visibleControlCustomEditorCount
              ? ` and ${visibleControlCustomEditorCount} custom editor${visibleControlCustomEditorCount === 1 ? '' : 's'}`
              : ''}
            {' '}across {visibleControlComponents.length} component{visibleControlComponents.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="typewriterControlComponentList">
          {visibleControlComponents.map((component) => {
            const selectedRouteId = selectedControlRoutesByComponent[component.key];
            const selectedRoute = component.routes.find((route) => route.routeId === selectedRouteId) || component.routes[0] || null;
            const componentRuntimeRows = collectUniqueRuntimeRows(component.routes);
            const isSavingSelectedRoute = selectedRoute ? savingControlRouteId === selectedRoute.routeId : false;
            const isSavingComponentRuntime = savingControlComponentKey === component.key;
            const selectedRouteSummary = buildRouteRuntimeSummary(selectedRoute);

            return (
              <section key={component.key} className="typewriterControlComponentCard">
                <header className="typewriterControlComponentHeader">
                  <div>
                    <h3>{component.label}</h3>
                    <p>{component.flowDescription || component.description}</p>
                  </div>
                  <span className="typewriterControlComponentCount">
                    {[
                      component.routes.length
                        ? `${component.routes.length} route${component.routes.length === 1 ? '' : 's'}`
                        : null,
                      component.customPanelKey ? 'custom editor' : null
                    ].filter(Boolean).join(' + ')}
                  </span>
                </header>

                {component.flowOverview ? (
                  <section className="typewriterControlOverview">
                    <div className="typewriterControlOverviewHeader">
                      <div>
                        <h4>Flow At A Glance</h4>
                        <p>{component.flowOverview.summary}</p>
                      </div>
                    </div>
                    <div className="typewriterControlOverviewGrid">
                      <article className="typewriterControlOverviewCard">
                        <strong>Main path</strong>
                        <p>{component.flowOverview.mainPath}</p>
                      </article>
                      <article className="typewriterControlOverviewCard">
                        <strong>Supporting routes</strong>
                        <p>{component.flowOverview.supportingPath}</p>
                      </article>
                      <article className="typewriterControlOverviewCard">
                        <strong>Produces</strong>
                        <div className="typewriterControlMetaRow">
                          {(Array.isArray(component.flowOverview.outputs) ? component.flowOverview.outputs : []).map((output) => (
                            <span key={output} className="typewriterControlChip">{output}</span>
                          ))}
                        </div>
                      </article>
                    </div>

                    {component.routes.length ? (
                      <div className="typewriterControlRoutesDigest">
                        <div className="typewriterControlOverviewHeader typewriterControlOverviewHeaderSplit">
                          <div>
                            <h4>Available Routes</h4>
                            <p>Each route’s job in the component, what triggers it, what it returns, and a quick runtime editor for mock/model changes before you open the full route workspace.</p>
                          </div>
                          {componentRuntimeRows.length ? (
                            <div className="typewriterPromptButtons typewriterPromptButtons-inline">
                              <button
                                type="button"
                                onClick={() => handleSaveControlComponentRuntime(component)}
                                disabled={loading || saving || savingPrompts || savingLlmConfigs || isSavingSelectedRoute || isSavingComponentRuntime}
                              >
                                {isSavingComponentRuntime ? 'Saving quick edits...' : 'Save Quick Runtime Edits'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="typewriterControlRoutesDigestTable" role="table" aria-label={`${component.label} route summary`}>
                          <div className="typewriterControlRoutesDigestHead" role="row">
                            <span role="columnheader">Route</span>
                            <span role="columnheader">Role</span>
                            <span role="columnheader">Trigger</span>
                            <span role="columnheader">Output</span>
                            <span role="columnheader">Quick runtime</span>
                          </div>
                          {component.routes.map((route) => (
                            <div
                              key={`${route.routeId}-digest`}
                              role="row"
                              className={
                                selectedRoute?.routeId === route.routeId
                                  ? 'typewriterControlRoutesDigestRow isSelected'
                                  : 'typewriterControlRoutesDigestRow'
                              }
                            >
                              <div role="cell" className="typewriterControlRoutesDigestCell">
                                <button
                                  type="button"
                                  className="typewriterControlRoutesDigestRouteButton"
                                  onClick={() =>
                                    setSelectedControlRoutesByComponent((prev) => ({
                                      ...prev,
                                      [component.key]: route.routeId
                                    }))
                                  }
                                >
                                  <strong>{route.label}</strong>
                                  <small>{route.method} {route.path}</small>
                                </button>
                              </div>
                              <div role="cell" className="typewriterControlRoutesDigestCell">
                                <strong>{route.roleLabel || route.flowGroup || 'Route'}</strong>
                              </div>
                              <div role="cell" className="typewriterControlRoutesDigestCell">
                                <span>{route.triggerSummary || route.flowSummary || route.summary}</span>
                              </div>
                              <div role="cell" className="typewriterControlRoutesDigestCell">
                                <span>{route.outputSummary || route.summary}</span>
                              </div>
                              <div role="cell" className="typewriterControlRoutesDigestCell typewriterControlRoutesDigestRuntimeCell">
                                {route.runtimeRows.length ? (
                                  <div className="typewriterControlRoutesDigestRuntime">
                                    <div className="typewriterControlRoutesDigestRuntimeStatus">
                                      <span className="typewriterControlChip">{getRouteRuntimeModeLabel(route)}</span>
                                    </div>
                                    {route.runtimeRows.map((runtimeRow) => {
                                      const options = getModelOptions(runtimeRow.modelKind, runtimeRow.model, runtimeRow.provider);
                                      return (
                                        <div
                                          key={`${route.routeId}-${runtimeRow.key}-quick`}
                                          className="typewriterControlRoutesDigestRuntimeCard"
                                        >
                                          <div className="typewriterControlRoutesDigestRuntimeHeader">
                                            <strong>{runtimeRow.label}</strong>
                                            <small>{runtimeRow.description}</small>
                                          </div>
                                          <div className="typewriterControlRoutesDigestRuntimeControls">
                                            <label className="typewriterControlRoutesDigestToggle">
                                              <input
                                                type="checkbox"
                                                aria-label={`${route.label} ${runtimeRow.label} mock toggle`}
                                                checked={runtimeRow.useMock}
                                                onChange={(event) => updatePipeline(runtimeRow.key, { useMock: event.target.checked })}
                                              />
                                              <span>{runtimeRow.useMock ? 'Mock' : 'Live'}</span>
                                            </label>
                                            {runtimeRow.supportedProviders?.length > 1 ? (
                                              <label className="typewriterControlRoutesDigestField">
                                                <span>Provider</span>
                                                <select
                                                  aria-label={`${route.label} ${runtimeRow.label} provider`}
                                                  value={runtimeRow.provider}
                                                  onChange={(event) => {
                                                    const nextProvider = event.target.value;
                                                    const nextOptions = getModelOptions(runtimeRow.modelKind, '', nextProvider);
                                                    updatePipeline(runtimeRow.key, {
                                                      provider: nextProvider,
                                                      model: nextOptions[0] || runtimeRow.model
                                                    });
                                                  }}
                                                >
                                                  {runtimeRow.supportedProviders.map((providerId) => (
                                                    <option key={providerId} value={providerId}>
                                                      {providerId}
                                                    </option>
                                                  ))}
                                                </select>
                                              </label>
                                            ) : null}
                                            <label className="typewriterControlRoutesDigestField">
                                              <span>Model</span>
                                              <select
                                                aria-label={`${route.label} ${runtimeRow.label} model`}
                                                value={runtimeRow.model}
                                                onChange={(event) => updatePipeline(runtimeRow.key, { model: event.target.value })}
                                              >
                                                {options.map((optionId) => (
                                                  <option key={optionId} value={optionId}>
                                                    {optionId}
                                                  </option>
                                                ))}
                                              </select>
                                            </label>
                                            {runtimeRow.supportsCount ? (
                                              <label className="typewriterControlRoutesDigestField typewriterControlRoutesDigestFieldCount">
                                                <span>{runtimeRow.countLabel}</span>
                                                <input
                                                  type="number"
                                                  min={runtimeRow.minCount}
                                                  max={runtimeRow.maxCount}
                                                  aria-label={`${route.label} ${runtimeRow.label} ${runtimeRow.countLabel}`}
                                                  value={runtimeRow.countValue}
                                                  onChange={(event) =>
                                                    updatePipeline(runtimeRow.key, {
                                                      [runtimeRow.countProperty]: normalizeCountDraft(
                                                        event.target.value,
                                                        runtimeRow.countValue,
                                                        runtimeRow.minCount,
                                                        runtimeRow.maxCount
                                                      )
                                                    })
                                                  }
                                                />
                                              </label>
                                            ) : null}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="typewriterControlRoutesDigestEmpty">No runtime settings</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {component.customPanelKey === 'well_scene_config' ? (
                  <WellAdminWorkspace apiBaseUrl={apiBaseUrl} adminKey={adminKey} />
                ) : null}

                {component.routes.length ? (
                  <div className="typewriterControlWorkspace">
                    <section className="typewriterControlFlowPanel">
                      <div className="typewriterControlPanelHeader">
                        <div>
                          <h4>Route Flow</h4>
                          <p>Routes stay in runtime order here so the component reads like a sequence instead of a flat list.</p>
                        </div>
                      </div>

                      <div className="typewriterControlFlowList">
                        {component.routes.map((route, index) => {
                          const previousRoute = component.routes[index - 1];
                          const showGroupLabel = route.flowGroup && route.flowGroup !== previousRoute?.flowGroup;
                          const isSelected = selectedRoute?.routeId === route.routeId;
                          const routeRuntimeModeLabel = getRouteRuntimeModeLabel(route);
                          const routeSummary = buildRouteRuntimeSummary(route);

                          return (
                            <React.Fragment key={route.routeId}>
                              {showGroupLabel ? (
                                <div className="typewriterControlFlowGroup">
                                  <span>{route.flowGroup}</span>
                                </div>
                              ) : null}
                              <button
                                type="button"
                                className={
                                  isSelected
                                    ? 'typewriterControlFlowCard isSelected'
                                    : 'typewriterControlFlowCard'
                                }
                                onClick={() =>
                                  setSelectedControlRoutesByComponent((prev) => ({
                                    ...prev,
                                    [component.key]: route.routeId
                                  }))
                                }
                              >
                                <div className="typewriterControlFlowCardHeader">
                                  <span className="typewriterControlFlowStepNumber">{index + 1}</span>
                                  <div className="typewriterControlFlowCardTitle">
                                    <strong>{route.label}</strong>
                                    <small>{route.method} {route.path}</small>
                                  </div>
                                  <span className="typewriterControlFlowMode">{routeRuntimeModeLabel}</span>
                                </div>
                                <p className="typewriterControlRouteSummary">{route.flowSummary || route.summary}</p>
                                <div className="typewriterControlMetaRow">
                                  <span className="typewriterControlChip">{route.runtimeRows.length} runtime settings</span>
                                  <span className="typewriterControlChip">{route.contractEntries.length} schemas</span>
                                  <span className="typewriterControlChip">{route.directPromptEntries.length} direct prompts</span>
                                </div>
                                <p className="typewriterPromptMeta">{routeSummary}</p>
                              </button>
                              {index < component.routes.length - 1 ? (
                                <div className="typewriterControlFlowConnector" aria-hidden="true" />
                              ) : null}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </section>

                    {selectedRoute ? (
                      <section className="typewriterControlEditorPanel">
                        <div className="typewriterControlPanelHeader">
                          <div>
                            <h4>{selectedRoute.label}</h4>
                            <p>{selectedRoute.flowSummary || selectedRoute.summary}</p>
                          </div>
                          <div className="typewriterPromptButtons typewriterPromptButtons-inline">
                            <button
                              type="button"
                              onClick={() => handleSaveControlRoute(selectedRoute)}
                              disabled={loading || isSavingSelectedRoute || saving || savingPrompts || savingLlmConfigs}
                            >
                              {isSavingSelectedRoute ? 'Saving route...' : `Save ${selectedRoute.label}`}
                            </button>
                          </div>
                        </div>

                        <div className="typewriterControlMetaRow">
                          <span className="typewriterControlChip">{selectedRoute.method} {selectedRoute.path}</span>
                          <span className="typewriterControlChip">{selectedRoute.runtimeRows.length} runtime settings</span>
                          <span className="typewriterControlChip">{selectedRoute.contractEntries.length} schemas</span>
                          <span className="typewriterControlChip">{selectedRoute.directPromptEntries.length} direct prompts</span>
                        </div>

                        <p className="typewriterPromptMeta">{selectedRouteSummary}</p>

                        {selectedRoute.runtimeRows.length ? (
                          <section className="typewriterControlSection">
                            <div className="typewriterControlSectionHeader">
                              <div>
                                <h4>Runtime summary</h4>
                                <p>Edit mock/live and model settings in Available Routes above. This panel only mirrors the active route configuration.</p>
                              </div>
                            </div>

                            <div className="typewriterControlRuntimeGrid">
                              {selectedRoute.runtimeRows.map((runtimeRow) => {
                                const sharedUsageEntries = (controlRuntimeUsageMap[runtimeRow.key] || [])
                                  .filter((entry) => entry.routeId !== selectedRoute.routeId);
                                const sharedUsageLabel = sharedUsageEntries.length
                                  ? sharedUsageEntries
                                    .map((entry) =>
                                      entry.componentKey === component.key
                                        ? entry.routeLabel
                                        : `${entry.componentLabel}: ${entry.routeLabel}`
                                    )
                                    .join(', ')
                                  : '';

                                return (
                                  <div key={runtimeRow.key} className="typewriterControlRuntimeCard">
                                    <div className="typewriterPipelineCell">
                                      <strong>{runtimeRow.label}</strong>
                                      <span>{runtimeRow.description}</span>
                                    </div>
                                    <div className="typewriterControlMetaRow">
                                      <span className="typewriterControlChip">Mode: {runtimeRow.useMock ? 'Mock' : 'Live'}</span>
                                      <span className="typewriterControlChip">Provider: {runtimeRow.provider || 'openai'}</span>
                                      <span className="typewriterControlChip">Model: {runtimeRow.model || 'unset'}</span>
                                      {runtimeRow.supportsCount ? (
                                        <span className="typewriterControlChip">
                                          {runtimeRow.countLabel}: {runtimeRow.countValue}
                                        </span>
                                      ) : null}
                                    </div>
                                    {sharedUsageLabel ? (
                                      <p className="typewriterControlRuntimeNote">
                                        Shared pipeline. Changes also affect {sharedUsageLabel}.
                                      </p>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        ) : null}

                        {selectedRoute.directPromptEntries.length ? (
                          <section className="typewriterControlSection">
                            <div className="typewriterControlSectionHeader">
                              <div>
                                <h4>Direct prompt templates</h4>
                                <p>These prompts are edited separately from runtime model selection so the route workflow stays easier to scan.</p>
                              </div>
                            </div>
                            {selectedRoute.directPromptEntries.map((promptEntry) => (
                              <section key={promptEntry.key} className="typewriterControlBlock">
                                <div className="typewriterControlBlockHeader">
                                  <div>
                                    <h4>{promptEntry.label}</h4>
                                    <p>{promptEntry.description}</p>
                                  </div>
                                  <div className="typewriterControlBlockMeta">
                                    <span>Prompt key: {promptEntry.key}</span>
                                    <span>Version: {promptEntry.latestPrompt?.version || 'default'}</span>
                                    <span>Updated: {formatDate(promptEntry.latestPrompt?.updatedAt)}</span>
                                  </div>
                                </div>
                                <label className="typewriterStructuredField">
                                  Prompt template
                                  <textarea
                                    value={promptDrafts[promptEntry.key] || ''}
                                    onChange={(event) => updatePromptDraft(promptEntry.key, event.target.value)}
                                    rows={10}
                                    placeholder={`Enter prompt template for ${promptEntry.label}.`}
                                  />
                                </label>
                              </section>
                            ))}
                          </section>
                        ) : null}

                        {selectedRoute.contractEntries.length ? (
                          <section className="typewriterControlSection">
                            <div className="typewriterControlSectionHeader">
                              <div>
                                <h4>Schemas and generated prompts</h4>
                                <p>Schema-backed routes keep the contract editor here, separate from the route-flow and model controls.</p>
                              </div>
                            </div>
                            {selectedRoute.contractEntries.map((binding) => {
                              const draft = llmRouteConfigDrafts?.[binding.routeKey] || binding.draft || buildLlmConfigDraft(binding.config || {});
                              let previewText = '';
                              let previewError = '';
                              try {
                                previewText = buildStructuredPromptPreview(draft);
                              } catch (err) {
                                previewError = err.message || 'Preview unavailable.';
                              }

                              return (
                                <section key={binding.routeKey} className="typewriterControlBlock">
                                  <div className="typewriterControlBlockHeader">
                                    <div>
                                      <h4>{binding.label}</h4>
                                      <p>{binding.method} {binding.routePath}</p>
                                    </div>
                                    <div className="typewriterControlBlockMeta">
                                      <span>Schema key: {binding.routeKey}</span>
                                      <span>Live prompt target: {binding.promptKey || 'none'}</span>
                                      <span>Prompt source: {getPromptSourceLabel(draft.promptMode)}</span>
                                      <span>Version: {binding.config?.version || 'default'}</span>
                                    </div>
                                  </div>

                                  <div className="typewriterStructuredModeRow">
                                    <label>
                                      Prompt source
                                      <select
                                        value={draft.promptMode}
                                        onChange={(event) =>
                                          updateLlmRouteConfigDraft(binding.routeKey, { promptMode: event.target.value })
                                        }
                                      >
                                        <option value="manual">Direct prompt text</option>
                                        <option value="contract">Generated from schema</option>
                                      </select>
                                    </label>
                                  </div>

                                  {draft.promptMode === 'manual' ? (
                                    <label className="typewriterStructuredField">
                                      Direct runtime prompt
                                      <textarea
                                        value={draft.promptTemplate}
                                        onChange={(event) =>
                                          updateLlmRouteConfigDraft(binding.routeKey, { promptTemplate: event.target.value })
                                        }
                                        rows={8}
                                        placeholder="Enter the full prompt template used by this route."
                                      />
                                    </label>
                                  ) : (
                                    <label className="typewriterStructuredField">
                                      Creative instructions
                                      <textarea
                                        value={draft.promptCore}
                                        onChange={(event) =>
                                          updateLlmRouteConfigDraft(binding.routeKey, { promptCore: event.target.value })
                                        }
                                        rows={8}
                                        placeholder="Narrative instructions. The JSON contract block is generated below."
                                      />
                                    </label>
                                  )}

                                  <div className="typewriterStructuredGrid">
                                    <label className="typewriterStructuredField">
                                      Response schema (JSON)
                                      <textarea
                                        value={draft.responseSchemaText}
                                        onChange={(event) =>
                                          updateLlmRouteConfigDraft(binding.routeKey, { responseSchemaText: event.target.value })
                                        }
                                        rows={14}
                                        spellCheck={false}
                                        placeholder='{"type":"object","properties":{}}'
                                      />
                                    </label>
                                    <label className="typewriterStructuredField">
                                      Field docs (JSON map)
                                      <textarea
                                        value={draft.fieldDocsText}
                                        onChange={(event) =>
                                          updateLlmRouteConfigDraft(binding.routeKey, { fieldDocsText: event.target.value })
                                        }
                                        rows={14}
                                        spellCheck={false}
                                        placeholder='{"short_title":"2-6 words","miseenscene":"first-person sensory"}'
                                      />
                                    </label>
                                  </div>

                                  <div className="typewriterStructuredGrid">
                                    <label className="typewriterStructuredField">
                                      Example valid JSON
                                      <textarea
                                        value={draft.examplePayloadText}
                                        onChange={(event) =>
                                          updateLlmRouteConfigDraft(binding.routeKey, { examplePayloadText: event.target.value })
                                        }
                                        rows={12}
                                        spellCheck={false}
                                        placeholder='{"example":"Optional sample response"}'
                                      />
                                    </label>
                                    <label className="typewriterStructuredField">
                                      Output rules (one per line)
                                      <textarea
                                        value={draft.outputRulesText}
                                        onChange={(event) =>
                                          updateLlmRouteConfigDraft(binding.routeKey, { outputRulesText: event.target.value })
                                        }
                                        rows={12}
                                        placeholder="short_title should fit the card UI"
                                      />
                                    </label>
                                  </div>

                                  <label className="typewriterStructuredField">
                                    Runtime prompt preview synced into {binding.promptKey || 'this route only'} on save
                                    <textarea
                                      value={previewError || previewText}
                                      readOnly
                                      rows={14}
                                      className="typewriterStructuredPreview"
                                    />
                                  </label>
                                </section>
                              );
                            })}
                          </section>
                        ) : null}

                        {!selectedRoute.runtimeRows.length
                          && !selectedRoute.directPromptEntries.length
                          && !selectedRoute.contractEntries.length ? (
                          <p className="typewriterPromptMeta">This route does not expose editable runtime, prompt, or schema settings yet.</p>
                        ) : null}
                      </section>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
        {!visibleControlComponents.length ? (
          <p className="typewriterPromptMeta">No component is available for the current selection.</p>
        ) : null}
      </section>
      ) : null}

      {activeSection === 'session' ? (
      <>
        {sessionToolsSection}
        {sessionInspectorSection}
      </>
      ) : null}

      {activeSection === 'runtime' ? (
      <section className="typewriterAdminTableWrap">
        <table className="typewriterAdminTable">
          <thead>
            <tr>
              <th>Pipeline</th>
              <th>Use Mock</th>
              <th>Model</th>
              <th>Options</th>
            </tr>
          </thead>
          <tbody>
            {pipelineRows.map((row) => {
              const options = getModelOptions(row.modelKind, row.model, row.provider);
              return (
                <tr key={row.key}>
                  <td>
                    <div className="typewriterPipelineCell">
                      <strong>{row.label}</strong>
                      <span>{row.description}</span>
                    </div>
                  </td>
                  <td>
                    <label className="typewriterMockToggle">
                      <input
                        type="checkbox"
                        checked={row.useMock}
                        onChange={(event) => updatePipeline(row.key, { useMock: event.target.checked })}
                      />
                      <span>{row.useMock ? 'Mock' : 'Live'}</span>
                    </label>
                  </td>
                  <td>
                    {row.supportedProviders?.length > 1 ? (
                      <label className="typewriterNumericSetting">
                        <span>Provider</span>
                        <select
                          value={row.provider}
                          onChange={(event) => {
                            const nextProvider = event.target.value;
                            const nextOptions = getModelOptions(row.modelKind, '', nextProvider);
                            updatePipeline(row.key, {
                              provider: nextProvider,
                              model: nextOptions[0] || row.model
                            });
                          }}
                        >
                          {row.supportedProviders.map((providerId) => (
                            <option key={providerId} value={providerId}>
                              {providerId}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <select
                      value={row.model}
                      onChange={(event) => updatePipeline(row.key, { model: event.target.value })}
                    >
                      {options.map((optionId) => (
                        <option key={optionId} value={optionId}>
                          {optionId}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {row.supportsCount ? (
                      <label className="typewriterNumericSetting">
                        <span>{row.countLabel}</span>
                        <input
                          type="number"
                          min={row.minCount}
                          max={row.maxCount}
                          value={row.countValue}
                          onChange={(event) =>
                            updatePipeline(row.key, {
                              [row.countProperty]: normalizeCountDraft(
                                event.target.value,
                                row.countValue,
                                row.minCount,
                                row.maxCount
                              )
                            })
                          }
                        />
                      </label>
                    ) : (
                      <span className="typewriterSettingPlaceholder">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      ) : null}

      {activeSection === 'prompts' ? (
      <section className="typewriterPromptEditor">
        <div className="typewriterPromptEditorHeader">
          <div>
            <h2>Prompt Overrides (Mongo, latest used by default)</h2>
            <p>Seed the current in-code prompts once, then edit versions here instead of changing backend files.</p>
          </div>
          <button
            type="button"
            className="typewriterSeedPromptsBtn"
            onClick={handleSeedCurrentPrompts}
            disabled={loading || savingPrompts}
          >
            {savingPrompts ? 'Working...' : 'Seed current prompts'}
          </button>
        </div>
        <div className="typewriterAdminListToolbar">
          <label className="typewriterAdminFilter">
            Filter prompts
            <input
              type="text"
              value={promptFilter}
              onChange={(event) => setPromptFilter(event.target.value)}
              placeholder="Search by key, label, or route"
            />
          </label>
          <span className="typewriterAdminListCount">
            Showing {visiblePromptDefinitions.length} of {promptDefinitions.length}
          </span>
        </div>
        {visiblePromptDefinitions.map((pipeline) => {
          const latestPrompt = prompts?.pipelines?.[pipeline.key];
          const versions = promptVersions?.[pipeline.key] || [];
          const isExpanded = expandedPromptKey === pipeline.key;
          return (
            <article key={pipeline.key} className="typewriterPromptCard">
              <button
                type="button"
                className="typewriterPromptCardToggle"
                onClick={() => setExpandedPromptKey((prev) => (prev === pipeline.key ? '' : pipeline.key))}
              >
                <span>
                  <strong>{pipeline.label}</strong>
                  <small>{pipeline.key}</small>
                </span>
                <span>{isExpanded ? 'Hide' : 'Open'}</span>
              </button>
              <header>
                <h3>{pipeline.label}</h3>
                <p>{pipeline.description}</p>
                <p className="typewriterPromptMeta">
                  Latest version: {latestPrompt?.version || 'None'} | Updated:{' '}
                  {formatDate(latestPrompt?.updatedAt)}
                </p>
                <p className="typewriterPromptMeta">Execution settings: {pipeline.settingsKey}</p>
                {latestPrompt?.meta?.source ? (
                  <p className="typewriterPromptMeta">Source: {latestPrompt.meta.source}</p>
                ) : null}
              </header>
              {isExpanded ? (
              <>
              <textarea
                value={promptDrafts[pipeline.key] || ''}
                onChange={(event) => updatePromptDraft(pipeline.key, event.target.value)}
                placeholder={`Enter prompt template for ${pipeline.label}. Use {{variable_name}} placeholders.`}
              />
              <div className="typewriterPromptButtons">
                <button
                  type="button"
                  onClick={() => handleSavePrompt(pipeline.key)}
                  disabled={loading || savingPrompts}
                >
                  {savingPrompts ? 'Saving...' : `Save ${pipeline.label} Prompt`}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPromptVersions(pipeline.key)}
                  disabled={loading || savingPrompts}
                >
                  Load versions
                </button>
              </div>
              {versions.length ? (
                <ul className="typewriterPromptVersions">
                  {versions.map((version) => (
                    <li key={version.id}>
                      v{version.version} | {formatDate(version.updatedAt)} | {version.createdBy || 'admin'}
                      {version.isLatest ? (
                        <strong> (latest)</strong>
                      ) : (
                        <button
                          type="button"
                          className="typewriterUseVersionBtn"
                          onClick={() => handleUsePromptVersion(pipeline.key, version.id)}
                          disabled={savingPrompts}
                        >
                          Use as latest
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              </>
              ) : null}
            </article>
          );
        })}
      </section>
      ) : null}

      {activeSection === 'contracts' ? (
      <section className="typewriterPromptEditor typewriterStructuredEditor">
        <div className="typewriterPromptEditorHeader">
          <div>
            <h2>Route Schemas</h2>
            <p>
              JSON-returning routes can use direct prompt text, or generate the runtime prompt from schema, field notes,
              example JSON, and output rules.
            </p>
          </div>
        </div>
        <div className="typewriterAdminListToolbar">
          <label className="typewriterAdminFilter">
            Filter schemas
            <input
              type="text"
              value={contractFilter}
              onChange={(event) => setContractFilter(event.target.value)}
              placeholder="Search by route key, path, or description"
            />
          </label>
          <span className="typewriterAdminListCount">
            Showing {visibleLlmRouteRows.length} of {llmRouteRows.length}
          </span>
        </div>
        {visibleLlmRouteRows.map((config) => {
          const draft = llmRouteConfigDrafts?.[config.routeKey] || buildLlmConfigDraft(config);
          const versions = llmRouteConfigVersions?.[config.routeKey] || [];
          const isExpanded = expandedContractKey === config.routeKey;
          let previewText = '';
          let previewError = '';
          try {
            previewText = buildStructuredPromptPreview(draft);
          } catch (err) {
            previewError = err.message || 'Preview unavailable.';
          }

          return (
            <article key={config.routeKey} className="typewriterPromptCard typewriterStructuredCard">
              <button
                type="button"
                className="typewriterPromptCardToggle"
                onClick={() => setExpandedContractKey((prev) => (prev === config.routeKey ? '' : config.routeKey))}
              >
                <span>
                  <strong>{config.routeKey}</strong>
                  <small>{config.routePath}</small>
                </span>
                <span>{isExpanded ? 'Hide' : 'Open'}</span>
              </button>
              <header>
                <h3>{config.routeKey}</h3>
                <p>{config.description}</p>
                <p className="typewriterPromptMeta">
                  Route: {config.method} {config.routePath}
                </p>
                <p className="typewriterPromptMeta">
                  Latest version: {config.version || 'Default'} | Updated: {formatDate(config.updatedAt)}
                </p>
                <p className="typewriterPromptMeta">
                  Current prompt source: <strong>{getPromptSourceLabel(config.promptMode)}</strong>
                </p>
              </header>
              {isExpanded ? (
              <>
              <div className="typewriterStructuredModeRow">
                <label>
                  Prompt source
                  <select
                    value={draft.promptMode}
                    onChange={(event) => updateLlmRouteConfigDraft(config.routeKey, { promptMode: event.target.value })}
                  >
                    <option value="manual">Direct prompt text</option>
                    <option value="contract">Generated from schema</option>
                  </select>
                </label>
              </div>

              {draft.promptMode === 'manual' ? (
                <label className="typewriterStructuredField">
                  Direct runtime prompt
                  <textarea
                    value={draft.promptTemplate}
                    onChange={(event) => updateLlmRouteConfigDraft(config.routeKey, { promptTemplate: event.target.value })}
                    rows={8}
                    placeholder="Enter the full prompt template used by this JSON route."
                  />
                </label>
              ) : (
                <label className="typewriterStructuredField">
                  Creative instructions
                  <textarea
                    value={draft.promptCore}
                    onChange={(event) => updateLlmRouteConfigDraft(config.routeKey, { promptCore: event.target.value })}
                    rows={8}
                    placeholder="Enter the creative or narrative instructions. The JSON contract section will be appended automatically."
                  />
                </label>
              )}

              <div className="typewriterStructuredGrid">
                <label className="typewriterStructuredField">
                  Response schema (JSON)
                  <textarea
                    value={draft.responseSchemaText}
                    onChange={(event) =>
                      updateLlmRouteConfigDraft(config.routeKey, { responseSchemaText: event.target.value })
                    }
                    rows={14}
                    spellCheck={false}
                    placeholder='{"type":"object","properties":{}}'
                  />
                </label>
                <label className="typewriterStructuredField">
                  Field docs (JSON map)
                  <textarea
                    value={draft.fieldDocsText}
                    onChange={(event) =>
                      updateLlmRouteConfigDraft(config.routeKey, { fieldDocsText: event.target.value })
                    }
                    rows={14}
                    spellCheck={false}
                    placeholder='{"short_title":"2-6 words","miseenscene":"first-person sensory"}'
                  />
                </label>
              </div>

              <div className="typewriterStructuredGrid">
                <label className="typewriterStructuredField">
                  Example payload (JSON)
                  <textarea
                    value={draft.examplePayloadText}
                    onChange={(event) =>
                      updateLlmRouteConfigDraft(config.routeKey, { examplePayloadText: event.target.value })
                    }
                    rows={12}
                    spellCheck={false}
                    placeholder='{"example":"Optional sample response"}'
                  />
                </label>
                <label className="typewriterStructuredField">
                  Output rules (one per line)
                  <textarea
                    value={draft.outputRulesText}
                    onChange={(event) =>
                      updateLlmRouteConfigDraft(config.routeKey, { outputRulesText: event.target.value })
                    }
                    rows={12}
                    placeholder="short_title should fit the card UI"
                  />
                </label>
              </div>

              <label className="typewriterStructuredField">
                Runtime prompt preview
                <textarea value={previewError || previewText} readOnly rows={14} className="typewriterStructuredPreview" />
              </label>

              <div className="typewriterPromptButtons">
                <button
                  type="button"
                  onClick={() => handleSaveLlmRouteConfig(config.routeKey)}
                  disabled={loading || savingLlmConfigs}
                >
                  {savingLlmConfigs ? 'Saving...' : `Save ${config.routeKey}`}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadLlmRouteConfigVersions(config.routeKey)}
                  disabled={loading || savingLlmConfigs}
                >
                  Load versions
                </button>
                <button
                  type="button"
                  onClick={() => handleResetLlmRouteConfig(config.routeKey)}
                  disabled={loading || savingLlmConfigs}
                >
                  Reset to defaults
                </button>
              </div>

              {versions.length ? (
                <ul className="typewriterPromptVersions">
                  {versions.map((version) => (
                    <li key={version.version ? `${config.routeKey}-${version.version}-${version.updatedAt}` : `${config.routeKey}-default`}>
                      v{version.version || 'default'} | {formatDate(version.updatedAt)} | {version.createdBy || 'admin'}
                      {version.isLatest ? (
                        <strong> (latest)</strong>
                      ) : (
                        <button
                          type="button"
                          className="typewriterUseVersionBtn"
                          onClick={() => handleUseLlmRouteConfigVersion(config.routeKey, version.id || version._id)}
                          disabled={savingLlmConfigs}
                        >
                          Use as latest
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              </>
              ) : null}
            </article>
          );
        })}
      </section>
      ) : null}
    </div>
  );
};

export default TypewriterAdminPage;

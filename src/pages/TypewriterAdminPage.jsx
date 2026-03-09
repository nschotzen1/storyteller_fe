import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_API_BASE_URL,
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
import './TypewriterAdminPage.css';

const TYPEWRITER_ADMIN_API_BASE_STORAGE_KEY = 'typewriterAdminApiBaseUrl';
const TYPEWRITER_ADMIN_KEY_STORAGE_KEY = 'typewriterAdminApiKey';
const TYPEWRITER_SESSION_STORAGE_KEY = 'sessionId';
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
  'claude-3-7-sonnet-latest',
  'claude-3-opus-latest',
  'claude-3-5-sonnet-latest'
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
    key: 'messenger_chat',
    label: 'Messenger chat',
    description: '/api/messenger/chat',
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
    key: 'messenger_chat',
    label: 'Messenger chat',
    description: '/api/messenger/chat assistant prompt',
    settingsKey: 'messenger_chat'
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
    description: '/api/fragmentToMemories front image generation',
    settingsKey: 'texture_creation'
  },
  {
    key: 'memory_card_back',
    label: 'Memory card back',
    description: '/api/fragmentToMemories back image generation',
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
  { key: 'runtime', label: 'Runtime' },
  { key: 'session', label: 'Session' },
  { key: 'prompts', label: 'Prompt Templates' },
  { key: 'contracts', label: 'JSON Contracts' }
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

const getInitialMemorySpreadAdminMode = () => {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(MEMORY_SPREAD_ADMIN_MODE_STORAGE_KEY);
  const normalized = `${stored || ''}`.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const getInitialAdminSection = () => {
  if (typeof window === 'undefined') return 'runtime';
  const stored = window.localStorage.getItem(STORY_ADMIN_SECTION_STORAGE_KEY);
  return ADMIN_SECTIONS.some((section) => section.key === stored) ? stored : 'runtime';
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

const normalizeCountDraft = (value, fallback = 1, min = 1, max = 10) => {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(Math.max(min, Math.floor(next)), max);
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
  const [sessionFragmentDraft, setSessionFragmentDraft] = useState(DEFAULT_SESSION_SEED_FRAGMENT);
  const [memorySpreadAdminEnabled, setMemorySpreadAdminEnabled] = useState(getInitialMemorySpreadAdminMode);
  const [activeSection, setActiveSection] = useState(getInitialAdminSection);
  const [promptFilter, setPromptFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
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

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError('');
      setStatus('');
      try {
        const [settingsPayload, modelsPayload, promptsPayload, llmRouteConfigsPayload] = await Promise.all([
          loadTypewriterAiSettings(apiBaseUrl, { adminKey }),
          loadOpenAiModels(apiBaseUrl, { adminKey }),
          loadTypewriterPrompts(apiBaseUrl, { adminKey }),
          loadLlmRouteConfigs(apiBaseUrl, { adminKey })
        ]);
        const nextSettingDefinitions = Array.isArray(settingsPayload?.pipelinesMeta) && settingsPayload.pipelinesMeta.length
          ? settingsPayload.pipelinesMeta
          : SETTING_PIPELINES;
        const nextPromptDefinitions = Array.isArray(promptsPayload?.pipelinesMeta) && promptsPayload.pipelinesMeta.length
          ? promptsPayload.pipelinesMeta
          : PROMPT_PIPELINES;
        if (!active) return;
        setSettingDefinitions(nextSettingDefinitions);
        setPromptDefinitions(nextPromptDefinitions);
        setSettings(settingsPayload || buildEmptySettings(nextSettingDefinitions));
        setModels(modelsPayload || EMPTY_MODELS_PAYLOAD);
        setPrompts(promptsPayload || { pipelines: {} });
        setPromptDrafts(() => {
          const nextDrafts = {};
          nextPromptDefinitions.forEach((pipeline) => {
            nextDrafts[pipeline.key] = promptsPayload?.pipelines?.[pipeline.key]?.promptTemplate || '';
          });
          return nextDrafts;
        });
        setLlmRouteConfigs(llmRouteConfigsPayload || {});
        setLlmRouteConfigDrafts(() => {
          const nextDrafts = {};
          Object.values(llmRouteConfigsPayload || {}).forEach((config) => {
            nextDrafts[config.routeKey] = buildLlmConfigDraft(config);
          });
          return nextDrafts;
        });
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
  }, [apiBaseUrl, adminKey]);

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
    if (normalizedProvider === 'anthropic' && modelIds.length === 0) {
      modelIds.push(...FALLBACK_ANTHROPIC_TEXT_MODELS);
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
      const responseSchema = parseJsonDraft('Response schema', draft.responseSchemaText, { fallback: {} });
      const fieldDocs = parseJsonDraft('Field docs', draft.fieldDocsText, { allowBlank: true, fallback: {} });
      const examplePayload = parseJsonDraft('Example payload', draft.examplePayloadText, { allowBlank: true, fallback: null });
      const payload = {
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
      setStatus(`Saved structured contract for ${routeKey} as latest.`);
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
      setStatus(`Set selected structured contract as latest for ${routeKey}.`);
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
      setStatus(`Reset ${routeKey} to default structured contract settings.`);
    } catch (err) {
      setError(err.message || 'Unable to reset route config.');
    } finally {
      setSavingLlmConfigs(false);
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
      const payload = await startOrSeedTypewriterSession(apiBaseUrl, { fragment });
      const nextSessionId = typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : '';
      if (!nextSessionId) {
        throw new Error('Session creation did not return a sessionId.');
      }
      setCurrentSessionId(nextSessionId);
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
        fragment
      });
      setStatus(`Saved fragment into session ${currentSessionId}.`);
    } catch (err) {
      setError(err.message || 'Unable to save fragment to the current session.');
    } finally {
      setSessionSaving(false);
    }
  };

  const handleClearStoredSession = () => {
    setCurrentSessionId('');
    setStatus('Cleared the stored session. Typewriter will create a fresh session on next use.');
    setError('');
  };

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

      {activeSection === 'session' ? (
      <section className="typewriterAdminSessionTools">
        <div className="typewriterAdminSessionHeader">
          <div>
            <h2>Session Bootstrap</h2>
            <p>Generate a session and optionally seed a fragment into Mongo. Clear the stored session to let the typewriter start fresh.</p>
          </div>
          <label className="typewriterAdminModeToggle">
            <input
              type="checkbox"
              checked={memorySpreadAdminEnabled}
              onChange={(event) => setMemorySpreadAdminEnabled(event.target.checked)}
            />
            <span>Enable Memory Spread admin tools</span>
          </label>
        </div>
        <div className="typewriterAdminSessionGrid">
          <label>
            Current stored session
            <input type="text" value={currentSessionId} readOnly placeholder="No session stored" />
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
            <button type="button" onClick={handleClearStoredSession} disabled={sessionSaving}>
              Clear stored session
            </button>
          </div>
        </div>
      </section>
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
            <h2>Structured Output Contracts</h2>
            <p>
              JSON-returning routes can stay in manual mode, or switch to contract mode where the prompt is rewritten
              from schema, field notes, example JSON, and extra rules.
            </p>
          </div>
        </div>
        <div className="typewriterAdminListToolbar">
          <label className="typewriterAdminFilter">
            Filter contracts
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
                  Current mode: <strong>{config.promptMode || 'manual'}</strong>
                </p>
              </header>
              {isExpanded ? (
              <>
              <div className="typewriterStructuredModeRow">
                <label>
                  Prompt mode
                  <select
                    value={draft.promptMode}
                    onChange={(event) => updateLlmRouteConfigDraft(config.routeKey, { promptMode: event.target.value })}
                  >
                    <option value="manual">Manual prompt</option>
                    <option value="contract">Contract-generated prompt</option>
                  </select>
                </label>
              </div>

              {draft.promptMode === 'manual' ? (
                <label className="typewriterStructuredField">
                  Manual prompt template
                  <textarea
                    value={draft.promptTemplate}
                    onChange={(event) => updateLlmRouteConfigDraft(config.routeKey, { promptTemplate: event.target.value })}
                    rows={8}
                    placeholder="Enter the full prompt template used by this JSON route."
                  />
                </label>
              ) : (
                <label className="typewriterStructuredField">
                  Prompt core
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
                Generated prompt preview
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

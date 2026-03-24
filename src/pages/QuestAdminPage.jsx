import React, { useEffect, useMemo, useState } from 'react';
import {
  composeQuestSceneImagePrompt,
  DEFAULT_API_BASE_URL,
  generateQuestSceneImage,
  loadQuestScreens,
  resetQuestScreens,
  resolveQuestSceneImagePath,
  saveQuestScreens,
  uploadQuestSceneImage
} from '../api/questScreens';
import {
  loadOpenAiModels,
  loadTypewriterAiSettings,
  loadTypewriterPrompts,
  saveTypewriterAiSettings,
  saveTypewriterPrompt
} from '../api/typewriterAdmin';
import QuestAdminDebugPanel from './quest-admin/QuestAdminDebugPanel';
import QuestAdminAiDraftPanel from './quest-admin/QuestAdminAiDraftPanel';
import {
  VISUAL_TRANSITION_OPTIONS,
  applyQuestAuthoringChanges,
  buildQuestScreenVisualContext
} from './quest-admin/questAdminAuthoringDraftUtils';
import {
  getInitialQuestAdminScope,
  persistQuestAdminScope,
  ROSE_COURT_PROLOGUE_SCOPE
} from '../quest/questScopeDefaults';
import {
  BASIC_SCENE_TEMPLATE,
  getAttachedSceneComponentDefinitions,
  getSceneComponentDefinition,
  getSceneComponentSlotDefinition,
  normalizeSceneComponents,
  normalizeSceneTemplate,
  normalizeScreenComponentBinding,
  normalizeScreenComponentBindings,
  SCENE_COMPONENT_REGISTRY,
  SCENE_TEMPLATE_REGISTRY
} from '../scene-runtime/sceneComponentRegistry';
import './QuestAdminPage.css';

const QUEST_API_BASE_STORAGE_KEY = 'questApiBaseUrl';
const QUEST_ADMIN_KEY_STORAGE_KEY = 'questAdminApiKey';
const DEFAULT_QUEST_SESSION_ID = ROSE_COURT_PROLOGUE_SCOPE.sessionId;
const DEFAULT_QUEST_ID = ROSE_COURT_PROLOGUE_SCOPE.questId;
const QUEST_GENERATION_PIPELINE_KEY = 'quest_generation';
const QUEST_SCENE_AUTHORING_PIPELINE_KEY = 'quest_scene_authoring';
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

const DIRECTION_OPTIONS = [
  'north',
  'south',
  'east',
  'west',
  'up',
  'down',
  'inside',
  'outside',
  'forward',
  'back',
  'center'
];

const getInitialApiBaseUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  const stored = window.localStorage.getItem(QUEST_API_BASE_STORAGE_KEY);
  return stored && stored.trim() ? stored : DEFAULT_API_BASE_URL;
};

const getInitialAdminKey = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(QUEST_ADMIN_KEY_STORAGE_KEY);
  return stored && stored.trim() ? stored : '';
};

const getInitialSessionId = () => {
  if (typeof window === 'undefined') return DEFAULT_QUEST_SESSION_ID;
  return getInitialQuestAdminScope(window.localStorage).sessionId;
};

const getInitialQuestId = () => {
  if (typeof window === 'undefined') return DEFAULT_QUEST_ID;
  return getInitialQuestAdminScope(window.localStorage).questId;
};

const slugify = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const normalizeDirection = (direction) => {
  if (!direction || typeof direction !== 'object') return null;
  const normalizedDirection = typeof direction.direction === 'string' ? direction.direction.trim().toLowerCase() : '';
  const targetScreenId = typeof direction.targetScreenId === 'string' ? direction.targetScreenId.trim() : '';
  if (!normalizedDirection || !targetScreenId) return null;
  return {
    direction: normalizedDirection,
    label: typeof direction.label === 'string' && direction.label.trim() ? direction.label.trim() : normalizedDirection,
    targetScreenId
  };
};

const normalizePromptRoute = (route) => {
  if (!route || typeof route !== 'object') return null;
  return {
    id: typeof route.id === 'string' ? route.id.trim() : '',
    description: typeof route.description === 'string' ? route.description : '',
    fromScreenIds: Array.isArray(route.fromScreenIds)
      ? [...new Set(route.fromScreenIds.map((screenId) => (typeof screenId === 'string' ? screenId.trim() : '')).filter(Boolean))]
      : [],
    matchMode: route.matchMode === 'all' ? 'all' : 'any',
    patterns: Array.isArray(route.patterns)
      ? route.patterns.map((pattern) => (typeof pattern === 'string' ? pattern : '')).filter(Boolean)
      : [],
    targetScreenId: typeof route.targetScreenId === 'string' ? route.targetScreenId.trim() : ''
  };
};

const serializePromptRoute = (route) => {
  const normalized = normalizePromptRoute(route);
  if (!normalized) {
    return {
      id: '',
      description: '',
      fromScreenIds: [],
      matchMode: 'any',
      patterns: [],
      targetScreenId: ''
    };
  }
  return normalized;
};

const promptRouteAppliesToScreen = (route, screenId = '') => {
  if (!screenId || !route || typeof route !== 'object') return false;
  if (!Array.isArray(route.fromScreenIds) || route.fromScreenIds.length === 0) return true;
  return route.fromScreenIds.includes(screenId);
};

const getPromptRouteScope = (route, selectedScreenId = '') => {
  if (!route || typeof route !== 'object') return 'current';
  if (!Array.isArray(route.fromScreenIds) || route.fromScreenIds.length === 0) return 'all';
  if (
    selectedScreenId
    && route.fromScreenIds.length === 1
    && route.fromScreenIds[0] === selectedScreenId
  ) {
    return 'current';
  }
  return 'custom';
};

const normalizeScreen = (screen) => {
  if (!screen || typeof screen !== 'object') return null;
  const id = typeof screen.id === 'string' ? screen.id.trim() : '';
  if (!id) return null;
  return {
    id,
    title: typeof screen.title === 'string' && screen.title.trim() ? screen.title.trim() : id,
    prompt: typeof screen.prompt === 'string' ? screen.prompt : '',
    imageUrl: typeof screen.imageUrl === 'string' ? screen.imageUrl.trim() : '',
    image_prompt: typeof screen.image_prompt === 'string' ? screen.image_prompt : '',
    referenceImagePrompt: typeof screen.referenceImagePrompt === 'string' ? screen.referenceImagePrompt : '',
    visualContinuityGuidance: typeof screen.visualContinuityGuidance === 'string' ? screen.visualContinuityGuidance : '',
    visualTransitionIntent: ['inherit', 'drift', 'break'].includes(
      typeof screen.visualTransitionIntent === 'string' ? screen.visualTransitionIntent.trim().toLowerCase() : ''
    )
      ? screen.visualTransitionIntent.trim().toLowerCase()
      : 'inherit',
    screenType: screen.screenType === 'generated' ? 'generated' : 'authored',
    parentScreenId: typeof screen.parentScreenId === 'string' ? screen.parentScreenId.trim() : '',
    anchorScreenId: typeof screen.anchorScreenId === 'string' ? screen.anchorScreenId.trim() : '',
    expectationSummary: typeof screen.expectationSummary === 'string' ? screen.expectationSummary : '',
    continuitySummary: typeof screen.continuitySummary === 'string' ? screen.continuitySummary : '',
    generatedFromPrompt: typeof screen.generatedFromPrompt === 'string' ? screen.generatedFromPrompt : '',
    generatedByPlayerId: typeof screen.generatedByPlayerId === 'string' ? screen.generatedByPlayerId.trim() : '',
    generatedAt: typeof screen.generatedAt === 'string' ? screen.generatedAt : '',
    promptGuidance: typeof screen.promptGuidance === 'string' ? screen.promptGuidance : '',
    sceneEndCondition: typeof screen.sceneEndCondition === 'string' ? screen.sceneEndCondition : '',
    promptRoutes: Array.isArray(screen.promptRoutes) ? screen.promptRoutes : [],
    stageLayout: typeof screen.stageLayout === 'string' ? screen.stageLayout : '',
    stageModules: Array.isArray(screen.stageModules) ? screen.stageModules : [],
    textPromptPlaceholder:
      typeof screen.textPromptPlaceholder === 'string' && screen.textPromptPlaceholder.trim()
        ? screen.textPromptPlaceholder.trim()
        : 'What do you do?',
    componentBindings: normalizeScreenComponentBindings(screen.componentBindings),
    directions: Array.isArray(screen.directions)
      ? screen.directions.map(normalizeDirection).filter(Boolean)
      : []
  };
};

const normalizeConfig = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const screens = Array.isArray(source.screens)
    ? source.screens.map(normalizeScreen).filter(Boolean)
    : [];

  if (!screens.length) {
    return {
      sessionId:
        typeof source.sessionId === 'string' && source.sessionId.trim()
          ? source.sessionId.trim()
          : DEFAULT_QUEST_SESSION_ID,
      questId:
        typeof source.questId === 'string' && source.questId.trim()
          ? source.questId.trim()
          : DEFAULT_QUEST_ID,
      sceneName: typeof source.sceneName === 'string' ? source.sceneName : '',
      sceneTemplate: normalizeSceneTemplate(source.sceneTemplate),
      sceneComponents: normalizeSceneComponents(source.sceneComponents),
      startScreenId: '',
      authoringBrief: typeof source.authoringBrief === 'string' ? source.authoringBrief : '',
      phaseGuidance: typeof source.phaseGuidance === 'string' ? source.phaseGuidance : '',
      visualStyleGuide: typeof source.visualStyleGuide === 'string' ? source.visualStyleGuide : '',
      promptRoutes: Array.isArray(source.promptRoutes) ? source.promptRoutes.map(normalizePromptRoute).filter(Boolean) : [],
      screens: [],
      updatedAt: ''
    };
  }

  const screenIds = new Set(screens.map((screen) => screen.id));
  const filteredScreens = screens.map((screen) => ({
    ...screen,
    directions: screen.directions.filter((direction) => screenIds.has(direction.targetScreenId))
  }));

  const requestedStartScreenId = typeof source.startScreenId === 'string' ? source.startScreenId.trim() : '';

  return {
    sessionId:
      typeof source.sessionId === 'string' && source.sessionId.trim()
        ? source.sessionId.trim()
        : DEFAULT_QUEST_SESSION_ID,
    questId:
      typeof source.questId === 'string' && source.questId.trim()
        ? source.questId.trim()
        : DEFAULT_QUEST_ID,
    sceneName: typeof source.sceneName === 'string' ? source.sceneName : '',
    sceneTemplate: normalizeSceneTemplate(source.sceneTemplate),
    sceneComponents: normalizeSceneComponents(source.sceneComponents),
    startScreenId: screenIds.has(requestedStartScreenId) ? requestedStartScreenId : filteredScreens[0].id,
    authoringBrief: typeof source.authoringBrief === 'string' ? source.authoringBrief : '',
    phaseGuidance: typeof source.phaseGuidance === 'string' ? source.phaseGuidance : '',
    visualStyleGuide: typeof source.visualStyleGuide === 'string' ? source.visualStyleGuide : '',
    promptRoutes: Array.isArray(source.promptRoutes) ? source.promptRoutes.map(normalizePromptRoute).filter(Boolean) : [],
    screens: filteredScreens,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
  };
};

const createNewScreenId = (existingScreens) => {
  const existingIds = new Set(existingScreens.map((screen) => screen.id));
  let nextId = 'new_screen';
  let index = 2;
  while (existingIds.has(nextId)) {
    nextId = `new_screen_${index}`;
    index += 1;
  }
  return nextId;
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Never';
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return 'Never';
  return new Date(parsed).toLocaleString();
};

const getScreenLabel = (screen) => {
  if (!screen || typeof screen !== 'object') return '';
  return typeof screen.title === 'string' && screen.title.trim() ? screen.title.trim() : screen.id || '';
};

const getTextModelOptions = (models, currentModel, provider = 'openai') => {
  const normalizedProvider = provider === 'anthropic' ? 'anthropic' : 'openai';
  const providerPayload = models?.providers?.[normalizedProvider];
  const sourceModels = Array.isArray(providerPayload?.textModels)
    ? providerPayload.textModels
    : normalizedProvider === 'openai'
      ? models?.textModels
      : [];
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

const getImageModelOptions = (models, currentModel) => {
  const providerPayload = models?.providers?.openai;
  const sourceModels = Array.isArray(providerPayload?.imageModels)
    ? providerPayload.imageModels
    : Array.isArray(models?.imageModels)
      ? models.imageModels
      : [];
  const modelIds = sourceModels
    .map((entry) => (typeof entry?.id === 'string' ? entry.id.trim() : ''))
    .filter(Boolean);
  if (currentModel && !modelIds.includes(currentModel)) {
    modelIds.unshift(currentModel);
  }
  return Array.from(new Set(modelIds));
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

const QuestAdminPage = ({
  initialApiBaseUrl = getInitialApiBaseUrl(),
  initialAdminKey = getInitialAdminKey(),
  initialSessionId = getInitialSessionId(),
  initialQuestId = getInitialQuestId()
}) => {
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [adminKey, setAdminKey] = useState(initialAdminKey);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [questId, setQuestId] = useState(initialQuestId);
  const [config, setConfig] = useState(null);
  const [selectedScreenId, setSelectedScreenId] = useState('');
  const [screenIdDraft, setScreenIdDraft] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiSettings, setAiSettings] = useState(null);
  const [models, setModels] = useState(EMPTY_MODELS_PAYLOAD);
  const [questPromptEntry, setQuestPromptEntry] = useState(null);
  const [questPromptDraft, setQuestPromptDraft] = useState('');
  const [authoringPromptEntry, setAuthoringPromptEntry] = useState(null);
  const [authoringPromptDraft, setAuthoringPromptDraft] = useState('');
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeSaving, setRuntimeSaving] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);
  const [uploadingSceneImage, setUploadingSceneImage] = useState(false);
  const [generatingSceneImage, setGeneratingSceneImage] = useState(false);
  const [sceneImageModel, setSceneImageModel] = useState('');
  const [sceneImagePromptPreview, setSceneImagePromptPreview] = useState('');
  const [sceneImagePromptLoading, setSceneImagePromptLoading] = useState(false);
  const [sceneImagePromptError, setSceneImagePromptError] = useState('');
  const [sceneImageResolvedPath, setSceneImageResolvedPath] = useState(null);
  const [sceneImageResolvedPathLoading, setSceneImageResolvedPathLoading] = useState(false);
  const [sceneImageResolvedPathError, setSceneImageResolvedPathError] = useState('');
  const [runtimeStatus, setRuntimeStatus] = useState('');
  const [runtimeError, setRuntimeError] = useState('');
  const [sceneImageStatus, setSceneImageStatus] = useState('');
  const [sceneImageError, setSceneImageError] = useState('');

  const selectedScreen = useMemo(
    () => config?.screens?.find((screen) => screen.id === selectedScreenId) || null,
    [config, selectedScreenId]
  );
  const selectedScreenPromptRoutes = useMemo(() => {
    if (!config || !selectedScreenId) return [];
    return (Array.isArray(config.promptRoutes) ? config.promptRoutes : [])
      .map((route, index) => ({ route, index }))
      .filter(({ route }) => promptRouteAppliesToScreen(route, selectedScreenId));
  }, [config, selectedScreenId]);
  const questGenerationSettings = useMemo(
    () => aiSettings?.pipelines?.[QUEST_GENERATION_PIPELINE_KEY] || null,
    [aiSettings]
  );
  const questSceneAuthoringSettings = useMemo(
    () => aiSettings?.pipelines?.[QUEST_SCENE_AUTHORING_PIPELINE_KEY] || null,
    [aiSettings]
  );
  const questGenerationModelOptions = useMemo(
    () => getTextModelOptions(models, questGenerationSettings?.model || '', questGenerationSettings?.provider || 'openai'),
    [models, questGenerationSettings]
  );
  const questSceneAuthoringModelOptions = useMemo(
    () => getTextModelOptions(
      models,
      questSceneAuthoringSettings?.model || '',
      questSceneAuthoringSettings?.provider || 'openai'
    ),
    [models, questSceneAuthoringSettings]
  );
  const sceneImageModelOptions = useMemo(
    () => getImageModelOptions(models, sceneImageModel),
    [models, sceneImageModel]
  );
  const selectedScreenVisualContext = useMemo(
    () => buildQuestScreenVisualContext(config, selectedScreenId),
    [config, selectedScreenId]
  );
  const attachedSceneComponentDefinitions = useMemo(
    () => getAttachedSceneComponentDefinitions(config?.sceneComponents || []),
    [config?.sceneComponents]
  );

  const buildSceneImagePromptPayload = () => {
    if (!selectedScreen) return null;
    return {
      sessionId,
      questId,
      sceneName: config?.sceneName || '',
      sceneTemplate: config?.sceneTemplate || BASIC_SCENE_TEMPLATE,
      sceneComponents: Array.isArray(config?.sceneComponents) ? config.sceneComponents : [],
      screenId: selectedScreen.id,
      screenTitle: selectedScreen.title || selectedScreen.id,
      screenPrompt: selectedScreen.prompt || '',
      authoringBrief: config?.authoringBrief || '',
      visualStyleGuide: config?.visualStyleGuide || '',
      referenceImagePrompt: selectedScreen.referenceImagePrompt || '',
      image_prompt: selectedScreen.image_prompt || '',
      visualContinuityGuidance: selectedScreen.visualContinuityGuidance || '',
      visualTransitionIntent: selectedScreen.visualTransitionIntent || 'inherit',
      incomingContext: selectedScreenVisualContext.incoming.map((entry) => ({
        via: entry.via,
        title: entry.screen?.title || entry.screen?.id || '',
        referenceImagePrompt: entry.screen?.referenceImagePrompt || '',
        image_prompt: entry.screen?.image_prompt || '',
        visualContinuityGuidance: entry.screen?.visualContinuityGuidance || '',
        prompt: entry.screen?.prompt || ''
      })),
      outgoingContext: selectedScreenVisualContext.outgoing.map((entry) => ({
        via: entry.via,
        title: entry.screen?.title || entry.screen?.id || '',
        referenceImagePrompt: entry.screen?.referenceImagePrompt || '',
        image_prompt: entry.screen?.image_prompt || '',
        visualContinuityGuidance: entry.screen?.visualContinuityGuidance || '',
        prompt: entry.screen?.prompt || ''
      }))
    };
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_API_BASE_STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_ADMIN_KEY_STORAGE_KEY, adminKey);
  }, [adminKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistQuestAdminScope(window.localStorage, { sessionId, questId });
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistQuestAdminScope(window.localStorage, { sessionId, questId });
  }, [questId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      setStatus('');
      try {
        const payload = await loadQuestScreens(apiBaseUrl, { sessionId, questId });
        if (!active) return;
        const normalized = normalizeConfig(payload);
        setSessionId(normalized.sessionId || sessionId);
        setQuestId(normalized.questId || questId);
        setConfig(normalized);
        setSelectedScreenId((prev) => {
          if (prev && normalized.screens.some((screen) => screen.id === prev)) {
            return prev;
          }
          return normalized.startScreenId || normalized.screens[0]?.id || '';
        });
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load quest screens.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, sessionId, questId]);

  useEffect(() => {
    setScreenIdDraft(selectedScreen?.id || '');
  }, [selectedScreen]);

  useEffect(() => {
    setSceneImageStatus('');
    setSceneImageError('');
  }, [selectedScreenId]);

  useEffect(() => {
    if (!sceneImageModelOptions.length) return;
    if (sceneImageModel && sceneImageModelOptions.includes(sceneImageModel)) return;
    setSceneImageModel(sceneImageModelOptions[0]);
  }, [sceneImageModelOptions, sceneImageModel]);

  useEffect(() => {
    let active = true;
    const payload = buildSceneImagePromptPayload();

    if (!payload) {
      setSceneImagePromptPreview('');
      setSceneImagePromptError('');
      setSceneImagePromptLoading(false);
      return () => {
        active = false;
      };
    }

    setSceneImagePromptLoading(true);
    setSceneImagePromptError('');

    const timer = window.setTimeout(async () => {
      try {
        const response = await composeQuestSceneImagePrompt(
          apiBaseUrl,
          payload,
          {
            adminKey: adminKey.trim() ? adminKey.trim() : undefined
          }
        );
        if (!active) return;
        setSceneImagePromptPreview(response.composedPrompt || '');
      } catch (err) {
        if (!active) return;
        setSceneImagePromptPreview('');
        setSceneImagePromptError(err.message || 'Unable to compose the full scene image prompt.');
      } finally {
        if (!active) return;
        setSceneImagePromptLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    apiBaseUrl,
    adminKey,
    sessionId,
    questId,
    config?.sceneName,
    config?.sceneTemplate,
    config?.sceneComponents,
    config?.authoringBrief,
    config?.visualStyleGuide,
    selectedScreen,
    selectedScreenVisualContext
  ]);

  useEffect(() => {
    let active = true;
    const imageUrl = selectedScreen?.imageUrl || '';

    if (!imageUrl) {
      setSceneImageResolvedPath(null);
      setSceneImageResolvedPathError('');
      setSceneImageResolvedPathLoading(false);
      return () => {
        active = false;
      };
    }

    setSceneImageResolvedPathLoading(true);
    setSceneImageResolvedPathError('');

    const timer = window.setTimeout(async () => {
      try {
        const response = await resolveQuestSceneImagePath(
          apiBaseUrl,
          { imageUrl },
          {
            adminKey: adminKey.trim() ? adminKey.trim() : undefined
          }
        );
        if (!active) return;
        setSceneImageResolvedPath(response);
      } catch (err) {
        if (!active) return;
        setSceneImageResolvedPath(null);
        setSceneImageResolvedPathError(err.message || 'Unable to resolve the local image path.');
      } finally {
        if (!active) return;
        setSceneImageResolvedPathLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [apiBaseUrl, adminKey, selectedScreen?.imageUrl]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setRuntimeLoading(true);
      setRuntimeError('');
      try {
        const trimmedAdminKey = adminKey.trim() ? adminKey.trim() : undefined;
        const [settingsPayload, modelsPayload, promptsPayload] = await Promise.all([
          loadTypewriterAiSettings(apiBaseUrl, { adminKey: trimmedAdminKey }),
          loadOpenAiModels(apiBaseUrl, { adminKey: trimmedAdminKey }),
          loadTypewriterPrompts(apiBaseUrl, { adminKey: trimmedAdminKey })
        ]);
        if (!active) return;
        setAiSettings(settingsPayload || { pipelines: {} });
        setModels(modelsPayload || EMPTY_MODELS_PAYLOAD);
        const questGenerationPromptEntry = promptsPayload?.pipelines?.[QUEST_GENERATION_PIPELINE_KEY] || null;
        const questSceneAuthoringPromptEntry = promptsPayload?.pipelines?.[QUEST_SCENE_AUTHORING_PIPELINE_KEY] || null;
        setQuestPromptEntry(questGenerationPromptEntry);
        setQuestPromptDraft(questGenerationPromptEntry?.promptTemplate || '');
        setAuthoringPromptEntry(questSceneAuthoringPromptEntry);
        setAuthoringPromptDraft(questSceneAuthoringPromptEntry?.promptTemplate || '');
      } catch (err) {
        if (active) {
          setRuntimeError(err.message || 'Unable to load quest generator settings.');
        }
      } finally {
        if (active) {
          setRuntimeLoading(false);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, adminKey]);

  const updateScreenById = (screenId, updater) => {
    if (!screenId) return;
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        screens: prev.screens.map((screen) => {
          if (screen.id !== screenId) return screen;
          return updater(screen);
        })
      };
    });
  };

  const updateSelectedScreen = (updater) => {
    updateScreenById(selectedScreenId, updater);
  };

  const updatePromptRoutes = (updater) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        promptRoutes: updater(Array.isArray(prev.promptRoutes) ? prev.promptRoutes : [])
      };
    });
  };

  const updateSelectedScreenComponentBindings = (updater) => {
    updateSelectedScreen((screen) => ({
      ...screen,
      componentBindings: normalizeScreenComponentBindings(
        updater(Array.isArray(screen.componentBindings) ? screen.componentBindings : [])
      )
    }));
  };

  const handleAddScreenComponentBinding = () => {
    if (!attachedSceneComponentDefinitions.length) return;
    const component = attachedSceneComponentDefinitions[0];
    const slot = component?.slots?.[0];
    if (!component || !slot) return;
    updateSelectedScreenComponentBindings((bindings) => ([
      ...bindings,
      normalizeScreenComponentBinding({
        componentId: component.id,
        slot: slot.id,
        props: {}
      })
    ]));
  };

  const handleScreenComponentBindingFieldChange = (bindingIndex, field, value) => {
    updateSelectedScreenComponentBindings((bindings) => bindings.map((binding, index) => {
      if (index !== bindingIndex) return binding;
      if (field === 'componentId') {
        const nextComponent = getSceneComponentDefinition(value);
        const nextSlot = nextComponent?.slots?.[0]?.id || '';
        return normalizeScreenComponentBinding({
          ...binding,
          componentId: value,
          slot: nextSlot,
          props: {}
        });
      }
      if (field === 'slot') {
        return normalizeScreenComponentBinding({
          ...binding,
          slot: value,
          props: {}
        });
      }
      return binding;
    }).filter(Boolean));
  };

  const handleScreenComponentBindingPropChange = (bindingIndex, key, value) => {
    updateSelectedScreenComponentBindings((bindings) => bindings.map((binding, index) => {
      if (index !== bindingIndex) return binding;
      return normalizeScreenComponentBinding({
        ...binding,
        props: {
          ...(binding.props || {}),
          [key]: value
        }
      });
    }).filter(Boolean));
  };

  const handleRemoveScreenComponentBinding = (bindingIndex) => {
    updateSelectedScreenComponentBindings((bindings) => bindings.filter((_, index) => index !== bindingIndex));
    setStatus('Screen component binding removed.');
    setError('');
  };

  const toggleSceneComponent = (componentId, checked) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const current = normalizeSceneComponents(prev.sceneComponents);
      const nextComponents = checked
        ? normalizeSceneComponents([...current, componentId])
        : current.filter((entry) => entry !== componentId);
      return {
        ...prev,
        sceneComponents: nextComponents,
        screens: Array.isArray(prev.screens)
          ? prev.screens.map((screen) => ({
              ...screen,
              componentBindings: normalizeScreenComponentBindings(screen.componentBindings)
                .filter((binding) => nextComponents.includes(binding.componentId))
            }))
          : prev.screens
      };
    });
  };

  const handleAddScreen = () => {
    setConfig((prev) => {
      if (!prev) return prev;
      const nextId = createNewScreenId(prev.screens);
      const nextScreen = {
        id: nextId,
        title: 'Untitled Screen',
        prompt: '',
        imageUrl: '',
        image_prompt: 'Cinematic fantasy quest scene, ruined rose-court setting, weathered stone architecture, dusk atmosphere.',
        referenceImagePrompt: '',
        visualContinuityGuidance: '',
        visualTransitionIntent: 'inherit',
        screenType: 'authored',
        parentScreenId: '',
        anchorScreenId: '',
        expectationSummary: '',
        continuitySummary: '',
        generatedFromPrompt: '',
        generatedByPlayerId: '',
        generatedAt: '',
        promptGuidance: '',
        sceneEndCondition: '',
        promptRoutes: [],
        stageLayout: '',
        stageModules: [],
        textPromptPlaceholder: 'What do you do?',
        componentBindings: [],
        directions: []
      };
      const next = {
        ...prev,
        startScreenId: prev.startScreenId || nextId,
        screens: [...prev.screens, nextScreen]
      };
      setSelectedScreenId(nextId);
      return next;
    });
    setStatus('Screen added.');
    setError('');
  };

  const handleRemoveSelectedScreen = () => {
    if (!config || !selectedScreen) return;
    if (config.screens.length <= 1) {
      setError('At least one screen is required.');
      return;
    }

    const removedId = selectedScreen.id;
    const remainingScreens = config.screens
      .filter((screen) => screen.id !== removedId)
      .map((screen) => ({
        ...screen,
        directions: screen.directions.filter((direction) => direction.targetScreenId !== removedId)
      }));

    const nextStartScreenId = config.startScreenId === removedId
      ? remainingScreens[0].id
      : config.startScreenId;

    setConfig({
      ...config,
      startScreenId: nextStartScreenId,
      promptRoutes: (Array.isArray(config.promptRoutes) ? config.promptRoutes : [])
        .filter((route) => route?.targetScreenId !== removedId)
        .map((route) => ({
          ...route,
          fromScreenIds: Array.isArray(route?.fromScreenIds)
            ? route.fromScreenIds.filter((screenId) => screenId !== removedId)
            : []
        })),
      screens: remainingScreens
    });
    setSelectedScreenId(remainingScreens[0].id);
    setStatus(`Removed screen "${removedId}".`);
    setError('');
  };

  const handleCommitScreenId = () => {
    if (!config || !selectedScreen) return;
    const nextId = slugify(screenIdDraft);

    if (!nextId) {
      setScreenIdDraft(selectedScreen.id);
      setError('Screen ID must include letters or numbers.');
      return;
    }

    if (nextId === selectedScreen.id) {
      setScreenIdDraft(nextId);
      return;
    }

    const idCollision = config.screens.some((screen) => screen.id === nextId);
    if (idCollision) {
      setScreenIdDraft(selectedScreen.id);
      setError(`Screen ID "${nextId}" already exists.`);
      return;
    }

    const oldId = selectedScreen.id;
    const renamedScreens = config.screens.map((screen) => {
      const nextScreen = screen.id === oldId ? { ...screen, id: nextId } : screen;
      return {
        ...nextScreen,
        directions: nextScreen.directions.map((direction) => ({
          ...direction,
          targetScreenId: direction.targetScreenId === oldId ? nextId : direction.targetScreenId
        }))
      };
    });

    setConfig({
      ...config,
      startScreenId: config.startScreenId === oldId ? nextId : config.startScreenId,
      promptRoutes: (Array.isArray(config.promptRoutes) ? config.promptRoutes : []).map((route) => ({
        ...route,
        targetScreenId: route?.targetScreenId === oldId ? nextId : route?.targetScreenId,
        fromScreenIds: Array.isArray(route?.fromScreenIds)
          ? route.fromScreenIds.map((screenId) => (screenId === oldId ? nextId : screenId))
          : []
      })),
      screens: renamedScreens
    });
    setSelectedScreenId(nextId);
    setScreenIdDraft(nextId);
    setStatus('Screen ID updated.');
    setError('');
  };

  const handleAddDirection = () => {
    if (!config || !selectedScreen) return;
    updateSelectedScreen((screen) => ({
      ...screen,
      directions: [
        ...screen.directions,
        {
          direction: 'north',
          label: 'Go north',
          targetScreenId: config.startScreenId || config.screens[0]?.id || screen.id
        }
      ]
    }));
    setStatus('Direction added.');
  };

  const handleDirectionFieldChange = (directionIndex, field, value) => {
    updateSelectedScreen((screen) => ({
      ...screen,
      directions: screen.directions.map((direction, index) => {
        if (index !== directionIndex) return direction;
        if (field === 'direction') {
          const normalizedDirection = String(value || '').trim().toLowerCase();
          return {
            ...direction,
            direction: normalizedDirection,
            label: direction.label && direction.label !== direction.direction ? direction.label : normalizedDirection
          };
        }
        return {
          ...direction,
          [field]: value
        };
      })
    }));
  };

  const handleDirectionRemove = (directionIndex) => {
    updateSelectedScreen((screen) => ({
      ...screen,
      directions: screen.directions.filter((_, index) => index !== directionIndex)
    }));
  };

  const handleAddPromptRoute = () => {
    if (!selectedScreenId) return;
    updatePromptRoutes((routes) => [
      ...routes,
      {
        id: '',
        description: '',
        fromScreenIds: [selectedScreenId],
        matchMode: 'any',
        patterns: [],
        targetScreenId: ''
      }
    ]);
    setStatus('Free-text route added.');
    setError('');
  };

  const updatePromptRouteAtIndex = (routeIndex, updater) => {
    updatePromptRoutes((routes) =>
      routes.map((route, index) => {
        if (index !== routeIndex) return route;
        return serializePromptRoute(updater(route));
      })
    );
  };

  const handlePromptRouteFieldChange = (routeIndex, field, value) => {
    updatePromptRouteAtIndex(routeIndex, (route) => ({
      ...route,
      [field]: value
    }));
  };

  const handlePromptRoutePatternsChange = (routeIndex, value) => {
    const patterns = String(value || '')
      .split('\n')
      .map((pattern) => pattern.trim())
      .filter(Boolean);
    updatePromptRouteAtIndex(routeIndex, (route) => ({
      ...route,
      patterns
    }));
  };

  const handlePromptRouteScopeChange = (routeIndex, scope) => {
    updatePromptRouteAtIndex(routeIndex, (route) => {
      if (scope === 'all') {
        return {
          ...route,
          fromScreenIds: []
        };
      }
      if (scope === 'custom') {
        const baseIds = Array.isArray(route.fromScreenIds) && route.fromScreenIds.length
          ? route.fromScreenIds
          : selectedScreenId
            ? [selectedScreenId]
            : [];
        return {
          ...route,
          fromScreenIds: baseIds
        };
      }
      return {
        ...route,
        fromScreenIds: selectedScreenId ? [selectedScreenId] : []
      };
    });
  };

  const handlePromptRouteSourceScreenToggle = (routeIndex, screenId, checked) => {
    updatePromptRouteAtIndex(routeIndex, (route) => {
      const currentIds = Array.isArray(route.fromScreenIds) ? route.fromScreenIds : [];
      const toggledIds = checked
        ? [...new Set([...currentIds, screenId])]
        : currentIds.filter((id) => id !== screenId);
      const nextIds = toggledIds.length === 0 && selectedScreenId
        ? [selectedScreenId]
        : toggledIds;
      return {
        ...route,
        fromScreenIds: nextIds
      };
    });
  };

  const handlePromptRouteRemove = (routeIndex) => {
    updatePromptRoutes((routes) => routes.filter((_, index) => index !== routeIndex));
    setStatus('Free-text route removed.');
    setError('');
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setError('');
    setStatus('');

    try {
      const payload = {
        sessionId,
        questId,
        sceneName: config.sceneName,
        sceneTemplate: config.sceneTemplate,
        sceneComponents: config.sceneComponents,
        startScreenId: config.startScreenId,
        authoringBrief: config.authoringBrief,
        phaseGuidance: config.phaseGuidance,
        visualStyleGuide: config.visualStyleGuide,
        promptRoutes: (Array.isArray(config.promptRoutes) ? config.promptRoutes : []).map(serializePromptRoute),
        screens: config.screens
      };
      const saved = await saveQuestScreens(apiBaseUrl, payload, {
        adminKey: adminKey.trim() ? adminKey.trim() : undefined
      });
      const normalized = normalizeConfig(saved);
      setConfig(normalized);
      setSelectedScreenId((prev) => {
        if (prev && normalized.screens.some((screen) => screen.id === prev)) {
          return prev;
        }
        return normalized.startScreenId || normalized.screens[0]?.id || '';
      });
      setStatus('Quest screens saved successfully.');
    } catch (err) {
      setError(err.message || 'Unable to save quest screens.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError('');
    setStatus('');

    try {
      const payload = await resetQuestScreens(
        apiBaseUrl,
        { sessionId, questId },
        { adminKey: adminKey.trim() ? adminKey.trim() : undefined }
      );
      const normalized = normalizeConfig(payload);
      setConfig(normalized);
      setSessionId(normalized.sessionId || sessionId);
      setQuestId(normalized.questId || questId);
      setSelectedScreenId(normalized.startScreenId || normalized.screens[0]?.id || '');
      setStatus('Quest screens reset to defaults.');
    } catch (err) {
      setError(err.message || 'Unable to reset quest screens.');
    } finally {
      setSaving(false);
    }
  };

  const updatePipelineSettings = (pipelineKey, patch) => {
    setAiSettings((prev) => {
      const current = prev?.pipelines?.[pipelineKey] || {
        provider: 'openai',
        model: '',
        useMock: false
      };
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

  const updateQuestGenerationSettings = (patch) => {
    updatePipelineSettings(QUEST_GENERATION_PIPELINE_KEY, patch);
  };

  const updateQuestSceneAuthoringSettings = (patch) => {
    updatePipelineSettings(QUEST_SCENE_AUTHORING_PIPELINE_KEY, patch);
  };

  const savePipelineRuntime = async (pipelineKey) => {
    const settings = aiSettings?.pipelines?.[pipelineKey];
    if (!settings) {
      throw new Error('Pipeline settings are unavailable.');
    }

    const payload = await saveTypewriterAiSettings(
      apiBaseUrl,
      {
        pipelines: {
          [pipelineKey]: {
            provider: settings.provider || 'openai',
            model: settings.model || '',
            useMock: Boolean(settings.useMock)
          }
        }
      },
      {
        adminKey: adminKey.trim() ? adminKey.trim() : undefined,
        updatedBy: 'quest-admin-ui'
      }
    );
    setAiSettings(payload || { pipelines: {} });
    return payload;
  };

  const savePipelinePrompt = async (pipelineKey, promptDraft) => {
    if (!String(promptDraft || '').trim()) {
      throw new Error('Prompt cannot be empty.');
    }

    const trimmedAdminKey = adminKey.trim() ? adminKey.trim() : undefined;
    await saveTypewriterPrompt(apiBaseUrl, pipelineKey, promptDraft, {
      adminKey: trimmedAdminKey,
      updatedBy: 'quest-admin-ui',
      markLatest: true
    });
    const promptsPayload = await loadTypewriterPrompts(apiBaseUrl, { adminKey: trimmedAdminKey });
    const promptEntry = promptsPayload?.pipelines?.[pipelineKey] || null;
    if (pipelineKey === QUEST_GENERATION_PIPELINE_KEY) {
      setQuestPromptEntry(promptEntry);
      setQuestPromptDraft(promptEntry?.promptTemplate || promptDraft);
    }
    if (pipelineKey === QUEST_SCENE_AUTHORING_PIPELINE_KEY) {
      setAuthoringPromptEntry(promptEntry);
      setAuthoringPromptDraft(promptEntry?.promptTemplate || promptDraft);
    }
    return promptEntry;
  };

  const handleSaveQuestRuntime = async () => {
    if (!questGenerationSettings) return;

    setRuntimeSaving(true);
    setRuntimeError('');
    setRuntimeStatus('');

    try {
      await savePipelineRuntime(QUEST_GENERATION_PIPELINE_KEY);
      setRuntimeStatus('Saved quest generator runtime.');
    } catch (err) {
      setRuntimeError(err.message || 'Unable to save quest generator runtime.');
    } finally {
      setRuntimeSaving(false);
    }
  };

  const handleSaveQuestPrompt = async () => {
    if (!questPromptDraft.trim()) {
      setRuntimeError('Quest generator prompt cannot be empty.');
      setRuntimeStatus('');
      return;
    }

    setPromptSaving(true);
    setRuntimeError('');
    setRuntimeStatus('');

    try {
      await savePipelinePrompt(QUEST_GENERATION_PIPELINE_KEY, questPromptDraft);
      setRuntimeStatus('Saved quest generator prompt to the prompt store.');
    } catch (err) {
      setRuntimeError(err.message || 'Unable to save quest generator prompt.');
    } finally {
      setPromptSaving(false);
    }
  };

  const handleSceneImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedScreen) return;

    setUploadingSceneImage(true);
    setSceneImageError('');
    setSceneImageStatus('');

    const activeScreenId = selectedScreen.id;
    const activeScreenTitle = selectedScreen.title || selectedScreen.id;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploadPayload = await uploadQuestSceneImage(
        apiBaseUrl,
        {
          sessionId,
          questId,
          screenId: activeScreenId,
          filename: file.name,
          dataUrl
        },
        {
          adminKey: adminKey.trim() ? adminKey.trim() : undefined
        }
      );
      updateScreenById(activeScreenId, (screen) => ({
        ...screen,
        imageUrl: uploadPayload.imageUrl || screen.imageUrl
      }));
      setSceneImageStatus(`Uploaded a new image for ${activeScreenTitle}. Save Scene to persist it.`);
    } catch (err) {
      setSceneImageError(err.message || 'Unable to upload scene image.');
    } finally {
      setUploadingSceneImage(false);
    }
  };

  const handleGenerateSceneImage = async () => {
    if (!selectedScreen) return;

    setGeneratingSceneImage(true);
    setSceneImageError('');
    setSceneImageStatus('');

    const activeScreenId = selectedScreen.id;
    const activeScreenTitle = selectedScreen.title || selectedScreen.id;

    try {
      const composePayload = buildSceneImagePromptPayload();
      let promptToUse = sceneImagePromptPreview || '';
      if (composePayload) {
        const composed = await composeQuestSceneImagePrompt(
          apiBaseUrl,
          composePayload,
          {
            adminKey: adminKey.trim() ? adminKey.trim() : undefined
          }
        );
        promptToUse = composed.composedPrompt || promptToUse;
        setSceneImagePromptPreview(promptToUse);
      }

      const payload = await generateQuestSceneImage(
        apiBaseUrl,
        {
          sessionId,
          questId,
          screenId: activeScreenId,
          screenTitle: activeScreenTitle,
          prompt: promptToUse,
          referenceImagePrompt: selectedScreen.referenceImagePrompt || '',
          image_prompt: selectedScreen.image_prompt || '',
          imageModel: sceneImageModel || ''
        },
        {
          adminKey: adminKey.trim() ? adminKey.trim() : undefined
        }
      );
      updateScreenById(activeScreenId, (screen) => ({
        ...screen,
        imageUrl: payload.imageUrl || screen.imageUrl
      }));
      const modelLabel = payload.model ? ` with ${payload.model}` : '';
      setSceneImageStatus(`Generated a new image for ${activeScreenTitle}${modelLabel}. Save Scene to persist it.`);
    } catch (err) {
      setSceneImageError(err.message || 'Unable to generate scene image.');
    } finally {
      setGeneratingSceneImage(false);
    }
  };

  const handleCopySceneImagePrompt = async () => {
    if (!sceneImagePromptPreview) return;
    try {
      await navigator.clipboard.writeText(sceneImagePromptPreview);
      setSceneImageStatus('Copied the full text-to-image prompt to the clipboard.');
      setSceneImageError('');
    } catch (err) {
      setSceneImageError(err.message || 'Unable to copy the full scene image prompt.');
      setSceneImageStatus('');
    }
  };

  const handleCopySceneImagePath = async (value, successMessage) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setSceneImageStatus(successMessage);
      setSceneImageError('');
    } catch (err) {
      setSceneImageError(err.message || 'Unable to copy the local image path.');
      setSceneImageStatus('');
    }
  };

  const handleApplyAuthoringDraft = (changes, selectedChangeIds) => {
    if (!config) return;
    const result = applyQuestAuthoringChanges(config, changes, selectedChangeIds);
    setConfig(result.config);
    if (result.selectedScreenId) {
      setSelectedScreenId(result.selectedScreenId);
    }
    setStatus(`Applied ${selectedChangeIds.length} AI drafted change${selectedChangeIds.length === 1 ? '' : 's'} to the editor.`);
    setError('');
  };

  const promptSourceLabel = questPromptEntry?.meta?.fallbackFromCode
    ? `Code default (${questPromptEntry?.meta?.source || 'backend'})`
    : questPromptEntry?.version
      ? `Database version ${questPromptEntry.version}`
      : 'Not loaded';

  return (
    <div className="questAdminRoot">
      <div className="questAdminBackdrop" />
      <section className="questAdminPanel">
        <header className="questAdminHeader">
          <div>
            <p className="questAdminEyebrow">Quest Admin</p>
            <h1>Quest Scene Editor</h1>
            <p>
              Write one GM guide for the whole scene, then edit each screen with optional local guidance,
              an optional image, and the built-in choices that lead out of it.
            </p>
          </div>
          <div className="questAdminMeta">
            <div>Last Updated: {formatDate(config?.updatedAt)}</div>
            <div>Total Screens: {config?.screens?.length || 0}</div>
          </div>
        </header>

        <div className="questAdminToolbar">
          <label>
            API Base URL
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="http://localhost:5001"
            />
          </label>
          <label>
            Admin API Key (optional)
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="x-admin-key"
            />
          </label>
          <label>
            Session ID
            <input
              type="text"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder={DEFAULT_QUEST_SESSION_ID}
            />
          </label>
          <label>
            Quest ID
            <input
              type="text"
              value={questId}
              onChange={(event) => setQuestId(event.target.value)}
              placeholder={DEFAULT_QUEST_ID}
            />
          </label>
          <button type="button" onClick={handleSave} disabled={saving || loading || !config}>
            {saving ? 'Saving…' : 'Save Scene'}
          </button>
          <button type="button" className="ghost" onClick={handleReset} disabled={saving || loading}>
            Reset Defaults
          </button>
        </div>

        {(status || error) && (
          <div className={`questAdminNotice ${error ? 'error' : 'ok'}`}>
            {error || status}
          </div>
        )}

        <div className="questAdminBody">
          <aside className="questAdminSidebar">
            <div className="sidebarHeader">
              <h2>Screens</h2>
              <button type="button" onClick={handleAddScreen}>+ Add</button>
            </div>
            {loading && <p className="sidebarMessage">Loading screens…</p>}
            {!loading && (!config || config.screens.length === 0) && (
              <p className="sidebarMessage">No screens loaded.</p>
            )}
            {!loading && config?.screens?.map((screen) => (
              <button
                type="button"
                key={screen.id}
                className={`screenListButton ${screen.id === selectedScreenId ? 'active' : ''}`}
                onClick={() => {
                  setSelectedScreenId(screen.id);
                  setStatus('');
                  setError('');
                }}
              >
                <strong>{getScreenLabel(screen)}</strong>
                <span className="screenListMeta">
                  {config?.startScreenId === screen.id ? <em className="screenListBadge">Start</em> : null}
                  <span>{screen.directions.length} built-in choice{screen.directions.length === 1 ? '' : 's'}</span>
                </span>
                <span>{screen.id}</span>
              </button>
            ))}
          </aside>

          <section className="questAdminEditor">
            <section className="editorSection">
              <div className="editorSectionHeader">
                <div>
                  <h3>How To Edit This Scene</h3>
                  <p>The main authoring flow is intentionally short.</p>
                </div>
              </div>
              <div className="editorPrimerGrid">
                <article className="editorPrimerCard">
                  <strong>1. Scene Identity</strong>
                  <p>Name the scene, keep the base template simple, and attach only the extra components it really needs.</p>
                </article>
                <article className="editorPrimerCard">
                  <strong>2. Scene Brief + Guides</strong>
                  <p>Keep one global GM guide and one global visual guide for the whole scene.</p>
                </article>
                <article className="editorPrimerCard">
                  <strong>3. Screen Details</strong>
                  <p>For any screen, add only the local guidance, image, and continuity notes that belong there.</p>
                </article>
                <article className="editorPrimerCard">
                  <strong>4. Connections + AI Drafts</strong>
                  <p>Define built-in choices and free-text routes, then use AI drafts as reviewable patches when helpful.</p>
                </article>
              </div>
            </section>

            <section className="editorSection">
              <div className="editorSectionHeader">
                <div>
                  <h3>Scene Identity & Attached Components</h3>
                  <p>Every scene uses the same base scene template. Attach extra components only when this scene needs them.</p>
                </div>
              </div>

              <label>
                Scene Name
                <input
                  type="text"
                  value={config?.sceneName || ''}
                  onChange={(event) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            sceneName: event.target.value
                          }
                        : prev
                    )
                  }
                  placeholder="Rose Court Opening"
                />
              </label>

              <label>
                Base Scene Template
                <select
                  value={config?.sceneTemplate || BASIC_SCENE_TEMPLATE}
                  onChange={(event) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            sceneTemplate: normalizeSceneTemplate(event.target.value)
                          }
                        : prev
                    )
                  }
                >
                  {SCENE_TEMPLATE_REGISTRY.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="sceneComponentSection">
                <strong>Attached Components</strong>
                <p className="editorMessage">
                  These are optional pieces of machinery the scene runtime can wire in on top of the base scene.
                </p>
                <div className="sceneComponentChecklist">
                  {SCENE_COMPONENT_REGISTRY.map((component) => {
                    const checked = Array.isArray(config?.sceneComponents)
                      ? config.sceneComponents.includes(component.id)
                      : false;
                    return (
                      <label key={component.id} className="routeScreenOption sceneComponentOption">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleSceneComponent(component.id, event.target.checked)}
                        />
                        <span>
                          <strong>{component.label}</strong>
                          <em>{component.description}</em>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="editorSection">
              <div className="editorSectionHeader">
                <div>
                  <h3>Scene Brief & Visual Tone</h3>
                  <p>These are the scene-wide anchors that the human editor and the AI drafter both build from.</p>
                </div>
              </div>
              <label>
                Master Scene Brief
                <textarea
                  rows={4}
                  value={config?.authoringBrief || ''}
                  onChange={(event) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            authoringBrief: event.target.value
                          }
                        : prev
                    )
                  }
                  placeholder="A compact authoring brief that explains the purpose, sequence, and important constraints of this scene."
                />
              </label>

              <label>
                Global GM Guidance
                <textarea
                  rows={4}
                  value={config?.phaseGuidance || ''}
                  onChange={(event) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            phaseGuidance: event.target.value
                          }
                        : prev
                    )
                  }
                  placeholder="What is possible in this phase, what must stay fixed, and what should be deferred."
                />
              </label>

              <label>
                Scene Visual Guide
                <textarea
                  rows={4}
                  value={config?.visualStyleGuide || ''}
                  onChange={(event) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            visualStyleGuide: event.target.value
                          }
                        : prev
                    )
                  }
                  placeholder="The overall visual language for this scene: continuity rules, lighting, material palette, framing, and mood."
                />
              </label>
            </section>

            <QuestAdminAiDraftPanel
              apiBaseUrl={apiBaseUrl}
              adminKey={adminKey}
              sessionId={sessionId}
              questId={questId}
              config={config}
              selectedScreen={selectedScreen}
              formatDate={formatDate}
              pipelineSettings={questSceneAuthoringSettings}
              pipelineModelOptions={questSceneAuthoringModelOptions}
              promptEntry={authoringPromptEntry}
              promptDraft={authoringPromptDraft}
              runtimeLoading={runtimeLoading}
              onPromptDraftChange={setAuthoringPromptDraft}
              onPipelineSettingsChange={updateQuestSceneAuthoringSettings}
              onSaveRuntime={() => savePipelineRuntime(QUEST_SCENE_AUTHORING_PIPELINE_KEY)}
              onSavePrompt={() => savePipelinePrompt(QUEST_SCENE_AUTHORING_PIPELINE_KEY, authoringPromptDraft)}
              onApplyDraft={handleApplyAuthoringDraft}
            />

            {!selectedScreen && (
              <p className="editorMessage">Choose a screen from the list.</p>
            )}

            {selectedScreen && (
              <>
                <section className="editorSection">
                  <div className="editorSectionHeader">
                    <div>
                      <h3>Selected Screen</h3>
                      <p>Edit the text the player sees and the basic identity of this screen.</p>
                    </div>
                  </div>

                  <div className="editorTopRow">
                    <label>
                      Start Screen
                      <select
                        value={config?.startScreenId || ''}
                        onChange={(event) =>
                          setConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  startScreenId: event.target.value
                                }
                              : prev
                          )
                        }
                      >
                        {config?.screens?.map((screen) => (
                          <option key={`start-${screen.id}`} value={screen.id}>
                            {getScreenLabel(screen)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="danger" onClick={handleRemoveSelectedScreen}>
                      Remove Screen
                    </button>
                  </div>

                  <label>
                    Internal Screen ID
                    <input
                      type="text"
                      value={screenIdDraft}
                      onChange={(event) => setScreenIdDraft(event.target.value)}
                      onBlur={handleCommitScreenId}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleCommitScreenId();
                        }
                      }}
                    />
                  </label>

                  <label>
                    Screen Title
                    <input
                      type="text"
                      value={selectedScreen.title}
                      onChange={(event) =>
                        updateSelectedScreen((screen) => ({
                          ...screen,
                          title: event.target.value
                        }))
                      }
                    />
                  </label>

                  <label>
                    What The Player Sees On This Screen
                    <textarea
                      rows={4}
                      value={selectedScreen.prompt}
                      onChange={(event) =>
                        updateSelectedScreen((screen) => ({
                          ...screen,
                          prompt: event.target.value
                        }))
                      }
                      placeholder="Opening text for this screen."
                    />
                  </label>
                </section>

                <section className="editorSection">
                  <div className="editorSectionHeader">
                    <div>
                      <h3>Optional Screen Guidance</h3>
                      <p>Add extra GM notes only for this screen. Leave blank if the global GM guide is enough.</p>
                    </div>
                  </div>

                  <label>
                    Extra GM Guidance For This Screen
                    <textarea
                      rows={4}
                      value={selectedScreen.promptGuidance || ''}
                      onChange={(event) =>
                        updateSelectedScreen((screen) => ({
                          ...screen,
                          promptGuidance: event.target.value
                        }))
                      }
                      placeholder="Optional local guidance for this screen only."
                    />
                  </label>

                  <label>
                    This Screen Ends When
                    <textarea
                      rows={3}
                      value={selectedScreen.sceneEndCondition || ''}
                      onChange={(event) =>
                        updateSelectedScreen((screen) => ({
                          ...screen,
                          sceneEndCondition: event.target.value
                        }))
                      }
                      placeholder="Optional condition that tells the GM when this screen is complete."
                    />
                  </label>

                  <label>
                    Visual Continuity Notes
                    <textarea
                      rows={3}
                      value={selectedScreen.visualContinuityGuidance || ''}
                      onChange={(event) =>
                        updateSelectedScreen((screen) => ({
                          ...screen,
                          visualContinuityGuidance: event.target.value
                        }))
                      }
                      placeholder="Optional note about how this screen should visually relate to the screens around it."
                    />
                  </label>

                  <label>
                    Transition From Nearby Screens
                    <select
                      value={selectedScreen.visualTransitionIntent || 'inherit'}
                      onChange={(event) =>
                        updateSelectedScreen((screen) => ({
                          ...screen,
                          visualTransitionIntent: event.target.value
                        }))
                      }
                    >
                      {VISUAL_TRANSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                <section className="editorSection">
                  <div className="editorSectionHeader">
                    <div>
                      <h3>Components On This Screen</h3>
                      <p>Choose which of the scene’s attached components is actually active here, and how it is used on this screen.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddScreenComponentBinding}
                      disabled={attachedSceneComponentDefinitions.length === 0}
                    >
                      + Add Binding
                    </button>
                  </div>

                  {attachedSceneComponentDefinitions.length === 0 ? (
                    <p className="editorMessage">
                      Attach components at the scene level first. Then you can bind them to specific screens here.
                    </p>
                  ) : null}

                  {attachedSceneComponentDefinitions.length > 0 && (!selectedScreen.componentBindings || selectedScreen.componentBindings.length === 0) ? (
                    <p className="editorMessage">No components are currently bound to this screen.</p>
                  ) : null}

                  <div className="screenComponentBindingList">
                    {(Array.isArray(selectedScreen.componentBindings) ? selectedScreen.componentBindings : []).map((binding, index) => {
                      const componentDefinition = getSceneComponentDefinition(binding.componentId);
                      const slotDefinition = getSceneComponentSlotDefinition(binding.componentId, binding.slot);
                      return (
                        <article key={`${binding.componentId}-${binding.slot}-${index}`} className="promptRouteCard screenComponentBindingCard">
                          <div className="promptRouteHeader">
                            <div>
                              <strong>{componentDefinition?.label || binding.componentId}</strong>
                              <span>{slotDefinition?.description || 'Bind this component into this screen.'}</span>
                            </div>
                            <button
                              type="button"
                              className="removeDirection"
                              onClick={() => handleRemoveScreenComponentBinding(index)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="promptRouteGrid">
                            <label>
                              Component
                              <select
                                value={binding.componentId}
                                onChange={(event) =>
                                  handleScreenComponentBindingFieldChange(index, 'componentId', event.target.value)
                                }
                              >
                                {attachedSceneComponentDefinitions.map((component) => (
                                  <option key={`${index}-component-${component.id}`} value={component.id}>
                                    {component.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label>
                              Used Here As
                              <select
                                value={binding.slot}
                                onChange={(event) =>
                                  handleScreenComponentBindingFieldChange(index, 'slot', event.target.value)
                                }
                              >
                                {(Array.isArray(componentDefinition?.slots) ? componentDefinition.slots : []).map((slot) => (
                                  <option key={`${index}-slot-${slot.id}`} value={slot.id}>
                                    {slot.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          {Array.isArray(slotDefinition?.fields) && slotDefinition.fields.length > 0 ? (
                            <div className="screenComponentBindingFields">
                              {slotDefinition.fields.map((field) => {
                                const value = binding.props?.[field.key] ?? '';
                                if (field.type === 'select') {
                                  return (
                                    <label key={`${index}-${field.key}`}>
                                      {field.label}
                                      <select
                                        value={String(value)}
                                        onChange={(event) =>
                                          handleScreenComponentBindingPropChange(index, field.key, event.target.value)
                                        }
                                      >
                                        {(Array.isArray(field.options) ? field.options : []).map((option) => (
                                          <option key={`${index}-${field.key}-${option.value}`} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  );
                                }

                                return (
                                  <label key={`${index}-${field.key}`}>
                                    {field.label}
                                    <input
                                      type="text"
                                      value={String(value)}
                                      onChange={(event) =>
                                        handleScreenComponentBindingPropChange(index, field.key, event.target.value)
                                      }
                                      placeholder={field.placeholder || ''}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="editorMessage">This binding does not need any extra fields.</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="editorSection">
                  <div className="editorSectionHeader">
                    <div>
                      <h3>Optional Screen Image</h3>
                      <p>Each screen can keep its current image, upload a different one, or generate one directly from the current prompt fields.</p>
                    </div>
                  </div>

                  {(sceneImageStatus || sceneImageError) && (
                    <div className={`questAdminInlineNotice ${sceneImageError ? 'error' : 'ok'}`}>
                      {sceneImageError || sceneImageStatus}
                    </div>
                  )}

                  <div
                    className="sceneImagePreview"
                    style={{
                      backgroundImage: `linear-gradient(160deg, rgba(18, 12, 10, 0.45), rgba(14, 8, 7, 0.82)), url(${selectedScreen.imageUrl || '/ruin_south_a.png'})`
                    }}
                  />

                  <div className="sceneImageActions">
                    <label>
                      Image Model
                      <select
                        value={sceneImageModel}
                        onChange={(event) => setSceneImageModel(event.target.value)}
                      >
                        {sceneImageModelOptions.length === 0 && (
                          <option value="">Select model</option>
                        )}
                        {sceneImageModelOptions.map((modelId) => (
                          <option key={modelId} value={modelId}>
                            {modelId}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      className="secondary"
                      onClick={handleGenerateSceneImage}
                      disabled={generatingSceneImage || uploadingSceneImage || !selectedScreen}
                    >
                      {generatingSceneImage ? 'Generating…' : 'Generate Image From Prompt'}
                    </button>
                  </div>

                  <p className="editorMessage">
                    The editor now builds one full standalone prompt from the scene visual guide, this screen, and nearby visual context. The new image URL is only persisted after `Save Scene`.
                  </p>

                  <label>
                    Image URL
                    <input
                      type="text"
                      value={selectedScreen.imageUrl}
                      onChange={(event) =>
                        updateSelectedScreen((screen) => ({
                          ...screen,
                          imageUrl: event.target.value
                        }))
                      }
                      placeholder="/assets/quest_scene_uploads/... or https://..."
                    />
                  </label>

                  {sceneImageResolvedPathError ? (
                    <div className="questAdminInlineNotice error">
                      {sceneImageResolvedPathError}
                    </div>
                  ) : null}

                  <div className="sceneImagePathHeader">
                    <div>
                      <h4>Local Asset Path</h4>
                      <p>The backend resolves the current image URL to the actual project file on disk.</p>
                    </div>
                  </div>

                  <label>
                    Resolved Local File
                    <div className="sceneImagePathRow">
                      <input
                        type="text"
                        value={
                          sceneImageResolvedPathLoading && !sceneImageResolvedPath?.localPath
                            ? 'Resolving local file path…'
                            : (sceneImageResolvedPath?.localPath || '')
                        }
                        readOnly
                      />
                      <button
                        type="button"
                        className="ghost"
                        onClick={() =>
                          handleCopySceneImagePath(
                            sceneImageResolvedPath?.localPath || '',
                            'Copied the resolved local image path.'
                          )
                        }
                        disabled={!sceneImageResolvedPath?.localPath}
                      >
                        Copy Path
                      </button>
                    </div>
                  </label>

                  <label>
                    Asset Folder
                    <div className="sceneImagePathRow">
                      <input
                        type="text"
                        value={
                          sceneImageResolvedPathLoading && !sceneImageResolvedPath?.assetDirectory
                            ? 'Resolving asset folder…'
                            : (sceneImageResolvedPath?.assetDirectory || '')
                        }
                        readOnly
                      />
                      <button
                        type="button"
                        className="ghost"
                        onClick={() =>
                          handleCopySceneImagePath(
                            sceneImageResolvedPath?.assetDirectory || '',
                            'Copied the local asset folder path.'
                          )
                        }
                        disabled={!sceneImageResolvedPath?.assetDirectory}
                      >
                        Copy Folder
                      </button>
                    </div>
                  </label>

                  <label className="sceneUploadField">
                    Upload A New Screen Image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleSceneImageUpload}
                      disabled={uploadingSceneImage}
                    />
                  </label>

                  <p className="editorMessage">
                    Uploading updates the image URL automatically. Save Scene to persist it.
                  </p>

                  <label>
                    Reference Text-to-Image Prompt
                    <textarea
                      rows={5}
                      value={selectedScreen.referenceImagePrompt || ''}
                      onChange={(event) =>
                        updateSelectedScreen((screen) => ({
                          ...screen,
                          referenceImagePrompt: event.target.value
                        }))
                      }
                      placeholder="A richer visual brief for generating or commissioning art for this screen."
                    />
                  </label>

                  <div className="sceneImagePromptHeader">
                    <div>
                      <h4>Full Text-to-Image Prompt</h4>
                      <p>Copy this whole prompt if you want to run image generation manually.</p>
                    </div>
                    <button
                      type="button"
                      className="ghost"
                      onClick={handleCopySceneImagePrompt}
                      disabled={!sceneImagePromptPreview}
                    >
                      Copy Full Prompt
                    </button>
                  </div>

                  {sceneImagePromptError ? (
                    <div className="questAdminInlineNotice error">
                      {sceneImagePromptError}
                    </div>
                  ) : null}

                  <label>
                    Composed Prompt Preview
                    <textarea
                      rows={12}
                      value={
                        sceneImagePromptLoading && !sceneImagePromptPreview
                          ? 'Composing full text-to-image prompt…'
                          : sceneImagePromptPreview
                      }
                      readOnly
                    />
                  </label>

                  <section className="visualContextPanel">
                    <div className="editorSectionHeader">
                      <div>
                        <h3>Nearby Visual Context</h3>
                        <p>Read-only context from connected screens so visual continuity stays easy to judge while editing.</p>
                      </div>
                    </div>

                    <div className="visualContextGrid">
                      <div className="visualContextColumn">
                        <strong>Leads here from</strong>
                        {selectedScreenVisualContext.incoming.length === 0 && (
                          <p className="editorMessage">No linked incoming screens yet.</p>
                        )}
                        {selectedScreenVisualContext.incoming.map((entry) => (
                          <article key={`incoming-${entry.screen.id}-${entry.via}`} className="visualContextCard">
                            <span>{entry.via}</span>
                            <strong>{entry.screen.title}</strong>
                            {entry.screen.referenceImagePrompt ? <p>{entry.screen.referenceImagePrompt}</p> : null}
                            {entry.screen.visualContinuityGuidance ? (
                              <p>{entry.screen.visualContinuityGuidance}</p>
                            ) : null}
                          </article>
                        ))}
                      </div>

                      <div className="visualContextColumn">
                        <strong>Leads out to</strong>
                        {selectedScreenVisualContext.outgoing.length === 0 && (
                          <p className="editorMessage">No linked outgoing screens yet.</p>
                        )}
                        {selectedScreenVisualContext.outgoing.map((entry) => (
                          <article key={`outgoing-${entry.screen.id}-${entry.via}`} className="visualContextCard">
                            <span>{entry.via}</span>
                            <strong>{entry.screen.title}</strong>
                            {entry.screen.referenceImagePrompt ? <p>{entry.screen.referenceImagePrompt}</p> : null}
                            {entry.screen.visualContinuityGuidance ? (
                              <p>{entry.screen.visualContinuityGuidance}</p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                </section>

                <section className="editorSection directionEditor">
                  <div className="directionEditorHeader">
                    <div>
                      <h3>Built-In Choices From This Screen</h3>
                      <p>Each row is a fixed option and the screen it leads to.</p>
                    </div>
                    <button type="button" onClick={handleAddDirection}>+ Add Choice</button>
                  </div>

                  <div className="directionLegend">
                    <span>Choice key</span>
                    <span>What the player sees</span>
                    <span>Leads to screen</span>
                    <span />
                  </div>

                  {selectedScreen.directions.length === 0 && (
                    <p className="editorMessage">No built-in choices yet for this screen.</p>
                  )}

                  {selectedScreen.directions.map((direction, index) => {
                    const datalistId = `${selectedScreen.id}-direction-options-${index}`;
                    return (
                      <div key={`${direction.direction}-${index}`} className="directionRow">
                        <label className="directionField">
                          <span className="directionFieldLabel">Choice key</span>
                          <input
                            list={datalistId}
                            value={direction.direction}
                            onChange={(event) =>
                              handleDirectionFieldChange(index, 'direction', event.target.value)
                            }
                            placeholder="north, inspect_mural, open_phone..."
                          />
                          <datalist id={datalistId}>
                            {DIRECTION_OPTIONS.map((option) => (
                              <option key={`${selectedScreen.id}-dir-${option}`} value={option} />
                            ))}
                          </datalist>
                        </label>
                        <label className="directionField">
                          <span className="directionFieldLabel">What the player sees</span>
                          <input
                            type="text"
                            value={direction.label}
                            onChange={(event) =>
                              handleDirectionFieldChange(index, 'label', event.target.value)
                            }
                            placeholder="Examine the center mural"
                          />
                        </label>
                        <label className="directionField">
                          <span className="directionFieldLabel">Leads to screen</span>
                          <select
                            value={direction.targetScreenId}
                            onChange={(event) =>
                              handleDirectionFieldChange(index, 'targetScreenId', event.target.value)
                            }
                          >
                            {config?.screens?.map((screen) => (
                              <option key={`${selectedScreen.id}-target-${screen.id}-${index}`} value={screen.id}>
                                {getScreenLabel(screen)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="removeDirection"
                          onClick={() => handleDirectionRemove(index)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </section>

                <section className="editorSection promptRouteEditor">
                  <div className="directionEditorHeader">
                    <div>
                      <h3>Free-Text Routes From This Screen</h3>
                      <p>Use this when typed input should land on an existing authored screen instead of generating a new branch.</p>
                    </div>
                    <button type="button" onClick={handleAddPromptRoute}>+ Add Route</button>
                  </div>

                  {selectedScreenPromptRoutes.length === 0 && (
                    <p className="editorMessage">No free-text routes currently apply to this screen.</p>
                  )}

                  <div className="promptRouteList">
                    {selectedScreenPromptRoutes.map(({ route, index }) => {
                      const routeScope = getPromptRouteScope(route, selectedScreenId);
                      return (
                        <article key={`prompt-route-${index}`} className="promptRouteCard">
                          <div className="promptRouteHeader">
                            <div>
                              <strong>{route.description?.trim() || route.id || 'New free-text route'}</strong>
                              <span>
                                {routeScope === 'all'
                                  ? 'Applies to all screens'
                                  : routeScope === 'custom'
                                    ? `Applies to ${route.fromScreenIds.length} screens`
                                    : 'Applies only to this screen'}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="removeDirection"
                              onClick={() => handlePromptRouteRemove(index)}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="promptRouteGrid">
                            <label>
                              Route ID
                              <input
                                type="text"
                                value={route.id}
                                onChange={(event) =>
                                  handlePromptRouteFieldChange(index, 'id', slugify(event.target.value))
                                }
                                placeholder="optional_route_id"
                              />
                            </label>

                            <label>
                              Match Rule
                              <select
                                value={route.matchMode}
                                onChange={(event) =>
                                  handlePromptRouteFieldChange(index, 'matchMode', event.target.value)
                                }
                              >
                                <option value="any">Any pattern matches</option>
                                <option value="all">All patterns must match</option>
                              </select>
                            </label>

                            <label>
                              Target Screen
                              <select
                                value={route.targetScreenId}
                                onChange={(event) =>
                                  handlePromptRouteFieldChange(index, 'targetScreenId', event.target.value)
                                }
                              >
                                <option value="">Select target screen</option>
                                {config?.screens?.map((screen) => (
                                  <option key={`prompt-route-target-${screen.id}-${index}`} value={screen.id}>
                                    {getScreenLabel(screen)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <label>
                            What This Route Does
                            <input
                              type="text"
                              value={route.description}
                              onChange={(event) =>
                                handlePromptRouteFieldChange(index, 'description', event.target.value)
                              }
                              placeholder="Describe when this route should win."
                            />
                          </label>

                          <label>
                            Trigger Patterns
                            <textarea
                              rows={4}
                              value={Array.isArray(route.patterns) ? route.patterns.join('\n') : ''}
                              onChange={(event) =>
                                handlePromptRoutePatternsChange(index, event.target.value)
                              }
                              placeholder={'One pattern per line.\nExample: listen.*signal\nExample: where .*coming from'}
                            />
                          </label>

                          <div className="promptRouteScope">
                            <label>
                              Route Scope
                              <select
                                value={routeScope}
                                onChange={(event) =>
                                  handlePromptRouteScopeChange(index, event.target.value)
                                }
                              >
                                <option value="current">Only this screen</option>
                                <option value="all">All screens</option>
                                <option value="custom">Choose screens</option>
                              </select>
                            </label>

                            {routeScope === 'custom' && (
                              <div className="promptRouteScopeScreens">
                                <span className="directionFieldLabel">Available from</span>
                                <div className="promptRouteScreenChecklist">
                                  {config?.screens?.map((screen) => {
                                    const checked = Array.isArray(route.fromScreenIds)
                                      ? route.fromScreenIds.includes(screen.id)
                                      : false;
                                    return (
                                      <label key={`route-scope-${index}-${screen.id}`} className="routeScreenOption">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) =>
                                            handlePromptRouteSourceScreenToggle(index, screen.id, event.target.checked)
                                          }
                                        />
                                        <span>{getScreenLabel(screen)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <details className="editorDetails">
                  <summary>Advanced Screen Fields</summary>
                  <div className="editorDetailsBody">
                    <section className="editorSection editorSectionNested">
                      <div className="editorSectionHeader">
                        <div>
                          <h3>Advanced Screen Fields</h3>
                          <p>Only touch these when you need extra generator control or debugging context.</p>
                        </div>
                      </div>

                      <label>
                        Expectation Summary
                        <textarea
                          rows={2}
                          value={selectedScreen.expectationSummary || ''}
                          onChange={(event) =>
                            updateSelectedScreen((screen) => ({
                              ...screen,
                              expectationSummary: event.target.value
                            }))
                          }
                          placeholder="What should the player expect to find or feel here?"
                        />
                      </label>

                      <label>
                        Continuity Summary
                        <textarea
                          rows={2}
                          value={selectedScreen.continuitySummary || ''}
                          onChange={(event) =>
                            updateSelectedScreen((screen) => ({
                              ...screen,
                              continuitySummary: event.target.value
                            }))
                          }
                          placeholder="How this screen connects to the previous one."
                        />
                      </label>

                      <label>
                        Text Prompt Placeholder
                        <input
                          type="text"
                          value={selectedScreen.textPromptPlaceholder}
                          onChange={(event) =>
                            updateSelectedScreen((screen) => ({
                              ...screen,
                              textPromptPlaceholder: event.target.value
                            }))
                          }
                        />
                      </label>

                      <label>
                        Generator Image Prompt
                        <textarea
                          rows={3}
                          value={selectedScreen.image_prompt}
                          onChange={(event) =>
                            updateSelectedScreen((screen) => ({
                              ...screen,
                              image_prompt: event.target.value
                            }))
                          }
                          placeholder="Prompt used to generate this scene image"
                        />
                      </label>

                      <div className="metadataBlock">
                        <p className="editorMessage">
                          Type: <strong>{selectedScreen.screenType || 'authored'}</strong>
                          {selectedScreen.parentScreenId ? ` | Parent: ${selectedScreen.parentScreenId}` : ''}
                          {selectedScreen.anchorScreenId ? ` | Anchor: ${selectedScreen.anchorScreenId}` : ''}
                        </p>
                        {selectedScreen.generatedFromPrompt ? (
                          <p className="editorMessage">Generated from prompt: {selectedScreen.generatedFromPrompt}</p>
                        ) : null}
                        {selectedScreen.generatedByPlayerId ? (
                          <p className="editorMessage">Generated by player: {selectedScreen.generatedByPlayerId}</p>
                        ) : null}
                        {selectedScreen.generatedAt ? (
                          <p className="editorMessage">Generated at: {formatDate(selectedScreen.generatedAt)}</p>
                        ) : null}
                        {selectedScreen.stageModules?.length ? (
                          <p className="editorMessage">
                            Stage modules: {selectedScreen.stageModules.length} ({selectedScreen.stageLayout || 'focus-left'})
                          </p>
                        ) : null}
                      </div>
                    </section>
                  </div>
                </details>

                <details className="editorDetails">
                  <summary>Advanced Generator Settings</summary>
                  <div className="editorDetailsBody">
                    <section className="editorSection editorSectionNested">
                      <div className="editorSectionHeader">
                        <div>
                          <h3>Quest Generator</h3>
                          <p>Provider, model, and saved prompt template for the `quest_generation` pipeline.</p>
                        </div>
                      </div>
                      {(runtimeStatus || runtimeError) && (
                        <div className={`questAdminInlineNotice ${runtimeError ? 'error' : 'ok'}`}>
                          {runtimeError || runtimeStatus}
                        </div>
                      )}
                      {runtimeLoading && <p className="editorMessage">Loading quest generator settings…</p>}
                      {!runtimeLoading && !questGenerationSettings && (
                        <p className="editorMessage">Quest generator settings are unavailable.</p>
                      )}
                      {!runtimeLoading && questGenerationSettings && (
                        <>
                          <div className="questRuntimeGrid">
                            <label>
                              Provider
                              <select
                                value={questGenerationSettings.provider || 'openai'}
                                onChange={(event) =>
                                  updateQuestGenerationSettings({
                                    provider: event.target.value
                                  })
                                }
                              >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                              </select>
                            </label>

                            <label>
                              Model
                              <select
                                value={questGenerationSettings.model || ''}
                                onChange={(event) =>
                                  updateQuestGenerationSettings({
                                    model: event.target.value
                                  })
                                }
                              >
                                {questGenerationModelOptions.length === 0 && (
                                  <option value="">Select model</option>
                                )}
                                {questGenerationModelOptions.map((modelId) => (
                                  <option key={modelId} value={modelId}>
                                    {modelId}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="toggleField">
                              <span>Mock Runtime</span>
                              <input
                                type="checkbox"
                                checked={Boolean(questGenerationSettings.useMock)}
                                onChange={(event) =>
                                  updateQuestGenerationSettings({
                                    useMock: event.target.checked
                                  })
                                }
                              />
                            </label>
                          </div>

                          <div className="sceneEditorActions">
                            <button
                              type="button"
                              onClick={handleSaveQuestRuntime}
                              disabled={runtimeSaving || runtimeLoading}
                            >
                              {runtimeSaving ? 'Saving Runtime…' : 'Save Runtime'}
                            </button>
                          </div>

                          <label>
                            Saved Prompt Template
                            <textarea
                              rows={10}
                              value={questPromptDraft}
                              onChange={(event) => setQuestPromptDraft(event.target.value)}
                              placeholder="Latest prompt template for quest scene generation"
                            />
                          </label>

                          <p className="editorMessage">
                            Source: {promptSourceLabel}
                            {questPromptEntry?.updatedAt ? ` | Updated: ${formatDate(questPromptEntry.updatedAt)}` : ''}
                          </p>

                          <div className="sceneEditorActions">
                            <button
                              type="button"
                              onClick={handleSaveQuestPrompt}
                              disabled={promptSaving || runtimeLoading}
                            >
                              {promptSaving ? 'Saving Prompt…' : 'Save Prompt to DB'}
                            </button>
                          </div>
                        </>
                      )}
                    </section>
                  </div>
                </details>

                <QuestAdminDebugPanel
                  apiBaseUrl={apiBaseUrl}
                  adminKey={adminKey}
                  sessionId={sessionId}
                  questId={questId}
                  selectedScreen={selectedScreen}
                  formatDate={formatDate}
                />
              </>
            )}
          </section>

          <aside className="questAdminPreview">
            <h2>Selected Screen Preview</h2>
            {selectedScreen ? (
              <article className="previewCard">
                <div
                  className="previewImage"
                  style={{
                    backgroundImage: `linear-gradient(160deg, rgba(18, 12, 10, 0.55), rgba(14, 8, 7, 0.85)), url(${selectedScreen.imageUrl || '/ruin_south_a.png'})`
                  }}
                >
                  <header>
                    <p>{selectedScreen.id}</p>
                    <h3>{selectedScreen.title}</h3>
                  </header>
                  <p>{selectedScreen.prompt || 'No prompt yet.'}</p>
                </div>
                <div className="previewDirections">
                  {config?.sceneName ? (
                    <span>Scene name: {config.sceneName}</span>
                  ) : null}
                  {config?.sceneTemplate ? (
                    <span>Base scene template: {config.sceneTemplate}</span>
                  ) : null}
                  {Array.isArray(config?.sceneComponents) && config.sceneComponents.length ? (
                    <span>Attached components: {config.sceneComponents.join(', ')}</span>
                  ) : (
                    <span>No optional attached components enabled.</span>
                  )}
                  {config?.authoringBrief ? (
                    <span>Master brief: {config.authoringBrief}</span>
                  ) : null}
                  {config?.phaseGuidance ? (
                    <span>GM scene guide: {config.phaseGuidance}</span>
                  ) : null}
                  {config?.visualStyleGuide ? (
                    <span>Scene visual guide: {config.visualStyleGuide}</span>
                  ) : null}
                  {selectedScreen.promptGuidance ? (
                    <span>Screen-only guidance: {selectedScreen.promptGuidance}</span>
                  ) : null}
                  {selectedScreen.sceneEndCondition ? (
                    <span>Ends when: {selectedScreen.sceneEndCondition}</span>
                  ) : null}
                  {selectedScreen.visualContinuityGuidance ? (
                    <span>Visual continuity: {selectedScreen.visualContinuityGuidance}</span>
                  ) : null}
                  {selectedScreen.visualTransitionIntent ? (
                    <span>Transition intent: {selectedScreen.visualTransitionIntent}</span>
                  ) : null}
                  {Array.isArray(selectedScreen.componentBindings) && selectedScreen.componentBindings.length ? (
                    selectedScreen.componentBindings.map((binding, index) => {
                      const componentDefinition = getSceneComponentDefinition(binding.componentId);
                      const slotDefinition = getSceneComponentSlotDefinition(binding.componentId, binding.slot);
                      const propSummary = Object.entries(binding.props || {})
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' | ');
                      return (
                        <span key={`${selectedScreen.id}-binding-${index}`}>
                          Screen component: {componentDefinition?.label || binding.componentId}
                          {' '}as {slotDefinition?.label || binding.slot}
                          {propSummary ? ` · ${propSummary}` : ''}
                        </span>
                      );
                    })
                  ) : (
                    <span>No screen-level component bindings yet.</span>
                  )}
                  {selectedScreen.imageUrl ? (
                    <span>Image: {selectedScreen.imageUrl}</span>
                  ) : (
                    <span>No custom image set for this screen.</span>
                  )}
                  {selectedScreen.referenceImagePrompt ? (
                    <span>Reference image prompt: {selectedScreen.referenceImagePrompt}</span>
                  ) : null}
                  {selectedScreen.directions.length === 0 && <span>No built-in choices yet.</span>}
                  {selectedScreen.directions.map((direction, index) => (
                    <span key={`${selectedScreen.id}-preview-${index}`}>
                      {direction.label} → {getScreenLabel(config?.screens?.find((screen) => screen.id === direction.targetScreenId)) || direction.targetScreenId}
                    </span>
                  ))}
                </div>
              </article>
            ) : (
              <p className="editorMessage">No screen selected.</p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
};

export default QuestAdminPage;

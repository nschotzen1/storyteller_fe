import {
  BASIC_SCENE_TEMPLATE,
  normalizeSceneComponents,
  normalizeSceneTemplate,
  normalizeScreenComponentBindings
} from '../../scene-runtime/sceneComponentRegistry';

export const VISUAL_TRANSITION_OPTIONS = [
  { value: 'inherit', label: 'Keep same visual language' },
  { value: 'drift', label: 'Shift gradually' },
  { value: 'break', label: 'Break deliberately' }
];

const EMPTY_CONFIG = {
  sessionId: '',
  questId: '',
  sceneName: '',
  sceneTemplate: BASIC_SCENE_TEMPLATE,
  sceneComponents: [],
  startScreenId: '',
  authoringBrief: '',
  phaseGuidance: '',
  visualStyleGuide: '',
  promptRoutes: [],
  screens: [],
  updatedAt: ''
};

function asTrimmedString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function normalizeVisualTransitionIntent(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return ['inherit', 'drift', 'break'].includes(normalized) ? normalized : 'inherit';
}

function normalizeDirection(direction = {}) {
  const source = direction && typeof direction === 'object' ? direction : {};
  const directionKey = asTrimmedString(source.direction).toLowerCase();
  const targetScreenId = asTrimmedString(source.targetScreenId);
  if (!directionKey || !targetScreenId) {
    return null;
  }
  return {
    direction: directionKey,
    label: asTrimmedString(source.label) || directionKey,
    targetScreenId
  };
}

function normalizePromptRoute(route = {}) {
  const source = route && typeof route === 'object' ? route : {};
  const targetScreenId = asTrimmedString(source.targetScreenId);
  const patterns = Array.isArray(source.patterns)
    ? source.patterns.map((pattern) => asTrimmedString(pattern)).filter(Boolean)
    : [];

  if (!targetScreenId || patterns.length === 0) {
    return null;
  }

  return {
    id: asTrimmedString(source.id),
    description: typeof source.description === 'string' ? source.description : '',
    fromScreenIds: Array.isArray(source.fromScreenIds)
      ? [...new Set(source.fromScreenIds.map((screenId) => asTrimmedString(screenId)).filter(Boolean))]
      : [],
    matchMode: source.matchMode === 'all' ? 'all' : 'any',
    patterns,
    targetScreenId
  };
}

function normalizeScreen(screen = {}) {
  const source = screen && typeof screen === 'object' ? screen : {};
  const id = asTrimmedString(source.id);
  if (!id) return null;
  return {
    id,
    title: asTrimmedString(source.title) || id,
    prompt: typeof source.prompt === 'string' ? source.prompt : '',
    imageUrl: asTrimmedString(source.imageUrl),
    image_prompt: typeof source.image_prompt === 'string' ? source.image_prompt : '',
    referenceImagePrompt: typeof source.referenceImagePrompt === 'string' ? source.referenceImagePrompt : '',
    visualContinuityGuidance: typeof source.visualContinuityGuidance === 'string' ? source.visualContinuityGuidance : '',
    visualTransitionIntent: normalizeVisualTransitionIntent(source.visualTransitionIntent),
    screenType: source.screenType === 'generated' ? 'generated' : 'authored',
    parentScreenId: asTrimmedString(source.parentScreenId),
    anchorScreenId: asTrimmedString(source.anchorScreenId),
    expectationSummary: typeof source.expectationSummary === 'string' ? source.expectationSummary : '',
    continuitySummary: typeof source.continuitySummary === 'string' ? source.continuitySummary : '',
    generatedFromPrompt: typeof source.generatedFromPrompt === 'string' ? source.generatedFromPrompt : '',
    generatedByPlayerId: asTrimmedString(source.generatedByPlayerId),
    generatedAt: typeof source.generatedAt === 'string' ? source.generatedAt : '',
    promptGuidance: typeof source.promptGuidance === 'string' ? source.promptGuidance : '',
    sceneEndCondition: typeof source.sceneEndCondition === 'string' ? source.sceneEndCondition : '',
    promptRoutes: Array.isArray(source.promptRoutes) ? source.promptRoutes : [],
    stageLayout: typeof source.stageLayout === 'string' ? source.stageLayout : '',
    stageModules: Array.isArray(source.stageModules) ? source.stageModules : [],
    textPromptPlaceholder: asTrimmedString(source.textPromptPlaceholder) || 'What do you do?',
    componentBindings: normalizeScreenComponentBindings(source.componentBindings),
    directions: Array.isArray(source.directions) ? source.directions.map(normalizeDirection).filter(Boolean) : []
  };
}

export function normalizeQuestConfigDraft(config = {}) {
  const source = config && typeof config === 'object' ? config : {};
  const screens = Array.isArray(source.screens)
    ? source.screens.map(normalizeScreen).filter(Boolean)
    : [];

  return {
    ...EMPTY_CONFIG,
    ...source,
    sceneName: typeof source.sceneName === 'string' ? source.sceneName : '',
    sceneTemplate: normalizeSceneTemplate(source.sceneTemplate),
    sceneComponents: normalizeSceneComponents(source.sceneComponents),
    authoringBrief: typeof source.authoringBrief === 'string' ? source.authoringBrief : '',
    phaseGuidance: typeof source.phaseGuidance === 'string' ? source.phaseGuidance : '',
    visualStyleGuide: typeof source.visualStyleGuide === 'string' ? source.visualStyleGuide : '',
    promptRoutes: Array.isArray(source.promptRoutes) ? source.promptRoutes.map(normalizePromptRoute).filter(Boolean) : [],
    screens
  };
}

function withUpdatedScreen(config, screenId, updater) {
  return {
    ...config,
    screens: config.screens.map((screen) => {
      if (screen.id !== screenId) return screen;
      return normalizeScreen(updater(screen)) || screen;
    })
  };
}

function hasDirection(screen = {}, candidate = {}) {
  return Array.isArray(screen.directions)
    && screen.directions.some((direction) =>
      direction.direction === candidate.direction
      && direction.targetScreenId === candidate.targetScreenId
    );
}

function hasPromptRoute(config = {}, candidate = {}) {
  return Array.isArray(config.promptRoutes)
    && config.promptRoutes.some((route) => {
      const routeId = asTrimmedString(route.id);
      const candidateId = asTrimmedString(candidate.id);
      if (routeId && candidateId && routeId === candidateId) return true;
      return route.targetScreenId === candidate.targetScreenId
        && route.matchMode === candidate.matchMode
        && JSON.stringify(route.patterns || []) === JSON.stringify(candidate.patterns || [])
        && JSON.stringify(route.fromScreenIds || []) === JSON.stringify(candidate.fromScreenIds || []);
    });
}

export function applyQuestAuthoringChanges(config = {}, changes = [], selectedChangeIds = []) {
  const base = normalizeQuestConfigDraft(config);
  const allowedIds = new Set(Array.isArray(selectedChangeIds) ? selectedChangeIds : []);
  const activeChanges = Array.isArray(changes)
    ? changes.filter((change) => allowedIds.has(change.id))
    : [];

  let nextConfig = { ...base };
  let nextSelectedScreenId = '';

  activeChanges.forEach((change) => {
    if (!change || typeof change !== 'object') return;
    if (change.action === 'set_scene_field' && typeof change.field === 'string') {
      const normalizedSceneValue = (() => {
        if (change.field === 'sceneTemplate') {
          return normalizeSceneTemplate(change.proposedValue);
        }
        if (change.field === 'sceneComponents') {
          return normalizeSceneComponents(change.proposedValue);
        }
        return typeof change.proposedValue === 'string' ? change.proposedValue : nextConfig[change.field];
      })();
      nextConfig = {
        ...nextConfig,
        [change.field]: normalizedSceneValue
      };
      return;
    }

    if (change.action === 'set_screen_field' && typeof change.targetId === 'string') {
      nextConfig = withUpdatedScreen(nextConfig, change.targetId, (screen) => ({
        ...screen,
        [change.field]: change.field === 'visualTransitionIntent'
          ? normalizeVisualTransitionIntent(change.proposedValue)
          : typeof change.proposedValue === 'string'
            ? change.proposedValue
            : screen[change.field]
      }));
      return;
    }

    if (change.action === 'add_screen') {
      const nextScreen = normalizeScreen(change.proposedValue);
      if (!nextScreen) return;
      if (nextConfig.screens.some((screen) => screen.id === nextScreen.id)) return;
      nextConfig = {
        ...nextConfig,
        screens: [...nextConfig.screens, nextScreen]
      };
      nextSelectedScreenId = nextSelectedScreenId || nextScreen.id;
      return;
    }

    if (change.action === 'add_direction') {
      const candidate = normalizeDirection(change.proposedValue);
      if (!candidate) return;
      nextConfig = withUpdatedScreen(nextConfig, change.targetId, (screen) => {
        if (hasDirection(screen, candidate)) return screen;
        return {
          ...screen,
          directions: [...screen.directions, candidate]
        };
      });
      return;
    }

    if (change.action === 'add_prompt_route') {
      const nextRoute = normalizePromptRoute(change.proposedValue);
      if (!nextRoute || hasPromptRoute(nextConfig, nextRoute)) return;
      nextConfig = {
        ...nextConfig,
        promptRoutes: [...(Array.isArray(nextConfig.promptRoutes) ? nextConfig.promptRoutes : []), nextRoute]
      };
    }
  });

  return {
    config: normalizeQuestConfigDraft(nextConfig),
    selectedScreenId: nextSelectedScreenId
  };
}

export function buildQuestScreenVisualContext(config = {}, selectedScreenId = '') {
  const screens = Array.isArray(config?.screens) ? config.screens : [];
  const safeSelectedScreenId = asTrimmedString(selectedScreenId);
  if (!safeSelectedScreenId) {
    return { incoming: [], outgoing: [] };
  }

  const incoming = [];
  const outgoing = [];

  screens.forEach((screen) => {
    if (!screen || typeof screen !== 'object') return;
    const summary = {
      id: screen.id,
      title: screen.title || screen.id,
      imageUrl: screen.imageUrl || '',
      imagePrompt: screen.image_prompt || '',
      referenceImagePrompt: screen.referenceImagePrompt || '',
      visualContinuityGuidance: screen.visualContinuityGuidance || '',
      visualTransitionIntent: normalizeVisualTransitionIntent(screen.visualTransitionIntent)
    };

    (Array.isArray(screen.directions) ? screen.directions : []).forEach((direction) => {
      if (direction.targetScreenId === safeSelectedScreenId) {
        incoming.push({
          via: direction.label || direction.direction,
          screen: summary
        });
      }
    });

    if (screen.id === safeSelectedScreenId) {
      (Array.isArray(screen.directions) ? screen.directions : []).forEach((direction) => {
        const targetScreen = screens.find((entry) => entry.id === direction.targetScreenId);
        if (!targetScreen) return;
        outgoing.push({
          via: direction.label || direction.direction,
          screen: {
            id: targetScreen.id,
            title: targetScreen.title || targetScreen.id,
            imageUrl: targetScreen.imageUrl || '',
            imagePrompt: targetScreen.image_prompt || '',
            referenceImagePrompt: targetScreen.referenceImagePrompt || '',
            visualContinuityGuidance: targetScreen.visualContinuityGuidance || '',
            visualTransitionIntent: normalizeVisualTransitionIntent(targetScreen.visualTransitionIntent)
          }
        });
      });
    }
  });

  return { incoming, outgoing };
}

import React from 'react';
import { advanceQuest, logQuestTraversal, materializeRoseCourtLocationMurals } from '../api/questScreens';
import RoseCourtWellScene from '../components/well/RoseCourtWellScene';
import { buildRoseCourtWellSceneProps } from '../components/well/wellSceneConfig';
import { seedTypewriterSessionFromWell } from '../components/well/wellTypewriterSessionBridge';
import {
  persistQuestAdminScope,
  ROSE_COURT_PROLOGUE_SCOPE,
  ROSE_COURT_PROLOGUE_STORAGE_KEYS
} from '../quest/questScopeDefaults';
import {
  BASIC_SCENE_TEMPLATE,
  getScreenComponentBindings,
  ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID
} from './sceneComponentRegistry';

const LOCATION_CLERK_SCENE_ID = 'rose_court_clerk_location';
const TRANSPORT_CLERK_SCENE_ID = 'rose_court_clerk_transport';
const LOCATION_VARIANT_IDS = [
  'location_mural_high_room',
  'location_mural_weather_cabin',
  'location_mural_quiet_cottage'
];
const LOCATION_VARIANT_ID_SET = new Set(LOCATION_VARIANT_IDS);
const WELL_APPROACH_SCREEN_ID = 'inner_court_well_approach';
const WELL_SCREEN_ID = 'inner_court_well';
const BLACKOUT_SCREEN_ID = 'inner_court_blackout';
const PHONE_FOUND_SCREEN_ID = 'phone_found';
const LOCATION_GALLERY_SCREEN_ID = 'location_mural_gallery';
const MESSENGER_COMPONENT_ID = 'messenger';
const LOCATION_MURAL_MATERIALIZER_COMPONENT_ID = 'location_mural_materializer';
const WELL_SEQUENCE_COMPONENT_ID = 'well_sequence';

const MESSENGER_SCENE_META = Object.freeze({
  [LOCATION_CLERK_SCENE_ID]: {
    introCaption: 'Open the recovered handset',
    threadTitle: 'Clerk Vale',
    threadEyebrow: 'Hall of the Rose relay · weak carrier',
    openThreadLabel: 'The clerk is waiting',
    sealedThreadLabel: 'Location confirmed',
    placeholderText: 'Give the clerk a precise place on Earth where the typewriter should be sent.'
  },
  [TRANSPORT_CLERK_SCENE_ID]: {
    introCaption: 'Answer the returning transmission',
    threadTitle: 'Clerk Vale',
    threadEyebrow: 'Inner court relay · unstable carrier',
    openThreadLabel: 'Transmission urgent',
    sealedThreadLabel: 'Transport recorded',
    placeholderText: 'Tell Clerk Vale what real mode of transportation you could actually manage in haste.'
  }
});

const getTransportSummaryLabel = (sceneBrief = null) => {
  const features = Array.isArray(sceneBrief?.notableFeatures) ? sceneBrief.notableFeatures : [];
  const transportEntry = features.find((entry) => /transport the player can manage:/i.test(String(entry)));
  if (!transportEntry) return 'recorded';
  const [, value = 'recorded'] = String(transportEntry).split(/:\s*/);
  return value || 'recorded';
};

const getStageBeat = (screenId = '') => {
  if (screenId === PHONE_FOUND_SCREEN_ID) return 'First Contact';
  if (screenId === 'rock_scatter') return 'Among the Stones';
  if (screenId === LOCATION_GALLERY_SCREEN_ID) return 'Second Wall';
  if (LOCATION_VARIANT_ID_SET.has(screenId)) return 'Mural Aspect';
  if (screenId === WELL_APPROACH_SCREEN_ID) return 'Inner Court';
  if (screenId === WELL_SCREEN_ID) return 'Well of Fragments';
  if (screenId === BLACKOUT_SCREEN_ID) return 'Curtain Fall';
  return 'Outer Threshold';
};

const getStageCues = (
  screenId = '',
  { messengerConfirmed = false, locationVariantsReady = false } = {}
) => {
  const cues = [];

  if (screenId === PHONE_FOUND_SCREEN_ID) {
    cues.push('Recovered handset', messengerConfirmed ? 'ledger marked' : 'carrier weak');
  } else if (screenId === 'rock_scatter') {
    cues.push('plateau stones', 'static closer');
  } else if (screenId === LOCATION_GALLERY_SCREEN_ID || LOCATION_VARIANT_ID_SET.has(screenId)) {
    cues.push('earthly address answered', locationVariantsReady ? 'three new aspects' : 'wall awakening');
  } else if (screenId === WELL_APPROACH_SCREEN_ID) {
    cues.push('broken path', 'well found', 'rose structure nearer');
  } else if (screenId === WELL_SCREEN_ID) {
    cues.push('paper rising', 'falcon watching', 'ten-word parchment');
  } else if (screenId === BLACKOUT_SCREEN_ID) {
    cues.push('falcon ascended', 'scene ended');
  } else {
    cues.push('evening wind', 'faint radio hiss');
  }

  return cues.filter(Boolean);
};

const hasLocationVariants = (screenMap) => (
  LOCATION_VARIANT_IDS.every((screenId) => screenMap.has(screenId))
);

const hasWellSequence = (screenMap) => (
  screenMap.has(WELL_APPROACH_SCREEN_ID)
  && screenMap.has(WELL_SCREEN_ID)
  && screenMap.has(BLACKOUT_SCREEN_ID)
);

const getSceneComponentSet = (config = {}) => new Set(
  Array.isArray(config?.sceneComponents) ? config.sceneComponents : []
);

const hasSceneComponent = (config = {}, componentId = '') => (
  getSceneComponentSet(config).has(componentId)
);

const getBindingsForScreen = (config = {}, screen = null, componentId = '', slot = '') => (
  getScreenComponentBindings(screen, config?.sceneComponents)
    .filter((binding) => {
      if (componentId && binding.componentId !== componentId) return false;
      if (slot && binding.slot !== slot) return false;
      return true;
    })
);

export const ROSE_COURT_PROLOGUE_RUNTIME_PROFILE = Object.freeze({
  id: 'rose-court-prologue',
  scope: {
    apiBaseStorageKey: 'roseCourtPrologueApiBaseUrl',
    sessionIdStorageKey: ROSE_COURT_PROLOGUE_STORAGE_KEYS.sessionId,
    playerIdStorageKey: 'roseCourtProloguePlayerId',
    defaultSessionId: ROSE_COURT_PROLOGUE_SCOPE.sessionId,
    questId: ROSE_COURT_PROLOGUE_SCOPE.questId,
    defaultPlayerId: 'rose-court-wanderer'
  },
  syncScope(storage, scope = {}) {
    persistQuestAdminScope(storage, scope);
  },
  getMessengerSceneIds(config = null) {
    return hasSceneComponent(config, MESSENGER_COMPONENT_ID)
      ? [LOCATION_CLERK_SCENE_ID, TRANSPORT_CLERK_SCENE_ID]
      : [];
  },
  getDefaultMessengerSceneId(config = null) {
    return hasSceneComponent(config, MESSENGER_COMPONENT_ID)
      ? LOCATION_CLERK_SCENE_ID
      : '';
  },
  messenger: {
    scenesMeta: MESSENGER_SCENE_META
  },
  copy: {
    sceneAriaLabel: 'Rose Court scene',
    loadingLabel: 'Loading the outer wall…',
    loadingPrompt: 'Summoning the wall…',
    materializingLabel: 'Materializing the second wall of murals…',
    promptLabel: 'What do you do?',
    noPathLabel: 'No path opens from this moment yet.',
    messengerDialogAriaLabel: 'Storyteller Society clerk',
    messengerRecoveredLabel: 'Recovered handset',
    messengerCloseLabel: 'Return to wall',
    wellPromptMuted: 'The parchment waits in the scene above.',
    blackoutAriaLabel: 'The opening scene ends in darkness',
    loadQuestError: 'Unable to load the rose court prologue.',
    loadMessengerError: 'Unable to load the clerk transmission.',
    advanceError: 'Unable to advance the prologue.',
    directionError: 'Unable to move there.',
    specialCompleteError: 'Unable to end the prologue after the parchment is offered.'
  },
  buildSceneState({
    config,
    activeScreen,
    screenMap,
    directions,
    traversalEvents,
    messengerStateByScene,
    wellSceneState
  }) {
    const messengerEnabled = hasSceneComponent(config, MESSENGER_COMPONENT_ID);
    const locationMuralMaterializerEnabled = hasSceneComponent(config, LOCATION_MURAL_MATERIALIZER_COMPONENT_ID);
    const wellSequenceEnabled = hasSceneComponent(config, WELL_SEQUENCE_COMPONENT_ID);
    const openingSequenceEnabled = hasSceneComponent(config, ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID);
    const activeScreenBindings = getBindingsForScreen(config, activeScreen);
    const messengerActionBindings = activeScreenBindings.filter(
      (binding) => binding.componentId === MESSENGER_COMPONENT_ID && binding.slot === 'action_button'
    );
    const messengerAutoBindings = activeScreenBindings.filter(
      (binding) => binding.componentId === MESSENGER_COMPONENT_ID && binding.slot === 'auto_open'
    );
    const materializerBindings = activeScreenBindings.filter(
      (binding) => binding.componentId === LOCATION_MURAL_MATERIALIZER_COMPONENT_ID && binding.slot === 'screen_effect'
    );
    const hasWellSequenceBinding = activeScreenBindings.some(
      (binding) => binding.componentId === WELL_SEQUENCE_COMPONENT_ID && binding.slot === 'screen_media'
    );
    const activeScreenId = activeScreen?.id || '';
    const locationMessengerState = messengerStateByScene[LOCATION_CLERK_SCENE_ID] || {
      hasChatEnded: false,
      sceneBrief: null,
      count: 0
    };
    const transportMessengerState = messengerStateByScene[TRANSPORT_CLERK_SCENE_ID] || {
      hasChatEnded: false,
      sceneBrief: null,
      count: 0
    };
    const isWellApproachScreen = activeScreenId === WELL_APPROACH_SCREEN_ID;
    const isWellScreen = activeScreenId === WELL_SCREEN_ID;
    const isBlackoutScreen = activeScreenId === BLACKOUT_SCREEN_ID;
    const locationVariantsReady = hasLocationVariants(screenMap);
    const wellSequenceReady = hasWellSequence(screenMap);
    const visibleHistory = traversalEvents
      .filter((entry) => typeof entry?.promptText === 'string' && entry.promptText.trim())
      .slice()
      .reverse()
      .slice(0, 4);
    const requiresTransportResolution = messengerActionBindings.some(
      (binding) => binding.props?.sceneId === TRANSPORT_CLERK_SCENE_ID
    ) || messengerAutoBindings.some(
      (binding) => binding.props?.sceneId === TRANSPORT_CLERK_SCENE_ID
    );
    const visibleDirections = (
      !isWellApproachScreen || !wellSequenceEnabled || !messengerEnabled || !requiresTransportResolution || transportMessengerState.hasChatEnded
        ? directions
        : directions.filter((direction) => direction.targetScreenId !== WELL_SCREEN_ID)
    );
    const variantScreens = directions
      .filter((direction) => LOCATION_VARIANT_ID_SET.has(direction.targetScreenId))
      .map((direction) => screenMap.get(direction.targetScreenId))
      .filter(Boolean);
    const transmissionStatus = !messengerEnabled
      ? 'This scene is running without the recovered handset attached.'
      : isWellScreen
      ? (
        wellSceneState.submittedLine
          ? 'The falcon is climbing toward the dovecot with your line.'
          : wellSceneState.readyForWriting
            ? `The court is waiting for a line. ${wellSceneState.wordsRemaining} words remain.`
            : 'The falcon waits on the roof while the fragments continue to rise.'
      )
      : isWellApproachScreen
        ? (
          transportMessengerState.hasChatEnded
            ? 'Clerk Vale has logged the transport. The well waits below.'
            : 'The handset crackles again. Clerk Vale wants one urgent practical answer before the well is approached.'
        )
        : locationMessengerState.hasChatEnded
          ? 'Clerk Vale has accepted the address.'
          : activeScreenId === PHONE_FOUND_SCREEN_ID
            ? 'The recovered handset is live.'
            : 'A weak carrier persists beneath the wind.';

    const supplementalNarrative = [];
    if (isWellScreen && wellSceneState.latestFragment) {
      supplementalNarrative.push({
        variant: 'note',
        text: `Resurfacing fragment: "${wellSceneState.latestFragment}"`
      });
    }
    if (messengerEnabled && locationMessengerState.sceneBrief?.placeName) {
      supplementalNarrative.push({
        variant: 'ledger',
        text: `Earthly destination: ${locationMessengerState.sceneBrief.placeName}`
      });
    }
    if (messengerEnabled && locationMessengerState.sceneBrief?.placeSummary) {
      supplementalNarrative.push({
        variant: 'ledger',
        text: locationMessengerState.sceneBrief.placeSummary
      });
    }
    if (messengerEnabled && transportMessengerState.hasChatEnded) {
      supplementalNarrative.push({
        variant: 'ledger',
        text: `Transport logged: ${getTransportSummaryLabel(transportMessengerState.sceneBrief)}`
      });
    }

    return {
      activeScreenId,
      isWellApproachScreen,
      isWellScreen,
      isBlackoutScreen,
      backgroundUrl: isBlackoutScreen ? '' : (activeScreen?.imageUrl || '/ruin_south_a.png'),
      visibleHistory,
      visibleDirections,
      variantScreens,
      stageBeat: getStageBeat(activeScreenId),
      stageCues: getStageCues(activeScreenId, {
        messengerConfirmed: locationMessengerState.hasChatEnded,
        locationVariantsReady
      }),
      transmissionStatus,
      supplementalNarrative,
      activeScreenBindings,
      messengerActionBindings,
      messengerAutoBindings,
      materializerBindings,
      hasWellSequenceBinding,
      sceneComponentsEnabled: {
        messenger: messengerEnabled,
        locationMuralMaterializer: locationMuralMaterializerEnabled,
        wellSequence: wellSequenceEnabled,
        openingSequence: openingSequenceEnabled
      },
      locationVariantsReady,
      wellSequenceReady
    };
  },
  async maybeMaterialize({
    config,
    apiBaseUrl,
    sessionId,
    questId,
    playerId,
    activeScreen,
    sceneState,
    messengerStateByScene,
    materializing,
    flowRef,
    applyQuestPayload,
    setMaterializing,
    setMessengerOpen,
    setMessengerError
  }) {
    if (!hasSceneComponent(config, LOCATION_MURAL_MATERIALIZER_COMPONENT_ID)) return;
    const activeMaterializerBinding = Array.isArray(sceneState.materializerBindings)
      ? sceneState.materializerBindings.find((binding) => {
          const trigger = String(binding.props?.trigger || '').trim().toLowerCase();
          const messengerSceneId = String(binding.props?.messengerSceneId || '').trim();
          return trigger === 'after_messenger_complete' && messengerSceneId === LOCATION_CLERK_SCENE_ID;
        })
      : null;
    if (!activeMaterializerBinding) return;
    const locationMessengerState = messengerStateByScene[LOCATION_CLERK_SCENE_ID];
    const sceneBrief = locationMessengerState?.sceneBrief;
    if (!locationMessengerState?.hasChatEnded || !sceneBrief) return;
    if (sceneState.locationVariantsReady && sceneState.wellSequenceReady) return;
    if (materializing) return;

    const locationKey = `${sessionId}:${sceneBrief.placeName || ''}`;
    if (flowRef.current.materializedLocationKey === locationKey && sceneState.locationVariantsReady && !sceneState.wellSequenceReady) {
      return;
    }

    try {
      setMaterializing(true);
      const payload = await materializeRoseCourtLocationMurals(apiBaseUrl, {
        sessionId,
        questId,
        sceneId: LOCATION_CLERK_SCENE_ID,
        playerId,
        fromScreenId: activeScreen?.id || PHONE_FOUND_SCREEN_ID
      });
      flowRef.current.materializedLocationKey = locationKey;
      applyQuestPayload(payload);
      setMessengerOpen(false);
      setMessengerError('');
    } catch (err) {
      setMessengerError(err.message || 'Unable to materialize the second wall of murals.');
    } finally {
      setMaterializing(false);
    }
  },
  getAutoOpenMessengerSceneId({ config, sceneState, messengerStateByScene, flowRef }) {
    if (!hasSceneComponent(config, MESSENGER_COMPONENT_ID)) {
      return '';
    }
    for (const binding of Array.isArray(sceneState.messengerAutoBindings) ? sceneState.messengerAutoBindings : []) {
      const sceneId = String(binding.props?.sceneId || '').trim();
      if (!sceneId) continue;
      const autoOpenKey = `${sceneState.activeScreenId}:${sceneId}`;
      if (!flowRef.current.autoOpenedMessengerKeys) {
        flowRef.current.autoOpenedMessengerKeys = {};
      }
      if (flowRef.current.autoOpenedMessengerKeys[autoOpenKey]) {
        continue;
      }
      if (sceneId === TRANSPORT_CLERK_SCENE_ID) {
        const transportState = messengerStateByScene[TRANSPORT_CLERK_SCENE_ID];
        const locationState = messengerStateByScene[LOCATION_CLERK_SCENE_ID];
        if (locationState?.hasChatEnded && !transportState?.hasChatEnded) {
          flowRef.current.autoOpenedMessengerKeys[autoOpenKey] = true;
          return sceneId;
        }
        continue;
      }
      const state = messengerStateByScene[sceneId];
      if (!state?.hasChatEnded) {
        flowRef.current.autoOpenedMessengerKeys[autoOpenKey] = true;
        return sceneId;
      }
    }
    return '';
  },
  getAdvanceMessengerSceneId(screenId = '', { config, response } = {}) {
    if (!hasSceneComponent(config, MESSENGER_COMPONENT_ID)) return '';
    const nextScreen = response?.screen;
    const bindings = getBindingsForScreen(config, nextScreen, MESSENGER_COMPONENT_ID, 'auto_open');
    return String(bindings[0]?.props?.sceneId || '').trim();
  },
  renderSceneMedia({
    apiBaseUrl,
    config,
    activeScreen,
    sceneState,
    sessionId,
    playerId,
    directions,
    advancing,
    wellConfig,
    onWellStateChange,
    onWellComplete,
    onDirectionClick
  }) {
    if (sceneState.isWellScreen && sceneState.hasWellSequenceBinding) {
      return (
        <RoseCourtWellScene
          {...buildRoseCourtWellSceneProps(wellConfig, {
            backgroundSrc: activeScreen?.imageUrl || undefined
          })}
          apiBaseUrl={apiBaseUrl}
          sessionId={sessionId}
          playerId={playerId}
          isCompleting={advancing}
          onComplete={onWellComplete}
          onStateChange={onWellStateChange}
        />
      );
    }

    return (
      <>
        <div className="talePhotoTape" aria-hidden="true" />
        <img
          key={activeScreen?.id || 'loading'}
          className="taleSceneImage"
          src={sceneState.backgroundUrl}
          alt={activeScreen?.title || 'Rose Court illustration'}
        />
        <div className="taleSceneWash" aria-hidden="true" />
        <div className="taleSceneVignette" />

        {activeScreen?.title ? (
          <div className="taleSceneCaption">
            <span>{activeScreen.title}</span>
          </div>
        ) : null}

        {sceneState.activeScreenId === LOCATION_GALLERY_SCREEN_ID && sceneState.variantScreens.length > 0 ? (
          <div className="taleVariantOverlay">
            {sceneState.variantScreens.map((screen) => (
              <button
                key={screen.id}
                type="button"
                className="taleVariantCard"
                onClick={() => onDirectionClick(
                  directions.find((direction) => direction.targetScreenId === screen.id) || {}
                )}
              >
                <span className="taleVariantCard__label">Second Wall</span>
                <strong>{screen.title}</strong>
                <p>{screen.expectationSummary || screen.prompt}</p>
              </button>
            ))}
          </div>
        ) : null}
      </>
    );
  },
  renderPrimaryActionButtons({ config, sceneState, messengerStateByScene, openMessengerScene }) {
    if (!hasSceneComponent(config, MESSENGER_COMPONENT_ID)) {
      return [];
    }
    return (Array.isArray(sceneState.messengerActionBindings) ? sceneState.messengerActionBindings : [])
      .filter((binding) => {
        const sceneId = String(binding.props?.sceneId || '').trim();
        if (!sceneId) return false;
        if (sceneId === LOCATION_CLERK_SCENE_ID) {
          return !messengerStateByScene[LOCATION_CLERK_SCENE_ID]?.hasChatEnded;
        }
        if (sceneId === TRANSPORT_CLERK_SCENE_ID) {
          return !messengerStateByScene[TRANSPORT_CLERK_SCENE_ID]?.hasChatEnded;
        }
        return true;
      })
      .map((binding, index) => {
        const sceneId = String(binding.props?.sceneId || '').trim();
        const label = String(binding.props?.label || '').trim() || 'Open messenger';
        return (
          <button
            key={`${sceneId || 'messenger'}-${index}`}
            type="button"
            className="taleCmd"
            onClick={() => openMessengerScene(sceneId)}
          >
            {label}
          </button>
        );
      });
  },
  async handleSpecialSceneComplete({
    apiBaseUrl,
    sessionId,
    questId,
    playerId,
    activeScreen,
    directions,
    submittedValue,
    applyQuestPayload,
    appendTraversalEvent
  }) {
    const endDirection = directions.find((direction) => direction.targetScreenId === BLACKOUT_SCREEN_ID) || {
      direction: 'end',
      targetScreenId: BLACKOUT_SCREEN_ID
    };

    await seedTypewriterSessionFromWell(apiBaseUrl, sessionId, submittedValue);

    try {
      const traversalPayload = await logQuestTraversal(apiBaseUrl, {
        sessionId,
        questId,
        playerId,
        fromScreenId: activeScreen.id,
        toScreenId: activeScreen.id,
        direction: 'parchment',
        promptText: submittedValue
      });
      if (traversalPayload?.event) {
        appendTraversalEvent(traversalPayload.event);
      }
    } catch {
      // Keep the scene moving even if the custom parchment log fails.
    }

    const payload = await advanceQuest(apiBaseUrl, {
      sessionId,
      questId,
      playerId,
      currentScreenId: activeScreen.id,
      actionType: 'direction',
      direction: endDirection.direction || 'end',
      targetScreenId: endDirection.targetScreenId || BLACKOUT_SCREEN_ID
    });
    applyQuestPayload(payload);
  },
  buildRenderGameState({
    sessionId,
    questId,
    playerId,
    config,
    activeScreen,
    sceneState,
    storyBoardState,
    messengerOpen,
    activeMessengerSceneId,
    messengerStateByScene,
    wellSceneState
  }) {
    const locationState = messengerStateByScene[LOCATION_CLERK_SCENE_ID] || {};
    const transportState = messengerStateByScene[TRANSPORT_CLERK_SCENE_ID] || {};

    return {
      mode: 'rose-court-prologue',
      sessionId,
      questId,
      playerId,
      sceneName: config?.sceneName || '',
      sceneTemplate: config?.sceneTemplate || BASIC_SCENE_TEMPLATE,
      sceneComponents: Array.isArray(config?.sceneComponents) ? config.sceneComponents : [],
      currentScreenId: activeScreen?.id || '',
      currentScreenTitle: activeScreen?.title || '',
      messenger: {
        open: messengerOpen,
        activeSceneId: activeMessengerSceneId,
        location: {
          sceneId: LOCATION_CLERK_SCENE_ID,
          hasChatEnded: Boolean(locationState.hasChatEnded),
          placeName: locationState.sceneBrief?.placeName || '',
          messageCount: locationState.count || 0
        },
        transport: {
          sceneId: TRANSPORT_CLERK_SCENE_ID,
          hasChatEnded: Boolean(transportState.hasChatEnded),
          transportLabel: getTransportSummaryLabel(transportState.sceneBrief),
          messageCount: transportState.count || 0
        }
      },
      locationVariantsReady: sceneState.locationVariantsReady,
      wellSequenceReady: sceneState.wellSequenceReady,
      sceneComponentsEnabled: sceneState.sceneComponentsEnabled,
      activeScreenBindings: Array.isArray(sceneState.activeScreenBindings) ? sceneState.activeScreenBindings : [],
      specialScene: {
        isWellApproachScreen: sceneState.isWellApproachScreen,
        isWellScreen: sceneState.isWellScreen,
        isBlackoutScreen: sceneState.isBlackoutScreen,
        wellState: wellSceneState
      },
      storyBoard: storyBoardState || {
        enabled: true,
        transition: null,
        currentScreenId: activeScreen?.id || '',
        hintedScreenIds: [],
        visitedScreenIds: []
      },
      directions: sceneState.visibleDirections.map((direction) => ({
        direction: direction.direction,
        targetScreenId: direction.targetScreenId
      })),
      promptHistory: sceneState.visibleHistory.map((entry) => ({
        fromScreenId: entry.fromScreenId || '',
        toScreenId: entry.toScreenId || '',
        promptText: entry.promptText || ''
      }))
    };
  }
});

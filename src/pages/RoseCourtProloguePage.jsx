import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Messanger from '../Messanger';
import {
  DEFAULT_API_BASE_URL,
  advanceQuest,
  logQuestTraversal,
  loadQuestScreens,
  loadQuestTraversal,
  materializeRoseCourtLocationMurals
} from '../api/questScreens';
import { loadMessengerConversation } from '../api/messenger';
import ImmersiveRpgStageModules from '../components/immersive-rpg/ImmersiveRpgStageModules';
import RoseCourtWellScene from '../components/well/RoseCourtWellScene';
import './RoseCourtProloguePage.css';

const API_BASE_STORAGE_KEY = 'roseCourtPrologueApiBaseUrl';
const SESSION_ID_STORAGE_KEY = 'roseCourtPrologueSessionId';
const PLAYER_ID_STORAGE_KEY = 'roseCourtProloguePlayerId';

const DEFAULT_SESSION_ID = 'rose-court-prologue-demo';
const DEFAULT_QUEST_ID = 'rose_court_prologue_phase_1';
const DEFAULT_PLAYER_ID = 'rose-court-wanderer';
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
const DEFAULT_WELL_SCENE_STATE = {
  phase: 'observing',
  latestFragment: '',
  readyForWriting: false,
  draftLine: '',
  submittedLine: '',
  wordCount: 0,
  wordsRemaining: 10,
  fragmentCount: 0
};
const EMPTY_MESSENGER_SCENE_STATE = Object.freeze({
  hasChatEnded: false,
  sceneBrief: null,
  count: 0
});
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

const getStoredValue = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  return stored && stored.trim() ? stored : fallback;
};

const getInitialApiBaseUrl = () => getStoredValue(API_BASE_STORAGE_KEY, DEFAULT_API_BASE_URL);
const getInitialSessionId = () => getStoredValue(SESSION_ID_STORAGE_KEY, DEFAULT_SESSION_ID);
const getInitialPlayerId = () => getStoredValue(PLAYER_ID_STORAGE_KEY, DEFAULT_PLAYER_ID);

const toScreenMap = (config) => {
  const map = new Map();
  if (!config || !Array.isArray(config.screens)) return map;
  config.screens.forEach((screen) => {
    if (!screen || typeof screen.id !== 'string') return;
    map.set(screen.id, screen);
  });
  return map;
};

const formatTime = (timestamp) => {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return '';
  return new Date(parsed).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const hasLocationVariants = (screenMap) => (
  LOCATION_VARIANT_IDS.every((screenId) => screenMap.has(screenId))
);

const hasWellSequence = (screenMap) => (
  screenMap.has(WELL_APPROACH_SCREEN_ID)
  && screenMap.has(WELL_SCREEN_ID)
  && screenMap.has(BLACKOUT_SCREEN_ID)
);

const getRoseCourtStageBeat = (screenId = '') => {
  if (screenId === 'phone_found') return 'First Contact';
  if (screenId === 'rock_scatter') return 'Among the Stones';
  if (screenId === 'location_mural_gallery') return 'Second Wall';
  if (LOCATION_VARIANT_ID_SET.has(screenId)) return 'Mural Aspect';
  if (screenId === WELL_APPROACH_SCREEN_ID) return 'Inner Court';
  if (screenId === WELL_SCREEN_ID) return 'Well of Fragments';
  if (screenId === BLACKOUT_SCREEN_ID) return 'Curtain Fall';
  return 'Outer Threshold';
};

const getRoseCourtStageCues = (
  screenId = '',
  { messengerConfirmed = false, locationVariantsReady = false } = {}
) => {
  const cues = [];

  if (screenId === 'phone_found') {
    cues.push('Recovered handset', messengerConfirmed ? 'ledger marked' : 'carrier weak');
  } else if (screenId === 'rock_scatter') {
    cues.push('plateau stones', 'static closer');
  } else if (screenId === 'location_mural_gallery' || LOCATION_VARIANT_ID_SET.has(screenId)) {
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

function RoseCourtProloguePage({
  initialApiBaseUrl = getInitialApiBaseUrl()
}) {
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [playerId, setPlayerId] = useState(getInitialPlayerId);
  const [config, setConfig] = useState(null);
  const [currentScreenId, setCurrentScreenId] = useState('');
  const [playerPrompt, setPlayerPrompt] = useState('');
  const [traversalEvents, setTraversalEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [materializing, setMaterializing] = useState(false);
  const [messengerOpen, setMessengerOpen] = useState(false);
  const [activeMessengerSceneId, setActiveMessengerSceneId] = useState(LOCATION_CLERK_SCENE_ID);
  const [error, setError] = useState('');
  const [messengerError, setMessengerError] = useState('');
  const [imageStatus, setImageStatus] = useState('idle');
  const [wellSceneState, setWellSceneState] = useState(DEFAULT_WELL_SCENE_STATE);
  const [messengerStateByScene, setMessengerStateByScene] = useState({
    [LOCATION_CLERK_SCENE_ID]: EMPTY_MESSENGER_SCENE_STATE,
    [TRANSPORT_CLERK_SCENE_ID]: EMPTY_MESSENGER_SCENE_STATE
  });

  const screenMap = useMemo(() => toScreenMap(config), [config]);
  const activeScreen = useMemo(() => {
    if (!config?.screens?.length) return null;
    return screenMap.get(currentScreenId) || screenMap.get(config.startScreenId) || config.screens[0] || null;
  }, [config, currentScreenId, screenMap]);
  const activeScreenId = activeScreen?.id || '';
  const directions = Array.isArray(activeScreen?.directions) ? activeScreen.directions : [];
  const isWellApproachScreen = activeScreenId === WELL_APPROACH_SCREEN_ID;
  const isWellScreen = activeScreenId === WELL_SCREEN_ID;
  const isBlackoutScreen = activeScreenId === BLACKOUT_SCREEN_ID;
  const backgroundUrl = isBlackoutScreen ? '' : (activeScreen?.imageUrl || '/ruin_south_a.png');
  const visibleHistory = traversalEvents
    .filter((entry) => typeof entry?.promptText === 'string' && entry.promptText.trim())
    .slice()
    .reverse()
    .slice(0, 4);
  const locationVariantsReady = hasLocationVariants(screenMap);
  const wellSequenceReady = hasWellSequence(screenMap);
  const locationMessengerState = messengerStateByScene[LOCATION_CLERK_SCENE_ID] || EMPTY_MESSENGER_SCENE_STATE;
  const transportMessengerState = messengerStateByScene[TRANSPORT_CLERK_SCENE_ID] || EMPTY_MESSENGER_SCENE_STATE;
  const activeMessengerMeta = MESSENGER_SCENE_META[activeMessengerSceneId] || MESSENGER_SCENE_META[LOCATION_CLERK_SCENE_ID];
  const visibleDirections = useMemo(() => {
    if (!isWellApproachScreen || transportMessengerState.hasChatEnded) {
      return directions;
    }
    return directions.filter((direction) => direction.targetScreenId !== WELL_SCREEN_ID);
  }, [directions, isWellApproachScreen, transportMessengerState.hasChatEnded]);
  const variantScreens = useMemo(() => (
    directions
      .filter((direction) => LOCATION_VARIANT_ID_SET.has(direction.targetScreenId))
      .map((direction) => screenMap.get(direction.targetScreenId))
      .filter(Boolean)
  ), [directions, screenMap]);
  const materializedLocationKeyRef = useRef('');
  const stageBeat = getRoseCourtStageBeat(activeScreenId);
  const stageCues = getRoseCourtStageCues(activeScreenId, {
    messengerConfirmed: locationMessengerState.hasChatEnded,
    locationVariantsReady
  });
  const transmissionStatus = isWellScreen
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
        : activeScreenId === 'phone_found'
          ? 'The recovered handset is live.'
          : 'A weak carrier persists beneath the wind.';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(API_BASE_STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
  }, [playerId]);

  const mergeMessengerState = (sceneId, payload = null) => {
    setMessengerStateByScene((prev) => ({
      ...prev,
      [sceneId]: payload
        ? {
            hasChatEnded: Boolean(payload?.hasChatEnded || payload?.has_chat_ended),
            sceneBrief: payload?.sceneBrief || null,
            count: Array.isArray(payload?.messages) ? payload.messages.length : 0
          }
        : EMPTY_MESSENGER_SCENE_STATE
    }));
  };

  const loadMessengerState = async (sceneId = LOCATION_CLERK_SCENE_ID) => {
    try {
      const payload = await loadMessengerConversation(apiBaseUrl, {
        sessionId,
        sceneId
      });
      mergeMessengerState(sceneId, payload);
      setMessengerError('');
      return payload;
    } catch (err) {
      setMessengerError(err.message || 'Unable to load the clerk transmission.');
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const [questPayload, traversalPayload, locationMessengerPayload, transportMessengerPayload] = await Promise.all([
          loadQuestScreens(apiBaseUrl, { sessionId, questId: DEFAULT_QUEST_ID }),
          loadQuestTraversal(apiBaseUrl, { sessionId, questId: DEFAULT_QUEST_ID }),
          loadMessengerConversation(apiBaseUrl, { sessionId, sceneId: LOCATION_CLERK_SCENE_ID }).catch(() => null),
          loadMessengerConversation(apiBaseUrl, { sessionId, sceneId: TRANSPORT_CLERK_SCENE_ID }).catch(() => null)
        ]);
        if (!active) return;

        setConfig(questPayload);
        setTraversalEvents(Array.isArray(traversalPayload?.traversal) ? traversalPayload.traversal : []);
        setCurrentScreenId((prev) => {
          if (prev && questPayload?.screens?.some((screen) => screen.id === prev)) {
            return prev;
          }
          return questPayload?.startScreenId || questPayload?.screens?.[0]?.id || '';
        });

        mergeMessengerState(LOCATION_CLERK_SCENE_ID, locationMessengerPayload);
        mergeMessengerState(TRANSPORT_CLERK_SCENE_ID, transportMessengerPayload);
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load the rose court prologue.');
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
  }, [apiBaseUrl, sessionId]);

  useEffect(() => {
    if (isWellScreen) return;
    setWellSceneState(DEFAULT_WELL_SCENE_STATE);
  }, [isWellScreen]);

  useEffect(() => {
    if (!backgroundUrl) {
      setImageStatus(isBlackoutScreen ? 'loaded' : 'error');
      return;
    }
    let active = true;
    setImageStatus('loading');
    const img = new Image();
    img.onload = () => {
      if (active) setImageStatus('loaded');
    };
    img.onerror = () => {
      if (active) setImageStatus('error');
    };
    img.src = backgroundUrl;
    return () => {
      active = false;
    };
  }, [backgroundUrl, isBlackoutScreen]);

  const applyQuestPayload = (payload) => {
    if (payload?.config && typeof payload.config === 'object') {
      setConfig(payload.config);
    }
    if (payload?.screen?.id) {
      setCurrentScreenId(payload.screen.id);
    }
    if (payload?.event) {
      setTraversalEvents((prev) => [...prev, payload.event].slice(-400));
    }
  };

  const materializeLocationMurals = async (sceneBrief = locationMessengerState.sceneBrief, force = false) => {
    const locationKey = `${sessionId}:${sceneBrief?.placeName || ''}`;
    if (!sceneBrief || !locationMessengerState.hasChatEnded) return;
    if (locationVariantsReady && !force) return;
    if (materializing) return;
    if (materializedLocationKeyRef.current === locationKey && !force) return;

    try {
      setMaterializing(true);
      const payload = await materializeRoseCourtLocationMurals(apiBaseUrl, {
        sessionId,
        questId: DEFAULT_QUEST_ID,
        sceneId: LOCATION_CLERK_SCENE_ID,
        playerId,
        fromScreenId: activeScreen?.id || 'phone_found'
      });
      materializedLocationKeyRef.current = locationKey;
      applyQuestPayload(payload);
      setMessengerOpen(false);
      setMessengerError('');
    } catch (err) {
      setMessengerError(err.message || 'Unable to materialize the second wall of murals.');
    } finally {
      setMaterializing(false);
    }
  };

  useEffect(() => {
    if (!locationMessengerState.hasChatEnded || !locationMessengerState.sceneBrief) return;
    if (!locationVariantsReady || !wellSequenceReady) {
      materializeLocationMurals(locationMessengerState.sceneBrief, locationVariantsReady && !wellSequenceReady);
    }
  }, [locationMessengerState.hasChatEnded, locationMessengerState.sceneBrief, locationVariantsReady, wellSequenceReady]);

  useEffect(() => {
    if (!isWellApproachScreen || !locationMessengerState.hasChatEnded || transportMessengerState.hasChatEnded) {
      return;
    }
    setActiveMessengerSceneId(TRANSPORT_CLERK_SCENE_ID);
    setMessengerOpen(true);
  }, [isWellApproachScreen, locationMessengerState.hasChatEnded, transportMessengerState.hasChatEnded]);

  const handlePromptSubmit = async (event) => {
    event.preventDefault();
    if (!playerPrompt.trim() || !activeScreen || advancing) return;
    try {
      setAdvancing(true);
      setError('');
      const payload = await advanceQuest(apiBaseUrl, {
        sessionId,
        questId: DEFAULT_QUEST_ID,
        playerId,
        currentScreenId: activeScreen.id,
        actionType: 'prompt',
        promptText: playerPrompt.trim()
      });
      applyQuestPayload(payload);
      setPlayerPrompt('');
      if (payload?.screen?.id === 'phone_found') {
        setActiveMessengerSceneId(LOCATION_CLERK_SCENE_ID);
        setMessengerOpen(true);
      }
    } catch (err) {
      setError(err.message || 'Unable to advance the prologue.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleDirectionClick = async (direction) => {
    if (!activeScreen || advancing) return;
    try {
      setAdvancing(true);
      setError('');
      const payload = await advanceQuest(apiBaseUrl, {
        sessionId,
        questId: DEFAULT_QUEST_ID,
        playerId,
        currentScreenId: activeScreen.id,
        actionType: 'direction',
        direction: direction?.direction || '',
        targetScreenId: direction?.targetScreenId || ''
      });
      applyQuestPayload(payload);
      if (payload?.screen?.id === 'phone_found') {
        setActiveMessengerSceneId(LOCATION_CLERK_SCENE_ID);
        setMessengerOpen(true);
      }
    } catch (err) {
      setError(err.message || 'Unable to move there.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleWellComplete = async (submittedLine) => {
    if (!activeScreen || activeScreen.id !== WELL_SCREEN_ID || advancing) return;

    const endDirection = directions.find((direction) => direction.targetScreenId === BLACKOUT_SCREEN_ID) || {
      direction: 'end',
      targetScreenId: BLACKOUT_SCREEN_ID
    };

    try {
      setAdvancing(true);
      setError('');

      try {
        const traversalPayload = await logQuestTraversal(apiBaseUrl, {
          sessionId,
          questId: DEFAULT_QUEST_ID,
          playerId,
          fromScreenId: activeScreen.id,
          toScreenId: activeScreen.id,
          direction: 'parchment',
          promptText: submittedLine
        });
        if (traversalPayload?.event) {
          setTraversalEvents((prev) => [...prev, traversalPayload.event].slice(-400));
        }
      } catch {
        // Keep the scene moving even if the custom parchment log fails.
      }

      const payload = await advanceQuest(apiBaseUrl, {
        sessionId,
        questId: DEFAULT_QUEST_ID,
        playerId,
        currentScreenId: activeScreen.id,
        actionType: 'direction',
        direction: endDirection.direction || 'end',
        targetScreenId: endDirection.targetScreenId || BLACKOUT_SCREEN_ID
      });
      applyQuestPayload(payload);
    } catch (err) {
      setError(err.message || 'Unable to end the prologue after the parchment is offered.');
    } finally {
      setAdvancing(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.render_game_to_text = () => JSON.stringify({
      mode: 'rose-court-prologue',
      sessionId,
      questId: DEFAULT_QUEST_ID,
      playerId,
      currentScreenId: activeScreen?.id || '',
      currentScreenTitle: activeScreen?.title || '',
      messenger: {
        open: messengerOpen,
        activeSceneId: activeMessengerSceneId,
        location: {
          sceneId: LOCATION_CLERK_SCENE_ID,
          hasChatEnded: locationMessengerState.hasChatEnded,
          placeName: locationMessengerState.sceneBrief?.placeName || '',
          messageCount: locationMessengerState.count
        },
        transport: {
          sceneId: TRANSPORT_CLERK_SCENE_ID,
          hasChatEnded: transportMessengerState.hasChatEnded,
          transportLabel: getTransportSummaryLabel(transportMessengerState.sceneBrief),
          messageCount: transportMessengerState.count
        }
      },
      locationVariantsReady,
      wellSequenceReady,
      specialScene: {
        isWellApproachScreen,
        isWellScreen,
        isBlackoutScreen,
        wellState: wellSceneState
      },
      directions: visibleDirections.map((direction) => ({
        direction: direction.direction,
        targetScreenId: direction.targetScreenId
      })),
      promptHistory: visibleHistory.map((entry) => ({
        fromScreenId: entry.fromScreenId || '',
        toScreenId: entry.toScreenId || '',
        promptText: entry.promptText || ''
      }))
    });

    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [
    activeScreen,
    directions,
    isBlackoutScreen,
    isWellApproachScreen,
    isWellScreen,
    locationVariantsReady,
    messengerOpen,
    activeMessengerSceneId,
    locationMessengerState,
    transportMessengerState,
    playerId,
    sessionId,
    visibleHistory,
    visibleDirections,
    wellSceneState,
    wellSequenceReady
  ]);

  const textPanelRef = useRef(null);

  useEffect(() => {
    if (textPanelRef.current) {
      textPanelRef.current.scrollTop = textPanelRef.current.scrollHeight;
    }
  }, [visibleHistory, activeScreenId]);

  const handlePromptKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (playerPrompt.trim() && !advancing) {
        handlePromptSubmit(event);
      }
    }
  };

  if (isBlackoutScreen) {
    return (
      <div className="sierraRoot sierraRoot--blackout">
        <div className="roseCourtBlackout" aria-label="The opening scene ends in darkness" />
      </div>
    );
  }

  return (
    <div className="sierraRoot">
      {/* ── Scene illustration ── */}
      <section className={`sierraScene ${isWellScreen ? 'sierraScene--well' : ''}`} aria-label="Rose Court scene">
        {isWellScreen ? (
          <RoseCourtWellScene
            backgroundSrc={activeScreen?.imageUrl || '/well/well_background.png'}
            isCompleting={advancing}
            onComplete={handleWellComplete}
            onStateChange={setWellSceneState}
          />
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScreen?.id || 'loading'}
                className="sierraSceneImage"
                style={{ backgroundImage: `url(${backgroundUrl})` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            </AnimatePresence>
            <div className="sierraSceneVignette" />

            {/* In-scene narration overlay (Sierra-style) */}
            {activeScreen?.title ? (
              <div className="sierraSceneCaption">
                <span>{activeScreen.title}</span>
              </div>
            ) : null}

            {/* Variant gallery cards overlaid on scene */}
            {activeScreenId === 'location_mural_gallery' && variantScreens.length > 0 ? (
              <div className="sierraVariantOverlay">
                {variantScreens.map((screen) => (
                  <button
                    key={screen.id}
                    type="button"
                    className="sierraVariantCard"
                    onClick={() => handleDirectionClick(
                      directions.find((d) => d.targetScreenId === screen.id) || {}
                    )}
                  >
                    <span className="sierraVariantCard__label">Second Wall</span>
                    <strong>{screen.title}</strong>
                    <p>{screen.expectationSummary || screen.prompt}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* ── Status bar ── */}
      <div className="sierraStatusBar">
        <span className="sierraStatusBar__beat">{stageBeat}</span>
        <span className="sierraStatusBar__sep">│</span>
        {stageCues.map((cue) => (
          <span key={cue} className="sierraStatusBar__cue">{cue}</span>
        ))}
        <span className="sierraStatusBar__sep">│</span>
        <span className={`sierraStatusBar__chip ${imageStatus === 'error' ? 'is-error' : ''}`}>
          img:{imageStatus}
        </span>
        <span className={`sierraStatusBar__chip ${locationMessengerState.hasChatEnded ? 'is-ready' : ''}`}>
          clerk:{locationMessengerState.hasChatEnded ? 'ok' : '??'}
        </span>
        <span className={`sierraStatusBar__chip ${transportMessengerState.hasChatEnded ? 'is-ready' : ''}`}>
          relay:{transportMessengerState.hasChatEnded ? 'ok' : '--'}
        </span>
        <span className={`sierraStatusBar__chip ${locationVariantsReady ? 'is-ready' : ''}`}>
          murals:{locationVariantsReady ? 'open' : '--'}
        </span>
      </div>

      {/* ── Text parser panel ── */}
      <section className="sierraTextPanel" ref={textPanelRef}>
        {/* Narrative text */}
        <div className="sierraTextPanel__narrative">
          <p>{activeScreen?.prompt || 'Summoning the wall…'}</p>
          {activeScreen?.expectationSummary ? (
            <p className="sierraTextPanel__note">{activeScreen.expectationSummary}</p>
          ) : null}
          {activeScreen?.continuitySummary ? (
            <p className="sierraTextPanel__note">{activeScreen.continuitySummary}</p>
          ) : null}
          {isWellScreen && wellSceneState.latestFragment ? (
            <p className="sierraTextPanel__note">
              Resurfacing fragment: "{wellSceneState.latestFragment}"
            </p>
          ) : null}
          {locationMessengerState.sceneBrief?.placeName ? (
            <p className="sierraTextPanel__ledger">
              Earthly destination: {locationMessengerState.sceneBrief.placeName}
            </p>
          ) : null}
          {locationMessengerState.sceneBrief?.placeSummary ? (
            <p className="sierraTextPanel__ledger">{locationMessengerState.sceneBrief.placeSummary}</p>
          ) : null}
          {transportMessengerState.hasChatEnded ? (
            <p className="sierraTextPanel__ledger">
              Transport logged: {getTransportSummaryLabel(transportMessengerState.sceneBrief)}
            </p>
          ) : null}
          <p className="sierraTextPanel__transmission">{transmissionStatus}</p>
        </div>

        {/* Error / loading notices */}
        {error ? <p className="sierraNotice is-error">&gt; ERROR: {error}</p> : null}
        {messengerError ? <p className="sierraNotice is-error">&gt; ERROR: {messengerError}</p> : null}
        {materializing ? <p className="sierraNotice">&gt; Materializing the second wall of murals…</p> : null}
        {loading ? <p className="sierraNotice">&gt; Loading the outer wall…</p> : null}

        {/* Stage modules (if any) */}
        {activeScreen?.stageModules?.length ? (
          <div className="sierraModules">
            <ImmersiveRpgStageModules
              apiBaseUrl={apiBaseUrl}
              stageLayout={activeScreen.stageLayout || 'focus-left'}
              stageModules={activeScreen.stageModules}
            />
          </div>
        ) : null}

        {/* Direction commands */}
        {isWellScreen ? (
          <div className="sierraDirections">
            <p className="sierraMuted">The parchment waits in the scene above.</p>
          </div>
        ) : (
          <div className="sierraDirections">
            {activeScreenId === 'phone_found' ? (
              <button
                type="button"
                className="sierraCmd"
                onClick={() => {
                  setActiveMessengerSceneId(LOCATION_CLERK_SCENE_ID);
                  setMessengerOpen(true);
                }}
              >
                &gt; {locationMessengerState.hasChatEnded ? 'Location logged' : 'Answer the handset'}
              </button>
            ) : null}
            {isWellApproachScreen && !transportMessengerState.hasChatEnded ? (
              <button
                type="button"
                className="sierraCmd"
                onClick={() => {
                  setActiveMessengerSceneId(TRANSPORT_CLERK_SCENE_ID);
                  setMessengerOpen(true);
                }}
              >
                &gt; Answer the returning transmission
              </button>
            ) : null}

            {visibleDirections.length > 0 ? (
              visibleDirections.map((direction) => (
                <button
                  key={`${direction.direction}-${direction.targetScreenId}`}
                  type="button"
                  className="sierraCmd"
                  onClick={() => handleDirectionClick(direction)}
                  disabled={advancing}
                >
                  &gt; {direction.label || direction.direction}
                </button>
              ))
            ) : (
              <p className="sierraMuted">No movement opens from this beat yet.</p>
            )}
          </div>
        )}

        {/* Prompt history */}
        {visibleHistory.length > 0 ? (
          <div className="sierraHistory">
            {visibleHistory.map((entry) => (
              <p
                key={`${entry.createdAt || 'p'}-${entry.toScreenId || entry.fromScreenId || ''}`}
                className="sierraHistory__line"
              >
                <span className="sierraHistory__from">[{entry.fromScreenId || activeScreen?.id || 'scene'}]</span>
                {' '}{entry.promptText}
                {entry.createdAt ? <time className="sierraHistory__time">{formatTime(entry.createdAt)}</time> : null}
              </p>
            ))}
          </div>
        ) : null}

        {/* Free-text parser input */}
        {isWellScreen ? null : (
          <form onSubmit={handlePromptSubmit} className="sierraPrompt">
            <span className="sierraPrompt__chevron">&gt;</span>
            <input
              type="text"
              className="sierraPrompt__input"
              value={playerPrompt}
              onChange={(event) => setPlayerPrompt(event.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder={activeScreen?.textPromptPlaceholder || 'What do you do?'}
              disabled={advancing}
              autoFocus
            />
            <span className="sierraPrompt__cursor">█</span>
            {advancing ? <span className="sierraPrompt__loading">…</span> : null}
          </form>
        )}
      </section>

      {/* ── Messenger modal (unchanged) ── */}
      {messengerOpen ? (
          <div className="roseCourtMessengerModal" role="dialog" aria-modal="true" aria-label="Storyteller Society clerk">
          <button type="button" className="roseCourtMessengerModal__scrim" onClick={() => setMessengerOpen(false)} />
          <div className="roseCourtMessengerModal__sheet">
            <div className="roseCourtMessengerModal__bar">
              <span>Recovered handset</span>
              <button type="button" onClick={() => setMessengerOpen(false)}>Return to wall</button>
            </div>
            <Messanger
              sceneId={activeMessengerSceneId}
              sessionId={sessionId}
              lockSessionId
              showDebugControls={false}
              introCaption={activeMessengerMeta.introCaption}
              threadTitle={activeMessengerMeta.threadTitle}
              threadEyebrow={activeMessengerMeta.threadEyebrow}
              openThreadLabel={activeMessengerMeta.openThreadLabel}
              sealedThreadLabel={activeMessengerMeta.sealedThreadLabel}
              placeholderText={activeMessengerMeta.placeholderText}
              onConversationStateChange={(payload) => {
                mergeMessengerState(activeMessengerSceneId, payload);
              }}
              onCurtainDropComplete={() => {
                setMessengerOpen(false);
                loadMessengerState(activeMessengerSceneId);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default RoseCourtProloguePage;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Messanger from '../Messanger';
import TypewriterFramework from '../TypewriterFramework';
import RoseCourtOpeningSequence from '../pages/RoseCourtOpeningSequence';
import {
  DEFAULT_API_BASE_URL,
  advanceQuest,
  loadQuestScreens,
  loadQuestTraversal
} from '../api/questScreens';
import { loadMessengerConversation } from '../api/messenger';
import ImmersiveRpgStageModules from '../components/immersive-rpg/ImmersiveRpgStageModules';
import useWellSceneConfig from '../components/well/useWellSceneConfig';
import {
  getScreenComponentBindings,
  ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID
} from './sceneComponentRegistry';

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

const getStoredValue = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  return stored && stored.trim() ? stored : fallback;
};

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

const buildInitialMessengerState = (sceneIds = []) => {
  const state = {};
  (Array.isArray(sceneIds) ? sceneIds : []).forEach((sceneId) => {
    state[sceneId] = EMPTY_MESSENGER_SCENE_STATE;
  });
  return state;
};

function SceneRuntimePage({
  profile,
  initialApiBaseUrl = DEFAULT_API_BASE_URL
}) {
  const { scope } = profile;
  const [apiBaseUrl, setApiBaseUrl] = useState(() => getStoredValue(scope.apiBaseStorageKey, initialApiBaseUrl));
  const [sessionId, setSessionId] = useState(() => getStoredValue(scope.sessionIdStorageKey, scope.defaultSessionId));
  const [playerId, setPlayerId] = useState(() => getStoredValue(scope.playerIdStorageKey, scope.defaultPlayerId));
  const [config, setConfig] = useState(null);
  const [currentScreenId, setCurrentScreenId] = useState('');
  const [playerPrompt, setPlayerPrompt] = useState('');
  const [traversalEvents, setTraversalEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [materializing, setMaterializing] = useState(false);
  const [messengerOpen, setMessengerOpen] = useState(false);
  const [activeMessengerSceneId, setActiveMessengerSceneId] = useState('');
  const [typewriterOpen, setTypewriterOpen] = useState(false);
  const [activeTypewriterBinding, setActiveTypewriterBinding] = useState(null);
  const [openingSequenceOpen, setOpeningSequenceOpen] = useState(false);
  const [activeOpeningSequenceBinding, setActiveOpeningSequenceBinding] = useState(null);
  const [openingSequenceState, setOpeningSequenceState] = useState(null);
  const [error, setError] = useState('');
  const [messengerError, setMessengerError] = useState('');
  const [imageStatus, setImageStatus] = useState('idle');
  const [wellSceneState, setWellSceneState] = useState(DEFAULT_WELL_SCENE_STATE);
  const { config: wellConfig } = useWellSceneConfig(apiBaseUrl);
  const [messengerStateByScene, setMessengerStateByScene] = useState(() => buildInitialMessengerState(profile?.messenger?.sceneIds || []));
  const flowRef = useRef({});
  const textPanelRef = useRef(null);
  const messengerSceneIds = useMemo(() => {
    if (typeof profile.getMessengerSceneIds === 'function') {
      const resolvedSceneIds = profile.getMessengerSceneIds(config);
      return Array.isArray(resolvedSceneIds) ? resolvedSceneIds : [];
    }
    return Array.isArray(profile?.messenger?.sceneIds) ? profile.messenger.sceneIds : [];
  }, [profile, config]);
  const messengerDefaultSceneId = useMemo(() => {
    if (typeof profile.getDefaultMessengerSceneId === 'function') {
      return profile.getDefaultMessengerSceneId(config) || messengerSceneIds[0] || '';
    }
    return profile?.messenger?.defaultSceneId || messengerSceneIds[0] || '';
  }, [profile, config, messengerSceneIds]);
  const messengerSceneIdsKey = useMemo(() => messengerSceneIds.join('|'), [messengerSceneIds]);
  const messengerScenesMeta = profile?.messenger?.scenesMeta || {};

  const screenMap = useMemo(() => toScreenMap(config), [config]);
  const activeScreen = useMemo(() => {
    if (!config?.screens?.length) return null;
    return screenMap.get(currentScreenId) || screenMap.get(config.startScreenId) || config.screens[0] || null;
  }, [config, currentScreenId, screenMap]);
  const directions = Array.isArray(activeScreen?.directions) ? activeScreen.directions : [];
  const activeScreenComponentBindings = useMemo(
    () => getScreenComponentBindings(activeScreen, config?.sceneComponents || []),
    [activeScreen, config]
  );
  const typewriterActionBindings = useMemo(
    () => activeScreenComponentBindings.filter((binding) => binding.componentId === 'typewriter' && binding.slot === 'action_button'),
    [activeScreenComponentBindings]
  );
  const openingSequenceBindings = useMemo(
    () => activeScreenComponentBindings.filter(
      (binding) => (
        binding.componentId === ROSE_COURT_OPENING_SEQUENCE_COMPONENT_ID
        && binding.slot === 'scene_intro'
      )
    ),
    [activeScreenComponentBindings]
  );

  const sceneState = useMemo(() => {
    const computed = profile.buildSceneState({
      config,
      activeScreen,
      screenMap,
      directions,
      traversalEvents,
      messengerStateByScene,
      wellSceneState
    }) || {};

    return {
      ...computed,
      activeScreenId: activeScreen?.id || '',
      activeScreen,
      directions,
      screenMap
    };
  }, [profile, config, activeScreen, screenMap, directions, traversalEvents, messengerStateByScene, wellSceneState]);

  const activeMessengerMeta = messengerScenesMeta[activeMessengerSceneId]
    || messengerScenesMeta[messengerDefaultSceneId]
    || {};

  const resolveOpeningSequenceKey = (screenId = '', binding = null) => (
    `${screenId}:${binding?.componentId || ''}:${binding?.slot || ''}:${binding?.id || ''}`
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(scope.apiBaseStorageKey, apiBaseUrl);
  }, [apiBaseUrl, scope.apiBaseStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(scope.sessionIdStorageKey, sessionId);
    if (typeof profile.syncScope === 'function') {
      profile.syncScope(window.localStorage, { sessionId, questId: scope.questId });
    }
  }, [profile, scope, sessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(scope.playerIdStorageKey, playerId);
  }, [playerId, scope.playerIdStorageKey]);

  useEffect(() => {
    setMessengerStateByScene((prev) => {
      const next = buildInitialMessengerState(messengerSceneIds);
      messengerSceneIds.forEach((sceneId) => {
        next[sceneId] = prev?.[sceneId] || EMPTY_MESSENGER_SCENE_STATE;
      });
      return next;
    });
    setActiveMessengerSceneId((prev) => {
      if (prev && messengerSceneIds.includes(prev)) {
        return prev;
      }
      return messengerDefaultSceneId;
    });
    if (!messengerSceneIds.length) {
      setMessengerOpen(false);
    }
  }, [messengerSceneIdsKey, messengerDefaultSceneId]);

  const mergeMessengerState = (sceneId, payload = null) => {
    if (!sceneId) return;
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

  const refreshMessengerState = async (sceneId = messengerDefaultSceneId) => {
    if (!sceneId) return null;
    try {
      const payload = await loadMessengerConversation(apiBaseUrl, {
        sessionId,
        sceneId
      });
      mergeMessengerState(sceneId, payload);
      setMessengerError('');
      return payload;
    } catch (err) {
      setMessengerError(err.message || profile.copy?.loadMessengerError || 'Unable to load the transmission.');
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const messengerLoads = messengerSceneIds.map((sceneId) => (
          loadMessengerConversation(apiBaseUrl, { sessionId, sceneId }).catch(() => null)
        ));
        const [questPayload, traversalPayload, ...messengerPayloads] = await Promise.all([
          loadQuestScreens(apiBaseUrl, { sessionId, questId: scope.questId }),
          loadQuestTraversal(apiBaseUrl, { sessionId, questId: scope.questId }),
          ...messengerLoads
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

        messengerSceneIds.forEach((sceneId, index) => {
          mergeMessengerState(sceneId, messengerPayloads[index]);
        });
      } catch (err) {
        if (active) {
          setError(err.message || profile.copy?.loadQuestError || 'Unable to load the scene.');
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
  }, [apiBaseUrl, sessionId, scope.questId, messengerSceneIdsKey, profile.copy]);

  useEffect(() => {
    if (sceneState.isWellScreen) return;
    setWellSceneState(DEFAULT_WELL_SCENE_STATE);
  }, [sceneState.isWellScreen]);

  useEffect(() => {
    const binding = openingSequenceBindings[0] || null;
    const screenId = activeScreen?.id || '';

    if (!screenId || !binding) {
      setOpeningSequenceOpen(false);
      setActiveOpeningSequenceBinding(null);
      setOpeningSequenceState(null);
      return;
    }

    if (!flowRef.current.completedOpeningSequenceKeys) {
      flowRef.current.completedOpeningSequenceKeys = {};
    }

    const sequenceKey = resolveOpeningSequenceKey(screenId, binding);
    if (flowRef.current.completedOpeningSequenceKeys[sequenceKey]) {
      setOpeningSequenceOpen(false);
      setActiveOpeningSequenceBinding(null);
      setOpeningSequenceState(null);
      return;
    }

    setActiveOpeningSequenceBinding(binding);
    setOpeningSequenceState((prev) => (
      prev && prev.currentScreenId === screenId
        ? prev
        : {
            mode: 'rose-court-opening-sequence',
            phase: 'device',
            label: 'Messaging curtain',
            currentScreenId: screenId
          }
    ));
    setOpeningSequenceOpen(true);
  }, [activeScreen?.id, openingSequenceBindings]);

  useEffect(() => {
    if (!sceneState.backgroundUrl) {
      setImageStatus(sceneState.isBlackoutScreen ? 'loaded' : 'error');
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
    img.src = sceneState.backgroundUrl;
    return () => {
      active = false;
    };
  }, [sceneState.backgroundUrl, sceneState.isBlackoutScreen]);

  const appendTraversalEvent = (event) => {
    if (!event) return;
    setTraversalEvents((prev) => [...prev, event].slice(-400));
  };

  const applyQuestPayload = (payload) => {
    if (payload?.config && typeof payload.config === 'object') {
      setConfig(payload.config);
    }
    if (payload?.screen?.id) {
      setCurrentScreenId(payload.screen.id);
    }
    if (payload?.event) {
      appendTraversalEvent(payload.event);
    }
  };

  const openMessengerScene = (sceneId) => {
    if (!sceneId || !messengerSceneIds.includes(sceneId)) return;
    setActiveMessengerSceneId(sceneId);
    setMessengerOpen(true);
  };

  const openTypewriterBinding = (binding) => {
    if (!binding || typeof binding !== 'object') return;
    setActiveTypewriterBinding(binding);
    setTypewriterOpen(true);
  };

  const resolveTypewriterSessionId = (binding) => {
    const requested = String(binding?.props?.sessionId || '').trim();
    return requested || sessionId;
  };

  const resolveTypewriterInitialFragment = (binding) => {
    const fragment = binding?.props?.initialFragment;
    return typeof fragment === 'string' ? fragment : '';
  };

  const handleOpeningSequenceComplete = () => {
    const screenId = activeScreen?.id || '';
    if (!flowRef.current.completedOpeningSequenceKeys) {
      flowRef.current.completedOpeningSequenceKeys = {};
    }
    if (screenId && activeOpeningSequenceBinding) {
      flowRef.current.completedOpeningSequenceKeys[
        resolveOpeningSequenceKey(screenId, activeOpeningSequenceBinding)
      ] = true;
    }
    setOpeningSequenceOpen(false);
    setActiveOpeningSequenceBinding(null);
    setOpeningSequenceState(null);
  };

  useEffect(() => {
    let cancelled = false;
    const maybeMaterialize = async () => {
      if (typeof profile.maybeMaterialize !== 'function') return;
      await profile.maybeMaterialize({
        apiBaseUrl,
        sessionId,
        questId: scope.questId,
        playerId,
        config,
        activeScreen,
        sceneState,
        messengerStateByScene,
        materializing,
        flowRef,
        applyQuestPayload: (payload) => {
          if (!cancelled) applyQuestPayload(payload);
        },
        setMaterializing: (value) => {
          if (!cancelled) setMaterializing(value);
        },
        setMessengerOpen: (value) => {
          if (!cancelled) setMessengerOpen(value);
        },
        setMessengerError: (value) => {
          if (!cancelled) setMessengerError(value);
        }
      });
    };

    maybeMaterialize();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, sessionId, scope.questId, playerId, config, activeScreen, sceneState, messengerStateByScene, materializing, profile]);

  useEffect(() => {
    const sceneId = typeof profile.getAutoOpenMessengerSceneId === 'function'
      ? profile.getAutoOpenMessengerSceneId({ config, sceneState, messengerStateByScene, flowRef })
      : '';
    if (sceneId) {
      openMessengerScene(sceneId);
    }
  }, [profile, config, sceneState, messengerStateByScene]);

  const handleQuestAdvance = async (payload) => {
    const response = await advanceQuest(apiBaseUrl, payload);
    applyQuestPayload(response);
    const nextSceneId = typeof profile.getAdvanceMessengerSceneId === 'function'
      ? profile.getAdvanceMessengerSceneId(response?.screen?.id, {
          config,
          response,
          sceneState,
          messengerStateByScene
        })
      : '';
    if (nextSceneId) {
      const autoOpenKey = `${response?.screen?.id || ''}:${nextSceneId}`;
      if (!flowRef.current.autoOpenedMessengerKeys) {
        flowRef.current.autoOpenedMessengerKeys = {};
      }
      flowRef.current.autoOpenedMessengerKeys[autoOpenKey] = true;
      openMessengerScene(nextSceneId);
    }
    return response;
  };

  const handlePromptSubmit = async (event) => {
    event.preventDefault();
    if (!playerPrompt.trim() || !activeScreen || advancing) return;
    try {
      setAdvancing(true);
      setError('');
      await handleQuestAdvance({
        sessionId,
        questId: scope.questId,
        playerId,
        currentScreenId: activeScreen.id,
        actionType: 'prompt',
        promptText: playerPrompt.trim()
      });
      setPlayerPrompt('');
    } catch (err) {
      setError(err.message || profile.copy?.advanceError || 'Unable to advance the scene.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleDirectionClick = async (direction) => {
    if (!activeScreen || advancing) return;
    try {
      setAdvancing(true);
      setError('');
      await handleQuestAdvance({
        sessionId,
        questId: scope.questId,
        playerId,
        currentScreenId: activeScreen.id,
        actionType: 'direction',
        direction: direction?.direction || '',
        targetScreenId: direction?.targetScreenId || ''
      });
    } catch (err) {
      setError(err.message || profile.copy?.directionError || 'Unable to move there.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleSpecialSceneComplete = async (submittedValue) => {
    if (
      !activeScreen
      || !sceneState.isWellScreen
      || !sceneState.hasWellSequenceBinding
      || advancing
      || typeof profile.handleSpecialSceneComplete !== 'function'
    ) {
      return;
    }

    try {
      setAdvancing(true);
      setError('');
      await profile.handleSpecialSceneComplete({
        apiBaseUrl,
        sessionId,
        questId: scope.questId,
        playerId,
        activeScreen,
        directions,
        submittedValue,
        applyQuestPayload,
        appendTraversalEvent
      });
    } catch (err) {
      setError(err.message || profile.copy?.specialCompleteError || 'Unable to complete the scene.');
    } finally {
      setAdvancing(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.render_game_to_text = () => {
      if (openingSequenceOpen && openingSequenceState) {
        return JSON.stringify({
          ...openingSequenceState,
          currentScreenId: activeScreen?.id || '',
          sceneRuntimeProfileId: profile.id
        });
      }

      return JSON.stringify(profile.buildRenderGameState({
        sessionId,
        questId: scope.questId,
        playerId,
        config,
        activeScreen,
        sceneState,
        messengerOpen,
        activeMessengerSceneId,
        messengerStateByScene,
        wellSceneState
      }));
    };

    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [
    profile,
    sessionId,
    scope.questId,
    playerId,
    config,
    activeScreen,
    sceneState,
    openingSequenceOpen,
    openingSequenceState,
    messengerOpen,
    activeMessengerSceneId,
    messengerStateByScene,
    wellSceneState
  ]);

  useEffect(() => {
    if (textPanelRef.current) {
      textPanelRef.current.scrollTop = textPanelRef.current.scrollHeight;
    }
  }, [sceneState.visibleHistory, sceneState.activeScreenId]);

  const handlePromptKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (playerPrompt.trim() && !advancing) {
        handlePromptSubmit(event);
      }
    }
  };
  const hasWellInteraction = Boolean(sceneState.isWellScreen && sceneState.hasWellSequenceBinding);

  if (openingSequenceOpen && activeOpeningSequenceBinding) {
    return (
      <RoseCourtOpeningSequence
        onComplete={handleOpeningSequenceComplete}
        onStateChange={(nextState) => setOpeningSequenceState({
          ...nextState,
          currentScreenId: activeScreen?.id || ''
        })}
      />
    );
  }

  if (sceneState.isBlackoutScreen) {
    return (
      <div className="taleRoot taleRoot--blackout">
        <div className="roseCourtBlackout" aria-label={profile.copy?.blackoutAriaLabel || 'The scene ends in darkness'} />
      </div>
    );
  }

  return (
    <div className="taleRoot">
      <div className="talePage">
        <article className="taleSheet">
          <section className={`taleScene ${hasWellInteraction ? 'taleScene--well' : ''}`} aria-label={profile.copy?.sceneAriaLabel || 'Scene'}>
            {profile.renderSceneMedia({
              apiBaseUrl,
              config,
              activeScreen,
              sceneState,
              sessionId,
              playerId,
              directions,
              advancing,
              wellConfig,
              imageStatus,
              onWellStateChange: setWellSceneState,
              onWellComplete: handleSpecialSceneComplete,
              onDirectionClick: handleDirectionClick
            })}
          </section>

          <div className="taleChapterBar">
            <span className="taleChapterBar__beat">{sceneState.stageBeat}</span>
            <span className="taleChapterBar__sep">·</span>
            {sceneState.stageCues.map((cue) => (
              <span key={cue} className="taleChapterBar__cue">{cue}</span>
            ))}
          </div>

          <section className="taleTextPanel" ref={textPanelRef}>
            <div className="taleTextPanel__narrative">
              <p>{activeScreen?.prompt || profile.copy?.loadingPrompt || 'Loading the scene…'}</p>
              {activeScreen?.expectationSummary ? (
                <p className="taleTextPanel__note">{activeScreen.expectationSummary}</p>
              ) : null}
              {activeScreen?.continuitySummary ? (
                <p className="taleTextPanel__note">{activeScreen.continuitySummary}</p>
              ) : null}
              {(sceneState.supplementalNarrative || []).map((entry) => (
                <p key={`${entry.variant}-${entry.text}`} className={`taleTextPanel__${entry.variant || 'note'}`}>
                  {entry.text}
                </p>
              ))}
              <p className="taleTextPanel__transmission">{sceneState.transmissionStatus}</p>
            </div>

            {error ? <p className="taleNotice is-error">{error}</p> : null}
            {messengerError ? <p className="taleNotice is-error">{messengerError}</p> : null}
            {materializing ? <p className="taleNotice">{profile.copy?.materializingLabel || 'Materializing…'}</p> : null}
            {loading ? <p className="taleNotice">{profile.copy?.loadingLabel || 'Loading…'}</p> : null}

            {activeScreen?.stageModules?.length ? (
              <div className="taleModules">
                <ImmersiveRpgStageModules
                  apiBaseUrl={apiBaseUrl}
                  stageLayout={activeScreen.stageLayout || 'focus-left'}
                  stageModules={activeScreen.stageModules}
                />
              </div>
            ) : null}

            {hasWellInteraction ? (
              <div className="taleDirections">
                <p className="taleMuted">{profile.copy?.wellPromptMuted || 'The parchment waits in the scene above.'}</p>
              </div>
            ) : (
              <div className="taleDirections">
                {profile.renderPrimaryActionButtons({
                  config,
                  sceneState,
                  messengerStateByScene,
                  openMessengerScene
                })}
                {typewriterActionBindings.map((binding, index) => (
                  <button
                    key={`typewriter-${sceneState.activeScreenId}-${index}`}
                    type="button"
                    className="taleCmd"
                    onClick={() => openTypewriterBinding(binding)}
                    disabled={advancing}
                  >
                    {String(binding.props?.label || '').trim() || 'Open the typewriter'}
                  </button>
                ))}
                {sceneState.visibleDirections.length > 0 ? (
                  sceneState.visibleDirections.map((direction) => (
                    <button
                      key={`${direction.direction}-${direction.targetScreenId}`}
                      type="button"
                      className="taleCmd"
                      onClick={() => handleDirectionClick(direction)}
                      disabled={advancing}
                    >
                      {direction.label || direction.direction}
                    </button>
                  ))
                ) : (
                  <p className="taleMuted">{profile.copy?.noPathLabel || 'No path opens from this moment yet.'}</p>
                )}
              </div>
            )}

            {sceneState.visibleHistory.length > 0 ? (
              <div className="taleHistory">
                {sceneState.visibleHistory.map((entry) => (
                  <p
                    key={`${entry.createdAt || 'p'}-${entry.toScreenId || entry.fromScreenId || ''}`}
                    className="taleHistory__line"
                  >
                    <span className="taleHistory__from">[{entry.fromScreenId || activeScreen?.id || 'scene'}]</span>
                    {' '}{entry.promptText}
                    {entry.createdAt ? <time className="taleHistory__time">{formatTime(entry.createdAt)}</time> : null}
                  </p>
                ))}
              </div>
            ) : null}

            {hasWellInteraction ? null : (
              <form onSubmit={handlePromptSubmit} className="talePrompt">
                <label className="talePrompt__label" htmlFor={`${profile.id}-prompt`}>
                  {profile.copy?.promptLabel || 'What do you do?'}
                  <span>✒</span>
                </label>
                <div className="talePrompt__row">
                  <span className="talePrompt__ornament">❧</span>
                  <input
                    id={`${profile.id}-prompt`}
                    type="text"
                    className="talePrompt__input"
                    value={playerPrompt}
                    onChange={(event) => setPlayerPrompt(event.target.value)}
                    onKeyDown={handlePromptKeyDown}
                    placeholder={activeScreen?.textPromptPlaceholder || profile.copy?.promptLabel || 'What do you do?'}
                    disabled={advancing}
                  />
                  <span className="talePrompt__cursor">✎</span>
                  {advancing ? <span className="talePrompt__loading">…</span> : null}
                </div>
              </form>
            )}
          </section>
        </article>
      </div>

      {messengerOpen && activeMessengerSceneId ? (
        <div className="roseCourtMessengerModal" role="dialog" aria-modal="true" aria-label={profile.copy?.messengerDialogAriaLabel || 'Messenger'}>
          <button type="button" className="roseCourtMessengerModal__scrim" onClick={() => setMessengerOpen(false)} />
          <div className="roseCourtMessengerModal__sheet">
            <div className="roseCourtMessengerModal__bar">
              <span>{profile.copy?.messengerRecoveredLabel || 'Recovered handset'}</span>
              <button type="button" onClick={() => setMessengerOpen(false)}>
                {profile.copy?.messengerCloseLabel || 'Return to scene'}
              </button>
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
                refreshMessengerState(activeMessengerSceneId);
              }}
            />
          </div>
        </div>
      ) : null}

      {typewriterOpen && activeTypewriterBinding ? (
        <div className="sceneTypewriterModal" role="dialog" aria-modal="true" aria-label="Scene typewriter">
          <button type="button" className="sceneTypewriterModal__scrim" onClick={() => setTypewriterOpen(false)} />
          <div className="sceneTypewriterModal__sheet">
            <div className="sceneTypewriterModal__bar">
              <span>{String(activeTypewriterBinding.props?.label || '').trim() || 'Scene typewriter'}</span>
              <button type="button" onClick={() => setTypewriterOpen(false)}>
                Return to scene
              </button>
            </div>
            <div className="sceneTypewriterModal__body">
              <TypewriterFramework
                embedded
                persistSessionToStorage={false}
                persistDebugSettingsToStorage={false}
                sessionIdOverride={resolveTypewriterSessionId(activeTypewriterBinding)}
                initialFragment={resolveTypewriterInitialFragment(activeTypewriterBinding)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SceneRuntimePage;

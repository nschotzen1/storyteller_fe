import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DEFAULT_API_BASE_URL,
  advanceQuest,
  loadQuestScreens,
  loadQuestTraversal
} from '../api/questScreens';
import ImmersiveRpgStageModules from '../components/immersive-rpg/ImmersiveRpgStageModules';
import './ImmersiveRpgPage.css';
import './QuestAdventurePage.css';

const QUEST_API_BASE_STORAGE_KEY = 'questApiBaseUrl';
const QUEST_SESSION_ID_STORAGE_KEY = 'questSessionId';
const QUEST_ID_STORAGE_KEY = 'questId';
const QUEST_PLAYER_ID_STORAGE_KEY = 'questPlayerId';

const DEFAULT_QUEST_SESSION_ID = 'rose-court-demo';
const DEFAULT_QUEST_ID = 'ruined_rose_court';
const DEFAULT_PLAYER_ID = 'wanderer-01';

const getStoredValue = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  return stored && stored.trim() ? stored : fallback;
};

const getInitialApiBaseUrl = () => getStoredValue(QUEST_API_BASE_STORAGE_KEY, DEFAULT_API_BASE_URL);
const getInitialSessionId = () => getStoredValue(QUEST_SESSION_ID_STORAGE_KEY, DEFAULT_QUEST_SESSION_ID);
const getInitialQuestId = () => getStoredValue(QUEST_ID_STORAGE_KEY, DEFAULT_QUEST_ID);
const getInitialPlayerId = () => getStoredValue(QUEST_PLAYER_ID_STORAGE_KEY, DEFAULT_PLAYER_ID);

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

const QuestAdventurePage = ({
  initialApiBaseUrl = getInitialApiBaseUrl()
}) => {
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [questId, setQuestId] = useState(getInitialQuestId);
  const [playerId, setPlayerId] = useState(getInitialPlayerId);

  const [config, setConfig] = useState(null);
  const [currentScreenId, setCurrentScreenId] = useState('');
  const [playerPrompt, setPlayerPrompt] = useState('');
  const [traversalEvents, setTraversalEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');
  const [imageStatus, setImageStatus] = useState('idle');
  const [traversalCount, setTraversalCount] = useState(0);
  const [lastAdvanceRuntime, setLastAdvanceRuntime] = useState(null);
  const [lastMockedData, setLastMockedData] = useState(null);

  const screenMap = useMemo(() => toScreenMap(config), [config]);

  const activeScreen = useMemo(() => {
    if (!config || !Array.isArray(config.screens) || config.screens.length === 0) {
      return null;
    }
    return (
      screenMap.get(currentScreenId) ||
      screenMap.get(config.startScreenId) ||
      config.screens[0]
    );
  }, [config, currentScreenId, screenMap]);

  const anchorScreen = useMemo(() => {
    if (!activeScreen) return null;
    const anchorId = typeof activeScreen.anchorScreenId === 'string' ? activeScreen.anchorScreenId.trim() : '';
    return (anchorId && screenMap.get(anchorId)) || activeScreen;
  }, [activeScreen, screenMap]);

  const parentScreen = useMemo(() => {
    if (!activeScreen) return null;
    const parentId = typeof activeScreen.parentScreenId === 'string' ? activeScreen.parentScreenId.trim() : '';
    return (parentId && screenMap.get(parentId)) || null;
  }, [activeScreen, screenMap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_API_BASE_STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_SESSION_ID_STORAGE_KEY, sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_ID_STORAGE_KEY, questId);
  }, [questId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_PLAYER_ID_STORAGE_KEY, playerId);
  }, [playerId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const [questPayload, traversalPayload] = await Promise.all([
          loadQuestScreens(apiBaseUrl, { sessionId, questId }),
          loadQuestTraversal(apiBaseUrl, { sessionId, questId })
        ]);
        if (!active) return;

        setConfig(questPayload);
        setTraversalEvents(Array.isArray(traversalPayload?.traversal) ? traversalPayload.traversal : []);
        setTraversalCount(Array.isArray(traversalPayload?.traversal) ? traversalPayload.traversal.length : 0);
        setCurrentScreenId((prev) => {
          if (prev && questPayload?.screens?.some((screen) => screen.id === prev)) {
            return prev;
          }
          return questPayload?.startScreenId || questPayload?.screens?.[0]?.id || '';
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

  const canSubmitPrompt = playerPrompt.trim().length > 0 && !advancing;

  const applyAdvancePayload = (payload) => {
    if (payload?.config && typeof payload.config === 'object') {
      setConfig(payload.config);
    }
    if (payload?.screen?.id) {
      setCurrentScreenId(payload.screen.id);
    }
    if (payload?.event) {
      setTraversalEvents((prev) => [...prev, payload.event].slice(-400));
    }
    if (typeof payload?.traversalCount === 'number') {
      setTraversalCount(payload.traversalCount);
    }
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'runtime')) {
      setLastAdvanceRuntime(payload?.runtime || null);
    }
    if (Object.prototype.hasOwnProperty.call(payload || {}, 'mockedData')) {
      setLastMockedData(payload?.mockedData || null);
    }
  };

  const handleSubmitPrompt = async (event) => {
    event.preventDefault();
    if (!activeScreen || !canSubmitPrompt) return;

    const promptText = playerPrompt.trim();
    try {
      setAdvancing(true);
      setError('');
      const response = await advanceQuest(apiBaseUrl, {
        sessionId,
        questId,
        playerId,
        currentScreenId: activeScreen.id,
        actionType: 'prompt',
        promptText
      });
      applyAdvancePayload(response);
      setPlayerPrompt('');
    } catch (err) {
      setError(err.message || 'Unable to advance quest prompt.');
    } finally {
      setAdvancing(false);
    }
  };

  const handleDirectionClick = async (direction) => {
    if (!activeScreen) return;
    const toScreenId = typeof direction?.targetScreenId === 'string' ? direction.targetScreenId.trim() : '';
    if (!toScreenId || !screenMap.has(toScreenId)) return;

    try {
      setAdvancing(true);
      setError('');
      const response = await advanceQuest(apiBaseUrl, {
        sessionId,
        questId,
        playerId,
        currentScreenId: activeScreen.id,
        actionType: 'direction',
        direction: direction?.direction || '',
        targetScreenId: toScreenId
      });
      applyAdvancePayload(response);
    } catch (err) {
      setError(err.message || 'Unable to follow that direction.');
    } finally {
      setAdvancing(false);
    }
  };

  const visibleHistory = traversalEvents
    .filter((entry) => typeof entry?.promptText === 'string' && entry.promptText.trim())
    .slice()
    .reverse()
    .slice(0, 4);
  const directions = Array.isArray(activeScreen?.directions) ? activeScreen.directions : [];
  const backgroundUrl = activeScreen?.imageUrl || '/ruin_south_a.png';
  const stageLayout = activeScreen?.stageLayout || 'focus-left';
  const stageModules = Array.isArray(activeScreen?.stageModules) ? activeScreen.stageModules : [];

  useEffect(() => {
    if (!backgroundUrl) {
      setImageStatus('error');
      return;
    }
    let isActive = true;
    setImageStatus('loading');

    const img = new Image();
    img.onload = () => {
      if (isActive) {
        setImageStatus('loaded');
      }
    };
    img.onerror = () => {
      if (isActive) {
        setImageStatus('error');
      }
    };
    img.src = backgroundUrl;

    return () => {
      isActive = false;
    };
  }, [backgroundUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.render_game_to_text = () => JSON.stringify({
      mode: 'quest',
      sessionId,
      questId,
      playerId,
      currentScreenId: activeScreen?.id || '',
      currentScreenTitle: activeScreen?.title || '',
      screenType: activeScreen?.screenType || 'authored',
      anchorScreenId: anchorScreen?.id || '',
      parentScreenId: parentScreen?.id || '',
      expectationSummary: activeScreen?.expectationSummary || '',
      continuitySummary: activeScreen?.continuitySummary || '',
      lastAdvanceRuntime: lastAdvanceRuntime
        ? {
            pipeline: lastAdvanceRuntime.pipeline || '',
            provider: lastAdvanceRuntime.provider || '',
            model: lastAdvanceRuntime.model || '',
            mocked: Boolean(lastAdvanceRuntime.mocked)
          }
        : null,
      lastMockedDataSource: lastMockedData?.source || '',
      traversalCount,
      directions: directions.map((direction) => ({
        direction: direction.direction,
        label: direction.label,
        targetScreenId: direction.targetScreenId
      })),
      promptHistory: visibleHistory.map((entry) => ({
        fromScreenId: entry.fromScreenId || '',
        toScreenId: entry.toScreenId || '',
        promptText: entry.promptText || ''
      })),
      stage: {
        layout: stageLayout,
        modules: stageModules.map((module) => ({
          type: module.type,
          title: module.title,
          hasImage: Boolean(module.imageUrl)
        }))
      }
    });

    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [
    activeScreen,
    anchorScreen,
    directions,
    parentScreen,
    playerId,
    questId,
    sessionId,
    stageLayout,
    stageModules,
    lastAdvanceRuntime,
    lastMockedData,
    traversalCount,
    visibleHistory
  ]);

  return (
    <div className="questRoot">
      <div className="questAmbient" />

      <section className="questLayout" aria-live="polite">
        <section className="questCinemaShell" aria-label="Current quest scene">
          <div className="questCinemaFrame">
            <div className="questCurtain questCurtainLeft" />
            <div className="questCurtain questCurtainRight" />

            <div className="questCinemaScreen">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScreen?.id || 'loading-screen'}
                  className="questCinemaImage"
                  style={{ backgroundImage: `url(${backgroundUrl})` }}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
              </AnimatePresence>
              <div className="questCinemaDust" />
              <div className="questCinemaScanlines" />
              <div className="questLetterboxTop" />
              <div className="questLetterboxBottom" />

              <div className="questCinemaCaption">
                <p className="questEyebrow">Quest Mode</p>
                <h1>{activeScreen?.title || 'Loading Scene'}</h1>
                <p className="questPromptText">{activeScreen?.prompt || 'Summoning scene details…'}</p>
              </div>
            </div>

            <div className="questProscenium" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>

        <section className="questControlDeck">
          <header className="questControlHeader">
            <div className="questScopeFields">
              <label>
                API Base
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrl(event.target.value)}
                  placeholder="http://localhost:5001"
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
              <label>
                Player ID
                <input
                  type="text"
                  value={playerId}
                  onChange={(event) => setPlayerId(event.target.value)}
                  placeholder={DEFAULT_PLAYER_ID}
                />
              </label>
            </div>

            <div className="questMetaCluster">
              {activeScreen && <p className="questScreenMeta">Screen ID: {activeScreen.id}</p>}
              {activeScreen && (
                <p className={`questScreenMeta ${imageStatus === 'error' ? 'imageError' : ''}`}>
                  Image: {imageStatus === 'loaded' ? 'loaded' : imageStatus === 'error' ? 'failed to load' : 'loading'} (
                  {activeScreen.imageUrl || 'none'})
                </p>
              )}
              {activeScreen?.image_prompt && (
                <p className="questScreenMeta">Image Prompt: {activeScreen.image_prompt}</p>
              )}
              <p className="questScreenMeta">Traversal events: {traversalCount}</p>
              {lastAdvanceRuntime && (
                <p className="questScreenMeta">
                  Runtime: {lastAdvanceRuntime.mocked ? 'mock' : 'live'} via {lastAdvanceRuntime.provider || 'openai'} /
                  {' '}{lastAdvanceRuntime.model || 'default'}
                </p>
              )}
              {lastMockedData?.source && (
                <p className="questScreenMeta">
                  Mocked Data: {lastMockedData.source}
                  {lastMockedData?.plan?.title ? ` (${lastMockedData.plan.title})` : ''}
                </p>
              )}
              {activeScreen?.screenType === 'generated' && (
                <p className="questScreenMeta">Generated branch from {parentScreen?.title || activeScreen.parentScreenId}</p>
              )}
            </div>
          </header>

          <div className="questBody">
            <section className="questDirections" aria-label="Available directions">
              <h2>Directions</h2>
              {loading && <p className="questMessage">Loading screens…</p>}
              {error && <p className="questError">{error}</p>}
              {!loading && !error && directions.length === 0 && (
                <p className="questMessage">No exits from this screen.</p>
              )}
              {!loading && !error && directions.length > 0 && (
                <div className="questDirectionGrid">
                  {directions.map((direction, index) => {
                    const targetExists = Boolean(direction.targetScreenId && screenMap.has(direction.targetScreenId));
                    return (
                      <button
                        key={`${direction.direction}-${direction.targetScreenId}-${index}`}
                        className="questDirectionButton"
                        onClick={() => handleDirectionClick(direction)}
                        disabled={!targetExists || advancing}
                      >
                        <span>{direction.label || direction.direction}</span>
                        <small>{(direction.direction || '').toUpperCase()}</small>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="questSceneGuidance" aria-label="Scene guidance">
              <h2>Scene Guidance</h2>
              <div className="questGuidanceMeta">
                <span>Type: {activeScreen?.screenType || 'authored'}</span>
                <span>Anchor: {anchorScreen?.title || 'Unknown'}</span>
                {parentScreen && <span>From: {parentScreen.title}</span>}
              </div>
              <p className="questGuidanceCopy">
                {activeScreen?.expectationSummary || 'This screen does not yet advertise a distinct expectation.'}
              </p>
              {activeScreen?.continuitySummary && (
                <p className="questGuidanceCopy questGuidanceCopy--subtle">{activeScreen.continuitySummary}</p>
              )}
              <div className="immersiveRpgStageDeck questStageDeck">
                <div className="immersiveRpgStageDeck__header">
                  <span className="immersiveRpgSceneCard__label">GM Surface</span>
                  <span className="immersiveRpgStageDeck__layout">{stageLayout}</span>
                </div>
                <ImmersiveRpgStageModules
                  apiBaseUrl={apiBaseUrl}
                  stageLayout={stageLayout}
                  stageModules={stageModules}
                />
              </div>
            </section>

            <section className="questPrompt" aria-label="Text prompt">
              <h2>Text Prompt</h2>
              <form onSubmit={handleSubmitPrompt}>
                <textarea
                  value={playerPrompt}
                  onChange={(event) => setPlayerPrompt(event.target.value)}
                  placeholder={activeScreen?.textPromptPlaceholder || 'What do you do?'}
                  rows={4}
                />
                <button type="submit" disabled={!canSubmitPrompt || !activeScreen}>
                  {advancing ? 'Advancing…' : 'Send Prompt'}
                </button>
              </form>
              <div className="questPromptHistory">
                {visibleHistory.length === 0 && (
                  <p className="questMessage">Prompt log is empty for this run.</p>
                )}
                {visibleHistory.map((entry) => (
                  <article
                    key={`${entry.createdAt || 'prompt'}-${entry.toScreenId || entry.fromScreenId || ''}`}
                    className="questPromptEntry"
                  >
                    <header>
                      <span>{entry.fromScreenId || entry.toScreenId || activeScreen?.id || 'screen'}</span>
                      <time>{formatTime(entry.createdAt)}</time>
                    </header>
                    <p>{entry.promptText}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </section>
    </div>
  );
};

export default QuestAdventurePage;

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DEFAULT_API_BASE_URL,
  loadQuestScreens,
  loadQuestTraversal,
  logQuestTraversal
} from '../api/questScreens';
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
  const [promptHistory, setPromptHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageStatus, setImageStatus] = useState('idle');
  const [traversalCount, setTraversalCount] = useState(0);

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

  const canSubmitPrompt = playerPrompt.trim().length > 0;

  const handleSubmitPrompt = async (event) => {
    event.preventDefault();
    if (!activeScreen || !canSubmitPrompt) return;

    const promptText = playerPrompt.trim();
    const entry = {
      id: `${activeScreen.id}-${Date.now()}`,
      screenId: activeScreen.id,
      text: promptText,
      createdAt: new Date().toISOString()
    };

    setPromptHistory((prev) => [entry, ...prev].slice(0, 8));
    setPlayerPrompt('');

    try {
      const response = await logQuestTraversal(apiBaseUrl, {
        sessionId,
        questId,
        playerId,
        fromScreenId: activeScreen.id,
        toScreenId: activeScreen.id,
        direction: 'prompt',
        promptText
      });
      if (typeof response?.traversalCount === 'number') {
        setTraversalCount(response.traversalCount);
      }
    } catch (err) {
      console.error('Failed to persist prompt traversal event:', err);
    }
  };

  const handleDirectionClick = async (direction) => {
    const fromScreenId = activeScreen?.id || '';
    const toScreenId = direction?.targetScreenId;
    if (!toScreenId || !screenMap.has(toScreenId)) return;

    setCurrentScreenId(toScreenId);

    try {
      const response = await logQuestTraversal(apiBaseUrl, {
        sessionId,
        questId,
        playerId,
        fromScreenId,
        toScreenId,
        direction: direction?.direction || ''
      });
      if (typeof response?.traversalCount === 'number') {
        setTraversalCount(response.traversalCount);
      }
    } catch (err) {
      console.error('Failed to persist traversal event:', err);
    }
  };

  const visibleHistory = promptHistory.slice(0, 4);
  const directions = Array.isArray(activeScreen?.directions) ? activeScreen.directions : [];
  const backgroundUrl = activeScreen?.imageUrl || '/ruin_south_a.png';

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
                        disabled={!targetExists}
                      >
                        <span>{direction.label || direction.direction}</span>
                        <small>{(direction.direction || '').toUpperCase()}</small>
                      </button>
                    );
                  })}
                </div>
              )}
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
                  Send Prompt
                </button>
              </form>
              <div className="questPromptHistory">
                {visibleHistory.length === 0 && (
                  <p className="questMessage">Prompt log is empty for this run.</p>
                )}
                {visibleHistory.map((entry) => (
                  <article key={entry.id} className="questPromptEntry">
                    <header>
                      <span>{entry.screenId}</span>
                      <time>{formatTime(entry.createdAt)}</time>
                    </header>
                    <p>{entry.text}</p>
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

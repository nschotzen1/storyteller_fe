import React, { useEffect, useState } from 'react';
import { LoaderCircle, NotebookPen, RefreshCcw, Save, Send, Dices } from 'lucide-react';
import './ImmersiveRpgPage.css';
import {
  DEFAULT_API_BASE_URL,
  bootstrapImmersiveRpgScene,
  fetchImmersiveRpgScene,
  rollImmersiveRpg,
  saveImmersiveRpgCharacterSheet,
  sendImmersiveRpgChat
} from '../api/immersiveRpg';

const API_BASE_STORAGE_KEY = 'typewriterAdminApiBaseUrl';
const SESSION_STORAGE_KEY = 'sessionId';
const PLAYER_NAME_STORAGE_KEY = 'immersiveRpgPlayerName';

const MISSING_SESSION_MESSAGE = 'Set or generate the shared session in Story Admin before opening Immersive RPG.';

const getInitialApiBaseUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : DEFAULT_API_BASE_URL;
};

const getInitialSessionId = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : '';
};

const getInitialPlayerName = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : '';
};

const readSharedConfig = () => ({
  apiBaseUrl: getInitialApiBaseUrl(),
  sessionId: getInitialSessionId(),
  playerName: getInitialPlayerName()
});

const defaultRollForm = {
  skill: 'awareness',
  label: 'Retrieve the journal unnoticed',
  diceNotation: '5d6',
  difficulty: 'moderate-high',
  successThreshold: 5,
  successesRequired: 2
};

const rollFormFromPending = (pendingRoll) => ({
  skill: pendingRoll?.skill || defaultRollForm.skill,
  label: pendingRoll?.label || defaultRollForm.label,
  diceNotation: pendingRoll?.diceNotation || defaultRollForm.diceNotation,
  difficulty: pendingRoll?.difficulty || defaultRollForm.difficulty,
  successThreshold: pendingRoll?.successThreshold ?? defaultRollForm.successThreshold,
  successesRequired: pendingRoll?.successesRequired ?? defaultRollForm.successesRequired
});

const formatTimestamp = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed);
};

function ImmersiveRpgPage() {
  const [sharedConfig, setSharedConfig] = useState(readSharedConfig);
  const [scene, setScene] = useState(null);
  const [characterSheet, setCharacterSheet] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [rollForm, setRollForm] = useState(defaultRollForm);
  const [loading, setLoading] = useState(() => Boolean(readSharedConfig().sessionId));
  const [bootstrapping, setBootstrapping] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [error, setError] = useState('');
  const apiBaseUrl = sharedConfig.apiBaseUrl;
  const sessionId = sharedConfig.sessionId;
  const playerName = sharedConfig.playerName;
  const hasSharedSession = Boolean(sessionId);

  const hydrateFromPayload = (payload) => {
    setScene(payload?.scene || null);
    setCharacterSheet(payload?.characterSheet || payload?.scene?.characterSheet || null);
    if (payload?.scene?.pendingRoll) {
      setRollForm(rollFormFromPending(payload.scene.pendingRoll));
    }
  };

  const loadScene = async ({ forceReset = false } = {}) => {
    if (!sessionId) {
      setScene(null);
      setCharacterSheet(null);
      setLoading(false);
      setBootstrapping(false);
      setRollForm(defaultRollForm);
      return;
    }

    setError('');
    if (forceReset) {
      setBootstrapping(true);
    } else {
      setLoading(true);
    }

    try {
      const payload = forceReset
        ? await bootstrapImmersiveRpgScene(apiBaseUrl, {
          sessionId,
          playerName,
          forceReset: true
        })
        : await fetchImmersiveRpgScene(apiBaseUrl, {
          sessionId,
          playerName,
          bootstrap: true
        });
      hydrateFromPayload(payload);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load the immersive RPG scene.');
    } finally {
      setLoading(false);
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncSharedConfig = () => {
      setSharedConfig((current) => {
        const next = readSharedConfig();
        if (
          current.apiBaseUrl === next.apiBaseUrl &&
          current.sessionId === next.sessionId &&
          current.playerName === next.playerName
        ) {
          return current;
        }
        return next;
      });
    };

    const handleStorage = (event) => {
      if (
        !event.key ||
        event.key === API_BASE_STORAGE_KEY ||
        event.key === SESSION_STORAGE_KEY ||
        event.key === PLAYER_NAME_STORAGE_KEY
      ) {
        syncSharedConfig();
      }
    };

    window.addEventListener('focus', syncSharedConfig);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', syncSharedConfig);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!sessionId) {
      setScene(null);
      setCharacterSheet(null);
      setRollForm(defaultRollForm);
      setLoading(false);
      setError('');
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError('');

    const run = async () => {
      try {
        const payload = await fetchImmersiveRpgScene(apiBaseUrl, {
          sessionId,
          playerName,
          bootstrap: true
        });
        if (!active) return;
        hydrateFromPayload(payload);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || 'Failed to load the immersive RPG scene.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [apiBaseUrl, sessionId, playerName]);

  useEffect(() => {
    if (!scene?.pendingRoll) return;
    setRollForm(rollFormFromPending(scene.pendingRoll));
  }, [scene?.pendingRoll]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.render_game_to_text = () => JSON.stringify({
      mode: 'immersive-rpg',
      sessionId,
      sceneTitle: scene?.sceneTitle || '',
      currentBeat: scene?.currentBeat || '',
      transcriptCount: scene?.transcript?.length || 0,
      pendingRoll: scene?.pendingRoll
        ? {
          skill: scene.pendingRoll.skill,
          diceNotation: scene.pendingRoll.diceNotation,
          difficulty: scene.pendingRoll.difficulty
        }
        : null,
      lastRoll: scene?.rollLog?.length ? scene.rollLog[scene.rollLog.length - 1] : null,
      characterName: characterSheet?.identity?.name || characterSheet?.playerName || ''
    });

    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [sessionId, scene, characterSheet]);

  const updateCharacterSheetField = (section, key, value) => {
    setCharacterSheet((current) => ({
      ...(current || {}),
      [section]: {
        ...(current?.[section] || {}),
        [key]: value
      }
    }));
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;
    if (!sessionId) {
      setError(MISSING_SESSION_MESSAGE);
      return;
    }

    setChatting(true);
    setError('');
    try {
      const payload = await sendImmersiveRpgChat(apiBaseUrl, {
        sessionId,
        playerName,
        message
      });
      hydrateFromPayload(payload);
      setChatInput('');
    } catch (chatError) {
      setError(chatError.message || 'Failed to send your action.');
    } finally {
      setChatting(false);
    }
  };

  const handleRollSubmit = async (event) => {
    event.preventDefault();
    if (!sessionId) {
      setError(MISSING_SESSION_MESSAGE);
      return;
    }
    setRolling(true);
    setError('');

    try {
      const payload = await rollImmersiveRpg(apiBaseUrl, {
        sessionId,
        playerName,
        ...rollForm
      });
      hydrateFromPayload(payload);
    } catch (rollError) {
      setError(rollError.message || 'Failed to resolve the roll.');
    } finally {
      setRolling(false);
    }
  };

  const handleSheetSave = async () => {
    if (!characterSheet) return;
    if (!sessionId) {
      setError(MISSING_SESSION_MESSAGE);
      return;
    }
    setSavingSheet(true);
    setError('');

    try {
      const payload = await saveImmersiveRpgCharacterSheet(apiBaseUrl, {
        sessionId,
        playerName: characterSheet.playerName || playerName,
        identity: characterSheet.identity,
        coreTraits: characterSheet.coreTraits,
        attributes: characterSheet.attributes,
        skills: characterSheet.skills,
        inventory: characterSheet.inventory,
        notes: characterSheet.notes
      });
      setCharacterSheet(payload.characterSheet);
    } catch (saveError) {
      setError(saveError.message || 'Failed to save the character sheet.');
    } finally {
      setSavingSheet(false);
    }
  };

  const lastRoll = scene?.rollLog?.length ? scene.rollLog[scene.rollLog.length - 1] : null;

  return (
    <section className="immersiveRpgPage">
      <header className="immersiveRpgHero">
        <div className="immersiveRpgHero__copy">
          <span className="immersiveRpgHero__eyebrow">Immersive RPG Skeleton</span>
          <h1>{scene?.sceneTitle || 'Scene 3: The Mysterious Encounter'}</h1>
          <p>
            Messenger-derived location bootstrap, Mongo scene progression, free-text GM/PC chat,
            and notebook roll scaffolding are wired here. Shared API, session, and PC identity are
            managed in Story Admin.
          </p>
        </div>

        <div className="immersiveRpgHero__meta">
          <div className="immersiveRpgHero__metaCard">
            <span className="immersiveRpgHero__metaLabel">Shared Session</span>
            <strong className="immersiveRpgHero__metaValue">{sessionId || 'Not set'}</strong>
            <span className="immersiveRpgHero__metaHint">
              {playerName ? `PC: ${playerName}` : 'PC name optional in Story Admin'}
            </span>
          </div>
          <div className="immersiveRpgHero__metaCard">
            <span className="immersiveRpgHero__metaLabel">Shared API</span>
            <strong className="immersiveRpgHero__metaValue">{apiBaseUrl}</strong>
            <span className="immersiveRpgHero__metaHint">Runtime model and mock/live mode come from Story Admin.</span>
          </div>
          <button
            type="button"
            className="immersiveRpgButton immersiveRpgButton--ghost"
            onClick={() => void loadScene({ forceReset: true })}
            disabled={bootstrapping || !hasSharedSession}
          >
            {bootstrapping ? <LoaderCircle size={16} className="spin" /> : <RefreshCcw size={16} />}
            Reset Scene
          </button>
        </div>
      </header>

      {!hasSharedSession ? <div className="immersiveRpgError">{MISSING_SESSION_MESSAGE}</div> : null}
      {error ? <div className="immersiveRpgError">{error}</div> : null}

      {!hasSharedSession ? (
        <div className="immersiveRpgLoading">
          <NotebookPen size={22} />
          <span>Open Story Admin, generate or select the shared session, then return here.</span>
        </div>
      ) : loading ? (
        <div className="immersiveRpgLoading">
          <LoaderCircle size={22} className="spin" />
          <span>Loading scene state from Mongo...</span>
        </div>
      ) : (
        <div className="immersiveRpgLayout">
          <section className="immersiveRpgStage">
            <div className="immersiveRpgSceneCard">
              <div className="immersiveRpgSceneCard__header">
                <div>
                  <span className="immersiveRpgSceneCard__label">Current Beat</span>
                  <h2>{scene?.currentBeat || 'encounter_setup'}</h2>
                </div>
                <div className="immersiveRpgSceneCard__badgeRow">
                  <span>{scene?.status || 'active'}</span>
                  <span>{scene?.sourceSceneBrief?.placeName || 'Messenger location pending'}</span>
                </div>
              </div>

              <p className="immersiveRpgSceneCard__summary">
                {scene?.sourceSceneBrief?.placeSummary || 'Bootstrap the messenger scene first to anchor the encounter.'}
              </p>

              <div className="immersiveRpgTranscript">
                {(scene?.transcript || []).map((entry) => (
                  <article key={entry.entryId} className={`immersiveRpgTranscript__entry immersiveRpgTranscript__entry--${entry.role}`}>
                    <header>
                      <span>{entry.role === 'gm' ? 'GM' : entry.role === 'pc' ? 'PC' : 'System'}</span>
                      <span>{formatTimestamp(entry.createdAt)}</span>
                    </header>
                    <p>{entry.text}</p>
                  </article>
                ))}
              </div>

              <form className="immersiveRpgComposer" onSubmit={handleChatSubmit}>
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Describe what the PC does. Do not choose from menus. Just act."
                  rows={4}
                />
                <button type="submit" className="immersiveRpgButton" disabled={chatting}>
                  {chatting ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
                  Send Action
                </button>
              </form>
            </div>
          </section>

          <aside className="immersiveRpgSidebar">
            <div className="immersiveRpgSheet">
              <div className="immersiveRpgPanelHeader">
                <div>
                  <span className="immersiveRpgPanelHeader__label">PC Sheet Skeleton</span>
                  <h3>Character Seed</h3>
                </div>
                <button type="button" className="immersiveRpgButton immersiveRpgButton--ghost" onClick={handleSheetSave} disabled={savingSheet || !characterSheet}>
                  {savingSheet ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}
                  Save
                </button>
              </div>

              <div className="immersiveRpgSheet__grid">
                <label>
                  <span>Name</span>
                  <input
                    value={characterSheet?.identity?.name || ''}
                    onChange={(event) => updateCharacterSheetField('identity', 'name', event.target.value)}
                  />
                </label>
                <label>
                  <span>Occupation</span>
                  <input
                    value={characterSheet?.identity?.occupation || ''}
                    onChange={(event) => updateCharacterSheetField('identity', 'occupation', event.target.value)}
                  />
                </label>
                <label className="immersiveRpgSheet__wide">
                  <span>Drive</span>
                  <input
                    value={characterSheet?.coreTraits?.drive || ''}
                    onChange={(event) => updateCharacterSheetField('coreTraits', 'drive', event.target.value)}
                  />
                </label>
                <label>
                  <span>Awareness</span>
                  <input
                    type="number"
                    value={characterSheet?.skills?.awareness ?? ''}
                    onChange={(event) => updateCharacterSheetField('skills', 'awareness', event.target.value === '' ? null : Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Stealth</span>
                  <input
                    type="number"
                    value={characterSheet?.skills?.stealth ?? ''}
                    onChange={(event) => updateCharacterSheetField('skills', 'stealth', event.target.value === '' ? null : Number(event.target.value))}
                  />
                </label>
              </div>
            </div>

            <div className="immersiveRpgNotebook">
              <div className="immersiveRpgPanelHeader">
                <div>
                  <span className="immersiveRpgPanelHeader__label">Mechanics Notebook</span>
                  <h3>Square Roll Pad</h3>
                </div>
                <NotebookPen size={20} />
              </div>

              <form className="immersiveRpgNotebook__form" onSubmit={handleRollSubmit}>
                <label>
                  <span>Skill</span>
                  <input
                    value={rollForm.skill}
                    onChange={(event) => setRollForm((current) => ({ ...current, skill: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Dice</span>
                  <input
                    value={rollForm.diceNotation}
                    onChange={(event) => setRollForm((current) => ({ ...current, diceNotation: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Threshold</span>
                  <input
                    type="number"
                    value={rollForm.successThreshold}
                    onChange={(event) => setRollForm((current) => ({ ...current, successThreshold: Number(event.target.value) || 1 }))}
                  />
                </label>
                <label>
                  <span>Needed</span>
                  <input
                    type="number"
                    value={rollForm.successesRequired}
                    onChange={(event) => setRollForm((current) => ({ ...current, successesRequired: Number(event.target.value) || 1 }))}
                  />
                </label>
                <label className="immersiveRpgNotebook__wide">
                  <span>Label</span>
                  <input
                    value={rollForm.label}
                    onChange={(event) => setRollForm((current) => ({ ...current, label: event.target.value }))}
                  />
                </label>
                <button type="submit" className="immersiveRpgButton immersiveRpgButton--ink" disabled={rolling}>
                  {rolling ? <LoaderCircle size={16} className="spin" /> : <Dices size={16} />}
                  Resolve Roll
                </button>
              </form>

              <div className="immersiveRpgNotebook__results">
                <h4>Latest Result</h4>
                {lastRoll ? (
                  <>
                    <p className="immersiveRpgNotebook__summary">{lastRoll.summary}</p>
                    <div className="immersiveRpgNotebook__chips">
                      {lastRoll.rolls.map((value, index) => (
                        <span key={`${lastRoll.rollId}-${index}`} className={value >= lastRoll.successThreshold ? 'is-success' : ''}>
                          {value}
                        </span>
                      ))}
                    </div>
                    <p className="immersiveRpgNotebook__meta">
                      {lastRoll.successes} success{lastRoll.successes === 1 ? '' : 'es'} / need {lastRoll.successesRequired}
                    </p>
                  </>
                ) : (
                  <p className="immersiveRpgNotebook__summary">
                    No roll logged yet. Trigger a journal check or roll manually to populate the notebook.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export default ImmersiveRpgPage;

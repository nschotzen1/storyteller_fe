import React, { useEffect, useState } from 'react';
import { LoaderCircle, NotebookPen, Save, Send } from 'lucide-react';
import './ImmersiveRpgPage.css';
import {
  DEFAULT_API_BASE_URL,
  fetchImmersiveRpgScene,
  rollImmersiveRpg,
  saveImmersiveRpgCharacterSheet,
  sendImmersiveRpgChat
} from '../api/immersiveRpg';
import ImmersiveRpgStageModules from '../components/immersive-rpg/ImmersiveRpgStageModules';
import ImmersiveRpgNotebookPanel from '../components/immersive-rpg/ImmersiveRpgNotebookPanel';

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

const defaultNotebook = {
  mode: 'idle',
  title: 'Mechanics Notebook',
  prompt: 'Notebook standing by.',
  instruction: '',
  scratchLines: [],
  focusTags: [],
  pendingRoll: null,
  diceFaces: [],
  successTrack: null,
  resultSummary: 'No roll pending.'
};

const defaultStage = {
  stageLayout: 'focus-left',
  stageModules: []
};

const defaultSceneMeta = {
  ready: true,
  currentSceneNumber: 3,
  currentSceneKey: 'scene_3_mysterious_encounter',
  missingContext: [],
  mockedContext: []
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

const getSceneNotebook = (scene) => {
  if (!scene) return defaultNotebook;

  const notebook = scene.notebook || {};
  const pendingRoll = notebook.pendingRoll || scene.pendingRoll || null;
  const lastRoll = Array.isArray(scene.rollLog) && scene.rollLog.length
    ? scene.rollLog[scene.rollLog.length - 1]
    : null;

  return {
    ...defaultNotebook,
    ...notebook,
    pendingRoll,
    diceFaces: Array.isArray(notebook.diceFaces) && notebook.diceFaces.length
      ? notebook.diceFaces
      : Array.isArray(lastRoll?.rolls)
        ? lastRoll.rolls
        : [],
    successTrack: notebook.successTrack || (lastRoll
      ? {
        successes: lastRoll.successes,
        successesRequired: lastRoll.successesRequired,
        passed: lastRoll.passed
      }
      : null),
    resultSummary: notebook.resultSummary || lastRoll?.summary || defaultNotebook.resultSummary
  };
};

const getSceneStage = (scene) => ({
  ...defaultStage,
  stageLayout: scene?.stageLayout || defaultStage.stageLayout,
  stageModules: Array.isArray(scene?.stageModules) ? scene.stageModules : defaultStage.stageModules
});

function ImmersiveRpgPage() {
  const [sharedConfig, setSharedConfig] = useState(readSharedConfig);
  const [scene, setScene] = useState(null);
  const [sceneMeta, setSceneMeta] = useState(defaultSceneMeta);
  const [characterSheet, setCharacterSheet] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [rollForm, setRollForm] = useState(defaultRollForm);
  const [loading, setLoading] = useState(() => Boolean(readSharedConfig().sessionId));
  const [chatting, setChatting] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [error, setError] = useState('');
  const apiBaseUrl = sharedConfig.apiBaseUrl;
  const sessionId = sharedConfig.sessionId;
  const playerName = sharedConfig.playerName;
  const hasSharedSession = Boolean(sessionId);
  const notebook = getSceneNotebook(scene);
  const stage = getSceneStage(scene);
  const activePendingRoll = notebook.pendingRoll;
  const isNotebookDrivenRoll = Boolean(activePendingRoll);

  const hydrateFromPayload = (payload) => {
    setScene(payload?.scene || null);
    setSceneMeta({
      ready: payload?.ready !== false,
      currentSceneNumber: payload?.currentSceneNumber ?? payload?.scene?.currentSceneNumber ?? defaultSceneMeta.currentSceneNumber,
      currentSceneKey: payload?.currentSceneKey || payload?.scene?.currentSceneKey || defaultSceneMeta.currentSceneKey,
      missingContext: Array.isArray(payload?.missingContext) ? payload.missingContext : [],
      mockedContext: Array.isArray(payload?.mockedContext) ? payload.mockedContext : []
    });
    setCharacterSheet(payload?.characterSheet || payload?.scene?.characterSheet || null);
    const nextPendingRoll = payload?.scene?.notebook?.pendingRoll || payload?.scene?.pendingRoll || null;
    if (nextPendingRoll) {
      setRollForm(rollFormFromPending(nextPendingRoll));
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
      setSceneMeta(defaultSceneMeta);
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
        const payload = await fetchImmersiveRpgScene(apiBaseUrl, { sessionId, playerName });
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
    if (!activePendingRoll) return;
    setRollForm(rollFormFromPending(activePendingRoll));
  }, [activePendingRoll]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.render_game_to_text = () => JSON.stringify({
      mode: 'immersive-rpg',
      sessionId,
      ready: sceneMeta.ready,
      currentSceneNumber: sceneMeta.currentSceneNumber,
      currentSceneKey: sceneMeta.currentSceneKey,
      missingContext: sceneMeta.missingContext,
      sceneTitle: scene?.sceneTitle || '',
      currentBeat: scene?.currentBeat || '',
      transcriptCount: scene?.transcript?.length || 0,
      pendingRoll: activePendingRoll
        ? {
          skill: activePendingRoll.skill,
          diceNotation: activePendingRoll.diceNotation,
          difficulty: activePendingRoll.difficulty
        }
        : null,
      notebook: {
        mode: notebook.mode,
        title: notebook.title,
        prompt: notebook.prompt,
        diceFaces: notebook.diceFaces,
        successTrack: notebook.successTrack
      },
      stage: {
        layout: stage.stageLayout,
        modules: stage.stageModules.map((module) => ({
          type: module.type,
          title: module.title,
          hasImage: Boolean(module.imageUrl)
        }))
      },
      lastRoll: scene?.rollLog?.length ? scene.rollLog[scene.rollLog.length - 1] : null,
      characterName: characterSheet?.identity?.name || characterSheet?.playerName || ''
    });

    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [sessionId, sceneMeta, scene, characterSheet, activePendingRoll, notebook, stage]);

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
          <span className="immersiveRpgHero__eyebrow">Immersive RPG</span>
          <h1>{scene?.sceneTitle || `Scene ${sceneMeta.currentSceneNumber}: The Mysterious Encounter`}</h1>
          <p>
            Mongo decides the active scene from the shared session. This screen only reads that session state,
            renders the modular scene surface, and waits when required context has not been persisted yet.
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
      ) : !sceneMeta.ready ? (
        <div className="immersiveRpgSceneCard">
          <div className="immersiveRpgSceneCard__header">
            <div>
              <span className="immersiveRpgSceneCard__label">Scene Blocked</span>
              <h2>{sceneMeta.currentSceneKey}</h2>
            </div>
            <div className="immersiveRpgSceneCard__badgeRow">
              <span>waiting</span>
              <span>session scoped</span>
            </div>
          </div>
          <p className="immersiveRpgSceneCard__summary">
            The RPG engine could resolve the active scene, but Mongo is still missing persisted context needed to run it.
          </p>
          <div className="immersiveRpgTranscript">
            <article className="immersiveRpgTranscript__entry immersiveRpgTranscript__entry--system">
              <header>
                <span>System</span>
                <span>Now</span>
              </header>
              <p>
                Missing context: {sceneMeta.missingContext.length ? sceneMeta.missingContext.join(', ') : 'unknown'}.
              </p>
            </article>
            {sceneMeta.mockedContext.length ? (
              <article className="immersiveRpgTranscript__entry immersiveRpgTranscript__entry--system">
                <header>
                  <span>System</span>
                  <span>Mock</span>
                </header>
                <p>Mockable dependencies currently active: {sceneMeta.mockedContext.join(', ')}.</p>
              </article>
            ) : null}
          </div>
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

              <div className="immersiveRpgStageDeck">
                <div className="immersiveRpgStageDeck__header">
                  <span className="immersiveRpgSceneCard__label">Scene Collage</span>
                  <span className="immersiveRpgStageDeck__layout">{stage.stageLayout}</span>
                </div>
                <ImmersiveRpgStageModules
                  apiBaseUrl={apiBaseUrl}
                  stageLayout={stage.stageLayout}
                  stageModules={stage.stageModules}
                />
              </div>

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

            <ImmersiveRpgNotebookPanel
              notebook={notebook}
              sceneId={scene?.id || ''}
              lastRoll={lastRoll}
              activePendingRoll={activePendingRoll}
              rollForm={rollForm}
              setRollForm={setRollForm}
              handleRollSubmit={handleRollSubmit}
              isNotebookDrivenRoll={isNotebookDrivenRoll}
              rolling={rolling}
            />
          </aside>
        </div>
      )}
    </section>
  );
}

export default ImmersiveRpgPage;

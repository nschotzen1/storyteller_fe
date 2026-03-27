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
const PARTY_STORAGE_KEY = 'immersiveRpgPartyRoster';
const WORLDBOOK_STORAGE_KEY = 'immersiveRpgWorldbook';
const WORLD_MODE_STORAGE_KEY = 'immersiveRpgActionMode';

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

const defaultPartyMemberDraft = {
  name: '',
  role: '',
  lens: ''
};

const ACTION_MODES = [
  {
    id: 'act',
    label: 'Act in scene',
    prompt: 'Take a concrete action in the present scene.'
  },
  {
    id: 'survey',
    label: 'Survey details',
    prompt: 'Ask for sensory detail or hidden texture before acting.'
  },
  {
    id: 'worldbuild',
    label: 'Add lore',
    prompt: 'Propose a detail that expands the world and invite the GM to confirm it.'
  }
];

const STORY_PROMPT_TEMPLATES = {
  act: 'I move first and keep the scene in motion by...',
  survey: 'Before anyone acts, what detail in this place feels wrong or newly revealed?',
  worldbuild: 'I want to add one true detail to this world:'
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

const readStoredJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
};

const getInitialPartyRoster = () => {
  const stored = readStoredJson(PARTY_STORAGE_KEY, null);
  if (Array.isArray(stored) && stored.length) {
    return stored.filter((member) => member?.name).slice(0, 4);
  }

  const playerName = getInitialPlayerName();
  return playerName ? [{ name: playerName, role: 'Lead', lens: 'Primary POV' }] : [];
};

const getInitialWorldbook = () => {
  const stored = readStoredJson(WORLDBOOK_STORAGE_KEY, null);
  return Array.isArray(stored) ? stored.slice(0, 12) : [];
};

const getInitialActionMode = () => {
  if (typeof window === 'undefined') return ACTION_MODES[0].id;
  const stored = window.localStorage.getItem(WORLD_MODE_STORAGE_KEY);
  return ACTION_MODES.some((mode) => mode.id === stored) ? stored : ACTION_MODES[0].id;
};

const buildWorldbookSeed = (scene, sceneMeta) => {
  const items = [
    scene?.sceneTitle ? { type: 'truth', text: scene.sceneTitle } : null,
    scene?.sourceSceneBrief?.placeName ? { type: 'place', text: scene.sourceSceneBrief.placeName } : null,
    scene?.currentBeat ? { type: 'pressure', text: scene.currentBeat } : null
  ].filter(Boolean);

  if (!items.length && sceneMeta?.currentSceneKey) {
    return { type: 'truth', text: sceneMeta.currentSceneKey };
  }

  return {
    type: 'truth',
    text: items.map((item) => `${item.type}: ${item.text}`).join(' | ')
  };
};

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
  const [partyRoster, setPartyRoster] = useState(getInitialPartyRoster);
  const [activePartyMemberName, setActivePartyMemberName] = useState(() => getInitialPartyRoster()[0]?.name || '');
  const [partyDraft, setPartyDraft] = useState(defaultPartyMemberDraft);
  const [actionMode, setActionMode] = useState(getInitialActionMode);
  const [worldbookEntries, setWorldbookEntries] = useState(getInitialWorldbook);
  const apiBaseUrl = sharedConfig.apiBaseUrl;
  const sessionId = sharedConfig.sessionId;
  const playerName = sharedConfig.playerName;
  const hasSharedSession = Boolean(sessionId);
  const notebook = getSceneNotebook(scene);
  const stage = getSceneStage(scene);
  const activePendingRoll = notebook.pendingRoll;
  const isNotebookDrivenRoll = Boolean(activePendingRoll);
  const activePartyMember = partyRoster.find((member) => member.name === activePartyMemberName) || null;
  const effectivePlayerName = activePartyMember?.name || playerName;
  const selectedActionMode = ACTION_MODES.find((mode) => mode.id === actionMode) || ACTION_MODES[0];

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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(partyRoster));
  }, [partyRoster]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WORLDBOOK_STORAGE_KEY, JSON.stringify(worldbookEntries));
  }, [worldbookEntries]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WORLD_MODE_STORAGE_KEY, actionMode);
  }, [actionMode]);

  useEffect(() => {
    if (playerName && !partyRoster.length) {
      setPartyRoster([{ name: playerName, role: 'Lead', lens: 'Primary POV' }]);
      setActivePartyMemberName(playerName);
      return;
    }

    if (partyRoster.length && !partyRoster.some((member) => member.name === activePartyMemberName)) {
      setActivePartyMemberName(partyRoster[0]?.name || '');
    }
  }, [playerName, partyRoster, activePartyMemberName]);

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
      characterName: characterSheet?.identity?.name || characterSheet?.playerName || '',
      party: {
        active: effectivePlayerName || '',
        members: partyRoster
      },
      actionMode,
      worldbookEntries
    });

    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [sessionId, sceneMeta, scene, characterSheet, activePendingRoll, notebook, stage, effectivePlayerName, partyRoster, actionMode, worldbookEntries]);

  const updateCharacterSheetField = (section, key, value) => {
    setCharacterSheet((current) => ({
      ...(current || {}),
      [section]: {
        ...(current?.[section] || {}),
        [key]: value
      }
    }));
  };

  const handleAddPartyMember = (event) => {
    event.preventDefault();
    const nextMember = {
      name: partyDraft.name.trim(),
      role: partyDraft.role.trim(),
      lens: partyDraft.lens.trim()
    };

    if (!nextMember.name) return;

    setPartyRoster((current) => {
      const withoutDuplicate = current.filter((member) => member.name !== nextMember.name);
      return [...withoutDuplicate, nextMember].slice(0, 4);
    });
    setActivePartyMemberName(nextMember.name);
    setPartyDraft(defaultPartyMemberDraft);
  };

  const handleRemovePartyMember = (memberName) => {
    setPartyRoster((current) => current.filter((member) => member.name !== memberName));
  };

  const handleAddWorldbookEntry = () => {
    const seededEntry = buildWorldbookSeed(scene, sceneMeta);
    setWorldbookEntries((current) => [
      {
        id: `${Date.now()}`,
        ...seededEntry
      },
      ...current
    ].slice(0, 12));
  };

  const handleQuickPrompt = (modeId) => {
    const template = STORY_PROMPT_TEMPLATES[modeId] || STORY_PROMPT_TEMPLATES.act;
    setActionMode(modeId);
    setChatInput(template);
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
      const speakerPrefix = effectivePlayerName
        ? `${selectedActionMode.label}: ${effectivePlayerName}`
        : selectedActionMode.label;
      const payload = await sendImmersiveRpgChat(apiBaseUrl, {
        sessionId,
        playerName: effectivePlayerName,
        message: `[${speakerPrefix}] ${message}`
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
            This page now supports table play as well as solo immersion: keep a live party roster, switch POV before speaking,
            and pin world details into a shared worldbook while the backend keeps driving the active scene.
          </p>
        </div>

        <div className="immersiveRpgHero__meta">
          <div className="immersiveRpgHero__metaCard">
            <span className="immersiveRpgHero__metaLabel">Shared Session</span>
            <strong className="immersiveRpgHero__metaValue">{sessionId || 'Not set'}</strong>
            <span className="immersiveRpgHero__metaHint">
              {effectivePlayerName ? `Active speaker: ${effectivePlayerName}` : 'PC name optional in Story Admin'}
            </span>
          </div>
          <div className="immersiveRpgHero__metaCard">
            <span className="immersiveRpgHero__metaLabel">Shared API</span>
            <strong className="immersiveRpgHero__metaValue">{apiBaseUrl}</strong>
            <span className="immersiveRpgHero__metaHint">Runtime model and mock/live mode come from Story Admin.</span>
          </div>
          <div className="immersiveRpgHero__metaCard">
            <span className="immersiveRpgHero__metaLabel">Table Flow</span>
            <strong className="immersiveRpgHero__metaValue">{partyRoster.length || 1} seat{partyRoster.length === 1 ? '' : 's'}</strong>
            <span className="immersiveRpgHero__metaHint">{selectedActionMode.prompt}</span>
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

              <section className="immersiveRpgFlowPanel">
                <div className="immersiveRpgFlowPanel__header">
                  <div>
                    <span className="immersiveRpgSceneCard__label">Flow Support</span>
                    <h3>World + Table Layer</h3>
                  </div>
                  <button type="button" className="immersiveRpgButton immersiveRpgButton--ghost" onClick={handleAddWorldbookEntry}>
                    Pin Current Beat
                  </button>
                </div>

                <div className="immersiveRpgActionModes" role="tablist" aria-label="Action modes">
                  {ACTION_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={['immersiveRpgActionModes__chip', actionMode === mode.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                      onClick={() => setActionMode(mode.id)}
                    >
                      <strong>{mode.label}</strong>
                      <span>{mode.prompt}</span>
                    </button>
                  ))}
                </div>

                <div className="immersiveRpgQuickPrompts">
                  {ACTION_MODES.map((mode) => (
                    <button
                      key={`${mode.id}-prompt`}
                      type="button"
                      className="immersiveRpgQuickPrompts__button"
                      onClick={() => handleQuickPrompt(mode.id)}
                    >
                      {mode.id === 'worldbuild' ? 'Seed lore prompt' : mode.id === 'survey' ? 'Seed detail prompt' : 'Seed action prompt'}
                    </button>
                  ))}
                </div>
              </section>

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
                  placeholder={`Speak as ${effectivePlayerName || 'the active POV'}. ${selectedActionMode.prompt}`}
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
                  <span className="immersiveRpgPanelHeader__label">Multiplayer Support</span>
                  <h3>Party Roster</h3>
                </div>
                <span className="immersiveRpgParty__count">{partyRoster.length || 1} active seat{partyRoster.length === 1 ? '' : 's'}</span>
              </div>

              <div className="immersiveRpgPartyList">
                {partyRoster.length ? partyRoster.map((member) => (
                  <article key={member.name} className={['immersiveRpgPartyCard', member.name === activePartyMemberName ? 'is-active' : ''].filter(Boolean).join(' ')}>
                    <button type="button" className="immersiveRpgPartyCard__select" onClick={() => setActivePartyMemberName(member.name)}>
                      <strong>{member.name}</strong>
                      <span>{member.role || 'Unassigned role'}</span>
                      <p>{member.lens || 'No lens set yet.'}</p>
                    </button>
                    <button type="button" className="immersiveRpgPartyCard__remove" onClick={() => handleRemovePartyMember(member.name)} aria-label={`Remove ${member.name}`}>
                      Remove
                    </button>
                  </article>
                )) : (
                  <p className="immersiveRpgParty__empty">No table seats yet. Add a second perspective or keep it solo.</p>
                )}
              </div>

              <form className="immersiveRpgPartyForm" onSubmit={handleAddPartyMember}>
                <label>
                  <span>Name</span>
                  <input
                    value={partyDraft.name}
                    onChange={(event) => setPartyDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Serin Vale"
                  />
                </label>
                <label>
                  <span>Role</span>
                  <input
                    value={partyDraft.role}
                    onChange={(event) => setPartyDraft((current) => ({ ...current, role: event.target.value }))}
                    placeholder="Scout"
                  />
                </label>
                <label className="immersiveRpgSheet__wide">
                  <span>Lens</span>
                  <input
                    value={partyDraft.lens}
                    onChange={(event) => setPartyDraft((current) => ({ ...current, lens: event.target.value }))}
                    placeholder="Sees omens before danger turns visible"
                  />
                </label>
                <button type="submit" className="immersiveRpgButton immersiveRpgButton--ink">Add Seat</button>
              </form>
            </div>

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

            <div className="immersiveRpgSheet">
              <div className="immersiveRpgPanelHeader">
                <div>
                  <span className="immersiveRpgPanelHeader__label">Worldbuilding</span>
                  <h3>Worldbook Pins</h3>
                </div>
              </div>
              <div className="immersiveRpgWorldbook">
                {worldbookEntries.length ? worldbookEntries.map((entry) => (
                  <article key={entry.id} className="immersiveRpgWorldbook__entry">
                    <span>{entry.type}</span>
                    <p>{entry.text}</p>
                  </article>
                )) : (
                  <p className="immersiveRpgParty__empty">Pin scenes, places, and pressure points here to keep the world coherent across turns.</p>
                )}
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

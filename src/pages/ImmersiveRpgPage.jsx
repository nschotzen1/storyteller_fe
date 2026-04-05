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
const TURN_STATE_STORAGE_KEY = 'immersiveRpgTurnState';
const AUTO_PASS_TURN_STORAGE_KEY = 'immersiveRpgAutoPassTurn';
const WORLD_CANDIDATES_STORAGE_KEY = 'immersiveRpgWorldCandidates';
const TABLE_INTENT_STORAGE_KEY = 'immersiveRpgTableIntentVotes';
const OBJECTIVE_STATE_STORAGE_KEY = 'immersiveRpgObjectiveState';
const READY_CHECK_STORAGE_KEY = 'immersiveRpgReadyCheckState';
const DIVE_RITUAL_STORAGE_KEY = 'immersiveRpgDiveRitualState';
const SPOTLIGHT_STATE_STORAGE_KEY = 'immersiveRpgSpotlightState';
const WORLD_THREADS_STORAGE_KEY = 'immersiveRpgWorldThreads';

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

const defaultTurnState = {
  round: 1,
  turnIndex: 0
};

const defaultObjectiveState = {
  title: '',
  stakes: '',
  progress: 0,
  maxProgress: 4
};

const defaultDiveRitualState = {
  ambience: '',
  focalTruth: '',
  commitments: {}
};

const defaultSpotlightState = {
  holder: '',
  beatGoal: '',
  assists: {}
};

const defaultWorldThreadState = {
  title: '',
  sourceType: 'truth',
  sourceEntryId: '',
  support: 0,
  progress: 0,
  maxProgress: 3,
  status: 'active'
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

const TABLE_INTENTS = [
  {
    id: 'push',
    label: 'Push Forward',
    prompt: 'Escalate scene pressure now.',
    mode: 'act'
  },
  {
    id: 'probe',
    label: 'Probe Detail',
    prompt: 'Extract hidden clues before risk.',
    mode: 'survey'
  },
  {
    id: 'reveal',
    label: 'Reveal Truth',
    prompt: 'Lock one new canon detail.',
    mode: 'worldbuild'
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

const readStoredBoolean = (key, fallback = false) => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === 'true';
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

const getInitialTurnState = () => {
  const stored = readStoredJson(TURN_STATE_STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object') return defaultTurnState;
  const round = Number.isFinite(Number(stored.round)) ? Math.max(1, Number(stored.round)) : 1;
  const turnIndex = Number.isFinite(Number(stored.turnIndex)) ? Math.max(0, Number(stored.turnIndex)) : 0;
  return { round, turnIndex };
};

const getInitialWorldCandidates = () => {
  const stored = readStoredJson(WORLD_CANDIDATES_STORAGE_KEY, null);
  if (!Array.isArray(stored)) return [];

  return stored.slice(0, 12).map((candidate) => {
    const rawSupporters = Array.isArray(candidate?.supporters)
      ? candidate.supporters
      : [];
    const normalizedSupporters = Array.from(new Set(
      rawSupporters
        .map((name) => (typeof name === 'string' ? name.trim() : ''))
        .filter(Boolean)
    )).slice(0, 12);

    if (normalizedSupporters.length) {
      return {
        ...candidate,
        supporters: normalizedSupporters,
        support: normalizedSupporters.length
      };
    }

    const fallbackSupport = Number.isFinite(Number(candidate?.support))
      ? Math.max(0, Number(candidate.support))
      : 0;
    const fallbackSupporters = candidate?.proposer && fallbackSupport > 0
      ? [candidate.proposer]
      : [];

    return {
      ...candidate,
      supporters: fallbackSupporters,
      support: fallbackSupporters.length || fallbackSupport
    };
  });
};

const getInitialIntentVotes = () => {
  const stored = readStoredJson(TABLE_INTENT_STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  return stored;
};

const getInitialObjectiveState = () => {
  const stored = readStoredJson(OBJECTIVE_STATE_STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaultObjectiveState;

  const progress = Number.isFinite(Number(stored.progress))
    ? Math.max(0, Number(stored.progress))
    : defaultObjectiveState.progress;
  const maxProgress = Number.isFinite(Number(stored.maxProgress))
    ? Math.max(1, Number(stored.maxProgress))
    : defaultObjectiveState.maxProgress;

  return {
    title: typeof stored.title === 'string' ? stored.title : defaultObjectiveState.title,
    stakes: typeof stored.stakes === 'string' ? stored.stakes : defaultObjectiveState.stakes,
    progress: Math.min(progress, maxProgress),
    maxProgress
  };
};

const getInitialReadyCheck = () => {
  const stored = readStoredJson(READY_CHECK_STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  return stored;
};

const getInitialDiveRitualState = () => {
  const stored = readStoredJson(DIVE_RITUAL_STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return defaultDiveRitualState;
  }

  const commitments = stored.commitments && typeof stored.commitments === 'object' && !Array.isArray(stored.commitments)
    ? stored.commitments
    : {};

  return {
    ambience: typeof stored.ambience === 'string' ? stored.ambience : defaultDiveRitualState.ambience,
    focalTruth: typeof stored.focalTruth === 'string' ? stored.focalTruth : defaultDiveRitualState.focalTruth,
    commitments
  };
};

const getInitialSpotlightState = () => {
  const stored = readStoredJson(SPOTLIGHT_STATE_STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return defaultSpotlightState;
  }

  const assists = stored.assists && typeof stored.assists === 'object' && !Array.isArray(stored.assists)
    ? stored.assists
    : {};

  return {
    holder: typeof stored.holder === 'string' ? stored.holder : defaultSpotlightState.holder,
    beatGoal: typeof stored.beatGoal === 'string' ? stored.beatGoal : defaultSpotlightState.beatGoal,
    assists
  };
};

const getInitialWorldThreads = () => {
  const stored = readStoredJson(WORLD_THREADS_STORAGE_KEY, null);
  if (!Array.isArray(stored)) return [];

  return stored.slice(0, 8).map((thread) => {
    const progress = Number.isFinite(Number(thread?.progress))
      ? Math.max(0, Number(thread.progress))
      : defaultWorldThreadState.progress;
    const maxProgress = Number.isFinite(Number(thread?.maxProgress))
      ? Math.max(1, Number(thread.maxProgress))
      : defaultWorldThreadState.maxProgress;

    return {
      id: typeof thread?.id === 'string' && thread.id.trim() ? thread.id : `thread-${Date.now()}`,
      title: typeof thread?.title === 'string' ? thread.title : defaultWorldThreadState.title,
      sourceType: typeof thread?.sourceType === 'string' ? thread.sourceType : defaultWorldThreadState.sourceType,
      sourceEntryId: typeof thread?.sourceEntryId === 'string' ? thread.sourceEntryId : defaultWorldThreadState.sourceEntryId,
      support: Number.isFinite(Number(thread?.support)) ? Math.max(0, Number(thread.support)) : defaultWorldThreadState.support,
      progress: Math.min(progress, maxProgress),
      maxProgress,
      status: thread?.status === 'resolved' ? 'resolved' : 'active'
    };
  });
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

const summarizeCandidateSupport = (supportCount = 0, seatCount = 1) => {
  const safeSupport = Math.max(0, Number(supportCount) || 0);
  const safeSeats = Math.max(1, Number(seatCount) || 1);
  if (safeSupport >= safeSeats) return 'Table-locked';
  if (safeSupport >= Math.max(2, Math.ceil(safeSeats / 2))) return 'Ready for canon';
  return 'Needs more support';
};

const getCanonicalSupporters = (candidate) => {
  if (!candidate || !Array.isArray(candidate.supporters)) return [];
  return Array.from(new Set(
    candidate.supporters
      .map((name) => (typeof name === 'string' ? name.trim() : ''))
      .filter(Boolean)
  )).slice(0, 12);
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
  const [turnState, setTurnState] = useState(getInitialTurnState);
  const [autoPassTurn, setAutoPassTurn] = useState(() => readStoredBoolean(AUTO_PASS_TURN_STORAGE_KEY, true));
  const [worldCandidates, setWorldCandidates] = useState(getInitialWorldCandidates);
  const [candidateDraft, setCandidateDraft] = useState('');
  const [tableIntentVotes, setTableIntentVotes] = useState(getInitialIntentVotes);
  const [objectiveState, setObjectiveState] = useState(getInitialObjectiveState);
  const [readyCheckState, setReadyCheckState] = useState(getInitialReadyCheck);
  const [diveRitualState, setDiveRitualState] = useState(getInitialDiveRitualState);
  const [spotlightState, setSpotlightState] = useState(getInitialSpotlightState);
  const [worldThreads, setWorldThreads] = useState(getInitialWorldThreads);
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
  const tableSeats = partyRoster.length
    ? partyRoster.map((member) => member.name).filter(Boolean)
    : [playerName || 'Solo POV'];
  const normalizedTurnIndex = tableSeats.length
    ? ((turnState.turnIndex % tableSeats.length) + tableSeats.length) % tableSeats.length
    : 0;
  const activeTurnSpeaker = tableSeats[normalizedTurnIndex] || '';
  const turnPositionLabel = `${normalizedTurnIndex + 1}/${tableSeats.length}`;
  const normalizedIntentVotes = tableSeats.reduce((accumulator, seatName) => {
    const vote = tableIntentVotes[seatName];
    if (TABLE_INTENTS.some((intent) => intent.id === vote)) {
      accumulator[seatName] = vote;
    }
    return accumulator;
  }, {});
  const intentCounts = TABLE_INTENTS.map((intent) => ({
    ...intent,
    support: Object.values(normalizedIntentVotes).filter((vote) => vote === intent.id).length
  }));
  const leadingIntent = intentCounts.reduce((best, entry) => (
    !best || entry.support > best.support ? entry : best
  ), null);
  const activeIntent = leadingIntent?.support ? leadingIntent : null;
  const normalizedReadyCheck = tableSeats.reduce((accumulator, seatName) => {
    accumulator[seatName] = readyCheckState[seatName] === true;
    return accumulator;
  }, {});
  const readySeatCount = Object.values(normalizedReadyCheck).filter(Boolean).length;
  const readyThreshold = Math.max(1, Math.floor(tableSeats.length / 2) + 1);
  const hasReadyConsensus = readySeatCount >= readyThreshold;
  const normalizedDiveCommitments = tableSeats.reduce((accumulator, seatName) => {
    const rawCommitment = diveRitualState?.commitments?.[seatName];
    accumulator[seatName] = typeof rawCommitment === 'string' ? rawCommitment.trim() : '';
    return accumulator;
  }, {});
  const committedSeatCount = Object.values(normalizedDiveCommitments).filter(Boolean).length;
  const diveThreshold = Math.max(1, Math.floor(tableSeats.length / 2) + 1);
  const hasDiveConsensus = committedSeatCount >= diveThreshold;
  const spotlightHolder = tableSeats.includes(spotlightState.holder) ? spotlightState.holder : '';
  const normalizedSpotlightAssists = tableSeats.reduce((accumulator, seatName) => {
    if (!spotlightHolder || seatName === spotlightHolder) return accumulator;
    accumulator[seatName] = spotlightState.assists?.[seatName] === true;
    return accumulator;
  }, {});
  const spotlightAssistCount = Object.values(normalizedSpotlightAssists).filter(Boolean).length;
  const spotlightAssistThreshold = tableSeats.length <= 1 ? 0 : Math.max(1, Math.floor((tableSeats.length - 1) / 2));
  const hasSpotlightConsensus = tableSeats.length <= 1
    ? Boolean(spotlightHolder)
    : Boolean(spotlightHolder) && spotlightAssistCount >= spotlightAssistThreshold;
  const activeSpotlightGoal = (spotlightState.beatGoal || '').trim();
  const spotlightReadyForPrime = hasSpotlightConsensus && Boolean(activeSpotlightGoal);
  const activeWorldThreads = worldThreads.filter((thread) => thread.status !== 'resolved');
  const activeObjectiveTitle = objectiveState.title.trim();
  const activeObjectiveStakes = objectiveState.stakes.trim();
  const activeAmbience = (diveRitualState.ambience || '').trim();
  const activeFocalTruth = (diveRitualState.focalTruth || '').trim() || activeObjectiveTitle;
  const immersionPulse = Math.min(
    100,
    22 +
      (worldbookEntries.length * 5) +
      (worldCandidates.length * 2) +
      (Math.min(scene?.transcript?.length || 0, 12) * 2) +
      (Math.max(tableSeats.length, 1) * 6) +
      ((activeIntent?.support || 0) * 4) +
      (readySeatCount * 3) +
      (committedSeatCount * 3) +
      (spotlightAssistCount * 2) +
      (spotlightReadyForPrime ? 4 : 0) +
      (activeWorldThreads.length * 3) +
      (activeAmbience ? 5 : 0) +
      (activeObjectiveTitle ? 4 : 0)
  );
  const immersionTier = immersionPulse >= 80
    ? 'Deep Dive'
    : immersionPulse >= 55
      ? 'Stable Immersion'
      : 'Bootstrapping';
  const flowSteps = [
    {
      id: 'anchor',
      label: 'Anchor',
      ready: Boolean(scene?.sourceSceneBrief?.placeSummary),
      detail: scene?.sourceSceneBrief?.placeName || sceneMeta.currentSceneKey
    },
    {
      id: 'intent',
      label: 'Intent',
      ready: Boolean(activeIntent),
      detail: activeIntent ? `${activeIntent.label} with ${activeIntent.support} support` : 'Vote on the table direction'
    },
    {
      id: 'ready',
      label: 'Ready',
      ready: hasReadyConsensus,
      detail: `${readySeatCount}/${tableSeats.length} seats ready`
    },
    {
      id: 'action',
      label: 'Action',
      ready: Boolean(chatInput.trim()),
      detail: chatInput.trim() ? 'Composer primed' : `Prompt ${effectivePlayerName || activeTurnSpeaker || 'active POV'}`
    },
    {
      id: 'canon',
      label: 'Canon',
      ready: worldbookEntries.length > 0 || Boolean(activeObjectiveTitle),
      detail: activeObjectiveTitle || `${worldbookEntries.length} pinned truths`
    }
  ];
  const nextOpenStep = flowSteps.find((step) => !step.ready) || flowSteps[flowSteps.length - 1];
  const currentFlowPhase = nextOpenStep?.label || 'Canon';
  const flowRecommendation = nextOpenStep?.id === 'anchor'
    ? 'Anchor the scene with one place detail before the table acts.'
    : nextOpenStep?.id === 'intent'
      ? 'Have each seat vote so the table commits to one shared direction.'
      : nextOpenStep?.id === 'ready'
        ? 'Confirm enough seats are ready before advancing the beat.'
        : nextOpenStep?.id === 'action'
          ? 'Prime the composer with a concrete move, survey, or lore reveal.'
          : activeObjectiveTitle
            ? `Push on the current objective: ${activeObjectiveTitle}.`
            : 'Promote a surviving truth into canon so the world stays coherent.';
  const highestSupportCandidate = worldCandidates.reduce((best, candidate) => {
    const support = getCanonicalSupporters(candidate).length || Number(candidate?.support || 0);
    if (!best || support > Number(best.support || 0)) {
      return candidate;
    }
    return best;
  }, null);
  const supportSummary = highestSupportCandidate
    ? summarizeCandidateSupport(getCanonicalSupporters(highestSupportCandidate).length || highestSupportCandidate.support, tableSeats.length)
    : 'No active proposal';
  const candidateCanonThreshold = Math.max(1, Math.floor(tableSeats.length / 2) + 1);
  const recentCanonEcho = worldbookEntries.filter((entry) => entry.type === 'canon').slice(0, 3);
  const diveRitualReadiness = activeAmbience && activeFocalTruth
    ? `${committedSeatCount}/${tableSeats.length} seats committed`
    : 'Set ambience + focal truth';
  const spotlightReadiness = spotlightHolder
    ? tableSeats.length <= 1
      ? 'Solo spotlight ready'
      : `${spotlightAssistCount}/${Math.max(1, tableSeats.length - 1)} assists`
    : 'Choose lead seat';

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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TURN_STATE_STORAGE_KEY, JSON.stringify(turnState));
  }, [turnState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AUTO_PASS_TURN_STORAGE_KEY, autoPassTurn ? 'true' : 'false');
  }, [autoPassTurn]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WORLD_CANDIDATES_STORAGE_KEY, JSON.stringify(worldCandidates));
  }, [worldCandidates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TABLE_INTENT_STORAGE_KEY, JSON.stringify(tableIntentVotes));
  }, [tableIntentVotes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(OBJECTIVE_STATE_STORAGE_KEY, JSON.stringify(objectiveState));
  }, [objectiveState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(READY_CHECK_STORAGE_KEY, JSON.stringify(readyCheckState));
  }, [readyCheckState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DIVE_RITUAL_STORAGE_KEY, JSON.stringify(diveRitualState));
  }, [diveRitualState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SPOTLIGHT_STATE_STORAGE_KEY, JSON.stringify(spotlightState));
  }, [spotlightState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WORLD_THREADS_STORAGE_KEY, JSON.stringify(worldThreads));
  }, [worldThreads]);

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
    if (!tableSeats.length) return;
    if (turnState.turnIndex < tableSeats.length) return;
    setTurnState((current) => ({
      ...current,
      turnIndex: 0
    }));
  }, [tableSeats, turnState.turnIndex]);

  useEffect(() => {
    setTableIntentVotes((current) => {
      const next = tableSeats.reduce((accumulator, seatName) => {
        if (current[seatName]) {
          accumulator[seatName] = current[seatName];
        }
        return accumulator;
      }, {});
      const unchanged = Object.keys(current).length === Object.keys(next).length &&
        Object.keys(current).every((key) => current[key] === next[key]);
      return unchanged ? current : next;
    });
  }, [tableSeats]);

  useEffect(() => {
    setReadyCheckState((current) => {
      const next = tableSeats.reduce((accumulator, seatName) => {
        accumulator[seatName] = current[seatName] === true;
        return accumulator;
      }, {});
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      const unchanged = currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === next[key]);
      return unchanged ? current : next;
    });
  }, [tableSeats]);

  useEffect(() => {
    setDiveRitualState((current) => {
      const nextCommitments = tableSeats.reduce((accumulator, seatName) => {
        const commitment = current?.commitments?.[seatName];
        accumulator[seatName] = typeof commitment === 'string' ? commitment : '';
        return accumulator;
      }, {});
      const next = {
        ...defaultDiveRitualState,
        ...current,
        commitments: nextCommitments
      };
      const unchanged = JSON.stringify(current) === JSON.stringify(next);
      return unchanged ? current : next;
    });
  }, [tableSeats]);

  useEffect(() => {
    setSpotlightState((current) => {
      const nextHolder = tableSeats.includes(current.holder) ? current.holder : (tableSeats[0] || '');
      const nextAssists = tableSeats.reduce((accumulator, seatName) => {
        if (seatName === nextHolder) return accumulator;
        accumulator[seatName] = current.assists?.[seatName] === true;
        return accumulator;
      }, {});
      const next = {
        ...defaultSpotlightState,
        ...current,
        holder: nextHolder,
        assists: nextAssists
      };
      const unchanged = JSON.stringify(current) === JSON.stringify(next);
      return unchanged ? current : next;
    });
  }, [tableSeats]);

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
        members: partyRoster,
        turn: {
          round: turnState.round,
          seat: turnPositionLabel,
          activeTurnSpeaker
        }
      },
      actionMode,
      worldbookEntries,
      worldbuilding: {
        pendingCandidateCount: worldCandidates.length,
        candidates: worldCandidates.map((candidate) => {
          const supporters = getCanonicalSupporters(candidate);
          const support = supporters.length || Number(candidate.support || 0);
          return {
            id: candidate.id,
            proposer: candidate.proposer || '',
            text: candidate.text || '',
            support,
            supporters,
            readiness: summarizeCandidateSupport(support, tableSeats.length)
          };
        })
      },
      threads: {
        activeCount: activeWorldThreads.length,
        totalCount: worldThreads.length,
        items: worldThreads.map((thread) => ({
          id: thread.id,
          title: thread.title,
          progress: thread.progress,
          maxProgress: thread.maxProgress,
          status: thread.status,
          sourceType: thread.sourceType,
          support: thread.support
        }))
      },
      immersion: {
        pulse: immersionPulse,
        tier: immersionTier
      },
      flow: {
        anchorReady: Boolean(scene?.sourceSceneBrief?.placeSummary),
        intentReady: Boolean(activeIntent),
        spotlightReady: spotlightReadyForPrime,
        actionDraftReady: Boolean(chatInput.trim()),
        canonReady: worldbookEntries.length > 0,
        objectiveReady: Boolean(activeObjectiveTitle),
        tableReadyConsensus: hasReadyConsensus
      },
      tableIntent: {
        active: activeIntent ? { id: activeIntent.id, support: activeIntent.support } : null,
        votes: normalizedIntentVotes
      },
      objective: {
        title: activeObjectiveTitle,
        stakes: activeObjectiveStakes,
        progress: objectiveState.progress,
        maxProgress: objectiveState.maxProgress
      },
      readyCheck: {
        readySeats: readySeatCount,
        totalSeats: tableSeats.length,
        threshold: readyThreshold,
        hasConsensus: hasReadyConsensus,
        seats: normalizedReadyCheck
      },
      diveRitual: {
        ambience: activeAmbience,
        focalTruth: activeFocalTruth,
        committedSeats: committedSeatCount,
        totalSeats: tableSeats.length,
        threshold: diveThreshold,
        hasConsensus: hasDiveConsensus,
        commitments: normalizedDiveCommitments
      },
      spotlight: {
        holder: spotlightHolder,
        beatGoal: activeSpotlightGoal,
        assistCount: spotlightAssistCount,
        assistThreshold: spotlightAssistThreshold,
        hasConsensus: hasSpotlightConsensus,
        assists: normalizedSpotlightAssists
      },
      canon: {
        recent: recentCanonEcho.map((entry) => ({
          id: entry.id,
          text: entry.text,
          proposer: entry.proposer || '',
          support: Number(entry.support || 0)
        }))
      }
    });

    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [sessionId, sceneMeta, scene, characterSheet, activePendingRoll, notebook, stage, effectivePlayerName, partyRoster, turnState.round, turnPositionLabel, activeTurnSpeaker, actionMode, worldbookEntries, worldCandidates, worldThreads, activeWorldThreads.length, immersionPulse, immersionTier, chatInput, activeIntent, normalizedIntentVotes, spotlightReadyForPrime, activeObjectiveTitle, activeObjectiveStakes, hasReadyConsensus, objectiveState.progress, objectiveState.maxProgress, readySeatCount, tableSeats.length, readyThreshold, normalizedReadyCheck, activeAmbience, activeFocalTruth, committedSeatCount, diveThreshold, hasDiveConsensus, normalizedDiveCommitments, spotlightHolder, activeSpotlightGoal, spotlightAssistCount, spotlightAssistThreshold, hasSpotlightConsensus, normalizedSpotlightAssists]);

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

  const handlePassTurn = () => {
    if (!tableSeats.length) return;
    let nextSpeaker = activeTurnSpeaker;
    setTurnState((current) => {
      const nextIndex = (current.turnIndex + 1) % tableSeats.length;
      const nextRound = nextIndex === 0 ? current.round + 1 : current.round;
      nextSpeaker = tableSeats[nextIndex] || tableSeats[0] || '';
      return {
        round: nextRound,
        turnIndex: nextIndex
      };
    });
    if (nextSpeaker) {
      setActivePartyMemberName(nextSpeaker);
    }
  };

  const handleProposeCandidate = () => {
    const text = candidateDraft.trim();
    if (!text) return;
    const proposer = effectivePlayerName || activeTurnSpeaker || 'Table';
    const proposerSupporters = proposer ? [proposer] : [];
    setWorldCandidates((current) => ([
      {
        id: `candidate-${Date.now()}`,
        text,
        proposer,
        supporters: proposerSupporters,
        support: proposerSupporters.length || 1
      },
      ...current
    ]).slice(0, 12));
    setCandidateDraft('');
  };

  const handleSupportCandidate = (candidateId) => {
    const supportingSeat = effectivePlayerName || activeTurnSpeaker || tableSeats[0];
    if (!supportingSeat) return;
    setWorldCandidates((current) => current.map((candidate) => (
      candidate.id !== candidateId
        ? candidate
        : (() => {
          const existingSupporters = getCanonicalSupporters(candidate);
          const hasSeatSupport = existingSupporters.includes(supportingSeat);
          const nextSupporters = hasSeatSupport
            ? existingSupporters.filter((name) => name !== supportingSeat)
            : [...existingSupporters, supportingSeat];

          return {
            ...candidate,
            supporters: nextSupporters,
            support: nextSupporters.length
          };
        })()
    )));
  };

  const handleCanonizeCandidate = (candidateId) => {
    const candidate = worldCandidates.find((entry) => entry.id === candidateId);
    if (!candidate) return;
    const supporters = getCanonicalSupporters(candidate);
    const support = supporters.length || Number(candidate.support || 0);
    if (support < candidateCanonThreshold) return;
    setWorldbookEntries((current) => ([
      {
        id: `canon-${Date.now()}`,
        type: 'canon',
        text: candidate.text,
        proposer: candidate.proposer,
        support,
        supporters
      },
      ...current
    ]).slice(0, 12));
    setWorldCandidates((current) => current.filter((entry) => entry.id !== candidateId));
  };

  const handleAdoptCandidateAsObjective = (candidateId) => {
    const candidate = worldCandidates.find((entry) => entry.id === candidateId);
    if (!candidate) return;
    setObjectiveState((current) => ({
      ...current,
      title: candidate.text,
      stakes: current.stakes || 'If this truth breaks, the scene loses its shared footing.'
    }));
    setActionMode('worldbuild');
    setChatInput(`We anchor the next beat around this shared truth: ${candidate.text}`);
  };

  const handleSetIntentVote = (intentId) => {
    const votingSeat = effectivePlayerName || activeTurnSpeaker || tableSeats[0];
    if (!votingSeat) return;
    setTableIntentVotes((current) => ({
      ...current,
      [votingSeat]: intentId
    }));
  };

  const handleApplyConsensusIntent = () => {
    if (!activeIntent) return;
    setActionMode(activeIntent.mode);
    setChatInput(`As a table we commit to ${activeIntent.id}: ${activeIntent.prompt}`);
  };

  const handleObjectiveFieldChange = (field, value) => {
    setObjectiveState((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleObjectiveProgressDelta = (delta) => {
    setObjectiveState((current) => {
      const nextProgress = Math.min(
        current.maxProgress,
        Math.max(0, Number(current.progress || 0) + delta)
      );
      return {
        ...current,
        progress: nextProgress
      };
    });
  };

  const handleToggleReady = (seatName) => {
    setReadyCheckState((current) => ({
      ...current,
      [seatName]: !(current[seatName] === true)
    }));
  };

  const handleApplyObjectiveToComposer = () => {
    if (!activeObjectiveTitle) return;
    setActionMode('act');
    setChatInput(`Objective: ${activeObjectiveTitle}. Stakes: ${activeObjectiveStakes || 'unknown'}. I take the next decisive step by...`);
  };

  const handleSetDiveCommitment = (seatName, value) => {
    setDiveRitualState((current) => ({
      ...current,
      commitments: {
        ...(current.commitments || {}),
        [seatName]: value
      }
    }));
  };

  const handleSetSpotlightHolder = (seatName) => {
    setSpotlightState((current) => {
      const nextAssists = tableSeats.reduce((accumulator, currentSeat) => {
        if (currentSeat === seatName) return accumulator;
        accumulator[currentSeat] = current.assists?.[currentSeat] === true;
        return accumulator;
      }, {});
      return {
        ...current,
        holder: seatName,
        assists: nextAssists
      };
    });
    setActivePartyMemberName(seatName);
    const seatIndex = tableSeats.findIndex((entry) => entry === seatName);
    if (seatIndex >= 0) {
      setTurnState((current) => ({ ...current, turnIndex: seatIndex }));
    }
  };

  const handleToggleSpotlightAssist = (seatName) => {
    if (!spotlightHolder || seatName === spotlightHolder) return;
    setSpotlightState((current) => ({
      ...current,
      assists: {
        ...(current.assists || {}),
        [seatName]: !(current.assists?.[seatName] === true)
      }
    }));
  };

  const handleTrackWorldThread = (entry) => {
    const title = `${entry?.text || ''}`.trim();
    if (!title) return;
    const sourceEntryId = `${entry?.id || ''}`.trim();
    setWorldThreads((current) => {
      const existingBySource = sourceEntryId && current.some((thread) => thread.sourceEntryId === sourceEntryId);
      const existingByTitle = current.some((thread) => thread.title === title && thread.status !== 'resolved');
      if (existingBySource || existingByTitle) return current;

      const support = Number.isFinite(Number(entry?.support)) ? Math.max(0, Number(entry.support)) : 0;
      return ([
        {
          ...defaultWorldThreadState,
          id: `thread-${Date.now()}`,
          title,
          sourceType: entry?.type || 'truth',
          sourceEntryId,
          support
        },
        ...current
      ]).slice(0, 8);
    });
  };

  const handleThreadProgressDelta = (threadId, delta) => {
    setWorldThreads((current) => current.map((thread) => {
      if (thread.id !== threadId) return thread;
      const nextProgress = Math.min(
        thread.maxProgress,
        Math.max(0, Number(thread.progress || 0) + delta)
      );
      return {
        ...thread,
        progress: nextProgress
      };
    }));
  };

  const handleResolveThread = (threadId) => {
    setWorldThreads((current) => current.map((thread) => (
      thread.id === threadId
        ? { ...thread, status: 'resolved', progress: thread.maxProgress }
        : thread
    )));
  };

  const handlePrimeThreadToComposer = (thread) => {
    if (!thread?.title) return;
    const nextProgress = Math.min(thread.maxProgress, (thread.progress || 0) + 1);
    const objectivePrefix = activeObjectiveTitle ? ` Objective: ${activeObjectiveTitle}.` : '';
    setActionMode('act');
    setChatInput(`Thread focus: ${thread.title}.${objectivePrefix} We push this thread to ${nextProgress}/${thread.maxProgress} by...`);
  };

  const handleStartDiveBeat = () => {
    if (!activeAmbience || !activeFocalTruth || !hasDiveConsensus) return;
    const commitmentSummary = tableSeats
      .map((seatName) => {
        const commitment = normalizedDiveCommitments[seatName];
        return commitment ? `${seatName}: ${commitment}` : '';
      })
      .filter(Boolean)
      .join(' | ');
    setActionMode('act');
    setChatInput(`Dive beat. Ambience: ${activeAmbience}. Focal truth: ${activeFocalTruth}. Table commitments: ${commitmentSummary}. I act now by...`);
  };

  const handlePrimeSpotlightBeat = () => {
    if (!spotlightReadyForPrime || !spotlightHolder) return;
    const assistingSeats = Object.entries(normalizedSpotlightAssists)
      .filter(([, assisted]) => assisted)
      .map(([seatName]) => seatName);
    const assistSummary = assistingSeats.length ? assistingSeats.join(', ') : 'none';
    const objectivePrefix = activeObjectiveTitle ? ` Objective: ${activeObjectiveTitle}.` : '';
    const focalPrefix = activeFocalTruth ? ` Focal truth: ${activeFocalTruth}.` : '';
    setActionMode('act');
    setChatInput(`Spotlight beat. Lead: ${spotlightHolder}. Goal: ${activeSpotlightGoal}. Assists: ${assistSummary}.${objectivePrefix}${focalPrefix} I carry the beat by...`);
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
      const turnPrefix = `Lead ${turnPositionLabel}, Round ${turnState.round}`;
      const objectivePrefix = activeObjectiveTitle ? ` | Objective: ${activeObjectiveTitle}` : '';
      const spotlightPrefix = spotlightReadyForPrime ? ` | Spotlight: ${spotlightHolder} -> ${activeSpotlightGoal}` : '';
      const payload = await sendImmersiveRpgChat(apiBaseUrl, {
        sessionId,
        playerName: effectivePlayerName,
        message: `[${speakerPrefix} | ${turnPrefix}${objectivePrefix}${spotlightPrefix}] ${message}`
      });
      hydrateFromPayload(payload);
      setChatInput('');
      if (autoPassTurn && tableSeats.length > 1) {
        handlePassTurn();
      }
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
            <strong className="immersiveRpgHero__metaValue">{currentFlowPhase} · {partyRoster.length || 1} seat{partyRoster.length === 1 ? '' : 's'}</strong>
            <span className="immersiveRpgHero__metaHint">{flowRecommendation}</span>
          </div>
          <div className="immersiveRpgHero__metaCard">
            <span className="immersiveRpgHero__metaLabel">Immersion Pulse</span>
            <strong className="immersiveRpgHero__metaValue">{immersionPulse}% · {immersionTier}</strong>
            <span className="immersiveRpgHero__metaHint">
              {activeIntent
                ? `Table intent: ${activeIntent.label} (${activeIntent.support} support)`
                : 'Set table intent to align action before the next beat.'}
            </span>
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

                <div className="immersiveRpgFlowTrack">
                  {flowSteps.map((step) => (
                    <article
                      key={step.id}
                      className={[
                        'immersiveRpgFlowTrack__step',
                        step.ready ? 'is-ready' : '',
                        currentFlowPhase === step.label ? 'is-current' : ''
                      ].filter(Boolean).join(' ')}
                    >
                      <span>{step.label}</span>
                      <strong>{step.ready ? 'Ready' : 'Open'}</strong>
                      <small>{step.detail}</small>
                    </article>
                  ))}
                </div>

                <div className="immersiveRpgSessionLoop">
                  <div className="immersiveRpgSessionLoop__header">
                    <strong>Session Loop</strong>
                    <span>{currentFlowPhase} phase</span>
                  </div>
                  <div className="immersiveRpgSessionLoop__grid">
                    <article className="immersiveRpgSessionLoop__card">
                      <span>Next move</span>
                      <strong>{flowRecommendation}</strong>
                    </article>
                    <article className="immersiveRpgSessionLoop__card">
                      <span>Active seat</span>
                      <strong>{activeTurnSpeaker || effectivePlayerName || 'Solo POV'}</strong>
                    </article>
                    <article className="immersiveRpgSessionLoop__card">
                      <span>Lore pressure</span>
                      <strong>{supportSummary}</strong>
                    </article>
                    <article className="immersiveRpgSessionLoop__card">
                      <span>Objective</span>
                      <strong>{activeObjectiveTitle || 'Unwritten'}</strong>
                    </article>
                  </div>
                </div>

                <div className="immersiveRpgObjectiveForge">
                  <div className="immersiveRpgObjectiveForge__header">
                    <strong>Objective Forge</strong>
                    <span>{hasReadyConsensus ? 'Ready to move' : 'Need ready check'}</span>
                  </div>
                  <div className="immersiveRpgObjectiveForge__grid">
                    <label>
                      <span>Objective</span>
                      <input
                        value={objectiveState.title}
                        onChange={(event) => handleObjectiveFieldChange('title', event.target.value)}
                        placeholder="Secure the journal before dawn"
                      />
                    </label>
                    <label>
                      <span>Stakes</span>
                      <input
                        value={objectiveState.stakes}
                        onChange={(event) => handleObjectiveFieldChange('stakes', event.target.value)}
                        placeholder="If we fail, the watcher marks the house."
                      />
                    </label>
                  </div>
                  <div className="immersiveRpgObjectiveForge__clock">
                    <strong>Pressure Clock</strong>
                    <span>{objectiveState.progress}/{objectiveState.maxProgress}</span>
                    <div className="immersiveRpgObjectiveForge__controls">
                      <button type="button" className="immersiveRpgQuickPrompts__button" onClick={() => handleObjectiveProgressDelta(-1)}>
                        Ease
                      </button>
                      <button type="button" className="immersiveRpgQuickPrompts__button" onClick={() => handleObjectiveProgressDelta(1)}>
                        Escalate
                      </button>
                      <button type="button" className="immersiveRpgQuickPrompts__button" onClick={handleApplyObjectiveToComposer} disabled={!activeObjectiveTitle}>
                        Apply Objective To Composer
                      </button>
                    </div>
                  </div>
                </div>

                <div className="immersiveRpgReadyCheck">
                  <div className="immersiveRpgReadyCheck__header">
                    <strong>Ready Check</strong>
                    <span>{readySeatCount}/{tableSeats.length} seats ready</span>
                  </div>
                  <div className="immersiveRpgReadyCheck__seats">
                    {tableSeats.map((seatName) => {
                      const isReady = normalizedReadyCheck[seatName] === true;
                      return (
                        <button
                          key={`ready-${seatName}`}
                          type="button"
                          className={['immersiveRpgReadyCheck__seat', isReady ? 'is-ready' : ''].filter(Boolean).join(' ')}
                          onClick={() => handleToggleReady(seatName)}
                        >
                          <strong>{seatName}</strong>
                          <span>{isReady ? 'Ready' : 'Waiting'}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="immersiveRpgQuickPrompts__button"
                    disabled={!hasReadyConsensus || !activeObjectiveTitle}
                    onClick={handleApplyObjectiveToComposer}
                  >
                    Advance From Ready Check
                  </button>
                </div>

                <div className="immersiveRpgDiveRitual">
                  <div className="immersiveRpgDiveRitual__header">
                    <strong>Dive Ritual</strong>
                    <span>{diveRitualReadiness}</span>
                  </div>
                  <div className="immersiveRpgDiveRitual__fields">
                    <label>
                      <span>Ambience cue</span>
                      <input
                        value={diveRitualState.ambience}
                        onChange={(event) => setDiveRitualState((current) => ({ ...current, ambience: event.target.value }))}
                        placeholder="Wet stone, bell haze, candle smoke"
                      />
                    </label>
                    <label>
                      <span>Focal truth</span>
                      <input
                        value={diveRitualState.focalTruth}
                        onChange={(event) => setDiveRitualState((current) => ({ ...current, focalTruth: event.target.value }))}
                        placeholder="The thirteenth chime means the house is listening"
                      />
                    </label>
                  </div>
                  <div className="immersiveRpgDiveRitual__seats">
                    {tableSeats.map((seatName) => (
                      <label key={`dive-${seatName}`} className="immersiveRpgDiveRitual__seat">
                        <span>{seatName}</span>
                        <input
                          value={normalizedDiveCommitments[seatName]}
                          onChange={(event) => handleSetDiveCommitment(seatName, event.target.value)}
                          placeholder="One line commitment"
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="immersiveRpgQuickPrompts__button"
                    disabled={!activeAmbience || !activeFocalTruth || !hasDiveConsensus}
                    onClick={handleStartDiveBeat}
                  >
                    Start Dive Beat
                  </button>
                </div>

                <div className="immersiveRpgSpotlightRail">
                  <div className="immersiveRpgSpotlightRail__header">
                    <strong>Spotlight Baton</strong>
                    <span>{spotlightReadiness}</span>
                  </div>
                  <div className="immersiveRpgSpotlightRail__seats">
                    {tableSeats.map((seatName) => (
                      <button
                        key={`spotlight-holder-${seatName}`}
                        type="button"
                        className={['immersiveRpgSpotlightRail__seat', spotlightHolder === seatName ? 'is-holder' : ''].filter(Boolean).join(' ')}
                        onClick={() => handleSetSpotlightHolder(seatName)}
                      >
                        <strong>{seatName}</strong>
                        <span>{spotlightHolder === seatName ? 'Lead spotlight' : 'Set lead'}</span>
                      </button>
                    ))}
                  </div>
                  <label className="immersiveRpgSpotlightRail__goal">
                    <span>Beat goal</span>
                    <input
                      value={spotlightState.beatGoal}
                      onChange={(event) => setSpotlightState((current) => ({ ...current, beatGoal: event.target.value }))}
                      placeholder="Cross the lane unseen before the watcher turns"
                    />
                  </label>
                  {tableSeats.length > 1 ? (
                    <div className="immersiveRpgSpotlightRail__assists">
                      {tableSeats.filter((seatName) => seatName !== spotlightHolder).map((seatName) => {
                        const isAssisting = normalizedSpotlightAssists[seatName] === true;
                        return (
                          <button
                            key={`spotlight-assist-${seatName}`}
                            type="button"
                            className={['immersiveRpgSpotlightRail__assist', isAssisting ? 'is-assisting' : ''].filter(Boolean).join(' ')}
                            onClick={() => handleToggleSpotlightAssist(seatName)}
                            disabled={!spotlightHolder}
                          >
                            <strong>{seatName}</strong>
                            <span>{isAssisting ? 'Assisting' : 'Tap to assist'}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="immersiveRpgQuickPrompts__button"
                    disabled={!spotlightReadyForPrime}
                    onClick={handlePrimeSpotlightBeat}
                    title={
                      spotlightReadyForPrime
                        ? 'Prime the spotlight beat into the composer.'
                        : `Set lead + beat goal${tableSeats.length > 1 ? ' + enough assists' : ''} first.`
                    }
                  >
                    Prime Spotlight Beat
                  </button>
                </div>

                <div className="immersiveRpgTurnRail">
                  <div className="immersiveRpgTurnRail__header">
                    <strong>Lead Seat</strong>
                    <span>Round {turnState.round}</span>
                  </div>
                  <div className="immersiveRpgTurnRail__seats">
                    {tableSeats.map((seatName, seatIndex) => (
                      <button
                        key={`turn-seat-${seatName}-${seatIndex}`}
                        type="button"
                        className={[
                          'immersiveRpgTurnRail__seat',
                          seatIndex === normalizedTurnIndex ? 'is-current' : '',
                          seatName === effectivePlayerName ? 'is-speaking' : ''
                        ].filter(Boolean).join(' ')}
                        onClick={() => {
                          setTurnState((current) => ({ ...current, turnIndex: seatIndex }));
                          setActivePartyMemberName(seatName);
                        }}
                      >
                        <span>{seatName}</span>
                        <small>Seat {seatIndex + 1}</small>
                      </button>
                    ))}
                  </div>
                  <div className="immersiveRpgTurnRail__controls">
                    <button type="button" className="immersiveRpgQuickPrompts__button" onClick={handlePassTurn}>
                      Pass Turn
                    </button>
                    <label className="immersiveRpgTurnRail__toggle">
                      <input
                        type="checkbox"
                        checked={autoPassTurn}
                        onChange={(event) => setAutoPassTurn(event.target.checked)}
                      />
                      <span>Auto-pass after send</span>
                    </label>
                  </div>
                </div>

                <div className="immersiveRpgIntentSync">
                  <div className="immersiveRpgIntentSync__header">
                    <strong>Intent Sync</strong>
                    <span>{activeIntent ? `${activeIntent.label} leads` : 'No consensus yet'}</span>
                  </div>
                  <div className="immersiveRpgIntentSync__options">
                    {intentCounts.map((intent) => (
                      <button
                        key={intent.id}
                        type="button"
                        className={['immersiveRpgIntentSync__option', activeIntent?.id === intent.id ? 'is-leading' : ''].filter(Boolean).join(' ')}
                        onClick={() => handleSetIntentVote(intent.id)}
                      >
                        <strong>{intent.label}</strong>
                        <span>{intent.prompt}</span>
                        <small>{intent.support} support</small>
                      </button>
                    ))}
                  </div>
                  <div className="immersiveRpgIntentSync__voteLine">
                    {tableSeats.map((seatName) => (
                      <span key={`seat-vote-${seatName}`}>
                        {seatName}: {normalizedIntentVotes[seatName] || 'undecided'}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="immersiveRpgQuickPrompts__button"
                    disabled={!activeIntent}
                    onClick={handleApplyConsensusIntent}
                  >
                    Apply Consensus To Composer
                  </button>
                </div>

                <div className="immersiveRpgLoreForge">
                  <div className="immersiveRpgLoreForge__header">
                    <strong>Lore Forge</strong>
                    <span>{worldCandidates.length} pending</span>
                  </div>
                  <div className="immersiveRpgLoreForge__composer">
                    <input
                      value={candidateDraft}
                      onChange={(event) => setCandidateDraft(event.target.value)}
                      placeholder="Propose one world truth everyone can build on"
                    />
                    <button type="button" className="immersiveRpgQuickPrompts__button" onClick={handleProposeCandidate}>
                      Propose
                    </button>
                  </div>
                  {worldCandidates.length ? (
                    <div className="immersiveRpgLoreForge__list">
                      {worldCandidates.map((candidate) => {
                        const supporters = getCanonicalSupporters(candidate);
                        const support = supporters.length || Number(candidate.support || 0);
                        const supportStatus = summarizeCandidateSupport(support, tableSeats.length);
                        const seatSupport = `${Math.min(support, tableSeats.length)}/${tableSeats.length}`;
                        const canCanonize = support >= candidateCanonThreshold;
                        const supportingSeat = effectivePlayerName || activeTurnSpeaker || tableSeats[0];
                        const isSupporting = supporters.includes(supportingSeat);

                        return (
                          <article key={candidate.id} className="immersiveRpgLoreForge__entry">
                            <header>
                              <span>{candidate.proposer}</span>
                              <span>{support} support · {supportStatus}</span>
                            </header>
                            <p>{candidate.text}</p>
                            <div className="immersiveRpgLoreForge__meta">
                              <small>{seatSupport} seats backing this truth</small>
                              {supporters.length ? <small>{supporters.join(', ')}</small> : <small>No seats supporting yet.</small>}
                            </div>
                            <div className="immersiveRpgLoreForge__actions">
                              <button type="button" className="immersiveRpgQuickPrompts__button" onClick={() => handleSupportCandidate(candidate.id)}>
                                {isSupporting ? 'Withdraw Support' : 'Support'}
                              </button>
                              <button type="button" className="immersiveRpgQuickPrompts__button" onClick={() => handleAdoptCandidateAsObjective(candidate.id)}>
                                Adopt As Objective
                              </button>
                              <button
                                type="button"
                                className="immersiveRpgQuickPrompts__button"
                                onClick={() => handleCanonizeCandidate(candidate.id)}
                                disabled={!canCanonize}
                                title={canCanonize ? 'Enough support to canonize.' : `Needs ${candidateCanonThreshold} supporting seats to canonize.`}
                              >
                                Canonize
                              </button>
                              <button
                                type="button"
                                className="immersiveRpgQuickPrompts__button"
                                onClick={() => {
                                  setActionMode('worldbuild');
                                  setChatInput(`I propose we treat this as canon: ${candidate.text}`);
                                }}
                              >
                                Send To Chat
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="immersiveRpgParty__empty">No pending lore proposals. Add one truth and let the table support or canonize it.</p>
                  )}
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

              {recentCanonEcho.length ? (
                <div className="immersiveRpgCanonEcho">
                  <div className="immersiveRpgCanonEcho__header">
                    <strong>Recent Canon Echo</strong>
                    <span>{recentCanonEcho.length} pinned truth{recentCanonEcho.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="immersiveRpgCanonEcho__list">
                    {recentCanonEcho.map((entry) => (
                      <button
                        key={`canon-echo-${entry.id}`}
                        type="button"
                        className="immersiveRpgCanonEcho__chip"
                        onClick={() => {
                          setActionMode('worldbuild');
                          setChatInput(`Canon echo: ${entry.text}. I build from this truth by...`);
                        }}
                      >
                        <strong>{entry.text}</strong>
                        <span>{entry.proposer || 'table canon'} · {entry.support || 0} support</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

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
                    {entry.proposer ? <small>{entry.proposer} · {entry.support || 0} support</small> : null}
                    {Array.isArray(entry.supporters) && entry.supporters.length ? <small>{entry.supporters.join(', ')}</small> : null}
                    <button
                      type="button"
                      className="immersiveRpgQuickPrompts__button"
                      onClick={() => handleTrackWorldThread(entry)}
                    >
                      Track As Thread
                    </button>
                  </article>
                )) : (
                  <p className="immersiveRpgParty__empty">Pin scenes, places, and pressure points here to keep the world coherent across turns.</p>
                )}
              </div>

              <div className="immersiveRpgWorldThreads">
                <div className="immersiveRpgWorldThreads__header">
                  <strong>World Threads</strong>
                  <span>{activeWorldThreads.length}/{worldThreads.length || 0} active</span>
                </div>
                {worldThreads.length ? (
                  <div className="immersiveRpgWorldThreads__list">
                    {worldThreads.map((thread) => (
                      <article
                        key={thread.id}
                        className={['immersiveRpgWorldThreads__entry', thread.status === 'resolved' ? 'is-resolved' : ''].filter(Boolean).join(' ')}
                      >
                        <header>
                          <span>{thread.sourceType}</span>
                          <span>{thread.progress}/{thread.maxProgress}</span>
                        </header>
                        <p>{thread.title}</p>
                        <div className="immersiveRpgWorldThreads__actions">
                          <button type="button" className="immersiveRpgQuickPrompts__button" onClick={() => handleThreadProgressDelta(thread.id, 1)} disabled={thread.status === 'resolved'}>
                            Advance Thread
                          </button>
                          <button type="button" className="immersiveRpgQuickPrompts__button" onClick={() => handleThreadProgressDelta(thread.id, -1)} disabled={thread.status === 'resolved'}>
                            Setback Thread
                          </button>
                          <button type="button" className="immersiveRpgQuickPrompts__button" onClick={() => handlePrimeThreadToComposer(thread)}>
                            Prime Composer
                          </button>
                          <button type="button" className="immersiveRpgQuickPrompts__button" onClick={() => handleResolveThread(thread.id)} disabled={thread.status === 'resolved'}>
                            Resolve Thread
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="immersiveRpgParty__empty">Track pinned truths as world threads, then advance them into actions.</p>
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

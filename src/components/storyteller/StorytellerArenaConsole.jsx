import React, { useEffect, useMemo, useRef, useState } from 'react';
import './StorytellerArenaConsole.css';
import ArenaCard from './ArenaCard';
import EdgeLine from './EdgeLine';
import RelationshipInput from './RelationshipInput';
import arenaMap from './arenaMaps/arenaMap.petalHex.v1.json';
import spreadPresets from './spreads.v1.json';
import { fetchSessionPlayers } from '../../api/storytellerSession';
import { validateRelationship, proposeRelationship, fetchArenaState } from '../../api/arenaRelationships.api';

const DEFAULT_FRAGMENT_TEXT =
  'A wind-scoured pass with a rusted watchtower and a lone courier arriving at dusk.';
const MOCK_API_CALLS = true;
const TURN_ACTIONS_PER_TURN = 2;
const SCENE_CLOCK_MIN = 0;
const SCENE_CLOCK_MAX = 6;
const PRESENCE_TOKEN_MAX = 3;
const TURN_MOVE_DEFINITIONS = [
  {
    id: 'establish',
    label: 'Establish',
    detail: 'Ground the scene with a concrete world detail.',
    ledgerType: 'canon',
    effects: { momentum: 0, clarity: 1, sceneClock: -1 },
    text: 'anchors a concrete detail in the shared fiction.'
  },
  {
    id: 'complicate',
    label: 'Complicate',
    detail: 'Raise stakes with friction, danger, or conflict.',
    ledgerType: 'mystery',
    effects: { momentum: 1, clarity: -1, sceneClock: 1 },
    text: 'introduces pressure that threatens the current plan.'
  },
  {
    id: 'reveal',
    label: 'Reveal',
    detail: 'Expose a hidden truth tied to the world.',
    ledgerType: 'canon',
    effects: { momentum: 1, clarity: 1, sceneClock: 1 },
    text: 'reveals a truth that reframes the scene.'
  }
];
const SPOTLIGHT_MOVES = [
  {
    id: 'show',
    label: 'Show',
    detail: 'Reveal a concrete detail in-scene.',
    ledgerType: 'canon',
    effects: { momentum: 0, clarity: 1 },
    text: 'shows a concrete detail to everyone.'
  },
  {
    id: 'ask',
    label: 'Ask',
    detail: 'Invite another voice to add color or truth.',
    ledgerType: 'oath',
    effects: { momentum: 0, clarity: 1 },
    text: 'asks the table to deepen the moment.'
  },
  {
    id: 'offer',
    label: 'Offer',
    detail: 'Offer a risk or promise to move forward.',
    ledgerType: 'mystery',
    effects: { momentum: 1, clarity: 0 },
    text: 'offers a cost that propels the scene.'
  }
];
const COLLAB_MOVES = [
  {
    id: 'echo',
    label: 'Echo',
    detail: 'Reinforce a detail another player just introduced.',
    ledgerType: 'canon',
    effects: { momentum: 0, clarity: 1, sceneClock: -1 },
    text: 'echoes the last detail to lock it in.'
  },
  {
    id: 'twist',
    label: 'Twist',
    detail: 'Add a surprising angle without breaking canon.',
    ledgerType: 'mystery',
    effects: { momentum: 1, clarity: 0, sceneClock: 1 },
    text: 'twists the scene with a new angle.'
  },
  {
    id: 'bind',
    label: 'Bind',
    detail: 'Connect two existing truths into canon.',
    ledgerType: 'canon',
    effects: { momentum: 0, clarity: 1, sceneClock: 0 },
    text: 'binds two truths together.'
  }
];
const FLOW_LOOP_ACTIONS = [
  {
    id: 'frame',
    label: 'Frame',
    detail: 'Declare where we are, what time it is, and what is immediate.',
    ledgerType: 'canon',
    effects: { momentum: 0, clarity: 1, sceneClock: -1 },
    text: 'frames the moment for the table.'
  },
  {
    id: 'invite',
    label: 'Invite',
    detail: 'Hand the spotlight to another player.',
    ledgerType: 'oath',
    effects: { momentum: 1, clarity: 0, sceneClock: 0 },
    text: 'invites another voice into the scene.'
  },
  {
    id: 'seal',
    label: 'Seal',
    detail: 'Lock a truth into canon before advancing.',
    ledgerType: 'canon',
    effects: { momentum: 1, clarity: 1, sceneClock: 0 },
    text: 'seals a shared truth into canon.'
  }
];
const VOW_DEFINITIONS = [
  {
    id: 'hush',
    label: 'Hush',
    detail: 'Adds +1 clarity to ritual and immersion moves.'
  },
  {
    id: 'anchor',
    label: 'Anchor',
    detail: 'Softens pressure spikes by 1 when moves raise scene pressure.'
  },
  {
    id: 'pact',
    label: 'Pact',
    detail: 'Adds +1 momentum while ritual mode is active.'
  }
];
const WORLD_PROFILE_DEFAULT = {
  worldName: '',
  mood: '',
  truth: '',
  taboo: '',
  pillars: [],
  regions: [],
  factions: [],
  laws: [],
  era: '',
  conflict: '',
  wonder: '',
  sound: '',
  scent: '',
  texture: ''
};
const SESSION_STATE_DEFAULT = {
  readyMap: {},
  focusPlayerKey: '',
  beatId: 'arrival',
  phase: 'worldbuild',
  intent: '',
  turnOrder: [],
  turnIndex: 0,
  ritualActive: false,
  sceneClock: 2,
  actionBank: {},
  diveMode: false,
  lastSignal: null,
  ledger: [],
  anchors: [],
  pulse: {
    momentum: 2,
    clarity: 2
  },
  sceneGoal: '',
  sceneRisk: '',
  threads: [],
  lastFlowAction: null,
  presenceTokens: {},
  lastCollabMove: null,
  beatVotes: {},
  lastBeatSync: null,
  resonance: {
    pending: false,
    cue: '',
    calledByKey: '',
    answeredByKey: '',
    streak: 0,
    at: ''
  },
  vows: {
    hush: false,
    anchor: false,
    pact: false
  }
};

const getWorldProfileKey = (sessionId) =>
  `storyteller:worldProfile:${sessionId || 'default'}`;
const getSessionStateKey = (sessionId) =>
  `storyteller:sessionState:${sessionId || 'default'}`;
const STORY_ADMIN_API_BASE_STORAGE_KEY = 'typewriterAdminApiBaseUrl';
const clampPulseValue = (value) => Math.min(5, Math.max(0, value));
const clampSceneClockValue = (value) => Math.min(SCENE_CLOCK_MAX, Math.max(SCENE_CLOCK_MIN, value));
const createActionBank = (keys, value = TURN_ACTIONS_PER_TURN) =>
  Object.fromEntries((Array.isArray(keys) ? keys : []).map((key) => [key, value]));
const describeSceneClock = (value) => {
  if (value <= 1) return 'Calm';
  if (value <= 3) return 'Tense';
  if (value <= 5) return 'Critical';
  return 'Breaking';
};
const applyVowModifiers = (effects, vows, options = {}) => {
  const ritualActive = Boolean(options.ritualActive);
  const next = {
    momentum: Number(effects?.momentum) || 0,
    clarity: Number(effects?.clarity) || 0,
    sceneClock: Number(effects?.sceneClock) || 0
  };
  if (vows?.hush) {
    next.clarity += 1;
  }
  if (vows?.anchor && next.sceneClock > 0) {
    next.sceneClock = Math.max(0, next.sceneClock - 1);
  }
  if (vows?.pact && ritualActive) {
    next.momentum += 1;
  }
  return next;
};

const readWorldProfile = (sessionId) => {
  if (typeof window === 'undefined') return { ...WORLD_PROFILE_DEFAULT };
  const key = getWorldProfileKey(sessionId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return { ...WORLD_PROFILE_DEFAULT };
  try {
    return { ...WORLD_PROFILE_DEFAULT, ...JSON.parse(raw) };
  } catch (error) {
    return { ...WORLD_PROFILE_DEFAULT };
  }
};

const writeWorldProfile = (sessionId, profile) => {
  if (typeof window === 'undefined') return;
  const key = getWorldProfileKey(sessionId);
  window.localStorage.setItem(key, JSON.stringify(profile));
};

const readSessionState = (sessionId) => {
  if (typeof window === 'undefined') return { ...SESSION_STATE_DEFAULT };
  const key = getSessionStateKey(sessionId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return { ...SESSION_STATE_DEFAULT };
  try {
    return { ...SESSION_STATE_DEFAULT, ...JSON.parse(raw) };
  } catch (error) {
    return { ...SESSION_STATE_DEFAULT };
  }
};

const readStoryAdminApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  const stored = window.localStorage.getItem(STORY_ADMIN_API_BASE_STORAGE_KEY);
  return typeof stored === 'string' && stored.trim() ? stored.trim() : 'http://localhost:5001';
};

const writeSessionState = (sessionId, state) => {
  if (typeof window === 'undefined') return;
  const key = getSessionStateKey(sessionId);
  window.localStorage.setItem(key, JSON.stringify(state));
};

const clampCards = (cards, limit = 8) => {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, limit);
};

const buildQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const resolveAssetUrl = (base, url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const buildEmptyArena = (map) => ({
  edges: Object.fromEntries(
    Object.entries(map.sideSlots || {}).map(([edgeKey, slots]) => [
      edgeKey,
      slots.map((slot) => ({
        slotId: slot.id,
        cardInstanceId: null,
        ownerPlayerId: null
      }))
    ])
  ),
  center: (map.centerSlots || []).map((slot) => ({
    slotId: slot.id,
    cardInstanceId: null,
    ownerPlayerId: null
  }))
});

const getSpreadById = (spreadId) =>
  spreadPresets.find((spread) => spread.spreadId === spreadId) || spreadPresets[0];

const createSpreadSlots = (spread) =>
  spread.slots.map((slot) => ({
    ...slot,
    cardInstanceId: null
  }));

const createPlayerState = (index, options = {}) => {
  const name = typeof options.playerName === 'string' ? options.playerName.trim() : '';
  const explicitId = typeof options.playerId === 'string' ? options.playerId.trim() : '';
  const isPrimary = index === 0 && (name || explicitId);
  const id = isPrimary ? explicitId || name : `player-${index + 1}`;
  const label = isPrimary ? name || explicitId : `Player ${index + 1}`;
  const spread = getSpreadById(spreadPresets[0]?.spreadId);
  return {
    id,
    label,
    level: 1,
    fragmentText: DEFAULT_FRAGMENT_TEXT,
    includeCards: true,
    includeFront: true,
    includeBack: true,
    error: null,
    busy: false,
    deck: [],
    spreadId: spread.spreadId,
    spreadSlots: createSpreadSlots(spread),
    spreadSelected: {},
    storyteller: {
      activeId: '',
      list: []
    }
  };
};

const coerceStorytellers = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.storytellers)) return payload.storytellers;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const pickThemeKey = (storyteller, index) => {
  const name = `${storyteller?.name || ''}`.toLowerCase();
  if (name.includes('oracle') || name.includes('seer') || name.includes('augur')) return 'oracle';
  if (name.includes('hunt') || name.includes('blade') || name.includes('warden')) return 'hunter';
  if (name.includes('archiv') || name.includes('scribe') || name.includes('librar')) return 'archivist';
  if (name.includes('defil') || name.includes('void') || name.includes('corrupt')) return 'defiler';
  const keys = ['archivist', 'hunter', 'oracle', 'defiler'];
  return keys[index % keys.length];
};

const EDGE_SETS = {
  1: ['south'],
  2: ['south', 'north'],
  3: ['south', 'northwest', 'northeast'],
  4: ['south', 'southwest', 'northwest', 'northeast']
};

const StorytellerArenaConsole = ({
  initialSessionId = 'demo-1',
  initialPlayerName = '',
  initialPlayerId = '',
  lockPrimaryPlayerId = false
}) => {
  const [apiBaseUrl] = useState(() => readStoryAdminApiBaseUrl());
  const [sessionId] = useState(initialSessionId);
  const [playersCount, setPlayersCount] = useState(1);
  const [sessionState, setSessionState] = useState(() => readSessionState(initialSessionId));
  const [selectedPromptId, setSelectedPromptId] = useState('sense');
  const [players, setPlayers] = useState([
    createPlayerState(0, { playerName: initialPlayerName, playerId: initialPlayerId })
  ]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [cardDefinitions, setCardDefinitions] = useState({});
  const [cardInstances, setCardInstances] = useState({});
  const [arenaState, setArenaState] = useState(() => buildEmptyArena(arenaMap));
  const [notice, setNotice] = useState('');
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugDrawerOpen, setDebugDrawerOpen] = useState(false);
  const [showSlotOverlay, setShowSlotOverlay] = useState(false);
  const [edgeRevealMode, setEdgeRevealMode] = useState('back');
  const [hoveredInstanceId, setHoveredInstanceId] = useState('');
  const [arenaSnapshot, setArenaSnapshot] = useState('');
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationGroup, setCalibrationGroup] = useState('center');
  const [calibrationSlots, setCalibrationSlots] = useState([]);
  const [calibrationDraft, setCalibrationDraft] = useState(null);
  const [selectedDeckCards, setSelectedDeckCards] = useState({});
  const [arenaEdges, setArenaEdges] = useState([]);
  const [connectionMode, setConnectionMode] = useState('idle');
  const [pendingConnection, setPendingConnection] = useState(null);
  const [recentPoints, setRecentPoints] = useState(null);
  const [worldProfile, setWorldProfile] = useState(() => readWorldProfile(initialSessionId));
  const [pillarInput, setPillarInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [factionInput, setFactionInput] = useState('');
  const [lawInput, setLawInput] = useState('');
  const [ledgerType, setLedgerType] = useState('canon');
  const [ledgerText, setLedgerText] = useState('');
  const [anchorInput, setAnchorInput] = useState('');
  const [threadInput, setThreadInput] = useState('');
  const [resonanceInput, setResonanceInput] = useState('');
  const boardRef = useRef(null);
  const boardStageRef = useRef(null);
  const forgePanelRef = useRef(null);
  const fragmentInputRef = useRef(null);
  const deckPanelRef = useRef(null);
  const spreadPanelRef = useRef(null);
  const worldProfileRef = useRef(null);
  const sceneLensRef = useRef(null);
  const anchorsRef = useRef(null);
  const intentRef = useRef(null);
  const presenceRef = useRef(null);
  const diveBriefRef = useRef(null);

  const baseUrl = useMemo(() => {
    if (!apiBaseUrl) return '';
    return apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  }, [apiBaseUrl]);

  const activePlayer = players[activePlayerIndex] || players[0];
  const activePlayerId = activePlayer?.id || '';
  const activeSpread = getSpreadById(activePlayer?.spreadId);

  useEffect(() => {
    setWorldProfile(readWorldProfile(sessionId));
  }, [sessionId]);

  useEffect(() => {
    writeWorldProfile(sessionId, worldProfile);
  }, [sessionId, worldProfile]);

  useEffect(() => {
    setSessionState(readSessionState(sessionId));
    setSelectedPromptId('sense');
  }, [sessionId]);

  useEffect(() => {
    writeSessionState(sessionId, sessionState);
  }, [sessionId, sessionState]);

  useEffect(() => {
    setPlayers((prev) => {
      const next = prev.slice(0, playersCount);
      if (next.length < playersCount) {
        for (let index = next.length; index < playersCount; index += 1) {
          next.push(createPlayerState(index));
        }
      }
      return next;
    });
  }, [playersCount]);

  useEffect(() => {
    setActivePlayerIndex((prev) => Math.min(prev, Math.max(playersCount - 1, 0)));
  }, [playersCount]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const hasArenaCards = useMemo(() => {
    const centerHas = arenaState.center?.some((slot) => slot.cardInstanceId);
    const edgeHas = Object.values(arenaState.edges || {}).some((slots) =>
      slots.some((slot) => slot.cardInstanceId)
    );
    return Boolean(centerHas || edgeHas);
  }, [arenaState.center, arenaState.edges]);

  const hasWorldCharter = Boolean(
    worldProfile.worldName.trim() ||
      worldProfile.truth.trim() ||
      (worldProfile.pillars || []).length >= 3
  );
  const hasWorldAtlas = Boolean(
    (worldProfile.regions || []).length ||
      (worldProfile.factions || []).length ||
      (worldProfile.laws || []).length
  );
  const worldAtlasCount =
    (worldProfile.regions || []).length +
    (worldProfile.factions || []).length +
    (worldProfile.laws || []).length;

  const flowSteps = useMemo(() => {
    const seeded = Boolean(activePlayer?.fragmentText?.trim());
    const hasEntities = (activePlayer?.deck?.length || 0) > 0;
    const hasSpread = activePlayer?.spreadSlots?.some((slot) => slot.cardInstanceId);
    const hasConnections = (arenaEdges?.length || 0) > 0;
    return [
      {
        id: 'charter',
        title: 'Charter the World',
        description: 'Name the world, its mood, pillars, and atlas.',
        done: hasWorldCharter
      },
      {
        id: 'seed',
        title: 'Seed the World',
        description: 'Write a fragment that defines place, tone, and tension.',
        done: seeded
      },
      {
        id: 'forge',
        title: 'Forge Entities',
        description: 'Generate characters, factions, and relics to populate the deck.',
        done: hasEntities
      },
      {
        id: 'spread',
        title: 'Reveal the Spread',
        description: 'Draw cards into a private layout before unveiling them.',
        done: Boolean(hasSpread)
      },
      {
        id: 'arena',
        title: 'Stage the Arena',
        description: 'Place shared cards into the central mythspace.',
        done: hasArenaCards
      },
      {
        id: 'weave',
        title: 'Weave Connections',
        description: 'Connect entities to lock in world truths.',
        done: hasConnections
      }
    ];
  }, [
    activePlayer?.deck?.length,
    activePlayer?.fragmentText,
    activePlayer?.spreadSlots,
    hasArenaCards,
    arenaEdges,
    hasWorldCharter
  ]);

  const immersionScore = useMemo(() => {
    const doneCount = flowSteps.filter((step) => step.done).length;
    if (!flowSteps.length) return 0;
    return Math.round((doneCount / flowSteps.length) * 100);
  }, [flowSteps]);
  const currentFlowStepId =
    flowSteps.find((step) => !step.done)?.id || flowSteps[flowSteps.length - 1]?.id || '';
  const currentFlowStep =
    flowSteps.find((step) => step.id === currentFlowStepId) || flowSteps[flowSteps.length - 1] || null;
  const currentFlowStepIndex = currentFlowStep
    ? Math.max(flowSteps.findIndex((step) => step.id === currentFlowStep.id), 0) + 1
    : 0;
  const flowGuidance = useMemo(() => {
    const guidanceByStep = {
      charter: {
        mode: 'worldbuild',
        modeLabel: 'Worldbuild',
        focus: 'Meta Creation',
        cue: 'Define canon, tone, frame, pillars, and atlas before play begins.',
        next: 'Seed the world with a fragment.'
      },
      seed: {
        mode: 'worldbuild',
        modeLabel: 'Worldbuild',
        focus: 'World Seed',
        cue: 'Write a fragment that signals place, mood, and tension.',
        next: 'Forge the cast and factions.'
      },
      forge: {
        mode: 'worldbuild',
        modeLabel: 'Worldbuild',
        focus: 'Entity Forging',
        cue: 'Generate characters, factions, and relics to populate the deck.',
        next: 'Reveal a spread of visions.'
      },
      spread: {
        mode: 'immersion',
        modeLabel: 'Immersion',
        focus: 'Private Visions',
        cue: 'Draw cards into a private spread before sharing them.',
        next: 'Stage the shared arena.'
      },
      arena: {
        mode: 'immersion',
        modeLabel: 'Immersion',
        focus: 'Shared Stage',
        cue: 'Place shared cards into the central mythspace.',
        next: 'Weave connections into canon.'
      },
      weave: {
        mode: 'action',
        modeLabel: 'Action',
        focus: 'Canon Lock-In',
        cue: 'Connect entities and lock truths before the ritual begins.',
        next: 'Enter ritual and play turns.'
      }
    };
    const fallback = {
      mode: 'worldbuild',
      modeLabel: 'Worldbuild',
      focus: 'Begin the World',
      cue: 'Start with a charter that names the world and its rules.',
      next: 'Seed the world with a fragment.'
    };
    const active = guidanceByStep[currentFlowStepId] || fallback;
    const currentIndex = flowSteps.findIndex((step) => step.id === currentFlowStepId);
    const nextStep = currentIndex >= 0 ? flowSteps[currentIndex + 1] : null;
    const next = nextStep?.title || active.next;
    return { ...active, next };
  }, [currentFlowStepId, flowSteps]);

  const flowPulseItems = useMemo(() => {
    const lensReady = Boolean(sceneGoal.trim() || sceneRisk.trim());
    const intentReady = Boolean((sessionState.intent || '').trim());
    const anchorsReady = anchors.length > 0;
    const readyReady = playersCount > 0 ? readyCount === playersCount : false;
    return [
      {
        id: 'charter',
        label: 'World Charter',
        detail: hasWorldCharter ? 'Canon defined' : 'Name the world + pillars',
        ready: hasWorldCharter,
        actionLabel: 'Open Charter',
        actionId: 'charter'
      },
      {
        id: 'atlas',
        label: 'World Atlas',
        detail: hasWorldAtlas ? 'Meta anchors set' : 'Add regions, factions, laws',
        ready: hasWorldAtlas,
        actionLabel: 'Build Atlas',
        actionId: 'charter'
      },
      {
        id: 'lens',
        label: 'Scene Lens',
        detail: lensReady ? 'Goal & stakes set' : 'Define goal + stakes',
        ready: lensReady,
        actionLabel: 'Set Lens',
        actionId: 'lens'
      },
      {
        id: 'intent',
        label: 'Shared Intent',
        detail: intentReady ? 'Intent aligned' : 'Align the table',
        ready: intentReady,
        actionLabel: 'Set Intent',
        actionId: 'intent'
      },
      {
        id: 'anchors',
        label: 'World Anchors',
        detail: anchorsReady ? `${anchors.length} anchored` : 'Pin 1-3 anchors',
        ready: anchorsReady,
        actionLabel: 'Pin Anchors',
        actionId: 'anchors'
      },
      {
        id: 'presence',
        label: 'Table Ready',
        detail: readyReady ? 'All seats ready' : `Ready ${readyCount}/${playersCount}`,
        ready: readyReady,
        actionLabel: 'Go to Presence',
        actionId: 'presence'
      }
    ];
  }, [
    anchors.length,
    hasWorldCharter,
    hasWorldAtlas,
    playersCount,
    readyCount,
    sceneGoal,
    sceneRisk,
    sessionState.intent
  ]);

  const flowPulseBlockers = flowPulseItems.filter((item) => !item.ready).length;

  const roleLabels = useMemo(
    () => ['Lorekeeper', 'Cartographer', 'Warden', 'Oracle'],
    []
  );

  const phaseOptions = useMemo(
    () => [
      { id: 'worldbuild', label: 'Worldbuild', detail: 'Define canon and seeds.' },
      { id: 'immersion', label: 'Immersion', detail: 'Lean into presence and mood.' },
      { id: 'action', label: 'Action', detail: 'Resolve motion and consequence.' }
    ],
    []
  );

  const sceneBeats = useMemo(
    () => [
      { id: 'arrival', label: 'Arrival', detail: 'Establish place, tone, and entry.' },
      { id: 'pressure', label: 'Pressure', detail: 'Introduce friction or an urgent need.' },
      { id: 'revelation', label: 'Revelation', detail: 'Reveal a truth the world hides.' },
      { id: 'choice', label: 'Choice', detail: 'Force a decision with a cost.' },
      { id: 'aftermath', label: 'Aftermath', detail: 'Show consequences and echo.' }
    ],
    []
  );

  const immersionPrompts = useMemo(() => {
    const mood = worldProfile.mood.trim();
    const truth = worldProfile.truth.trim();
    const taboo = worldProfile.taboo.trim();
    return [
      {
        id: 'sense',
        title: 'Sensory Anchor',
        text: mood ? `Let the scene breathe with ${mood}.` : 'Name a temperature, scent, or texture.'
      },
      {
        id: 'truth',
        title: 'Mythic Truth',
        text: truth ? `Reinforce: ${truth}` : 'Reveal one law of the world.'
      },
      {
        id: 'taboo',
        title: 'Risk & Taboo',
        text: taboo ? `Circle the taboo: ${taboo}` : 'Name a forbidden act or cost.'
      }
    ];
  }, [worldProfile.mood, worldProfile.taboo, worldProfile.truth]);

  const getPlayerKey = (player, index) => {
    if (player?.id?.trim()) return player.id.trim();
    if (player?.label?.trim()) return player.label.trim();
    return `player-${index + 1}`;
  };

  const getPlayerStatus = (player, index) => {
    const playerKey = getPlayerKey(player, index);
    if (sessionState.readyMap?.[playerKey]) return { label: 'Ready', tone: 'ready' };
    if (!player?.id) return { label: 'Unbound', tone: 'waiting' };
    if (index === activePlayerIndex) return { label: 'Active Focus', tone: 'active' };
    if (!player?.fragmentText?.trim()) return { label: 'Awaiting Seed', tone: 'waiting' };
    if (!(player?.deck?.length > 0)) return { label: 'Forging', tone: 'working' };
    return { label: 'Weaving', tone: 'ready' };
  };

  const activeBeat =
    sceneBeats.find((beat) => beat.id === sessionState.beatId) || sceneBeats[0];
  const promptMap = useMemo(
    () => Object.fromEntries(immersionPrompts.map((prompt) => [prompt.id, prompt])),
    [immersionPrompts]
  );
  const selectedPrompt = promptMap[selectedPromptId] || immersionPrompts[0];
  const focusPlayerKey = sessionState.focusPlayerKey;
  const getPlayerLabelByKey = (playerKey, fallback = 'Unassigned') => {
    if (!playerKey) return fallback;
    const match = players
      .slice(0, playersCount)
      .find((player, index) => getPlayerKey(player, index) === playerKey);
    if (!match) return fallback;
    return match.label || match.id || 'Focus';
  };
  const focusPlayerLabel = getPlayerLabelByKey(focusPlayerKey, 'Unclaimed');
  const turnOrder = Array.isArray(sessionState.turnOrder) ? sessionState.turnOrder : [];
  const currentTurnKey = turnOrder[sessionState.turnIndex] || '';
  const currentTurnLabel = getPlayerLabelByKey(currentTurnKey, 'Unassigned');
  const phaseLabel =
    phaseOptions.find((phase) => phase.id === sessionState.phase)?.label || 'Worldbuild';
  const readyCount = players
    .slice(0, playersCount)
    .filter((player, index) => sessionState.readyMap?.[getPlayerKey(player, index)]).length;
  const ledgerEntries = Array.isArray(sessionState.ledger) ? sessionState.ledger : [];
  const anchors = Array.isArray(sessionState.anchors) ? sessionState.anchors : [];
  const threads = Array.isArray(sessionState.threads) ? sessionState.threads : [];
  const sceneGoal = sessionState.sceneGoal || '';
  const sceneRisk = sessionState.sceneRisk || '';
  const pulse = sessionState.pulse || { momentum: 2, clarity: 2 };
  const ritualActive = Boolean(sessionState.ritualActive);
  const rawSceneClock = Number(sessionState.sceneClock);
  const sceneClock = clampSceneClockValue(Number.isFinite(rawSceneClock) ? rawSceneClock : 2);
  const sceneClockLabel = describeSceneClock(sceneClock);
  const presenceTokens =
    sessionState.presenceTokens && typeof sessionState.presenceTokens === 'object'
      ? sessionState.presenceTokens
      : {};
  const getPresenceTokenCount = (playerKey) => {
    if (!playerKey) return 0;
    const raw = Number(presenceTokens[playerKey]);
    if (Number.isFinite(raw)) return Math.max(0, Math.min(PRESENCE_TOKEN_MAX, raw));
    return PRESENCE_TOKEN_MAX;
  };
  const spotlightKey = focusPlayerKey || currentTurnKey;
  const spotlightLabel = getPlayerLabelByKey(spotlightKey, 'Unassigned');
  const spotlightTokens = spotlightKey ? getPresenceTokenCount(spotlightKey) : 0;
  const beatVotes =
    sessionState.beatVotes && typeof sessionState.beatVotes === 'object' ? sessionState.beatVotes : {};
  const activeBeatId = activeBeat?.id || sceneBeats[0]?.id || 'arrival';
  const readyPlayerKeys = players
    .slice(0, playersCount)
    .map((player, index) => getPlayerKey(player, index))
    .filter((playerKey) => sessionState.readyMap?.[playerKey]);
  const syncTargetKeys = readyPlayerKeys.length
    ? readyPlayerKeys
    : players.slice(0, playersCount).map((player, index) => getPlayerKey(player, index));
  const beatSyncRequired = syncTargetKeys.length;
  const beatSyncVotes = syncTargetKeys.filter((playerKey) => beatVotes[playerKey] === activeBeatId).length;
  const beatSyncReady = beatSyncRequired > 0 && beatSyncVotes >= beatSyncRequired;
  const vows =
    sessionState.vows && typeof sessionState.vows === 'object' ? sessionState.vows : SESSION_STATE_DEFAULT.vows;
  const activeVows = VOW_DEFINITIONS.filter((vow) => Boolean(vows[vow.id]));
  const resonance =
    sessionState.resonance && typeof sessionState.resonance === 'object'
      ? sessionState.resonance
      : SESSION_STATE_DEFAULT.resonance;
  const resonancePending = Boolean(resonance.pending);
  const resonanceCue = typeof resonance.cue === 'string' ? resonance.cue : '';
  const resonanceCallerKey = resonance.calledByKey || '';
  const resonanceAnswerKey = resonance.answeredByKey || '';
  const resonanceCallerLabel = getPlayerLabelByKey(resonanceCallerKey, 'Unassigned');
  const resonanceAnswerLabel = getPlayerLabelByKey(resonanceAnswerKey, 'Unassigned');
  const resonanceStreak = Math.max(0, Number(resonance.streak) || 0);
  const immersionGate = useMemo(
    () => ({
      charter: hasWorldCharter,
      anchors: anchors.length > 0,
      lens: Boolean(sceneGoal.trim() || sceneRisk.trim()),
      intent: Boolean((sessionState.intent || '').trim()),
      ready: playersCount > 0 ? readyCount === playersCount : false,
      ritual: ritualActive
    }),
    [
      anchors.length,
      hasWorldCharter,
      playersCount,
      readyCount,
      ritualActive,
      sceneGoal,
      sceneRisk,
      sessionState.intent
    ]
  );
  const ritualGateReady =
    hasWorldCharter &&
    Boolean(sceneGoal.trim() || sceneRisk.trim()) &&
    Boolean((sessionState.intent || '').trim()) &&
    (playersCount <= 1 || readyCount === playersCount);
  const actionBank =
    sessionState.actionBank && typeof sessionState.actionBank === 'object'
      ? sessionState.actionBank
      : {};
  const rawCurrentTurnActions = Number(actionBank[currentTurnKey]);
  const currentTurnActions = currentTurnKey
    ? Math.max(
        0,
        Number.isFinite(rawCurrentTurnActions) ? rawCurrentTurnActions : TURN_ACTIONS_PER_TURN
      )
    : 0;
  const flowRecommendation = useMemo(() => {
    if (!hasWorldCharter) {
      return {
        title: 'Complete World Charter',
        detail: 'Set world name/truth/pillars before moving to scene action.',
        actionLabel: 'Open Charter',
        actionId: 'charter'
      };
    }
    if (!hasWorldAtlas) {
      return {
        title: 'Build World Atlas',
        detail: 'Add at least one region, faction, or law for shared context.',
        actionLabel: 'Build Atlas',
        actionId: 'charter'
      };
    }
    if (!sceneGoal.trim() && !sceneRisk.trim()) {
      return {
        title: 'Set Scene Lens',
        detail: 'Define a goal and stakes to focus immersion.',
        actionLabel: 'Set Lens',
        actionId: 'lens'
      };
    }
    if (!(sessionState.intent || '').trim()) {
      return {
        title: 'Align Shared Intent',
        detail: 'Set one table intent so every move reinforces the same tone.',
        actionLabel: 'Set Intent',
        actionId: 'intent'
      };
    }
    if (!anchors.length) {
      return {
        title: 'Pin First Anchor',
        detail: 'Lock one concrete truth to keep narration grounded.',
        actionLabel: 'Pin Anchor',
        actionId: 'anchors'
      };
    }
    if (!immersionGate.ready) {
      return {
        title: 'Ready the Table',
        detail: 'All seats should mark Ready before ritual begins.',
        actionLabel: 'Open Presence',
        actionId: 'presence'
      };
    }
    if (!ritualActive) {
      return {
        title: 'Open Ritual Mode',
        detail: 'Switch from setup into active immersion turns.',
        actionLabel: 'Start Ritual',
        actionId: 'start-ritual'
      };
    }
    if (resonancePending) {
      return {
        title: 'Answer Resonance Call',
        detail: 'A second voice should answer the current cue for a sync bonus.',
        actionLabel: 'Open Presence',
        actionId: 'presence'
      };
    }
    return {
      title: 'Call a Resonance Cue',
      detail: 'Use a short call-and-response to deepen immersion and steady scene pressure.',
      actionLabel: 'Open Presence',
      actionId: 'presence'
    };
  }, [
    hasWorldCharter,
    hasWorldAtlas,
    sceneGoal,
    sceneRisk,
    sessionState.intent,
    anchors.length,
    immersionGate.ready,
    ritualActive,
    resonancePending
  ]);
  const immersionPrimer = useMemo(() => {
    const lines = [];
    const name = worldProfile.worldName.trim();
    const mood = worldProfile.mood.trim();
    const truth = worldProfile.truth.trim();
    const taboo = worldProfile.taboo.trim();
    const era = worldProfile.era.trim();
    const conflict = worldProfile.conflict.trim();
    const wonder = worldProfile.wonder.trim();
    const sound = worldProfile.sound.trim();
    const scent = worldProfile.scent.trim();
    const texture = worldProfile.texture.trim();
    if (name) lines.push(`World: ${name}`);
    if (mood) lines.push(`Mood: ${mood}`);
    if (truth) lines.push(`Founding Truth: ${truth}`);
    if (taboo) lines.push(`Taboo: ${taboo}`);
    if (worldProfile.pillars?.length) lines.push(`Pillars: ${worldProfile.pillars.join(', ')}`);
    if (worldProfile.regions?.length) lines.push(`Regions: ${worldProfile.regions.join(', ')}`);
    if (worldProfile.factions?.length) lines.push(`Factions: ${worldProfile.factions.join(', ')}`);
    if (worldProfile.laws?.length) lines.push(`Laws: ${worldProfile.laws.join(', ')}`);
    if (era) lines.push(`Era: ${era}`);
    if (conflict) lines.push(`Conflict: ${conflict}`);
    if (wonder) lines.push(`Wonder: ${wonder}`);
    if (sound || scent || texture) {
      lines.push(
        `Sensory: ${sound || 'Sound'}${scent ? ` • ${scent}` : ''}${texture ? ` • ${texture}` : ''}`
      );
    }
    if (sceneGoal.trim() || sceneRisk.trim()) {
      lines.push(
        `Scene Lens: ${sceneGoal.trim() || 'Untitled'}${sceneRisk.trim() ? ` | Stakes: ${sceneRisk.trim()}` : ''}`
      );
    }
    if (anchors.length) lines.push(`Anchors: ${anchors.join(', ')}`);
    if (activeBeat?.label) lines.push(`Beat: ${activeBeat.label}`);
    return lines.join('\n').trim();
  }, [
    worldProfile.worldName,
    worldProfile.mood,
    worldProfile.truth,
    worldProfile.taboo,
    worldProfile.era,
    worldProfile.conflict,
    worldProfile.wonder,
    worldProfile.sound,
    worldProfile.scent,
    worldProfile.texture,
    worldProfile.pillars,
    worldProfile.regions,
    worldProfile.factions,
    worldProfile.laws,
    sceneGoal,
    sceneRisk,
    anchors,
    activeBeat
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.render_game_to_text = () => {
      const payload = {
        mode: 'arenaConsole',
        sessionId,
        phase: sessionState.phase,
        beat: activeBeat?.label || 'Arrival',
        focusPlayer: focusPlayerLabel,
        turnHolder: currentTurnLabel,
        intent: sessionState.intent || '',
        world: {
          name: worldProfile.worldName,
          mood: worldProfile.mood,
          truth: worldProfile.truth,
          taboo: worldProfile.taboo,
          pillars: worldProfile.pillars || [],
          atlas: {
            regions: worldProfile.regions || [],
            factions: worldProfile.factions || [],
            laws: worldProfile.laws || []
          },
          frame: {
            era: worldProfile.era,
            conflict: worldProfile.conflict,
            wonder: worldProfile.wonder
          },
          sensory: {
            sound: worldProfile.sound,
            scent: worldProfile.scent,
            texture: worldProfile.texture
          }
        },
        anchors,
        flow: {
          step: currentFlowStep?.title || '',
          immersionScore,
          mode: flowGuidance.modeLabel,
          next: flowGuidance.next,
          primer: immersionPrimer,
          loop: {
            lastAction: sessionState.lastFlowAction?.label || '',
            lastBy: sessionState.lastFlowAction?.by || '',
            lastAt: sessionState.lastFlowAction?.at || ''
          },
          gate: {
            charter: immersionGate.charter,
            anchors: immersionGate.anchors,
            lens: immersionGate.lens,
            intent: immersionGate.intent,
            ready: immersionGate.ready,
            ritual: immersionGate.ritual
          },
          recommendation: flowRecommendation.title
        },
        sceneLens: {
          goal: sceneGoal,
          stakes: sceneRisk
        },
        threads: threads.map((thread) => ({ label: thread.label, heat: thread.heat || 0 })),
        ledger: ledgerEntries.slice(-6).map((entry) => ({
          type: entry.type,
          text: entry.text,
          by: entry.by || ''
        })),
        pulse: {
          momentum: pulse.momentum,
          clarity: pulse.clarity
        },
        mechanics: {
          ritualActive,
          sceneClock,
          sceneClockLabel,
          turnActionsLeft: currentTurnActions,
          vows: {
            active: activeVows.map((vow) => vow.label),
            hush: Boolean(vows.hush),
            anchor: Boolean(vows.anchor),
            pact: Boolean(vows.pact)
          },
          collab: {
            lastAction: sessionState.lastCollabMove?.label || '',
            lastBy: sessionState.lastCollabMove?.by || '',
            lastAt: sessionState.lastCollabMove?.at || ''
          },
          spotlight: {
            player: spotlightLabel,
            tokens: spotlightTokens
          },
          beatSync: {
            beat: activeBeat?.label || 'Arrival',
            votes: beatSyncVotes,
            required: beatSyncRequired,
            synced: beatSyncReady,
            lastSync: {
              beat: sessionState.lastBeatSync?.label || '',
              by: sessionState.lastBeatSync?.by || '',
              at: sessionState.lastBeatSync?.at || ''
            }
          },
          resonance: {
            pending: resonancePending,
            cue: resonanceCue,
            caller: resonanceCallerLabel,
            answeredBy: resonanceAnswerLabel,
            streak: resonanceStreak
          }
        },
        roster: players.slice(0, playersCount).map((player, index) => ({
          key: getPlayerKey(player, index),
          label: player.label || player.id || `Player ${index + 1}`,
          ready: Boolean(sessionState.readyMap?.[getPlayerKey(player, index)]),
          focused: getPlayerKey(player, index) === focusPlayerKey,
          turn: getPlayerKey(player, index) === currentTurnKey,
          tokens: getPresenceTokenCount(getPlayerKey(player, index))
        }))
      };
      return JSON.stringify(payload);
    };
    window.advanceTime = () => {};
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [
    sessionId,
    sessionState.phase,
    sessionState.intent,
    sessionState.readyMap,
    sessionState.lastCollabMove,
    focusPlayerLabel,
    currentTurnLabel,
    currentTurnKey,
    focusPlayerKey,
    worldProfile,
    activeBeat,
    currentFlowStep,
    immersionScore,
    flowGuidance,
    flowRecommendation,
    immersionGate,
    ledgerEntries,
    anchors,
    pulse,
    ritualActive,
    sceneClock,
    sceneClockLabel,
    currentTurnActions,
    players,
    playersCount,
    activeBeatId,
    beatSyncVotes,
    beatSyncRequired,
    beatSyncReady,
    vows,
    activeVows,
    sceneGoal,
    sceneRisk,
    threads,
    sessionState.lastFlowAction,
    sessionState.lastBeatSync,
    resonancePending,
    resonanceCue,
    resonanceCallerLabel,
    resonanceAnswerLabel,
    resonanceStreak,
    immersionPrimer,
    spotlightLabel,
    spotlightTokens,
    presenceTokens,
    beatVotes
  ]);

  useEffect(() => {
    if (!baseUrl || !sessionId.trim()) return;
    let isActive = true;
    const loadPlayers = async () => {
      try {
        const payload = await fetchSessionPlayers(baseUrl, sessionId.trim(), {
          mockApiCalls: MOCK_API_CALLS
        });
        const list = Array.isArray(payload?.players) ? payload.players : [];
        if (!isActive) return;
        if (!list.length) return;
        setPlayers((prev) => {
          const next = prev.slice(0, Math.max(list.length, 1));
          if (next.length < list.length) {
            for (let index = next.length; index < list.length; index += 1) {
              next.push(createPlayerState(index));
            }
          }
          return next.map((player, index) => {
            const item = list[index];
            if (!item) return player;
            return {
              ...player,
              id: item.playerId || item.id || player.id,
              label: item.playerName || player.label
            };
          });
        });
        setPlayersCount((prev) => Math.max(prev, list.length));
      } catch (err) {
        if (isActive) {
          setNotice('Unable to fetch session players.');
        }
      }
    };
    loadPlayers();
    return () => {
      isActive = false;
    };
  }, [baseUrl, sessionId]);

  // Auto-load arena state on session change for multiplayer sync
  useEffect(() => {
    if (!baseUrl || !sessionId.trim()) return;
    let isActive = true;
    const loadArenaState = async () => {
      try {
        const payload = await requestJson(
          `/api/sessions/${encodeURIComponent(sessionId.trim())}/arena${buildQuery({
            playerId: activePlayerId || 'observer',
            mock_api_calls: MOCK_API_CALLS
          })}`
        );
        if (!isActive) return;
        const arena = payload?.arena || payload || {};
        // Merge card definitions and instances from server
        if (arena.cardDefinitions) {
          setCardDefinitions((prev) => ({ ...prev, ...arena.cardDefinitions }));
        }
        if (arena.cardInstances) {
          setCardInstances((prev) => ({ ...prev, ...arena.cardInstances }));
        }
        // Update arena state if available
        if (arena.edges && arena.center) {
          setArenaState((prev) => ({
            ...prev,
            edges: { ...prev.edges, ...arena.edges },
            center: arena.center.length ? arena.center : prev.center
          }));
        }

        // Load edges if available
        if (Array.isArray(arena.graphEdges)) {
          setArenaEdges(arena.graphEdges);
        }
      } catch (err) {
        // Silent fail for initial load - arena may not exist yet
      }
    };

    // Also fetch using new Arena State API (Phase 6)
    const loadArenaStateFull = async () => {
      if (!sessionId || !activePlayerId) return;
      try {
        const state = await fetchArenaState(sessionId, activePlayerId, baseUrl, {
          mockApiCalls: MOCK_API_CALLS
        });
        if (state && state.edges) {
          setArenaEdges(state.edges);
        }
        if (state && state.scores) {
          // Merge scores into player objects
          setPlayers(prev => prev.map(p => ({
            ...p,
            score: state.scores[p.id] || p.score || 0
          })));
        }
      } catch (err) {
        console.warn('Failed to fetch full arena state', err);
      }
    };

    loadArenaState();
    loadArenaStateFull();

    return () => {
      isActive = false;
    };
  }, [baseUrl, sessionId, activePlayerId]);

  const updatePlayerAt = (index, updater) => {
    setPlayers((prev) => prev.map((player, idx) => (idx === index ? updater(player) : player)));
  };

  const requestJson = async (path, options) => {
    const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error || payload?.message || 'Request failed.';
      throw new Error(message);
    }
    return payload;
  };

  const getPlayerIdForRequest = (playerIndex, player) => {
    const playerId = player?.id?.trim();
    if (!playerId) {
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        error: 'Set a player ID before making requests.'
      }));
      return null;
    }
    return playerId;
  };

  const createInstanceId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `instance-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  };

  const mergeCardDefinition = (card, index) => {
    const entityId = card?.entityId || card?.entity_id || card?.id || card?.name || `entity-${index}`;
    const entityName = card?.entityName || card?.name || `Entity ${index + 1}`;
    return {
      entityId,
      entityName,
      ...card
    };
  };

  const handleTextToEntity = async () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const currentSpread = activeSpread || spreadPresets[0];
    const playerId = getPlayerIdForRequest(playerIndex, player);
    if (!playerId) return;
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    const requestPayload = {
      sessionId,
      playerId,
      text: player.fragmentText,
      includeCards: player.includeCards,
      includeFront: player.includeFront,
      includeBack: player.includeBack,
      mock_api_calls: MOCK_API_CALLS
    };
    try {
      const payload = await requestJson('/api/textToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      const nextCards = clampCards(payload?.cards || []);
      const definitions = {};
      const instances = {};
      const instanceIds = nextCards.map((card, index) => {
        const definition = mergeCardDefinition(card, index);
        definitions[definition.entityId] = definition;
        const instanceId = createInstanceId();
        instances[instanceId] = {
          instanceId,
          entityId: definition.entityId,
          ownerPlayerId: playerId,
          faceUp: true
        };
        return instanceId;
      });
      setCardDefinitions((prev) => ({ ...prev, ...definitions }));
      setCardInstances((prev) => ({ ...prev, ...instances }));
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        deck: [...instanceIds, ...prev.deck],
        spreadSlots: createSpreadSlots(currentSpread),
        spreadSelected: {}
      }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleTextToStoryteller = async () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const playerId = getPlayerIdForRequest(playerIndex, player);
    if (!playerId) return;
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    const requestPayload = {
      sessionId,
      playerId,
      text: player.fragmentText,
      count: 3,
      generateKeyImages: false,
      mockImage: true,
      mock_api_calls: MOCK_API_CALLS
    };
    try {
      const payload = await requestJson('/api/textToStoryteller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      const list = clampCards(coerceStorytellers(payload), 8).map((storyteller, index) => ({
        id: storyteller.id || storyteller._id || storyteller.name || `storyteller-${index}`,
        name: storyteller.name || `Storyteller ${index + 1}`,
        iconUrl: storyteller.iconUrl || storyteller.icon_url || storyteller.portraitUrl || '',
        theme: storyteller.theme || pickThemeKey(storyteller, index),
        raw: storyteller
      }));
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        storyteller: {
          activeId: prev.storyteller.activeId || list[0]?.id || '',
          theme: prev.storyteller.theme || list[0]?.theme || '',
          list
        }
      }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleBlendWorldProfile = () => {
    const lines = [];
    if (worldProfile.worldName.trim()) lines.push(`World: ${worldProfile.worldName.trim()}`);
    if (worldProfile.mood.trim()) lines.push(`Mood: ${worldProfile.mood.trim()}`);
    if (worldProfile.truth.trim()) lines.push(`Founding truth: ${worldProfile.truth.trim()}`);
    if (worldProfile.taboo.trim()) lines.push(`Taboo: ${worldProfile.taboo.trim()}`);
    if (worldProfile.pillars?.length) lines.push(`Pillars: ${worldProfile.pillars.join(', ')}`);
    if (worldProfile.regions?.length) lines.push(`Regions: ${worldProfile.regions.join(', ')}`);
    if (worldProfile.factions?.length) lines.push(`Factions: ${worldProfile.factions.join(', ')}`);
    if (worldProfile.laws?.length) lines.push(`Laws: ${worldProfile.laws.join(', ')}`);
    if (!lines.length) {
      setNotice('Add world details before blending.');
      return;
    }
    updatePlayerAt(activePlayerIndex, (prev) => {
      const base = prev.fragmentText?.trim();
      const addition = lines.join(' | ');
      const nextText = base ? `${base}\n\n${addition}` : addition;
      return { ...prev, fragmentText: nextText };
    });
    setNotice('World charter blended into fragment.');
  };

  const handleToggleReady = (playerKey) => {
    setSessionState((prev) => ({
      ...prev,
      readyMap: { ...prev.readyMap, [playerKey]: !prev.readyMap?.[playerKey] }
    }));
  };

  const handleSetFocus = (playerKey, index) => {
    setSessionState((prev) => ({ ...prev, focusPlayerKey: playerKey }));
    if (typeof index === 'number') {
      setActivePlayerIndex(index);
    }
  };

  const handleAdvanceBeat = () => {
    const currentIndex = sceneBeats.findIndex((beat) => beat.id === activeBeat?.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sceneBeats.length;
    setSessionState((prev) => ({
      ...prev,
      beatId: sceneBeats[nextIndex].id,
      beatVotes: {},
      lastBeatSync: null
    }));
  };

  const handleToggleVow = (vowKey) => {
    const vow = VOW_DEFINITIONS.find((item) => item.id === vowKey);
    if (!vow) return;
    setSessionState((prev) => {
      const previousVows =
        prev.vows && typeof prev.vows === 'object' ? prev.vows : SESSION_STATE_DEFAULT.vows;
      const nextEnabled = !previousVows[vowKey];
      const entry = createLedgerEntry({
        type: 'oath',
        text: `${vow.label} vow ${nextEnabled ? 'invoked' : 'released'}.`,
        by: focusPlayerLabel || currentTurnLabel || 'Table'
      });
      return {
        ...prev,
        vows: { ...previousVows, [vowKey]: nextEnabled },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
      };
    });
    setNotice(`${vow.label} vow ${vows[vowKey] ? 'released' : 'invoked'}.`);
  };

  const handlePulseAdjust = (key, delta) => {
    setSessionState((prev) => {
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      return {
        ...prev,
        pulse: {
          ...nextPulse,
          [key]: clampPulseValue((nextPulse?.[key] ?? 2) + delta)
        }
      };
    });
  };

  const handleSceneClockAdjust = (delta) => {
    setSessionState((prev) => {
      const previous = Number.isFinite(Number(prev.sceneClock)) ? Number(prev.sceneClock) : 2;
      const next = clampSceneClockValue(previous + delta);
      if (next === previous) return prev;
      return { ...prev, sceneClock: next };
    });
  };

  const handleAddPillar = () => {
    const next = pillarInput.trim();
    if (!next) return;
    setWorldProfile((prev) => ({
      ...prev,
      pillars: [...(prev.pillars || []), next].slice(0, 6)
    }));
    setPillarInput('');
  };

  const handleRemovePillar = (index) => {
    setWorldProfile((prev) => ({
      ...prev,
      pillars: (prev.pillars || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleAddRegion = () => {
    const next = regionInput.trim();
    if (!next) return;
    setWorldProfile((prev) => ({
      ...prev,
      regions: [...(prev.regions || []), next].slice(0, 3)
    }));
    setRegionInput('');
  };

  const handleRemoveRegion = (index) => {
    setWorldProfile((prev) => ({
      ...prev,
      regions: (prev.regions || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleAddFaction = () => {
    const next = factionInput.trim();
    if (!next) return;
    setWorldProfile((prev) => ({
      ...prev,
      factions: [...(prev.factions || []), next].slice(0, 3)
    }));
    setFactionInput('');
  };

  const handleRemoveFaction = (index) => {
    setWorldProfile((prev) => ({
      ...prev,
      factions: (prev.factions || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleAddLaw = () => {
    const next = lawInput.trim();
    if (!next) return;
    setWorldProfile((prev) => ({
      ...prev,
      laws: [...(prev.laws || []), next].slice(0, 3)
    }));
    setLawInput('');
  };

  const handleRemoveLaw = (index) => {
    setWorldProfile((prev) => ({
      ...prev,
      laws: (prev.laws || []).filter((_, idx) => idx !== index)
    }));
  };

  const handleSetPhase = (phaseId) => {
    setSessionState((prev) => ({ ...prev, phase: phaseId }));
  };

  const handleSignal = (label) => {
    setSessionState((prev) => ({
      ...prev,
      lastSignal: { label, at: new Date().toISOString() }
    }));
    setNotice(`${label} signal sent.`);
  };

  const handleToggleDiveMode = () => {
    setSessionState((prev) => ({ ...prev, diveMode: !prev.diveMode }));
  };

  const createLedgerEntry = ({ type = 'canon', text, by = 'Table' }) => ({
    id: window.crypto?.randomUUID?.() || `ledger-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    type,
    text,
    by,
    at: new Date().toISOString()
  });

  const handleAddLedgerEntry = () => {
    const trimmed = ledgerText.trim();
    if (!trimmed) {
      setNotice('Add a ledger entry before committing.');
      return;
    }
    const entry = createLedgerEntry({
      type: ledgerType,
      text: trimmed,
      by: focusPlayerLabel || 'Table'
    });
    setSessionState((prev) => ({
      ...prev,
      ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
    }));
    setLedgerText('');
  };

  const handleAddAnchor = () => {
    const next = anchorInput.trim();
    if (!next) return;
    if (anchors.length >= 3) {
      setNotice('Anchor limit reached (3). Remove one to add another.');
      return;
    }
    setSessionState((prev) => {
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      const entry = createLedgerEntry({
        type: 'oath',
        text: `Anchor set: ${next}`,
        by: focusPlayerLabel || 'Table'
      });
      return {
        ...prev,
        anchors: [...(Array.isArray(prev.anchors) ? prev.anchors : []), next].slice(0, 3),
        pulse: {
          ...nextPulse,
          clarity: clampPulseValue((nextPulse?.clarity ?? 2) + 1)
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
      };
    });
    setAnchorInput('');
    setNotice('Anchor pinned to the table.');
  };

  const handleRemoveAnchor = (index) => {
    setSessionState((prev) => ({
      ...prev,
      anchors: (Array.isArray(prev.anchors) ? prev.anchors : []).filter((_, idx) => idx !== index)
    }));
  };

  const handleUpdateSceneLens = (key, value) => {
    setSessionState((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearSceneLens = () => {
    setSessionState((prev) => ({ ...prev, sceneGoal: '', sceneRisk: '' }));
  };

  const handleFlowLoopAction = (actionId) => {
    const action = FLOW_LOOP_ACTIONS.find((item) => item.id === actionId);
    if (!action) return;
    const actorLabel = focusPlayerLabel || currentTurnLabel || 'Table';
    setSessionState((prev) => {
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      const previousClockRaw = Number(prev.sceneClock);
      const previousClock = Number.isFinite(previousClockRaw) ? previousClockRaw : 2;
      const effect = applyVowModifiers(action.effects, prev.vows, {
        ritualActive: Boolean(prev.ritualActive)
      });
      const entry = createLedgerEntry({
        type: action.ledgerType,
        text: `${actorLabel} ${action.text}`,
        by: actorLabel
      });
      return {
        ...prev,
        pulse: {
          momentum: clampPulseValue((nextPulse?.momentum ?? 2) + effect.momentum),
          clarity: clampPulseValue((nextPulse?.clarity ?? 2) + effect.clarity)
        },
        sceneClock: clampSceneClockValue(previousClock + effect.sceneClock),
        lastFlowAction: {
          id: action.id,
          label: action.label,
          by: actorLabel,
          at: new Date().toISOString()
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
      };
    });
    if (action.id === 'invite') {
      handlePassFocus();
    }
    setNotice(`${action.label} logged to the ledger.`);
  };

  const handleCollabMove = (moveId) => {
    const move = COLLAB_MOVES.find((item) => item.id === moveId);
    if (!move) return;
    const actorLabel = focusPlayerLabel || currentTurnLabel || 'Table';
    setSessionState((prev) => {
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      const previousClockRaw = Number(prev.sceneClock);
      const previousClock = Number.isFinite(previousClockRaw) ? previousClockRaw : 2;
      const effect = applyVowModifiers(move.effects, prev.vows, {
        ritualActive: Boolean(prev.ritualActive)
      });
      const entry = createLedgerEntry({
        type: move.ledgerType,
        text: `${actorLabel} ${move.text}`,
        by: actorLabel
      });
      return {
        ...prev,
        pulse: {
          momentum: clampPulseValue((nextPulse?.momentum ?? 2) + effect.momentum),
          clarity: clampPulseValue((nextPulse?.clarity ?? 2) + effect.clarity)
        },
        sceneClock: clampSceneClockValue(previousClock + effect.sceneClock),
        lastCollabMove: {
          id: move.id,
          label: move.label,
          by: actorLabel,
          at: new Date().toISOString()
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
      };
    });
    setNotice(`${move.label} recorded as a co-creation beat.`);
  };

  const handleApplyImmersionPrimer = () => {
    const primer = immersionPrimer.trim();
    if (!primer) {
      setNotice('Build the primer from the charter and scene lens first.');
      return;
    }
    updatePlayerAt(activePlayerIndex, (prev) => {
      const existing = (prev.fragmentText || '').trim();
      const nextText = existing
        ? `${existing}\n\nImmersion Primer:\n${primer}`
        : `Immersion Primer:\n${primer}`;
      return { ...prev, fragmentText: nextText };
    });
    setNotice('Immersion primer sent to fragment.');
  };

  const handleSpotlightMove = (moveId) => {
    const move = SPOTLIGHT_MOVES.find((item) => item.id === moveId);
    if (!move) return;
    if (!spotlightKey) {
      setNotice('Set focus or turn holder to use spotlight moves.');
      return;
    }
    if (spotlightTokens <= 0) {
      setNotice('No spotlight tokens left. Refresh tokens to continue.');
      return;
    }
    const actorLabel = spotlightLabel || 'Table';
    setSessionState((prev) => {
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      const previousTokensRaw = Number(prev.presenceTokens?.[spotlightKey]);
      const previousTokens = Number.isFinite(previousTokensRaw)
        ? previousTokensRaw
        : PRESENCE_TOKEN_MAX;
      const nextTokens = Math.max(0, previousTokens - 1);
      const effect = applyVowModifiers(move.effects, prev.vows, {
        ritualActive: Boolean(prev.ritualActive)
      });
      const entry = createLedgerEntry({
        type: move.ledgerType,
        text: `${actorLabel} ${move.text}`,
        by: actorLabel
      });
      return {
        ...prev,
        presenceTokens: {
          ...(prev.presenceTokens || {}),
          [spotlightKey]: nextTokens
        },
        pulse: {
          momentum: clampPulseValue((nextPulse?.momentum ?? 2) + effect.momentum),
          clarity: clampPulseValue((nextPulse?.clarity ?? 2) + effect.clarity)
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
      };
    });
    setNotice(`${actorLabel}: ${move.label} logged.`);
  };

  const handleRefreshPresenceTokens = () => {
    const roster = players.slice(0, playersCount);
    if (!roster.length) return;
    const keys = roster.map((player, index) => getPlayerKey(player, index));
    setSessionState((prev) => {
      const refreshed = Object.fromEntries(keys.map((key) => [key, PRESENCE_TOKEN_MAX]));
      const entry = createLedgerEntry({
        type: 'oath',
        text: 'Table refreshes spotlight tokens.',
        by: 'Table'
      });
      return {
        ...prev,
        presenceTokens: {
          ...(prev.presenceTokens || {}),
          ...refreshed
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
      };
    });
    setNotice('Spotlight tokens refreshed.');
  };

  const createThread = (label) => ({
    id: window.crypto?.randomUUID?.() || `thread-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    label,
    heat: 0
  });

  const handleAddThread = () => {
    const next = threadInput.trim();
    if (!next) return;
    if (threads.length >= 3) {
      setNotice('Thread limit reached (3). Resolve one to add another.');
      return;
    }
    setSessionState((prev) => ({
      ...prev,
      threads: [...(Array.isArray(prev.threads) ? prev.threads : []), createThread(next)].slice(0, 3)
    }));
    setThreadInput('');
  };

  const handleAdvanceThread = (threadId) => {
    setSessionState((prev) => {
      const list = Array.isArray(prev.threads) ? prev.threads : [];
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      let ledgerEntry = null;
      const nextThreads = list.map((thread) => {
        if (thread.id !== threadId) return thread;
        const nextHeat = Math.min(3, (thread.heat || 0) + 1);
        if ((thread.heat || 0) < 3 && nextHeat === 3) {
          ledgerEntry = createLedgerEntry({
            type: 'mystery',
            text: `Thread flares: ${thread.label}`,
            by: focusPlayerLabel || 'Table'
          });
        }
        return { ...thread, heat: nextHeat };
      });
      return {
        ...prev,
        threads: nextThreads,
        pulse: ledgerEntry
          ? {
              ...nextPulse,
              momentum: clampPulseValue((nextPulse?.momentum ?? 2) + 1)
            }
          : nextPulse,
        ledger: ledgerEntry
          ? [...(Array.isArray(prev.ledger) ? prev.ledger : []), ledgerEntry].slice(-24)
          : prev.ledger
      };
    });
  };

  const handleCoolThread = (threadId) => {
    setSessionState((prev) => ({
      ...prev,
      threads: (Array.isArray(prev.threads) ? prev.threads : []).map((thread) =>
        thread.id === threadId ? { ...thread, heat: Math.max(0, (thread.heat || 0) - 1) } : thread
      )
    }));
  };

  const handleResolveThread = (threadId) => {
    setSessionState((prev) => {
      const list = Array.isArray(prev.threads) ? prev.threads : [];
      const match = list.find((thread) => thread.id === threadId);
      if (!match) return prev;
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      const ledgerEntry = createLedgerEntry({
        type: 'canon',
        text: `Thread resolved: ${match.label}`,
        by: focusPlayerLabel || 'Table'
      });
      return {
        ...prev,
        threads: list.filter((thread) => thread.id !== threadId),
        pulse: {
          ...nextPulse,
          clarity: clampPulseValue((nextPulse?.clarity ?? 2) + 1)
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), ledgerEntry].slice(-24)
      };
    });
  };

  const handleRemoveLedgerEntry = (entryId) => {
    setSessionState((prev) => ({
      ...prev,
      ledger: (Array.isArray(prev.ledger) ? prev.ledger : []).filter((entry) => entry.id !== entryId)
    }));
  };

  const handleEchoLedgerEntry = (entry) => {
    if (!entry?.text) return;
    updatePlayerAt(activePlayerIndex, (prev) => {
      const existing = (prev.fragmentText || '').trim();
      const nextText = existing ? `${existing} ${entry.text}` : entry.text;
      return { ...prev, fragmentText: nextText };
    });
    setNotice('Ledger echo added to fragment.');
  };

  const handleBuildTurnOrder = (mode = 'ready') => {
    const roster = players.slice(0, playersCount);
    const keys = roster.map((player, index) => getPlayerKey(player, index));
    const readyKeys = keys.filter((key) => sessionState.readyMap?.[key]);
    const nextOrder = mode === 'ready' && readyKeys.length ? readyKeys : keys;
    setSessionState((prev) => ({
      ...prev,
      turnOrder: nextOrder,
      turnIndex: 0,
      actionBank: createActionBank(nextOrder)
    }));
  };

  const handleVoteCurrentBeat = () => {
    if (!activeBeatId) return;
    const fallbackKey = getPlayerKey(activePlayer, activePlayerIndex);
    const voterKey = focusPlayerKey || currentTurnKey || fallbackKey;
    if (!voterKey) {
      setNotice('Set focus or turn holder before voting beat sync.');
      return;
    }
    const voterLabel = getPlayerLabelByKey(voterKey, 'Table');
    setSessionState((prev) => {
      const nextVotes = {
        ...(prev.beatVotes && typeof prev.beatVotes === 'object' ? prev.beatVotes : {}),
        [voterKey]: activeBeatId
      };
      const rosterKeys = players
        .slice(0, playersCount)
        .map((player, index) => getPlayerKey(player, index));
      const readyKeys = rosterKeys.filter((playerKey) => prev.readyMap?.[playerKey]);
      const requiredKeys = readyKeys.length ? readyKeys : rosterKeys;
      const syncedVotes = requiredKeys.filter((playerKey) => nextVotes[playerKey] === activeBeatId).length;
      const isSynced = requiredKeys.length > 0 && syncedVotes >= requiredKeys.length;
      const alreadySynced = prev.lastBeatSync?.beatId === activeBeatId;
      if (isSynced && !alreadySynced) {
        const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
        const entry = createLedgerEntry({
          type: 'canon',
          text: `Beat sync achieved: ${activeBeat?.label || 'Arrival'}.`,
          by: 'Table'
        });
        return {
          ...prev,
          beatVotes: nextVotes,
          lastBeatSync: {
            beatId: activeBeatId,
            label: activeBeat?.label || 'Arrival',
            by: voterLabel,
            at: new Date().toISOString()
          },
          pulse: {
            momentum: clampPulseValue((nextPulse?.momentum ?? 2) + 1),
            clarity: clampPulseValue((nextPulse?.clarity ?? 2) + 1)
          },
          ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
        };
      }
      return {
        ...prev,
        beatVotes: nextVotes
      };
    });
    setNotice(`${voterLabel} votes to lock ${activeBeat?.label || 'Arrival'}.`);
  };

  const handleClearBeatVotes = () => {
    setSessionState((prev) => ({ ...prev, beatVotes: {}, lastBeatSync: null }));
    setNotice('Beat sync votes cleared.');
  };

  const handleAdvanceTurn = () => {
    if (!turnOrder.length) {
      setNotice('Build turn order first.');
      return;
    }
    setSessionState((prev) => {
      const order = Array.isArray(prev.turnOrder) ? prev.turnOrder : [];
      if (!order.length) return prev;
      const nextIndex = (prev.turnIndex + 1) % order.length;
      const nextKey = order[nextIndex];
      return {
        ...prev,
        turnIndex: nextIndex,
        actionBank: {
          ...(prev.actionBank || {}),
          ...(nextKey ? { [nextKey]: TURN_ACTIONS_PER_TURN } : {})
        }
      };
    });
  };

  const handleStartRitual = () => {
    if (!flowSteps.find((step) => step.id === 'charter')?.done) {
      setNotice('Complete the World Charter before starting ritual mode.');
      scrollToFlowStep('charter');
      return;
    }
    const roster = players.slice(0, playersCount);
    if (!roster.length) {
      setNotice('No players available.');
      return;
    }
    const keys = roster.map((player, index) => getPlayerKey(player, index));
    const readyKeys = keys.filter((key) => sessionState.readyMap?.[key]);
    const nextOrder = readyKeys.length ? readyKeys : keys;
    const firstKey = nextOrder[0] || '';
    const firstIndex = roster.findIndex((player, index) => getPlayerKey(player, index) === firstKey);
    setSessionState((prev) => {
      const tableIntent = (prev.intent || '').trim();
      const ritualEntry = createLedgerEntry({
        type: 'oath',
        text: `Ritual opened on ${activeBeat?.label || 'Arrival'}.${
          tableIntent ? ` Shared intent: ${tableIntent}` : ''
        }`,
        by: getPlayerLabelByKey(firstKey, 'Table')
      });
      return {
        ...prev,
        ritualActive: true,
        diveMode: true,
        phase: 'immersion',
        turnOrder: nextOrder,
        turnIndex: 0,
        focusPlayerKey: firstKey || prev.focusPlayerKey,
        actionBank: createActionBank(nextOrder),
        beatVotes: {},
        lastBeatSync: null,
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), ritualEntry].slice(-24)
      };
    });
    if (firstIndex >= 0) {
      setActivePlayerIndex(firstIndex);
    }
    setNotice('Ritual started. Table is in immersion mode.');
  };

  const handleEndRitual = () => {
    setSessionState((prev) => {
      const ritualEntry = createLedgerEntry({
        type: 'oath',
        text: 'Ritual closed. Table returns to worldbuild calibration.',
        by: 'Table'
      });
      return {
        ...prev,
        ritualActive: false,
        diveMode: false,
        phase: 'worldbuild',
        actionBank: {},
        beatVotes: {},
        lastBeatSync: null,
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), ritualEntry].slice(-24)
      };
    });
    setNotice('Ritual ended. Back to worldbuild mode.');
  };

  const handleApplyTurnMove = (moveId) => {
    const move = TURN_MOVE_DEFINITIONS.find((item) => item.id === moveId);
    if (!move) return;
    if (!ritualActive) {
      setNotice('Start ritual mode before using turn moves.');
      return;
    }
    if (!currentTurnKey) {
      setNotice('Build turn order to assign a turn holder.');
      return;
    }
    if (currentTurnActions <= 0) {
      setNotice('No actions left. Advance turn.');
      return;
    }
    const actorLabel = getPlayerLabelByKey(currentTurnKey, currentTurnKey || 'Table');
    setSessionState((prev) => {
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      const previousClockRaw = Number(prev.sceneClock);
      const previousClock = Number.isFinite(previousClockRaw) ? previousClockRaw : 2;
      const previousActionsRaw = Number(prev.actionBank?.[currentTurnKey]);
      const previousActions = Number.isFinite(previousActionsRaw)
        ? previousActionsRaw
        : TURN_ACTIONS_PER_TURN;
      const nextActions = Math.max(0, previousActions - 1);
      const effect = applyVowModifiers(move.effects, prev.vows, {
        ritualActive: Boolean(prev.ritualActive)
      });
      const nextEntry = createLedgerEntry({
        type: move.ledgerType,
        text: `${actorLabel} ${move.text}`,
        by: actorLabel
      });
      return {
        ...prev,
        pulse: {
          momentum: clampPulseValue((nextPulse?.momentum ?? 2) + effect.momentum),
          clarity: clampPulseValue((nextPulse?.clarity ?? 2) + effect.clarity)
        },
        sceneClock: clampSceneClockValue(previousClock + effect.sceneClock),
        actionBank: {
          ...(prev.actionBank || {}),
          [currentTurnKey]: nextActions
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), nextEntry].slice(-24)
      };
    });
    setNotice(`${actorLabel}: ${move.label}. ${Math.max(0, currentTurnActions - 1)} actions left.`);
  };

  const handleFocusTurn = () => {
    if (!currentTurnKey) return;
    const roster = players.slice(0, playersCount);
    const turnIndex = roster.findIndex(
      (player, index) => getPlayerKey(player, index) === currentTurnKey
    );
    handleSetFocus(currentTurnKey, turnIndex === -1 ? undefined : turnIndex);
  };

  const handlePassFocus = () => {
    const roster = players.slice(0, playersCount);
    if (!roster.length) return;
    const order = turnOrder.length
      ? turnOrder
      : roster.map((player, index) => getPlayerKey(player, index));
    if (!order.length) return;
    const currentKey = order.includes(focusPlayerKey) ? focusPlayerKey : order[0];
    const currentIndex = order.indexOf(currentKey);
    const nextKey = order[(currentIndex + 1) % order.length];
    const nextPlayerIndex = roster.findIndex(
      (player, index) => getPlayerKey(player, index) === nextKey
    );
    handleSetFocus(nextKey, nextPlayerIndex === -1 ? undefined : nextPlayerIndex);
    setNotice(`Spotlight passed to ${getPlayerLabelByKey(nextKey, 'Table')}.`);
  };

  const handleStartResonance = () => {
    const cue = resonanceInput.trim();
    if (!cue) {
      setNotice('Write a short resonance cue before calling.');
      return;
    }
    const fallbackKey = getPlayerKey(activePlayer, activePlayerIndex);
    const callerKey = focusPlayerKey || currentTurnKey || fallbackKey;
    if (!callerKey) {
      setNotice('Set focus or turn holder before starting a resonance call.');
      return;
    }
    const callerLabel = getPlayerLabelByKey(callerKey, 'Table');
    setSessionState((prev) => {
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      const entry = createLedgerEntry({
        type: 'oath',
        text: `${callerLabel} calls resonance: "${cue}"`,
        by: callerLabel
      });
      return {
        ...prev,
        pulse: {
          ...nextPulse,
          clarity: clampPulseValue((nextPulse?.clarity ?? 2) + 1)
        },
        resonance: {
          pending: true,
          cue,
          calledByKey: callerKey,
          answeredByKey: '',
          streak: Math.max(0, Number(prev.resonance?.streak) || 0),
          at: new Date().toISOString()
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
      };
    });
    setResonanceInput('');
    setNotice(`${callerLabel} opens a resonance call.`);
  };

  const handleAnswerResonance = () => {
    if (!resonancePending || !resonanceCue) {
      setNotice('No open resonance call to answer.');
      return;
    }
    const fallbackKey = getPlayerKey(activePlayer, activePlayerIndex);
    const responderKey = focusPlayerKey || currentTurnKey || fallbackKey;
    if (!responderKey) {
      setNotice('Set focus or turn holder before answering resonance.');
      return;
    }
    if (responderKey === resonanceCallerKey) {
      setNotice('A different seat must answer this resonance call.');
      return;
    }
    const responderLabel = getPlayerLabelByKey(responderKey, 'Table');
    setSessionState((prev) => {
      const nextPulse = prev.pulse || { momentum: 2, clarity: 2 };
      const previousClockRaw = Number(prev.sceneClock);
      const previousClock = Number.isFinite(previousClockRaw) ? previousClockRaw : 2;
      const effect = applyVowModifiers(
        { momentum: 1, clarity: 1, sceneClock: -1 },
        prev.vows,
        { ritualActive: Boolean(prev.ritualActive) }
      );
      const nextStreak = Math.max(0, Number(prev.resonance?.streak) || 0) + 1;
      const entry = createLedgerEntry({
        type: 'canon',
        text: `${responderLabel} answers resonance "${prev.resonance?.cue || resonanceCue}".`,
        by: responderLabel
      });
      const nextActionBank =
        prev.ritualActive && currentTurnKey
          ? {
              ...(prev.actionBank || {}),
              [currentTurnKey]: Math.min(
                TURN_ACTIONS_PER_TURN + 1,
                (Number(prev.actionBank?.[currentTurnKey]) || TURN_ACTIONS_PER_TURN) + 1
              )
            }
          : prev.actionBank;
      return {
        ...prev,
        pulse: {
          momentum: clampPulseValue((nextPulse?.momentum ?? 2) + effect.momentum),
          clarity: clampPulseValue((nextPulse?.clarity ?? 2) + effect.clarity)
        },
        sceneClock: clampSceneClockValue(previousClock + effect.sceneClock),
        actionBank: nextActionBank,
        resonance: {
          pending: false,
          cue: prev.resonance?.cue || resonanceCue,
          calledByKey: prev.resonance?.calledByKey || resonanceCallerKey,
          answeredByKey: responderKey,
          streak: nextStreak,
          at: new Date().toISOString()
        },
        ledger: [...(Array.isArray(prev.ledger) ? prev.ledger : []), entry].slice(-24)
      };
    });
    setNotice(`${responderLabel} answers the resonance call.`);
  };

  const handleClearResonance = () => {
    setSessionState((prev) => ({
      ...prev,
      resonance: {
        pending: false,
        cue: '',
        calledByKey: '',
        answeredByKey: '',
        streak: 0,
        at: ''
      }
    }));
    setResonanceInput('');
    setNotice('Resonance channel reset.');
  };

  const formattedSignalTime = (() => {
    if (!sessionState.lastSignal?.at || typeof window === 'undefined') return '';
    const time = new Date(sessionState.lastSignal.at);
    if (Number.isNaN(time.getTime())) return '';
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  const formattedFlowTime = (() => {
    if (!sessionState.lastFlowAction?.at || typeof window === 'undefined') return '';
    const time = new Date(sessionState.lastFlowAction.at);
    if (Number.isNaN(time.getTime())) return '';
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  })();

  const diveBrief = useMemo(() => {
    if (!hasWorldCharter) return '';
    const lines = [];
    const trimmedName = worldProfile.worldName.trim();
    const trimmedMood = worldProfile.mood.trim();
    const trimmedTruth = worldProfile.truth.trim();
    const trimmedTaboo = worldProfile.taboo.trim();
    const trimmedEra = worldProfile.era.trim();
    const trimmedConflict = worldProfile.conflict.trim();
    const trimmedWonder = worldProfile.wonder.trim();
    const trimmedSound = worldProfile.sound.trim();
    const trimmedScent = worldProfile.scent.trim();
    const trimmedTexture = worldProfile.texture.trim();
    if (trimmedName) lines.push(`World: ${trimmedName}`);
    if (trimmedMood) lines.push(`Mood: ${trimmedMood}`);
    if (trimmedTruth) lines.push(`Founding truth: ${trimmedTruth}`);
    if (trimmedTaboo) lines.push(`Taboo: ${trimmedTaboo}`);
    if (worldProfile.pillars?.length) lines.push(`Pillars: ${worldProfile.pillars.join(', ')}`);
    if (worldProfile.regions?.length) lines.push(`Regions: ${worldProfile.regions.join(', ')}`);
    if (worldProfile.factions?.length) lines.push(`Factions: ${worldProfile.factions.join(', ')}`);
    if (worldProfile.laws?.length) lines.push(`Laws: ${worldProfile.laws.join(', ')}`);
    if (trimmedEra) lines.push(`Era: ${trimmedEra}`);
    if (trimmedConflict) lines.push(`Conflict: ${trimmedConflict}`);
    if (trimmedWonder) lines.push(`Wonder: ${trimmedWonder}`);
    if (trimmedSound || trimmedScent || trimmedTexture) {
      lines.push(
        `Sensory: ${trimmedSound || 'Sound'}${trimmedScent ? ` • ${trimmedScent}` : ''}${
          trimmedTexture ? ` • ${trimmedTexture}` : ''
        }`
      );
    }
    if (sessionState.intent?.trim()) lines.push(`Shared intent: ${sessionState.intent.trim()}`);
    if (sceneGoal.trim()) lines.push(`Scene goal: ${sceneGoal.trim()}`);
    if (sceneRisk.trim()) lines.push(`Stakes: ${sceneRisk.trim()}`);
    if (anchors.length) lines.push(`Anchors: ${anchors.join(' • ')}`);
    const latestEntry = ledgerEntries[ledgerEntries.length - 1];
    if (latestEntry?.text) lines.push(`Latest canon: ${latestEntry.text}`);
    lines.push(`Scene beat: ${activeBeat?.label || 'Arrival'}`);
    return lines.join('\n');
  }, [
    worldProfile.worldName,
    worldProfile.mood,
    worldProfile.truth,
    worldProfile.taboo,
    worldProfile.era,
    worldProfile.conflict,
    worldProfile.wonder,
    worldProfile.sound,
    worldProfile.scent,
    worldProfile.texture,
    worldProfile.pillars,
    worldProfile.regions,
    worldProfile.factions,
    worldProfile.laws,
    sessionState.intent,
    sceneGoal,
    sceneRisk,
    anchors,
    ledgerEntries,
    activeBeat,
    hasWorldCharter
  ]);

  const handleApplyDiveBrief = () => {
    if (!hasWorldCharter) {
      setNotice('Craft the world charter before generating a dive brief.');
      return;
    }
    updatePlayerAt(activePlayerIndex, (prev) => {
      const base = prev.fragmentText?.trim();
      const nextText = base ? `${base}\n\n${diveBrief}` : diveBrief;
      return { ...prev, fragmentText: nextText };
    });
    setNotice('Dive brief added to fragment.');
  };

  const handleAddPromptToFragment = () => {
    if (!selectedPrompt?.text) return;
    updatePlayerAt(activePlayerIndex, (prev) => {
      const base = prev.fragmentText?.trim();
      const nextText = base ? `${base}\n\n${selectedPrompt.text}` : selectedPrompt.text;
      return { ...prev, fragmentText: nextText };
    });
    setNotice('Immersion prompt blended into fragment.');
  };

  const handleSpreadChange = (spreadId) => {
    updatePlayerAt(activePlayerIndex, (prev) => ({
      ...prev,
      spreadId,
      spreadSlots: createSpreadSlots(getSpreadById(spreadId)),
      spreadSelected: {}
    }));
  };

  const handleDrawFromDeck = () => {
    updatePlayerAt(activePlayerIndex, (prev) => {
      if (!prev.deck.length) {
        setNotice('Deck is empty.');
        return prev;
      }
      const openSlots = prev.spreadSlots.filter((slot) => !slot.cardInstanceId);
      if (!openSlots.length) {
        setNotice('No open spread slot.');
        return prev;
      }
      const drawCount = Math.min(openSlots.length, prev.deck.length);
      const drawnCards = prev.deck.slice(0, drawCount);
      let drawIndex = 0;
      const nextSlots = prev.spreadSlots.map((slot) => {
        if (slot.cardInstanceId || drawIndex >= drawnCards.length) return slot;
        const nextCardId = drawnCards[drawIndex];
        drawIndex += 1;
        return { ...slot, cardInstanceId: nextCardId };
      });
      return { ...prev, deck: prev.deck.slice(drawCount), spreadSlots: nextSlots };
    });
  };

  const handleToggleDeckCardSelect = (instanceId) => {
    setSelectedDeckCards((prev) => ({
      ...prev,
      [instanceId]: !prev[instanceId]
    }));
  };

  const handleDrawSelectedFromGallery = () => {
    const selectedIds = Object.entries(selectedDeckCards)
      .filter(([, selected]) => selected)
      .map(([id]) => id);
    if (!selectedIds.length) {
      setNotice('Select cards from the gallery first.');
      return;
    }
    updatePlayerAt(activePlayerIndex, (prev) => {
      const openSlots = prev.spreadSlots.filter((slot) => !slot.cardInstanceId);
      if (!openSlots.length) {
        setNotice('No open spread slot.');
        return prev;
      }
      const cardsToDraw = selectedIds.filter((id) => prev.deck.includes(id));
      const drawCount = Math.min(openSlots.length, cardsToDraw.length);
      const drawnCards = cardsToDraw.slice(0, drawCount);
      let drawIndex = 0;
      const nextSlots = prev.spreadSlots.map((slot) => {
        if (slot.cardInstanceId || drawIndex >= drawnCards.length) return slot;
        const nextCardId = drawnCards[drawIndex];
        drawIndex += 1;
        return { ...slot, cardInstanceId: nextCardId };
      });
      const remainingDeck = prev.deck.filter((id) => !drawnCards.includes(id));
      return { ...prev, deck: remainingDeck, spreadSlots: nextSlots };
    });
    setSelectedDeckCards({});
  };


  const handleReturnToDeck = (slotId) => {
    updatePlayerAt(activePlayerIndex, (prev) => {
      const slot = prev.spreadSlots.find((item) => item.slotId === slotId);
      if (!slot?.cardInstanceId) return prev;
      const nextSlots = prev.spreadSlots.map((item) =>
        item.slotId === slotId ? { ...item, cardInstanceId: null } : item
      );
      return {
        ...prev,
        deck: [slot.cardInstanceId, ...prev.deck],
        spreadSlots: nextSlots,
        spreadSelected: { ...prev.spreadSelected, [slotId]: false }
      };
    });
  };

  const handleToggleSpreadSelect = (slotId) => {
    updatePlayerAt(activePlayerIndex, (prev) => ({
      ...prev,
      spreadSelected: {
        ...prev.spreadSelected,
        [slotId]: !prev.spreadSelected?.[slotId]
      }
    }));
  };

  const handleToggleCardFace = (instanceId) => {
    setCardInstances((prev) => {
      const next = { ...prev };
      if (!next[instanceId]) return prev;
      next[instanceId] = {
        ...next[instanceId],
        faceUp: !next[instanceId].faceUp
      };
      return next;
    });
  };

  const selectedSpreadSlots = activePlayer?.spreadSlots?.filter(
    (slot) => slot.cardInstanceId && activePlayer.spreadSelected?.[slot.slotId]
  );

  const placeSelectedCards = (target) => {
    if (!selectedSpreadSlots?.length) {
      setNotice('Select cards in your spread first.');
      return;
    }
    if (target === 'edge' && selectedSpreadSlots.length > 3) {
      setNotice('Only 3 cards can be placed on your edge at once.');
      return;
    }
    if (target === 'center' && selectedSpreadSlots.length > 6) {
      setNotice('Only 6 cards can be placed in the center at once.');
      return;
    }
    setArenaState((prev) => {
      const next = { ...prev, edges: { ...prev.edges }, center: prev.center.map((slot) => ({ ...slot })) };
      const destinationSlots =
        target === 'center' ? next.center : next.edges.south?.map((slot) => ({ ...slot })) || [];
      const emptySlots = destinationSlots.filter((slot) => !slot.cardInstanceId);
      if (emptySlots.length < selectedSpreadSlots.length) {
        setNotice('Not enough open slots in the arena.');
        return prev;
      }
      selectedSpreadSlots.forEach((slot, index) => {
        const targetSlot = emptySlots[index];
        targetSlot.cardInstanceId = slot.cardInstanceId;
        targetSlot.ownerPlayerId = activePlayerId;
      });
      if (target === 'center') {
        next.center = destinationSlots;
      } else {
        next.edges.south = destinationSlots;
      }
      return next;
    });

    updatePlayerAt(activePlayerIndex, (prev) => {
      const selectedIds = new Set(selectedSpreadSlots.map((slot) => slot.slotId));
      return {
        ...prev,
        spreadSlots: prev.spreadSlots.map((slot) =>
          selectedIds.has(slot.slotId) ? { ...slot, cardInstanceId: null } : slot
        ),
        spreadSelected: {}
      };
    });
  };

  const handleSaveArena = async () => {
    if (!sessionId.trim()) {
      setNotice('Set a session ID before saving the arena.');
      return;
    }
    if (!activePlayerId) {
      setNotice('Set a player ID before saving the arena.');
      return;
    }
    try {
      const arenaInstanceIds = [
        ...arenaState.center.map((slot) => slot.cardInstanceId).filter(Boolean),
        ...Object.values(arenaState.edges)
          .flatMap((slots) => slots.map((slot) => slot.cardInstanceId))
          .filter(Boolean)
      ];
      const uniqueInstanceIds = Array.from(new Set(arenaInstanceIds));
      const trimmedInstances = {};
      const trimmedDefinitions = {};
      uniqueInstanceIds.forEach((id) => {
        const instance = cardInstances[id];
        if (!instance) return;
        trimmedInstances[id] = instance;
        const definition = cardDefinitions[instance.entityId];
        if (definition) trimmedDefinitions[instance.entityId] = definition;
      });
      const payload = await requestJson(`/api/sessions/${encodeURIComponent(sessionId)}/arena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerId: activePlayerId,
          arena: {
            edges: arenaState.edges,
            center: arenaState.center,
            cardInstances: trimmedInstances,
            cardDefinitions: trimmedDefinitions
          },
          mock_api_calls: MOCK_API_CALLS
        })
      });
      setArenaSnapshot(JSON.stringify(payload?.arena || payload || {}, null, 2));
      setNotice('Arena saved.');
    } catch (err) {
      setNotice(err.message);
    }
  };

  const handleLoadArena = async () => {
    if (!sessionId.trim()) {
      setNotice('Set a session ID before loading the arena.');
      return;
    }
    if (!activePlayerId) {
      setNotice('Set a player ID before loading the arena.');
      return;
    }
    try {
      const payload = await requestJson(
        `/api/sessions/${encodeURIComponent(sessionId)}/arena${buildQuery({
          playerId: activePlayerId,
          mock_api_calls: MOCK_API_CALLS
        })}`
      );
      const arena = payload?.arena || payload || {};
      const nextArena = buildEmptyArena(arenaMap);
      const nextDefinitions = { ...cardDefinitions };
      const nextInstances = { ...cardInstances };

      const hydrateSlot = (slot, card, ownerPlayerId) => {
        if (!card) return slot;
        const definition = mergeCardDefinition(card, 0);
        nextDefinitions[definition.entityId] = definition;
        const instanceId = createInstanceId();
        nextInstances[instanceId] = {
          instanceId,
          entityId: definition.entityId,
          ownerPlayerId,
          faceUp: true
        };
        return {
          ...slot,
          cardInstanceId: instanceId,
          ownerPlayerId
        };
      };

      if (arena.edges && arena.center) {
        nextArena.center = arena.center.map((slot, index) => ({
          ...nextArena.center[index],
          ...slot
        }));
        Object.keys(nextArena.edges).forEach((edgeKey) => {
          const slots = Array.isArray(arena.edges?.[edgeKey]) ? arena.edges[edgeKey] : [];
          nextArena.edges[edgeKey] = nextArena.edges[edgeKey].map((slot, index) => ({
            ...slot,
            ...slots[index]
          }));
        });
        setCardDefinitions((prev) => ({ ...prev, ...(arena.cardDefinitions || {}) }));
        setCardInstances((prev) => ({ ...prev, ...(arena.cardInstances || {}) }));
      } else if (Array.isArray(arena.centerSlots)) {
        nextArena.center = nextArena.center.map((slot, index) =>
          hydrateSlot(slot, arena.centerSlots[index]?.card, arena.centerSlots[index]?.ownerPlayerId)
        );
        const playersFromArena = arena.players && typeof arena.players === 'object' ? arena.players : {};
        const playerIds = Object.keys(playersFromArena);
        const edgesForLoad = EDGE_SETS[Math.min(Math.max(playerIds.length, 1), 4)] || EDGE_SETS[1];
        playerIds.forEach((playerId, index) => {
          const edgeKey = edgesForLoad[index] || 'south';
          const sideSlots = playersFromArena[playerId]?.sideSlots || [];
          nextArena.edges[edgeKey] = nextArena.edges[edgeKey].map((slot, slotIndex) =>
            hydrateSlot(slot, sideSlots[slotIndex]?.card, playerId)
          );
        });
      } else if (Array.isArray(arena.entities)) {
        nextArena.center = nextArena.center.map((slot, index) =>
          hydrateSlot(slot, arena.entities[index]?.card || arena.entities[index]?.entity, arena.entities[index]?.playerId)
        );
      }

      setArenaState(nextArena);
      setCardDefinitions(nextDefinitions);
      setCardInstances(nextInstances);
      setArenaSnapshot(JSON.stringify(arena, null, 2));
      setNotice('Arena loaded.');
    } catch (err) {
      setNotice(err.message);
    }
  };

  const handleSyncSession = async () => {
    if (!sessionId.trim()) {
      setNotice('Set a session ID before syncing the session.');
      return;
    }
    try {
      const payload = await fetchSessionPlayers(baseUrl, sessionId.trim(), {
        mockApiCalls: MOCK_API_CALLS
      });
      const list = Array.isArray(payload?.players) ? payload.players : [];
      if (list.length) {
        setPlayers((prev) => {
          const next = prev.slice(0, Math.max(list.length, 1));
          if (next.length < list.length) {
            for (let index = next.length; index < list.length; index += 1) {
              next.push(createPlayerState(index));
            }
          }
          return next.map((player, index) => {
            const item = list[index];
            if (!item) return player;
            return {
              ...player,
              id: item.playerId || item.id || player.id,
              label: item.playerName || player.label
            };
          });
        });
        setPlayersCount((prev) => Math.max(prev, list.length));
      }
      await handleLoadArena();
      setNotice('Session synced.');
    } catch (err) {
      setNotice(err.message);
    }
  };

  const edgeAssignments = useMemo(() => {
    const total = Math.min(Math.max(playersCount, 1), 4);
    const edges = EDGE_SETS[total] || EDGE_SETS[1];
    const active = players[activePlayerIndex];
    const others = players.filter((_, index) => index !== activePlayerIndex);
    const assignments = [{ edgeKey: 'south', player: active, isActive: true }];
    edges.slice(1).forEach((edgeKey, index) => {
      assignments.push({ edgeKey, player: others[index], isActive: false });
    });
    return assignments.filter((entry) => entry.player);
  }, [players, playersCount, activePlayerIndex]);

  const hoveredCard = hoveredInstanceId ? cardDefinitions[cardInstances[hoveredInstanceId]?.entityId] : null;
  const hoveredOwnerId = hoveredInstanceId ? cardInstances[hoveredInstanceId]?.ownerPlayerId : '';

  const handleCalibrationStart = (event) => {
    if (!calibrationMode || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const startX = ((event.clientX - rect.left) / rect.width) * 100;
    const startY = ((event.clientY - rect.top) / rect.height) * 100;
    setCalibrationDraft({ startX, startY, x: startX, y: startY, w: 0, h: 0 });
  };

  const handleCalibrationMove = (event) => {
    if (!calibrationMode || !calibrationDraft || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const currentX = ((event.clientX - rect.left) / rect.width) * 100;
    const currentY = ((event.clientY - rect.top) / rect.height) * 100;
    const x = Math.min(calibrationDraft.startX, currentX);
    const y = Math.min(calibrationDraft.startY, currentY);
    const w = Math.abs(currentX - calibrationDraft.startX);
    const h = Math.abs(currentY - calibrationDraft.startY);
    setCalibrationDraft({ ...calibrationDraft, x, y, w, h });
  };

  const handleCalibrationEnd = () => {
    if (!calibrationMode || !calibrationDraft) return;
    if (calibrationDraft.w > 1 && calibrationDraft.h > 1) {
      setCalibrationSlots((prev) => [
        ...prev,
        {
          id: `${calibrationGroup}-${prev.length + 1}`,
          group: calibrationGroup,
          x: Number(calibrationDraft.x.toFixed(2)),
          y: Number(calibrationDraft.y.toFixed(2)),
          w: Number(calibrationDraft.w.toFixed(2)),
          h: Number(calibrationDraft.h.toFixed(2)),
          rotate: 0
        }
      ]);
    }
    setCalibrationDraft(null);
  };

  const handleCopyCalibration = async () => {
    const grouped = calibrationSlots.reduce((acc, slot) => {
      if (!acc[slot.group]) acc[slot.group] = [];
      acc[slot.group].push(slot);
      return acc;
    }, {});
    const nextMap = {
      ...arenaMap,
      centerSlots: grouped.center
        ? grouped.center.map((slot) => ({
          id: slot.id,
          x: slot.x,
          y: slot.y,
          w: slot.w,
          h: slot.h,
          rotate: slot.rotate
        }))
        : arenaMap.centerSlots,
      sideSlots: Object.keys(arenaMap.sideSlots).reduce((acc, edgeKey) => {
        acc[edgeKey] = (grouped[edgeKey] || arenaMap.sideSlots[edgeKey]).map((slot) => ({
          id: slot.id,
          x: slot.x,
          y: slot.y,
          w: slot.w,
          h: slot.h,
          rotate: slot.rotate
        }));
        return acc;
      }, {})
    };
    const text = JSON.stringify(nextMap, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setNotice('Calibration JSON copied to clipboard.');
    } catch (err) {
      setNotice('Unable to copy JSON to clipboard.');
    }
  };

  const handleStartConnection = (instanceId) => {
    setConnectionMode('connecting');
    setPendingConnection({ sourceId: instanceId });
    setNotice('Select a target card to connect.');
  };

  const handleCancelConnection = () => {
    setConnectionMode('idle');
    setPendingConnection(null);
  };

  useEffect(() => {
    if (connectionMode === 'idle') return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      handleCancelConnection();
      setNotice('Connection cancelled.');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectionMode]);

  const handleSelectTarget = (targetId) => {
    if (connectionMode !== 'connecting' || !pendingConnection) return;
    if (targetId === pendingConnection.sourceId) {
      setNotice('Cannot connect card to itself.');
      return;
    }
    setPendingConnection((prev) => ({ ...prev, targetId }));
    setConnectionMode('entering_text');
  };

  const handleRelationshipSubmit = async (text) => {
    if (!pendingConnection?.sourceId || !pendingConnection?.targetId) return;

    setNotice('Forging connection...');

    const sourceCard = cardDefinitions[cardInstances[pendingConnection.sourceId]?.entityId];
    const targetCard = cardDefinitions[cardInstances[pendingConnection.targetId]?.entityId];

    const result = await proposeRelationship(
      {
        sessionId,
        playerId: activePlayerId,
        source: {
          cardId: pendingConnection.sourceId,
          entityId: sourceCard?.entityId
        },
        targets: [
          {
            cardId: pendingConnection.targetId,
            entityId: targetCard?.entityId
          }
        ],
        relationship: {
          surfaceText: text
        },
        mock_api_calls: MOCK_API_CALLS
      },
      baseUrl,
      { mockApiCalls: MOCK_API_CALLS }
    );

    if (result.verdict === 'accepted' && result.edge) {
      // Handle single edge or array
      const edges = Array.isArray(result.edge) ? result.edge : [result.edge];
      setArenaEdges((prev) => [...prev, ...edges]);

      const points = result.points?.awarded || 0;
      if (points > 0) {
        setRecentPoints({ amount: points, id: Date.now() });
        setPlayers((prev) =>
          prev.map((p, i) => (i === activePlayerIndex ? { ...p, score: (p.score || 0) + points } : p))
        );
      }

      setNotice(`Connection established! +${points} pts`);
    } else {
      const reason = result.quality?.reasons?.[0] || 'Relationship rejected';
      setNotice(`Failed: ${reason}`);
    }

    handleCancelConnection();
  };

  const selectedDeckCount = Object.values(selectedDeckCards).filter(Boolean).length;
  const selectedSpreadCount = selectedSpreadSlots?.length || 0;

  const scrollToFlowStep = (stepId) => {
    const options = { behavior: 'smooth', block: 'start' };
    if (stepId === 'charter') {
      worldProfileRef.current?.scrollIntoView(options);
      return;
    }
    if (stepId === 'seed' || stepId === 'forge') {
      forgePanelRef.current?.scrollIntoView(options);
      window.setTimeout(() => fragmentInputRef.current?.focus(), 250);
      return;
    }
    if (stepId === 'spread') {
      spreadPanelRef.current?.scrollIntoView(options);
      return;
    }
    if (stepId === 'arena' || stepId === 'weave') {
      boardStageRef.current?.scrollIntoView(options);
    }
  };

  const scrollToFlowTarget = (targetId) => {
    const options = { behavior: 'smooth', block: 'start' };
    if (targetId === 'charter') {
      scrollToFlowStep('charter');
      return;
    }
    if (targetId === 'lens') {
      sceneLensRef.current?.scrollIntoView(options);
      return;
    }
    if (targetId === 'intent') {
      intentRef.current?.scrollIntoView(options);
      return;
    }
    if (targetId === 'anchors') {
      anchorsRef.current?.scrollIntoView(options);
      return;
    }
    if (targetId === 'presence') {
      presenceRef.current?.scrollIntoView(options);
      return;
    }
    if (targetId === 'brief') {
      diveBriefRef.current?.scrollIntoView(options);
      return;
    }
    if (targetId === 'start-ritual') {
      handleStartRitual();
    }
  };

  const connectionSourceCard = pendingConnection?.sourceId
    ? cardDefinitions[cardInstances[pendingConnection.sourceId]?.entityId]
    : null;

  const hoveredCardFrontUrl = hoveredCard
    ? resolveAssetUrl(baseUrl, hoveredCard.front?.imageUrl || hoveredCard.imageUrl || hoveredCard.back?.imageUrl)
    : '';
  const hoveredEdgesCount = hoveredInstanceId
    ? arenaEdges.filter((edge) => edge.sourceId === hoveredInstanceId || edge.targetId === hoveredInstanceId).length
    : 0;
  const hoveredIsInCenter = hoveredInstanceId
    ? arenaState.center.some((slot) => slot.cardInstanceId === hoveredInstanceId)
    : false;
  const hoveredIsOwnedEdgeCard = hoveredInstanceId
    ? Object.values(arenaState.edges || {}).some((slots) =>
        (slots || []).some(
          (slot) => slot.cardInstanceId === hoveredInstanceId && slot.ownerPlayerId === activePlayerId
        )
      )
    : false;
  const hoveredCanConnect = Boolean(hoveredInstanceId && (hoveredIsInCenter || hoveredIsOwnedEdgeCard));

  const renderSlotCard = (instanceId, visibility) => {
    const instance = cardInstances[instanceId];
    if (!instance) return null;
    const definition = cardDefinitions[instance.entityId];
    if (!definition) return null;
    return (
      <ArenaCard
        card={definition}
        baseUrl={baseUrl}
        visibility={visibility}
        flipped={!instance.faceUp}
        size="sm"
        onFlip={() => handleToggleCardFace(instanceId)}
      >
        {visibility === 'full' && (
          <div className="card-action-overlay">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartConnection(instanceId);
              }}
            >
              Connect
            </button>
          </div>
        )}
      </ArenaCard>
    );
  };

  return (
    <div
      className={`arenaConsole theme-${activePlayer?.storyteller?.theme || 'archivist'} ${
        sessionState.diveMode ? 'diveMode' : ''
      }`}
    >
      <header className="arenaConsoleTopBar">
        <div className="arenaConsoleTitle">
          <p className="arenaConsoleEyebrow">Storyteller Arena Console</p>
          <h1>Shared Hex Arena</h1>
        </div>
        <div className="arenaConsoleTopControls">
          <div className="arenaConsoleTopStat">
            <span>API Base</span>
            <strong>{baseUrl || 'Not set'}</strong>
          </div>
          <div className="arenaConsoleTopStat">
            <span>Session</span>
            <strong>{sessionId || 'Missing'}</strong>
          </div>
          <label>
            Players
            <select value={playersCount} onChange={(event) => setPlayersCount(Number(event.target.value))}>
              {[1, 2, 3, 4].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <div className="arenaConsoleTabs">
            {players.slice(0, playersCount).map((player, index) => (
              <button
                key={player.id || player.label}
                type="button"
                className={index === activePlayerIndex ? 'active' : ''}
                onClick={() => setActivePlayerIndex(index)}
              >
                {player.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {notice && <div className="arenaConsoleNotice">{notice}</div>}

      <section className="arenaConsoleLayout">
        <aside className="arenaConsoleOperator">
          <div className="consolePanel flowPanel">
            <h2>Worldbuilding Flow</h2>
            <div className="flowProgress">
              <div className="flowProgressBar" style={{ width: `${immersionScore}%` }} />
            </div>
            <p className="flowProgressLabel">{immersionScore}% immersion</p>
            <div className="flowCompass">
              <div className="flowCompassHeader">
                <span>Flow Compass</span>
                <strong>{flowGuidance.focus}</strong>
              </div>
              <p>{flowGuidance.cue}</p>
              <div className="flowCompassTags">
                <span className={`flowTag ${flowGuidance.mode}`}>{flowGuidance.modeLabel}</span>
                <span className={`flowTag ${sessionState.diveMode ? 'active' : ''}`}>
                  {sessionState.diveMode ? 'Dive On' : 'Dive Off'}
                </span>
              </div>
              <div className="flowCompassNext">
                <span>Next</span>
                <strong>{flowGuidance.next}</strong>
              </div>
            </div>
            <div className="flowDirector">
              <div className="flowDirectorHeader">
                <strong>Flow Director</strong>
                <span>{flowRecommendation.actionLabel}</span>
              </div>
              <p>{flowRecommendation.detail}</p>
              <div className="consoleButtonRow">
                <button
                  type="button"
                  className="primary"
                  onClick={() => scrollToFlowTarget(flowRecommendation.actionId)}
                >
                  {flowRecommendation.title}
                </button>
              </div>
            </div>
            <div className="flowPulse">
              <div className="flowPulseHeader">
                <strong>Flow Pulse</strong>
                <span>{flowPulseBlockers ? `${flowPulseBlockers} blockers` : 'Clear'}</span>
              </div>
              <div className="flowPulseList">
                {flowPulseItems.map((item) => (
                  <div key={item.id} className={`flowPulseItem ${item.ready ? 'ready' : ''}`}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <button
                      type="button"
                      className="ghost subtle"
                      onClick={() => scrollToFlowTarget(item.actionId)}
                    >
                      {item.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flowMap">
              <div className="flowMapHeader">
                <span>Flow Map</span>
                <strong>{flowGuidance.modeLabel}</strong>
              </div>
              <div className="flowMapRow">
                {phaseOptions.map((phase, index) => (
                  <React.Fragment key={phase.id}>
                    <span
                      className={`flowMapStep ${phase.id} ${flowGuidance.mode === phase.id ? 'active' : ''}`}
                    >
                      {phase.label}
                    </span>
                    {index < phaseOptions.length - 1 && <span className="flowMapArrow">→</span>}
                  </React.Fragment>
                ))}
              </div>
              <div className="flowMapNow">
                <span>Now</span>
                <strong>{currentFlowStep?.title || 'Begin'}</strong>
              </div>
            </div>
            <div className="sceneLens" ref={sceneLensRef}>
              <div className="sceneLensHeader">
                <strong>Scene Lens</strong>
                <span>{sceneGoal || sceneRisk ? 'Aligned' : 'Unset'}</span>
              </div>
              <label>
                Goal
                <input
                  value={sceneGoal}
                  onChange={(event) => handleUpdateSceneLens('sceneGoal', event.target.value)}
                />
              </label>
              <label>
                Stakes
                <input
                  value={sceneRisk}
                  onChange={(event) => handleUpdateSceneLens('sceneRisk', event.target.value)}
                />
              </label>
              <div className="consoleButtonRow">
                <button
                  type="button"
                  className="ghost subtle"
                  onClick={handleClearSceneLens}
                  disabled={!sceneGoal && !sceneRisk}
                >
                  Clear Lens
                </button>
              </div>
            </div>
            <div className="flowPrimer">
              <div className="flowPrimerHeader">
                <strong>Immersion Primer</strong>
                <span>{immersionPrimer ? 'Ready' : 'Draft'}</span>
              </div>
              {immersionPrimer ? <pre>{immersionPrimer}</pre> : <p>Fill the charter + lens to draft a primer.</p>}
              <div className="consoleButtonRow">
                <button type="button" className="primary" onClick={handleApplyImmersionPrimer} disabled={!immersionPrimer}>
                  Send Primer
                </button>
                <button type="button" className="ghost" onClick={() => scrollToFlowStep('seed')}>
                  Open Fragment
                </button>
              </div>
            </div>
            <div className="flowSteps">
              {flowSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flowStep ${step.done ? 'done' : ''} ${step.id === currentFlowStepId ? 'current' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => scrollToFlowStep(step.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      scrollToFlowStep(step.id);
                    }
                  }}
                >
                  <span className="flowStepIndex">{index + 1}</span>
                  <div>
                    <div className="flowStepTitleRow">
                      <strong>{step.title}</strong>
                      {!step.done && step.id === currentFlowStepId && <span className="flowStepNext">Next</span>}
                    </div>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flowSummary">
              <span>Deck {activePlayer?.deck?.length || 0}</span>
              <span>Spread {(activePlayer?.spreadSlots || []).filter((slot) => slot.cardInstanceId).length || 0}</span>
              <span>Arena {hasArenaCards ? 'Active' : 'Empty'}</span>
              <span>Links {arenaEdges?.length || 0}</span>
              <span>Atlas {worldAtlasCount}/9</span>
              <span>Threads {threads.length}/3</span>
            </div>
            <div className="flowMeta">
              <div>
                <span>Focus</span>
                <strong>{focusPlayerLabel}</strong>
              </div>
              <div>
                <span>Scene Beat</span>
                <strong>{activeBeat?.label || 'Arrival'}</strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>{phaseLabel}</strong>
              </div>
            </div>
            <div className="flowGate">
              <div className="flowGateHeader">
                <strong>Immersion Gate</strong>
                <span>{ritualActive ? 'Open' : 'Closed'}</span>
              </div>
              <div className="flowGateList">
                <span className={immersionGate.charter ? 'ready' : ''}>Charter</span>
                <span className={immersionGate.lens ? 'ready' : ''}>Lens</span>
                <span className={immersionGate.intent ? 'ready' : ''}>Intent</span>
                <span className={immersionGate.anchors ? 'ready' : ''}>Anchors</span>
                <span className={immersionGate.ready ? 'ready' : ''}>
                  Ready {readyCount}/{playersCount}
                </span>
              </div>
              <div className="consoleButtonRow">
                <button
                  type="button"
                  className="primary"
                  onClick={handleStartRitual}
                  disabled={ritualActive || !ritualGateReady}
                >
                  Open Ritual
                </button>
                <button type="button" className="ghost" onClick={handleToggleDiveMode}>
                  {sessionState.diveMode ? 'Exit Dive' : 'Enter Dive'}
                </button>
              </div>
            </div>
            <div className="flowLoop">
              <div className="flowLoopHeader">
                <strong>Immersion Loop</strong>
                <span>{sessionState.lastFlowAction?.label ? 'Active' : 'Idle'}</span>
              </div>
              <p>Frame → Invite → Seal to keep the table fully in-world.</p>
              <div className="flowLoopButtons">
                {FLOW_LOOP_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="ghost subtle"
                    title={action.detail}
                    onClick={() => handleFlowLoopAction(action.id)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              {sessionState.lastFlowAction?.label && (
                <div className="flowLoopMeta">
                  <span>{sessionState.lastFlowAction.by || 'Table'}</span>
                  {formattedFlowTime && <em>{formattedFlowTime}</em>}
                </div>
              )}
            </div>
            <div className="flowNextActions">
              {(() => {
                if (currentFlowStepId === 'charter') {
                  return (
                    <button type="button" className="primary" onClick={() => scrollToFlowStep('charter')}>
                      Open Charter
                    </button>
                  );
                }
                if (currentFlowStepId === 'forge') {
                  return (
                    <button type="button" className="primary" onClick={handleTextToEntity} disabled={activePlayer?.busy}>
                      Generate Entities
                    </button>
                  );
                }
                if (currentFlowStepId === 'spread') {
                  return (
                    <button type="button" className="primary" onClick={handleDrawFromDeck} disabled={!activePlayer?.deck?.length}>
                      Draw to Spread
                    </button>
                  );
                }
                if (currentFlowStepId === 'arena') {
                  return (
                    <button type="button" className="ghost" onClick={() => scrollToFlowStep('spread')}>
                      Go to Spread
                    </button>
                  );
                }
                if (currentFlowStepId === 'weave') {
                  return (
                    <button type="button" className="ghost" onClick={() => scrollToFlowStep('arena')}>
                      Go to Arena
                    </button>
                  );
                }
                return (
                  <button type="button" className="ghost" onClick={() => scrollToFlowStep('seed')}>
                    Edit Fragment
                  </button>
                );
              })()}
              <button type="button" className="ghost subtle" onClick={() => scrollToFlowStep(currentFlowStepId)}>
                Jump
              </button>
            </div>
            <p className="consoleHint">Progress tracks the active player and shared arena state.</p>
          </div>

          <div className="consolePanel worldProfilePanel" ref={worldProfileRef}>
            <h3>World Charter</h3>
            <label>
              World Name
              <input
                value={worldProfile.worldName}
                onChange={(event) =>
                  setWorldProfile((prev) => ({ ...prev, worldName: event.target.value }))
                }
              />
            </label>
            <label>
              Core Mood
              <input
                value={worldProfile.mood}
                onChange={(event) => setWorldProfile((prev) => ({ ...prev, mood: event.target.value }))}
              />
            </label>
            <label className="wide">
              Founding Truth
              <textarea
                value={worldProfile.truth}
                onChange={(event) => setWorldProfile((prev) => ({ ...prev, truth: event.target.value }))}
              />
            </label>
            <label>
              Taboo
              <input
                value={worldProfile.taboo}
                onChange={(event) => setWorldProfile((prev) => ({ ...prev, taboo: event.target.value }))}
              />
            </label>
            <div className="worldFrameGrid">
              <label>
                Era
                <input
                  value={worldProfile.era}
                  onChange={(event) => setWorldProfile((prev) => ({ ...prev, era: event.target.value }))}
                />
              </label>
              <label>
                Conflict
                <input
                  value={worldProfile.conflict}
                  onChange={(event) => setWorldProfile((prev) => ({ ...prev, conflict: event.target.value }))}
                />
              </label>
              <label>
                Wonder
                <input
                  value={worldProfile.wonder}
                  onChange={(event) => setWorldProfile((prev) => ({ ...prev, wonder: event.target.value }))}
                />
              </label>
            </div>
            <div className="worldSensoryGrid">
              <label>
                Sound
                <input
                  value={worldProfile.sound}
                  onChange={(event) => setWorldProfile((prev) => ({ ...prev, sound: event.target.value }))}
                />
              </label>
              <label>
                Scent
                <input
                  value={worldProfile.scent}
                  onChange={(event) => setWorldProfile((prev) => ({ ...prev, scent: event.target.value }))}
                />
              </label>
              <label>
                Texture
                <input
                  value={worldProfile.texture}
                  onChange={(event) => setWorldProfile((prev) => ({ ...prev, texture: event.target.value }))}
                />
              </label>
            </div>
            <div className="worldPillars">
              <div className="worldPillarsHeader">
                <strong>World Pillars</strong>
                <span>{(worldProfile.pillars || []).length}/6</span>
              </div>
              <div className="worldPillarsList">
                {(worldProfile.pillars || []).map((pillar, index) => (
                  <button
                    key={`${pillar}-${index}`}
                    type="button"
                    className="worldPillarChip"
                    onClick={() => handleRemovePillar(index)}
                  >
                    {pillar}
                    <span>×</span>
                  </button>
                ))}
                {!worldProfile.pillars?.length && (
                  <p className="consoleHint">Add 3-6 canon pillars to guide play.</p>
                )}
              </div>
              <div className="worldPillarsInput">
                <input
                  value={pillarInput}
                  placeholder="Add pillar..."
                  onChange={(event) => setPillarInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddPillar();
                    }
                  }}
                />
                <button type="button" className="ghost" onClick={handleAddPillar}>
                  Add
                </button>
              </div>
            </div>
            <div className="worldAtlas">
              <div className="worldAtlasHeader">
                <strong>World Atlas</strong>
                <span>Meta anchors for immersion</span>
              </div>
              <div className="worldAtlasGrid">
                <div className="worldAtlasBlock">
                  <div className="worldAtlasBlockHeader">
                    <strong>Regions</strong>
                    <span>{(worldProfile.regions || []).length}/3</span>
                  </div>
                  <div className="worldAtlasChips">
                    {(worldProfile.regions || []).map((region, index) => (
                      <button
                        key={`${region}-${index}`}
                        type="button"
                        className="worldPillarChip"
                        onClick={() => handleRemoveRegion(index)}
                      >
                        {region}
                        <span>×</span>
                      </button>
                    ))}
                    {!worldProfile.regions?.length && (
                      <p className="consoleHint">Add 1-3 regions for traversal.</p>
                    )}
                  </div>
                  <div className="worldAtlasInput">
                    <input
                      value={regionInput}
                      placeholder="Add region..."
                      onChange={(event) => setRegionInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleAddRegion();
                        }
                      }}
                    />
                    <button type="button" className="ghost" onClick={handleAddRegion}>
                      Add
                    </button>
                  </div>
                </div>
                <div className="worldAtlasBlock">
                  <div className="worldAtlasBlockHeader">
                    <strong>Factions</strong>
                    <span>{(worldProfile.factions || []).length}/3</span>
                  </div>
                  <div className="worldAtlasChips">
                    {(worldProfile.factions || []).map((faction, index) => (
                      <button
                        key={`${faction}-${index}`}
                        type="button"
                        className="worldPillarChip"
                        onClick={() => handleRemoveFaction(index)}
                      >
                        {faction}
                        <span>×</span>
                      </button>
                    ))}
                    {!worldProfile.factions?.length && (
                      <p className="consoleHint">Add 1-3 factions for tension.</p>
                    )}
                  </div>
                  <div className="worldAtlasInput">
                    <input
                      value={factionInput}
                      placeholder="Add faction..."
                      onChange={(event) => setFactionInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleAddFaction();
                        }
                      }}
                    />
                    <button type="button" className="ghost" onClick={handleAddFaction}>
                      Add
                    </button>
                  </div>
                </div>
                <div className="worldAtlasBlock">
                  <div className="worldAtlasBlockHeader">
                    <strong>Laws</strong>
                    <span>{(worldProfile.laws || []).length}/3</span>
                  </div>
                  <div className="worldAtlasChips">
                    {(worldProfile.laws || []).map((law, index) => (
                      <button
                        key={`${law}-${index}`}
                        type="button"
                        className="worldPillarChip"
                        onClick={() => handleRemoveLaw(index)}
                      >
                        {law}
                        <span>×</span>
                      </button>
                    ))}
                    {!worldProfile.laws?.length && (
                      <p className="consoleHint">Add 1-3 laws to keep logic consistent.</p>
                    )}
                  </div>
                  <div className="worldAtlasInput">
                    <input
                      value={lawInput}
                      placeholder="Add law..."
                      onChange={(event) => setLawInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleAddLaw();
                        }
                      }}
                    />
                    <button type="button" className="ghost" onClick={handleAddLaw}>
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="consoleButtonRow">
              <button type="button" className="ghost" onClick={() => setWorldProfile({ ...WORLD_PROFILE_DEFAULT })}>
                Clear
              </button>
              <button type="button" className="primary" onClick={handleBlendWorldProfile}>
                Blend into Fragment
              </button>
            </div>
          </div>

          <div className="consolePanel ledgerPanel">
            <h3>World Ledger</h3>
            <div className="ledgerForm">
              <label>
                Type
                <select value={ledgerType} onChange={(event) => setLedgerType(event.target.value)}>
                  <option value="canon">Canon</option>
                  <option value="location">Location</option>
                  <option value="faction">Faction</option>
                  <option value="mystery">Mystery</option>
                  <option value="oath">Oath</option>
                </select>
              </label>
              <label className="wide">
                Entry
                <textarea
                  rows={2}
                  value={ledgerText}
                  placeholder="Record a truth, a vow, or an emerging tension..."
                  onChange={(event) => setLedgerText(event.target.value)}
                />
              </label>
              <div className="consoleButtonRow">
                <button type="button" className="primary" onClick={handleAddLedgerEntry}>
                  Commit
                </button>
                <button type="button" className="ghost" onClick={() => setLedgerText('')}>
                  Clear
                </button>
              </div>
            </div>
            <div className="ledgerList">
              {ledgerEntries.length ? (
                ledgerEntries.slice().reverse().slice(0, 6).map((entry) => (
                  <div key={entry.id} className="ledgerEntry">
                    <div className="ledgerEntryHeader">
                      <span className={`ledgerType ${entry.type}`}>{entry.type}</span>
                      <span className="ledgerMeta">{entry.by || 'Table'}</span>
                    </div>
                    <p>{entry.text}</p>
                    <div className="ledgerActions">
                      <button type="button" className="ghost subtle" onClick={() => handleEchoLedgerEntry(entry)}>
                        Echo to Fragment
                      </button>
                      <button type="button" className="ghost subtle" onClick={() => handleRemoveLedgerEntry(entry.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="consoleHint">Log canon beats so the table shares the same truth.</p>
              )}
            </div>
          </div>

          <div className="consolePanel threadPanel">
            <h3>Mythic Threads</h3>
            <div className="threadList">
              {threads.length ? (
                threads.map((thread) => (
                  <div key={thread.id} className="threadRow">
                    <div>
                      <strong>{thread.label}</strong>
                      <div className="threadHeat">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <span key={`${thread.id}-heat-${index}`} className={index < (thread.heat || 0) ? 'active' : ''} />
                        ))}
                      </div>
                    </div>
                    <div className="threadActions">
                      <button type="button" className="ghost subtle" onClick={() => handleAdvanceThread(thread.id)}>
                        Heat +
                      </button>
                      <button type="button" className="ghost subtle" onClick={() => handleCoolThread(thread.id)}>
                        Cool
                      </button>
                      <button type="button" className="ghost subtle" onClick={() => handleResolveThread(thread.id)}>
                        Resolve
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="consoleHint">Track 1-3 stakes the table keeps returning to.</p>
              )}
            </div>
            <div className="threadInput">
              <input
                value={threadInput}
                placeholder="Add thread..."
                onChange={(event) => setThreadInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddThread();
                  }
                }}
              />
              <button type="button" className="ghost" onClick={handleAddThread}>
                Add
              </button>
            </div>
            <p className="consoleHint">Heat 3 sparks canon and raises momentum.</p>
          </div>

          <div className="consolePanel immersionPanel">
            <h3>Immersion Toolkit</h3>
            <div className="immersionPrompts">
              {immersionPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  className={prompt.id === selectedPromptId ? 'active' : ''}
                  onClick={() => setSelectedPromptId(prompt.id)}
                >
                  <strong>{prompt.title}</strong>
                  <span>{prompt.text}</span>
                </button>
              ))}
            </div>
            <div className="beatList">
              {sceneBeats.map((beat) => (
                <button
                  key={beat.id}
                  type="button"
                  className={beat.id === activeBeat?.id ? 'active' : ''}
                  onClick={() => setSessionState((prev) => ({ ...prev, beatId: beat.id }))}
                >
                  <strong>{beat.label}</strong>
                  <span>{beat.detail}</span>
                </button>
              ))}
            </div>
            <div className="consoleButtonRow">
              <button type="button" className="ghost" onClick={handleAddPromptToFragment}>
                Whisper Into Fragment
              </button>
              <button type="button" className="primary" onClick={handleAdvanceBeat}>
                Advance Beat
              </button>
            </div>
            <div className="anchorPanel" ref={anchorsRef}>
              <div className="anchorHeader">
                <strong>World Anchors</strong>
                <span>{anchors.length}/3</span>
              </div>
              <div className="anchorList">
                {anchors.map((anchor, index) => (
                  <button
                    key={`${anchor}-${index}`}
                    type="button"
                    className="anchorChip"
                    onClick={() => handleRemoveAnchor(index)}
                  >
                    {anchor}
                    <span>×</span>
                  </button>
                ))}
                {!anchors.length && (
                  <p className="consoleHint">Pin 1-3 truths to keep the table grounded in canon.</p>
                )}
              </div>
              <div className="anchorInput">
                <input
                  value={anchorInput}
                  placeholder="Add anchor..."
                  onChange={(event) => setAnchorInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddAnchor();
                    }
                  }}
                />
                <button type="button" className="ghost" onClick={handleAddAnchor}>
                  Pin
                </button>
              </div>
            </div>
            <div className="immersionVows">
              {VOW_DEFINITIONS.map((vow) => (
                <label key={vow.id} title={vow.detail}>
                  <input
                    type="checkbox"
                    checked={Boolean(vows[vow.id])}
                    onChange={() => handleToggleVow(vow.id)}
                  />
                  {vow.label}
                </label>
              ))}
            </div>
            {activeVows.length > 0 && (
              <p className="consoleHint">
                Active vows: {activeVows.map((vow) => vow.label).join(', ')}
              </p>
            )}
            <p className="consoleHint">Rituals persist per session to support deep immersion.</p>
          </div>

          <div className="consolePanel diveBriefPanel" ref={diveBriefRef}>
            <h3>Dive Brief</h3>
            <div className="diveBriefBody">
              {diveBrief ? (
                <pre>{diveBrief}</pre>
              ) : (
                <p className="consoleHint">Fill the World Charter to generate a dive brief.</p>
              )}
            </div>
            <div className="consoleButtonRow">
              <button type="button" className="primary" onClick={handleApplyDiveBrief} disabled={!diveBrief}>
                Send Brief to Fragment
              </button>
              <button type="button" className="ghost" onClick={handleToggleDiveMode}>
                {sessionState.diveMode ? 'Exit Dive' : 'Enter Dive'}
              </button>
            </div>
          </div>

          <div className="consolePanel sessionPanel" ref={intentRef}>
            <h3>Session Rhythm</h3>
            <div className="phasePicker">
              {phaseOptions.map((phase) => (
                <button
                  key={phase.id}
                  type="button"
                  className={`phaseButton ${sessionState.phase === phase.id ? 'active' : ''}`}
                  onClick={() => handleSetPhase(phase.id)}
                >
                  <strong>{phase.label}</strong>
                  <span>{phase.detail}</span>
                </button>
              ))}
            </div>
            <label className="wide">
              Shared Intent
              <textarea
                rows={2}
                value={sessionState.intent || ''}
                onChange={(event) => setSessionState((prev) => ({ ...prev, intent: event.target.value }))}
              />
            </label>
            <div className="signalRow">
              <button type="button" className="ghost" onClick={() => handleSignal('Rally')}>
                Rally
              </button>
              <button type="button" className="ghost" onClick={() => handleSignal('Silence')}>
                Silence
              </button>
              <button type="button" className="ghost" onClick={() => handleSignal('Breathe')}>
                Breathe
              </button>
              <button type="button" className="primary" onClick={handleToggleDiveMode}>
                {sessionState.diveMode ? 'Exit Dive' : 'Enter Dive'}
              </button>
            </div>
            {sessionState.lastSignal?.label && (
              <div className="signalBadge">
                <strong>{sessionState.lastSignal.label}</strong>
                {formattedSignalTime && <span>{formattedSignalTime}</span>}
              </div>
            )}
            <div className="pulsePanel">
              <div className="pulseRow">
                <div>
                  <strong>Momentum</strong>
                  <span>Energy in the room</span>
                </div>
                <div className="pulseControls">
                  <button type="button" className="ghost subtle" onClick={() => handlePulseAdjust('momentum', -1)}>
                    -
                  </button>
                  <div className="pulseMeter">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <span key={`momentum-${index}`} className={index <= pulse.momentum ? 'active' : ''} />
                    ))}
                  </div>
                  <button type="button" className="ghost subtle" onClick={() => handlePulseAdjust('momentum', 1)}>
                    +
                  </button>
                </div>
              </div>
              <div className="pulseRow">
                <div>
                  <strong>Clarity</strong>
                  <span>Shared understanding</span>
                </div>
                <div className="pulseControls">
                  <button type="button" className="ghost subtle" onClick={() => handlePulseAdjust('clarity', -1)}>
                    -
                  </button>
                  <div className="pulseMeter">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <span key={`clarity-${index}`} className={index <= pulse.clarity ? 'active' : ''} />
                    ))}
                  </div>
                  <button type="button" className="ghost subtle" onClick={() => handlePulseAdjust('clarity', 1)}>
                    +
                  </button>
                </div>
              </div>
            </div>
            <p className="consoleHint">Signals guide pacing without breaking immersion.</p>
          </div>

          <div className="consolePanel">
            <h2>Operator</h2>
            <label>
              Player ID
              <input
                value={activePlayer?.id || ''}
                disabled={lockPrimaryPlayerId && activePlayerIndex === 0}
                onChange={(event) =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, id: event.target.value }))
                }
              />
            </label>
            <label>
              Player Name
              <input
                value={activePlayer?.label || ''}
                onChange={(event) =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, label: event.target.value }))
                }
              />
            </label>
            <label>
              Player Level
              <select
                value={activePlayer?.level || 1}
                onChange={(event) =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({
                    ...prev,
                    level: Number(event.target.value)
                  }))
                }
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="consolePanel" ref={forgePanelRef}>
            <h3>Entity Forge</h3>
            <label className="wide">
              Fragment
              <textarea
                ref={fragmentInputRef}
                value={activePlayer?.fragmentText || ''}
                rows={4}
                onChange={(event) =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({
                    ...prev,
                    fragmentText: event.target.value
                  }))
                }
              />
            </label>
            <div className="consoleToggleRow">
              <label>
                <input
                  type="checkbox"
                  checked={activePlayer?.includeCards || false}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, includeCards: event.target.checked }))
                  }
                />
                Cards
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={activePlayer?.includeFront || false}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, includeFront: event.target.checked }))
                  }
                />
                Front
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={activePlayer?.includeBack || false}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, includeBack: event.target.checked }))
                  }
                />
                Back
              </label>
            </div>
            <button type="button" className="primary" onClick={handleTextToEntity} disabled={activePlayer?.busy}>
              Generate Entities
            </button>
          </div>

          <div className="consolePanel">
            <h3>Storyteller</h3>
            <button type="button" className="ghost" onClick={handleTextToStoryteller} disabled={activePlayer?.busy}>
              Generate Storyteller
            </button>
            <div className="storytellerList">
              {(activePlayer?.storyteller?.list || []).slice(0, 4).map((storyteller) => {
                const isActive = storyteller.id === activePlayer.storyteller.activeId;
                return (
                  <button
                    key={storyteller.id}
                    type="button"
                    className={isActive ? 'active' : ''}
                    onClick={() =>
                      updatePlayerAt(activePlayerIndex, (prev) => ({
                        ...prev,
                        storyteller: {
                          ...prev.storyteller,
                          activeId: storyteller.id,
                          theme: storyteller.theme
                        }
                      }))
                    }
                  >
                    <span>{storyteller.name}</span>
                    <em>{storyteller.theme}</em>
                  </button>
                );
              })}
              {!activePlayer?.storyteller?.list?.length && (
                <p className="consoleHint">No storytellers yet.</p>
              )}
            </div>
          </div>

          <div className="consolePanel">
            <h3>Arena Sync</h3>
            <div className="consoleButtonRow">
              <button type="button" className="ghost" onClick={handleSyncSession}>
                Sync Session
              </button>
              <button type="button" className="ghost" onClick={handleLoadArena}>
                Load Arena
              </button>
              <button type="button" className="primary" onClick={handleSaveArena}>
                Save Arena
              </button>
            </div>
            <label>
              Spread
              <select value={activePlayer?.spreadId} onChange={(event) => handleSpreadChange(event.target.value)}>
                {spreadPresets
                  .filter((spread) => spread.requiredLevel <= (activePlayer?.level || 1))
                  .map((spread) => (
                    <option key={spread.spreadId} value={spread.spreadId}>
                      {spread.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="consolePanel presencePanel" ref={presenceRef}>
            <h3>Multiplayer Presence</h3>
            <div className="presenceList">
              {players.slice(0, playersCount).map((player, index) => {
                const role = roleLabels[index % roleLabels.length];
                const status = getPlayerStatus(player, index);
                const label = player?.label || player?.id || `Player ${index + 1}`;
                const initials = label
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                const playerKey = getPlayerKey(player, index);
                const isFocused = playerKey === focusPlayerKey;
                const isTurn = playerKey === currentTurnKey;
                const tokenCount = getPresenceTokenCount(playerKey);
                return (
                  <div
                    key={player.id || player.label || index}
                    className={`presenceRow ${isFocused ? 'focused' : ''} ${isTurn ? 'turn' : ''}`}
                  >
                    <div className="presenceIdentity">
                      <div className="presenceAvatar">{initials || `P${index + 1}`}</div>
                      <div className="presenceInfo">
                        <strong>{label}</strong>
                        <span>{role}</span>
                      </div>
                    </div>
                    <div className="presenceActions">
                      <button
                        type="button"
                        className={`presenceChip ${sessionState.readyMap?.[playerKey] ? 'active' : ''}`}
                        onClick={() => handleToggleReady(playerKey)}
                      >
                        Ready
                      </button>
                      <button
                        type="button"
                        className={`presenceChip ${isFocused ? 'focus' : ''}`}
                        onClick={() => handleSetFocus(playerKey, index)}
                      >
                        Focus
                      </button>
                      <div className="presenceTokens" aria-label={`Spotlight tokens ${tokenCount} of ${PRESENCE_TOKEN_MAX}`}>
                        {Array.from({ length: PRESENCE_TOKEN_MAX }).map((_, tokenIndex) => (
                          <span key={`${playerKey}-token-${tokenIndex}`} className={tokenIndex < tokenCount ? 'active' : ''} />
                        ))}
                      </div>
                      <span className={`presenceStatus ${status.tone}`}>{status.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="presenceTurnOrder">
              <div className="presenceTurnHeader">
                <strong>Turn Order</strong>
                <span>{currentTurnLabel}</span>
              </div>
              <div className="presenceTurnChips">
                {turnOrder.map((playerKey) => {
                  const match = players
                    .slice(0, playersCount)
                    .find((player, index) => getPlayerKey(player, index) === playerKey);
                  const label = match?.label || match?.id || playerKey;
                  const isActive = playerKey === currentTurnKey;
                  return (
                    <span key={playerKey} className={isActive ? 'active' : ''}>
                      {label}
                    </span>
                  );
                })}
                {!turnOrder.length && <span className="empty">No turn order yet.</span>}
              </div>
              <div className="consoleButtonRow">
                <button type="button" className="ghost" onClick={() => handleBuildTurnOrder('ready')}>
                  From Ready
                </button>
                <button type="button" className="ghost" onClick={() => handleBuildTurnOrder('all')}>
                  All Seats
                </button>
                <button type="button" className="ghost" onClick={handleAdvanceTurn} disabled={!turnOrder.length}>
                  Advance
                </button>
                <button type="button" className="primary" onClick={handleFocusTurn} disabled={!currentTurnKey}>
                  Focus Turn
                </button>
                <button type="button" className="ghost" onClick={handlePassFocus}>
                  Pass Focus
                </button>
              </div>
            </div>
            <div className="presenceMechanics">
              <div className="presenceMechanicsHeader">
                <strong>Table Mechanics</strong>
                <span>{ritualActive ? 'Ritual Live' : 'Staging'}</span>
              </div>
              <div className="sceneClockRow">
                <span>Scene Pressure</span>
                <div
                  className="sceneClockMeter"
                  aria-label={`Scene pressure ${sceneClock} of ${SCENE_CLOCK_MAX}`}
                >
                  {Array.from({ length: SCENE_CLOCK_MAX + 1 }).map((_, index) => (
                    <span key={`scene-clock-${index}`} className={index <= sceneClock ? 'active' : ''} />
                  ))}
                </div>
                <em>{sceneClockLabel}</em>
              </div>
              <div className="sceneClockControls">
                <button type="button" className="ghost subtle" onClick={() => handleSceneClockAdjust(-1)}>
                  Ease
                </button>
                <button type="button" className="ghost subtle" onClick={() => handleSceneClockAdjust(1)}>
                  Press
                </button>
              </div>
              <div className="turnActionRow">
                <span>
                  {currentTurnKey
                    ? `${currentTurnLabel} actions ${currentTurnActions}/${TURN_ACTIONS_PER_TURN}`
                    : 'Build turn order to unlock table moves.'}
                </span>
                <div className="turnMoveButtons">
                  {TURN_MOVE_DEFINITIONS.map((move) => (
                    <button
                      key={move.id}
                      type="button"
                      className="ghost subtle"
                      title={move.detail}
                      onClick={() => handleApplyTurnMove(move.id)}
                      disabled={!ritualActive || !currentTurnKey || currentTurnActions <= 0}
                    >
                      {move.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="beatSyncRow">
                <span>Beat Sync</span>
                <div className="beatSyncMeter" aria-label={`Beat sync votes ${beatSyncVotes} of ${beatSyncRequired}`}>
                  <strong>
                    {beatSyncVotes}/{beatSyncRequired || 0}
                  </strong>
                  <em>{activeBeat?.label || 'Arrival'}</em>
                  <span className={beatSyncReady ? 'synced' : ''}>{beatSyncReady ? 'Synced' : 'Awaiting votes'}</span>
                </div>
              </div>
              <div className="beatSyncControls">
                <button type="button" className="ghost subtle" onClick={handleVoteCurrentBeat} disabled={!syncTargetKeys.length}>
                  Vote Beat
                </button>
                <button type="button" className="ghost subtle" onClick={handleClearBeatVotes} disabled={!Object.keys(beatVotes).length}>
                  Clear Votes
                </button>
              </div>
              <div className="vowStatusRow">
                <span>Ritual Vows</span>
                <div className="vowStatusChips">
                  {VOW_DEFINITIONS.map((vow) => (
                    <span key={vow.id} className={vows[vow.id] ? 'active' : ''}>
                      {vow.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="spotlightRow">
                <span>Spotlight Tokens</span>
                <div
                  className="spotlightMeter"
                  aria-label={`Spotlight tokens ${spotlightTokens} of ${PRESENCE_TOKEN_MAX}`}
                >
                  {Array.from({ length: PRESENCE_TOKEN_MAX }).map((_, index) => (
                    <span key={`spotlight-token-${index}`} className={index < spotlightTokens ? 'active' : ''} />
                  ))}
                </div>
                <em>{spotlightLabel}</em>
              </div>
              <div className="spotlightMoves">
                {SPOTLIGHT_MOVES.map((move) => (
                  <button
                    key={move.id}
                    type="button"
                    className="ghost subtle"
                    title={move.detail}
                    onClick={() => handleSpotlightMove(move.id)}
                    disabled={!spotlightKey || spotlightTokens <= 0}
                  >
                    {move.label}
                  </button>
                ))}
                <button type="button" className="ghost" onClick={handleRefreshPresenceTokens}>
                  Refresh Tokens
                </button>
              </div>
              <div className="resonanceRow">
                <div className="resonanceHeader">
                  <span>Resonance Call</span>
                  <em>{resonanceStreak ? `Streak ${resonanceStreak}` : 'No streak yet'}</em>
                </div>
                <p>
                  {resonancePending
                    ? `Open cue: "${resonanceCue}" · called by ${resonanceCallerLabel}`
                    : resonanceCue
                      ? `Last cue: "${resonanceCue}" · answered by ${resonanceAnswerLabel}`
                      : 'Call a short cue and let a different seat answer it.'}
                </p>
                <div className="resonanceInput">
                  <input
                    value={resonanceInput}
                    placeholder="Cue example: Name what the wind is carrying..."
                    onChange={(event) => setResonanceInput(event.target.value)}
                  />
                  <button
                    type="button"
                    className="ghost subtle"
                    onClick={handleStartResonance}
                    disabled={resonancePending}
                  >
                    Call
                  </button>
                  <button
                    type="button"
                    className="ghost subtle"
                    onClick={handleAnswerResonance}
                    disabled={!resonancePending}
                  >
                    Answer
                  </button>
                  <button
                    type="button"
                    className="ghost subtle"
                    onClick={handleClearResonance}
                    disabled={!resonancePending && !resonanceCue && !resonanceStreak}
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div className="collabMoves">
                <div className="collabMovesHeader">
                  <span>Co-Create Beats</span>
                  {sessionState.lastCollabMove?.label && (
                    <em>
                      {sessionState.lastCollabMove.label} · {sessionState.lastCollabMove.by || 'Table'}
                    </em>
                  )}
                </div>
                <div className="collabButtons">
                  {COLLAB_MOVES.map((move) => (
                    <button
                      key={move.id}
                      type="button"
                      className="ghost subtle"
                      title={move.detail}
                      onClick={() => handleCollabMove(move.id)}
                    >
                      {move.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="consoleButtonRow">
                <button type="button" className="ghost" onClick={handleStartRitual} disabled={ritualActive}>
                  Start Ritual
                </button>
                <button type="button" className="ghost" onClick={handleEndRitual} disabled={!ritualActive}>
                  End Ritual
                </button>
              </div>
            </div>
            <p className="consoleHint">
              Session {sessionId} • {playersCount} seats • Ready {readyCount}/{playersCount}
            </p>
          </div>
        </aside>

        <div className="arenaConsoleBoardStage" ref={boardStageRef}>
          {connectionMode === 'connecting' && pendingConnection?.sourceId && (
            <div className="arenaConsoleConnectionBanner">
              <div className="arenaConsoleConnectionBannerText">
                <strong>Connection Mode</strong>
                <span>
                  {connectionSourceCard?.entityName || connectionSourceCard?.name || 'Source'} → Select a target card
                </span>
              </div>
              <button type="button" className="ghost" onClick={handleCancelConnection}>
                Cancel (Esc)
              </button>
            </div>
          )}
          <div className="arenaConsoleStageRail">
            <div className="arenaConsoleStageRailStat">
              <span>Scene Beat</span>
              <strong>{activeBeat?.label || 'Arrival'}</strong>
            </div>
            <div className="arenaConsoleStageRailStat">
              <span>Focused Player</span>
              <strong>{focusPlayerLabel}</strong>
            </div>
            <div className="arenaConsoleStageRailStat">
              <span>Turn Holder</span>
              <strong>{currentTurnLabel}</strong>
            </div>
            <div className="arenaConsoleStageRailChips">
              <span>{`Ready ${readyCount}/${playersCount}`}</span>
              <span>{ritualActive ? 'Ritual Live' : 'Ritual Staging'}</span>
              <span>{`Pressure ${sceneClock}/${SCENE_CLOCK_MAX}`}</span>
              <span>{`Beat Sync ${beatSyncVotes}/${beatSyncRequired || 0}`}</span>
              <span>{resonancePending ? `Resonance Open: ${resonanceCallerLabel}` : `Resonance Streak ${resonanceStreak}`}</span>
              <span>{activeVows.length ? `Vows ${activeVows.map((vow) => vow.label).join('/')}` : 'Vows None'}</span>
              {currentTurnKey && <span>{`Actions ${currentTurnActions}/${TURN_ACTIONS_PER_TURN}`}</span>}
              {currentFlowStep && <span>{`Step ${currentFlowStepIndex}/${flowSteps.length}`}</span>}
              {currentFlowStep && <span>{currentFlowStep.title}</span>}
              {sceneGoal && <span>{`Goal ${sceneGoal}`}</span>}
              {sceneRisk && <span>{`Stakes ${sceneRisk}`}</span>}
              {threads.length > 0 && <span>{`Threads ${threads.length}`}</span>}
              <span>{`Mode ${phaseLabel}`}</span>
              <span>{`World ${worldProfile.worldName || 'Unnamed'}`}</span>
              <span>{`Mood ${worldProfile.mood || 'Unwritten'}`}</span>
              {worldProfile.era && <span>{`Era ${worldProfile.era}`}</span>}
              {worldProfile.conflict && <span>{`Conflict ${worldProfile.conflict}`}</span>}
              {worldProfile.wonder && <span>{`Wonder ${worldProfile.wonder}`}</span>}
              {worldProfile.sound && <span>{`Sound ${worldProfile.sound}`}</span>}
              {worldProfile.scent && <span>{`Scent ${worldProfile.scent}`}</span>}
              {worldProfile.texture && <span>{`Texture ${worldProfile.texture}`}</span>}
              {worldProfile.regions?.length > 0 && <span>{`Regions ${worldProfile.regions.length}`}</span>}
              {worldProfile.factions?.length > 0 && <span>{`Factions ${worldProfile.factions.length}`}</span>}
              {worldProfile.laws?.length > 0 && <span>{`Laws ${worldProfile.laws.length}`}</span>}
            </div>
            <div className="arenaConsoleStageRailActions">
              <button
                type="button"
                className="ghost"
                onClick={() => currentFlowStepId && scrollToFlowStep(currentFlowStepId)}
                disabled={!currentFlowStepId}
              >
                Open Step
              </button>
              <button type="button" className="primary" onClick={handleAdvanceBeat}>
                Advance Beat
              </button>
            </div>
          </div>

          <div className="arenaConsoleBoardViewport">
            <div
              className={`arenaConsoleBoard ${calibrationMode ? 'calibrating' : ''}`}
              ref={boardRef}
              style={{ backgroundImage: `url(${arenaMap.backgroundImage})` }}
              onMouseDown={handleCalibrationStart}
              onMouseMove={handleCalibrationMove}
              onMouseUp={handleCalibrationEnd}
              onMouseLeave={handleCalibrationEnd}
            >
              <div className="arenaConsoleBoardInner">
                {/* Edge Layer */}
                <svg className="arenaConsoleEdgeLayer" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="4"
                      markerHeight="4"
                      refX="3"
                      refY="2"
                      orient="auto"
                    >
                      <polygon points="0 0, 4 2, 0 4" fill="#6b7280" />
                    </marker>
                  </defs>
                  {arenaEdges.map((edge) => {
                    // Find positions for source and target
                    // We need to look through center slots and edge slots to find matching instanceIds
                    const findSlotPos = (instanceId) => {
                      if (!instanceId) return null;

                      // Check center
                      const centerIdx = arenaState.center.findIndex((s) => s.cardInstanceId === instanceId);
                      if (centerIdx !== -1) {
                        return arenaMap.centerSlots[centerIdx];
                      }

                      // Check edges
                      for (const [edgeKey, slots] of Object.entries(arenaState.edges)) {
                        const slotIdx = slots.findIndex((s) => s.cardInstanceId === instanceId);
                        if (slotIdx !== -1) {
                          return arenaMap.sideSlots[edgeKey]?.[slotIdx];
                        }
                      }
                      return null;
                    };

                    const sourcePos = findSlotPos(edge.sourceId);
                    const targetPos = findSlotPos(edge.targetId);

                    if (!sourcePos || !targetPos) return null;

                    return (
                      <EdgeLine
                        key={edge.edgeId}
                        edge={edge}
                        fromPosition={{ x: sourcePos.x, y: sourcePos.y }}
                        toPosition={{ x: targetPos.x, y: targetPos.y }}
                        isNew={false}
                      />
                    );
                  })}
                </svg>

                <div className="arenaConsoleEdgeLabels">
                  {edgeAssignments.map((edge) => {
                    const label = edge.player?.label || edge.player?.id || edge.edgeKey;
                    return (
                      <div
                        key={`label-${edge.edgeKey}`}
                        className={`arenaConsoleEdgeLabel edge-${edge.edgeKey} ${edge.isActive ? 'active' : ''}`}
                      >
                        <span className="edgeLabelName">{label}</span>
                        {edge.isActive && <span className="edgeLabelRole">You</span>}
                      </div>
                    );
                  })}
                </div>

                {arenaMap.centerSlots.map((slot, index) => {
                  const placed = arenaState.center[index];
                  const instanceId = placed?.cardInstanceId;
                  const isConnectionSource =
                    connectionMode === 'connecting' && pendingConnection?.sourceId === instanceId;
                  const isValidTarget =
                    connectionMode === 'connecting' && instanceId && instanceId !== pendingConnection?.sourceId;
                  const isInvalidTarget =
                    connectionMode === 'connecting' && !isValidTarget && !isConnectionSource;

                  return (
                    <div
                      key={slot.id}
                      className={`arenaConsoleSlot center ${showSlotOverlay ? 'debug' : ''} ${instanceId ? 'filled' : ''
                        } ${isConnectionSource ? 'connection-source' : ''} ${isValidTarget ? 'valid-target' : ''
                        } ${isInvalidTarget ? 'invalid-target' : ''}`}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: `${slot.w}%`,
                        height: `${slot.h}%`,
                        transform: `translate(-50%, -50%) rotate(${slot.rotate}deg)`
                      }}
                      onMouseEnter={() => setHoveredInstanceId(instanceId || '')}
                      onMouseLeave={() => setHoveredInstanceId('')}
                      onClick={() => isValidTarget && handleSelectTarget(instanceId)}
                    >
                      {instanceId ? (
                        renderSlotCard(instanceId, 'full')
                      ) : (
                        <span className="arenaConsoleSlotMarker">{slot.id}</span>
                      )}
                      {showSlotOverlay && <span className="arenaConsoleSlotTag">{slot.id}</span>}
                    </div>
                  );
                })}

                {edgeAssignments.map((edge) => {
                  const slots = arenaMap.sideSlots[edge.edgeKey] || [];
                  const stateSlots = arenaState.edges[edge.edgeKey] || [];
                  return slots.map((slot, index) => {
                    const placed = stateSlots[index];
                    const instanceId = placed?.cardInstanceId;
                    const isOwner = placed?.ownerPlayerId === activePlayerId;
                    const visibility = instanceId
                      ? isOwner
                        ? 'full'
                        : edgeRevealMode === 'sealed'
                          ? 'sealed'
                          : 'back'
                      : 'sealed';

                    const isConnectionSource =
                      connectionMode === 'connecting' && pendingConnection?.sourceId === instanceId;
                    const isVisibleTarget = visibility === 'full';
                    const isValidTarget =
                      connectionMode === 'connecting' &&
                      instanceId &&
                      instanceId !== pendingConnection?.sourceId &&
                      isVisibleTarget;
                    const isInvalidTarget =
                      connectionMode === 'connecting' &&
                      (!isValidTarget && !isConnectionSource);

                    return (
                      <div
                        key={slot.id}
                        className={`arenaConsoleSlot side ${showSlotOverlay ? 'debug' : ''} ${instanceId ? 'filled' : ''
                          } ${edge.isActive ? 'active' : ''} ${isConnectionSource ? 'connection-source' : ''
                          } ${isValidTarget ? 'valid-target' : ''} ${isInvalidTarget ? 'invalid-target' : ''
                          }`}
                        style={{
                          left: `${slot.x}%`,
                          top: `${slot.y}%`,
                          width: `${slot.w}%`,
                          height: `${slot.h}%`,
                          transform: `translate(-50%, -50%) rotate(${slot.rotate}deg)`
                        }}
                        onMouseEnter={() => setHoveredInstanceId(instanceId || '')}
                        onMouseLeave={() => setHoveredInstanceId('')}
                        onClick={() => isValidTarget && handleSelectTarget(instanceId)}
                      >
                        {instanceId ? (
                          renderSlotCard(instanceId, visibility)
                        ) : (
                          <span className="arenaConsoleSlotMarker">{slot.id}</span>
                        )}
                        {showSlotOverlay && <span className="arenaConsoleSlotTag">{slot.id}</span>}
                      </div>
                    );
                  });
                })}

                {calibrationDraft && (
                  <div
                    className="arenaConsoleCalibrationDraft"
                    style={{
                      left: `${calibrationDraft.x}%`,
                      top: `${calibrationDraft.y}%`,
                      width: `${calibrationDraft.w}%`,
                      height: `${calibrationDraft.h}%`
                    }}
                  />
                )}
                {calibrationSlots.map((slot) => (
                  <div
                    key={`${slot.group}-${slot.id}`}
                    className="arenaConsoleCalibrationSlot"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      width: `${slot.w}%`,
                      height: `${slot.h}%`
                    }}
                  >
                    <span>{slot.id}</span>
                  </div>
                ))}

                {recentPoints && (
                  <div key={recentPoints.id} className="pointsFloater">
                    +{recentPoints.amount} pts
                  </div>
                )}
              </div>
            </div>

            <div className="arenaConsoleInspect">
              <div className="arenaConsoleInspectHeader">
                <h3>Arena Inspect</h3>
                <div className="arenaConsoleInspectHeaderRight">
                  {activePlayer?.score > 0 && (
                    <div className="scoreDisplay">
                      <span>★</span>
                      <span>{activePlayer.score}</span>
                    </div>
                  )}
                </div>
              </div>

              {hoveredCard ? (
                <div className="arenaConsoleInspectCard">
                  <div className="arenaConsoleInspectMedia">
                    {hoveredCardFrontUrl ? (
                      <img src={hoveredCardFrontUrl} alt={hoveredCard.entityName || hoveredCard.name} />
                    ) : (
                      <div className="arenaConsoleInspectFallback">
                        {(hoveredCard.entityName || hoveredCard.name || '•')[0]}
                      </div>
                    )}
                  </div>
                  <div className="arenaConsoleInspectBody">
                    <h4>{hoveredCard.entityName || hoveredCard.name}</h4>
                    <div className="arenaConsoleInspectMeta">
                      {hoveredOwnerId && <span>Owner: {hoveredOwnerId}</span>}
                      {hoveredEdgesCount > 0 && <span>{hoveredEdgesCount} link{hoveredEdgesCount === 1 ? '' : 's'}</span>}
                    </div>
                    <p>{hoveredCard.front?.prompt || hoveredCard.back?.prompt || 'No prompt available.'}</p>
                    {hoveredCanConnect && connectionMode === 'idle' && (
                      <button type="button" className="primary" onClick={() => handleStartConnection(hoveredInstanceId)}>
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="consoleHint">Hover a card to inspect.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="arenaConsolePrivate">
        <div className="consoleDeck" ref={deckPanelRef}>
          <div className="consoleDeckHeader">
            <h3>Card Gallery</h3>
            <span>
              {activePlayer?.deck?.length || 0} cards
              {selectedDeckCount ? ` • ${selectedDeckCount} selected` : ''}
            </span>
          </div>
          {activePlayer?.deck?.length ? (
            <div className="consoleDeckGallery">
              {activePlayer.deck.map((instanceId) => {
                const instance = cardInstances[instanceId];
                const definition = instance ? cardDefinitions[instance.entityId] : null;
                const frontUrl = definition?.front?.imageUrl || definition?.imageUrl;
                const displayName = definition?.entityName || definition?.name || 'Card';
                const isSelected = Boolean(selectedDeckCards[instanceId]);
                return (
                  <div
                    key={instanceId}
                    className={`consoleDeckGalleryCard ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleDeckCardSelect(instanceId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleToggleDeckCardSelect(instanceId);
                      }
                    }}
                    title={displayName}
                  >
                    {frontUrl ? (
                      <img src={resolveAssetUrl(baseUrl, frontUrl)} alt={displayName} />
                    ) : (
                      <span>{displayName}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="consoleDeckStack">
              <div className="consoleDeckEmpty">Generate entities to fill your deck</div>
            </div>
          )}
          <div className="consoleButtonRow">
            <button type="button" className="ghost" onClick={handleDrawFromDeck} disabled={!activePlayer?.deck?.length}>
              Draw All
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleDrawSelectedFromGallery}
              disabled={!selectedDeckCount}
            >
              Draw Selected
            </button>
          </div>
        </div>


        <div className="consoleSpread" ref={spreadPanelRef}>
          <div className="consoleSpreadHeader">
            <div>
              <h3>Private Spread</h3>
              <p>
                {activeSpread?.label} formation{selectedSpreadCount ? ` • ${selectedSpreadCount} selected` : ''}
              </p>
            </div>
            <div className="consoleSpreadActions">
              <button type="button" className="ghost" onClick={() => placeSelectedCards('edge')} disabled={!selectedSpreadCount}>
                Place to Edge
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => placeSelectedCards('center')}
                disabled={!selectedSpreadCount}
              >
                Place to Center
              </button>
            </div>
          </div>
          <div className="consoleSpreadSurface">
            {activePlayer?.spreadSlots?.map((slot) => {
              const instanceId = slot.cardInstanceId;
              const selected = Boolean(activePlayer?.spreadSelected?.[slot.slotId]);
              return (
                <div
                  key={slot.slotId}
                  className={`consoleSpreadSlot ${instanceId ? 'filled' : ''} ${selected ? 'selected' : ''
                    }`}
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    width: `${slot.w}%`,
                    height: `${slot.h}%`
                  }}
                >
                  {instanceId ? (
                    <div className="consoleSpreadCard">
                      <ArenaCard
                        card={cardDefinitions[cardInstances[instanceId]?.entityId]}
                        baseUrl={baseUrl}
                        visibility="full"
                        flipped={!cardInstances[instanceId]?.faceUp}
                        size="md"
                        selected={selected}
                        onSelect={() => handleToggleSpreadSelect(slot.slotId)}
                        onFlip={() => handleToggleCardFace(instanceId)}
                      />
                      <button type="button" className="ghost subtle" onClick={() => handleReturnToDeck(slot.slotId)}>
                        Return to Deck
                      </button>
                    </div>
                  ) : (
                    <span>{slot.slotId}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="consoleStoryteller">
          <div className="consoleStorytellerHeader">
            <h3>Storyteller</h3>
            <span>
              {activePlayer?.storyteller?.list?.find((item) => item.id === activePlayer.storyteller.activeId)?.theme ||
                'Unbound'}
            </span>
          </div>
          <div className="consoleStorytellerMedallion">
            {(() => {
              const activeStoryteller = activePlayer?.storyteller?.list?.find(
                (item) => item.id === activePlayer.storyteller.activeId
              );
              if (activeStoryteller?.iconUrl) {
                return (
                  <img
                    src={resolveAssetUrl(baseUrl, activeStoryteller.iconUrl)}
                    alt={activeStoryteller.name}
                  />
                );
              }
              return <span>{activeStoryteller?.name?.[0] || 'S'}</span>;
            })()}
          </div>
          <p className="consoleHint">
            {activePlayer?.storyteller?.list?.find((item) => item.id === activePlayer.storyteller.activeId)?.name ||
              'Generate a storyteller to bind a theme.'}
          </p>
        </div>
      </section>

      <button
        type="button"
        className={`arenaConsoleDebugToggle ${debugOpen ? 'active' : ''}`}
        onClick={() => setDebugOpen((prev) => !prev)}
        aria-label="Toggle debug overlay"
      >
        DBG
      </button>

      {
        debugOpen && (
          <div className="arenaConsoleDebugPanel">
            <div className="debugRow">
              <label>
                <input
                  type="checkbox"
                  checked={showSlotOverlay}
                  onChange={(event) => setShowSlotOverlay(event.target.checked)}
                />
                Slot Overlay
              </label>
              <label>
                Edge Reveal
                <select value={edgeRevealMode} onChange={(event) => setEdgeRevealMode(event.target.value)}>
                  <option value="back">Back Only</option>
                  <option value="sealed">Sealed</option>
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={calibrationMode}
                  onChange={(event) => {
                    setCalibrationMode(event.target.checked);
                    setCalibrationDraft(null);
                  }}
                />
                Calibrate
              </label>
              <button type="button" className="ghost" onClick={() => setDebugDrawerOpen((prev) => !prev)}>
                {debugDrawerOpen ? 'Hide JSON' : 'Show JSON'}
              </button>
            </div>
            {calibrationMode && (
              <div className="debugRow">
                <label>
                  Slot Group
                  <select value={calibrationGroup} onChange={(event) => setCalibrationGroup(event.target.value)}>
                    <option value="center">Center</option>
                    {Object.keys(arenaMap.sideSlots).map((edgeKey) => (
                      <option key={edgeKey} value={edgeKey}>
                        {edgeKey}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="ghost" onClick={() => setCalibrationSlots([])}>
                  Clear
                </button>
                <button type="button" className="primary" onClick={handleCopyCalibration}>
                  Copy JSON
                </button>
              </div>
            )}
          </div>
        )
      }

      {
        debugDrawerOpen && (
          <div className="arenaConsoleDebugDrawer">
            <h4>Arena JSON</h4>
            <pre>{arenaSnapshot || JSON.stringify(arenaState, null, 2)}</pre>
          </div>
        )
      }

      {
        connectionMode === 'entering_text' && pendingConnection && (() => {
          const sourceCard = cardDefinitions[cardInstances[pendingConnection.sourceId]?.entityId];
          const targetCard = cardDefinitions[cardInstances[pendingConnection.targetId]?.entityId];
          return (
            <RelationshipInput
              sourceName={sourceCard?.entityName || sourceCard?.name || 'Source'}
              targetName={targetCard?.entityName || targetCard?.name || 'Target'}
              sourceImage={sourceCard?.front?.imageUrl ? resolveAssetUrl(baseUrl, sourceCard.front.imageUrl) : null}
              targetImage={targetCard?.front?.imageUrl ? resolveAssetUrl(baseUrl, targetCard.front.imageUrl) : null}
              onCancel={handleCancelConnection}
              onSubmit={handleRelationshipSubmit}
              onValidate={(text) =>
                validateRelationship(
                  sessionId,
                  activePlayerId,
                  pendingConnection?.sourceId,
                  pendingConnection?.targetId,
                  text,
                  baseUrl,
                  { mockApiCalls: MOCK_API_CALLS }
                )
              }
            />
          );
        })()
      }
    </div >
  );
};

export default StorytellerArenaConsole;

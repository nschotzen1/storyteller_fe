import React, { useEffect, useMemo, useState } from 'react';
import './StorytellerArenaWorkbench.css';
import ArenaBoard from './ArenaBoard';
import DeckStack from './DeckStack';
import SpreadBoard from './SpreadBoard';
import StorytellerVoicesBar from './StorytellerVoicesBar';
import { fetchSessionPlayers } from '../../api/storytellerSession';

const SPREAD_LAYOUTS = [
  {
    id: 'single',
    label: 'Single',
    requiredLevel: 1,
    slots: [{ id: 'single', label: 'Focus', x: 50, y: 50 }]
  },
  {
    id: 'pair',
    label: 'Pair',
    requiredLevel: 1,
    slots: [
      { id: 'left', label: 'Mirror', x: 38, y: 50 },
      { id: 'right', label: 'Shadow', x: 62, y: 50 }
    ]
  },
  {
    id: 'arc',
    label: 'Arc',
    requiredLevel: 2,
    slots: [
      { id: 'a1', label: 'Past', x: 26, y: 60 },
      { id: 'a2', label: 'Rift', x: 38, y: 44 },
      { id: 'a3', label: 'Core', x: 50, y: 38 },
      { id: 'a4', label: 'Signal', x: 62, y: 44 },
      { id: 'a5', label: 'Future', x: 74, y: 60 }
    ]
  },
  {
    id: 'crescent',
    label: 'Crescent',
    requiredLevel: 3,
    slots: [
      { id: 'c1', label: 'First', x: 24, y: 64 },
      { id: 'c2', label: 'Second', x: 32, y: 48 },
      { id: 'c3', label: 'Third', x: 42, y: 36 },
      { id: 'c4', label: 'Fourth', x: 56, y: 30 },
      { id: 'c5', label: 'Fifth', x: 70, y: 36 },
      { id: 'c6', label: 'Sixth', x: 78, y: 52 }
    ]
  },
  {
    id: 'horseshoe',
    label: 'Horseshoe',
    requiredLevel: 4,
    slots: [
      { id: 'h1', label: 'Gate', x: 20, y: 66 },
      { id: 'h2', label: 'Fang', x: 30, y: 52 },
      { id: 'h3', label: 'Center', x: 42, y: 40 },
      { id: 'h4', label: 'Veil', x: 58, y: 40 },
      { id: 'h5', label: 'Echo', x: 70, y: 52 },
      { id: 'h6', label: 'Omen', x: 80, y: 66 },
      { id: 'h7', label: 'Return', x: 50, y: 74 }
    ]
  },
  {
    id: 'cross',
    label: 'Cross',
    requiredLevel: 5,
    slots: [
      { id: 'x1', label: 'Above', x: 50, y: 18 },
      { id: 'x2', label: 'West', x: 30, y: 44 },
      { id: 'x3', label: 'Core', x: 50, y: 44 },
      { id: 'x4', label: 'East', x: 70, y: 44 },
      { id: 'x5', label: 'Below', x: 50, y: 70 },
      { id: 'x6', label: 'Hidden', x: 30, y: 70 },
      { id: 'x7', label: 'Witness', x: 70, y: 70 },
      { id: 'x8', label: 'Outcome', x: 50, y: 86 }
    ]
  }
];

const clampCards = (cards) => {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, 24);
};

const safeJson = (payload) => {
  if (!payload) return '';
  try {
    return JSON.stringify(payload, null, 2);
  } catch (err) {
    return String(payload);
  }
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

const createSpreadSlots = (layout) =>
  layout.slots.map((slot) => ({
    ...slot,
    card: null
  }));

const emptySideSlots = () =>
  Array.from({ length: 3 }, (_, index) => ({
    index,
    card: null,
    ownerPlayerId: null
  }));

const emptyCenterSlots = () =>
  Array.from({ length: 6 }, (_, index) => ({
    index,
    card: null,
    ownerPlayerId: null
  }));

const createPlayerState = (index, options = {}) => {
  const name = typeof options.playerName === 'string' ? options.playerName.trim() : '';
  const explicitId = typeof options.playerId === 'string' ? options.playerId.trim() : '';
  const isPrimary = index === 0 && (name || explicitId);
  const id = isPrimary ? explicitId || name : `player-${index + 1}`;
  const label = isPrimary ? name || explicitId : `Player ${index + 1}`;
  return {
    id,
    label,
    fragmentText:
      'A wind-scoured pass with a rusted watchtower and a lone courier arriving at dusk.',
    includeCards: true,
    includeFront: true,
    includeBack: true,
    debugMode: true,
    entityResponse: null,
    entityRequest: null,
    storytellerResponse: null,
    storytellerRequest: null,
    storytellerListResponse: null,
    storytellerListRequest: null,
    storytellerDetailResponse: null,
    storytellerDetailRequest: null,
    entitiesListResponse: null,
    entitiesListRequest: null,
    entityRefreshResponse: null,
    entityRefreshRequest: null,
    missionResponse: null,
    missionRequest: null,
    error: null,
    busy: false,
    deck: [],
    spreadLayoutId: SPREAD_LAYOUTS[0].id,
    spreadSlots: createSpreadSlots(SPREAD_LAYOUTS[0]),
    spreadSelected: {},
    spreadFlipped: {},
    activeStorytellerTheme: 'archivist',
    activeStorytellerId: '',
    storytellerCount: 3,
    generateKeyImages: false,
    entitiesFilter: {
      mainEntityId: '',
      isSubEntity: 'all'
    },
    selectedStorytellerId: '',
    selectedEntityId: '',
    refreshNote: 'Focus on hidden dangers or secret factions.',
    missionForm: {
      entityId: '',
      storytellerId: '',
      storytellingPoints: 12,
      message: 'Investigate the source of the whispering lanterns.',
      duration: 3
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

const serializeArena = (arena) => JSON.stringify(arena);

const StorytellerArenaWorkbench = ({
  initialSessionId = 'demo-1',
  initialPlayerName = '',
  initialPlayerId = '',
  lockPrimaryPlayerId = false
}) => {
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:5001');
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [playersCount, setPlayersCount] = useState(1);
  const [players, setPlayers] = useState([
    createPlayerState(0, { playerName: initialPlayerName, playerId: initialPlayerId })
  ]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [sessionPlayers, setSessionPlayers] = useState([]);
  const [arenaState, setArenaState] = useState({
    players: {},
    centerSlots: emptyCenterSlots()
  });
  const [arenaLastLoadedAt, setArenaLastLoadedAt] = useState('');
  const [arenaSnapshot, setArenaSnapshot] = useState('');
  const [showSlotOverlay, setShowSlotOverlay] = useState(false);
  const [revealOtherPlayers, setRevealOtherPlayers] = useState(false);
  const [revealMode, setRevealMode] = useState('back');

  const baseUrl = useMemo(() => {
    if (!apiBaseUrl) return '';
    return apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  }, [apiBaseUrl]);

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
    if (!baseUrl || !sessionId.trim()) {
      setSessionPlayers([]);
      return;
    }

    let isActive = true;
    const loadPlayers = async () => {
      try {
        const payload = await fetchSessionPlayers(baseUrl, sessionId.trim());
        const list = Array.isArray(payload?.players) ? payload.players : [];
        if (isActive) setSessionPlayers(list);
      } catch (err) {
        if (isActive) setSessionPlayers([]);
      }
    };

    loadPlayers();
    return () => {
      isActive = false;
    };
  }, [baseUrl, sessionId]);

  useEffect(() => {
    if (sessionPlayers.length === 0) return;
    setPlayers((prev) =>
      sessionPlayers.map((item, index) => {
        const playerId = item.playerId || item.id || '';
        const playerName = item.playerName || item.name || playerId || `Player ${index + 1}`;
        const existing = prev.find((player) => player.id === playerId);
        if (existing) {
          return { ...existing, id: playerId, label: playerName };
        }
        return createPlayerState(index, { playerName, playerId });
      })
    );
    setPlayersCount(sessionPlayers.length);
  }, [sessionPlayers]);

  const updatePlayerAt = (index, updater) => {
    setPlayers((prev) => prev.map((player, playerIndex) => (playerIndex === index ? updater(player) : player)));
  };

  const activePlayer = players[activePlayerIndex] || players[0];

  const storytellerVoices = useMemo(() => {
    if (!activePlayer) return [];
    const combined = [];
    coerceStorytellers(activePlayer.storytellerResponse).forEach((item, index) => {
      combined.push({ sourceIndex: index, ...item });
    });
    coerceStorytellers(activePlayer.storytellerListResponse).forEach((item, index) => {
      combined.push({ sourceIndex: index + 100, ...item });
    });
    const byId = new Map();
    combined.forEach((item, index) => {
      const id = item.id || item._id || item.storytellerId || item.name || `storyteller-${index}`;
      if (!id) return;
      const themeKey = pickThemeKey(item, index);
      byId.set(id, {
        id,
        name: item.name || id,
        status: item.status,
        themeKey,
        iconUrl: item.iconUrl || item.imageUrl || item.keyImageUrl || ''
      });
    });
    return Array.from(byId.values());
  }, [activePlayer]);

  const requestJson = async (path, options) => {
    const url = `${baseUrl}${path}`;
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

  const applySpreadLayout = (playerIndex, layoutId) => {
    const layout = SPREAD_LAYOUTS.find((item) => item.id === layoutId) || SPREAD_LAYOUTS[0];
    updatePlayerAt(playerIndex, (prev) => {
      const nextSlots = layout.slots.map((slot) => {
        const existing = prev.spreadSlots.find((item) => item.id === slot.id);
        return {
          ...slot,
          card: existing?.card || null
        };
      });
      return {
        ...prev,
        spreadLayoutId: layout.id,
        spreadSlots: nextSlots
      };
    });
  };

  const handleTextToEntity = async () => {
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
      includeCards: player.includeCards,
      includeFront: player.includeFront,
      includeBack: player.includeBack,
      debug: player.debugMode
    };
    try {
      const payload = await requestJson('/api/textToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      const nextCards = clampCards(payload?.cards || []);
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        entityRequest: requestPayload,
        entityResponse: payload,
        deck: nextCards,
        spreadSlots: createSpreadSlots(
          SPREAD_LAYOUTS.find((item) => item.id === prev.spreadLayoutId) || SPREAD_LAYOUTS[0]
        ),
        spreadSelected: {},
        spreadFlipped: {}
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
      count: Number(player.storytellerCount),
      generateKeyImages: player.generateKeyImages,
      mockImage: true,
      debug: player.debugMode
    };
    try {
      const payload = await requestJson('/api/textToStoryteller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        storytellerRequest: requestPayload,
        storytellerResponse: payload
      }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleLoadStorytellers = async () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const playerId = getPlayerIdForRequest(playerIndex, player);
    if (!playerId) return;
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    const requestPath = `/api/storytellers${buildQuery({ sessionId, playerId })}`;
    try {
      const payload = await requestJson(requestPath);
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        storytellerListRequest: { path: requestPath },
        storytellerListResponse: payload
      }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleLoadStorytellerDetail = async () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const playerId = getPlayerIdForRequest(playerIndex, player);
    if (!playerId) return;
    if (!player.selectedStorytellerId) {
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        error: 'Select a storyteller ID to load details.'
      }));
      return;
    }
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    const requestPath = `/api/storytellers/${player.selectedStorytellerId}${buildQuery({
      sessionId,
      playerId
    })}`;
    try {
      const payload = await requestJson(requestPath);
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        storytellerDetailRequest: { path: requestPath },
        storytellerDetailResponse: payload
      }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleLoadEntities = async () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const playerId = getPlayerIdForRequest(playerIndex, player);
    if (!playerId) return;
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    const requestPath = `/api/entities${buildQuery({
      sessionId,
      playerId,
      mainEntityId: player.entitiesFilter.mainEntityId,
      isSubEntity: player.entitiesFilter.isSubEntity === 'all' ? undefined : player.entitiesFilter.isSubEntity
    })}`;
    try {
      const payload = await requestJson(requestPath);
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        entitiesListRequest: { path: requestPath },
        entitiesListResponse: payload
      }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleRefreshEntity = async () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const playerId = getPlayerIdForRequest(playerIndex, player);
    if (!playerId) return;
    if (!player.selectedEntityId) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: 'Select an entity ID to refresh.' }));
      return;
    }
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    const requestPayload = {
      sessionId,
      playerId,
      note: player.refreshNote,
      debug: player.debugMode
    };
    try {
      const payload = await requestJson(`/api/entities/${player.selectedEntityId}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        entityRefreshRequest: requestPayload,
        entityRefreshResponse: payload
      }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleSendMission = async () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const playerId = getPlayerIdForRequest(playerIndex, player);
    if (!playerId) return;
    const entityId = player.missionForm.entityId || player.selectedEntityId;
    const storytellerId = player.missionForm.storytellerId || player.selectedStorytellerId;
    if (!entityId || !storytellerId) {
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        error: 'Select both an entity and storyteller for the mission.'
      }));
      return;
    }
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    const requestPayload = {
      sessionId,
      playerId,
      entityId,
      storytellerId,
      storytellingPoints: Number(player.missionForm.storytellingPoints),
      message: player.missionForm.message,
      duration: Number(player.missionForm.duration),
      debug: player.debugMode
    };
    try {
      const payload = await requestJson('/api/sendStorytellerToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        missionRequest: requestPayload,
        missionResponse: payload
      }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleDrawCard = () => {
    if (!activePlayer) return;
    const slotIndex = activePlayer.spreadSlots.findIndex((slot) => !slot.card);
    if (slotIndex === -1) {
      updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, error: 'No open slots in your spread.' }));
      return;
    }
    if (!activePlayer.deck.length) {
      updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, error: 'Deck is empty.' }));
      return;
    }
    const [nextCard, ...rest] = activePlayer.deck;
    updatePlayerAt(activePlayerIndex, (prev) => ({
      ...prev,
      deck: rest,
      spreadSlots: prev.spreadSlots.map((slot, index) =>
        index === slotIndex ? { ...slot, card: nextCard } : slot
      )
    }));
  };

  const handleShuffleDeck = () => {
    if (!activePlayer) return;
    const shuffled = [...activePlayer.deck].sort(() => Math.random() - 0.5);
    updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, deck: shuffled }));
  };

  const handleToggleSpreadSelect = (slotId) => {
    updatePlayerAt(activePlayerIndex, (prev) => ({
      ...prev,
      spreadSelected: { ...prev.spreadSelected, [slotId]: !prev.spreadSelected[slotId] }
    }));
  };

  const handleToggleSpreadFlip = (slotId) => {
    updatePlayerAt(activePlayerIndex, (prev) => ({
      ...prev,
      spreadFlipped: { ...prev.spreadFlipped, [slotId]: !prev.spreadFlipped[slotId] }
    }));
  };

  const handlePlaceToSide = (slotId) => {
    const slotIndex = activePlayer.spreadSlots.findIndex((slot) => slot.id === slotId);
    const card = activePlayer.spreadSlots[slotIndex]?.card;
    if (!card) return;
    setArenaState((prev) => {
      const current = prev.players[activePlayer.id] || {
        id: activePlayer.id,
        label: activePlayer.label,
        sideSlots: emptySideSlots(),
        storyteller: null
      };
      const emptyIndex = current.sideSlots.findIndex((slot) => !slot.card);
      if (emptyIndex === -1) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [activePlayer.id]: {
            ...current,
            sideSlots: current.sideSlots.map((slot) =>
              slot.index === emptyIndex ? { ...slot, card, ownerPlayerId: activePlayer.id } : slot
            )
          }
        }
      };
    });
    updatePlayerAt(activePlayerIndex, (prev) => ({
      ...prev,
      spreadSlots: prev.spreadSlots.map((slot) => (slot.id === slotId ? { ...slot, card: null } : slot))
    }));
  };

  const handlePlaceToCenter = (slotId) => {
    const slotIndex = activePlayer.spreadSlots.findIndex((slot) => slot.id === slotId);
    const card = activePlayer.spreadSlots[slotIndex]?.card;
    if (!card) return;
    setArenaState((prev) => {
      const emptyIndex = prev.centerSlots.findIndex((slot) => !slot.card);
      if (emptyIndex === -1) return prev;
      return {
        ...prev,
        centerSlots: prev.centerSlots.map((slot) =>
          slot.index === emptyIndex ? { ...slot, card, ownerPlayerId: activePlayer.id } : slot
        )
      };
    });
    updatePlayerAt(activePlayerIndex, (prev) => ({
      ...prev,
      spreadSlots: prev.spreadSlots.map((slot) => (slot.id === slotId ? { ...slot, card: null } : slot))
    }));
  };

  const handleSelectVoice = (voice) => {
    if (!voice) return;
    updatePlayerAt(activePlayerIndex, (prev) => ({
      ...prev,
      activeStorytellerId: voice.id,
      activeStorytellerTheme: voice.themeKey || 'archivist'
    }));
    setArenaState((prev) => ({
      ...prev,
      players: {
        ...prev.players,
        [activePlayer.id]: {
          ...(prev.players[activePlayer.id] || {
            id: activePlayer.id,
            label: activePlayer.label,
            sideSlots: emptySideSlots()
          }),
          storyteller: {
            id: voice.id,
            name: voice.name,
            iconUrl: voice.iconUrl || ''
          }
        }
      }
    }));
  };

  const handleSaveArena = async () => {
    const playerId = getPlayerIdForRequest(activePlayerIndex, activePlayer);
    if (!playerId) return;
    const requestPayload = {
      sessionId,
      playerId,
      arena: arenaState
    };
    updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    try {
      const payload = await requestJson(`/api/sessions/${encodeURIComponent(sessionId)}/arena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      const snapshot = serializeArena(arenaState);
      setArenaSnapshot(snapshot);
      setArenaLastLoadedAt(new Date().toLocaleTimeString());
      updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, arenaSaveResponse: payload }));
    } catch (err) {
      updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleLoadArena = async () => {
    const playerId = getPlayerIdForRequest(activePlayerIndex, activePlayer);
    if (!playerId) return;
    updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    try {
      const payload = await requestJson(
        `/api/sessions/${encodeURIComponent(sessionId)}/arena${buildQuery({ playerId })}`
      );
      const arena = payload?.arena || payload;
      const centerSlots = Array.isArray(arena?.centerSlots)
        ? arena.centerSlots.map((slot, index) => ({
            index: slot.index ?? index,
            card: slot.card || slot.entity || null,
            ownerPlayerId: slot.ownerPlayerId || slot.owner || null
          }))
        : emptyCenterSlots();
      const playersMap = arena?.players && typeof arena.players === 'object' ? arena.players : {};
      const normalizedPlayers = {};
      Object.entries(playersMap).forEach(([id, value]) => {
        normalizedPlayers[id] = {
          id,
          label: value?.label || value?.playerLabel || value?.playerName || id,
          sideSlots: Array.isArray(value?.sideSlots)
            ? value.sideSlots.map((slot, index) => ({
                index: slot.index ?? index,
                card: slot.card || slot.entity || null,
                ownerPlayerId: slot.ownerPlayerId || id
              }))
            : emptySideSlots(),
          storyteller: value?.storyteller || null
        };
      });
      const nextArena = { players: normalizedPlayers, centerSlots };
      setArenaState(nextArena);
      setArenaSnapshot(serializeArena(nextArena));
      setArenaLastLoadedAt(new Date().toLocaleTimeString());
      updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, arenaLoadResponse: payload }));
    } catch (err) {
      updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const orderedPlayers = useMemo(() => {
    const list = sessionPlayers.length
      ? sessionPlayers.map((player) => ({
          id: player.playerId || player.id,
          label: player.playerName || player.name || player.playerId || player.id
        }))
      : [{ id: activePlayer?.id || 'player-1', label: activePlayer?.label || 'You' }];

    const active = list.find((player) => player.id === activePlayer?.id) || list[0];
    const others = list.filter((player) => player.id !== active?.id);
    const ordered = [active, ...others].slice(0, 4);
    const placeholders = [];
    while (ordered.length + placeholders.length < 4) {
      placeholders.push({ id: `sealed-${placeholders.length}`, label: 'Sealed', sealed: true });
    }
    return [...ordered, ...placeholders].slice(0, 4).map((player) => ({
      ...player,
      sideSlots: arenaState.players[player.id]?.sideSlots || emptySideSlots()
    }));
  }, [sessionPlayers, activePlayer, arenaState.players]);

  const activeLayout =
    SPREAD_LAYOUTS.find((layout) => layout.id === activePlayer?.spreadLayoutId) || SPREAD_LAYOUTS[0];
  const activeBusy = activePlayer?.busy;
  const activeError = activePlayer?.error;
  const arenaDirty = arenaSnapshot && serializeArena(arenaState) !== arenaSnapshot;
  const isPrimaryPlayerLocked = lockPrimaryPlayerId && Boolean(initialPlayerId) && activePlayerIndex === 0;
  const hasRegisteredPlayers = sessionPlayers.length > 0;

  const renderPlayerTab = (player, index) => (
    <button
      key={player.id}
      type="button"
      className={`playerTab ${index === activePlayerIndex ? 'active' : ''}`}
      onClick={() => setActivePlayerIndex(index)}
    >
      {player.label}
    </button>
  );

  const JsonPanel = ({ title, payload, request }) => (
    <div className="jsonPanel">
      <div className="jsonPanelHeader">
        <p>{title}</p>
        <button
          type="button"
          className="ghost subtle"
          onClick={() => navigator.clipboard?.writeText(safeJson(payload))}
        >
          Copy
        </button>
      </div>
      {request && (
        <div className="jsonPanelRequest">
          <span>Request</span>
          <pre>{safeJson(request)}</pre>
        </div>
      )}
      <pre>{safeJson(payload) || 'Run the request to see JSON.'}</pre>
    </div>
  );

  if (!activePlayer) return null;

  return (
    <div className={`arenaWorkbench theme-${activePlayer.activeStorytellerTheme}`}>
      <header className="workbenchTop">
        <div>
          <p className="eyebrow">Storyteller Console</p>
          <h1>Hex Arena Workbench</h1>
          <p className="subhead">Route-complete operator surface with a playable arena stage.</p>
        </div>
        <div className="headerControls">
          <label>
            API Base URL
            <input
              type="text"
              placeholder="http://localhost:3000"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
            />
          </label>
          <label>
            Session ID
            <input type="text" value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
          </label>
        </div>
      </header>

      <section className="playerControls">
        <div className="playerMeta">
          <label>
            Players
            <select
              value={hasRegisteredPlayers ? activePlayer.id : playersCount}
              onChange={(event) => {
                if (hasRegisteredPlayers) {
                  const selectedId = event.target.value;
                  const nextIndex = players.findIndex((player) => player.id === selectedId);
                  if (nextIndex !== -1) setActivePlayerIndex(nextIndex);
                  return;
                }
                setPlayersCount(Number(event.target.value));
              }}
            >
              {hasRegisteredPlayers
                ? sessionPlayers.map((player, index) => {
                    const playerId = player.playerId || player.id || `player-${index + 1}`;
                    const playerName = player.playerName || player.name || playerId;
                    return (
                      <option key={playerId} value={playerId}>
                        {playerName}
                      </option>
                    );
                  })
                : [1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
            </select>
          </label>
          <label>
            Active Player ID
            <input
              type="text"
              value={activePlayer.id}
              disabled={isPrimaryPlayerLocked}
              onChange={(event) =>
                updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, id: event.target.value }))
              }
            />
          </label>
          <label>
            Active Player Label
            <input
              type="text"
              value={activePlayer.label}
              onChange={(event) =>
                updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, label: event.target.value }))
              }
            />
          </label>
          <label className="inlineToggle">
            <input type="checkbox" checked={showSlotOverlay} onChange={(event) => setShowSlotOverlay(event.target.checked)} />
            Show slot overlay
          </label>
          <label className="inlineToggle">
            <input
              type="checkbox"
              checked={revealOtherPlayers}
              onChange={(event) => setRevealOtherPlayers(event.target.checked)}
            />
            Reveal other players
          </label>
          {revealOtherPlayers && (
            <label>
              Reveal mode
              <select value={revealMode} onChange={(event) => setRevealMode(event.target.value)}>
                <option value="back">Back-only</option>
                <option value="full">Full</option>
              </select>
            </label>
          )}
        </div>
        <div className="playerTabs">{players.map(renderPlayerTab)}</div>
      </section>

      {activeError && (
        <div className="errorBanner" role="alert">
          {activeError}
        </div>
      )}

      <section className="workbenchBody">
        <div className="apiPanels">
          <div className="panel">
            <div className="panelHeader">
              <h2>Text to Entity</h2>
              <button type="button" className="primary" onClick={handleTextToEntity} disabled={activeBusy}>
                {activeBusy ? 'Working...' : 'Generate Entities'}
              </button>
            </div>
            <label>
              Input Fragment
              <textarea
                rows="4"
                value={activePlayer.fragmentText}
                onChange={(event) =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({
                    ...prev,
                    fragmentText: event.target.value
                  }))
                }
              />
            </label>
            <div className="toggleRow">
              <label>
                <input
                  type="checkbox"
                  checked={activePlayer.includeCards}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      includeCards: event.target.checked
                    }))
                  }
                />
                Include cards
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={activePlayer.includeFront}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      includeFront: event.target.checked
                    }))
                  }
                />
                Include front
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={activePlayer.includeBack}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      includeBack: event.target.checked
                    }))
                  }
                />
                Include back
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={activePlayer.debugMode}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      debugMode: event.target.checked
                    }))
                  }
                />
                Debug/mock
              </label>
            </div>
            <JsonPanel title="Response" payload={activePlayer.entityResponse} request={activePlayer.entityRequest} />
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Text to Storyteller</h2>
              <button type="button" className="primary" onClick={handleTextToStoryteller} disabled={activeBusy}>
                {activeBusy ? 'Working...' : 'Generate Storytellers'}
              </button>
            </div>
            <label>
              Storytellers Count
              <input
                type="number"
                min="1"
                max="10"
                value={activePlayer.storytellerCount}
                onChange={(event) =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({
                    ...prev,
                    storytellerCount: event.target.value
                  }))
                }
              />
            </label>
            <label className="inlineToggle">
              <input
                type="checkbox"
                checked={activePlayer.generateKeyImages}
                onChange={(event) =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({
                    ...prev,
                    generateKeyImages: event.target.checked
                  }))
                }
              />
              Generate key images
            </label>
            <JsonPanel title="Response" payload={activePlayer.storytellerResponse} request={activePlayer.storytellerRequest} />
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Storyteller Listing</h2>
              <button type="button" className="ghost" onClick={handleLoadStorytellers} disabled={activeBusy}>
                {activeBusy ? 'Loading...' : 'Load Storytellers'}
              </button>
            </div>
            <div className="listRow">
              <label>
                Select Storyteller ID
                <input
                  type="text"
                  placeholder="Paste storyteller id"
                  value={activePlayer.selectedStorytellerId}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      selectedStorytellerId: event.target.value
                    }))
                  }
                />
              </label>
              <button type="button" className="primary" onClick={handleLoadStorytellerDetail} disabled={activeBusy}>
                Load Detail
              </button>
            </div>
            <JsonPanel
              title="List Response"
              payload={activePlayer.storytellerListResponse}
              request={activePlayer.storytellerListRequest}
            />
            <JsonPanel
              title="Detail Response"
              payload={activePlayer.storytellerDetailResponse}
              request={activePlayer.storytellerDetailRequest}
            />
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Entity Listing</h2>
              <button type="button" className="ghost" onClick={handleLoadEntities} disabled={activeBusy}>
                {activeBusy ? 'Loading...' : 'Load Entities'}
              </button>
            </div>
            <div className="filterRow">
              <label>
                Main Entity ID
                <input
                  type="text"
                  value={activePlayer.entitiesFilter.mainEntityId}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      entitiesFilter: { ...prev.entitiesFilter, mainEntityId: event.target.value }
                    }))
                  }
                />
              </label>
              <label>
                Sub-entities
                <select
                  value={activePlayer.entitiesFilter.isSubEntity}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      entitiesFilter: { ...prev.entitiesFilter, isSubEntity: event.target.value }
                    }))
                  }
                >
                  <option value="all">All</option>
                  <option value="false">Main only</option>
                  <option value="true">Sub only</option>
                </select>
              </label>
            </div>
            <div className="listRow">
              <label>
                Selected Entity ID
                <input
                  type="text"
                  placeholder="Paste entity id"
                  value={activePlayer.selectedEntityId}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      selectedEntityId: event.target.value
                    }))
                  }
                />
              </label>
              <button type="button" className="primary" onClick={handleRefreshEntity} disabled={activeBusy}>
                Refresh Entity
              </button>
            </div>
            <label>
              Refresh Note
              <textarea
                rows="2"
                value={activePlayer.refreshNote}
                onChange={(event) =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({
                    ...prev,
                    refreshNote: event.target.value
                  }))
                }
              />
            </label>
            <JsonPanel
              title="List Response"
              payload={activePlayer.entitiesListResponse}
              request={activePlayer.entitiesListRequest}
            />
            <JsonPanel
              title="Refresh Response"
              payload={activePlayer.entityRefreshResponse}
              request={activePlayer.entityRefreshRequest}
            />
          </div>

          <div className="panel wide">
            <div className="panelHeader">
              <h2>Mission Dispatch</h2>
              <button type="button" className="primary" onClick={handleSendMission} disabled={activeBusy}>
                {activeBusy ? 'Sending...' : 'Send Storyteller'}
              </button>
            </div>
            <div className="formGrid">
              <label>
                Entity ID
                <input
                  type="text"
                  value={activePlayer.missionForm.entityId}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      missionForm: { ...prev.missionForm, entityId: event.target.value }
                    }))
                  }
                  placeholder="Uses selected entity if empty"
                />
              </label>
              <label>
                Storyteller ID
                <input
                  type="text"
                  value={activePlayer.missionForm.storytellerId}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      missionForm: { ...prev.missionForm, storytellerId: event.target.value }
                    }))
                  }
                  placeholder="Uses selected storyteller if empty"
                />
              </label>
              <label>
                Storytelling Points
                <input
                  type="number"
                  min="1"
                  value={activePlayer.missionForm.storytellingPoints}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      missionForm: { ...prev.missionForm, storytellingPoints: event.target.value }
                    }))
                  }
                />
              </label>
              <label>
                Duration (days)
                <input
                  type="number"
                  min="1"
                  value={activePlayer.missionForm.duration}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      missionForm: { ...prev.missionForm, duration: event.target.value }
                    }))
                  }
                />
              </label>
              <label className="formSpan">
                Mission Message
                <textarea
                  rows="3"
                  value={activePlayer.missionForm.message}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      missionForm: { ...prev.missionForm, message: event.target.value }
                    }))
                  }
                />
              </label>
            </div>
            <JsonPanel title="Response" payload={activePlayer.missionResponse} request={activePlayer.missionRequest} />
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>Arena Sync</h2>
              <div className="arenaSyncMeta">
                {arenaDirty && <span className="dirtyBadge">Dirty</span>}
                {arenaLastLoadedAt && <span className="timestamp">Last: {arenaLastLoadedAt}</span>}
              </div>
            </div>
            <div className="arenaSyncActions">
              <button type="button" className="primary" onClick={handleSaveArena} disabled={activeBusy}>
                Save Arena
              </button>
              <button type="button" className="ghost" onClick={handleLoadArena} disabled={activeBusy}>
                Load Arena
              </button>
            </div>
            <JsonPanel title="Save Response" payload={activePlayer.arenaSaveResponse} />
            <JsonPanel title="Load Response" payload={activePlayer.arenaLoadResponse} />
          </div>
        </div>

        <div className="stagePanel">
          {storytellerVoices.length > 0 && (
            <div className="voicesBlock">
              <p className="voicesLabel">Storyteller Voices</p>
              <StorytellerVoicesBar
                storytellers={storytellerVoices}
                activeId={activePlayer.activeStorytellerId}
                onSelect={handleSelectVoice}
              />
            </div>
          )}

          <div className="arenaStage">
            <div className="arenaStageHeader">
              <div>
                <h2>Shared Arena</h2>
                <p>Hex tile map with side rails and a ritual center.</p>
              </div>
              <div className="arenaStageControls">
                <label>
                  Layout
                  <select
                    value={activePlayer.spreadLayoutId}
                    onChange={(event) => applySpreadLayout(activePlayerIndex, event.target.value)}
                  >
                    {SPREAD_LAYOUTS.map((layout) => (
                      <option key={layout.id} value={layout.id}>
                        {layout.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <ArenaBoard
              baseUrl={baseUrl}
              players={orderedPlayers}
              activePlayerId={activePlayer.id}
              centerSlots={arenaState.centerSlots}
              showSlotOverlay={showSlotOverlay}
              revealOtherPlayers={revealOtherPlayers}
              revealMode={revealMode}
            />
          </div>

          <div className="privateStage">
            <DeckStack
              deck={activePlayer.deck}
              baseUrl={baseUrl}
              onDraw={handleDrawCard}
              onShuffle={handleShuffleDeck}
              debugReveal={activePlayer.debugMode}
            />
            <SpreadBoard
              layout={activeLayout}
              slots={activePlayer.spreadSlots}
              baseUrl={baseUrl}
              selectedMap={activePlayer.spreadSelected}
              flippedMap={activePlayer.spreadFlipped}
              onToggleSelect={handleToggleSpreadSelect}
              onToggleFlip={handleToggleSpreadFlip}
              onPlaceToSide={handlePlaceToSide}
              onPlaceToCenter={handlePlaceToCenter}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default StorytellerArenaWorkbench;

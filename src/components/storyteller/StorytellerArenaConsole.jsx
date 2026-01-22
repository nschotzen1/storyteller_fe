import React, { useEffect, useMemo, useRef, useState } from 'react';
import './StorytellerArenaConsole.css';
import ArenaCard from './ArenaCard';
import arenaMap from './arenaMaps/arenaMap.petalHex.v1.json';
import spreadPresets from './spreads.v1.json';
import { fetchSessionPlayers } from '../../api/storytellerSession';

const DEFAULT_FRAGMENT_TEXT =
  'A wind-scoured pass with a rusted watchtower and a lone courier arriving at dusk.';
const MOCK_API_CALLS = true;

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
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:5001');
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [playersCount, setPlayersCount] = useState(1);
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
  const boardRef = useRef(null);

  const baseUrl = useMemo(() => {
    if (!apiBaseUrl) return '';
    return apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  }, [apiBaseUrl]);

  const activePlayer = players[activePlayerIndex] || players[0];
  const activePlayerId = activePlayer?.id || '';
  const activeSpread = getSpreadById(activePlayer?.spreadId);

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
      />
    );
  };

  return (
    <div className={`arenaConsole theme-${activePlayer?.storyteller?.theme || 'archivist'}`}>
      <header className="arenaConsoleTopBar">
        <div className="arenaConsoleTitle">
          <p className="arenaConsoleEyebrow">Storyteller Arena Console</p>
          <h1>Shared Hex Arena</h1>
        </div>
        <div className="arenaConsoleTopControls">
          <label>
            Api Base
            <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
          </label>
          <label>
            Session
            <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
          </label>
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

          <div className="consolePanel">
            <h3>Entity Forge</h3>
            <label className="wide">
              Fragment
              <textarea
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
        </aside>

        <div className="arenaConsoleBoardStage">
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
              {arenaMap.centerSlots.map((slot, index) => {
                const placed = arenaState.center[index];
                const instanceId = placed?.cardInstanceId;
                return (
                  <div
                    key={slot.id}
                    className={`arenaConsoleSlot center ${showSlotOverlay ? 'debug' : ''} ${
                      instanceId ? 'filled' : ''
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
                  return (
                    <div
                      key={slot.id}
                      className={`arenaConsoleSlot side ${showSlotOverlay ? 'debug' : ''} ${
                        instanceId ? 'filled' : ''
                      } ${edge.isActive ? 'active' : ''}`}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                        width: `${slot.w}%`,
                        height: `${slot.h}%`,
                        transform: `translate(-50%, -50%) rotate(${slot.rotate}deg)`
                      }}
                      onMouseEnter={() => setHoveredInstanceId(instanceId || '')}
                      onMouseLeave={() => setHoveredInstanceId('')}
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
            </div>
          </div>

          <div className="arenaConsoleInspect">
            <div>
              <h3>Arena Inspect</h3>
              <p>Hover a card to inspect.</p>
            </div>
            {hoveredCard ? (
              <div className="arenaConsoleInspectCard">
                <h4>{hoveredCard.entityName || hoveredCard.name}</h4>
                {hoveredOwnerId && <span>Owner: {hoveredOwnerId}</span>}
                <p>{hoveredCard.front?.prompt || hoveredCard.back?.prompt || 'No prompt available.'}</p>
              </div>
            ) : (
              <p className="consoleHint">No card selected.</p>
            )}
          </div>
        </div>
      </section>

      <section className="arenaConsolePrivate">
        <div className="consoleDeck">
          <div className="consoleDeckHeader">
            <h3>Deck</h3>
            <span>{activePlayer?.deck?.length || 0} cards</span>
          </div>
          <div className="consoleDeckStack">
            {activePlayer?.deck?.length ? (
              activePlayer.deck.slice(0, 4).map((instanceId, index) => (
                <div key={instanceId} className={`consoleDeckCard slot-${index}`}>
                  {renderSlotCard(instanceId, 'back')}
                </div>
              ))
            ) : (
              <div className="consoleDeckEmpty">Empty</div>
            )}
          </div>
          <button type="button" className="primary" onClick={handleDrawFromDeck}>
            Draw to Spread
          </button>
        </div>

        <div className="consoleSpread">
          <div className="consoleSpreadHeader">
            <div>
              <h3>Private Spread</h3>
              <p>{activeSpread?.label} formation</p>
            </div>
            <div className="consoleSpreadActions">
              <button type="button" className="ghost" onClick={() => placeSelectedCards('edge')}>
                Place to Edge
              </button>
              <button type="button" className="primary" onClick={() => placeSelectedCards('center')}>
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
                  className={`consoleSpreadSlot ${instanceId ? 'filled' : ''} ${
                    selected ? 'selected' : ''
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

      {debugOpen && (
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
      )}

      {debugDrawerOpen && (
        <div className="arenaConsoleDebugDrawer">
          <h4>Arena JSON</h4>
          <pre>{arenaSnapshot || JSON.stringify(arenaState, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default StorytellerArenaConsole;

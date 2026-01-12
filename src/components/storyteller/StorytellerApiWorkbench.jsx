import React, { useEffect, useMemo, useState } from 'react';
import './StorytellerApiWorkbench.css';
import CardSpread, { SPREAD_PRESETS } from './CardSpread';
import EntityCard from './EntityCard';
import StorytellerVoicesBar from './StorytellerVoicesBar';

const clampCards = (cards) => {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, 8);
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

const resolveAssetUrl = (base, url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const THEMES = {
  archivist: {
    label: 'Archivist',
    tone: 'Catalog the fragments, keep the ink dry.'
  },
  hunter: {
    label: 'Hunter',
    tone: 'Track the signal through the cold noise.'
  },
  oracle: {
    label: 'Oracle',
    tone: 'Listen for the hush between the glyphs.'
  },
  defiler: {
    label: 'Defiler',
    tone: 'Handle the relics with gloves, then still record them.'
  }
};

const DEFAULT_FRAGMENT_TEXT =
  'A wind-scoured pass with a rusted watchtower and a lone courier arriving at dusk.';

const coerceStorytellers = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.storytellers)) return payload.storytellers;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const createPlayerState = (index) => ({
  id: `player-${index + 1}`,
  label: `Player ${index + 1}`,
  fragmentText: DEFAULT_FRAGMENT_TEXT,
  includeCards: true,
  includeFront: true,
  includeBack: true,
  debugMode: true,
  entityResponse: null,
  storytellerResponse: null,
  storytellerListResponse: null,
  storytellerDetailResponse: null,
  entitiesListResponse: null,
  entityRefreshResponse: null,
  missionResponse: null,
  error: null,
  busy: false,
  cards: [],
  cardFlips: {},
  selectedCards: {},
  cardLayoutMode: 'grid',
  spreadPreset: 'arc',
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
});

const pickThemeKey = (storyteller, index) => {
  const name = `${storyteller?.name || ''}`.toLowerCase();
  if (name.includes('oracle') || name.includes('seer') || name.includes('augur')) return 'oracle';
  if (name.includes('hunt') || name.includes('blade') || name.includes('warden')) return 'hunter';
  if (name.includes('archiv') || name.includes('scribe') || name.includes('librar')) return 'archivist';
  if (name.includes('defil') || name.includes('void') || name.includes('corrupt')) return 'defiler';
  const keys = Object.keys(THEMES);
  return keys[index % keys.length];
};

const StorytellerApiWorkbench = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:5001');
  const [sessionId, setSessionId] = useState('demo-1');
  const [playersCount, setPlayersCount] = useState(1);
  const [players, setPlayers] = useState([createPlayerState(0)]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [arenaCards, setArenaCards] = useState([]);
  const [arenaStorytellers, setArenaStorytellers] = useState([]);

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
        themeKey
      });
    });
    return Array.from(byId.values());
  }, [activePlayer]);

  const activeThemeTone = THEMES[activePlayer?.activeStorytellerTheme || 'archivist']?.tone || '';

  const getCardKey = (card, index) => card.entityId || card.entityName || `card-${index}`;

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

  const handleCardToggle = (playerIndex, cardKey) => {
    updatePlayerAt(playerIndex, (player) => ({
      ...player,
      cardFlips: { ...player.cardFlips, [cardKey]: !player.cardFlips[cardKey] }
    }));
  };

  const handleCardSelect = (playerIndex, cardKey) => {
    updatePlayerAt(playerIndex, (player) => ({
      ...player,
      selectedCards: { ...player.selectedCards, [cardKey]: !player.selectedCards[cardKey] }
    }));
  };

  const handleTextToEntity = async () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    try {
      const payload = await requestJson('/api/textToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerId: player.id,
          text: player.fragmentText,
          includeCards: player.includeCards,
          includeFront: player.includeFront,
          includeBack: player.includeBack,
          debug: player.debugMode
        })
      });
      const nextCards = clampCards(payload?.cards || []);
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        entityResponse: payload,
        cards: nextCards,
        cardFlips: {},
        selectedCards: {}
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
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    try {
      const payload = await requestJson('/api/textToStoryteller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerId: player.id,
          text: player.fragmentText,
          count: Number(player.storytellerCount),
          generateKeyImages: player.generateKeyImages,
          mockImage: true,
          debug: player.debugMode
        })
      });
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, storytellerResponse: payload }));
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
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    try {
      const payload = await requestJson(
        `/api/storytellers${buildQuery({ sessionId, playerId: player.id })}`
      );
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, storytellerListResponse: payload }));
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
    if (!player.selectedStorytellerId) {
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        error: 'Select a storyteller ID to load details.'
      }));
      return;
    }
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    try {
      const payload = await requestJson(
        `/api/storytellers/${player.selectedStorytellerId}${buildQuery({
          sessionId,
          playerId: player.id
        })}`
      );
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, storytellerDetailResponse: payload }));
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
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    try {
      const payload = await requestJson(
        `/api/entities${buildQuery({
          sessionId,
          playerId: player.id,
          mainEntityId: player.entitiesFilter.mainEntityId,
          isSubEntity:
            player.entitiesFilter.isSubEntity === 'all'
              ? undefined
              : player.entitiesFilter.isSubEntity
        })}`
      );
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, entitiesListResponse: payload }));
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
    if (!player.selectedEntityId) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: 'Select an entity ID to refresh.' }));
      return;
    }
    updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: true, error: null }));
    try {
      const payload = await requestJson(`/api/entities/${player.selectedEntityId}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerId: player.id,
          note: player.refreshNote,
          debug: player.debugMode
        })
      });
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, entityRefreshResponse: payload }));
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
    try {
      const payload = await requestJson('/api/sendStorytellerToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerId: player.id,
          entityId,
          storytellerId,
          storytellingPoints: Number(player.missionForm.storytellingPoints),
          message: player.missionForm.message,
          duration: Number(player.missionForm.duration),
          debug: player.debugMode
        })
      });
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, missionResponse: payload }));
    } catch (err) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: err.message }));
    } finally {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, busy: false }));
    }
  };

  const handleSelectVoice = (voice) => {
    const playerIndex = activePlayerIndex;
    if (!voice) return;
    updatePlayerAt(playerIndex, (prev) => ({
      ...prev,
      activeStorytellerId: voice.id,
      activeStorytellerTheme: voice.themeKey || 'archivist'
    }));
  };

  const handleAddSelectedCardsToArena = () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const selectedKeys = Object.keys(player.selectedCards).filter((key) => player.selectedCards[key]);
    if (selectedKeys.length === 0) {
      updatePlayerAt(playerIndex, (prev) => ({ ...prev, error: 'Select cards to add to the arena.' }));
      return;
    }
    setArenaCards((prev) => {
      const next = [...prev];
      const existing = new Set(prev.map((item) => item.id));
      selectedKeys.forEach((key) => {
        const card = player.cards.find((item, index) => getCardKey(item, index) === key);
        if (!card) return;
        const id = `${player.id}:${key}`;
        if (existing.has(id)) return;
        next.push({
          id,
          card,
          playerId: player.id,
          playerLabel: player.label
        });
        existing.add(id);
      });
      return next;
    });
  };

  const handleAddStorytellerToArena = () => {
    const playerIndex = activePlayerIndex;
    const player = players[playerIndex];
    if (!player) return;
    const storytellerId = player.activeStorytellerId || player.selectedStorytellerId;
    if (!storytellerId) {
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        error: 'Select a storyteller voice or ID to add to the arena.'
      }));
      return;
    }
    const storyteller =
      storytellerVoices.find((voice) => voice.id === storytellerId) ||
      coerceStorytellers(player.storytellerListResponse).find(
        (item) => item.id === storytellerId || item._id === storytellerId
      );
    if (!storyteller) {
      updatePlayerAt(playerIndex, (prev) => ({
        ...prev,
        error: 'Unable to resolve storyteller details for the arena.'
      }));
      return;
    }
    setArenaStorytellers((prev) => {
      const next = [...prev];
      const id = `${player.id}:${storytellerId}`;
      if (prev.some((item) => item.id === id)) return prev;
      next.push({
        id,
        storyteller,
        playerId: player.id,
        playerLabel: player.label
      });
      return next;
    });
  };

  const handleClearArena = () => {
    setArenaCards([]);
    setArenaStorytellers([]);
  };

  const selectedCardsCount = Object.values(activePlayer?.selectedCards || {}).filter(Boolean).length;

  const activeThemeClass = activePlayer?.activeStorytellerTheme || 'archivist';

  const activeBusy = activePlayer?.busy;
  const activeError = activePlayer?.error;

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

  if (!activePlayer) return null;

  return (
    <div className={`apiWorkbench theme-${activeThemeClass}`}>
      <header className="workbenchHeader">
        <div>
          <p className="eyebrow">Storyteller Backend Console</p>
          <h1>API Workbench</h1>
          <p className="subhead">
            Trigger every route, preview JSON, and stage up to 8 entity cards for selection and flip.
            {activeThemeTone && <span className="subheadTone"> {activeThemeTone}</span>}
          </p>
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
            <input
              type="text"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
            />
          </label>
        </div>
      </header>

      <section className="playerControls">
        <div className="playerMeta">
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
          <label>
            Active Player ID
            <input
              type="text"
              value={activePlayer.id}
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
        </div>
        <div className="playerTabs">{players.map(renderPlayerTab)}</div>
      </section>

      {activeError && (
        <div className="errorBanner" role="alert">
          {activeError}
        </div>
      )}

      <section className="workbenchGrid">
        <div className="panel">
          <div className="panelHeader">
            <h2>Text to Entity</h2>
            <button
              type="button"
              className="primary"
              onClick={handleTextToEntity}
              disabled={activeBusy}
            >
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
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(activePlayer.entityResponse) || 'Run the request to see JSON.'}</pre>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Text to Storyteller</h2>
            <button
              type="button"
              className="primary"
              onClick={handleTextToStoryteller}
              disabled={activeBusy}
            >
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
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(activePlayer.storytellerResponse) || 'Run the request to see JSON.'}</pre>
          </div>
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
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(activePlayer.storytellerListResponse) || 'Load storytellers to see JSON.'}</pre>
          </div>
          <div className="jsonBlock">
            <p>Detail Response</p>
            <pre>{safeJson(activePlayer.storytellerDetailResponse) || 'Load a storyteller detail.'}</pre>
          </div>
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
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(activePlayer.entitiesListResponse) || 'Load entities to see JSON.'}</pre>
          </div>
          <div className="jsonBlock">
            <p>Refresh Response</p>
            <pre>{safeJson(activePlayer.entityRefreshResponse) || 'Refresh an entity to see JSON.'}</pre>
          </div>
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
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(activePlayer.missionResponse) || 'Send a mission to see JSON.'}</pre>
          </div>
        </div>
      </section>

      <section className="cardSection">
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
        <div className="cardHeader">
          <div>
            <h2>{activePlayer.label} Deck</h2>
            <p>Loaded from Text to Entity (max 8). Select cards and flip front/back.</p>
          </div>
          <div className="cardHeaderControls">
            <div className="layoutToggle">
              <span>Layout</span>
              <button
                type="button"
                className={activePlayer.cardLayoutMode === 'grid' ? 'toggleActive' : ''}
                onClick={() =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, cardLayoutMode: 'grid' }))
                }
              >
                Grid
              </button>
              <button
                type="button"
                className={activePlayer.cardLayoutMode === 'spread' ? 'toggleActive' : ''}
                onClick={() =>
                  updatePlayerAt(activePlayerIndex, (prev) => ({ ...prev, cardLayoutMode: 'spread' }))
                }
              >
                Spread
              </button>
            </div>
            {activePlayer.cardLayoutMode === 'spread' && (
              <label className="spreadSelect">
                Spread
                <select
                  value={activePlayer.spreadPreset}
                  onChange={(event) =>
                    updatePlayerAt(activePlayerIndex, (prev) => ({
                      ...prev,
                      spreadPreset: event.target.value
                    }))
                  }
                >
                  {SPREAD_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="cardMeta">Selected: {selectedCardsCount}</div>
            <button type="button" className="ghost" onClick={handleAddSelectedCardsToArena}>
              Add Selected to Arena
            </button>
          </div>
        </div>
        {activePlayer.cardLayoutMode === 'grid' ? (
          <div className="cardGrid">
            {activePlayer.cards.length === 0 && (
              <div className="emptyState">No cards loaded yet. Run Text to Entity with cards.</div>
            )}
            {activePlayer.cards.map((card, index) => {
              const cardKey = getCardKey(card, index);
              const flipped = activePlayer.cardFlips[cardKey];
              const selected = activePlayer.selectedCards[cardKey];
              const frontUrl = resolveAssetUrl(baseUrl, card.front?.imageUrl);
              const backUrl = resolveAssetUrl(baseUrl, card.back?.imageUrl);
              return (
                <EntityCard
                  key={cardKey}
                  card={card}
                  frontUrl={frontUrl}
                  backUrl={backUrl}
                  flipped={flipped}
                  selected={selected}
                  layoutMode="grid"
                  onFlip={() => handleCardToggle(activePlayerIndex, cardKey)}
                  onSelect={() => handleCardSelect(activePlayerIndex, cardKey)}
                />
              );
            })}
          </div>
        ) : (
          <>
            {activePlayer.cards.length === 0 ? (
              <div className="emptyState">No cards loaded yet. Run Text to Entity with cards.</div>
            ) : (
              <CardSpread
                cards={activePlayer.cards}
                presetId={activePlayer.spreadPreset}
                getCardKey={getCardKey}
                selectedMap={activePlayer.selectedCards}
                renderCard={(card, index) => {
                  const cardKey = getCardKey(card, index);
                  const flipped = activePlayer.cardFlips[cardKey];
                  const selected = activePlayer.selectedCards[cardKey];
                  const frontUrl = resolveAssetUrl(baseUrl, card.front?.imageUrl);
                  const backUrl = resolveAssetUrl(baseUrl, card.back?.imageUrl);
                  return (
                    <EntityCard
                      card={card}
                      frontUrl={frontUrl}
                      backUrl={backUrl}
                      flipped={flipped}
                      selected={selected}
                      layoutMode="spread"
                      onFlip={() => handleCardToggle(activePlayerIndex, cardKey)}
                      onSelect={() => handleCardSelect(activePlayerIndex, cardKey)}
                    />
                  );
                }}
              />
            )}
          </>
        )}
      </section>

      <section className="arenaSection">
        <div className="arenaHeader">
          <div>
            <h2>Arena</h2>
            <p>Shared space for entities and storytellers placed by any player.</p>
          </div>
          <div className="arenaControls">
            <button type="button" className="ghost" onClick={handleAddStorytellerToArena}>
              Add Storyteller to Arena
            </button>
            <button type="button" className="ghost" onClick={handleClearArena}>
              Clear Arena
            </button>
          </div>
        </div>
        <div className="arenaBlock">
          <h3>Storytellers</h3>
          {arenaStorytellers.length === 0 ? (
            <div className="emptyState">No storytellers placed yet.</div>
          ) : (
            <div className="arenaStorytellers">
              {arenaStorytellers.map((item) => (
                <div key={item.id} className="arenaStorytellerChip">
                  <span>{item.storyteller?.name || item.storyteller?.id || 'Storyteller'}</span>
                  <span className="arenaMeta">{item.playerLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="arenaBlock">
          <h3>Entities</h3>
          {arenaCards.length === 0 ? (
            <div className="emptyState">No entity cards placed yet.</div>
          ) : (
            <div className="arenaGrid">
              {arenaCards.map((item) => {
                const frontUrl = resolveAssetUrl(baseUrl, item.card.front?.imageUrl);
                const backUrl = resolveAssetUrl(baseUrl, item.card.back?.imageUrl);
                return (
                  <div key={item.id} className="arenaCard">
                    <EntityCard
                      card={item.card}
                      frontUrl={frontUrl}
                      backUrl={backUrl}
                      flipped={false}
                      selected={false}
                      layoutMode="grid"
                      onFlip={() => {}}
                      onSelect={() => {}}
                    />
                    <div className="arenaMeta">{item.playerLabel}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default StorytellerApiWorkbench;

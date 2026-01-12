import React, { useMemo, useState } from 'react';
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
  const keys = Object.keys(THEMES);
  return keys[index % keys.length];
};

const StorytellerApiWorkbench = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:5001');
  const [sessionId, setSessionId] = useState('demo-1');
  const [fragmentText, setFragmentText] = useState(
    'A wind-scoured pass with a rusted watchtower and a lone courier arriving at dusk.'
  );

  const [includeCards, setIncludeCards] = useState(true);
  const [includeFront, setIncludeFront] = useState(true);
  const [includeBack, setIncludeBack] = useState(true);
  const [debugMode, setDebugMode] = useState(true);

  const [entityResponse, setEntityResponse] = useState(null);
  const [storytellerResponse, setStorytellerResponse] = useState(null);
  const [storytellerListResponse, setStorytellerListResponse] = useState(null);
  const [storytellerDetailResponse, setStorytellerDetailResponse] = useState(null);
  const [entitiesListResponse, setEntitiesListResponse] = useState(null);
  const [entityRefreshResponse, setEntityRefreshResponse] = useState(null);
  const [missionResponse, setMissionResponse] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [cards, setCards] = useState([]);
  const [cardFlips, setCardFlips] = useState({});
  const [selectedCards, setSelectedCards] = useState({});
  const [cardLayoutMode, setCardLayoutMode] = useState('grid');
  const [spreadPreset, setSpreadPreset] = useState('arc');

  const [activeStorytellerTheme, setActiveStorytellerTheme] = useState('archivist');
  const [activeStorytellerId, setActiveStorytellerId] = useState('');

  const [storytellerCount, setStorytellerCount] = useState(3);
  const [generateKeyImages, setGenerateKeyImages] = useState(false);

  const [entitiesFilter, setEntitiesFilter] = useState({
    mainEntityId: '',
    isSubEntity: 'all'
  });

  const [selectedStorytellerId, setSelectedStorytellerId] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  const [refreshNote, setRefreshNote] = useState('Focus on hidden dangers or secret factions.');

  const [missionForm, setMissionForm] = useState({
    entityId: '',
    storytellerId: '',
    storytellingPoints: 12,
    message: 'Investigate the source of the whispering lanterns.',
    duration: 3
  });

  const baseUrl = useMemo(() => {
    if (!apiBaseUrl) return '';
    return apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  }, [apiBaseUrl]);

  const storytellerVoices = useMemo(() => {
    const combined = [];
    coerceStorytellers(storytellerResponse).forEach((item, index) => {
      combined.push({ sourceIndex: index, ...item });
    });
    coerceStorytellers(storytellerListResponse).forEach((item, index) => {
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
  }, [storytellerResponse, storytellerListResponse]);

  const activeThemeTone = THEMES[activeStorytellerTheme]?.tone || '';

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

  const handleCardToggle = (cardKey) => {
    setCardFlips((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  const handleCardSelect = (cardKey) => {
    setSelectedCards((prev) => ({ ...prev, [cardKey]: !prev[cardKey] }));
  };

  const handleTextToEntity = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await requestJson('/api/textToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text: fragmentText,
          includeCards,
          includeFront,
          includeBack,
          debug: debugMode
        })
      });
      setEntityResponse(payload);
      const nextCards = clampCards(payload?.cards || []);
      setCards(nextCards);
      setCardFlips({});
      setSelectedCards({});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTextToStoryteller = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await requestJson('/api/textToStoryteller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          text: fragmentText,
          count: Number(storytellerCount),
          generateKeyImages,
          mockImage: true,
          debug: debugMode
        })
      });
      setStorytellerResponse(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadStorytellers = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await requestJson(`/api/storytellers${buildQuery({ sessionId })}`);
      setStorytellerListResponse(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadStorytellerDetail = async () => {
    if (!selectedStorytellerId) {
      setError('Select a storyteller ID to load details.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await requestJson(
        `/api/storytellers/${selectedStorytellerId}${buildQuery({ sessionId })}`
      );
      setStorytellerDetailResponse(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadEntities = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await requestJson(
        `/api/entities${buildQuery({
          sessionId,
          mainEntityId: entitiesFilter.mainEntityId,
          isSubEntity: entitiesFilter.isSubEntity === 'all' ? undefined : entitiesFilter.isSubEntity
        })}`
      );
      setEntitiesListResponse(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshEntity = async () => {
    if (!selectedEntityId) {
      setError('Select an entity ID to refresh.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await requestJson(`/api/entities/${selectedEntityId}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          note: refreshNote,
          debug: debugMode
        })
      });
      setEntityRefreshResponse(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSendMission = async () => {
    const entityId = missionForm.entityId || selectedEntityId;
    const storytellerId = missionForm.storytellerId || selectedStorytellerId;
    if (!entityId || !storytellerId) {
      setError('Select both an entity and storyteller for the mission.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await requestJson('/api/sendStorytellerToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          entityId,
          storytellerId,
          storytellingPoints: Number(missionForm.storytellingPoints),
          message: missionForm.message,
          duration: Number(missionForm.duration),
          debug: debugMode
        })
      });
      setMissionResponse(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectVoice = (voice) => {
    if (!voice) return;
    setActiveStorytellerId(voice.id);
    setActiveStorytellerTheme(voice.themeKey || 'archivist');
  };

  const selectedCardsCount = Object.values(selectedCards).filter(Boolean).length;

  return (
    <div className={`apiWorkbench theme-${activeStorytellerTheme}`}>
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

      {error && (
        <div className="errorBanner" role="alert">
          {error}
        </div>
      )}

      <section className="workbenchGrid">
        <div className="panel">
          <div className="panelHeader">
            <h2>Text to Entity</h2>
            <button type="button" className="primary" onClick={handleTextToEntity} disabled={busy}>
              {busy ? 'Working...' : 'Generate Entities'}
            </button>
          </div>
          <label>
            Input Fragment
            <textarea
              rows="4"
              value={fragmentText}
              onChange={(event) => setFragmentText(event.target.value)}
            />
          </label>
          <div className="toggleRow">
            <label>
              <input
                type="checkbox"
                checked={includeCards}
                onChange={(event) => setIncludeCards(event.target.checked)}
              />
              Include cards
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeFront}
                onChange={(event) => setIncludeFront(event.target.checked)}
              />
              Include front
            </label>
            <label>
              <input
                type="checkbox"
                checked={includeBack}
                onChange={(event) => setIncludeBack(event.target.checked)}
              />
              Include back
            </label>
            <label>
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(event) => setDebugMode(event.target.checked)}
              />
              Debug/mock
            </label>
          </div>
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(entityResponse) || 'Run the request to see JSON.'}</pre>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Text to Storyteller</h2>
            <button type="button" className="primary" onClick={handleTextToStoryteller} disabled={busy}>
              {busy ? 'Working...' : 'Generate Storytellers'}
            </button>
          </div>
          <label>
            Storytellers Count
            <input
              type="number"
              min="1"
              max="10"
              value={storytellerCount}
              onChange={(event) => setStorytellerCount(event.target.value)}
            />
          </label>
          <label className="inlineToggle">
            <input
              type="checkbox"
              checked={generateKeyImages}
              onChange={(event) => setGenerateKeyImages(event.target.checked)}
            />
            Generate key images
          </label>
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(storytellerResponse) || 'Run the request to see JSON.'}</pre>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Storyteller Listing</h2>
            <button type="button" className="ghost" onClick={handleLoadStorytellers} disabled={busy}>
              {busy ? 'Loading...' : 'Load Storytellers'}
            </button>
          </div>
          <div className="listRow">
            <label>
              Select Storyteller ID
              <input
                type="text"
                placeholder="Paste storyteller id"
                value={selectedStorytellerId}
                onChange={(event) => setSelectedStorytellerId(event.target.value)}
              />
            </label>
            <button type="button" className="primary" onClick={handleLoadStorytellerDetail} disabled={busy}>
              Load Detail
            </button>
          </div>
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(storytellerListResponse) || 'Load storytellers to see JSON.'}</pre>
          </div>
          <div className="jsonBlock">
            <p>Detail Response</p>
            <pre>{safeJson(storytellerDetailResponse) || 'Load a storyteller detail.'}</pre>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h2>Entity Listing</h2>
            <button type="button" className="ghost" onClick={handleLoadEntities} disabled={busy}>
              {busy ? 'Loading...' : 'Load Entities'}
            </button>
          </div>
          <div className="filterRow">
            <label>
              Main Entity ID
              <input
                type="text"
                value={entitiesFilter.mainEntityId}
                onChange={(event) =>
                  setEntitiesFilter((prev) => ({ ...prev, mainEntityId: event.target.value }))
                }
              />
            </label>
            <label>
              Sub-entities
              <select
                value={entitiesFilter.isSubEntity}
                onChange={(event) =>
                  setEntitiesFilter((prev) => ({ ...prev, isSubEntity: event.target.value }))
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
                value={selectedEntityId}
                onChange={(event) => setSelectedEntityId(event.target.value)}
              />
            </label>
            <button type="button" className="primary" onClick={handleRefreshEntity} disabled={busy}>
              Refresh Entity
            </button>
          </div>
          <label>
            Refresh Note
            <textarea
              rows="2"
              value={refreshNote}
              onChange={(event) => setRefreshNote(event.target.value)}
            />
          </label>
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(entitiesListResponse) || 'Load entities to see JSON.'}</pre>
          </div>
          <div className="jsonBlock">
            <p>Refresh Response</p>
            <pre>{safeJson(entityRefreshResponse) || 'Refresh an entity to see JSON.'}</pre>
          </div>
        </div>

        <div className="panel wide">
          <div className="panelHeader">
            <h2>Mission Dispatch</h2>
            <button type="button" className="primary" onClick={handleSendMission} disabled={busy}>
              {busy ? 'Sending...' : 'Send Storyteller'}
            </button>
          </div>
          <div className="formGrid">
            <label>
              Entity ID
              <input
                type="text"
                value={missionForm.entityId}
                onChange={(event) =>
                  setMissionForm((prev) => ({ ...prev, entityId: event.target.value }))
                }
                placeholder="Uses selected entity if empty"
              />
            </label>
            <label>
              Storyteller ID
              <input
                type="text"
                value={missionForm.storytellerId}
                onChange={(event) =>
                  setMissionForm((prev) => ({ ...prev, storytellerId: event.target.value }))
                }
                placeholder="Uses selected storyteller if empty"
              />
            </label>
            <label>
              Storytelling Points
              <input
                type="number"
                min="1"
                value={missionForm.storytellingPoints}
                onChange={(event) =>
                  setMissionForm((prev) => ({
                    ...prev,
                    storytellingPoints: event.target.value
                  }))
                }
              />
            </label>
            <label>
              Duration (days)
              <input
                type="number"
                min="1"
                value={missionForm.duration}
                onChange={(event) =>
                  setMissionForm((prev) => ({ ...prev, duration: event.target.value }))
                }
              />
            </label>
            <label className="formSpan">
              Mission Message
              <textarea
                rows="3"
                value={missionForm.message}
                onChange={(event) =>
                  setMissionForm((prev) => ({ ...prev, message: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="jsonBlock">
            <p>Response</p>
            <pre>{safeJson(missionResponse) || 'Send a mission to see JSON.'}</pre>
          </div>
        </div>
      </section>

      <section className="cardSection">
        {storytellerVoices.length > 0 && (
          <div className="voicesBlock">
            <p className="voicesLabel">Storyteller Voices</p>
            <StorytellerVoicesBar
              storytellers={storytellerVoices}
              activeId={activeStorytellerId}
              onSelect={handleSelectVoice}
            />
          </div>
        )}
        <div className="cardHeader">
          <div>
            <h2>Entity Cards</h2>
            <p>Loaded from Text to Entity (max 8). Select cards and flip front/back.</p>
          </div>
          <div className="cardHeaderControls">
            <div className="layoutToggle">
              <span>Layout</span>
              <button
                type="button"
                className={cardLayoutMode === 'grid' ? 'toggleActive' : ''}
                onClick={() => setCardLayoutMode('grid')}
              >
                Grid
              </button>
              <button
                type="button"
                className={cardLayoutMode === 'spread' ? 'toggleActive' : ''}
                onClick={() => setCardLayoutMode('spread')}
              >
                Spread
              </button>
            </div>
            {cardLayoutMode === 'spread' && (
              <label className="spreadSelect">
                Spread
                <select value={spreadPreset} onChange={(event) => setSpreadPreset(event.target.value)}>
                  {SPREAD_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="cardMeta">Selected: {selectedCardsCount}</div>
          </div>
        </div>
        {cardLayoutMode === 'grid' ? (
          <div className="cardGrid">
            {cards.length === 0 && (
              <div className="emptyState">No cards loaded yet. Run Text to Entity with cards.</div>
            )}
            {cards.map((card, index) => {
              const cardKey = getCardKey(card, index);
              const flipped = cardFlips[cardKey];
              const selected = selectedCards[cardKey];
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
                  onFlip={() => handleCardToggle(cardKey)}
                  onSelect={() => handleCardSelect(cardKey)}
                />
              );
            })}
          </div>
        ) : (
          <>
            {cards.length === 0 ? (
              <div className="emptyState">No cards loaded yet. Run Text to Entity with cards.</div>
            ) : (
              <CardSpread
                cards={cards}
                presetId={spreadPreset}
                getCardKey={getCardKey}
                selectedMap={selectedCards}
                renderCard={(card, index) => {
                  const cardKey = getCardKey(card, index);
                  const flipped = cardFlips[cardKey];
                  const selected = selectedCards[cardKey];
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
                      onFlip={() => handleCardToggle(cardKey)}
                      onSelect={() => handleCardSelect(cardKey)}
                    />
                  );
                }}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default StorytellerApiWorkbench;

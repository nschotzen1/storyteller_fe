import React, { useEffect, useMemo, useState } from 'react';
import './StorytellerArena.css';
import { fetchSessionPlayers } from '../../api/storytellerSession';

const SPREAD_LAYOUTS = [
  {
    id: 'triad',
    label: 'Triad',
    slots: [
      { id: 'left', label: 'Echo', x: 20, y: 62 },
      { id: 'center', label: 'Anchor', x: 50, y: 38 },
      { id: 'right', label: 'Omen', x: 80, y: 62 }
    ]
  },
  {
    id: 'cross',
    label: 'Cross',
    slots: [
      { id: 'north', label: 'Above', x: 50, y: 18 },
      { id: 'west', label: 'West', x: 26, y: 46 },
      { id: 'center', label: 'Heart', x: 50, y: 46 },
      { id: 'east', label: 'East', x: 74, y: 46 },
      { id: 'south', label: 'Below', x: 50, y: 74 }
    ]
  },
  {
    id: 'crescent',
    label: 'Crescent',
    slots: [
      { id: 'c1', label: 'First', x: 18, y: 66 },
      { id: 'c2', label: 'Second', x: 30, y: 46 },
      { id: 'c3', label: 'Third', x: 45, y: 30 },
      { id: 'c4', label: 'Fourth', x: 62, y: 24 },
      { id: 'c5', label: 'Fifth', x: 76, y: 34 },
      { id: 'c6', label: 'Sixth', x: 84, y: 54 }
    ]
  }
];

const clampCards = (cards) => {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, 24);
};

const resolveAssetUrl = (base, url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const createSpreadSlots = (layout) =>
  layout.slots.map((slot) => ({
    ...slot,
    card: null
  }));

const emptySideSlots = () =>
  Array.from({ length: 3 }, (_, index) => ({
    index,
    card: null
  }));

const emptyCenterSlots = () =>
  Array.from({ length: 6 }, (_, index) => ({
    index,
    card: null,
    owner: null
  }));

const StorytellerArena = ({
  initialSessionId = 'demo-1',
  initialPlayerId = '',
  initialPlayerName = '',
  apiBaseUrl = 'http://localhost:5001'
}) => {
  const [baseUrl, setBaseUrl] = useState(apiBaseUrl);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [playerId, setPlayerId] = useState(initialPlayerId || 'player-1');
  const [playerName, setPlayerName] = useState(initialPlayerName || 'You');
  const [sessionPlayers, setSessionPlayers] = useState([]);
  const [deck, setDeck] = useState([]);
  const [fragmentText, setFragmentText] = useState(
    'A wind-scoured pass with a rusted watchtower and a lone courier arriving at dusk.'
  );
  const [spreadLayoutId, setSpreadLayoutId] = useState(SPREAD_LAYOUTS[0].id);
  const [spreadSlots, setSpreadSlots] = useState(createSpreadSlots(SPREAD_LAYOUTS[0]));
  const [arenaState, setArenaState] = useState({
    players: {},
    centerSlots: emptyCenterSlots()
  });
  const [storytellers, setStorytellers] = useState([]);
  const [activeStorytellerId, setActiveStorytellerId] = useState('');
  const [previewCard, setPreviewCard] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const normalizedBaseUrl = useMemo(() => {
    if (!baseUrl) return '';
    return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }, [baseUrl]);

  useEffect(() => {
    const layout = SPREAD_LAYOUTS.find((item) => item.id === spreadLayoutId) || SPREAD_LAYOUTS[0];
    setSpreadSlots((prev) => {
      const next = layout.slots.map((slot) => {
        const existing = prev.find((item) => item.id === slot.id);
        return { ...slot, card: existing?.card || null };
      });
      return next;
    });
  }, [spreadLayoutId]);

  useEffect(() => {
    if (!normalizedBaseUrl || !sessionId) return;
    let active = true;
    fetchSessionPlayers(normalizedBaseUrl, sessionId)
      .then((payload) => {
        if (!active) return;
        const list = Array.isArray(payload?.players) ? payload.players : [];
        setSessionPlayers(list);
      })
      .catch(() => {
        if (active) setSessionPlayers([]);
      });
    return () => {
      active = false;
    };
  }, [normalizedBaseUrl, sessionId]);

  useEffect(() => {
    if (!sessionPlayers.length) return;
    const match = sessionPlayers.find(
      (player) => (player.playerId || player.id) === playerId
    );
    if (match) {
      setPlayerName(match.playerName || match.name || playerName);
    }
  }, [sessionPlayers, playerId, playerName]);

  const requestJson = async (path, options) => {
    const response = await fetch(`${normalizedBaseUrl}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error || payload?.message || 'Request failed.';
      throw new Error(message);
    }
    return payload;
  };

  const ensurePlayerArena = (id, label) => {
    setArenaState((prev) => {
      if (prev.players[id]) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [id]: {
            id,
            label,
            sideSlots: emptySideSlots(),
            storyteller: null
          }
        }
      };
    });
  };

  useEffect(() => {
    ensurePlayerArena(playerId, playerName || 'You');
  }, [playerId, playerName]);

  useEffect(() => {
    setArenaState((prev) => {
      const current = prev.players[playerId];
      if (!current) return prev;
      if (current.label === (playerName || 'You')) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: { ...current, label: playerName || 'You' }
        }
      };
    });
  }, [playerId, playerName]);

  const orderedPlayers = useMemo(() => {
    const list = sessionPlayers.length
      ? sessionPlayers.map((player) => ({
          id: player.playerId || player.id,
          label: player.playerName || player.name || player.playerId || player.id
        }))
      : [{ id: playerId, label: playerName || 'You' }];

    const active = list.find((player) => player.id === playerId) || {
      id: playerId,
      label: playerName || 'You'
    };

    const others = list.filter((player) => player.id !== active.id);
    const ordered = [active, ...others];
    const limited = ordered.slice(0, 4);

    const placeholders = [];
    while (limited.length + placeholders.length < 4) {
      placeholders.push({ id: `sealed-${placeholders.length}`, label: 'Sealed', sealed: true });
    }

    return [...limited, ...placeholders];
  }, [sessionPlayers, playerId, playerName]);

  const activeStoryteller = useMemo(
    () => storytellers.find((item) => item.id === activeStorytellerId),
    [storytellers, activeStorytellerId]
  );

  const activeArenaPlayer = arenaState.players[playerId] || {
    id: playerId,
    label: playerName || 'You',
    sideSlots: emptySideSlots(),
    storyteller: null
  };

  const handleGenerateDeck = async () => {
    if (!normalizedBaseUrl) return;
    setBusy(true);
    setNotice('');
    try {
      const payload = await requestJson('/api/textToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerId,
          text: fragmentText,
          includeCards: true,
          includeFront: true,
          includeBack: true,
          debug: false
        })
      });
      const nextCards = clampCards(payload?.cards || []);
      setDeck(nextCards);
      setNotice(nextCards.length ? 'Deck woven from the fragment.' : 'No cards returned.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDrawCard = () => {
    const nextIndex = spreadSlots.findIndex((slot) => !slot.card);
    if (nextIndex === -1) {
      setNotice('No open slots in your spread.');
      return;
    }
    if (!deck.length) {
      setNotice('The deck is empty.');
      return;
    }
    const [nextCard, ...rest] = deck;
    setDeck(rest);
    setSpreadSlots((prev) =>
      prev.map((slot, index) => (index === nextIndex ? { ...slot, card: nextCard } : slot))
    );
    setNotice('A card slips into your spread.');
  };

  const handlePlaceToSide = (slotId) => {
    const slotIndex = spreadSlots.findIndex((slot) => slot.id === slotId);
    const card = spreadSlots[slotIndex]?.card;
    if (!card) return;
    setArenaState((prev) => {
      const currentPlayer = prev.players[playerId] || {
        id: playerId,
        label: playerName || 'You',
        sideSlots: emptySideSlots(),
        storyteller: null
      };
      const emptyIndex = currentPlayer.sideSlots.findIndex((slot) => !slot.card);
      if (emptyIndex === -1) {
        setNotice('Your side rail is full.');
        return prev;
      }
      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: {
            ...currentPlayer,
            sideSlots: currentPlayer.sideSlots.map((slot) =>
              slot.index === emptyIndex ? { ...slot, card } : slot
            )
          }
        }
      };
    });
    setSpreadSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, card: null } : slot)));
  };

  const handlePlaceToCenter = (slotId) => {
    const slotIndex = spreadSlots.findIndex((slot) => slot.id === slotId);
    const card = spreadSlots[slotIndex]?.card;
    if (!card) return;
    setArenaState((prev) => {
      const emptyIndex = prev.centerSlots.findIndex((slot) => !slot.card);
      if (emptyIndex === -1) {
        setNotice('The arena core is full.');
        return prev;
      }
      return {
        ...prev,
        centerSlots: prev.centerSlots.map((slot) =>
          slot.index === emptyIndex ? { ...slot, card, owner: playerId } : slot
        )
      };
    });
    setSpreadSlots((prev) => prev.map((slot) => (slot.id === slotId ? { ...slot, card: null } : slot)));
  };

  const handleReclaimSideCard = (index) => {
    const card = activeArenaPlayer.sideSlots[index]?.card;
    if (!card) return;
    const openIndex = spreadSlots.findIndex((slot) => !slot.card);
    if (openIndex !== -1) {
      setSpreadSlots((prev) =>
        prev.map((slot, slotIndex) => (slotIndex === openIndex ? { ...slot, card } : slot))
      );
    } else {
      setDeck((prev) => [card, ...prev]);
    }
    setArenaState((prev) => {
      const currentPlayer = prev.players[playerId] || {
        id: playerId,
        label: playerName || 'You',
        sideSlots: emptySideSlots(),
        storyteller: null
      };
      return {
        ...prev,
        players: {
          ...prev.players,
          [playerId]: {
            ...currentPlayer,
            sideSlots: currentPlayer.sideSlots.map((slot, slotIndex) =>
              slotIndex === index ? { ...slot, card: null } : slot
            )
          }
        }
      };
    });
  };

  const handleLoadStorytellers = async () => {
    if (!normalizedBaseUrl) return;
    setBusy(true);
    setNotice('');
    try {
      const payload = await requestJson(
        `/api/storytellers?sessionId=${encodeURIComponent(sessionId)}&playerId=${encodeURIComponent(
          playerId
        )}`
      );
      const list = Array.isArray(payload?.storytellers)
        ? payload.storytellers
        : Array.isArray(payload)
          ? payload
          : [];
      const next = list.map((item, index) => ({
        id: item.id || item._id || item.storytellerId || `storyteller-${index}`,
        name: item.name || item.title || 'Storyteller',
        iconUrl: item.iconUrl || item.imageUrl || item.keyImageUrl || ''
      }));
      setStorytellers(next);
      if (next.length && !activeStorytellerId) setActiveStorytellerId(next[0].id);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAssignStoryteller = (id) => {
    setActiveStorytellerId(id);
    const storyteller = storytellers.find((item) => item.id === id);
    setArenaState((prev) => ({
      ...prev,
      players: {
        ...prev.players,
        [playerId]: {
          ...(prev.players[playerId] || {
            id: playerId,
            label: playerName || 'You',
            sideSlots: emptySideSlots(),
            storyteller: null
          }),
          storyteller: storyteller
            ? {
                id: storyteller.id,
                name: storyteller.name,
                iconUrl: storyteller.iconUrl
              }
            : null
        }
      }
    }));
  };

  const handleSaveArena = async () => {
    if (!normalizedBaseUrl) return;
    setBusy(true);
    setNotice('');
    try {
      await requestJson(`/api/sessions/${encodeURIComponent(sessionId)}/arena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerId,
          arena: {
            players: arenaState.players,
            centerSlots: arenaState.centerSlots
          }
        })
      });
      setNotice('Arena sealed to the session.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadArena = async () => {
    if (!normalizedBaseUrl) return;
    setBusy(true);
    setNotice('');
    try {
      const payload = await requestJson(
        `/api/sessions/${encodeURIComponent(sessionId)}/arena?playerId=${encodeURIComponent(playerId)}`
      );
      const arena = payload?.arena || payload;
      const centerSlots = Array.isArray(arena?.centerSlots)
        ? arena.centerSlots.map((slot, index) => ({
            index: slot.index ?? index,
            card: slot.card || slot.entity || null,
            owner: slot.owner || null
          }))
        : emptyCenterSlots();
      const players = arena?.players && typeof arena.players === 'object' ? arena.players : {};
      const normalizedPlayers = {};
      Object.entries(players).forEach(([id, value]) => {
        normalizedPlayers[id] = {
          id,
          label: value?.label || value?.playerLabel || value?.playerName || id,
          sideSlots: Array.isArray(value?.sideSlots)
            ? value.sideSlots.map((slot, index) => ({
                index: slot.index ?? index,
                card: slot.card || slot.entity || null
              }))
            : emptySideSlots(),
          storyteller: value?.storyteller || null
        };
      });
      setArenaState({
        players: normalizedPlayers,
        centerSlots
      });
      setNotice('Arena loaded.');
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deckPreview = deck.slice(0, 3);

  const renderCardFace = (card) => {
    if (!card) return null;
    const imageUrl = resolveAssetUrl(normalizedBaseUrl, card.front?.imageUrl || card.imageUrl);
    return (
      <div className="arenaCardFace">
        {imageUrl ? <img src={imageUrl} alt={card.entityName || 'Entity'} /> : <span>Unknown</span>}
      </div>
    );
  };

  const renderMiniCard = (card, label, actions) => (
    <div
      className="arenaCardMini"
      onMouseEnter={() => setPreviewCard(card)}
      onMouseLeave={() => setPreviewCard(null)}
      onFocus={() => setPreviewCard(card)}
      onBlur={() => setPreviewCard(null)}
      tabIndex={0}
      role="button"
    >
      {renderCardFace(card)}
      <div className="arenaCardMiniLabel">
        <span>{card?.entityName || label || 'Unknown'}</span>
      </div>
      {actions && <div className="arenaCardMiniActions">{actions}</div>}
    </div>
  );

  return (
    <div className="arenaScene">
      <header className="arenaTopBar">
        <div className="arenaTitle">
          <p className="arenaEyebrow">Storyteller Arena</p>
          <h1>The Hex Table</h1>
          <p className="arenaSubhead">
            Keep your spread close, commit the chosen to the relic, and share the fate in the center.
          </p>
        </div>
        <div className="arenaSession">
          <div className="sessionChip">
            Session <span>{sessionId}</span>
          </div>
          <div className="sessionChip">
            You <span>{playerName}</span>
          </div>
          <button type="button" className="ghost subtle" onClick={() => setShowSetup((prev) => !prev)}>
            Tune
          </button>
        </div>
      </header>

      {showSetup && (
        <section className="arenaSetup">
          <label>
            API Base URL
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          </label>
          <label>
            Session ID
            <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
          </label>
          <label>
            Player ID
            <input value={playerId} onChange={(event) => setPlayerId(event.target.value)} />
          </label>
          <label>
            Player Name
            <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
          </label>
          <label className="wide">
            Fragment
            <textarea rows="2" value={fragmentText} onChange={(event) => setFragmentText(event.target.value)} />
          </label>
          <div className="arenaSetupActions">
            <button type="button" className="primary" onClick={handleGenerateDeck} disabled={busy}>
              {busy ? 'Weaving...' : 'Generate Deck'}
            </button>
            <button type="button" className="ghost" onClick={handleLoadStorytellers} disabled={busy}>
              Load Storytellers
            </button>
            <button type="button" className="ghost" onClick={handleLoadArena} disabled={busy}>
              Load Arena
            </button>
            <button type="button" className="ghost" onClick={handleSaveArena} disabled={busy}>
              Save Arena
            </button>
          </div>
        </section>
      )}

      {notice && <div className="arenaNotice">{notice}</div>}

      <section className="arenaLayout">
        <div className="arenaTable">
          <div className="arenaHex">
            <div className="arenaHexSurface">
              <div className="arenaCenter">
                {arenaState.centerSlots.map((slot) => (
                  <div key={slot.index} className={`arenaCenterSlot ${slot.card ? 'filled' : ''}`}>
                    {slot.card ? (
                      renderMiniCard(slot.card, `Center ${slot.index + 1}`)
                    ) : (
                      <span className="slotMarker">{slot.index + 1}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="arenaSides">
                {orderedPlayers.map((player, index) => {
                  const positions = ['bottom', 'right', 'top', 'left'];
                  const side = positions[index] || 'bottom';
                  const arenaPlayer = arenaState.players[player.id];
                  const slots = arenaPlayer?.sideSlots || emptySideSlots();
                  const isActive = player.id === playerId;
                  return (
                    <div
                      key={player.id}
                      className={`arenaSide arenaSide-${side} ${player.sealed ? 'sealed' : ''} ${
                        isActive ? 'active' : 'inactive'
                      }`}
                    >
                      <div className="arenaSideLabel">
                        <span>{player.label}</span>
                        {arenaPlayer?.storyteller?.iconUrl && !isActive && (
                          <img src={arenaPlayer.storyteller.iconUrl} alt={arenaPlayer.storyteller.name} />
                        )}
                      </div>
                      <div className="arenaSideSlots">
                        {slots.map((slot) => (
                          <div key={slot.index} className={`arenaSideSlot ${slot.card ? 'filled' : ''}`}>
                            {slot.card ? (
                              renderMiniCard(
                                slot.card,
                                `Side ${slot.index + 1}`,
                                isActive ? (
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => handleReclaimSideCard(slot.index)}
                                  >
                                    Reclaim
                                  </button>
                                ) : null
                              )
                            ) : (
                              <span className="slotMarker">{slot.index + 1}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="arenaPreview">
            {previewCard ? (
              <>
                {renderCardFace(previewCard)}
                <div className="arenaPreviewText">
                  <h3>{previewCard.entityName || 'Unknown entity'}</h3>
                  <p>{previewCard.front?.prompt || previewCard.summary || 'An echo in the table.'}</p>
                </div>
              </>
            ) : (
              <p>Hover a card to inspect.</p>
            )}
          </div>
        </div>

        <div className="privateZone">
          <div className="deckStack">
            <div className="deckTop" />
            <div className="deckCount">{deck.length}</div>
            <div className="deckFan">
              {deckPreview.map((card, index) => (
                <div key={card.entityId || card.entityName || `deck-${index}`} className="deckFanCard">
                  {renderCardFace(card)}
                </div>
              ))}
            </div>
            <div className="deckActions">
              <button type="button" className="primary" onClick={handleDrawCard}>
                Draw
              </button>
            </div>
          </div>

          <div className="spreadZone">
            <div className="spreadHeader">
              <div>
                <h2>Your Spread</h2>
                <p>Private formation. Place to your side or the center.</p>
              </div>
              <div className="spreadSelect">
                <label>
                  Layout
                  <select value={spreadLayoutId} onChange={(event) => setSpreadLayoutId(event.target.value)}>
                    {SPREAD_LAYOUTS.map((layout) => (
                      <option key={layout.id} value={layout.id}>
                        {layout.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="spreadSurface">
              {spreadSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`spreadSlot ${slot.card ? 'filled' : ''}`}
                  style={{ '--slot-x': `${slot.x}%`, '--slot-y': `${slot.y}%` }}
                >
                  {slot.card ? (
                    <div className="spreadCard">
                      {renderMiniCard(
                        slot.card,
                        slot.label,
                        <>
                          <button type="button" className="ghost" onClick={() => handlePlaceToSide(slot.id)}>
                            To Side
                          </button>
                          <button type="button" className="primary" onClick={() => handlePlaceToCenter(slot.id)}>
                            To Center
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="spreadSlotLabel">{slot.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="storytellerDock">
            <div className="storytellerFrame">
              {activeStoryteller?.iconUrl ? (
                <img src={activeStoryteller.iconUrl} alt={activeStoryteller.name} />
              ) : (
                <span>Voice</span>
              )}
            </div>
            <div className="storytellerInfo">
              <h3>{activeStoryteller?.name || 'Unbound voice'}</h3>
              <p>Bind a storyteller lens to guide your hand.</p>
            </div>
            {storytellers.length > 0 && (
              <label>
                Voice Lens
                <select value={activeStorytellerId} onChange={(event) => handleAssignStoryteller(event.target.value)}>
                  {storytellers.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StorytellerArena;

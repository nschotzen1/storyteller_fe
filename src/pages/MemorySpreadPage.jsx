import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MemorySpreadPage.css';

const SCREEN = {
  MEMORIES: 'memories',
  SPREAD: 'spread'
};

const DEFAULT_API_BASE_URL = 'http://localhost:5001';
const DEFAULT_SESSION_ID = 'memory-spread-demo';
const DEFAULT_PLAYER_ID = 'memory-spread-player';
const DEFAULT_FRAGMENT_TEXT =
  'A wind-scoured pass with a rusted watchtower and a lone courier arriving at dusk.';
const SHOULD_USE_MOCK_APIS = (() => {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  const liveApi = `${params.get('liveApi') || ''}`.trim().toLowerCase();
  return !(liveApi === '1' || liveApi === 'true' || liveApi === 'yes');
})();

const MEMORY_FALLBACK_CARDS = [
  {
    id: 'fallback-m1',
    title: 'Salt Road Ambush',
    summary: 'A courier reached the pass at dusk, cloak full of coded ash.',
    tone: 'embers',
    frontImageUrl: '',
    backImageUrl: '',
    raw: null
  },
  {
    id: 'fallback-m2',
    title: 'Glass Harbor Oath',
    summary: 'Three witnesses stood in fog while bells rang under the sea.',
    tone: 'tide',
    frontImageUrl: '',
    backImageUrl: '',
    raw: null
  },
  {
    id: 'fallback-m3',
    title: 'Ivory Stair Collapse',
    summary: 'A ritual stair cracked while the archive lamps hissed.',
    tone: 'ivory',
    frontImageUrl: '',
    backImageUrl: '',
    raw: null
  }
];

const ENTITY_FALLBACK_DECK = [
  { id: 'fallback-e1', name: 'Courier', type: 'person', frontImageUrl: '', backImageUrl: '' },
  { id: 'fallback-e2', name: 'Watchtower', type: 'place', frontImageUrl: '', backImageUrl: '' },
  { id: 'fallback-e3', name: 'Smuggled Seal', type: 'item', frontImageUrl: '', backImageUrl: '' },
  { id: 'fallback-e4', name: 'Ash Ledger', type: 'item', frontImageUrl: '', backImageUrl: '' },
  { id: 'fallback-e5', name: 'Bell Warden', type: 'person', frontImageUrl: '', backImageUrl: '' },
  { id: 'fallback-e6', name: 'Moon Current', type: 'event', frontImageUrl: '', backImageUrl: '' },
  { id: 'fallback-e7', name: 'Iron Debt', type: 'theme', frontImageUrl: '', backImageUrl: '' },
  { id: 'fallback-e8', name: 'Fracture Choir', type: 'faction', frontImageUrl: '', backImageUrl: '' }
];

const SPREAD_SLOTS = [
  { id: 'northwest', label: 'Past Echo', left: 22, top: 22 },
  { id: 'north', label: 'Thread', left: 50, top: 14 },
  { id: 'northeast', label: 'Pressure', left: 78, top: 22 },
  { id: 'west', label: 'Witness', left: 16, top: 50 },
  { id: 'east', label: 'Counterforce', left: 84, top: 50 },
  { id: 'southwest', label: 'Root', left: 24, top: 78 },
  { id: 'south', label: 'Current', left: 50, top: 86 },
  { id: 'southeast', label: 'Outcome', left: 76, top: 78 }
];

const findFirstEmptySlot = (entitiesBySlot) =>
  SPREAD_SLOTS.find((slot) => !entitiesBySlot[slot.id])?.id || null;

const createArenaMemory = (memory) => ({
  id: `arena-${memory.id}`,
  sourceId: memory.id,
  label: memory.title,
  kind: 'memory',
  slotId: 'center',
  frontImageUrl: memory.frontImageUrl || '',
  backImageUrl: memory.backImageUrl || ''
});

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const resolveAssetUrl = (baseUrl, url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const normalizedBase = (baseUrl || '').replace(/\/$/, '');
  if (!normalizedBase) return url;
  return `${normalizedBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

const inferMemoryTone = (memory, index) => {
  const sentiment = `${memory?.emotional_sentiment || ''}`.toLowerCase();
  if (sentiment.includes('cold') || sentiment.includes('fog') || sentiment.includes('sea')) return 'tide';
  if (sentiment.includes('ash') || sentiment.includes('ember') || sentiment.includes('burn')) return 'embers';
  if (sentiment.includes('stone') || sentiment.includes('ivory') || sentiment.includes('dust')) return 'ivory';
  return ['embers', 'tide', 'ivory'][index % 3];
};

const mapMemoryCards = (memories, baseUrl) => {
  if (!Array.isArray(memories)) return [];

  return memories.slice(0, 3).map((memory, index) => {
    const frontImageUrl = resolveAssetUrl(
      baseUrl,
      firstNonEmptyString(
        memory?.front?.imageUrl,
        memory?.frontImageUrl,
        memory?.front_image_url,
        memory?.card?.front?.imageUrl,
        memory?.cardFrontImageUrl,
        memory?.imageUrl
      )
    );

    const backImageUrl = resolveAssetUrl(
      baseUrl,
      firstNonEmptyString(
        memory?.back?.imageUrl,
        memory?.backImageUrl,
        memory?.back_image_url,
        memory?.card?.back?.imageUrl,
        memory?.cardBackImageUrl
      )
    );

    return {
      id: firstNonEmptyString(memory?._id, memory?.id, `memory-${index + 1}`),
      title: firstNonEmptyString(memory?.dramatic_definition, memory?.action_name, `Memory ${index + 1}`),
      summary: firstNonEmptyString(
        memory?.miseenscene,
        memory?.actual_result,
        memory?.what_is_being_watched,
        memory?.location,
        'No scene details provided for this memory.'
      ),
      tone: inferMemoryTone(memory, index),
      frontImageUrl,
      backImageUrl,
      raw: memory
    };
  });
};

const mapEntityDeck = (payload, baseUrl) => {
  const entities = Array.isArray(payload?.entities) ? payload.entities : [];
  const cards = Array.isArray(payload?.cards) ? payload.cards : [];

  const entityById = new Map(
    entities.map((entity, index) => [
      firstNonEmptyString(entity?.id, entity?._id, entity?.name, `entity-${index + 1}`),
      entity
    ])
  );

  const entityByName = new Map(
    entities.map((entity) => [
      firstNonEmptyString(entity?.name).toLowerCase(),
      entity
    ])
  );

  const mappedCards = cards.map((card, index) => {
    const cardEntityId = firstNonEmptyString(card?.entityId, card?.entity_id, card?.id, `card-${index + 1}`);
    const cardEntityName = firstNonEmptyString(card?.entityName, card?.name, `Entity ${index + 1}`);
    const matchingEntity =
      entityById.get(cardEntityId) || entityByName.get(cardEntityName.toLowerCase()) || null;

    return {
      id: cardEntityId,
      name: cardEntityName,
      type: firstNonEmptyString(
        matchingEntity?.ner_subtype,
        matchingEntity?.ner_type,
        card?.type,
        'entity'
      ),
      frontImageUrl: resolveAssetUrl(baseUrl, firstNonEmptyString(card?.front?.imageUrl)),
      backImageUrl: resolveAssetUrl(baseUrl, firstNonEmptyString(card?.back?.imageUrl)),
      frontPrompt: firstNonEmptyString(card?.front?.prompt),
      backPrompt: firstNonEmptyString(card?.back?.prompt),
      rawCard: card,
      rawEntity: matchingEntity
    };
  });

  if (mappedCards.length > 0) return mappedCards;

  return entities.map((entity, index) => ({
    id: firstNonEmptyString(entity?.id, entity?._id, entity?.name, `entity-${index + 1}`),
    name: firstNonEmptyString(entity?.name, `Entity ${index + 1}`),
    type: firstNonEmptyString(entity?.ner_subtype, entity?.ner_type, 'entity'),
    frontImageUrl: resolveAssetUrl(
      baseUrl,
      firstNonEmptyString(entity?.front?.imageUrl, entity?.frontImageUrl, entity?.imageUrl)
    ),
    backImageUrl: resolveAssetUrl(
      baseUrl,
      firstNonEmptyString(entity?.back?.imageUrl, entity?.backImageUrl)
    ),
    frontPrompt: '',
    backPrompt: '',
    rawCard: null,
    rawEntity: entity
  }));
};

const ensureTriptych = (cards) => {
  const mapped = Array.isArray(cards) ? cards.slice(0, 3) : [];
  if (mapped.length >= 3) return mapped;

  const usedIds = new Set(mapped.map((card) => card.id));
  const fillers = MEMORY_FALLBACK_CARDS.filter((card) => !usedIds.has(card.id));
  return [...mapped, ...fillers].slice(0, 3);
};

const ensureDeckSize = (cards, targetSize = 8) => {
  const mapped = Array.isArray(cards) ? cards.slice(0, targetSize) : [];
  if (mapped.length >= targetSize) return mapped;

  const usedIds = new Set(mapped.map((card) => card.id));
  const fillers = ENTITY_FALLBACK_DECK.filter((card) => !usedIds.has(card.id));
  return [...mapped, ...fillers].slice(0, targetSize);
};

const requestJson = async (baseUrl, path, options = {}) => {
  const normalizedBase = (baseUrl || '').replace(/\/$/, '');
  const url = path.startsWith('http')
    ? path
    : `${normalizedBase}${path.startsWith('/') ? '' : '/'}${path}`;

  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Request failed (${response.status}).`);
  }
  return payload;
};

const MemorySpreadPage = () => {
  const [phase, setPhase] = useState(SCREEN.MEMORIES);
  const [selectedMemoryId, setSelectedMemoryId] = useState('');
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isSpreadIntro, setIsSpreadIntro] = useState(false);
  const [memoryCards, setMemoryCards] = useState(MEMORY_FALLBACK_CARDS);
  const [memorySource, setMemorySource] = useState('fallback');
  const [memoryError, setMemoryError] = useState('');
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [deckCards, setDeckCards] = useState(ensureDeckSize(ENTITY_FALLBACK_DECK));
  const [deckSource, setDeckSource] = useState('fallback');
  const [deckError, setDeckError] = useState('');
  const [isLoadingDeck, setIsLoadingDeck] = useState(false);
  const [arenaEntities, setArenaEntities] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pendingEntity, setPendingEntity] = useState(null);
  const [connectToId, setConnectToId] = useState('');
  const [relationshipText, setRelationshipText] = useState('');
  const [draggingEntityId, setDraggingEntityId] = useState('');
  const [isArenaDragOver, setIsArenaDragOver] = useState(false);
  const [notice, setNotice] = useState('Choose a memory to begin the reading.');

  const timeoutRef = useRef([]);
  const activeDeckRequestRef = useRef(0);

  const selectedMemory = useMemo(
    () => memoryCards.find((card) => card.id === selectedMemoryId) || null,
    [memoryCards, selectedMemoryId]
  );

  const entitiesBySlot = useMemo(() => {
    const bySlot = {};
    arenaEntities.forEach((entity) => {
      if (entity.slotId) bySlot[entity.slotId] = entity;
    });
    return bySlot;
  }, [arenaEntities]);

  const connectionTargets = useMemo(() => arenaEntities, [arenaEntities]);

  const clearScheduled = () => {
    timeoutRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutRef.current = [];
  };

  const schedule = (callback, delayMs) => {
    const timeoutId = window.setTimeout(() => {
      timeoutRef.current = timeoutRef.current.filter((activeId) => activeId !== timeoutId);
      callback();
    }, delayMs);

    timeoutRef.current.push(timeoutId);
    return timeoutId;
  };

  useEffect(
    () => () => {
      clearScheduled();
    },
    []
  );

  const loadMemoryCards = useCallback(async () => {
    setIsLoadingMemories(true);
    setMemoryError('');
    setNotice('Drawing three memories from fragmentToMemories...');

    const requestBody = {
      sessionId: DEFAULT_SESSION_ID,
      playerId: DEFAULT_PLAYER_ID,
      fragment: DEFAULT_FRAGMENT_TEXT,
      count: 3,
      includeCards: true,
      includeFront: true,
      includeBack: true
    };

    if (SHOULD_USE_MOCK_APIS) {
      try {
        const payload = await requestJson(DEFAULT_API_BASE_URL, '/api/fragmentToMemories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBody, mocked_api_calls: true })
        });
        const mapped = ensureTriptych(mapMemoryCards(payload?.memories, DEFAULT_API_BASE_URL));
        setMemoryCards(mapped);
        setMemorySource('mock');
        setNotice('Using mocked memories. Choose one to continue.');
      } catch (mockError) {
        setMemoryCards(ensureTriptych([]));
        setMemorySource('fallback');
        setMemoryError(firstNonEmptyString(mockError?.message));
        setNotice('Using fallback memories because memory API was unavailable.');
      } finally {
        setIsLoadingMemories(false);
      }
      return;
    }

    try {
      const payload = await requestJson(DEFAULT_API_BASE_URL, '/api/fragmentToMemories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody, mocked_api_calls: false })
      });

      const mapped = ensureTriptych(mapMemoryCards(payload?.memories, DEFAULT_API_BASE_URL));
      setMemoryCards(mapped);
      setMemorySource('api');
      setNotice('Choose a memory to begin the reading.');
    } catch (liveError) {
      try {
        const payload = await requestJson(DEFAULT_API_BASE_URL, '/api/fragmentToMemories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBody, mocked_api_calls: true })
        });

        const mapped = ensureTriptych(mapMemoryCards(payload?.memories, DEFAULT_API_BASE_URL));
        setMemoryCards(mapped);
        setMemorySource('mock');
        setMemoryError('');
        setNotice('Using mocked memories from API. Choose one to continue.');
      } catch (mockError) {
        setMemoryCards(ensureTriptych([]));
        setMemorySource('fallback');
        setMemoryError(firstNonEmptyString(mockError?.message, liveError?.message));
        setNotice('Using fallback memories because memory API was unavailable.');
      }
    } finally {
      setIsLoadingMemories(false);
    }
  }, []);

  const loadEntityDeckForMemory = useCallback(async (memoryCard) => {
    const requestId = Date.now();
    activeDeckRequestRef.current = requestId;

    setIsLoadingDeck(true);
    setDeckError('');
    setDeckSource('loading');

    const memoryText = firstNonEmptyString(
      memoryCard?.raw?.miseenscene,
      memoryCard?.raw?.dramatic_definition,
      memoryCard?.summary,
      DEFAULT_FRAGMENT_TEXT
    );

    const requestBody = {
      sessionId: DEFAULT_SESSION_ID,
      playerId: DEFAULT_PLAYER_ID,
      text: memoryText,
      includeCards: true,
      includeFront: true,
      includeBack: true
    };

    const safelyApplyDeck = (nextCards, source, errorMessage) => {
      if (activeDeckRequestRef.current !== requestId) return;
      setDeckCards(ensureDeckSize(nextCards));
      setDeckSource(source);
      if (errorMessage) setDeckError(errorMessage);
      setIsLoadingDeck(false);
    };

    if (SHOULD_USE_MOCK_APIS) {
      try {
        const payload = await requestJson(DEFAULT_API_BASE_URL, '/api/textToEntity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBody, mocked_api_calls: true })
        });

        const mapped = mapEntityDeck(payload, DEFAULT_API_BASE_URL);
        if (mapped.length === 0) {
          throw new Error('Mock entity API returned no cards.');
        }

        safelyApplyDeck(mapped, 'mock', '');
      } catch (mockError) {
        safelyApplyDeck([], 'fallback', firstNonEmptyString(mockError?.message));
      }
      return;
    }

    try {
      const payload = await requestJson(DEFAULT_API_BASE_URL, '/api/textToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody, mocked_api_calls: false })
      });

      const mapped = mapEntityDeck(payload, DEFAULT_API_BASE_URL);
      if (mapped.length === 0) {
        throw new Error('Entity API returned no cards.');
      }

      safelyApplyDeck(mapped, 'api', '');
    } catch (liveError) {
      try {
        const payload = await requestJson(DEFAULT_API_BASE_URL, '/api/textToEntity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBody, mocked_api_calls: true })
        });

        const mapped = mapEntityDeck(payload, DEFAULT_API_BASE_URL);
        if (mapped.length === 0) {
          throw new Error('Mock entity API returned no cards.');
        }

        safelyApplyDeck(mapped, 'mock', '');
      } catch (mockError) {
        safelyApplyDeck([], 'fallback', firstNonEmptyString(mockError?.message, liveError?.message));
      }
    }
  }, []);

  useEffect(() => {
    loadMemoryCards();
  }, [loadMemoryCards]);

  useEffect(() => {
    const renderState = () =>
      JSON.stringify({
        screen: phase,
        selectedMemoryId,
        selectedMemoryTitle: selectedMemory?.title || null,
        memorySource,
        deckSource,
        isCollapsing,
        isSpreadIntro,
        isLoadingMemories,
        isLoadingDeck,
        deckCount: deckCards.length,
        pendingEntity: pendingEntity?.id || null,
        notice,
        arena: {
          coordinateSystem: 'origin top-left, x right, y down',
          entities: arenaEntities.map((entity) => ({
            id: entity.id,
            label: entity.label,
            kind: entity.kind,
            type: entity.type || null,
            slotId: entity.slotId
          })),
          slots: SPREAD_SLOTS.map((slot) => ({
            id: slot.id,
            label: slot.label,
            entityId: entitiesBySlot[slot.id]?.id || null
          })),
          connections
        }
      });

    window.render_game_to_text = renderState;
    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [
    phase,
    selectedMemoryId,
    selectedMemory,
    memorySource,
    deckSource,
    isCollapsing,
    isSpreadIntro,
    isLoadingMemories,
    isLoadingDeck,
    deckCards.length,
    pendingEntity,
    notice,
    arenaEntities,
    entitiesBySlot,
    connections
  ]);

  const resetToMemorySelection = (nextNotice) => {
    clearScheduled();
    setPhase(SCREEN.MEMORIES);
    setSelectedMemoryId('');
    setIsCollapsing(false);
    setIsSpreadIntro(false);
    setDeckCards(ensureDeckSize(deckCards));
    setArenaEntities([]);
    setConnections([]);
    setPendingEntity(null);
    setConnectToId('');
    setRelationshipText('');
    setDraggingEntityId('');
    setIsArenaDragOver(false);
    setNotice(nextNotice);
  };

  const openMemory = (memoryId) => {
    if (phase !== SCREEN.MEMORIES || isCollapsing || isLoadingMemories) return;

    const memory = memoryCards.find((card) => card.id === memoryId);
    if (!memory) return;

    clearScheduled();
    setSelectedMemoryId(memory.id);
    setIsCollapsing(true);
    setNotice('Chosen memory rises while the other cards dissolve.');

    schedule(() => {
      setArenaEntities([createArenaMemory(memory)]);
      setDeckCards([]);
      setConnections([]);
      setPendingEntity(null);
      setConnectToId('');
      setRelationshipText('');
      setDraggingEntityId('');
      setIsArenaDragOver(false);
      setPhase(SCREEN.SPREAD);
      setIsCollapsing(false);
      setIsSpreadIntro(true);
      setNotice('Revealing entity cards from textToEntity...');
      void loadEntityDeckForMemory(memory);

      schedule(() => {
        setIsSpreadIntro(false);
        setNotice('Drag an entity card into the arena, then define a connection to lock it in.');
      }, 880);
    }, 620);
  };

  const returnToMemorySelection = () => {
    resetToMemorySelection('Choose a memory to begin the reading.');
  };

  const beginEntityPlacement = (entityId) => {
    if (phase !== SCREEN.SPREAD) return;

    if (pendingEntity) {
      setNotice(`Resolve ${pendingEntity.name} before drawing another card.`);
      return;
    }

    const entity = deckCards.find((card) => card.id === entityId);
    if (!entity) return;

    if (!arenaEntities.length) {
      setNotice('No memory anchor is active. Return and choose a memory again.');
      return;
    }

    setPendingEntity(entity);
    setConnectToId(arenaEntities[0].id);
    setRelationshipText('');
    setNotice(`Define how ${entity.name} connects to one entity already in the arena.`);
  };

  const onDeckDragStart = (event, entityId) => {
    event.dataTransfer.setData('text/plain', entityId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingEntityId(entityId);
  };

  const onDeckDragEnd = () => {
    setDraggingEntityId('');
    setIsArenaDragOver(false);
  };

  const onArenaDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!isArenaDragOver) {
      setIsArenaDragOver(true);
    }
  };

  const onArenaDragLeave = (event) => {
    event.preventDefault();
    setIsArenaDragOver(false);
  };

  const onArenaDrop = (event) => {
    event.preventDefault();
    const entityId = event.dataTransfer.getData('text/plain');
    setIsArenaDragOver(false);
    setDraggingEntityId('');
    beginEntityPlacement(entityId);
  };

  const confirmConnection = () => {
    if (!pendingEntity) return;

    const relation = relationshipText.trim();
    if (!connectToId || !relation) {
      setNotice('Select a target and add connection text to place this card.');
      return;
    }

    const targetExists = arenaEntities.some((entity) => entity.id === connectToId);
    if (!targetExists) {
      setNotice('Connection target is no longer present. Choose another target.');
      return;
    }

    const slotId = findFirstEmptySlot(entitiesBySlot);
    if (!slotId) {
      setNotice('The spread is full. Return to memories to start a fresh reading.');
      return;
    }

    const placedEntity = {
      id: `arena-${pendingEntity.id}`,
      sourceId: pendingEntity.id,
      label: pendingEntity.name,
      kind: 'entity',
      type: pendingEntity.type,
      slotId,
      frontImageUrl: pendingEntity.frontImageUrl || '',
      backImageUrl: pendingEntity.backImageUrl || ''
    };

    setArenaEntities((prev) => [...prev, placedEntity]);
    setConnections((prev) => [
      ...prev,
      {
        id: `${placedEntity.id}-${connectToId}-${Date.now()}`,
        fromId: placedEntity.id,
        toId: connectToId,
        text: relation
      }
    ]);
    setDeckCards((prev) => prev.filter((card) => card.id !== pendingEntity.id));
    setNotice(`${pendingEntity.name} is now anchored via "${relation}".`);
    setPendingEntity(null);
    setConnectToId('');
    setRelationshipText('');
  };

  const cancelConnection = () => {
    if (!pendingEntity) return;
    setNotice(`${pendingEntity.name} returns to the deck.`);
    setPendingEntity(null);
    setConnectToId('');
    setRelationshipText('');
  };

  return (
    <div className="memorySpreadPage">
      <div className="tarotBackdrop" />
      <div className="tarotVeil" />
      <div className="tarotSigils" />

      <header className="memorySpreadHeader">
        <p className="memorySpreadEyebrow">Spread Reading Interface</p>
        <h1>Memory Triptych</h1>
        <p>{notice}</p>
        <div className="memorySpreadMeta">
          <span>Memories: {isLoadingMemories ? 'loading' : memorySource}</span>
          <span>Entities: {isLoadingDeck ? 'loading' : deckSource}</span>
          <button type="button" onClick={loadMemoryCards} disabled={isLoadingMemories || phase !== SCREEN.MEMORIES}>
            Redraw Memories
          </button>
        </div>
        {(memoryError || deckError) && (
          <p className="memorySpreadError">
            {memoryError && `Memory API: ${memoryError}`}
            {memoryError && deckError ? ' | ' : ''}
            {deckError && `Entity API: ${deckError}`}
          </p>
        )}
      </header>

      {phase === SCREEN.MEMORIES && (
        <section className={`memoryTriptych ${isCollapsing ? 'is-collapsing' : ''}`} aria-label="Memory cards">
          {memoryCards.map((card) => {
            const isSelected = card.id === selectedMemoryId;
            const isDissolving = Boolean(selectedMemoryId) && !isSelected;
            const cardArtUrl = card.frontImageUrl || card.backImageUrl;
            return (
              <button
                key={card.id}
                type="button"
                className={`memoryPillarCard tone-${card.tone} ${isSelected ? 'is-selected' : ''} ${
                  isDissolving ? 'is-dissolving' : ''
                }`}
                onClick={() => openMemory(card.id)}
                disabled={isCollapsing || isLoadingMemories}
              >
                {cardArtUrl && (
                  <div className="memoryPillarArt" aria-hidden="true">
                    <img src={cardArtUrl} alt="" />
                  </div>
                )}
                <div className="memoryPillarShade" aria-hidden="true" />
                <span className="memoryArcanaTag">Memory Arcana</span>
                <h2>{card.title}</h2>
                <p>{card.summary}</p>
                <span className="flipLockPill">
                  {card.backImageUrl ? 'Flip locked (back art ready)' : 'Flip locked for this chapter'}
                </span>
                <span className="flipLockGlyph" aria-hidden="true">
                  &lt;&gt;
                </span>
              </button>
            );
          })}

          {isCollapsing && selectedMemory && (
            <div className="memoryCollapseFocus" aria-hidden="true">
              <article className={`memoryPortalCard tone-${selectedMemory.tone}`}>
                {(selectedMemory.frontImageUrl || selectedMemory.backImageUrl) && (
                  <div className="memoryPortalArt">
                    <img src={selectedMemory.frontImageUrl || selectedMemory.backImageUrl} alt="" />
                  </div>
                )}
                <div className="memoryPillarShade" aria-hidden="true" />
                <span className="memoryArcanaTag">Chosen Memory</span>
                <h2>{selectedMemory.title}</h2>
                <p>{selectedMemory.summary}</p>
                <span className="flipLockPill">Flip locked</span>
              </article>
            </div>
          )}
        </section>
      )}

      {phase === SCREEN.SPREAD && selectedMemory && (
        <section className={`spreadRitualStage ${isSpreadIntro ? 'is-intro' : ''}`} aria-label="Spread building stage">
          <div className="memoryAnchorBand">
            <button
              type="button"
              className={`chosenMemoryAnchor tone-${selectedMemory.tone}`}
              onClick={returnToMemorySelection}
            >
              {(selectedMemory.frontImageUrl || selectedMemory.backImageUrl) && (
                <div className="chosenAnchorArt" aria-hidden="true">
                  <img src={selectedMemory.frontImageUrl || selectedMemory.backImageUrl} alt="" />
                </div>
              )}
              <div className="memoryPillarShade" aria-hidden="true" />
              <span>Chosen Memory</span>
              <h2>{selectedMemory.title}</h2>
              <p>{selectedMemory.summary}</p>
              <em>Tap memory to return to the three-memory draw.</em>
            </button>
          </div>

          <div className="spreadArenaPanel">
            <div className="spreadArenaHeading">
              <h2>Reading Arena</h2>
              <p>Drag an entity into the cloth. It remains only after you define a valid connection.</p>
            </div>

            <div
              className={`tarotArena ${isArenaDragOver ? 'is-drag-over' : ''}`}
              onDragOver={onArenaDragOver}
              onDragLeave={onArenaDragLeave}
              onDrop={onArenaDrop}
              role="presentation"
            >
              <div className="arenaCenterCard">
                {(selectedMemory.frontImageUrl || selectedMemory.backImageUrl) && (
                  <div className="arenaCenterImage">
                    <img src={selectedMemory.frontImageUrl || selectedMemory.backImageUrl} alt="" />
                  </div>
                )}
                <span>Anchor</span>
                <strong>{selectedMemory.title}</strong>
                <small>The memory is the first entity in the arena.</small>
              </div>

              {SPREAD_SLOTS.map((slot) => {
                const entity = entitiesBySlot[slot.id];
                return (
                  <div
                    key={slot.id}
                    className={`arenaOrbitSlot ${entity ? 'filled' : ''}`}
                    style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
                  >
                    <span className="orbitLabel">{slot.label}</span>
                    {entity ? (
                      <div className="orbitEntityCard">
                        <strong>{entity.label}</strong>
                        <small>{entity.type || 'entity'}</small>
                      </div>
                    ) : (
                      <div className="orbitPlaceholder">Open for a connected entity</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="threadLedger">
              <h3>Threaded Connections</h3>
              {connections.length === 0 ? (
                <p>No threads yet. The first one usually ties to the memory anchor.</p>
              ) : (
                <ul>
                  {connections.map((connection) => {
                    const source = arenaEntities.find((entity) => entity.id === connection.fromId);
                    const target = arenaEntities.find((entity) => entity.id === connection.toId);
                    return (
                      <li key={connection.id}>
                        <strong>{source?.label || 'Unknown'}</strong>
                        <span>{connection.text}</span>
                        <em>{target?.label || 'Unknown'}</em>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="entityDeckDock" aria-label="Entity deck">
            <div className="deckDockHeading">
              <h3>Entity Deck</h3>
              <p>
                {isLoadingDeck
                  ? 'Drawing from entity creation API...'
                  : 'Draw from below and drag upward into the arena.'}
              </p>
            </div>
            <div className="entityDeckRow">
              {deckCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`entityDeckCard ${draggingEntityId === card.id ? 'is-dragging' : ''}`}
                  draggable
                  onDragStart={(event) => onDeckDragStart(event, card.id)}
                  onDragEnd={onDeckDragEnd}
                  onClick={() => beginEntityPlacement(card.id)}
                  disabled={isLoadingDeck}
                >
                  {(card.frontImageUrl || card.backImageUrl) && (
                    <div className="entityDeckArt" aria-hidden="true">
                      <img src={card.frontImageUrl || card.backImageUrl} alt="" />
                    </div>
                  )}
                  <small>{card.type}</small>
                  <strong>{card.name}</strong>
                  <span>{card.backImageUrl ? 'Back art ready' : 'Drag to arena'}</span>
                </button>
              ))}
              {deckCards.length === 0 && <div className="deckEmpty">Deck exhausted for this reading.</div>}
            </div>
          </div>
        </section>
      )}

      {pendingEntity && (
        <div className="connectionModalBackdrop" role="presentation">
          <div className="connectionModal" role="dialog" aria-modal="true" aria-label="Define connection">
            <h3>Define connection for {pendingEntity.name}</h3>
            <p>This card stays only after connecting to one entity already in the arena.</p>

            {(pendingEntity.frontImageUrl || pendingEntity.backImageUrl) && (
              <div className="connectionModalPreview" aria-hidden="true">
                <img src={pendingEntity.frontImageUrl || pendingEntity.backImageUrl} alt="" />
              </div>
            )}

            <label>
              Connect to
              <select value={connectToId} onChange={(event) => setConnectToId(event.target.value)}>
                {connectionTargets.length === 0 && <option value="">No available targets</option>}
                {connectionTargets.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Connection text
              <input
                type="text"
                value={relationshipText}
                onChange={(event) => setRelationshipText(event.target.value)}
                placeholder="e.g. Keeps watch over"
              />
            </label>

            <div className="connectionModalActions">
              <button type="button" className="ghost" onClick={cancelConnection}>
                Return to deck
              </button>
              <button type="button" onClick={confirmConnection}>
                Lock into spread
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemorySpreadPage;

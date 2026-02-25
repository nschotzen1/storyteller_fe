import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MemorySpreadPage.css';
import { proposeRelationship } from '../api/arenaRelationships.api';

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

const VIEWPORT_LIMITS = { min: 0.35, max: 2.8 };
const MEMORY_WORLD_POSITION = { x: 0, y: 0 };
const MAX_ENTITIES_IN_ARENA = 12;
const MEMORY_NODE_SIZE = { width: 252, height: 362 };
const ENTITY_NODE_SIZE = { width: 182, height: 246 };
const RELATIONSHIP_STRENGTH = { min: 1, max: 5, default: 3 };
const RELATIONSHIP_DISTANCE = { close: 320, far: 760 };
const CONSTELLATION_NODE_RADIUS = { memory: 190, entity: 150 };
const CONSTELLATION_NODE_GAP = 30;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toSafeSvgId = (value) => `${value || 'id'}`.replace(/[^a-zA-Z0-9_-]/g, '-');

const normalizeStrength = (value) =>
  clamp(
    Number.isFinite(Number(value)) ? Number(value) : RELATIONSHIP_STRENGTH.default,
    RELATIONSHIP_STRENGTH.min,
    RELATIONSHIP_STRENGTH.max
  );

const relationshipDistanceFromStrength = (strengthValue) => {
  const strength = normalizeStrength(strengthValue);
  const ratio =
    (strength - RELATIONSHIP_STRENGTH.min) /
    (RELATIONSHIP_STRENGTH.max - RELATIONSHIP_STRENGTH.min || 1);
  return RELATIONSHIP_DISTANCE.far - ratio * (RELATIONSHIP_DISTANCE.far - RELATIONSHIP_DISTANCE.close);
};

const deriveStrengthFromAssessment = (edgePayload, fallbackQualityScore) => {
  const strengthFromEdge = Number(edgePayload?.strength);
  if (Number.isFinite(strengthFromEdge)) {
    return normalizeStrength(strengthFromEdge);
  }
  const score = Number(fallbackQualityScore);
  if (Number.isFinite(score)) {
    return normalizeStrength(Math.round(RELATIONSHIP_STRENGTH.min + score * 4));
  }
  return RELATIONSHIP_STRENGTH.default;
};

const getNodeCollisionRadius = (entityKind) =>
  entityKind === 'memory' ? CONSTELLATION_NODE_RADIUS.memory : CONSTELLATION_NODE_RADIUS.entity;

const hasCollisionWithArena = (candidateX, candidateY, existingEntities) =>
  existingEntities.some((existing) => {
    const minDistance =
      getNodeCollisionRadius(existing.kind) + getNodeCollisionRadius('entity') + CONSTELLATION_NODE_GAP;
    return Math.hypot(existing.x - candidateX, existing.y - candidateY) < minDistance;
  });

const computePlacementFromConnection = (targetEntity, desiredPoint, strengthValue, existingEntities) => {
  const baseDistance = relationshipDistanceFromStrength(strengthValue);
  const desiredVectorX = (desiredPoint?.x ?? targetEntity.x + 1) - targetEntity.x;
  const desiredVectorY = (desiredPoint?.y ?? targetEntity.y + 1) - targetEntity.y;
  const desiredLength = Math.hypot(desiredVectorX, desiredVectorY);

  let unitX = 1;
  let unitY = 0;

  if (desiredLength > 1) {
    unitX = desiredVectorX / desiredLength;
    unitY = desiredVectorY / desiredLength;
  } else {
    const orbitIndex = existingEntities.length + 1;
    const fallbackAngle = orbitIndex * 0.83 + (targetEntity.kind === 'memory' ? 0 : Math.PI * 0.21);
    unitX = Math.cos(fallbackAngle);
    unitY = Math.sin(fallbackAngle);
  }

  const baseAngle = Math.atan2(unitY, unitX);
  let chosenX = targetEntity.x + Math.cos(baseAngle) * baseDistance;
  let chosenY = targetEntity.y + Math.sin(baseAngle) * baseDistance;
  let chosenDistance = baseDistance;

  if (hasCollisionWithArena(chosenX, chosenY, existingEntities)) {
    for (let attempt = 1; attempt <= 22; attempt += 1) {
      const swing = Math.ceil(attempt / 2) * 0.34;
      const direction = attempt % 2 === 0 ? 1 : -1;
      const angle = baseAngle + direction * swing;
      const ring = Math.floor((attempt - 1) / 6);
      const distance = baseDistance + ring * 58;
      const x = targetEntity.x + Math.cos(angle) * distance;
      const y = targetEntity.y + Math.sin(angle) * distance;
      if (!hasCollisionWithArena(x, y, existingEntities)) {
        chosenX = x;
        chosenY = y;
        chosenDistance = distance;
        break;
      }
      if (attempt === 22) {
        chosenX = x;
        chosenY = y;
        chosenDistance = distance;
      }
    }
  }

  return {
    x: chosenX,
    y: chosenY,
    distance: Math.round(chosenDistance)
  };
};

const createArenaMemory = (memory) => ({
  id: `arena-${memory.id}`,
  sourceId: memory.id,
  label: memory.title,
  kind: 'memory',
  x: MEMORY_WORLD_POSITION.x,
  y: MEMORY_WORLD_POSITION.y,
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
  const [isSubmittingConnection, setIsSubmittingConnection] = useState(false);
  const [connectionRejection, setConnectionRejection] = useState(null);
  const [draggingEntityId, setDraggingEntityId] = useState('');
  const [isArenaDragOver, setIsArenaDragOver] = useState(false);
  const [pendingWorldPosition, setPendingWorldPosition] = useState(null);
  const [selectedArenaEntityId, setSelectedArenaEntityId] = useState('');
  const [arenaSize, setArenaSize] = useState({ width: 960, height: 560 });
  const [viewport, setViewport] = useState({ x: 480, y: 280, k: 0.95 });
  const [isPanning, setIsPanning] = useState(false);
  const [isViewportAnimating, setIsViewportAnimating] = useState(false);
  const [notice, setNotice] = useState('Choose a memory to begin the reading.');

  const timeoutRef = useRef([]);
  const activeDeckRequestRef = useRef(0);
  const arenaCanvasRef = useRef(null);
  const viewportRef = useRef(viewport);
  const panStateRef = useRef(null);
  const hasSpreadCenteredRef = useRef(false);

  const selectedMemory = useMemo(
    () => memoryCards.find((card) => card.id === selectedMemoryId) || null,
    [memoryCards, selectedMemoryId]
  );

  const selectedArenaEntity = useMemo(
    () => arenaEntities.find((entity) => entity.id === selectedArenaEntityId) || null,
    [arenaEntities, selectedArenaEntityId]
  );

  const connectionTargets = useMemo(
    () =>
      [...arenaEntities].sort((a, b) => {
        if (a.kind === b.kind) return a.label.localeCompare(b.label);
        return a.kind === 'memory' ? -1 : 1;
      }),
    [arenaEntities]
  );

  const entityById = useMemo(() => {
    const map = new Map();
    arenaEntities.forEach((entity) => {
      map.set(entity.id, entity);
    });
    return map;
  }, [arenaEntities]);

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

  const centerViewportOnWorld = useCallback(
    (worldX, worldY, scale = viewportRef.current.k, animate = false) => {
      const boundedScale = clamp(scale, VIEWPORT_LIMITS.min, VIEWPORT_LIMITS.max);
      const nextViewport = {
        x: arenaSize.width / 2 - worldX * boundedScale,
        y: arenaSize.height / 2 - worldY * boundedScale,
        k: boundedScale
      };
      setViewport(nextViewport);
      if (animate) {
        setIsViewportAnimating(true);
        schedule(() => setIsViewportAnimating(false), 440);
      } else {
        setIsViewportAnimating(false);
      }
    },
    [arenaSize.width, arenaSize.height]
  );

  const fitViewportToArena = useCallback(
    (animate = true) => {
      if (!arenaEntities.length || !arenaSize.width || !arenaSize.height) return;

      const xs = arenaEntities.map((entity) => entity.x);
      const ys = arenaEntities.map((entity) => entity.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const worldWidth = Math.max(560, maxX - minX + 420);
      const worldHeight = Math.max(420, maxY - minY + 360);
      const fitScale = clamp(
        Math.min(arenaSize.width / worldWidth, arenaSize.height / worldHeight),
        VIEWPORT_LIMITS.min,
        1.24
      );

      centerViewportOnWorld((minX + maxX) / 2, (minY + maxY) / 2, fitScale, animate);
    },
    [arenaEntities, arenaSize.width, arenaSize.height, centerViewportOnWorld]
  );

  const toWorldPoint = useCallback((clientX, clientY) => {
    const container = arenaCanvasRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const { x, y, k } = viewportRef.current;
    return {
      x: (screenX - x) / k,
      y: (screenY - y) / k
    };
  }, []);

  const onArenaWheelNative = useCallback((nativeEvent) => {
    if (phase !== SCREEN.SPREAD) return;
    nativeEvent.preventDefault();
    const container = arenaCanvasRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pointerX = nativeEvent.clientX - rect.left;
    const pointerY = nativeEvent.clientY - rect.top;
    const current = viewportRef.current;
    const zoomFactor = Math.exp(-nativeEvent.deltaY * 0.0014);
    const nextScale = clamp(current.k * zoomFactor, VIEWPORT_LIMITS.min, VIEWPORT_LIMITS.max);

    if (Math.abs(nextScale - current.k) < 0.0001) return;

    const worldX = (pointerX - current.x) / current.k;
    const worldY = (pointerY - current.y) / current.k;
    setViewport({
      x: pointerX - worldX * nextScale,
      y: pointerY - worldY * nextScale,
      k: nextScale
    });
    setIsViewportAnimating(false);
  }, [phase]);

  useEffect(
    () => () => {
      clearScheduled();
    },
    []
  );

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    if (!arenaCanvasRef.current) return undefined;

    const element = arenaCanvasRef.current;
    const readSize = () => {
      const rect = element.getBoundingClientRect();
      setArenaSize({
        width: Math.max(320, rect.width),
        height: Math.max(280, rect.height)
      });
    };

    readSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(readSize);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', readSize);
    return () => window.removeEventListener('resize', readSize);
  }, [phase]);

  useEffect(() => {
    const element = arenaCanvasRef.current;
    if (!element) return undefined;

    element.addEventListener('wheel', onArenaWheelNative, { passive: false });
    return () => {
      element.removeEventListener('wheel', onArenaWheelNative);
    };
  }, [onArenaWheelNative, phase]);

  useEffect(() => {
    if (phase !== SCREEN.SPREAD || !selectedMemoryId) {
      hasSpreadCenteredRef.current = false;
      return;
    }
    if (hasSpreadCenteredRef.current) return;
    if (!arenaSize.width || !arenaSize.height) return;

    centerViewportOnWorld(MEMORY_WORLD_POSITION.x, MEMORY_WORLD_POSITION.y, 0.94, false);
    hasSpreadCenteredRef.current = true;
  }, [phase, selectedMemoryId, arenaSize.width, arenaSize.height, centerViewportOnWorld]);

  const loadMemoryCards = useCallback(async () => {
    setIsLoadingMemories(true);
    setMemoryError('');
    setNotice('Drawing three memories from the archives...');

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
        setNotice('Using mocked archives from API. Choose one to continue.');
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
          coordinateSystem: 'world coordinates centered on selected memory',
          viewport,
          selectedEntityId: selectedArenaEntityId || null,
          entities: arenaEntities.map((entity) => ({
            id: entity.id,
            label: entity.label,
            kind: entity.kind,
            type: entity.type || null,
            x: entity.x,
            y: entity.y
          })),
          connections
        }
      });

    window.render_game_to_text = renderState;
    window.advanceTime = () => { };

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
    connections,
    viewport,
    selectedArenaEntityId
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
    setPendingWorldPosition(null);
    setConnectToId('');
    setRelationshipText('');
    setIsSubmittingConnection(false);
    setConnectionRejection(null);
    setDraggingEntityId('');
    setIsArenaDragOver(false);
    setSelectedArenaEntityId('');
    panStateRef.current = null;
    setIsPanning(false);
    hasSpreadCenteredRef.current = false;
    setViewport({
      x: arenaSize.width / 2,
      y: arenaSize.height / 2,
      k: 0.95
    });
    setIsViewportAnimating(false);
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
      const memoryAnchor = createArenaMemory(memory);
      setArenaEntities([memoryAnchor]);
      setDeckCards([]);
      setConnections([]);
      setPendingEntity(null);
      setPendingWorldPosition(null);
      setConnectToId('');
      setRelationshipText('');
      setIsSubmittingConnection(false);
      setConnectionRejection(null);
      setDraggingEntityId('');
      setIsArenaDragOver(false);
      setSelectedArenaEntityId(memoryAnchor.id);
      setPhase(SCREEN.SPREAD);
      setIsCollapsing(false);
      setIsSpreadIntro(true);
      setViewport({
        x: arenaSize.width / 2,
        y: arenaSize.height / 2,
        k: 0.94
      });
      setNotice('Revealing celestial cards from textToEntity...');
      void loadEntityDeckForMemory(memory);

      schedule(() => {
        setIsSpreadIntro(false);
        setNotice('Place a card upon the velvet, then define its thread to anchor it.');
      }, 880);
    }, 620);
  };

  const returnToMemorySelection = () => {
    if (pendingEntity) {
      setNotice('Finish or cancel the pending connection before returning to the memory draw.');
      return;
    }
    resetToMemorySelection('Choose a memory to begin the reading.');
  };

  const handleArenaEntitySelect = (entityId) => {
    if (isSubmittingConnection) return;
    setSelectedArenaEntityId(entityId);
    if (!pendingEntity) return;
    setConnectToId(entityId);
    const targetEntity = entityById.get(entityId);
    if (targetEntity) {
      setNotice(`Thread target set to ${targetEntity.label}. Add meaning to anchor ${pendingEntity.name}.`);
    }
  };

  const beginEntityPlacement = (entityId, preferredWorldPosition = null) => {
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

    const placedEntities = arenaEntities.filter((arenaEntity) => arenaEntity.kind === 'entity');
    if (placedEntities.length >= MAX_ENTITIES_IN_ARENA) {
      setNotice('Constellation is at capacity. Recenter or return to draw a new anchor.');
      return;
    }

    setPendingEntity(entity);
    setPendingWorldPosition(preferredWorldPosition);
    const defaultTargetId = selectedArenaEntityId || arenaEntities[0]?.id || '';
    setConnectToId(defaultTargetId);
    setRelationshipText('');
    setIsSubmittingConnection(false);
    setConnectionRejection(null);
    setNotice(`Define how ${entity.name} is woven to a star already in the constellation.`);
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
    const dropWorldPoint = toWorldPoint(event.clientX, event.clientY);
    setIsArenaDragOver(false);
    setDraggingEntityId('');
    beginEntityPlacement(entityId, dropWorldPoint);
  };

  const onArenaPointerDown = (event) => {
    if (event.button !== 0 || phase !== SCREEN.SPREAD) return;
    if (event.target.closest('.constellationNodeButton')) return;
    if (event.target.closest('.constellationControls')) return;

    const snapshot = viewportRef.current;
    panStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startViewport: { ...snapshot }
    };
    setIsPanning(true);
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onArenaPointerMove = (event) => {
    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - panState.startX;
    const deltaY = event.clientY - panState.startY;
    setViewport({
      ...panState.startViewport,
      x: panState.startViewport.x + deltaX,
      y: panState.startViewport.y + deltaY
    });
    setIsViewportAnimating(false);
  };

  const onArenaPointerUp = (event) => {
    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) return;
    panStateRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.releasePointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onArenaPointerCancel = (event) => {
    const panState = panStateRef.current;
    if (!panState || panState.pointerId !== event.pointerId) return;
    panStateRef.current = null;
    setIsPanning(false);
  };

  const confirmConnection = async () => {
    if (!pendingEntity) return;
    if (isSubmittingConnection) return;

    const relation = relationshipText.trim();
    if (!connectToId || !relation) {
      setNotice('Select a target and scribe its meaning to place this card.');
      return;
    }

    const targetEntity = entityById.get(connectToId);
    if (!targetEntity) {
      setNotice('Target has faded. Choose another star.');
      return;
    }

    const placedEntities = arenaEntities.filter((arenaEntity) => arenaEntity.kind === 'entity');
    if (placedEntities.length >= MAX_ENTITIES_IN_ARENA) {
      setNotice('Constellation is full. Return to archives to begin a fresh reading.');
      return;
    }

    const sourceCardId = pendingEntity.id;
    const targetCardId = targetEntity.sourceId || targetEntity.id;
    setIsSubmittingConnection(true);
    setConnectionRejection(null);

    let judgedStrength = RELATIONSHIP_STRENGTH.default;
    let judgedQualityScore = null;
    let pointsAwarded = 0;
    let judgedPredicate = '';

    try {
      const proposalPayload = await proposeRelationship(
        {
          sessionId: DEFAULT_SESSION_ID,
          playerId: DEFAULT_PLAYER_ID,
          arenaId: selectedMemoryId || 'memory-spread',
          source: { cardId: sourceCardId, entityId: sourceCardId },
          targets: [{ cardId: targetCardId, entityId: targetCardId }],
          relationship: {
            surfaceText: relation
          },
          options: {
            dryRun: false
          }
        },
        DEFAULT_API_BASE_URL,
        { mockApiCalls: SHOULD_USE_MOCK_APIS }
      );

      if (proposalPayload?.verdict !== 'accepted') {
        const reasons = Array.isArray(proposalPayload?.quality?.reasons)
          ? proposalPayload.quality.reasons
          : ['The thread was rejected by the unseen judge.'];
        setConnectionRejection({ reasons });
        setNotice(`Thread severed: ${reasons[0]}`);
        setIsSubmittingConnection(false);
        return;
      }

      const returnedEdge = Array.isArray(proposalPayload?.edge)
        ? proposalPayload.edge[0]
        : proposalPayload?.edge || null;

      judgedStrength = deriveStrengthFromAssessment(returnedEdge, returnedEdge?.quality?.score);
      judgedQualityScore = Number(returnedEdge?.quality?.score);
      pointsAwarded = Number(proposalPayload?.points?.awarded) || 0;
      judgedPredicate = firstNonEmptyString(returnedEdge?.predicate);
    } catch (proposalError) {
      setNotice(`Connection request failed: ${firstNonEmptyString(proposalError?.message, 'Unknown error.')}`);
      setIsSubmittingConnection(false);
      return;
    }

    const placementPoint = computePlacementFromConnection(
      targetEntity,
      pendingWorldPosition,
      judgedStrength,
      arenaEntities
    );
    const baseArenaId = `arena-${pendingEntity.id}`;
    const arenaId = entityById.has(baseArenaId) ? `${baseArenaId}-${Date.now()}` : baseArenaId;

    const placedEntity = {
      id: arenaId,
      sourceId: pendingEntity.id,
      label: pendingEntity.name,
      kind: 'entity',
      type: pendingEntity.type,
      x: placementPoint.x,
      y: placementPoint.y,
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
        text: relation,
        strength: judgedStrength,
        targetDistance: placementPoint.distance,
        qualityScore: Number.isFinite(judgedQualityScore) ? judgedQualityScore : null,
        predicate: judgedPredicate,
        pointsAwarded
      }
    ]);
    setDeckCards((prev) => prev.filter((card) => card.id !== pendingEntity.id));
    setNotice(
      `${pendingEntity.name} is now anchored via "${relation}" (resonance ${judgedStrength}, distance ${placementPoint.distance}${pointsAwarded ? `, +${pointsAwarded} essence` : ''}).`
    );
    setPendingEntity(null);
    setPendingWorldPosition(null);
    setConnectToId('');
    setRelationshipText('');
    setIsSubmittingConnection(false);
    setConnectionRejection(null);
    setSelectedArenaEntityId(placedEntity.id);
    schedule(() => fitViewportToArena(true), 80);
  };

  const cancelConnection = () => {
    if (!pendingEntity) return;
    if (isSubmittingConnection) return;
    setNotice(`${pendingEntity.name} returns to the deck.`);
    setPendingEntity(null);
    setPendingWorldPosition(null);
    setConnectToId('');
    setRelationshipText('');
    setIsSubmittingConnection(false);
    setConnectionRejection(null);
  };

  const handleFitConstellation = () => {
    fitViewportToArena(true);
  };

  const handleRecenterMemory = () => {
    centerViewportOnWorld(MEMORY_WORLD_POSITION.x, MEMORY_WORLD_POSITION.y, Math.max(viewport.k, 0.9), true);
  };

  const handleZoomStep = (direction) => {
    const current = viewportRef.current;
    const factor = direction > 0 ? 1.14 : 0.88;
    const nextScale = clamp(current.k * factor, VIEWPORT_LIMITS.min, VIEWPORT_LIMITS.max);
    centerViewportOnWorld(
      (arenaSize.width / 2 - current.x) / current.k,
      (arenaSize.height / 2 - current.y) / current.k,
      nextScale,
      true
    );
  };

  const connectionCurves = useMemo(() => {
    return connections
      .map((connection) => {
        const source = entityById.get(connection.fromId);
        const target = entityById.get(connection.toId);
        if (!source || !target) return null;
        const strength = normalizeStrength(connection.strength);
        const strengthRatio =
          (strength - RELATIONSHIP_STRENGTH.min) /
          (RELATIONSHIP_STRENGTH.max - RELATIONSHIP_STRENGTH.min || 1);

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const sourceSize = source.kind === 'memory' ? MEMORY_NODE_SIZE : ENTITY_NODE_SIZE;
        const targetSize = target.kind === 'memory' ? MEMORY_NODE_SIZE : ENTITY_NODE_SIZE;

        const sourceHalfW = sourceSize.width / 2;
        const sourceHalfH = sourceSize.height / 2;
        const targetHalfW = targetSize.width / 2;
        const targetHalfH = targetSize.height / 2;

        const sourceScale = 1 / Math.max(Math.abs(dx) / sourceHalfW, Math.abs(dy) / sourceHalfH);
        const targetScale = 1 / Math.max(Math.abs(dx) / targetHalfW, Math.abs(dy) / targetHalfH);

        const startX = source.x + dx * sourceScale;
        const startY = source.y + dy * sourceScale;
        const endX = target.x - dx * targetScale;
        const endY = target.y - dy * targetScale;

        const anchorDx = endX - startX;
        const anchorDy = endY - startY;
        const anchorDistance = Math.max(1, Math.hypot(anchorDx, anchorDy));
        const normalX = -dy / distance;
        const normalY = dx / distance;
        const curve = clamp(anchorDistance * 0.22, 24, 130);
        const controlX = (startX + endX) / 2 + normalX * curve;
        const controlY = (startY + endY) / 2 + normalY * curve;
        const coreWidth = 1.35 + strengthRatio * 2.2;
        return {
          ...connection,
          source,
          target,
          strength,
          coreWidth,
          glowWidth: coreWidth + 3.2,
          highlightOpacity: 0.84 + strengthRatio * 0.14,
          mutedOpacity: 0.42 + strengthRatio * 0.2,
          dashArray: strength <= 2 ? '8 6' : '',
          path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
        };
      })
      .filter(Boolean);
  }, [connections, entityById]);

  const starfieldPoints = useMemo(
    () =>
      Array.from({ length: 140 }, (_, index) => {
        const randomX = Math.sin((index + 1) * 128.1) * 43758.5453;
        const randomY = Math.cos((index + 1) * 191.7) * 12731.3324;
        const normalizedX = randomX - Math.floor(randomX);
        const normalizedY = randomY - Math.floor(randomY);
        const twinkle = ((Math.sin((index + 3) * 11.9) + 1) / 2) * 0.55 + 0.2;
        return {
          id: `star-${index}`,
          x: (normalizedX - 0.5) * 5200,
          y: (normalizedY - 0.5) * 3400,
          r: ((index % 3) + 1) * 0.55,
          opacity: twinkle
        };
      }),
    []
  );

  const relatedToSelection = useMemo(() => {
    if (!selectedArenaEntityId) return new Set();
    const related = new Set([selectedArenaEntityId]);
    connections.forEach((connection) => {
      if (connection.fromId === selectedArenaEntityId) related.add(connection.toId);
      if (connection.toId === selectedArenaEntityId) related.add(connection.fromId);
    });
    return related;
  }, [connections, selectedArenaEntityId]);

  return (
    <div className="memorySpreadPage">
      <div className="tarotBackdrop" />
      <div className="tarotVeil" />
      <div className="tarotSigils" />

      <header className="memorySpreadHeader">
        <p className="memorySpreadEyebrow">Ritual Narrative Surface</p>
        <h1>Memory Constellation</h1>
        <p>{notice}</p>
        <div className="memorySpreadMeta">
          <span>Archives: {isLoadingMemories ? 'unsealing' : memorySource}</span>
          <span>Deck: {isLoadingDeck ? 'drawing' : deckSource}</span>
          <button type="button" onClick={loadMemoryCards} disabled={isLoadingMemories || phase !== SCREEN.MEMORIES}>
            Redraw Archives
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
                className={`memoryPillarCard tone-${card.tone} ${isSelected ? 'is-selected' : ''} ${isDissolving ? 'is-dissolving' : ''
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
                  {card.backImageUrl ? 'Sealed (reverse imagery ready)' : 'Sealed for this chapter'}
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
                <span className="memoryArcanaTag">Chosen Anchor</span>
                <h2>{selectedMemory.title}</h2>
                <p>{selectedMemory.summary}</p>
                <span className="flipLockPill">Sealed</span>
              </article>
            </div>
          )}
        </section>
      )}

      {phase === SCREEN.SPREAD && selectedMemory && (
        <section
          className={`spreadRitualStage constellationStage ${isSpreadIntro ? 'is-intro' : ''}`}
          aria-label="Spread building stage"
        >
          <div className="memoryAnchorBand">
            <article className={`chosenMemoryAnchor tone-${selectedMemory.tone}`}>
              {(selectedMemory.frontImageUrl || selectedMemory.backImageUrl) && (
                <div className="chosenAnchorArt" aria-hidden="true">
                  <img src={selectedMemory.frontImageUrl || selectedMemory.backImageUrl} alt="" />
                </div>
              )}
              <div className="memoryPillarShade" aria-hidden="true" />
              <span>Core Anchor</span>
              <h2>{selectedMemory.title}</h2>
              <p>{selectedMemory.summary}</p>
              <em>This memory grounds the celestial map.</em>
            </article>
            <div className="memoryAnchorActions">
              <button type="button" onClick={returnToMemorySelection}>
                Return to three-memory draw
              </button>
            </div>
          </div>

          <div className="constellationWorkspace">
            <div className="spreadArenaPanel constellationPanel">
              <div className="spreadArenaHeading">
                <h2>Celestial Tapestry</h2>
                <p>
                  Place cards upon the velvet. A card remains only when its thread to an existing star is defined.
                </p>
              </div>

              <div
                ref={arenaCanvasRef}
                className={`constellationArena ${isArenaDragOver ? 'is-drag-over' : ''} ${isPanning ? 'is-panning' : ''}`}
                onDragOver={onArenaDragOver}
                onDragLeave={onArenaDragLeave}
                onDrop={onArenaDrop}
                onPointerDown={onArenaPointerDown}
                onPointerMove={onArenaPointerMove}
                onPointerUp={onArenaPointerUp}
                onPointerCancel={onArenaPointerCancel}
                role="presentation"
              >
                <div className="constellationControls">
                  <button type="button" onClick={() => handleZoomStep(1)} aria-label="Zoom in">
                    +
                  </button>
                  <button type="button" onClick={() => handleZoomStep(-1)} aria-label="Zoom out">
                    -
                  </button>
                  <button type="button" onClick={handleFitConstellation}>
                    Fit
                  </button>
                  <button type="button" onClick={handleRecenterMemory}>
                    Recenter
                  </button>
                  <span>{Math.round(viewport.k * 100)}%</span>
                </div>

                <svg
                  className={`constellationSvg ${isViewportAnimating ? 'is-animating' : ''}`}
                  viewBox={`0 0 ${arenaSize.width} ${arenaSize.height}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <radialGradient id="constellationMemoryGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(184, 154, 74, 0.25)" />
                      <stop offset="100%" stopColor="rgba(184, 154, 74, 0)" />
                    </radialGradient>
                    <filter id="constellationLinkGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="2.2" />
                    </filter>
                    {arenaEntities.map((entity) => {
                      const size = entity.kind === 'memory' ? MEMORY_NODE_SIZE : ENTITY_NODE_SIZE;
                      const clipId = `clip-${toSafeSvgId(entity.id)}`;
                      return (
                        <clipPath id={clipId} key={clipId}>
                          <rect
                            x={-size.width / 2}
                            y={-size.height / 2}
                            width={size.width}
                            height={size.height}
                            rx={18}
                            ry={18}
                          />
                        </clipPath>
                      );
                    })}
                  </defs>

                  <g
                    className="viewportTransform"
                    transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.k})`}
                    style={{
                      transition: isViewportAnimating
                        ? 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
                        : 'transform 0ms linear'
                    }}
                  >
                    <g className="starfieldLayer">
                      {starfieldPoints.map((star) => (
                        <circle
                          key={star.id}
                          cx={star.x}
                          cy={star.y}
                          r={star.r}
                          fill="rgba(201, 214, 232, 0.7)"
                          opacity={star.opacity}
                        />
                      ))}
                    </g>

                    <g className="memoryAuraLayer" pointerEvents="none">
                      <circle cx="0" cy="0" r="235" fill="url(#constellationMemoryGlow)" />
                      <circle cx="0" cy="0" r="278" className="memoryAuraRing" />
                    </g>

                    <g className="nodesLayer">
                      {arenaEntities.map((entity) => {
                        const isMemory = entity.kind === 'memory';
                        const size = isMemory ? MEMORY_NODE_SIZE : ENTITY_NODE_SIZE;
                        const x = -size.width / 2;
                        const y = -size.height / 2;
                        const imageUrl = entity.frontImageUrl || entity.backImageUrl;
                        const clipId = `clip-${toSafeSvgId(entity.id)}`;
                        const isSelected = selectedArenaEntityId === entity.id;
                        const isRelated = !selectedArenaEntityId || relatedToSelection.has(entity.id);

                        return (
                          <g
                            key={entity.id}
                            transform={`translate(${entity.x} ${entity.y})`}
                            className={`constellationNode ${isMemory ? 'memory-node' : 'entity-node'} ${isSelected ? 'is-selected' : ''
                              } ${isRelated ? '' : 'is-dimmed'}`}
                          >
                            <g className="constellationNodeButton" onClick={() => handleArenaEntitySelect(entity.id)}>
                              <rect
                                className="constellationNodeOuter"
                                x={x}
                                y={y}
                                width={size.width}
                                height={size.height}
                                rx="18"
                                ry="18"
                              />
                              {imageUrl && (
                                <image
                                  href={imageUrl}
                                  x={x}
                                  y={y}
                                  width={size.width}
                                  height={size.height}
                                  preserveAspectRatio="xMidYMid slice"
                                  clipPath={`url(#${clipId})`}
                                  className="constellationNodeImage"
                                />
                              )}
                              <rect
                                className="constellationNodeShade"
                                x={x}
                                y={y}
                                width={size.width}
                                height={size.height}
                                rx="18"
                                ry="18"
                              />
                              <rect
                                className="constellationNodeInner"
                                x={x + 9}
                                y={y + 9}
                                width={size.width - 18}
                                height={size.height - 18}
                                rx="12"
                                ry="12"
                              />
                              <text x={x + 18} y={y + 30} className="constellationNodeBadge">
                                {isMemory ? 'Primary Memory' : `${entity.type || 'entity'}`}
                              </text>
                              <text x={x + 18} y={y + size.height - 66} className="constellationNodeTitle">
                                {entity.label}
                              </text>
                              {!isMemory && (
                                <text x={x + 18} y={y + size.height - 32} className="constellationNodeFoot">
                                  Threaded card
                                </text>
                              )}
                              {isMemory && (
                                <text x={x + 18} y={y + size.height - 32} className="constellationNodeFoot">
                                  Tap top memory card to re-draw
                                </text>
                              )}
                            </g>
                          </g>
                        );
                      })}
                    </g>

                    <g className="edgesLayer" pointerEvents="none">
                      {connectionCurves.map((connection) => {
                        const isHighlighted =
                          !selectedArenaEntityId ||
                          connection.fromId === selectedArenaEntityId ||
                          connection.toId === selectedArenaEntityId;
                        const opacity = isHighlighted ? connection.highlightOpacity : connection.mutedOpacity;
                        return (
                          <g
                            key={connection.id}
                            className={`constellationLinkGroup ${isHighlighted ? 'is-highlighted' : 'is-muted'}`}
                          >
                            <path
                              d={connection.path}
                              className="constellationLinkGlowPath"
                              stroke={isHighlighted ? 'rgba(212, 185, 94, 0.85)' : 'rgba(184, 154, 74, 0.5)'}
                              strokeWidth={connection.glowWidth}
                              opacity={opacity * 0.6}
                              strokeDasharray={connection.dashArray}
                            />
                            <path
                              d={connection.path}
                              className="constellationLinkCorePath"
                              stroke={isHighlighted ? 'rgba(233, 226, 207, 0.95)' : 'rgba(201, 214, 232, 0.8)'}
                              strokeWidth={connection.coreWidth}
                              opacity={opacity}
                              strokeDasharray={connection.dashArray}
                            />
                          </g>
                        );
                      })}
                    </g>
                  </g>
                </svg>

                {pendingEntity && (
                  <div className="dropGhostHint">
                    <strong>{pendingEntity.name}</strong>
                    <span>Choose relation to lock this card into the spread.</span>
                  </div>
                )}
              </div>

              <div className="threadLedger">
                <h3>Woven Threads</h3>
                {connections.length === 0 ? (
                  <p>No threads drawn yet. The first usually anchors to the core memory.</p>
                ) : (
                  <ul>
                    {connections.map((connection) => {
                      const source = entityById.get(connection.fromId);
                      const target = entityById.get(connection.toId);
                      return (
                        <li key={connection.id}>
                          <strong>{source?.label || 'Unknown'}</strong>
                          <span>{connection.text}</span>
                          <small className="connectionStrengthTag">
                            Resonance {normalizeStrength(connection.strength)}
                            {connection.targetDistance ? ` • ${connection.targetDistance}px` : ''}
                          </small>
                          <em>{target?.label || 'Unknown'}</em>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <aside className={`inspectorPanel ${selectedArenaEntity ? 'is-open' : ''}`}>
              <h3>Inspector</h3>
              {!selectedArenaEntity && <p>Select a card in the arena to inspect it.</p>}
              {selectedArenaEntity && (
                <>
                  <span className="inspectorType">{selectedArenaEntity.kind}</span>
                  <h4>{selectedArenaEntity.label}</h4>
                  <p>
                    Coordinates: {Math.round(selectedArenaEntity.x)}, {Math.round(selectedArenaEntity.y)}
                  </p>
                  <p>
                    Anchoring threads:{' '}
                    {
                      connections.filter(
                        (connection) =>
                          connection.fromId === selectedArenaEntity.id || connection.toId === selectedArenaEntity.id
                      ).length
                    }
                  </p>
                  <div className="inspectorActions">
                    <button type="button" onClick={handleRecenterMemory}>
                      Seek Anchor
                    </button>
                    <button type="button" onClick={handleFitConstellation}>
                      View Map
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>

          <div className="entityDeckDock deckTray" aria-label="Entity deck">
            <div className="deckDockHeading">
              <h3>Arcana Deck</h3>
              <p>
                {isLoadingDeck
                  ? 'Reading from the ether...'
                  : 'Place cards upon the velvet and define their meaning.'}
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
                  <span>{card.backImageUrl ? 'Dual sides ready' : 'Drag to tapestry'}</span>
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
            <h3>Scribe thread for {pendingEntity.name}</h3>
            <p>This card fades unless anchored to a star already in the constellation.</p>

            {(pendingEntity.frontImageUrl || pendingEntity.backImageUrl) && (
              <div className="connectionModalPreview" aria-hidden="true">
                <img src={pendingEntity.frontImageUrl || pendingEntity.backImageUrl} alt="" />
              </div>
            )}

            <label>
              Anchor to
              <select
                value={connectToId}
                disabled={isSubmittingConnection}
                onChange={(event) => {
                  setConnectToId(event.target.value);
                  setSelectedArenaEntityId(event.target.value);
                }}
              >
                {connectionTargets.length === 0 && <option value="">No stars found</option>}
                {connectionTargets.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="connectionTargetGrid" aria-label="Connect target quick picker">
              {connectionTargets.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  className={`connectionTargetChip ${connectToId === entity.id ? 'is-active' : ''}`}
                  onClick={() => handleArenaEntitySelect(entity.id)}
                  disabled={isSubmittingConnection}
                >
                  <strong>{entity.label}</strong>
                  <span>{entity.kind === 'memory' ? 'core anchor' : entity.type || 'entity'}</span>
                </button>
              ))}
            </div>

            <label>
              Thread's meaning
              <input
                type="text"
                value={relationshipText}
                onChange={(event) => setRelationshipText(event.target.value)}
                placeholder="e.g. Keeps eternal watch over..."
                disabled={isSubmittingConnection}
              />
            </label>

            <div className="relationshipAssessmentHint">
              <strong>Spatial resonance is judged by the unseen.</strong>
              <span>Vivid, specific meanings pull cards closer in the celestial orbit.</span>
            </div>
            {connectionRejection && (
              <div className="relationshipRejection">
                <strong>Omen feedback</strong>
                <ul>
                  {connectionRejection.reasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="connectionModalActions">
              <button type="button" className="ghost" onClick={cancelConnection} disabled={isSubmittingConnection}>
                Return to deck
              </button>
              <button type="button" onClick={confirmConnection} disabled={isSubmittingConnection}>
                {isSubmittingConnection ? 'Seeking omen...' : 'Seal into tapestry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemorySpreadPage;

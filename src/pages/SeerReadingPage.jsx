import React, { useEffect, useMemo, useState } from 'react';
import { fetchImmersiveRpgCharacterSheet } from '../api/immersiveRpg';
import './SeerReadingPage.css';

const DEFAULT_API_BASE_URL = 'http://localhost:5001';
const TYPEWRITER_SESSION_STORAGE_KEY = 'sessionId';
const DEFAULT_PLAYER_ID = 'memory-spread-player';
const DEFAULT_MISSION_POINTS = 12;
const DEFAULT_MISSION_DURATION = 3;
const SEER_READING_FIXTURES = {
  triad: {
    cardCount: 3,
    preferredCardKinds: ['character', 'location', 'event']
  },
  authority: {
    cardCount: 4,
    preferredCardKinds: ['character', 'location', 'event', 'authority']
  },
  omens: {
    cardCount: 4,
    preferredCardKinds: ['location', 'event', 'omen', 'symbol']
  }
};

const FIELD_LABELS = {
  short_title: 'Title',
  whose_eyes: 'Witness',
  time_of_day: 'Time',
  location: 'Place',
  emotional_sentiment: 'Feeling',
  what_is_being_watched: 'Seeing',
  entities_in_memory: 'Entities',
  temporal_relation: 'When',
  related_through_what: 'Connected by',
  action_name: 'Action',
  dramatic_definition: 'Meaning',
  actual_result: 'Result',
  organizational_affiliation: 'Affiliation',
  miseenscene: 'Full glimpse',
  consequences: 'Consequences',
  relevant_rolls: 'Rolls',
  estimated_action_length: 'Duration',
  action_level: 'Scale'
};

function readApiBaseUrl() {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  const params = new URLSearchParams(window.location.search);
  const queryValue = `${params.get('memoryApiBaseUrl') || params.get('apiBaseUrl') || ''}`.trim();
  return queryValue || DEFAULT_API_BASE_URL;
}

function readSeerStringArrayParam(params, ...keys) {
  const rawValue = keys
    .map((key) => `${params.get(key) || ''}`.trim())
    .find(Boolean);
  if (!rawValue) return [];
  return [...new Set(rawValue.split(',').map((entry) => entry.trim()).filter(Boolean))];
}

function readSeerPositiveIntParam(params, ...keys) {
  const rawValue = keys
    .map((key) => `${params.get(key) || ''}`.trim())
    .find(Boolean);
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function readSeerCreateConfig() {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const fixtureKey = `${params.get('seerFixture') || ''}`.trim().toLowerCase();
  const fixture = SEER_READING_FIXTURES[fixtureKey] || {};
  const cardCount = readSeerPositiveIntParam(params, 'seerCardCount', 'cardCount');
  const preferredCardKinds = readSeerStringArrayParam(params, 'seerPreferredCardKinds', 'preferredCardKinds');
  const allowedCardKinds = readSeerStringArrayParam(params, 'seerAllowedCardKinds', 'allowedCardKinds');
  const cardKinds = readSeerStringArrayParam(params, 'seerCardKinds', 'cardKinds');
  const batchId = `${params.get('seerBatchId') || params.get('batchId') || ''}`.trim();
  const visionMemoryId = `${params.get('seerVisionMemoryId') || params.get('visionMemoryId') || ''}`.trim();
  return {
    fixtureKey,
    cardCount: cardCount || fixture.cardCount || null,
    cardKinds: cardKinds.length ? cardKinds : [],
    preferredCardKinds: preferredCardKinds.length ? preferredCardKinds : (fixture.preferredCardKinds || []),
    allowedCardKinds,
    batchId,
    visionMemoryId
  };
}

function readReadingId() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return `${params.get('readingId') || ''}`.trim();
}

function readSeerDebugMode() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const debugMode = `${params.get('memoryDebug') || ''}`.trim().toLowerCase();
  return ['1', 'true', 'yes', 'debug', 'trace'].includes(debugMode);
}

function parseSeerBooleanParam(rawValue) {
  const normalized = `${rawValue || ''}`.trim().toLowerCase();
  if (!normalized) return null;
  if (['1', 'true', 'yes', 'on', 'mock'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'live'].includes(normalized)) return false;
  return null;
}

function readSeerMockModeConfig() {
  if (typeof window === 'undefined') {
    return {
      value: false,
      explicit: false
    };
  }
  const params = new URLSearchParams(window.location.search);
  const keys = ['seerMock', 'mock', 'memoryMock'];
  for (const key of keys) {
    if (!params.has(key)) continue;
    const parsed = parseSeerBooleanParam(params.get(key));
    if (parsed !== null) {
      return {
        value: parsed,
        explicit: true
      };
    }
  }
  return {
    value: false,
    explicit: false
  };
}

function persistSeerMockMode(nextValue) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('seerMock', nextValue ? '1' : '0');
  const nextQuery = params.toString();
  const nextUrl = nextQuery
    ? `${window.location.pathname}?${nextQuery}`
    : window.location.pathname;
  window.history.replaceState({}, '', nextUrl);
}

function readStoredSessionId() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const queryValue = `${params.get('sessionId') || ''}`.trim();
  if (queryValue) return queryValue;
  return `${window.localStorage.getItem(TYPEWRITER_SESSION_STORAGE_KEY) || ''}`.trim();
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}.`);
  }
  return payload;
}

function renderMemoryValue(memory, field) {
  const raw = memory?.raw || {};
  if (field === 'entities_in_memory') {
    return Array.isArray(raw.entities_in_memory) ? raw.entities_in_memory.join(', ') : '';
  }
  if (field === 'relevant_rolls') {
    return Array.isArray(raw.relevant_rolls) ? raw.relevant_rolls.join(', ') : '';
  }
  return raw[field] || '';
}

function renderLinkedEntityNames(reading, entityIds = []) {
  const byId = new Map((reading?.entities || []).map((entity) => [entity.id, entity.name]));
  return entityIds
    .map((entityId) => byId.get(entityId) || entityId)
    .filter(Boolean)
    .join(', ');
}

function normalizeBankEntity(entity = {}) {
  return {
    ...entity,
    id: `${entity.id || entity._id || ''}`.trim(),
    externalId: `${entity.externalId || entity.id || entity._id || ''}`.trim(),
    type: `${entity.type || ''}`.trim(),
    subtype: `${entity.subtype || ''}`.trim(),
    canonicalStatus: `${entity.canonicalStatus || 'draft'}`.trim(),
    worldId: `${entity.worldId || ''}`.trim(),
    universeId: `${entity.universeId || ''}`.trim(),
    tags: Array.isArray(entity.tags) ? entity.tags : [],
    mediaAssets: Array.isArray(entity.mediaAssets) ? entity.mediaAssets : [],
    evidence: Array.isArray(entity.evidence) ? entity.evidence : [],
    generationCosts: Array.isArray(entity.generationCosts) ? entity.generationCosts : [],
    sourceReadingIds: Array.isArray(entity.sourceReadingIds) ? entity.sourceReadingIds : [],
    claimedFromCardIds: Array.isArray(entity.claimedFromCardIds) ? entity.claimedFromCardIds : [],
    reuseCount: Number.isFinite(Number(entity.reuseCount)) ? Number(entity.reuseCount) : 0,
    lastUsedAt: entity.lastUsedAt || null
  };
}

function extractBankEntities(payload) {
  if (Array.isArray(payload)) {
    return payload.map(normalizeBankEntity);
  }
  if (Array.isArray(payload?.entities)) {
    return payload.entities.map(normalizeBankEntity);
  }
  return [];
}

function extractStorytellers(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.storytellers)) {
    return payload.storytellers;
  }
  return [];
}

function matchesEntityReference(entity = {}, entityRef = '') {
  const safeEntityRef = `${entityRef || ''}`.trim();
  if (!safeEntityRef) return false;
  return [
    entity?.externalId,
    entity?.id,
    entity?._id,
    entity?.sourceEntityId
  ].some((value) => `${value || ''}`.trim() === safeEntityRef);
}

function formatSeerTimestamp(value) {
  if (!value) return 'recently';
  const nextDate = new Date(value);
  if (Number.isNaN(nextDate.getTime())) return 'recently';
  return nextDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function buildSkillEntries(characterSheet) {
  return Object.entries(characterSheet?.skills || {})
    .map(([key, value]) => ({
      key,
      value: Number.isFinite(Number(value)) ? Number(value) : value
    }))
    .filter((entry) => (
      (typeof entry.value === 'number' && entry.value > 0)
      || (typeof entry.value === 'string' && entry.value.trim())
    ))
    .sort((left, right) => {
      if (typeof left.value === 'number' && typeof right.value === 'number') {
        return right.value - left.value;
      }
      return `${left.key}`.localeCompare(`${right.key}`);
    });
}

const SeerReadingPage = () => {
  const [apiBaseUrl] = useState(() => readApiBaseUrl());
  const [sessionId] = useState(() => readStoredSessionId());
  const [readingId, setReadingId] = useState(() => readReadingId());
  const [isDebugMode] = useState(() => readSeerDebugMode());
  const [mockModeConfig] = useState(() => readSeerMockModeConfig());
  const [isMockMode, setIsMockMode] = useState(() => mockModeConfig.value);
  const [createConfig] = useState(() => readSeerCreateConfig());
  const [reading, setReading] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [playerReply, setPlayerReply] = useState('');
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);
  const [characterSheet, setCharacterSheet] = useState(null);
  const [bankEntities, setBankEntities] = useState([]);
  const [bankError, setBankError] = useState('');
  const [isBankLoading, setIsBankLoading] = useState(false);
  const [storytellers, setStorytellers] = useState([]);
  const [isStorytellersLoading, setIsStorytellersLoading] = useState(false);
  const [selectedEntityRef, setSelectedEntityRef] = useState('');
  const [selectedStorytellerId, setSelectedStorytellerId] = useState('');
  const [missionMessage, setMissionMessage] = useState('');
  const [missionPoints, setMissionPoints] = useState(DEFAULT_MISSION_POINTS);
  const [missionDuration, setMissionDuration] = useState(DEFAULT_MISSION_DURATION);
  const [isSendingMission, setIsSendingMission] = useState(false);
  const [missionResult, setMissionResult] = useState(null);
  const [dataRefreshToken, setDataRefreshToken] = useState(0);
  const hasExplicitMockMode = mockModeConfig.explicit;

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        if (!sessionId && !readingId) {
          throw new Error('No session is available for the seer yet. In Story Admin, seed a fragment and open it in Seer Reading.');
        }

        const payload = readingId
          ? await requestJson(apiBaseUrl, `/api/seer/readings/${encodeURIComponent(readingId)}?playerId=${encodeURIComponent(DEFAULT_PLAYER_ID)}`)
          : await requestJson(apiBaseUrl, '/api/seer/readings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                playerId: DEFAULT_PLAYER_ID,
                mock: isMockMode,
                ...(createConfig.cardCount ? { cardCount: createConfig.cardCount } : {}),
                ...(createConfig.cardKinds?.length ? { cardKinds: createConfig.cardKinds } : {}),
                ...(createConfig.preferredCardKinds?.length ? { preferredCardKinds: createConfig.preferredCardKinds } : {}),
                ...(createConfig.allowedCardKinds?.length ? { allowedCardKinds: createConfig.allowedCardKinds } : {}),
                ...(createConfig.batchId ? { batchId: createConfig.batchId } : {}),
                ...(createConfig.visionMemoryId ? { visionMemoryId: createConfig.visionMemoryId } : {})
              })
            });

        if (isCancelled) return;
        setReading(payload);
        if (payload?.characterSheet) {
          setCharacterSheet(payload.characterSheet);
        }

        if (!readingId && payload?.readingId && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          params.set('readingId', payload.readingId);
          const currentMode = `${params.get('mode') || ''}`.trim().toLowerCase();
          if (!currentMode || currentMode === 'seer') {
            params.delete('mode');
          }
          const nextUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, '', nextUrl);
          setReadingId(payload.readingId);
        }
      } catch (nextError) {
        if (isCancelled) return;
        setError(nextError?.message || 'Failed to open seer reading.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, createConfig, isMockMode, readingId, sessionId]);

  useEffect(() => {
    if (hasExplicitMockMode) return;
    if (typeof reading?.metadata?.demoMockMode !== 'boolean') return;
    setIsMockMode(reading.metadata.demoMockMode);
  }, [hasExplicitMockMode, reading?.metadata?.demoMockMode]);

  const focusedMemory = useMemo(
    () => reading?.memories?.find((memory) => memory.focusState === 'active') || reading?.memories?.[0] || null,
    [reading]
  );
  const focusedCard = useMemo(
    () => reading?.cards?.find((card) => card.focusState === 'active') || reading?.cards?.[0] || null,
    [reading]
  );

  const composer = reading?.composer || {
    disabled: true,
    prompt: 'The seer is still gathering the first pressure.',
    suggestions: [],
    submitLabel: 'Answer'
  };
  const resolvedSessionId = reading?.sessionId || sessionId;
  const claimedEntityLinks = Array.isArray(reading?.claimedEntityLinks) ? reading.claimedEntityLinks : [];
  const storytellerOptions = storytellers.length ? storytellers : (Array.isArray(reading?.apparitions) ? reading.apparitions : []);
  const bankEntityRecords = useMemo(
    () => bankEntities.map((entity) => {
      const matchingClaim = claimedEntityLinks.find((link) => (
        matchesEntityReference(entity, link?.entityExternalId)
        || matchesEntityReference(entity, link?.entityId)
      )) || null;
      const readingProjection = (reading?.entities || []).find((candidate) => (
        matchesEntityReference(candidate, entity.externalId)
        || matchesEntityReference(candidate, entity.id)
      )) || null;
      return {
        entity,
        matchingClaim,
        readingProjection
      };
    }),
    [bankEntities, claimedEntityLinks, reading]
  );
  const selectedClaimedEntityRef = selectedEntityRef
    || claimedEntityLinks[claimedEntityLinks.length - 1]?.entityExternalId
    || claimedEntityLinks[claimedEntityLinks.length - 1]?.entityId
    || '';
  const selectedBankEntityRecord = useMemo(
    () => bankEntityRecords.find((record) => (
      matchesEntityReference(record.entity, selectedClaimedEntityRef)
      || matchesEntityReference(record.readingProjection, selectedClaimedEntityRef)
    )) || null,
    [bankEntityRecords, selectedClaimedEntityRef]
  );
  const selectedClaimedLink = useMemo(
    () => claimedEntityLinks.find((link) => (
      `${link?.entityExternalId || ''}`.trim() === `${selectedClaimedEntityRef || ''}`.trim()
      || `${link?.entityId || ''}`.trim() === `${selectedClaimedEntityRef || ''}`.trim()
    )) || claimedEntityLinks[claimedEntityLinks.length - 1] || null,
    [claimedEntityLinks, selectedClaimedEntityRef]
  );
  const selectedBankEntity = selectedBankEntityRecord?.entity || null;
  const selectedReadingEntity = selectedBankEntityRecord?.readingProjection || null;
  const selectedEntityLabel = selectedBankEntity?.name
    || selectedReadingEntity?.name
    || selectedClaimedLink?.title
    || focusedCard?.title
    || 'this thread';
  const selectedStoryteller = useMemo(
    () => storytellerOptions.find((storyteller) => `${storyteller?.id || ''}`.trim() === `${selectedStorytellerId || ''}`.trim()) || null,
    [selectedStorytellerId, storytellerOptions]
  );
  const characterSkillEntries = useMemo(() => buildSkillEntries(characterSheet).slice(0, 6), [characterSheet]);

  useEffect(() => {
    if (reading?.characterSheet) {
      setCharacterSheet(reading.characterSheet);
    }
  }, [reading]);

  useEffect(() => {
    const latestLink = claimedEntityLinks[claimedEntityLinks.length - 1];
    if (!latestLink) return;
    const nextRef = `${latestLink.entityExternalId || latestLink.entityId || ''}`.trim();
    if (!nextRef) return;
    setSelectedEntityRef((current) => current || nextRef);
  }, [claimedEntityLinks]);

  useEffect(() => {
    const firstStorytellerId = `${storytellerOptions[0]?.id || ''}`.trim();
    if (!firstStorytellerId) return;
    setSelectedStorytellerId((current) => current || firstStorytellerId);
  }, [storytellerOptions]);

  useEffect(() => {
    let isCancelled = false;
    const safeSessionId = `${resolvedSessionId || ''}`.trim();
    if (!safeSessionId) return undefined;

    const loadCharacterSheet = async () => {
      try {
        const payload = await fetchImmersiveRpgCharacterSheet(apiBaseUrl, {
          sessionId: safeSessionId,
          playerId: DEFAULT_PLAYER_ID
        });
        if (!isCancelled) {
          setCharacterSheet(payload?.characterSheet || null);
        }
      } catch (nextError) {
        if (!isCancelled && !characterSheet) {
          setCharacterSheet(null);
        }
      }
    };

    void loadCharacterSheet();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, resolvedSessionId, dataRefreshToken]);

  useEffect(() => {
    let isCancelled = false;
    const safeSessionId = `${resolvedSessionId || ''}`.trim();
    const safeReadingId = `${reading?.readingId || readingId || ''}`.trim();
    if (!safeSessionId || !safeReadingId) return undefined;

    const loadBankEntities = async () => {
      setIsBankLoading(true);
      setBankError('');
      try {
        const payload = await requestJson(
          apiBaseUrl,
          `/api/entities?sessionId=${encodeURIComponent(safeSessionId)}&playerId=${encodeURIComponent(DEFAULT_PLAYER_ID)}&linkedReadingId=${encodeURIComponent(safeReadingId)}&sort=reuse&limit=8`
        );
        if (!isCancelled) {
          setBankEntities(extractBankEntities(payload));
        }
      } catch (nextError) {
        if (!isCancelled) {
          setBankError(nextError?.message || 'The entity bank could not be read.');
          setBankEntities([]);
        }
      } finally {
        if (!isCancelled) {
          setIsBankLoading(false);
        }
      }
    };

    void loadBankEntities();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, reading?.readingId, readingId, resolvedSessionId, dataRefreshToken]);

  useEffect(() => {
    let isCancelled = false;
    const safeSessionId = `${resolvedSessionId || ''}`.trim();
    if (!safeSessionId) return undefined;

    const loadStorytellers = async () => {
      setIsStorytellersLoading(true);
      try {
        const payload = await requestJson(
          apiBaseUrl,
          `/api/storytellers?sessionId=${encodeURIComponent(safeSessionId)}&playerId=${encodeURIComponent(DEFAULT_PLAYER_ID)}`
        );
        if (!isCancelled) {
          setStorytellers(extractStorytellers(payload));
        }
      } catch (nextError) {
        if (!isCancelled) {
          setStorytellers([]);
        }
      } finally {
        if (!isCancelled) {
          setIsStorytellersLoading(false);
        }
      }
    };

    void loadStorytellers();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrl, resolvedSessionId, dataRefreshToken]);

  const submitTurn = async (payload) => {
    const safeReadingId = reading?.readingId || readingId;
    if (!safeReadingId) return;

    setIsSubmittingTurn(true);
    setError('');

    try {
      const nextReading = await requestJson(apiBaseUrl, `/api/seer/readings/${encodeURIComponent(safeReadingId)}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: DEFAULT_PLAYER_ID,
          mock: isMockMode,
          ...payload
        })
      });
      setReading(nextReading);
      return nextReading;
    } catch (nextError) {
      setError(nextError?.message || 'The seer could not interpret that turn.');
      return null;
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  const handleSubmitReply = async (event) => {
    event.preventDefault();
    const safeReply = `${playerReply || ''}`.trim();
    if (!safeReply || composer.disabled || isSubmittingTurn) return;

    const nextReading = await submitTurn({ message: safeReply });
    if (nextReading) {
      setPlayerReply('');
    }
  };

  const handleFocusMemory = async (memoryId) => {
    if (!memoryId || isSubmittingTurn || memoryId === reading?.focus?.memoryId) return;
    await submitTurn({
      action: 'focus_memory',
      focusMemoryId: memoryId
    });
  };

  const handleFocusCard = async (cardId) => {
    if (!cardId || isSubmittingTurn || cardId === reading?.focus?.cardId) return;
    await submitTurn({
      action: 'focus_card',
      focusCardId: cardId
    });
  };

  const handleClaimCard = async (cardId) => {
    const safeReadingId = reading?.readingId || readingId;
    if (!safeReadingId || !cardId || isSubmittingTurn) return;

    setIsSubmittingTurn(true);
    setError('');

    try {
      const nextReading = await requestJson(
        apiBaseUrl,
        `/api/seer/readings/${encodeURIComponent(safeReadingId)}/cards/${encodeURIComponent(cardId)}/claim`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: DEFAULT_PLAYER_ID })
        }
      );
      setReading(nextReading);
      if (nextReading?.characterSheet) {
        setCharacterSheet(nextReading.characterSheet);
      }
      setDataRefreshToken((value) => value + 1);
    } catch (nextError) {
      setError(nextError?.message || 'The seer could not seal that card.');
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  const handleSendMission = async (event) => {
    event.preventDefault();
    const safeSessionId = `${resolvedSessionId || ''}`.trim();
    const safeEntityId = `${selectedBankEntity?.externalId || selectedBankEntity?.id || selectedClaimedEntityRef || ''}`.trim();
    const safeStorytellerId = `${selectedStorytellerId || ''}`.trim();
    const safeMessage = `${missionMessage || ''}`.trim();

    if (!safeSessionId || !safeEntityId || !safeStorytellerId || !safeMessage || isSendingMission) return;

    setIsSendingMission(true);
    setError('');

    try {
      const payload = await requestJson(apiBaseUrl, '/api/sendStorytellerToEntity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: safeSessionId,
          playerId: DEFAULT_PLAYER_ID,
          entityId: safeEntityId,
          storytellerId: safeStorytellerId,
          mock: isMockMode,
          storytellingPoints: Number.isFinite(Number(missionPoints))
            ? Math.max(1, Math.floor(Number(missionPoints)))
            : DEFAULT_MISSION_POINTS,
          message: safeMessage,
          duration: Number.isFinite(Number(missionDuration))
            ? Math.max(1, Math.floor(Number(missionDuration)))
            : DEFAULT_MISSION_DURATION
        })
      });

      setMissionResult(payload);
      if (payload?.characterSheet) {
        setCharacterSheet(payload.characterSheet);
      }
      setMissionMessage('');
      setDataRefreshToken((value) => value + 1);
    } catch (nextError) {
      setError(nextError?.message || 'The storyteller could not deepen that thread.');
    } finally {
      setIsSendingMission(false);
    }
  };

  return (
    <div className="seerReadingPage">
      <div className="seerReadingBackdrop" />
      <header className="seerReadingHeader">
        <div>
          <p className="seerReadingEyebrow">Ritual Witness</p>
          <h1>Seer Reading</h1>
          <p className="seerReadingLead">
            The seer advances the reading one consequence at a time, leaving behind a spread the rest of the world can use.
          </p>
          <div className="seerModeControls">
            <button
              type="button"
              className={`seerModeToggle ${isMockMode ? 'is-mock' : 'is-live'}`}
              aria-pressed={isMockMode}
              onClick={() => {
                const nextValue = !isMockMode;
                setIsMockMode(nextValue);
                persistSeerMockMode(nextValue);
              }}
            >
              {isMockMode ? 'Mock Mode' : 'Live Mode'}
            </button>
            <span className="seerModeCaption">
              {isMockMode
                ? 'Deterministic demo path: mocked card drafting, entity generation, and storyteller missions.'
                : 'Live path: requests use the configured AI pipelines.'}
            </span>
          </div>
        </div>
        <div className="seerReadingMeta">
          <span>Mode: {isMockMode ? 'mock' : 'live'}</span>
          <span>Session: {sessionId || 'missing'}</span>
          <span>Reading: {reading?.readingId || readingId || 'pending'}</span>
          <span>Status: {reading?.status || (isLoading ? 'loading' : 'idle')}</span>
          {!!reading?.worldId && <span>World: {reading.worldId}</span>}
          {!!reading?.universeId && <span>Universe: {reading.universeId}</span>}
        </div>
      </header>

      {error && (
        <section className="seerReadingError" aria-label="Seer reading error">
          <strong>The reading cannot yet begin.</strong>
          <p>{error}</p>
        </section>
      )}

      {!error && (
        <div className="seerReadingLayout">
          <section className="seerTranscriptPanel" aria-label="Seer transcript">
            <div className="seerPanelHeader">
              <h2>Seer Voice</h2>
              <span>{reading?.beat || (isLoading ? 'invocation' : 'idle')}</span>
            </div>

            <div className="seerTranscriptLog">
              {isLoading && <p className="seerTranscriptPlaceholder">Summoning the triad...</p>}
              {!isLoading && !reading?.transcript?.length && (
                <p className="seerTranscriptPlaceholder">No transcript yet.</p>
              )}
              {(reading?.transcript || []).map((entry) => (
                <article key={entry.id} className={`seerTranscriptEntry role-${entry.role || 'system'}`}>
                  <span>
                    {entry.role === 'seer' ? 'Seer' : entry.role === 'player' ? 'Player' : 'System'}
                  </span>
                  <p>{entry.content}</p>
                </article>
              ))}
            </div>

            <form className="seerComposerStub" onSubmit={handleSubmitReply}>
              <label htmlFor="seerComposer">Player reply</label>
              <p className="seerComposerPrompt">{composer.prompt}</p>
              <textarea
                id="seerComposer"
                disabled={composer.disabled || isSubmittingTurn || isLoading}
                value={playerReply}
                onChange={(event) => setPlayerReply(event.target.value)}
                placeholder={composer.disabled ? 'The seer is still listening to the spread.' : 'Answer the seer.'}
              />
              {!!composer.suggestions?.length && (
                <div className="seerComposerSuggestions">
                  {composer.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="seerSuggestionChip"
                      onClick={() => setPlayerReply(suggestion)}
                      disabled={composer.disabled || isSubmittingTurn || isLoading}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="submit"
                className="seerComposerSubmit"
                disabled={composer.disabled || isSubmittingTurn || isLoading || !`${playerReply || ''}`.trim()}
              >
                {isSubmittingTurn ? 'Listening…' : (composer.submitLabel || 'Answer')}
              </button>
            </form>
          </section>

          <section className="seerTriadPanel" aria-label="Reading cards">
            <div className="seerPanelHeader">
              <h2>Reading Cards</h2>
              <span>{reading?.cards?.length || 0} in spread</span>
            </div>
            <div className="seerTriadGrid">
              {(reading?.cards || []).map((card) => (
                <article
                  key={card.id}
                  className={`seerMemoryCard ${card.focusState === 'active' ? 'is-focused' : 'is-muted'}`}
                  onClick={() => void handleFocusCard(card.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void handleFocusCard(card.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={card.focusState === 'active'}
                >
                  <small>{card.kind || 'card'}</small>
                  <h3>{card.title || 'Unknown card'}</h3>
                  <p>{card.front?.summary || card.likelyRelationHint || card.status || 'back only'}</p>
                  <div className="seerMemoryStats">
                    <span>Status: {card.status || 'back_only'}</span>
                    <span>Clarity: {Math.round((card.clarity || 0) * 100)}%</span>
                    <span>Tier: {card.revealTier ?? 0}</span>
                  </div>
                </article>
              ))}
            </div>

            <div className="seerFocusDetail">
              <div className="seerPanelHeader">
                <h2>Focused Card</h2>
                <span>{focusedCard?.kind || 'none'}</span>
              </div>
              {!focusedCard && <p className="seerTranscriptPlaceholder">No focused card yet.</p>}
              {focusedCard && (
                <div className="seerFocusFields">
                  <div className="seerFieldChip">
                    <strong>Status</strong>
                    <span>{focusedCard.status || 'back_only'}</span>
                  </div>
                  <div className="seerFieldChip">
                    <strong>Clarity</strong>
                    <span>{Math.round((focusedCard.clarity || 0) * 100)}%</span>
                  </div>
                  {!!focusedCard.back?.mood?.length && (
                    <div className="seerFieldChip">
                      <strong>Mood</strong>
                      <span>{focusedCard.back.mood.join(', ')}</span>
                    </div>
                  )}
                  {!!focusedCard.back?.motifs?.length && (
                    <div className="seerFieldChip">
                      <strong>Motifs</strong>
                      <span>{focusedCard.back.motifs.join(', ')}</span>
                    </div>
                  )}
                  {!!focusedCard.front?.summary && (
                    <div className="seerFieldChip">
                      <strong>Reading</strong>
                      <span>{focusedCard.front.summary}</span>
                    </div>
                  )}
                  {!!focusedCard.linkedEntityIds?.length && (
                    <div className="seerFieldChip">
                      <strong>Bound To</strong>
                      <span>{renderLinkedEntityNames(reading, focusedCard.linkedEntityIds)}</span>
                    </div>
                  )}
                </div>
              )}
              {focusedCard?.status === 'claimable' && (
                <div className="seerActionRow">
                  <button
                    type="button"
                    className="seerComposerSubmit"
                    disabled={isSubmittingTurn || isLoading}
                    onClick={() => void handleClaimCard(focusedCard.id)}
                  >
                    {isSubmittingTurn ? 'Sealing…' : 'Seal and Keep'}
                  </button>
                </div>
              )}
            </div>

            <div className="seerFocusDetail">
              <div className="seerPanelHeader">
                <h2>Vision Evidence</h2>
                <span>{focusedMemory?.temporalSlot || 'none'}</span>
              </div>
              {!focusedMemory && <p className="seerTranscriptPlaceholder">No focused vision evidence yet.</p>}
              {focusedMemory && (
                <div className="seerFocusFields">
                  {focusedMemory.visibleFields.map((field) => {
                    const value = renderMemoryValue(focusedMemory, field);
                    if (!value) return null;
                    return (
                      <div key={`${focusedMemory.id}-${field}`} className="seerFieldChip">
                        <strong>{FIELD_LABELS[field] || field}</strong>
                        <span>{value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="seerFocusDetail">
              <div className="seerPanelHeader">
                <h2>Claimed Cards</h2>
                <span>{reading?.claimedCards?.length || 0}</span>
              </div>
              <div className="seerChipRow">
                {(reading?.claimedCards || []).map((card) => (
                  <button
                    key={card.cardId || card.title}
                    type="button"
                    className={`seerPresenceChip claimed seerPresenceChipButton ${(
                      `${card.entityExternalId || card.entityId || ''}`.trim()
                      && `${card.entityExternalId || card.entityId || ''}`.trim() === `${selectedClaimedEntityRef || ''}`.trim()
                    ) ? 'is-selected' : ''}`}
                    onClick={() => setSelectedEntityRef(`${card.entityExternalId || card.entityId || ''}`.trim())}
                  >
                    {card.title || card.kind || 'Claimed card'}
                  </button>
                ))}
                {!reading?.claimedCards?.length && (
                  <span className="seerPresenceEmpty">No cards have been sealed yet.</span>
                )}
              </div>
            </div>
          </section>

          <section className="seerSpreadPanel" aria-label="Reading spread">
            <div className="seerPanelHeader">
              <h2>Spread</h2>
              <span>{reading?.spread?.layoutMode || 'seer_triad'}</span>
            </div>

            <div className="seerSpreadCanvas">
              {(reading?.spread?.nodes || []).map((node) => (
                <div
                  key={node.id}
                  className={`seerSpreadNode kind-${node.kind} ${node.id === reading?.spread?.focusMemoryId ? 'is-focused' : ''}`}
                  style={{
                    left: `${50 + ((node.x || 0) * 22)}%`,
                    top: `${52 + ((node.y || 0) * 22)}%`
                  }}
                >
                  <strong>{node.label}</strong>
                  {node.kind === 'memory' && <span>{node.temporalSlot}</span>}
                  {node.kind === 'fragment' && <span>anchor</span>}
                </div>
              ))}
            </div>

            <div className="seerPresenceRails">
              <div>
                <div className="seerPanelHeader seerPanelHeader-sub">
                  <h2>Entity Bank</h2>
                  <span>{bankEntityRecords.length || 0}</span>
                </div>
                {bankError && <p className="seerPanelNote">{bankError}</p>}
                {isBankLoading && <p className="seerPanelNote">Retrieving persistent entities...</p>}
                <div className="seerAssetList">
                  {bankEntityRecords.map((record) => {
                    const entityRef = record.entity.externalId || record.entity.id;
                    const isSelected = `${entityRef || ''}`.trim() === `${selectedClaimedEntityRef || ''}`.trim();
                    return (
                      <button
                        key={entityRef}
                        type="button"
                        className={`seerAssetCard ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedEntityRef(`${entityRef || ''}`.trim())}
                      >
                        <div className="seerAssetCardHeader">
                          <div>
                            <small>{record.entity.type || 'entity'}</small>
                            <strong>{record.entity.name || record.matchingClaim?.title || 'Unnamed entity'}</strong>
                          </div>
                          <span>{record.entity.canonicalStatus || 'draft'}</span>
                        </div>
                        <p>
                          {record.entity.description
                            || record.readingProjection?.description
                            || record.readingProjection?.lore
                            || 'Bound from the reading and ready for deeper investigation.'}
                        </p>
                        <div className="seerMetricGrid">
                          <div className="seerMetric">
                            <strong>Reuse</strong>
                            <span>{record.entity.reuseCount || 0}</span>
                          </div>
                          <div className="seerMetric">
                            <strong>Evidence</strong>
                            <span>{record.entity.evidence?.length || 0}</span>
                          </div>
                          <div className="seerMetric">
                            <strong>Media</strong>
                            <span>{record.entity.mediaAssets?.length || 0}</span>
                          </div>
                          <div className="seerMetric">
                            <strong>Claimed</strong>
                            <span>{formatSeerTimestamp(record.matchingClaim?.claimedAt)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {!bankEntityRecords.length && !isBankLoading && (
                    <span className="seerPresenceEmpty">No persistent entities have been tied to this reading yet.</span>
                  )}
                </div>
              </div>

              <div>
                <div className="seerPanelHeader seerPanelHeader-sub">
                  <h2>Apparitions</h2>
                  <span>{reading?.apparitions?.length || 0}</span>
                </div>
                <div className="seerChipRow">
                  {(reading?.apparitions || []).map((apparition) => (
                    <span key={apparition.id} className="seerPresenceChip apparition">
                      {apparition.name}
                    </span>
                  ))}
                  {!reading?.apparitions?.length && <span className="seerPresenceEmpty">No apparitions are available yet.</span>}
                </div>
              </div>

              <div className="seerFocusDetail">
                <div className="seerPanelHeader seerPanelHeader-sub">
                  <h2>Canonical Thread</h2>
                  <span>{selectedBankEntity ? 'persistent' : 'pending'}</span>
                </div>
                {!selectedClaimedLink && <span className="seerPresenceEmpty">Seal a card to create a reusable thread.</span>}
                {!!selectedClaimedLink && (
                  <div className="seerFocusFields">
                    <div className="seerFieldChip">
                      <strong>Card</strong>
                      <span>{selectedClaimedLink.title || 'Claimed thread'}</span>
                    </div>
                    <div className="seerFieldChip">
                      <strong>Entity Id</strong>
                      <span>{selectedClaimedLink.entityExternalId || selectedClaimedLink.entityId || 'pending'}</span>
                    </div>
                    <div className="seerFieldChip">
                      <strong>Canonical Status</strong>
                      <span>{selectedBankEntity?.canonicalStatus || 'linked'}</span>
                    </div>
                    <div className="seerFieldChip">
                      <strong>World Link</strong>
                      <span>{selectedBankEntity?.worldId || reading?.worldId || 'session world'}</span>
                    </div>
                    {!!selectedBankEntity?.tags?.length && (
                      <div className="seerFieldChip">
                        <strong>Tags</strong>
                        <span>{selectedBankEntity.tags.join(', ')}</span>
                      </div>
                    )}
                    <div className="seerFieldChip">
                      <strong>Bank Route</strong>
                      <span>/api/entities?linkedReadingId={reading?.readingId || 'reading'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="seerFocusDetail">
                <div className="seerPanelHeader seerPanelHeader-sub">
                  <h2>Deepen This Thread</h2>
                  <span>{selectedStoryteller ? selectedStoryteller.name : (isStorytellersLoading ? 'gathering...' : 'no guide')}</span>
                </div>
                <form className="seerMissionForm" onSubmit={handleSendMission}>
                  <label htmlFor="seerStorytellerSelect">Storyteller</label>
                  <select
                    id="seerStorytellerSelect"
                    value={selectedStorytellerId}
                    onChange={(event) => setSelectedStorytellerId(event.target.value)}
                    disabled={!storytellerOptions.length || isSendingMission}
                  >
                    {!storytellerOptions.length && <option value="">No storyteller available</option>}
                    {storytellerOptions.map((storyteller) => (
                      <option key={storyteller.id} value={storyteller.id}>
                        {storyteller.name}
                      </option>
                    ))}
                  </select>

                  <div className="seerMissionGrid">
                    <label>
                      <span>Points</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={missionPoints}
                        onChange={(event) => setMissionPoints(event.target.value)}
                        disabled={isSendingMission}
                      />
                    </label>
                    <label>
                      <span>Days</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={missionDuration}
                        onChange={(event) => setMissionDuration(event.target.value)}
                        disabled={isSendingMission}
                      />
                    </label>
                  </div>

                  <label htmlFor="seerMissionPrompt">Instruction</label>
                  <textarea
                    id="seerMissionPrompt"
                    value={missionMessage}
                    onChange={(event) => setMissionMessage(event.target.value)}
                    disabled={!selectedClaimedEntityRef || isSendingMission}
                    placeholder={`Ask for what ${selectedEntityLabel} meant, changed, or concealed.`}
                  />

                  <button
                    type="submit"
                    className="seerComposerSubmit"
                    disabled={!selectedClaimedEntityRef || !selectedStorytellerId || !`${missionMessage || ''}`.trim() || isSendingMission}
                  >
                    {isSendingMission ? 'Sending...' : 'Send Storyteller'}
                  </button>
                </form>

                {missionResult && (
                  <div className="seerMissionResult">
                    <div className="seerMetricGrid">
                      <div className="seerMetric">
                        <strong>Outcome</strong>
                        <span>{missionResult.outcome || 'pending'}</span>
                      </div>
                      <div className="seerMetric">
                        <strong>Sub-Entities</strong>
                        <span>{missionResult.subEntities?.length || 0}</span>
                      </div>
                      <div className="seerMetric">
                        <strong>Mission Mode</strong>
                        <span>{missionResult?.runtime?.mission?.mocked ? 'mock' : 'live'}</span>
                      </div>
                    </div>
                    {!!missionResult.userText && <p>{missionResult.userText}</p>}
                    {!!missionResult.gmNote && <p className="seerPanelNote">{missionResult.gmNote}</p>}
                    {!!missionResult.subEntities?.length && (
                      <div className="seerChipRow">
                        {missionResult.subEntities.map((entity) => (
                          <span key={entity.externalId || entity._id || entity.id} className="seerPresenceChip">
                            {entity.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="seerFocusDetail">
                <div className="seerPanelHeader seerPanelHeader-sub">
                  <h2>Character Sheet</h2>
                  <span>{characterSheet ? 'projected' : 'pending'}</span>
                </div>
                {!characterSheet && <span className="seerPresenceEmpty">Claims and missions will begin to define the character here.</span>}
                {!!characterSheet && (
                  <div className="seerSheetPanel">
                    <div className="seerSheetIdentity">
                      <strong>{characterSheet?.identity?.name || selectedEntityLabel}</strong>
                      <span>{characterSheet?.identity?.archetype || characterSheet?.identity?.occupation || 'Emergent protagonist'}</span>
                    </div>
                    <div className="seerMetricGrid">
                      <div className="seerMetric">
                        <strong>Drive</strong>
                        <span>{characterSheet?.coreTraits?.drive || 'Still forming'}</span>
                      </div>
                      <div className="seerMetric">
                        <strong>Burden</strong>
                        <span>{characterSheet?.coreTraits?.burden || 'Not yet named'}</span>
                      </div>
                      <div className="seerMetric">
                        <strong>Calling</strong>
                        <span>{characterSheet?.identity?.occupation || 'Uncertain'}</span>
                      </div>
                    </div>
                    <div className="seerSheetSkills">
                      {characterSkillEntries.map((skill) => (
                        <span key={skill.key} className="seerPresenceChip">
                          {skill.key}: {skill.value}
                        </span>
                      ))}
                      {!characterSkillEntries.length && (
                        <span className="seerPresenceEmpty">No skills have crystallized yet.</span>
                      )}
                    </div>
                    <div className="seerSheetNotes">
                      {(characterSheet?.notes || []).slice(0, 4).map((note) => (
                        <p key={note} className="seerSheetNote">{note}</p>
                      ))}
                      {!characterSheet?.notes?.length && (
                        <span className="seerPresenceEmpty">The seer has not yet fixed any keeper notes.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {isDebugMode && (
            <section className="seerDebugPanel" aria-label="Seer runtime trace">
              <div className="seerPanelHeader">
                <h2>Trace</h2>
                <span>{reading?.lastTurn?.transitionType || 'idle'}</span>
              </div>

              <div className="seerFocusFields">
                <div className="seerFieldChip">
                  <strong>Runtime</strong>
                  <span>{reading?.orchestrator?.runtimeId || 'pending'}</span>
                </div>
                <div className="seerFieldChip">
                  <strong>Turn Mode</strong>
                  <span>{reading?.orchestrator?.pipeline?.useMock ? 'Mock' : 'Live'}</span>
                </div>
                <div className="seerFieldChip">
                  <strong>Persona</strong>
                  <span>{reading?.orchestrator?.persona?.id || 'pending'}</span>
                </div>
                <div className="seerFieldChip">
                  <strong>Card Drafting</strong>
                  <span>{reading?.metadata?.cardConfig?.generationMode || 'pending'}</span>
                </div>
                <div className="seerFieldChip">
                  <strong>Decision Source</strong>
                  <span>{reading?.lastTurn?.decisionSource || 'pending'}</span>
                </div>
                <div className="seerFieldChip">
                  <strong>Beat</strong>
                  <span>{reading?.beat || 'idle'}</span>
                </div>
                <div className="seerFieldChip">
                  <strong>Focus</strong>
                  <span>{reading?.lastTurn?.focusCardId || reading?.focus?.cardId || reading?.lastTurn?.focusMemoryId || reading?.focus?.memoryId || 'none'}</span>
                </div>
                <div className="seerFieldChip">
                  <strong>Card Kinds</strong>
                  <span>{reading?.metadata?.cardConfig?.generatedKinds?.join(', ') || 'pending'}</span>
                </div>
              </div>

              <div className="seerPresenceRails">
                <div>
                  <div className="seerPanelHeader seerPanelHeader-sub">
                    <h2>Available Tools</h2>
                    <span>{reading?.orchestrator?.availableTools?.length || 0}</span>
                  </div>
                  <div className="seerChipRow">
                    {(reading?.orchestrator?.availableTools || []).map((tool) => (
                      <span key={tool.id} className="seerPresenceChip">
                        {tool.id}
                      </span>
                    ))}
                    {!reading?.orchestrator?.availableTools?.length && (
                      <span className="seerPresenceEmpty">No runtime tools exposed yet.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="seerPanelHeader seerPanelHeader-sub">
                    <h2>Last Tool Calls</h2>
                    <span>{reading?.lastTurn?.toolCalls?.length || 0}</span>
                  </div>
                  <div className="seerDebugToolList">
                    {(reading?.lastTurn?.toolCalls || []).map((toolCall, index) => (
                      <article key={`${toolCall.tool_id || 'tool'}-${index}`} className="seerDebugToolCall">
                        <strong>{toolCall.tool_id || 'unknown_tool'}</strong>
                        <span>{toolCall.reason || 'No reason recorded.'}</span>
                      </article>
                    ))}
                    {!reading?.lastTurn?.toolCalls?.length && (
                      <span className="seerPresenceEmpty">No tool calls recorded yet.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="seerPresenceRails">
                <div>
                  <div className="seerPanelHeader seerPanelHeader-sub">
                    <h2>Execution Trace</h2>
                    <span>{reading?.lastTurn?.executionTrace?.length || 0}</span>
                  </div>
                  <div className="seerDebugToolList">
                    {(reading?.lastTurn?.executionTrace || []).map((entry, index) => (
                      <article key={`${entry.toolId || 'trace'}-${index}`} className="seerDebugToolCall">
                        <strong>{entry.toolId || 'unknown_tool'} · {entry.status || 'unknown'}</strong>
                        <span>{entry.reason || entry.error || 'No trace detail recorded.'}</span>
                        {entry?.output?.summary && (
                          <span>{entry.output.summary}</span>
                        )}
                      </article>
                    ))}
                    {!reading?.lastTurn?.executionTrace?.length && (
                      <span className="seerPresenceEmpty">No execution trace recorded yet.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="seerPanelHeader seerPanelHeader-sub">
                    <h2>Prompt / Response</h2>
                    <span>{reading?.lastTurn?.orchestratorError ? 'fallback' : 'ok'}</span>
                  </div>
                  <div className="seerFocusFields">
                    <div className="seerFieldChip">
                      <strong>Error</strong>
                      <span>{reading?.lastTurn?.orchestratorError || 'none'}</span>
                    </div>
                    <div className="seerFieldChip">
                      <strong>Notes</strong>
                      <span>{(reading?.lastTurn?.executionNotes || []).join(', ') || 'none'}</span>
                    </div>
                  </div>
                  <label className="seerStructuredField">
                    <span>Compiled orchestrator prompt</span>
                    <textarea
                      readOnly
                      value={reading?.lastTurn?.orchestratorPromptText || ''}
                      rows={10}
                    />
                  </label>
                  <label className="seerStructuredField">
                    <span>Structured orchestrator response</span>
                    <textarea
                      readOnly
                      value={reading?.lastTurn?.orchestratorResponseText || ''}
                      rows={10}
                    />
                  </label>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SeerReadingPage;

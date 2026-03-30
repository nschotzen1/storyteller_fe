import React, { useEffect, useMemo, useState } from 'react';
import './SeerReadingPage.css';

const DEFAULT_API_BASE_URL = 'http://localhost:5001';
const TYPEWRITER_SESSION_STORAGE_KEY = 'sessionId';
const DEFAULT_PLAYER_ID = 'memory-spread-player';
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

function readStoredSessionId() {
  if (typeof window === 'undefined') return '';
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

const SeerReadingPage = () => {
  const [apiBaseUrl] = useState(() => readApiBaseUrl());
  const [sessionId] = useState(() => readStoredSessionId());
  const [readingId, setReadingId] = useState(() => readReadingId());
  const [isDebugMode] = useState(() => readSeerDebugMode());
  const [createConfig] = useState(() => readSeerCreateConfig());
  const [reading, setReading] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [playerReply, setPlayerReply] = useState('');
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        if (!sessionId && !readingId) {
          throw new Error('A stored session is required before the seer can begin the reading.');
        }

        const payload = readingId
          ? await requestJson(apiBaseUrl, `/api/seer/readings/${encodeURIComponent(readingId)}?playerId=${encodeURIComponent(DEFAULT_PLAYER_ID)}`)
          : await requestJson(apiBaseUrl, '/api/seer/readings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                playerId: DEFAULT_PLAYER_ID,
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
  }, [apiBaseUrl, createConfig, readingId, sessionId]);

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
    } catch (nextError) {
      setError(nextError?.message || 'The seer could not seal that card.');
    } finally {
      setIsSubmittingTurn(false);
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
        </div>
        <div className="seerReadingMeta">
          <span>Session: {sessionId || 'missing'}</span>
          <span>Reading: {reading?.readingId || readingId || 'pending'}</span>
          <span>Status: {reading?.status || (isLoading ? 'loading' : 'idle')}</span>
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
                  <span key={card.cardId || card.title} className="seerPresenceChip claimed">
                    {card.title || card.kind || 'Claimed card'}
                  </span>
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
                  <h2>Entities</h2>
                  <span>{reading?.entities?.length || 0}</span>
                </div>
                <div className="seerChipRow">
                  {(reading?.entities || []).map((entity) => (
                    <span key={entity.id} className="seerPresenceChip">
                      {entity.name}
                    </span>
                  ))}
                  {!reading?.entities?.length && <span className="seerPresenceEmpty">No seeded entities yet.</span>}
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
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SeerReadingPage;

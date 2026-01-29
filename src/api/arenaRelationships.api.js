// arenaRelationships.api.js

const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) return '';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
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

const requestJson = async (baseUrl, path, options = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const url = safeBaseUrl ? `${safeBaseUrl}${path}` : path;
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return { payload, status: response.status };
  if (response.status === 409) return { payload, status: response.status };
  const message = payload?.error || payload?.message || 'Request failed.';
  throw new Error(message);
};

const normalizeMockFlag = (payload, mockApiCalls) => {
  const next = { ...payload };
  if (next.mock_api_calls === undefined && next.mocked_api_calls !== undefined) {
    next.mock_api_calls = next.mocked_api_calls;
    delete next.mocked_api_calls;
  }
  if (next.mock_api_calls === undefined) {
    next.mock_api_calls = mockApiCalls;
  }
  return next;
};

/**
 * POST /api/arena/relationships/validate
 * Preview validation (no commit)
 */
export const validateRelationship = async (
  sessionId,
  playerId,
  sourceId,
  targetId,
  relationshipText,
  baseUrl = '',
  { mockApiCalls = true, arenaId } = {}
) => {
  const payload = normalizeMockFlag(
    {
      sessionId,
      playerId,
      arenaId,
      source: { cardId: sourceId },
      targets: [{ cardId: targetId }],
      relationship: { surfaceText: relationshipText },
      options: { dryRun: true }
    },
    mockApiCalls
  );
  const { payload: responsePayload } = await requestJson(baseUrl, '/api/arena/relationships/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return responsePayload;
};

/**
 * POST /api/arena/relationships/propose
 * Create relationship (judge + commit)
 */
export const proposeRelationship = async (payload, baseUrl = '', { mockApiCalls = true } = {}) => {
  const normalizedPayload = normalizeMockFlag(payload, mockApiCalls);
  const { payload: responsePayload, status } = await requestJson(
    baseUrl,
    '/api/arena/relationships/propose',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload)
    }
  );
  if (status === 409) {
    return {
      verdict: 'rejected',
      quality: {
        score: 0,
        confidence: 1,
        reasons: [responsePayload?.message || 'Duplicate edge already exists.']
      },
      existingEdge: responsePayload?.existingEdge
    };
  }
  return responsePayload;
};

/**
 * GET /api/arena/state
 * Get full arena graph
 */
export const fetchArenaState = async (
  sessionId,
  playerId,
  baseUrl = '',
  { mockApiCalls = true, arenaId } = {}
) => {
  const query = buildQuery({
    sessionId,
    playerId,
    arenaId,
    mock_api_calls: mockApiCalls
  });
  const { payload } = await requestJson(baseUrl, `/api/arena/state${query}`, {
    method: 'GET'
  });
  return payload;
};

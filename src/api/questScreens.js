const DEFAULT_API_BASE_URL = 'http://localhost:5001';

const normalizeBaseUrl = (baseUrl) => {
  const value = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : DEFAULT_API_BASE_URL;
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'Request failed.';
    throw new Error(message);
  }

  return payload;
};

const buildAdminHeaders = (adminKey) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (adminKey && typeof adminKey === 'string' && adminKey.trim()) {
    headers['x-admin-key'] = adminKey.trim();
  }

  return headers;
};

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const loadQuestScreens = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { sessionId, questId } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(
    `${safeBaseUrl}/api/quest/screens${buildQuery({ sessionId, questId })}`,
    { method: 'GET' }
  );
};

export const saveQuestScreens = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload,
  { adminKey } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/quest/screens`, {
    method: 'PUT',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify(payload)
  });
};

export const resetQuestScreens = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {},
  { adminKey } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/quest/screens/reset`, {
    method: 'POST',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify({
      sessionId: payload?.sessionId,
      questId: payload?.questId
    })
  });
};

export const uploadQuestSceneImage = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {},
  { adminKey } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/quest/scene-image`, {
    method: 'POST',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify(payload)
  });
};

export const inspectQuestDebugContext = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {},
  { adminKey } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/quest/debug-context`, {
    method: 'POST',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify(payload)
  });
};

export const logQuestTraversal = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/quest/traversal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};

export const loadQuestTraversal = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { sessionId, questId } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(
    `${safeBaseUrl}/api/quest/traversal${buildQuery({ sessionId, questId })}`,
    { method: 'GET' }
  );
};

export const advanceQuest = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/quest/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};

export const materializeRoseCourtLocationMurals = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/rose-court/prologue/materialize-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};

export { DEFAULT_API_BASE_URL };

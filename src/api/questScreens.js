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
  const headers = {
    'Content-Type': 'application/json'
  };

  if (adminKey && typeof adminKey === 'string' && adminKey.trim()) {
    headers['x-admin-key'] = adminKey.trim();
  }

  return requestJson(`${safeBaseUrl}/api/admin/quest/screens`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload)
  });
};

export const resetQuestScreens = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {},
  { adminKey } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const headers = {
    'Content-Type': 'application/json'
  };

  if (adminKey && typeof adminKey === 'string' && adminKey.trim()) {
    headers['x-admin-key'] = adminKey.trim();
  }

  return requestJson(`${safeBaseUrl}/api/admin/quest/screens/reset`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sessionId: payload?.sessionId,
      questId: payload?.questId
    })
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

export { DEFAULT_API_BASE_URL };

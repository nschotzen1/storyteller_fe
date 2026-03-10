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

export const fetchImmersiveRpgScene = async (
  baseUrl = DEFAULT_API_BASE_URL,
  params = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/immersive-rpg/scene${buildQuery(params)}`, {
    method: 'GET'
  });
};

export const bootstrapImmersiveRpgScene = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/immersive-rpg/scene/bootstrap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export const sendImmersiveRpgChat = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/immersive-rpg/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export const rollImmersiveRpg = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/immersive-rpg/rolls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export const fetchImmersiveRpgCharacterSheet = async (
  baseUrl = DEFAULT_API_BASE_URL,
  params = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/immersive-rpg/character-sheet${buildQuery(params)}`, {
    method: 'GET'
  });
};

export const saveImmersiveRpgCharacterSheet = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/immersive-rpg/character-sheet`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export { DEFAULT_API_BASE_URL };

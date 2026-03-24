import { DEFAULT_API_BASE_URL } from './wellAdmin';

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

export const startWellSession = async (baseUrl = DEFAULT_API_BASE_URL, payload = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/well/session/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export const getWellSession = async (baseUrl = DEFAULT_API_BASE_URL, sessionId, { playerId = '' } = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const url = new URL(`${safeBaseUrl}/api/well/session/${encodeURIComponent(sessionId)}`);
  if (playerId) {
    url.searchParams.set('playerId', playerId);
  }
  return requestJson(url.toString(), {
    method: 'GET'
  });
};

export const nextWellFragment = async (baseUrl = DEFAULT_API_BASE_URL, payload = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/well/session/next-fragment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export const saveWellJot = async (baseUrl = DEFAULT_API_BASE_URL, payload = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/well/session/jot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export const handoffWellBundle = async (baseUrl = DEFAULT_API_BASE_URL, payload = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/well/session/handoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

const DEFAULT_API_BASE_URL = 'http://localhost:5001';
const DEFAULT_SCENE_ID = 'messanger';

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

export const loadMessengerConversation = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { sessionId, sceneId = DEFAULT_SCENE_ID } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const params = new URLSearchParams();
  params.set('sessionId', sessionId);
  if (sceneId) params.set('sceneId', sceneId);
  return requestJson(`${safeBaseUrl}/api/messenger/chat?${params.toString()}`, {
    method: 'GET'
  });
};

export const sendMessengerMessage = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/messenger/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export const resetMessengerConversation = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { sessionId, sceneId = DEFAULT_SCENE_ID } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const params = new URLSearchParams();
  params.set('sessionId', sessionId);
  if (sceneId) params.set('sceneId', sceneId);
  return requestJson(`${safeBaseUrl}/api/messenger/chat?${params.toString()}`, {
    method: 'DELETE'
  });
};

export { DEFAULT_API_BASE_URL, DEFAULT_SCENE_ID };

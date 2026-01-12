const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) return '';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const requestJson = async (url, options) => {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || 'Request failed.';
    throw new Error(message);
  }
  return payload;
};

export const registerPlayer = async (baseUrl, { sessionId, playerName }) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const url = `${safeBaseUrl}/api/sessions/${encodeURIComponent(sessionId)}/players`;
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName })
  });
};

export const fetchSessionPlayers = async (baseUrl, sessionId) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const url = `${safeBaseUrl}/api/sessions/${encodeURIComponent(sessionId)}/players`;
  return requestJson(url, { method: 'GET' });
};

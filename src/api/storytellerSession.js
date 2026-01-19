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

const buildQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const registerPlayer = async (baseUrl, { sessionId, playerName, mockApiCalls = true }) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const url = `${safeBaseUrl}/api/sessions/${encodeURIComponent(sessionId)}/players`;
  return requestJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, mock_api_calls: mockApiCalls })
  });
};

export const fetchSessionPlayers = async (baseUrl, sessionId, { mockApiCalls = true } = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const url = `${safeBaseUrl}/api/sessions/${encodeURIComponent(sessionId)}/players${buildQuery({
    mock_api_calls: mockApiCalls
  })}`;
  return requestJson(url, { method: 'GET' });
};

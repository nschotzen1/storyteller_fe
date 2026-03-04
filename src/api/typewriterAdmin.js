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
  if (typeof adminKey === 'string' && adminKey.trim()) {
    headers['x-admin-key'] = adminKey.trim();
  }
  return headers;
};

export const loadTypewriterAiSettings = async (baseUrl = DEFAULT_API_BASE_URL, { adminKey } = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/typewriter/ai-settings`, {
    method: 'GET',
    headers: buildAdminHeaders(adminKey)
  });
};

export const saveTypewriterAiSettings = async (
  baseUrl = DEFAULT_API_BASE_URL,
  payload = {},
  { adminKey, updatedBy = 'admin' } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/typewriter/ai-settings`, {
    method: 'PUT',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify({
      ...payload,
      updatedBy
    })
  });
};

export const resetTypewriterAiSettings = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { adminKey, updatedBy = 'admin' } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/typewriter/ai-settings/reset`, {
    method: 'POST',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify({ updatedBy })
  });
};

export const loadOpenAiModels = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { adminKey, forceRefresh = false } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const params = new URLSearchParams();
  if (forceRefresh) params.set('forceRefresh', 'true');
  const query = params.toString();
  return requestJson(`${safeBaseUrl}/api/admin/openai/models${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: buildAdminHeaders(adminKey)
  });
};

export const loadTypewriterPrompts = async (baseUrl = DEFAULT_API_BASE_URL, { adminKey } = {}) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/typewriter/prompts`, {
    method: 'GET',
    headers: buildAdminHeaders(adminKey)
  });
};

export const seedCurrentTypewriterPrompts = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { adminKey, updatedBy = 'admin', overwrite = false } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/typewriter/prompts/seed-current`, {
    method: 'POST',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify({
      updatedBy,
      overwrite
    })
  });
};

export const saveTypewriterPrompt = async (
  baseUrl = DEFAULT_API_BASE_URL,
  pipelineKey,
  promptTemplate,
  { adminKey, updatedBy = 'admin', markLatest = true } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/typewriter/prompts/${encodeURIComponent(pipelineKey)}`, {
    method: 'POST',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify({
      promptTemplate,
      updatedBy,
      markLatest
    })
  });
};

export const loadTypewriterPromptVersions = async (
  baseUrl = DEFAULT_API_BASE_URL,
  pipelineKey,
  { adminKey, limit = 20 } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return requestJson(
    `${safeBaseUrl}/api/admin/typewriter/prompts/${encodeURIComponent(pipelineKey)}/versions${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      headers: buildAdminHeaders(adminKey)
    }
  );
};

export const setLatestTypewriterPromptVersion = async (
  baseUrl = DEFAULT_API_BASE_URL,
  pipelineKey,
  { adminKey, id, version } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/typewriter/prompts/${encodeURIComponent(pipelineKey)}/latest`, {
    method: 'POST',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify({
      id,
      version
    })
  });
};

export const startOrSeedTypewriterSession = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { sessionId, fragment } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  const payload = {};
  if (typeof sessionId === 'string' && sessionId.trim()) {
    payload.sessionId = sessionId.trim();
  }
  if (typeof fragment === 'string') {
    payload.fragment = fragment;
  }
  return requestJson(`${safeBaseUrl}/api/typewriter/session/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
};

export { DEFAULT_API_BASE_URL };

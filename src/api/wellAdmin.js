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

export const loadWellSceneConfig = async (baseUrl = DEFAULT_API_BASE_URL) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/well/config`, {
    method: 'GET'
  });
};

export const saveWellSceneConfig = async (
  baseUrl = DEFAULT_API_BASE_URL,
  config = {},
  { adminKey } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/well/config`, {
    method: 'PUT',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify(config)
  });
};

export const resetWellSceneConfig = async (
  baseUrl = DEFAULT_API_BASE_URL,
  { adminKey } = {}
) => {
  const safeBaseUrl = normalizeBaseUrl(baseUrl);
  return requestJson(`${safeBaseUrl}/api/admin/well/config/reset`, {
    method: 'POST',
    headers: buildAdminHeaders(adminKey),
    body: JSON.stringify({})
  });
};

export { DEFAULT_API_BASE_URL };

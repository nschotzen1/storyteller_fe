const SERVER = 'http://localhost:5001';

async function requestJson(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = `API error: ${response.status} ${response.statusText}`;
      try {
        const body = await response.json();
        if (body && typeof body.error === 'string' && body.error.trim()) message = body.error;
      } catch {
        // non-JSON error body: keep the generic message
      }
      return { data: null, error: { message, status: response.status } };
    }
    return { data: await response.json(), error: null };
  } catch (error) {
    return { data: null, error: { message: error.message } };
  }
}

export const startChronicle = () =>
  requestJson(`${SERVER}/api/chronicle/early-dusk/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

export const fetchChronicleState = (chronicleId) =>
  requestJson(`${SERVER}/api/chronicle/${encodeURIComponent(chronicleId)}/state`);

export const respondToChat = (chronicleId, { choiceId, freeText } = {}) =>
  requestJson(`${SERVER}/api/chronicle/${encodeURIComponent(chronicleId)}/chat/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choiceId, ...(freeText ? { freeText } : {}) })
  });

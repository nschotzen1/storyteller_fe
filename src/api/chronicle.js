const SERVER = 'http://localhost:5001';

async function requestJson(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return { data: null, error: { message: `API error: ${response.status} ${response.statusText}`, status: response.status } };
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

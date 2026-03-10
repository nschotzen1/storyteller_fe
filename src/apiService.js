const SERVER = 'http://localhost:5001';

function normalizeServerImageUrl(imageUrl) {
  if (typeof imageUrl !== 'string') return imageUrl;
  const trimmed = imageUrl.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${SERVER}${trimmed}`;
  return trimmed;
}

export const fetchNextFilmImage = async (pageText, sessionId) => {
  try {
    const response = await fetch(`${SERVER}/api/next_film_image`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, text: pageText })
    });
    if (!response.ok) {
      console.error(`API error in fetchNextFilmImage: ${response.status} ${response.statusText}`);
      return { data: null, error: { message: `API error: ${response.status} ${response.statusText}`, status: response.status } };
    }
    const data = await response.json();
    return {
      data: {
        ...data,
        image_url: normalizeServerImageUrl(data?.image_url),
      },
      error: null
    };
  } catch (error) {
    console.error("Network error fetching next film image:", error);
    return { data: null, error: { message: error.message } };
  }
};

export const startTypewriterSession = async (sessionId, fragment) => {
  try {
    const payload = {};
    if (sessionId) payload.sessionId = sessionId;
    if (typeof fragment === 'string') payload.fragment = fragment;
    const response = await fetch(`${SERVER}/api/typewriter/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error(`API error in startTypewriterSession: ${response.status} ${response.statusText}`);
      return { data: null, error: { message: `API error: ${response.status} ${response.statusText}`, status: response.status } };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Network error starting typewriter session:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const fetchTypewriterReply = async (text, sessionId, options = {}) => {
  if (!text) {
    return { data: null, error: null };
  }
  try {
    const payload = { sessionId, message: text };
    if (Number.isFinite(options?.fadeTimingScale)) {
      payload.fadeTimingScale = options.fadeTimingScale;
    }
    const response = await fetch(`${SERVER}/api/send_typewriter_text`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error(`API error in fetchTypewriterReply: ${response.status} ${response.statusText}`);
      return { data: null, error: { message: `API error: ${response.status} ${response.statusText}`, status: response.status } };
    }
    const data = await response.json();
    return { data, error: null }; // data here is the reply object { content: '...' }
  } catch (error) {
    console.error("Network error fetching typewriter reply:", error);
    return { data: null, error: { message: error.message } };
  }
};

// Use axios or fetch—here’s a fetch version for clarity:
export async function fetchShouldGenerateContinuation(currentText, latestAddition, latestPauseSeconds, lastGhostwriterWordCount) {
  if (!latestAddition) {
    return { shouldGenerate: false };
  }
  try {
    const res = await fetch(`${SERVER}/api/shouldGenerateContinuation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentText,
        latestAddition,
        latestPauseSeconds,
        lastGhostwriterWordCount, // new field!
      }),
    });
    if (!res.ok) {
      console.error(`API error in fetchShouldGenerateContinuation: ${res.status} ${res.statusText}`);
      return {
        shouldGenerate: false,
        error: { message: `API error: ${res.status} ${res.statusText}`, status: res.status }
      };
    }
    return await res.json();
  } catch (error) {
    console.error('Network error fetching shouldGenerateContinuation:', error);
    return {
      shouldGenerate: false,
      error: { message: error.message }
    };
  }
}

export const fetchShouldCreateStorytellerKey = async (sessionId, options = {}) => {
  if (!sessionId) {
    return { data: null, error: { message: 'Missing sessionId' } };
  }
  try {
    const payload = { sessionId };
    if (options?.playerId) {
      payload.playerId = options.playerId;
    }
    if (options?.mocked_api_calls !== undefined) {
      payload.mocked_api_calls = options.mocked_api_calls;
    }
    const response = await fetch(`${SERVER}/api/shouldCreateStorytellerKey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error(`API error in fetchShouldCreateStorytellerKey: ${response.status} ${response.statusText}`);
      return {
        data: null,
        error: { message: `API error: ${response.status} ${response.statusText}`, status: response.status }
      };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Network error fetching storyteller key state:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const fetchStorytellerTypewriterReply = async (sessionId, storytellerId, options = {}) => {
  if (!sessionId || (!storytellerId && !Number.isInteger(options?.slotIndex))) {
    return { data: null, error: { message: 'Missing sessionId and storytellerId or slotIndex' } };
  }
  try {
    const payload = { sessionId };
    if (storytellerId) {
      payload.storytellerId = storytellerId;
    }
    if (Number.isInteger(options?.slotIndex)) {
      payload.slotIndex = options.slotIndex;
    }
    if (options?.playerId) {
      payload.playerId = options.playerId;
    }
    if (Number.isFinite(options?.fadeTimingScale)) {
      payload.fadeTimingScale = options.fadeTimingScale;
    }
    if (options?.mocked_api_calls !== undefined) {
      payload.mocked_api_calls = options.mocked_api_calls;
    }
    const response = await fetch(`${SERVER}/api/send_storyteller_typewriter_text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error(`API error in fetchStorytellerTypewriterReply: ${response.status} ${response.statusText}`);
      return {
        data: null,
        error: { message: `API error: ${response.status} ${response.statusText}`, status: response.status }
      };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Network error fetching storyteller typewriter reply:', error);
    return { data: null, error: { message: error.message } };
  }
};

export const fetchSeerCards = async () => {
  try {
    const response = await fetch(`/mock-seer-cards.json`); // Files in public are served at root
    if (!response.ok) {
      console.error(`API error in fetchSeerCards: ${response.status} ${response.statusText}`);
      return { data: null, error: { message: `API error: ${response.status} ${response.statusText}`, status: response.status } };
    }
    const parsedJson = await response.json();
    return { data: parsedJson, error: null };
  } catch (error) {
    console.error("Network error fetching seer cards:", error);
    return { data: null, error: { message: error.message } };
  }
};

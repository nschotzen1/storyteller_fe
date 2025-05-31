const SERVER = 'http://localhost:5001';

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
    return { data, error: null }; // data here is { image_url: '...' }
  } catch (error) {
    console.error("Network error fetching next film image:", error);
    return { data: null, error: { message: error.message } };
  }
};

export const fetchTypewriterReply = async (text, sessionId) => {
  try {
    const response = await fetch(`${SERVER}/api/send_typewriter_text`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: text })
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

export const fetchShouldGenerateContinuation = async (currentText, latestAddition, latestPauseSeconds, ghostWriterResponseLength) => {
  try {
    const response = await fetch(`${SERVER}/api/shouldGenerateContinuation`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentText,
        latestAddition,
        latestPauseSeconds,
        ghostWriterResponseLength
      })
    });
    if (!response.ok) {
      console.error(`API error in fetchShouldGenerateContinuation: ${response.status} ${response.statusText}`);
      return { data: null, error: { message: `API error: ${response.status} ${response.statusText}`, status: response.status } };
    }
    const data = await response.json();
    return { data, error: null }; // data here is { shouldGenerate: true/false }
  } catch (error) {
    console.error("Network error fetching should generate continuation:", error);
    return { data: null, error: { message: error.message } };
  }
};

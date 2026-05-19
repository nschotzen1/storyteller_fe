import {
  fetchNextFilmImage,
  fetchShouldAllowXerofag,
  fetchStorytellerTypewriterReply,
  fetchTypewriterReply,
  fetchShouldGenerateContinuation,
  saveTypewriterVibeState,
  // SERVER constant is not explicitly exported by apiService.js,
  // but it's used internally. We'll construct the expected URL based on the path.
} from './apiService';

// The SERVER constant is 'http://localhost:5001' as defined in apiService.js
const SERVER_URL = 'http://localhost:5001';

describe('apiService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    // Clean up the mock after each test
    global.fetch.mockClear();
  });

  describe('fetchNextFilmImage', () => {
    const endpoint = `${SERVER_URL}/api/next_film_image`;
    const pageText = 'Example page text';
    const sessionId = 'session123';

    it('should fetch next film image successfully', async () => {
      const mockApiResponse = { image_url: 'some_url.png' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await fetchNextFilmImage(pageText, sessionId);

      expect(global.fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, text: pageText }),
        })
      );
      expect(result).toEqual({ data: mockApiResponse, error: null });
    });

    it('should normalize server-relative film image paths', async () => {
      const mockApiResponse = { image_url: '/assets/typewriter_page_images/page_01.png' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await fetchNextFilmImage(pageText, sessionId);

      expect(result).toEqual({
        data: { image_url: `${SERVER_URL}/assets/typewriter_page_images/page_01.png` },
        error: null,
      });
    });

    it('should handle API error for fetchNextFilmImage', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await fetchNextFilmImage(pageText, sessionId);

      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
      expect(result).toEqual({
        data: null,
        error: { message: 'API error: 500 Internal Server Error', status: 500 },
      });
    });

    it('should handle network error for fetchNextFilmImage', async () => {
      const networkError = new Error('Network failure');
      global.fetch.mockRejectedValueOnce(networkError);

      const result = await fetchNextFilmImage(pageText, sessionId);

      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
      expect(result).toEqual({
        data: null,
        error: { message: 'Network failure' },
      });
    });
  });

  describe('fetchTypewriterReply', () => {
    const endpoint = `${SERVER_URL}/api/send_typewriter_text`;
    const text = 'User input text';
    const sessionId = 'session456';

    it('should fetch typewriter reply successfully', async () => {
      const mockApiResponse = { content: 'This is a typewriter reply.' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await fetchTypewriterReply(text, sessionId);

      expect(global.fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message: text }),
        })
      );
      expect(result).toEqual({ data: mockApiResponse, error: null });
    });

    it('should include the latest user beat when provided', async () => {
      const mockApiResponse = { content: 'This is a typewriter reply.' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      await fetchTypewriterReply(text, sessionId, {
        userBeat: 'latest human beat',
        latestAddition: 'latest human beat',
        fadeTimingScale: 1.4,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          body: JSON.stringify({
            sessionId,
            message: text,
            userBeat: 'latest human beat',
            latestAddition: 'latest human beat',
            fadeTimingScale: 1.4,
          }),
        })
      );
    });

    it('should handle API error for fetchTypewriterReply', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await fetchTypewriterReply(text, sessionId);

      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
      expect(result).toEqual({
        data: null,
        error: { message: 'API error: 400 Bad Request', status: 400 },
      });
    });

    it('should handle network error for fetchTypewriterReply', async () => {
      const networkError = new Error('Network connection lost');
      global.fetch.mockRejectedValueOnce(networkError);

      const result = await fetchTypewriterReply(text, sessionId);

      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
      expect(result).toEqual({
        data: null,
        error: { message: 'Network connection lost' },
      });
    });

    it('should not call fetch when text is empty', async () => {
      const result = await fetchTypewriterReply('', sessionId);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({ data: null, error: null });
    });
  });

  describe('saveTypewriterVibeState', () => {
    const endpoint = `${SERVER_URL}/api/typewriter/session/vibe`;

    it('persists the current vibe state for a typewriter session', async () => {
      const mockApiResponse = {
        sessionId: 'session123',
        worldState: {
          current_vibe: 'forge_ember',
          orrery_positions: { forge: 0.12 },
          orrery_radial_distance_budget: 2,
          number_of_available_slides: 2
        }
      };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await saveTypewriterVibeState('session123', {
        current_vibe: 'forge_ember',
        orrery_positions: { forge: 0.12 },
        orrery_radial_distance_budget: 2,
        number_of_available_slides: 2
      });

      expect(global.fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'session123',
            current_vibe: 'forge_ember',
            orrery_positions: { forge: 0.12 },
            orrery_radial_distance_budget: 2,
            number_of_available_slides: 2
          }),
        })
      );
      expect(result).toEqual({ data: mockApiResponse, error: null });
    });
  });

  describe('fetchShouldAllowXerofag', () => {
    const endpoint = `${SERVER_URL}/api/shouldAllowXerofag`;
    const sessionId = 'session-xerofag';
    const currentNarrative = 'The grave-hound dragged its ribs through the ash.';
    const candidateNarrative = 'The grave-hound dragged its ribs through the ash. The Xerofag';

    it('should fetch an allow verdict successfully', async () => {
      const mockApiResponse = { allowed: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await fetchShouldAllowXerofag(sessionId, currentNarrative, candidateNarrative);

      expect(global.fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, currentNarrative, candidateNarrative }),
        })
      );
      expect(result).toEqual(mockApiResponse);
    });

    it('should return false without calling fetch when narrative is empty', async () => {
      const result = await fetchShouldAllowXerofag(sessionId, '   ', candidateNarrative);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({ allowed: false });
    });

    it('should handle API error for fetchShouldAllowXerofag', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
      });

      const result = await fetchShouldAllowXerofag(sessionId, currentNarrative, candidateNarrative);

      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
      expect(result).toEqual({
        allowed: false,
        error: { message: 'API error: 502 Bad Gateway', status: 502 },
      });
    });
  });

  describe('fetchShouldGenerateContinuation', () => {
    const endpoint = `${SERVER_URL}/api/shouldGenerateContinuation`;
    const currentText = 'Current story text.';
    const latestAddition = 'A new sentence.';
    const latestPauseSeconds = 5.5;

    it('should successfully fetch and return true for shouldGenerate', async () => {
      const mockApiResponse = { shouldGenerate: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await fetchShouldGenerateContinuation(currentText, latestAddition, latestPauseSeconds);

      expect(global.fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentText, latestAddition, latestPauseSeconds }),
        })
      );
      expect(result).toEqual(mockApiResponse);
    });

    it('should successfully fetch and return false for shouldGenerate', async () => {
      const mockApiResponse = { shouldGenerate: false };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await fetchShouldGenerateContinuation(currentText, latestAddition, latestPauseSeconds);

      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
      expect(result).toEqual(mockApiResponse);
    });

    it('should handle API error for fetchShouldGenerateContinuation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const result = await fetchShouldGenerateContinuation(currentText, latestAddition, latestPauseSeconds);

      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
      expect(result).toEqual({
        shouldGenerate: false,
        error: { message: 'API error: 403 Forbidden', status: 403 },
      });
    });

    it('should handle network error for fetchShouldGenerateContinuation', async () => {
      const networkError = new Error('Failed to connect');
      global.fetch.mockRejectedValueOnce(networkError);

      const result = await fetchShouldGenerateContinuation(currentText, latestAddition, latestPauseSeconds);

      expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
      expect(result).toEqual({
        shouldGenerate: false,
        error: { message: 'Failed to connect' },
      });
    });

    it('should not call fetch when latestAddition is empty', async () => {
      const result = await fetchShouldGenerateContinuation(currentText, '', latestPauseSeconds);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({ shouldGenerate: false });
    });
  });

  describe('fetchStorytellerTypewriterReply', () => {
    const endpoint = `${SERVER_URL}/api/send_storyteller_typewriter_text`;
    const sessionId = 'session-storyteller';
    const storytellerId = 'storyteller-1';

    it('should fetch storyteller intervention reply successfully', async () => {
      const mockApiResponse = { sequence: [], entityKey: { keyText: 'Buraha Light' } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await fetchStorytellerTypewriterReply(sessionId, storytellerId, {
        slotIndex: 0,
        fadeTimingScale: 1.2,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            storytellerId,
            slotIndex: 0,
            fadeTimingScale: 1.2,
          }),
        })
      );
      expect(result).toEqual({ data: mockApiResponse, error: null });
    });
  });
});

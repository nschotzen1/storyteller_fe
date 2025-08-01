import {
  fetchNextFilmImage,
  fetchTypewriterReply,
  fetchShouldGenerateContinuation,
} from './apiService';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const SERVER_URL = 'http://localhost:5001';

describe('apiService', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  describe('fetchShouldGenerateContinuation', () => {
    const endpoint = `${SERVER_URL}/api/shouldGenerateContinuation`;
    const currentText = 'Current story text.';
    const latestAddition = 'A new sentence.';
    const latestPauseSeconds = 5.5;
    const lastGhostwriterWordCount = 10;

    it('should successfully fetch and return json response', async () => {
      const mockApiResponse = { shouldGenerate: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await fetchShouldGenerateContinuation(currentText, latestAddition, latestPauseSeconds, lastGhostwriterWordCount);

      expect(global.fetch).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentText, latestAddition, latestPauseSeconds, lastGhostwriterWordCount }),
        })
      );
      expect(result).toEqual(mockApiResponse);
    });

    it('should return json response on API error', async () => {
        const mockErrorResponse = { error: 'some error' };
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => mockErrorResponse,
        });

        const result = await fetchShouldGenerateContinuation(currentText, latestAddition, latestPauseSeconds, lastGhostwriterWordCount);

        expect(global.fetch).toHaveBeenCalledWith(endpoint, expect.anything());
        expect(result).toEqual(mockErrorResponse);
    });

    it('should reject on network error', async () => {
      const networkError = new Error('Failed to connect');
      global.fetch.mockRejectedValueOnce(networkError);

      await expect(fetchShouldGenerateContinuation(currentText, latestAddition, latestPauseSeconds, lastGhostwriterWordCount))
        .rejects.toThrow('Failed to connect');
    });

    it('should not call fetch when latestAddition is empty', async () => {
      const result = await fetchShouldGenerateContinuation(currentText, '', latestPauseSeconds, lastGhostwriterWordCount);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({ data: { shouldGenerate: false }, error: null });
    });
  });
});

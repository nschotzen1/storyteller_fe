import { describe, test, expect, vi, afterEach } from 'vitest';
import { respondToChat } from './chronicle';

afterEach(() => vi.restoreAllMocks());

describe('chronicle api client', () => {
  test('respondToChat posts the answer and returns data', async () => {
    const payload = { messages: [], question: null, act: 'ARRIVAL_SCENE' };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })));
    const result = await respondToChat('abc-123', { choiceId: 'opt_am', freeText: 'hello' });
    expect(result.error).toBeNull();
    expect(result.data.act).toBe('ARRIVAL_SCENE');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:5001/api/chronicle/abc-123/chat/respond');
    expect(JSON.parse(options.body)).toEqual({ choiceId: 'opt_am', freeText: 'hello' });
  });

  test('errors surface the backend JSON error body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: 'chat is closed: session is in act RESTORATION' }), { status: 409 })
    ));
    const result = await respondToChat('abc-123', { choiceId: 'opt_am' });
    expect(result.data).toBeNull();
    expect(result.error.status).toBe(409);
    expect(result.error.message).toBe('chat is closed: session is in act RESTORATION');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const startOrSeedTypewriterSession = vi.fn();
const storage = new Map();
const localStorageMock = {
  getItem: vi.fn((key) => (storage.has(key) ? storage.get(key) : null)),
  setItem: vi.fn((key, value) => {
    storage.set(key, String(value));
  }),
  removeItem: vi.fn((key) => {
    storage.delete(key);
  })
};

vi.mock('../../api/typewriterAdmin', () => ({
  startOrSeedTypewriterSession: (...args) => startOrSeedTypewriterSession(...args)
}));

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageMock
});

describe('seedTypewriterSessionFromWell', () => {
  beforeEach(() => {
    startOrSeedTypewriterSession.mockReset();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    storage.clear();
  });

  it('seeds the typewriter fragment for the current session and syncs storage', async () => {
    startOrSeedTypewriterSession.mockResolvedValue({
      sessionId: 'well-session-1',
      fragment: 'one two three'
    });

    const { seedTypewriterSessionFromWell, TYPEWRITER_SESSION_STORAGE_KEY } = await import('./wellTypewriterSessionBridge');
    const payload = await seedTypewriterSessionFromWell('http://localhost:5001', 'well-session-1', 'one two three');

    expect(startOrSeedTypewriterSession).toHaveBeenCalledWith('http://localhost:5001', {
      sessionId: 'well-session-1',
      fragment: 'one two three',
      setInitialFragment: true
    });
    expect(window.localStorage.getItem(TYPEWRITER_SESSION_STORAGE_KEY)).toBe('well-session-1');
    expect(payload?.fragment).toBe('one two three');
  });
});

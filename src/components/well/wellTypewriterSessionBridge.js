import { startOrSeedTypewriterSession } from '../../api/typewriterAdmin';

export const TYPEWRITER_SESSION_STORAGE_KEY = 'sessionId';

export async function seedTypewriterSessionFromWell(apiBaseUrl, sessionId, fragment) {
  const safeSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';
  const safeFragment = typeof fragment === 'string' ? fragment.trim() : '';

  if (!safeSessionId || !safeFragment) {
    return null;
  }

  const payload = await startOrSeedTypewriterSession(apiBaseUrl, {
    sessionId: safeSessionId,
    fragment: safeFragment,
    setInitialFragment: true
  });

  if (typeof window !== 'undefined' && typeof payload?.sessionId === 'string' && payload.sessionId.trim()) {
    window.localStorage.setItem(TYPEWRITER_SESSION_STORAGE_KEY, payload.sessionId.trim());
  }

  return payload;
}

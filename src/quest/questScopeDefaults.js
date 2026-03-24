export const ROSE_COURT_PROLOGUE_SCOPE = Object.freeze({
  sessionId: 'rose-court-prologue-demo',
  questId: 'rose_court_prologue_phase_1'
});

export const QUEST_ADMIN_SCOPE_STORAGE_KEYS = Object.freeze({
  sessionId: 'questAdminSessionId',
  questId: 'questAdminQuestId'
});

export const ROSE_COURT_PROLOGUE_STORAGE_KEYS = Object.freeze({
  sessionId: 'roseCourtPrologueSessionId'
});

function readTrimmedStorageValue(storage, key) {
  if (!storage || !key) return '';
  const value = storage.getItem(key);
  return value && value.trim() ? value.trim() : '';
}

export function getInitialQuestAdminScope(storage) {
  const adminSessionId = readTrimmedStorageValue(storage, QUEST_ADMIN_SCOPE_STORAGE_KEYS.sessionId);
  const adminQuestId = readTrimmedStorageValue(storage, QUEST_ADMIN_SCOPE_STORAGE_KEYS.questId);
  if (adminSessionId || adminQuestId) {
    return {
      sessionId: adminSessionId || ROSE_COURT_PROLOGUE_SCOPE.sessionId,
      questId: adminQuestId || ROSE_COURT_PROLOGUE_SCOPE.questId
    };
  }

  const roseCourtSessionId = readTrimmedStorageValue(storage, ROSE_COURT_PROLOGUE_STORAGE_KEYS.sessionId);
  if (roseCourtSessionId) {
    return {
      sessionId: roseCourtSessionId,
      questId: ROSE_COURT_PROLOGUE_SCOPE.questId
    };
  }

  return {
    sessionId: ROSE_COURT_PROLOGUE_SCOPE.sessionId,
    questId: ROSE_COURT_PROLOGUE_SCOPE.questId
  };
}

export function persistQuestAdminScope(storage, scope = {}) {
  if (!storage) return;
  const sessionId = typeof scope.sessionId === 'string' ? scope.sessionId.trim() : '';
  const questId = typeof scope.questId === 'string' ? scope.questId.trim() : '';

  if (sessionId) {
    storage.setItem(QUEST_ADMIN_SCOPE_STORAGE_KEYS.sessionId, sessionId);
  }
  if (questId) {
    storage.setItem(QUEST_ADMIN_SCOPE_STORAGE_KEYS.questId, questId);
  }
}

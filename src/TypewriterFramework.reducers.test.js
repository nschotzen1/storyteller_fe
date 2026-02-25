// --- Typing Reducer (Copied from TypewriterFramework.jsx) ---
const typingActionTypes = {
  SET_TYPING_ALLOWED: 'SET_TYPING_ALLOWED',
  SET_SHOW_CURSOR: 'SET_SHOW_CURSOR',
  ADD_TO_INPUT_BUFFER: 'ADD_TO_INPUT_BUFFER',
  CONSUME_INPUT_BUFFER: 'CONSUME_INPUT_BUFFER',
  SET_LAST_PRESSED_KEY: 'SET_LAST_PRESSED_KEY',
  CLEAR_LAST_PRESSED_KEY: 'CLEAR_LAST_PRESSED_KEY',
  RESET_TYPING_STATE_FOR_NEW_PAGE: 'RESET_TYPING_STATE_FOR_NEW_PAGE',
  HANDLE_BACKSPACE: 'HANDLE_BACKSPACE',
  RESET_PAGE_TEXT_UPDATE_REQUEST: 'RESET_PAGE_TEXT_UPDATE_REQUEST',
  START_NEW_SEQUENCE: 'START_NEW_SEQUENCE',
  PROCESS_NEXT_ACTION: 'PROCESS_NEXT_ACTION',
  UPDATE_GHOST_TEXT: 'UPDATE_GHOST_TEXT',
  APPEND_SEQUENCE_USER_TEXT: 'APPEND_SEQUENCE_USER_TEXT',
  SET_FADE_STATE: 'SET_FADE_STATE',
  SEQUENCE_COMPLETE: 'SEQUENCE_COMPLETE',
  CANCEL_SEQUENCE: 'CANCEL_SEQUENCE',
  RETYPE_ACTION: 'RETYPE_ACTION',
};

const initialTypingState = {
  inputBuffer: '',
  typingAllowed: true,
  lastPressedKey: null,
  showCursor: true,
  requestPageTextUpdate: false,
  actionSequence: [],
  currentActionIndex: 0,
  currentGhostText: '',
  sequenceUserText: '',
  fadeState: { isActive: false, to_text: '', from_text: '', phase: 0 },
  isProcessingSequence: false,
};

function typingReducer(state, action) {
  switch (action.type) {
    case typingActionTypes.SET_TYPING_ALLOWED:
      return { ...state, typingAllowed: action.payload, requestPageTextUpdate: false };
    case typingActionTypes.SET_SHOW_CURSOR:
      return { ...state, showCursor: action.payload, requestPageTextUpdate: false };
    case typingActionTypes.ADD_TO_INPUT_BUFFER:
      return { ...state, inputBuffer: state.inputBuffer + action.payload, requestPageTextUpdate: false };
    case typingActionTypes.CONSUME_INPUT_BUFFER:
      return { ...state, inputBuffer: state.inputBuffer.slice(1), requestPageTextUpdate: false };
    case typingActionTypes.SET_LAST_PRESSED_KEY:
      return { ...state, lastPressedKey: action.payload, requestPageTextUpdate: false };
    case typingActionTypes.CLEAR_LAST_PRESSED_KEY:
      return { ...state, lastPressedKey: null, requestPageTextUpdate: false };
    case typingActionTypes.RESET_TYPING_STATE_FOR_NEW_PAGE:
      return {
        ...state,
        inputBuffer: '',
        requestPageTextUpdate: false,
        actionSequence: [],
        currentActionIndex: 0,
        currentGhostText: '',
        sequenceUserText: '',
        fadeState: { isActive: false, to_text: '', from_text: '', phase: 0 },
        isProcessingSequence: false,
      };
    case typingActionTypes.HANDLE_BACKSPACE:
      if (state.inputBuffer.length > 0) {
        return { ...state, inputBuffer: state.inputBuffer.slice(0, -1), requestPageTextUpdate: false };
      }
      return { ...state, requestPageTextUpdate: true };
    case typingActionTypes.RESET_PAGE_TEXT_UPDATE_REQUEST:
      return { ...state, requestPageTextUpdate: false };
    // --- Sequence Action Handling ---
    case typingActionTypes.START_NEW_SEQUENCE:
      return {
        ...state,
        actionSequence: action.payload || [],
        currentActionIndex: 0,
        isProcessingSequence: true,
        currentGhostText: '',
        sequenceUserText: '',
        fadeState: { isActive: false, to_text: '', from_text: '', phase: 0 },
        typingAllowed: false,
      };
    case typingActionTypes.PROCESS_NEXT_ACTION:
      const newIndex = state.currentActionIndex + 1;
      if (newIndex < state.actionSequence.length) {
        return {
          ...state,
          currentActionIndex: newIndex,
        };
      }
      return state;
    case typingActionTypes.UPDATE_GHOST_TEXT:
      return {
        ...state,
        currentGhostText: action.payload,
      };
    case typingActionTypes.APPEND_SEQUENCE_USER_TEXT:
      return {
        ...state,
        sequenceUserText: state.sequenceUserText + action.payload,
      };
    case typingActionTypes.SET_FADE_STATE:
      return {
        ...state,
        fadeState: action.payload,
      };
    case typingActionTypes.SEQUENCE_COMPLETE:
    case typingActionTypes.CANCEL_SEQUENCE:
      return {
        ...state,
        isProcessingSequence: false,
        fadeState: { isActive: false, to_text: '', from_text: '', phase: 0 },
        currentGhostText: '',
      };
    default:
      return state;
  }
}

// --- Ghostwriter AI Reducer (Copied from TypewriterFramework.jsx) ---
const ghostwriterActionTypes = {
  UPDATE_LAST_USER_INPUT_TIME: 'UPDATE_LAST_USER_INPUT_TIME',
  SET_RESPONSE_QUEUED: 'SET_RESPONSE_QUEUED',
  SET_LAST_GENERATED_LENGTH: 'SET_LAST_GENERATED_LENGTH',
  RESET_GHOSTWRITER_STATE: 'RESET_GHOSTWRITER_STATE',
};

const initialGhostwriterState = {
  lastUserInputTime: Date.now(),
  responseQueued: false,
  lastGeneratedLength: 0,
  lastGhostwriterWordCount: 0,
  isAwaitingApiReply: false,
  awaitingUserInputAfterSequence: false,
};

function ghostwriterReducer(state, action) {
  switch (action.type) {
    case ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME:
      return { ...state, lastUserInputTime: action.payload };
    case ghostwriterActionTypes.SET_RESPONSE_QUEUED:
      return { ...state, responseQueued: action.payload };
    case ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH:
      return { ...state, lastGeneratedLength: action.payload };
    case ghostwriterActionTypes.RESET_GHOSTWRITER_STATE:
      return {
        ...initialGhostwriterState, // Uses the original initial state
        lastUserInputTime: action.payload !== undefined ? action.payload : Date.now(), // Allow overriding time for testing, else now
      };
    default:
      return state;
  }
}


// --- Tests ---
describe('typingReducer', () => {
  it('should return current state for unknown action', () => {
    expect(typingReducer(initialTypingState, { type: 'UNKNOWN' })).toEqual(initialTypingState);
  });

  it('should handle SET_TYPING_ALLOWED', () => {
    const action = { type: typingActionTypes.SET_TYPING_ALLOWED, payload: false };
    expect(typingReducer(initialTypingState, action)).toEqual({ ...initialTypingState, typingAllowed: false });
  });

  it('should handle SET_SHOW_CURSOR', () => {
    const action = { type: typingActionTypes.SET_SHOW_CURSOR, payload: false };
    expect(typingReducer(initialTypingState, action)).toEqual({ ...initialTypingState, showCursor: false });
  });

  it('should handle ADD_TO_INPUT_BUFFER', () => {
    const state = { ...initialTypingState, inputBuffer: 'ab' };
    const action = { type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: 'c' };
    expect(typingReducer(state, action)).toEqual({ ...state, inputBuffer: 'abc' });
  });

  it('should handle CONSUME_INPUT_BUFFER', () => {
    const state = { ...initialTypingState, inputBuffer: 'abc' };
    const action = { type: typingActionTypes.CONSUME_INPUT_BUFFER };
    expect(typingReducer(state, action)).toEqual({ ...state, inputBuffer: 'bc' });
  });

  it('should handle CONSUME_INPUT_BUFFER on empty buffer', () => {
    const state = { ...initialTypingState, inputBuffer: '' };
    const action = { type: typingActionTypes.CONSUME_INPUT_BUFFER };
    expect(typingReducer(state, action)).toEqual({ ...state, inputBuffer: '' });
  });

  it('should handle SET_LAST_PRESSED_KEY', () => {
    const action = { type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: 'Q' };
    expect(typingReducer(initialTypingState, action)).toEqual({ ...initialTypingState, lastPressedKey: 'Q' });
  });

  it('should handle CLEAR_LAST_PRESSED_KEY', () => {
    const state = { ...initialTypingState, lastPressedKey: 'Q' };
    const action = { type: typingActionTypes.CLEAR_LAST_PRESSED_KEY };
    expect(typingReducer(state, action)).toEqual({ ...state, lastPressedKey: null });
  });

  it('should handle RESET_TYPING_STATE_FOR_NEW_PAGE', () => {
    const state = {
      ...initialTypingState,
      inputBuffer: 'test',
    };
    const action = { type: typingActionTypes.RESET_TYPING_STATE_FOR_NEW_PAGE };
    expect(typingReducer(state, action)).toEqual({
      ...state,
      inputBuffer: '',
      requestPageTextUpdate: false,
      actionSequence: [],
      currentActionIndex: 0,
      currentGhostText: '',
      sequenceUserText: '',
      fadeState: { isActive: false, to_text: '', from_text: '', phase: 0 },
      isProcessingSequence: false,
    });
  });

  it('should handle HANDLE_BACKSPACE (inputBuffer not empty)', () => {
    const state = { ...initialTypingState, inputBuffer: 'abc' };
    const action = { type: typingActionTypes.HANDLE_BACKSPACE };
    expect(typingReducer(state, action)).toEqual({ ...state, inputBuffer: 'ab', requestPageTextUpdate: false });
  });

  it('should handle HANDLE_BACKSPACE (empty input)', () => {
    const state = { ...initialTypingState, inputBuffer: '' };
    const action = { type: typingActionTypes.HANDLE_BACKSPACE };
    expect(typingReducer(state, action)).toEqual({ ...state, requestPageTextUpdate: true });
  });

  it('should handle RESET_PAGE_TEXT_UPDATE_REQUEST', () => {
    const state = { ...initialTypingState, requestPageTextUpdate: true };
    const action = { type: typingActionTypes.RESET_PAGE_TEXT_UPDATE_REQUEST };
    expect(typingReducer(state, action)).toEqual({ ...state, requestPageTextUpdate: false });
  });

  it('other actions should reset requestPageTextUpdate flag', () => {
    const stateWithFlag = { ...initialTypingState, requestPageTextUpdate: true };
    const action = { type: typingActionTypes.SET_TYPING_ALLOWED, payload: true };
    expect(typingReducer(stateWithFlag, action).requestPageTextUpdate).toBe(false);
  });
});


describe('ghostwriterReducer', () => {
  let dateNowSpy;
  const mockTime = 1234567890;

  beforeEach(() => {
    // Mock Date.now() for consistent lastUserInputTime in initial state and RESET action
    dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(mockTime);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  // Re-define initialGhostwriterState for tests to use mocked Date.now()
  const testInitialGhostwriterState = {
    lastUserInputTime: mockTime, // Uses mocked Date.now()
    responseQueued: false,
    lastGeneratedLength: 0,
    lastGhostwriterWordCount: 0,
    isAwaitingApiReply: false,
    awaitingUserInputAfterSequence: false,
  };

  it('should return current state for unknown action', () => {
    expect(ghostwriterReducer(testInitialGhostwriterState, { type: 'UNKNOWN' })).toEqual(testInitialGhostwriterState);
  });

  it('should handle UPDATE_LAST_USER_INPUT_TIME', () => {
    const newTime = 9999999999;
    const action = { type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: newTime };
    expect(ghostwriterReducer(testInitialGhostwriterState, action))
      .toEqual({ ...testInitialGhostwriterState, lastUserInputTime: newTime });
  });

  it('should handle SET_RESPONSE_QUEUED', () => {
    const action = { type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: true };
    expect(ghostwriterReducer(testInitialGhostwriterState, action))
      .toEqual({ ...testInitialGhostwriterState, responseQueued: true });
  });

  it('should handle SET_LAST_GENERATED_LENGTH', () => {
    const action = { type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: 100 };
    expect(ghostwriterReducer(testInitialGhostwriterState, action))
      .toEqual({ ...testInitialGhostwriterState, lastGeneratedLength: 100 });
  });

  it('should handle RESET_GHOSTWRITER_STATE (using mocked Date.now)', () => {
    const modifiedState = {
      lastUserInputTime: 1000,
      responseQueued: true,
      lastGeneratedLength: 50,
      lastGhostwriterWordCount: 0,
      isAwaitingApiReply: false,
      awaitingUserInputAfterSequence: false,
    };
    // Test default reset (uses Date.now() internally)
    const actionDefaultReset = { type: ghostwriterActionTypes.RESET_GHOSTWRITER_STATE };
    expect(ghostwriterReducer(modifiedState, actionDefaultReset)).toEqual({
      ...testInitialGhostwriterState, // original initial state values
      lastUserInputTime: mockTime, // Date.now() is mocked
    });

    // Test reset with a specific time payload for lastUserInputTime
    const specificTime = 2000000000;
    const actionSpecificTimeReset = { type: ghostwriterActionTypes.RESET_GHOSTWRITER_STATE, payload: specificTime };
    expect(ghostwriterReducer(modifiedState, actionSpecificTimeReset)).toEqual({
      ...testInitialGhostwriterState, // original initial state values
      lastUserInputTime: specificTime, // Uses payload time
    });
  });
});

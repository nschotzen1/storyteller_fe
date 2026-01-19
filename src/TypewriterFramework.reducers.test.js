import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Reducer Code (Copied from TypewriterFramework.jsx) ---

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
  SEQUENCE_COMPLETE: 'SEQUENCE_COMPLETE',
  CANCEL_SEQUENCE: 'CANCEL_SEQUENCE',
  RETYPE_ACTION: 'RETYPE_ACTION',
  CAPTURE_PRE_FADE_SNAPSHOT: 'CAPTURE_PRE_FADE_SNAPSHOT',
  SET_ALL_INITIAL_FADES_COMPLETED: 'SET_ALL_INITIAL_FADES_COMPLETED',
  COMPLETE_INITIAL_FADE_PROCESSING: 'COMPLETE_INITIAL_FADE_PROCESSING',
};

const initialTypingState = {
  inputBuffer: '',
  typingAllowed: true,
  lastPressedKey: null,
  showCursor: true,
  requestPageTextUpdate: false,
  actionSequence: [],
  currentActionIndex: 0,
  currentGhostText: [],
  isProcessingSequence: false,
  preFadeSnapshot: null,
  allInitialFadesCompleted: false,
  isProcessingInitialFadeSequence: false,
};

function typingReducer(state = initialTypingState, action) {
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
        isProcessingSequence: false,
      };
    case typingActionTypes.HANDLE_BACKSPACE:
      if (state.inputBuffer.length === 0) {
        if (state.isProcessingSequence) {
          return {
            ...state,
            actionSequence: [],
            currentActionIndex: 0,
            currentGhostText: '',
            isProcessingSequence: false,
            requestPageTextUpdate: false,
          };
        }
        return { ...state, requestPageTextUpdate: true };
      }
      return { ...state, inputBuffer: state.inputBuffer.slice(0, -1), requestPageTextUpdate: false };
    case typingActionTypes.RESET_PAGE_TEXT_UPDATE_REQUEST:
      return { ...state, requestPageTextUpdate: false };
    case typingActionTypes.START_NEW_SEQUENCE:
      return {
        ...state,
        actionSequence: action.payload,
        currentActionIndex: 0,
        currentGhostText: '',
        isProcessingSequence: true,
        preFadeSnapshot: null,
        allInitialFadesCompleted: false,
        isProcessingInitialFadeSequence: action.payload.some(item => item.action === 'fade'),
        inputBuffer: '',
        typingAllowed: action.payload.length > 0 && action.payload[0].action === 'pause',
      };
    case typingActionTypes.PROCESS_NEXT_ACTION:
      const newIndex = state.currentActionIndex + 1;
      if (newIndex < state.actionSequence.length) {
        const nextAction = state.actionSequence[newIndex];
        const newTypingAllowed = nextAction.action === 'pause';
        return { ...state, currentActionIndex: newIndex, typingAllowed: newTypingAllowed };
      }
      return { ...state, currentActionIndex: newIndex };
    case typingActionTypes.UPDATE_GHOST_TEXT:
        return { ...state, currentGhostText: action.payload };
    case typingActionTypes.SEQUENCE_COMPLETE:
      return {
        ...state,
        actionSequence: [],
        currentActionIndex: 0,
        currentGhostText: '',
        isProcessingSequence: false,
        typingAllowed: true,
      };
    case typingActionTypes.CANCEL_SEQUENCE:
      return {
        ...state,
        actionSequence: [],
        currentActionIndex: 0,
        currentGhostText: '',
        isProcessingSequence: false,
        preFadeSnapshot: null,
        allInitialFadesCompleted: false,
        isProcessingInitialFadeSequence: false,
        typingAllowed: true,
      };
    default:
      return state;
  }
}

// --- Tests ---

describe('typingReducer', () => {
    it('should return initial state for undefined state and no action', () => {
        expect(typingReducer(undefined, {})).toEqual(initialTypingState);
    });

    it('should handle START_NEW_SEQUENCE and process actions correctly', () => {
        const sequence = [
            { action: 'type', text: 'hello' },
            { action: 'pause', delay: 100 },
            { action: 'fade', to_text: 'goodbye' },
        ];

        // 1. Start the sequence
        let state = typingReducer(initialTypingState, { type: 'START_NEW_SEQUENCE', payload: sequence });
        expect(state.isProcessingSequence).toBe(true);
        expect(state.actionSequence).toEqual(sequence);
        expect(state.currentActionIndex).toBe(0);

        // 2. Process first action ('type'), look ahead to 'pause'
        state = typingReducer(state, { type: 'PROCESS_NEXT_ACTION' });
        expect(state.currentActionIndex).toBe(1);
        expect(state.typingAllowed).toBe(true); // Next action is a pause

        // 3. Process second action ('pause'), look ahead to 'fade'
        state = typingReducer(state, { type: 'PROCESS_NEXT_ACTION' });
        expect(state.currentActionIndex).toBe(2);
        expect(state.typingAllowed).toBe(false); // Next action is a fade

        // 4. Process third action ('fade')
        state = typingReducer(state, { type: 'PROCESS_NEXT_ACTION' });
        expect(state.currentActionIndex).toBe(3); // Index is now out of bounds

        // 5. Sequence completes
        state = typingReducer(state, { type: 'SEQUENCE_COMPLETE' });
        expect(state.isProcessingSequence).toBe(false);
        expect(state.actionSequence).toEqual([]);
        expect(state.typingAllowed).toBe(true);
    });

    it('should update ghost text', () => {
        const state = typingReducer(initialTypingState, { type: 'UPDATE_GHOST_TEXT', payload: 'new text' });
        expect(state.currentGhostText).toBe('new text');
    });
});

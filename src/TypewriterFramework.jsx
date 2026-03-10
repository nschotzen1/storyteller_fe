import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import './TypeWriter.css';
import TurnPageLever from './TurnPageLever.jsx';
import Keyboard from './components/typewriter/Keyboard.jsx';
import PaperDisplay from './components/typewriter/PaperDisplay.jsx';
import PageNavigation from './components/typewriter/PageNavigation.jsx'; // Import the new PageNavigation component
import OrreryComponent from './OrreryComponent.jsx';
import { getRandomTexture, playKeySound, playEnterSound, playXerofagHowl, playEndOfPageSound, countLines, playGhostWriterSound, ambientSoundManager, playPreGhostSound, fetchAndPlayElevenLabsTTS, playStorytellerKeyPressSound } from './utils.js';
import {
  fetchNextFilmImage,
  fetchShouldCreateStorytellerKey,
  fetchShouldGenerateContinuation,
  fetchStorytellerTypewriterReply,
  fetchTypewriterReply,
  startTypewriterSession
} from './apiService.js';

// --- Constants ---
const FILM_HEIGHT = 1400;
const LINE_HEIGHT = 2.4 * 16; // Roughly 38.4
const TOP_OFFSET = 260;
const BOTTOM_PADDING = 220;
const FRAME_HEIGHT = 700;
export const MAX_LINES = Math.floor((FILM_HEIGHT - TOP_OFFSET - BOTTOM_PADDING) / LINE_HEIGHT);

// Default values
export const DEFAULT_FILM_BG_URL = '/textures/decor/film_frame_desert.png';
const INITIAL_SCROLL_MODE = 'cinematic';
const NORMAL_SCROLL_MODE = 'normal';
const SLIDE_DIRECTION_LEFT = 'left';
const SLIDE_DIRECTION_RIGHT = 'right';
const SESSION_ID_STORAGE_KEY = 'sessionId';
const TYPEWRITER_DEBUG_STORAGE_KEY = 'typewriterDebugSettings';

// Durations & Timeouts
const CINEMATIC_SCROLL_INTRO_DELAY = 650; // ms
const CINEMATIC_SCROLL_INTRO_SCROLL_TO_TOP_TIMEOUT = 120; //ms
const CINEMATIC_SCROLL_INTRO_DURATION = 1600; // ms
const CINEMATIC_SCROLL_TO_NORMAL_MODE_TIMEOUT = 1600; // ms
const CINEMATIC_SCROLL_DEFAULT_DURATION = 1700; // ms
const PAGE_TURN_SCROLL_ANIMATION_DURATION = 900; // ms
const STRIKER_RETURN_ANIMATION_DURATION = 600; // ms
const TYPING_ANIMATION_INTERVAL = 100; // ms
const LAST_PRESSED_KEY_TIMEOUT = 120; // ms
const KEY_TEXTURE_REFRESH_INTERVAL = 20000; // ms
const GHOSTWRITER_AI_TRIGGER_INTERVAL = 1000; // ms
export const FIRST_FADE_HANDOFF_DELAY = 1400; // ms
const STORYTELLER_KEY_CHECK_INTERVAL_WORDS = 5;
const STORYTELLER_KEY_CHECK_DELAY_MS = 700;

// Animation & Style Values
const PAGE_SLIDE_X_OFFSET = -50; // Percentage for left slide
const KEY_TILT_RANDOM_MAX = 1.4;
const KEY_TILT_RANDOM_MIN = -0.7;
const KEY_OFFSET_Y_RANDOM_MAX = 3; // pixels
const KEY_OFFSET_Y_RANDOM_MIN = -1; // pixels
const FILM_SLIDE_WRAPPER_WIDTH = '200%';
const FILM_SLIDE_WRAPPER_Z_INDEX = 10;
const FILM_BG_SLIDE_OPACITY = 0.96;
const FILM_BG_SLIDE_BOX_SHADOW_LEFT = 'inset -12px 0 24px #120b05b0';
const FILM_BG_SLIDE_BOX_SHADOW_RIGHT = 'inset 12px 0 24px #120b05b0';
const FILM_BG_SLIDE_CONTRAST_OUTGOING = 1.06;
const FILM_BG_SLIDE_BRIGHTNESS_OUTGOING = 1.04;
const FILM_BG_SLIDE_CONTRAST_INCOMING = 1.04;
const FILM_BG_SLIDE_BRIGHTNESS_INCOMING = 1.02;
const FILM_FLICKER_OVERLAY_Z_INDEX = 11;
const FILM_FLICKER_OVERLAY_TEXTURE_URL = '/textures/grainy.png';
const FILM_FLICKER_OVERLAY_GRADIENT = 'linear-gradient(90deg,rgba(0,0,0,0.09),rgba(0,0,0,0.16))';
const FILM_FLICKER_OVERLAY_OPACITY = 0.15;
const FILM_FLICKER_OVERLAY_BLEND_MODE = 'multiply';
const FILM_FLICKER_OVERLAY_ANIMATION = 'filmFlicker 1.1s infinite linear alternate';
const PAGE_NAVIGATION_BUTTONS_TOP = '3vh';
const PAGE_NAVIGATION_BUTTONS_Z_INDEX = 20;
const PAGE_NAVIGATION_BUTTONS_PADDING = '0 3vw';
const PAGE_NAVIGATION_BUTTON_FONT_SIZE = 24; // pixels
const PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY = 0.3;
const PAGE_COUNT_TEXT_COLOR = '#887';
const PAGE_COUNT_TEXT_FONT_FAMILY = 'IBM Plex Mono, monospace';
const PAGE_COUNT_TEXT_FONT_SIZE = 16; // pixels
const GRIT_SHELL_OVERLAY_URL = '/textures/overlay_grit_shell.png';
const FILM_BACKGROUND_Z_INDEX = 1;
const FILM_BACKGROUND_OPACITY = 0.92;
const TYPEWRITER_TEXT_Z_INDEX = 2;
const SIGIL_IMAGE_URL = '/textures/sigil_storytellers_society.png';
const TURN_PAGE_LEVER_BOTTOM = '48px';
const TURN_PAGE_LEVER_LEFT = '5vw';
const TURN_PAGE_LEVER_Z_INDEX = 50;
const NEEDED_HEIGHT_OFFSET = 4; // pixels
const STRIKER_CURSOR_OFFSET_LEFT = '-40px';


// Logic Thresholds & Values
const LEVER_LEVEL_WORD_THRESHOLDS = [0, 10, 20, 30]; // words for level 0, 1, 2, 3 respectively
const SPECIAL_KEY_TEXT = 'THE XEROFAG';
const SPECIAL_KEY_INSERT_TEXT = 'The Xerofag ';
const STORYTELLER_SLOT_HORIZONTAL_KEY = 'STORYTELLER_SLOT_HORIZONTAL';
const STORYTELLER_SLOT_VERTICAL_KEY = 'STORYTELLER_SLOT_VERTICAL';
const STORYTELLER_SLOT_RECT_HORIZONTAL_KEY = 'STORYTELLER_SLOT_RECT_HORIZONTAL';
const STORYTELLER_KEY_SLOT_DEFINITIONS = [
  {
    slotIndex: 0,
    slotKey: STORYTELLER_SLOT_HORIZONTAL_KEY,
    blankTextureUrl: '/textures/keys/blank_horizontal_1.png',
    keyShape: 'horizontal'
  },
  {
    slotIndex: 1,
    slotKey: STORYTELLER_SLOT_VERTICAL_KEY,
    blankTextureUrl: '/textures/keys/blank_vertical_1.png',
    keyShape: 'vertical'
  },
  {
    slotIndex: 2,
    slotKey: STORYTELLER_SLOT_RECT_HORIZONTAL_KEY,
    blankTextureUrl: '/textures/keys/blank_rect_horizontal_1.png',
    keyShape: 'rect_horizontal'
  }
];
const DEFAULT_TYPEWRITER_DEBUG_SETTINGS = {
  panelOpen: false,
  showInsightsPanel: true,
  showTimingDetails: true,
  fadeTimingScale: 1,
  fadeVisualScale: 1,
};

const readStoredSessionId = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SESSION_ID_STORAGE_KEY) || '';
};

const readStoredTypewriterDebugSettings = () => {
  if (typeof window === 'undefined') return { ...DEFAULT_TYPEWRITER_DEBUG_SETTINGS };
  const raw = localStorage.getItem(TYPEWRITER_DEBUG_STORAGE_KEY);
  if (!raw) return { ...DEFAULT_TYPEWRITER_DEBUG_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_TYPEWRITER_DEBUG_SETTINGS };
    }
    const fadeTimingScale = Number(parsed.fadeTimingScale);
    const fadeVisualScale = Number(parsed.fadeVisualScale);
    return {
      panelOpen: Boolean(parsed.panelOpen),
      showInsightsPanel: parsed.showInsightsPanel !== false,
      showTimingDetails: parsed.showTimingDetails !== false,
      fadeTimingScale: Number.isFinite(fadeTimingScale) ? Math.min(5, Math.max(0.35, fadeTimingScale)) : 1,
      fadeVisualScale: Number.isFinite(fadeVisualScale) ? Math.min(3, Math.max(0.4, fadeVisualScale)) : 1,
    };
  } catch {
    return { ...DEFAULT_TYPEWRITER_DEBUG_SETTINGS };
  }
};

const getStorytellerSlotDefinitionByKey = (key) =>
  STORYTELLER_KEY_SLOT_DEFINITIONS.find((slot) => slot.slotKey === key) || null;

const getInitialKeyTexture = (key) => {
  const storytellerSlot = getStorytellerSlotDefinitionByKey(key);
  if (storytellerSlot) {
    return storytellerSlot.blankTextureUrl;
  }
  return getRandomTexture(key);
};

const createInitialStorytellerSlots = () =>
  STORYTELLER_KEY_SLOT_DEFINITIONS.map((slot) => ({
    ...slot,
    filled: false,
    storytellerId: '',
    storytellerName: '',
    keyImageUrl: '',
    symbol: '',
    description: ''
  }));

const normalizeStoryEntityKey = (entityKey) => {
  if (!entityKey || typeof entityKey !== 'object') return null;
  const entityName = typeof entityKey.entityName === 'string'
    ? entityKey.entityName.trim()
    : typeof entityKey.name === 'string'
      ? entityKey.name.trim()
      : '';
  const keyText = typeof entityKey.keyText === 'string'
    ? entityKey.keyText.trim()
    : typeof entityKey.typewriterKeyText === 'string'
      ? entityKey.typewriterKeyText.trim()
      : '';
  const id = typeof entityKey.id === 'string'
    ? entityKey.id.trim()
    : typeof entityKey._id === 'string'
      ? entityKey._id.trim()
      : '';
  if (!entityName && !keyText && !id) return null;
  return {
    id,
    entityName: entityName || keyText || 'Unnamed entity',
    keyText: keyText || entityName || 'Hidden Omen',
    summary: typeof entityKey.summary === 'string' ? entityKey.summary.trim() : '',
    storytellerId: typeof entityKey.storytellerId === 'string' ? entityKey.storytellerId.trim() : '',
    storytellerName: typeof entityKey.storytellerName === 'string' ? entityKey.storytellerName.trim() : '',
  };
};

const mergeStoryEntityKeys = (currentKeys = [], incomingKeys = []) => {
  const merged = [];
  const seen = new Set();
  [...incomingKeys, ...currentKeys].forEach((candidate) => {
    const normalized = normalizeStoryEntityKey(candidate);
    if (!normalized) return;
    const identity = normalized.id || `${normalized.keyText}::${normalized.entityName}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    merged.push(normalized);
  });
  return merged.slice(0, 6);
};

const countWordsInNarrative = (text = '') => {
  if (typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

// --- Page Transition Reducer ---
const pageTransitionActionTypes = {
  START_PAGE_TURN_SCROLL: 'START_PAGE_TURN_SCROLL',
  PREPARE_SLIDE: 'PREPARE_SLIDE',
  START_SLIDE_ANIMATION: 'START_SLIDE_ANIMATION',
  FINISH_SLIDE_ANIMATION: 'FINISH_SLIDE_ANIMATION',
  START_HISTORY_NAVIGATION: 'START_HISTORY_NAVIGATION',
  SET_SCROLL_MODE: 'SET_SCROLL_MODE',
  // RESET_TRANSITION_STATE can be part of FINISH_SLIDE_ANIMATION or a separate action
}

const initialPageTransitionState = {
  scrollMode: INITIAL_SCROLL_MODE,
  pageChangeInProgress: false,
  isSliding: false,
  slideX: 0,
  slideDir: SLIDE_DIRECTION_LEFT,
  prevFilmBgUrl: null,
  nextFilmBgUrl: null,
  prevText: '',
  nextText: '',
};

function pageTransitionReducer(state, action) {
  switch (action.type) {
    case pageTransitionActionTypes.START_PAGE_TURN_SCROLL:
      return {
        ...state,
        pageChangeInProgress: true,
      };
    case pageTransitionActionTypes.PREPARE_SLIDE:
      return {
        ...state,
        slideDir: action.payload.slideDir,
        prevFilmBgUrl: action.payload.prevFilmBgUrl,
        prevText: action.payload.prevText,
        nextFilmBgUrl: action.payload.nextFilmBgUrl,
        nextText: action.payload.nextText,
        isSliding: true,
        slideX: 0, // Reset slideX before starting animation
      };
    case pageTransitionActionTypes.START_SLIDE_ANIMATION:
      return {
        ...state,
        slideX: action.payload.slideX,
      };
    case pageTransitionActionTypes.FINISH_SLIDE_ANIMATION:
      return {
        ...state,
        isSliding: false,
        pageChangeInProgress: false,
        scrollMode: action.payload.newScrollMode || INITIAL_SCROLL_MODE,
        // typingAllowed and showCursor are not part of this reducer's state
        // but the action causing this might also trigger those changes elsewhere
      };
    case pageTransitionActionTypes.START_HISTORY_NAVIGATION:
      return {
        ...state,
        pageChangeInProgress: true,
        slideDir: action.payload.slideDir,
        prevFilmBgUrl: action.payload.prevFilmBgUrl,
        prevText: action.payload.prevText,
        nextFilmBgUrl: action.payload.nextFilmBgUrl,
        nextText: action.payload.nextText,
        isSliding: true,
        slideX: 0,
      };
    case pageTransitionActionTypes.SET_SCROLL_MODE:
      return {
        ...state,
        scrollMode: action.payload.scrollMode,
      };
    case typingActionTypes.RETYPE_ACTION:
      // Ensure action.payload contains 'count' and 'text'
      if (action.payload && typeof action.payload.count === 'number' && typeof action.payload.text === 'string') {
        const textToModify = state.currentGhostText;
        const deleteCount = Math.min(action.payload.count, textToModify.length); // Don't delete more than exists
        const slicedText = textToModify.slice(0, -deleteCount);
        const newGhostText = slicedText + action.payload.text;
        return {
          ...state,
          currentGhostText: newGhostText,
        };
      }
      return state; // If payload is malformed, return current state
    default:
      return state;
  }
}

// --- Ghostwriter AI Reducer ---
const ghostwriterActionTypes = {
  UPDATE_LAST_USER_INPUT_TIME: 'UPDATE_LAST_USER_INPUT_TIME',
  SET_RESPONSE_QUEUED: 'SET_RESPONSE_QUEUED',
  SET_LAST_GENERATED_LENGTH: 'SET_LAST_GENERATED_LENGTH',
  RESET_GHOSTWRITER_STATE: 'RESET_GHOSTWRITER_STATE',
  SET_LAST_GHOSTWRITER_WORD_COUNT: 'SET_LAST_GHOSTWRITER_WORD_COUNT',
  SET_IS_AWAITING_API_REPLY: 'SET_IS_AWAITING_API_REPLY', // New action type
  SET_AWAITING_USER_INPUT_AFTER_SEQUENCE: 'SET_AWAITING_USER_INPUT_AFTER_SEQUENCE',
};

const initialGhostwriterState = {
  lastUserInputTime: Date.now(),
  responseQueued: false,
  lastGeneratedLength: 0,
  lastGhostwriterWordCount: 0, // NEW: Track last ghostwriter addition size
  isAwaitingApiReply: false, // New state variable
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
        ...initialGhostwriterState,
        lastUserInputTime: Date.now(),
      };
    case ghostwriterActionTypes.SET_LAST_GHOSTWRITER_WORD_COUNT:
      return { ...state, lastGhostwriterWordCount: action.payload };
    case ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY: // Handle new action
      return { ...state, isAwaitingApiReply: action.payload };
    case ghostwriterActionTypes.SET_AWAITING_USER_INPUT_AFTER_SEQUENCE:
      return { ...state, awaitingUserInputAfterSequence: action.payload };
    default:
      return state;
  }
}

// --- Typing Reducer ---
const typingActionTypes = {
  SET_TYPING_ALLOWED: 'SET_TYPING_ALLOWED',
  SET_SHOW_CURSOR: 'SET_SHOW_CURSOR',
  ADD_TO_INPUT_BUFFER: 'ADD_TO_INPUT_BUFFER',
  CONSUME_INPUT_BUFFER: 'CONSUME_INPUT_BUFFER', // Removes the first char
  SET_LAST_PRESSED_KEY: 'SET_LAST_PRESSED_KEY',
  CLEAR_LAST_PRESSED_KEY: 'CLEAR_LAST_PRESSED_KEY',
  RESET_TYPING_STATE_FOR_NEW_PAGE: 'RESET_TYPING_STATE_FOR_NEW_PAGE', // Resets responses, ghostKeyQueue
  HANDLE_BACKSPACE: 'HANDLE_BACKSPACE',
  RESET_PAGE_TEXT_UPDATE_REQUEST: 'RESET_PAGE_TEXT_UPDATE_REQUEST',
  START_NEW_SEQUENCE: 'START_NEW_SEQUENCE', // payload: writing_sequence array
  PROCESS_NEXT_ACTION: 'PROCESS_NEXT_ACTION', // no payload, increments currentActionIndex
  UPDATE_GHOST_TEXT: 'UPDATE_GHOST_TEXT', // payload: new string for currentGhostText
  APPEND_SEQUENCE_USER_TEXT: 'APPEND_SEQUENCE_USER_TEXT', // payload: user-typed chars during active sequence
  SET_FADE_STATE: 'SET_FADE_STATE',       // payload: { isActive, to_text, phase }
  SEQUENCE_COMPLETE: 'SEQUENCE_COMPLETE',   // no payload, resets sequence processing flags
  CANCEL_SEQUENCE: 'CANCEL_SEQUENCE', // no payload, similar to SEQUENCE_COMPLETE for interruption
  RETYPE_ACTION: 'RETYPE_ACTION', // New action type for retyping
};

const initialTypingState = {
  inputBuffer: '',
  typingAllowed: true,
  lastPressedKey: null,
  showCursor: true,
  requestPageTextUpdate: false, // Flag for backspace needing page text modification
  actionSequence: [],
  currentActionIndex: 0,
  currentGhostText: '',
  sequenceUserText: '',
  isProcessingSequence: false,
  fadeState: { isActive: false, to_text: '', phase: 0 },
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
        inputBuffer: '', // Also clear input buffer on new page
        requestPageTextUpdate: false,
        actionSequence: [],
        currentActionIndex: 0,
        currentGhostText: '',
        sequenceUserText: '',
        isProcessingSequence: false,
        fadeState: { isActive: false, to_text: '', phase: 0 },
      };
    case typingActionTypes.HANDLE_BACKSPACE:
      if (state.inputBuffer.length === 0) { // If input buffer is empty
        if (state.isProcessingSequence) {
          // Allow backspace to edit user-typed text during sequence without cancelling fades.
          if (state.sequenceUserText.length > 0) {
            return {
              ...state,
              sequenceUserText: state.sequenceUserText.slice(0, -1),
              requestPageTextUpdate: false,
            };
          }
          return {
            ...state,
            requestPageTextUpdate: false,
          };
        }
        // If not processing sequence, then original logic for page text update
        return { ...state, requestPageTextUpdate: true };
      }
      // If input buffer is not empty, just remove from buffer
      return { ...state, inputBuffer: state.inputBuffer.slice(0, -1), requestPageTextUpdate: false };
    case typingActionTypes.RESET_PAGE_TEXT_UPDATE_REQUEST:
      return { ...state, requestPageTextUpdate: false };
    case typingActionTypes.START_NEW_SEQUENCE:
      return {
        ...state,
        actionSequence: action.payload, // Expects writing_sequence here
        currentActionIndex: 0,
        currentGhostText: '',
        sequenceUserText: '',
        isProcessingSequence: true,
        fadeState: { isActive: false, to_text: '', phase: 0 },
        inputBuffer: '', // Clear input buffer when a new sequence starts
        typingAllowed: false, // Keep user typing disabled while a sequence is running.
        showCursor: false,
      };
    case typingActionTypes.PROCESS_NEXT_ACTION:
      const newIndex = state.currentActionIndex + 1;
      if (newIndex < state.actionSequence.length) {
        const nextAction = state.actionSequence[newIndex];
        const allowTypingBetweenFadePhases =
          nextAction?.action === 'pause' || nextAction?.action === 'fade';
        return {
          ...state,
          currentActionIndex: newIndex,
          typingAllowed: allowTypingBetweenFadePhases,
          showCursor: allowTypingBetweenFadePhases,
        };
      }
      // If no more actions, currentActionIndex will be out of bounds, sequence completion is handled by useEffect.
      // typingAllowed will be set to true by SEQUENCE_COMPLETE
      return { ...state, currentActionIndex: newIndex };
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
      return {
        ...state,
        actionSequence: [],
        currentActionIndex: 0,
        currentGhostText: '',
        sequenceUserText: '',
        isProcessingSequence: false,
        fadeState: { isActive: false, to_text: '', phase: 0 }, // Reset fade display
        typingAllowed: true, // Allow typing when sequence is complete
        showCursor: true,
      };
    case typingActionTypes.CANCEL_SEQUENCE:
      // Both can share the same logic for now
      return {
        ...state,
        actionSequence: [],
        currentActionIndex: 0,
        currentGhostText: '', /* Clear ghost text on cancel */
        sequenceUserText: '',
        isProcessingSequence: false,
        fadeState: { isActive: false, to_text: '', phase: 0 },
        typingAllowed: true, /* Assume cancel means reset to typeable */
        showCursor: true,
      };
    case typingActionTypes.RETYPE_ACTION:
      // Ensure action.payload contains 'count' and 'text'
      if (action.payload && typeof action.payload.count === 'number' && typeof action.payload.text === 'string') {
        const textToModify = state.currentGhostText;
        const deleteCount = Math.min(action.payload.count, textToModify.length); // Don't delete more than exists
        const slicedText = textToModify.slice(0, -deleteCount);
        const newGhostText = slicedText + action.payload.text;
        return {
          ...state,
          currentGhostText: newGhostText,
        };
      }
      return state; // If payload is malformed, return current state
    default:
      return state;
  }
}

const TYPEWRITER_MAX_FONT_COLOR_LUMINANCE = 0.24;
const TYPEWRITER_FONT_COLOR_FALLBACK = '#2a120f';
const TYPEWRITER_FONT_COLOR_KEYWORD_MAP = [
  { keywords: ['red', 'crimson', 'scarlet', 'ember', 'rust', 'wine', 'oxblood', 'garnet'], color: '#5a1f17' },
  { keywords: ['blue', 'azure', 'indigo', 'navy', 'storm', 'sea', 'cobalt'], color: '#1f3558' },
  { keywords: ['green', 'moss', 'verdigris', 'jade', 'pine', 'forest'], color: '#253f33' },
  { keywords: ['violet', 'plum', 'amethyst', 'mulberry'], color: '#43233d' },
  { keywords: ['brown', 'sepia', 'umber', 'bronze', 'copper', 'sienna'], color: '#4a2d1f' },
  { keywords: ['black', 'obsidian', 'ink', 'graphite', 'charcoal', 'ash', 'gray', 'grey', 'silver', 'iron'], color: '#2b2421' },
];

const expandHexColor = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const shortMatch = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (shortMatch) {
    return `#${shortMatch[1].split('').map((char) => `${char}${char}`).join('').toLowerCase()}`;
  }
  const longMatch = trimmed.match(/^#([0-9a-f]{6})$/i);
  if (longMatch) {
    return `#${longMatch[1].toLowerCase()}`;
  }
  return null;
};

const parseHexColor = (value) => {
  const expanded = expandHexColor(value);
  if (!expanded) return null;
  return {
    r: Number.parseInt(expanded.slice(1, 3), 16),
    g: Number.parseInt(expanded.slice(3, 5), 16),
    b: Number.parseInt(expanded.slice(5, 7), 16),
  };
};

const toHexColor = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`;

const getRelativeLuminance = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const darkenColorForTypewriter = (rgb) => {
  const luminance = getRelativeLuminance(rgb);
  if (luminance <= TYPEWRITER_MAX_FONT_COLOR_LUMINANCE) {
    return rgb;
  }
  const scale = TYPEWRITER_MAX_FONT_COLOR_LUMINANCE / luminance;
  return {
    r: Math.max(12, Math.round(rgb.r * scale)),
    g: Math.max(12, Math.round(rgb.g * scale)),
    b: Math.max(12, Math.round(rgb.b * scale)),
  };
};

const pickTypewriterKeywordColor = (value) => {
  const lowered = `${value || ''}`.trim().toLowerCase();
  if (!lowered) return null;
  const match = TYPEWRITER_FONT_COLOR_KEYWORD_MAP.find((entry) =>
    entry.keywords.some((keyword) => lowered.includes(keyword))
  );
  return match?.color || null;
};

export const sanitizeTypewriterFontColor = (fontColor) => {
  if (typeof fontColor !== 'string' || !fontColor.trim()) {
    return TYPEWRITER_FONT_COLOR_FALLBACK;
  }
  const normalizedRaw = fontColor.trim().toLowerCase();
  const expanded = expandHexColor(fontColor);
  const parsed = parseHexColor(fontColor);
  if (parsed) {
    const darkenedHex = toHexColor(darkenColorForTypewriter(parsed));
    return darkenedHex === expanded ? normalizedRaw : darkenedHex;
  }
  const keywordMatch = pickTypewriterKeywordColor(fontColor);
  if (keywordMatch) {
    return keywordMatch;
  }
  return TYPEWRITER_FONT_COLOR_FALLBACK;
};

export const normalizeFontMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return null;
  const font = metadata.font || metadata.fontName || metadata.font_family || metadata.fontFamily;
  const font_size = metadata.font_size || metadata.fontSize || metadata.size;
  const font_color = metadata.font_color || metadata.fontColor || metadata.color;
  if (!font && !font_size && !font_color) return null;
  return {
    font,
    font_size,
    font_color: sanitizeTypewriterFontColor(font_color)
  };
};

const mergeFontMetadata = (baseMetadata, overrideMetadata) => {
  const base = normalizeFontMetadata(baseMetadata);
  const override = normalizeFontMetadata(overrideMetadata);
  if (!base && !override) return null;
  return {
    font: override?.font || base?.font || '',
    font_size: override?.font_size || base?.font_size || '',
    font_color: override?.font_color || base?.font_color || '',
  };
};

const getFirstSequenceStyle = (sequence = []) => {
  if (!Array.isArray(sequence)) return null;
  for (const step of sequence) {
    const style = normalizeFontMetadata(step?.style);
    if (style) return style;
  }
  return null;
};

const getStorytellerSlotDebugState = (slot) => {
  const slotLabel = `Slot ${Number.isInteger(slot?.slotIndex) ? slot.slotIndex + 1 : '?'}`;
  if (!slot?.filled || !slot?.keyImageUrl) {
    return { label: slotLabel, status: 'empty', storytellerName: '' };
  }
  const isMock = typeof slot.keyImageUrl === 'string'
    && slot.keyImageUrl.includes('/assets/mocks/storyteller_keys/');
  return {
    label: slotLabel,
    status: isMock ? 'mock' : 'live',
    storytellerName: slot.storytellerName || ''
  };
};

export const normalizeTypewriterReply = (reply) => {
  if (!reply || typeof reply !== 'object') {
    return { sequence: [], hasFadeActions: false, metadata: null };
  }

  const metadata = normalizeFontMetadata(reply.metadata || reply.style || reply.meta);
  const writing = Array.isArray(reply.writing_sequence) ? reply.writing_sequence : [];
  const fades = Array.isArray(reply.fade_sequence) ? reply.fade_sequence : [];
  const rawSequence = Array.isArray(reply.sequence) ? reply.sequence : [...writing, ...fades];

  let fadePhaseCounter = 1;
  let sawFade = false;
  const sequence = rawSequence.reduce((acc, action) => {
    if (!action || typeof action !== 'object') return acc;
    const type = action.action || action.type;
    if (!type) return acc;

    const delay = Number.isFinite(action.delay) ? action.delay : 0;
    const normalizedActionStyle = normalizeFontMetadata(action.style || action.metadata || action.meta);

    if (type === 'type') {
      const text = typeof action.text === 'string'
        ? action.text
        : typeof action.continuation === 'string'
          ? action.continuation
          : typeof action.to_text === 'string'
            ? action.to_text
            : '';
      acc.push({ action: 'type', text, style: normalizedActionStyle, delay });
      return acc;
    }

    if (type === 'fade') {
      const to_text = typeof action.to_text === 'string'
        ? action.to_text
        : typeof action.continuation === 'string'
          ? action.continuation
          : typeof action.text === 'string'
            ? action.text
            : '';
      const phase = Number.isFinite(action.phase) ? action.phase : fadePhaseCounter;
      const explicitLeadDelay = Number.isFinite(action.leadDelay)
        ? action.leadDelay
        : Number.isFinite(action.start_delay)
          ? action.start_delay
          : null;
      let trailingPreFadeDelay = 0;
      for (let index = acc.length - 1; index >= 0; index -= 1) {
        const previousAction = acc[index];
        if (!previousAction) break;
        trailingPreFadeDelay += Number.isFinite(previousAction.delay) ? previousAction.delay : 0;
        if (previousAction.action !== 'pause') break;
      }
      const leadDelay = explicitLeadDelay ?? (
        sawFade
          ? 0
          : Math.max(0, FIRST_FADE_HANDOFF_DELAY - trailingPreFadeDelay)
      );
      fadePhaseCounter += 1;
      sawFade = true;
      acc.push({ action: 'fade', to_text, phase, style: normalizedActionStyle, delay, leadDelay });
      return acc;
    }

    if (type === 'pause') {
      acc.push({ action: 'pause', delay });
      return acc;
    }

    if (type === 'delete') {
      const count = Number.isFinite(action.count) ? action.count : Number(action.count || action.chars || 0);
      acc.push({ action: 'delete', count, delay });
      return acc;
    }

    if (type === 'retype') {
      const count = Number.isFinite(action.count) ? action.count : Number(action.count || 0);
      const text = typeof action.text === 'string'
        ? action.text
        : typeof action.continuation === 'string'
          ? action.continuation
          : '';
      acc.push({ action: 'retype', count, text, delay });
      return acc;
    }

    acc.push({ action: type, delay });
    return acc;
  }, []);

  return { sequence, metadata };
};

const toFiniteNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const asStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const normalizeEntityInsights = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entity) => {
      if (!entity || typeof entity !== 'object') return null;
      const entity_name = typeof entity.entity_name === 'string' ? entity.entity_name.trim() : '';
      const ner_category = typeof entity.ner_category === 'string' ? entity.ner_category.trim() : '';
      const ascope_pmesii = typeof entity.ascope_pmesii === 'string' ? entity.ascope_pmesii.trim() : '';
      const storytellingPointsRaw = toFiniteNumber(entity.storytelling_points);
      const reuse = typeof entity.reuse === 'boolean' ? entity.reuse : null;
      if (!entity_name && !ner_category && !ascope_pmesii && storytellingPointsRaw === null && reuse === null) {
        return null;
      }
      return {
        entity_name,
        ner_category,
        ascope_pmesii,
        storytelling_points: storytellingPointsRaw,
        reuse
      };
    })
    .filter(Boolean);
};

export const normalizeContinuationInsights = (reply, fallbackStyle = null) => {
  if (!reply || typeof reply !== 'object') return null;
  const source = reply.continuation_insights && typeof reply.continuation_insights === 'object'
    ? reply.continuation_insights
    : reply;
  const meaning = asStringArray(source.meaning);
  const contextualStrengthening = typeof source.contextual_strengthening === 'string'
    ? source.contextual_strengthening.trim()
    : '';
  const continuationWordCount = toFiniteNumber(source.continuation_word_count);
  const storytellingPool = toFiniteNumber(source.current_storytelling_points_pool);
  const pointsEarned = toFiniteNumber(source.points_earned);
  const entities = normalizeEntityInsights(source.Entities || source.entities);
  const style = normalizeFontMetadata(source.style || source.metadata || fallbackStyle);
  const hasContent = Boolean(
    meaning.length
    || contextualStrengthening
    || continuationWordCount !== null
    || storytellingPool !== null
    || pointsEarned !== null
    || entities.length
    || style
  );
  if (!hasContent) return null;
  return {
    meaning,
    contextual_strengthening: contextualStrengthening,
    continuation_word_count: continuationWordCount,
    current_storytelling_points_pool: storytellingPool,
    points_earned: pointsEarned,
    entities,
    style
  };
};

const normalizeContinuationTiming = (reply) => {
  if (!reply || typeof reply !== 'object') return null;
  const source = reply.timing && typeof reply.timing === 'object' ? reply.timing : reply;
  const narrativeWordCount = toFiniteNumber(source.narrative_word_count);
  const fadeSteps = toFiniteNumber(source.fade_steps);
  const firstPauseDelay = toFiniteNumber(source.first_pause_delay);
  const phasePauseDelay = toFiniteNumber(source.phase_pause_delay);
  const finalPauseDelay = toFiniteNumber(source.final_pause_delay);
  const fadeIntervalDelay = toFiniteNumber(source.fade_interval_ms);
  const fadePhaseDelay = fadeIntervalDelay ?? toFiniteNumber(source.fade_phase_delay);
  const estimatedTotalDurationMs = toFiniteNumber(source.estimated_total_duration_ms);
  const timingScale = toFiniteNumber(source.timing_scale);
  const hasContent = Boolean(
    narrativeWordCount !== null
    || fadeSteps !== null
    || firstPauseDelay !== null
    || phasePauseDelay !== null
    || finalPauseDelay !== null
    || fadePhaseDelay !== null
    || estimatedTotalDurationMs !== null
    || timingScale !== null
  );
  if (!hasContent) return null;
  return {
    narrative_word_count: narrativeWordCount,
    fade_steps: fadeSteps,
    first_pause_delay: firstPauseDelay,
    phase_pause_delay: phasePauseDelay,
    final_pause_delay: finalPauseDelay,
    fade_interval_ms: fadePhaseDelay,
    fade_phase_delay: fadePhaseDelay,
    estimated_total_duration_ms: estimatedTotalDurationMs,
    timing_scale: timingScale
  };
};

const formatTimingMs = (value) => {
  if (!Number.isFinite(value)) return null;
  return `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)}s`;
};

const formatTimingWithMs = (value) => {
  if (!Number.isFinite(value)) return null;
  const seconds = formatTimingMs(value);
  return `${seconds} (${Math.round(value)}ms)`;
};

const keys = [
  'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', STORYTELLER_SLOT_HORIZONTAL_KEY,
  'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', STORYTELLER_SLOT_VERTICAL_KEY,
  'Z', 'X', 'C', 'V', 'B', 'N', 'M', STORYTELLER_SLOT_RECT_HORIZONTAL_KEY, 'THE XEROFAG'
];

const TypewriterFramework = (props) => {
  // --- Reducers ---
  const [pageTransitionState, dispatchPageTransition] = useReducer(pageTransitionReducer, initialPageTransitionState);
  const {
    scrollMode, // Note: scrollMode is part of pageTransitionState, not typingState
    pageChangeInProgress,
    isSliding,
    slideX,
    slideDir,
    prevFilmBgUrl,
    nextFilmBgUrl,
    prevText,
    nextText,
  } = pageTransitionState;

  const [typingState, dispatchTyping] = useReducer(typingReducer, initialTypingState);
  const {
    inputBuffer,
    typingAllowed,
    lastPressedKey,
    // responses, // Removed
    // ghostKeyQueue, // Removed
    showCursor,
    // New state values:
    actionSequence,
    currentActionIndex,
    currentGhostText,
    sequenceUserText,
    isProcessingSequence,
    fadeState,
  } = typingState;

  const [ghostwriterState, dispatchGhostwriter] = useReducer(ghostwriterReducer, initialGhostwriterState);
  // --- Page History State (Still useState as per instructions) ---
  const [pages, setPages] = useState([
    { text: '', filmBgUrl: DEFAULT_FILM_BG_URL }
  ]);
  const [currentPage, setCurrentPage] = useState(0);

  // --- Other State ---
  const [keyTextures, setKeyTextures] = useState(() => keys.map(getInitialKeyTexture));
  const [storytellerSlots, setStorytellerSlots] = useState(() => createInitialStorytellerSlots());
  const [storyEntityKeys, setStoryEntityKeys] = useState([]);
  const [activeStorytellerPress, setActiveStorytellerPress] = useState(null);
  const [ghostPressedKey, setGhostPressedKey] = useState(null);
  const [preGhostAtmosphere, setPreGhostAtmosphere] = useState(false);
  // lastUserInputTime, responseQueued, lastGeneratedLength are now in ghostwriterState
  // Level: 0 = empty, 3 = full (ready for page turn)
  const [leverLevel, setLeverLevel] = useState(0);
  const [currentFontStyles, setCurrentFontStyles] = useState(null);
  const [lastContinuationInsights, setLastContinuationInsights] = useState(null);
  const [lastContinuationTiming, setLastContinuationTiming] = useState(null);
  const [debugSettings, setDebugSettings] = useState(() => readStoredTypewriterDebugSettings());



  const SLIDE_DURATION_MS = 1200;

  // --- Refs ---
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const lastLineRef = useRef(null);
  const strikerRef = useRef(null);
  const isProcessingSequenceRef = useRef(false);
  const ambientStartedRef = useRef(false);
  const storytellerCheckInFlightRef = useRef(false);
  const storytellerInitialSyncSessionRef = useRef('');
  const lastStorytellerCheckIntervalRef = useRef(-1);
  const wasProcessingSequenceRef = useRef(false);

  const [sessionId, setSessionId] = useState(() => readStoredSessionId());
  const [isFreshSession, setIsFreshSession] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const initializeSession = async () => {
      const requestedSessionId = readStoredSessionId();
      const fallbackSessionId = requestedSessionId || Math.random().toString(36).substring(2, 15);
      const { data, error } = await startTypewriterSession(requestedSessionId);
      if (cancelled) return;

      const nextSessionId = data?.sessionId || fallbackSessionId;
      setIsFreshSession(!requestedSessionId && Boolean(nextSessionId));
      if (nextSessionId) {
        localStorage.setItem(SESSION_ID_STORAGE_KEY, nextSessionId);
        setSessionId(nextSessionId);
      }

      if (error || typeof data?.fragment !== 'string') {
        setIsSessionReady(true);
        return;
      }

      setPages((prev) => {
        if (!Array.isArray(prev) || prev.length !== 1 || prev[0]?.text) {
          return prev;
        }
        return [
          {
            ...prev[0],
            text: data.fragment
          }
        ];
      });
      dispatchGhostwriter({
        type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH,
        payload: data.fragment.length
      });
      if (Array.isArray(data?.entityKeys)) {
        setStoryEntityKeys(mergeStoryEntityKeys([], data.entityKeys));
      }
      setIsSessionReady(true);
    };

    initializeSession().catch((error) => {
      if (cancelled) return;
      console.error('Error initializing typewriter session:', error);
      setIsSessionReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [dispatchGhostwriter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TYPEWRITER_DEBUG_STORAGE_KEY, JSON.stringify(debugSettings));
  }, [debugSettings]);

  // --- Derived ---
  const { text: pageText, filmBgUrl: pageBg } = pages[currentPage] || {};
  const visibleGhostText = `${typingState.currentGhostText || ''}${typingState.sequenceUserText || ''}`;
  const displayedKeyTextures = keys.map((key, index) => {
    const storytellerSlot = storytellerSlots.find((slot) => slot.slotKey === key);
    if (storytellerSlot) {
      return storytellerSlot.keyImageUrl || storytellerSlot.blankTextureUrl;
    }
    return keyTextures[index];
  });
  const visibleLineCount = Math.min(countLines(pageText, visibleGhostText), MAX_LINES);
  const neededHeight = TOP_OFFSET + visibleLineCount * LINE_HEIGHT + NEEDED_HEIGHT_OFFSET;
  const scrollAreaHeight = Math.max(FRAME_HEIGHT, neededHeight);
  const canPullTurnPageLever =
    leverLevel === LEVER_LEVEL_WORD_THRESHOLDS.length - 1
    && !pageChangeInProgress
    && typingAllowed;

  useEffect(() => {
    if (!sessionId) return;
    storytellerInitialSyncSessionRef.current = '';
    storytellerCheckInFlightRef.current = false;
    lastStorytellerCheckIntervalRef.current = -1;
    setStorytellerSlots(createInitialStorytellerSlots());
    setStoryEntityKeys([]);
    setActiveStorytellerPress(null);
    setKeyTextures(keys.map(getInitialKeyTexture));
  }, [sessionId]);

  const syncTypewriterStorytellerSlots = useCallback(async (wordIntervalIndex = 0) => {
    if (!sessionId || storytellerCheckInFlightRef.current) {
      return false;
    }

    storytellerCheckInFlightRef.current = true;
    try {
      const { data, error } = await fetchShouldCreateStorytellerKey(sessionId);
      if (error || !data) {
        return false;
      }

      const slotMap = new Map(
        (Array.isArray(data.slots) ? data.slots : []).map((slot) => [slot.slotIndex, slot])
      );
      setStorytellerSlots((prev) =>
        prev.map((slot) => {
          const nextSlot = slotMap.get(slot.slotIndex);
          return nextSlot ? { ...slot, ...nextSlot } : slot;
        })
      );
      if (Array.isArray(data.entityKeys)) {
        setStoryEntityKeys((prev) => mergeStoryEntityKeys(prev, data.entityKeys));
      }
      lastStorytellerCheckIntervalRef.current = Math.max(
        lastStorytellerCheckIntervalRef.current,
        Number.isInteger(wordIntervalIndex) ? wordIntervalIndex : 0
      );
      return true;
    } catch (error) {
      console.error('Error syncing storyteller keys:', error);
      return false;
    } finally {
      storytellerCheckInFlightRef.current = false;
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isSessionReady || !sessionId) return;
    if (storytellerInitialSyncSessionRef.current === sessionId) return;

    const currentWordInterval = Math.floor(countWordsInNarrative(pageText || '') / STORYTELLER_KEY_CHECK_INTERVAL_WORDS);
    const timeoutId = window.setTimeout(() => {
      syncTypewriterStorytellerSlots(currentWordInterval).then((didSync) => {
        if (didSync) {
          storytellerInitialSyncSessionRef.current = sessionId;
        }
      });
    }, STORYTELLER_KEY_CHECK_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isSessionReady, pageText, sessionId, syncTypewriterStorytellerSlots]);

  useEffect(() => {
    if (!isSessionReady || !sessionId) return;

    const wordIntervalIndex = Math.floor(countWordsInNarrative(pageText || '') / STORYTELLER_KEY_CHECK_INTERVAL_WORDS);
    if (wordIntervalIndex <= 0) return;
    if (wordIntervalIndex <= lastStorytellerCheckIntervalRef.current) return;

    const timeoutId = window.setTimeout(() => {
      syncTypewriterStorytellerSlots(wordIntervalIndex);
    }, STORYTELLER_KEY_CHECK_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isSessionReady, pageText, sessionId, syncTypewriterStorytellerSlots]);

  useEffect(() => {
    if (!isSessionReady || !sessionId) return;

    const timeoutId = window.setTimeout(() => {
      startTypewriterSession(sessionId, pageText).catch((error) => {
        console.error('Error persisting typewriter fragment:', error);
      });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [isSessionReady, pageText, sessionId]);

  const applyTypewriterReply = useCallback((reply, fullText, options = {}) => {
    if (isProcessingSequenceRef.current) {
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
      return false;
    }

    const { sequence, metadata } = normalizeTypewriterReply(reply);
    if (!sequence.length) {
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
      return false;
    }

    const resolvedSequenceStyle = getFirstSequenceStyle(sequence);
    const resolvedStyle = mergeFontMetadata(metadata, resolvedSequenceStyle);

    if (resolvedStyle) {
      setCurrentFontStyles(resolvedStyle);
    }
    setLastContinuationInsights(normalizeContinuationInsights(reply, resolvedStyle));
    const continuationTiming = normalizeContinuationTiming(reply);
    const visualFadeDurationMs = Number.isFinite(continuationTiming?.fade_interval_ms)
      ? Math.max(350, Math.round(continuationTiming.fade_interval_ms * debugSettings.fadeVisualScale))
      : null;
    setLastContinuationTiming(
      continuationTiming
        ? {
            ...continuationTiming,
            visual_fade_duration_ms: visualFadeDurationMs
          }
        : null
    );

    const generatedContinuation = sequence
      .filter((step) => step.action === 'type' && typeof step.text === 'string')
      .map((step) => step.text)
      .join('');
    const generatedWordCount = generatedContinuation.trim().split(/\s+/).filter(Boolean).length;

    setPreGhostAtmosphere(true);
    playPreGhostSound();

    const delay = import.meta.env.MODE === 'test' ? 1 : 1500;
    setTimeout(() => {
      setPreGhostAtmosphere(false);
      if (typeof options?.onSequenceStart === 'function') {
        options.onSequenceStart();
      }
      dispatchTyping({ type: typingActionTypes.START_NEW_SEQUENCE, payload: sequence });
    }, delay);

    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: fullText.length });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GHOSTWRITER_WORD_COUNT, payload: generatedWordCount });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: true });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
    return true;
  }, [dispatchTyping, dispatchGhostwriter, setCurrentFontStyles, debugSettings.fadeVisualScale]);

  useEffect(() => {
    const wasProcessingSequence = wasProcessingSequenceRef.current;
    if (activeStorytellerPress && wasProcessingSequence && !typingState.isProcessingSequence) {
      setActiveStorytellerPress(null);
    }
    wasProcessingSequenceRef.current = typingState.isProcessingSequence;
  }, [typingState.isProcessingSequence, activeStorytellerPress]);

  const ensureAmbientStarted = useCallback(() => {
    if (ambientStartedRef.current) return;
    ambientStartedRef.current = true;
    // ambientSoundManager.startAmbient();
  }, []);

  useEffect(() => {
    return () => ambientSoundManager.stopAmbient();
  }, []);

  useEffect(() => {
    if (!ambientStartedRef.current) return;
    if (typingState.isProcessingSequence) {
      ambientSoundManager.intensify();
    } else {
      ambientSoundManager.relax();
    }
  }, [typingState.isProcessingSequence]);

  useEffect(() => {
    isProcessingSequenceRef.current = typingState.isProcessingSequence;
  }, [typingState.isProcessingSequence]);

  // --- Cinematic Scroll intro ---
  useEffect(() => {
    if (pageTransitionState.scrollMode !== INITIAL_SCROLL_MODE || !scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
    const timer = setTimeout(() => {
      cinematicScrollTo(scrollRef, CINEMATIC_SCROLL_INTRO_SCROLL_TO_TOP_TIMEOUT, CINEMATIC_SCROLL_INTRO_DURATION);
      setTimeout(() => dispatchPageTransition({ type: pageTransitionActionTypes.SET_SCROLL_MODE, payload: { scrollMode: NORMAL_SCROLL_MODE } }), CINEMATIC_SCROLL_TO_NORMAL_MODE_TIMEOUT);
    }, CINEMATIC_SCROLL_INTRO_DELAY);
    return () => clearTimeout(timer);
  }, [pageTransitionState.scrollMode]);

  function cinematicScrollTo(ref, to, duration = CINEMATIC_SCROLL_DEFAULT_DURATION) {
    if (!ref.current) return;
    const start = ref.current.scrollTop;
    const change = to - start;
    const startTime = performance.now();
    function animateScroll(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      ref.current.scrollTop = start + change * ease;
      if (progress < 1) requestAnimationFrame(animateScroll);
    }
    requestAnimationFrame(animateScroll);
  }

  // --- Unified scroll effect ---
  useEffect(() => {
    // The top-level check for scrollRef.current is good.
    // The original error was specifically for lastLineRef.current being null before scrollIntoView.
    if (!scrollRef.current) return;
    if (typingState.fadeState.isActive) return;

    if (pageTransitionState.scrollMode === NORMAL_SCROLL_MODE) {
      requestAnimationFrame(() => {
        if (lastLineRef.current) { // Check if lastLineRef.current is not null
          lastLineRef.current.scrollIntoView({
            behavior: typingState.isProcessingSequence ? 'auto' : 'smooth',
            block: 'nearest'
          });
        }
      });
    }
  }, [pageText, visibleGhostText, pageTransitionState.scrollMode, typingState.fadeState.isActive, typingState.isProcessingSequence]);

  // --- PAGE TURN: Scroll up, then slide left (NEW PAGE) ---
  const handlePageTurnScroll = async () => {
    if (pageTransitionState.pageChangeInProgress) return;
    dispatchPageTransition({ type: pageTransitionActionTypes.START_PAGE_TURN_SCROLL });
    dispatchTyping({ type: typingActionTypes.SET_TYPING_ALLOWED, payload: false });
    dispatchTyping({ type: typingActionTypes.SET_SHOW_CURSOR, payload: false });
    playEndOfPageSound();

    // Animate scroll up
    if (scrollRef.current) {
      const start = scrollRef.current.scrollTop;
      const duration = PAGE_TURN_SCROLL_ANIMATION_DURATION;
      const startTime = performance.now();

      function animateScroll(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        scrollRef.current.scrollTop = start - start * ease;
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          scrollRef.current.scrollTop = 0;

          // Fetch next film image then prepare for slide
          fetchNextFilmImage(pageText + visibleGhostText, sessionId).then(data => {
            const newUrl = data?.data?.image_url || data?.data?.image_path || null;
            const newFilm = newUrl || DEFAULT_FILM_BG_URL;

            dispatchPageTransition({
              type: pageTransitionActionTypes.PREPARE_SLIDE,
              payload: {
                slideDir: SLIDE_DIRECTION_LEFT,
                prevFilmBgUrl: pageBg,
                prevText: pageText,
                nextFilmBgUrl: newFilm,
                nextText: '', // New page is blank
              }
            });

            // Update pages: Add new blank page, move to it
            setPages(prev => [
              ...prev.slice(0, currentPage + 1),
              { text: '', filmBgUrl: newFilm }
            ]);
            setCurrentPage(prev => prev + 1);

            requestAnimationFrame(() => {
              dispatchPageTransition({
                type: pageTransitionActionTypes.START_SLIDE_ANIMATION,
                payload: { slideX: PAGE_SLIDE_X_OFFSET }
              });
            });

            setTimeout(() => {
              dispatchPageTransition({
                type: pageTransitionActionTypes.FINISH_SLIDE_ANIMATION,
                payload: { newScrollMode: INITIAL_SCROLL_MODE }
              });
              dispatchTyping({ type: typingActionTypes.SET_TYPING_ALLOWED, payload: true });
              dispatchTyping({ type: typingActionTypes.SET_SHOW_CURSOR, payload: true });
              dispatchTyping({ type: typingActionTypes.RESET_TYPING_STATE_FOR_NEW_PAGE });
              dispatchGhostwriter({ type: ghostwriterActionTypes.RESET_GHOSTWRITER_STATE });
            }, SLIDE_DURATION_MS);
          });
        }
      }
      requestAnimationFrame(animateScroll);
    }
  };

  // --- PAGE TURN: Slide right (BACK/NEXT in history) ---
  const handleHistoryNavigation = (targetIdx) => {
    if (pageTransitionState.pageChangeInProgress || pageTransitionState.isSliding) return;

    dispatchTyping({ type: typingActionTypes.SET_TYPING_ALLOWED, payload: false });
    dispatchTyping({ type: typingActionTypes.SET_SHOW_CURSOR, payload: false });

    const toNext = targetIdx > currentPage;
    const targetPage = pages[targetIdx];

    dispatchPageTransition({
      type: pageTransitionActionTypes.START_HISTORY_NAVIGATION,
      payload: {
        slideDir: toNext ? SLIDE_DIRECTION_LEFT : SLIDE_DIRECTION_RIGHT,
        prevFilmBgUrl: pageBg,
        prevText: pageText,
        nextFilmBgUrl: targetPage?.filmBgUrl || DEFAULT_FILM_BG_URL,
        nextText: targetPage?.text || '',
      }
    });

    requestAnimationFrame(() => {
      dispatchPageTransition({
        type: pageTransitionActionTypes.START_SLIDE_ANIMATION,
        payload: { slideX: toNext ? PAGE_SLIDE_X_OFFSET : -PAGE_SLIDE_X_OFFSET }
      });
    });

    setTimeout(() => {
      setCurrentPage(targetIdx); // Update current page after slide
      dispatchPageTransition({
        type: pageTransitionActionTypes.FINISH_SLIDE_ANIMATION,
        payload: { newScrollMode: INITIAL_SCROLL_MODE }
      });
      dispatchTyping({ type: typingActionTypes.SET_TYPING_ALLOWED, payload: (targetIdx === pages.length - 1) });
      dispatchTyping({ type: typingActionTypes.SET_SHOW_CURSOR, payload: true });
      dispatchTyping({ type: typingActionTypes.RESET_TYPING_STATE_FOR_NEW_PAGE });
      dispatchGhostwriter({ type: ghostwriterActionTypes.RESET_GHOSTWRITER_STATE });
    }, SLIDE_DURATION_MS);
  };

  // --- Keyboard Handler ---
  const handleKeyDown = (e) => {
    if (pageTransitionState.pageChangeInProgress || !typingState.typingAllowed) {
      if (pageTransitionState.pageChangeInProgress)
        playEndOfPageSound();
      return;
    }
    const char = e.key === "Enter" ? '\n' : e.key;
    // Use typingState.inputBuffer and typingState.currentGhostText for currentLines calculation

    const ghostTextString = visibleGhostText;
    const fullCombinedText = pageText + ghostTextString;
    const currentLines = fullCombinedText.split('\n');

    if (currentLines.length >= MAX_LINES && e.key === 'Enter') {
      e.preventDefault();
      return;
    }
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: e.key.toUpperCase() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: Date.now() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    ensureAmbientStarted();

    if (e.key.length === 1 || e.key === "Enter") {
      e.preventDefault();
      if (typingState.isProcessingSequence) {
        takeOverSequenceAtCursor();
      } else if (typingState.currentGhostText) {
        commitGhostText(); // commitGhostText will now use typingState.currentGhostText and handle sequence
      }
      dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: char });
      if (e.key === "Enter") playEnterSound();
      else playKeySound();
      return; // Return after handling Enter or character input
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      // The variables oldInputBufferEmpty and oldIsProcessingSequence are removed as they are no longer used.
      dispatchTyping({ type: typingActionTypes.HANDLE_BACKSPACE });
      playKeySound();
      return;
    }
  };

  // Effect to handle page text update request from backspace
  useEffect(() => {
    if (typingState.requestPageTextUpdate) {
      // This effect now solely handles page text deletion when requested by the reducer.
      setPages(prev => {
        const updatedPages = [...prev];
        if (updatedPages[currentPage] && updatedPages[currentPage].text.length > 0) {
          updatedPages[currentPage] = {
            ...updatedPages[currentPage],
            text: updatedPages[currentPage].text.slice(0, -1)
          };
        }
        return updatedPages;
      });
      dispatchTyping({ type: typingActionTypes.RESET_PAGE_TEXT_UPDATE_REQUEST });
    }
  }, [typingState.requestPageTextUpdate, dispatchTyping, setPages, currentPage]);


  // --- Typing: apply inputBuffer to current page text ---
  useEffect(() => {
    if (!typingState.inputBuffer.length || !typingState.typingAllowed) return;
    const charToCommit = typingState.inputBuffer[0];
    const timeout = setTimeout(() => {
      if (typingState.isProcessingSequence) {
        dispatchTyping({ type: typingActionTypes.APPEND_SEQUENCE_USER_TEXT, payload: charToCommit });
      } else {
        setPages(prev => {
          const updatedPages = [...prev];
          updatedPages[currentPage] = {
            ...updatedPages[currentPage],
            text: updatedPages[currentPage].text + charToCommit
          };
          return updatedPages;
        });
      }
      dispatchTyping({ type: typingActionTypes.CONSUME_INPUT_BUFFER });
      if (charToCommit === '\n' && strikerRef.current) {
        strikerRef.current.classList.add('striker-return');
        setTimeout(() => {
          if (strikerRef.current) {
            strikerRef.current.classList.remove('striker-return');
          }
        }, STRIKER_RETURN_ANIMATION_DURATION);
      }
    }, TYPING_ANIMATION_INTERVAL);
    return () => clearTimeout(timeout);
  }, [typingState.inputBuffer, typingState.typingAllowed, typingState.isProcessingSequence, currentPage, setPages]);

  // --- Key Visual State ---
  useEffect(() => {
    if (!typingState.lastPressedKey) return;
    const timeout = setTimeout(() => dispatchTyping({ type: typingActionTypes.CLEAR_LAST_PRESSED_KEY }), LAST_PRESSED_KEY_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [typingState.lastPressedKey]);

  // --- Key Texture Refresh ---
  useEffect(() => {
    const refreshableKeyIndexes = keys.reduce((indexes, key, index) => {
      if (!getStorytellerSlotDefinitionByKey(key)) {
        indexes.push(index);
      }
      return indexes;
    }, []);
    if (!refreshableKeyIndexes.length) {
      return undefined;
    }
    const interval = setInterval(() => {
      const idx = refreshableKeyIndexes[Math.floor(Math.random() * refreshableKeyIndexes.length)];
      setKeyTextures(prev => {
        const updated = [...prev];
        const key = keys[idx];
        updated[idx] = getInitialKeyTexture(key);
        return updated;
      });
    }, KEY_TEXTURE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [keyTextures]);

  // --- Action Sequence Processing ---
  useEffect(() => {
    let timeoutId;
    let cancelled = false;

    const toGhostString = (value) => (
      Array.isArray(value)
        ? value.map((part) => (typeof part?.char === 'string' ? part.char : '')).join('')
        : String(value || '')
    );

    const shouldPrefixSpace = (baseText, existingGhostText, nextFragment) => {
      if (!baseText || existingGhostText || !nextFragment) return false;
      if (/\s$/.test(baseText)) return false;
      if (/^\s/.test(nextFragment)) return false;
      return true;
    };

    const scheduleNext = (delay = 0) => {
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
        }
      }, Math.max(0, delay));
    };

    if (!typingState.isProcessingSequence) {
      return () => clearTimeout(timeoutId);
    }

    if (typingState.currentActionIndex >= typingState.actionSequence.length) {
      const userSuffix = String(typingState.sequenceUserText || '');
      if (userSuffix) {
        setPages(prev => {
          const updatedPages = [...prev];
          const existingPage = updatedPages[currentPage] || { text: '', filmBgUrl: DEFAULT_FILM_BG_URL };
          updatedPages[currentPage] = {
            ...existingPage,
            text: `${existingPage.text || ''}${userSuffix}`
          };
          return updatedPages;
        });
      }
      if (activeStorytellerPress) {
        setActiveStorytellerPress(null);
      }
      dispatchTyping({ type: typingActionTypes.SEQUENCE_COMPLETE });
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: pageText.length + userSuffix.length });
      dispatchGhostwriter({ type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: Date.now() });
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_AWAITING_USER_INPUT_AFTER_SEQUENCE, payload: true });
      return () => clearTimeout(timeoutId);
    }

    const currentAction = typingState.actionSequence[typingState.currentActionIndex];
    const basePageText = String(pageText || '');
    const existingGhostText = toGhostString(typingState.currentGhostText);
    const currentActionStyle = normalizeFontMetadata(currentAction?.style);

    if (currentActionStyle) {
      setCurrentFontStyles((previous) => mergeFontMetadata(previous, currentActionStyle));
    }

    switch (currentAction.action) {
      case 'type': {
        let textToAdd = typeof currentAction.text === 'string' ? currentAction.text : '';
        if (shouldPrefixSpace(basePageText, existingGhostText, textToAdd)) {
          textToAdd = ` ${textToAdd}`;
        }

        let letterIndex = 0;
        let nextGhostText = existingGhostText;

        const typeNextLetter = () => {
          if (cancelled) return;

          if (letterIndex >= textToAdd.length) {
            scheduleNext(currentAction.delay || 0);
            return;
          }

          const char = textToAdd[letterIndex];
          nextGhostText += char;
          dispatchTyping({ type: typingActionTypes.UPDATE_GHOST_TEXT, payload: nextGhostText });

          if (playGhostWriterSound && letterIndex % 5 === 0) {
            playGhostWriterSound();
          }

          setGhostPressedKey(char.toUpperCase());
          setTimeout(() => setGhostPressedKey(null), 120);

          const clusterPos = letterIndex % 8;
          let nextDelay;
          if (clusterPos < 5) {
            nextDelay = 40 + Math.random() * 30;
          } else if (clusterPos === 5) {
            nextDelay = 200 + Math.random() * 300;
          } else {
            nextDelay = 60 + Math.random() * 40;
          }
          if (/[.,;:!?]/.test(char)) nextDelay = 250 + Math.random() * 350;
          if (char === ' ') nextDelay = Math.min(nextDelay, 50 + Math.random() * 30);

          letterIndex += 1;
          timeoutId = setTimeout(typeNextLetter, nextDelay);
        };

        typeNextLetter();
        break;
      }

      case 'pause':
        scheduleNext(currentAction.delay || 0);
        break;

      case 'delete': {
        const count = Number.isFinite(currentAction.count) ? currentAction.count : Number(currentAction.count || 0);
        const trimmedGhost = existingGhostText.slice(0, Math.max(0, existingGhostText.length - Math.max(0, count)));
        dispatchTyping({ type: typingActionTypes.UPDATE_GHOST_TEXT, payload: trimmedGhost });
        scheduleNext(currentAction.delay || 0);
        break;
      }

      case 'retype': {
        const count = Number.isFinite(currentAction.count) ? currentAction.count : Number(currentAction.count || 0);
        const trimmedGhost = existingGhostText.slice(0, Math.max(0, existingGhostText.length - Math.max(0, count)));
        let retypeText = typeof currentAction.text === 'string' ? currentAction.text : '';
        if (shouldPrefixSpace(basePageText, trimmedGhost, retypeText)) {
          retypeText = ` ${retypeText}`;
        }
        dispatchTyping({ type: typingActionTypes.UPDATE_GHOST_TEXT, payload: trimmedGhost + retypeText });
        scheduleNext(currentAction.delay || 0);
        break;
      }

      case 'fade': {
        let fadeText = typeof currentAction.to_text === 'string' ? currentAction.to_text : '';
        const leadDelay = Number.isFinite(currentAction.leadDelay) ? currentAction.leadDelay : 0;
        const explicitDurationMs = Number.isFinite(currentAction.duration_ms)
          ? currentAction.duration_ms
          : Number.isFinite(currentAction.delay)
            ? currentAction.delay * debugSettings.fadeVisualScale
            : null;
        const fadeDurationMs = Number.isFinite(explicitDurationMs)
          ? Math.max(350, Math.round(explicitDurationMs))
          : null;
        if (shouldPrefixSpace(basePageText, '', fadeText)) {
          fadeText = ` ${fadeText}`;
        }

        const startFade = () => {
          dispatchTyping({
            type: typingActionTypes.SET_FADE_STATE,
            payload: {
              isActive: true,
              to_text: fadeText,
              from_text: existingGhostText,
              phase: Number.isFinite(currentAction.phase) ? currentAction.phase : 0,
              duration_ms: fadeDurationMs
            }
          });
          dispatchTyping({ type: typingActionTypes.UPDATE_GHOST_TEXT, payload: fadeText });

          scheduleNext(currentAction.delay || 0);
        };

        if (leadDelay > 0) {
          timeoutId = setTimeout(startFade, leadDelay);
        } else {
          startFade();
        }
        break;
      }

      default:
        scheduleNext(0);
        break;
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    typingState.isProcessingSequence,
    typingState.actionSequence,
    typingState.currentActionIndex,
    typingState.sequenceUserText,
    activeStorytellerPress,
    dispatchTyping,
    dispatchGhostwriter,
    pageText,
    currentPage,
    setPages,
    debugSettings.fadeVisualScale
  ]);


  // --- Ghost Key Typing Simulation ---
  useEffect(() => {
    if (!typingState.typingAllowed) return;

    const interval = setInterval(async () => {
      if (!sessionId) return;

      const fullText = pages[currentPage]?.text || '';
      const addition = fullText.slice(ghostwriterState.lastGeneratedLength);
      const pauseSeconds = (Date.now() - ghostwriterState.lastUserInputTime) / 1000;

      if (ghostwriterState.responseQueued) return;

      // --- Helper to execute ghostwriter takeover with TTS ---
      const triggerGhostwriter = async (additionText, currentFullText) => {
        try {
          dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: true });
          dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: true });

          // 1. TTS reads the user's addition aloud before adding ghost text
          await fetchAndPlayElevenLabsTTS(additionText);

          // 2. Fetch the ghostwriter reply
          const response = await fetchTypewriterReply(currentFullText, sessionId, {
            fadeTimingScale: debugSettings.fadeTimingScale
          });
          const sequenceStarted = applyTypewriterReply(response.data, currentFullText);

          if (!sequenceStarted) {
            dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
            dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
          }
        } catch (error) {
          console.error("Error triggering ghostwriter sequence:", error);
          dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
          dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
        }
      };

      // --- Continuation gating via /api/shouldGenerateContinuation ---
      if (
        !typingState.isProcessingSequence &&
        typingState.inputBuffer.length === 0 && // Not while user is typing or ghostwriting
        addition.trim() &&
        !ghostwriterState.isAwaitingApiReply // Add condition here
      ) {
        dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: true });
        dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: true });
        fetchShouldGenerateContinuation(
          fullText,
          addition,
          pauseSeconds,
          ghostwriterState.lastGhostwriterWordCount // <-- pass this to the API
        )
          .then(shouldGenerateData => {
            // On server, shouldGenerateData.shouldGenerate (no .data)
            const shouldGenerate = shouldGenerateData.shouldGenerate;
            if (shouldGenerate) {
              dispatchGhostwriter({
                type: ghostwriterActionTypes.SET_AWAITING_USER_INPUT_AFTER_SEQUENCE,
                payload: false
              });
              triggerGhostwriter(addition, fullText);
            } else {
              dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
              dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
            }
          })
          .catch(error => {
            console.error("Error fetching shouldGenerateContinuation:", error);
            dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
            dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
          });
      }


    }, GHOSTWRITER_AI_TRIGGER_INTERVAL);

    return () => clearInterval(interval);
  }, [
    pages,
    currentPage,
    typingState.typingAllowed,
    typingState.isProcessingSequence,
    typingState.inputBuffer,
    ghostwriterState.lastUserInputTime,
    ghostwriterState.responseQueued,
    ghostwriterState.lastGeneratedLength,
    ghostwriterState.lastGhostwriterWordCount, // ← ADD to deps!
    ghostwriterState.isAwaitingApiReply, // Add new state to dependency array
    ghostwriterState.awaitingUserInputAfterSequence,
    debugSettings.fadeTimingScale,
    sessionId,
    dispatchTyping,
    dispatchGhostwriter,
    applyTypewriterReply
  ]);




  // --- Commit Ghost Text ---
  const commitGhostText = () => {
    dispatchTyping({ type: typingActionTypes.SEQUENCE_COMPLETE });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
  };

  const takeOverSequenceAtCursor = useCallback(() => {
    if (!typingState.isProcessingSequence) return;

    const frozenGhostText = String(typingState.currentGhostText || '');
    const sequenceSuffix = String(typingState.sequenceUserText || '');
    const frozenText = `${frozenGhostText}${sequenceSuffix}`;

    if (frozenText) {
      setPages(prev => {
        const updatedPages = [...prev];
        const existingPage = updatedPages[currentPage] || { text: '', filmBgUrl: DEFAULT_FILM_BG_URL };
        updatedPages[currentPage] = {
          ...existingPage,
          text: `${existingPage.text || ''}${frozenText}`
        };
        return updatedPages;
      });
    }

    dispatchTyping({ type: typingActionTypes.CANCEL_SEQUENCE });
    setActiveStorytellerPress(null);
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: pageText.length + frozenText.length });
    dispatchGhostwriter({ type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: Date.now() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_AWAITING_USER_INPUT_AFTER_SEQUENCE, payload: false });
  }, [
    typingState.isProcessingSequence,
    typingState.currentGhostText,
    typingState.sequenceUserText,
    currentPage,
    pageText,
    setPages,
    setActiveStorytellerPress,
    dispatchTyping,
    dispatchGhostwriter
  ]);


  // --- Focus on Mount ---
  useEffect(() => {
    containerRef.current?.focus();
  }, []);


  useEffect(() => {
    // Example: lever increases by writing (customize to your story logic)
    const text = pages[currentPage]?.text || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    let newLevel = 0;
    if (words > LEVER_LEVEL_WORD_THRESHOLDS[3]) newLevel = 3;
    else if (words > LEVER_LEVEL_WORD_THRESHOLDS[2]) newLevel = 2;
    else if (words > LEVER_LEVEL_WORD_THRESHOLDS[1]) newLevel = 1;
    else newLevel = LEVER_LEVEL_WORD_THRESHOLDS[0]; // Should be 0
    setLeverLevel(newLevel);
  }, [pages, currentPage]);


  // --- Keyboard Event Handlers for <Keyboard /> component ---
  const handleRegularKeyPress = (keyText) => {
    if (!typingState.typingAllowed) return;
    ensureAmbientStarted();
    if (typingState.isProcessingSequence) {
      takeOverSequenceAtCursor();
    } else if (typingState.currentGhostText) {
      commitGhostText();
    }
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: keyText });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: keyText.toUpperCase() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: Date.now() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    playKeySound();
  };

  const handleXerofagKeyPress = () => {
    if (!typingState.typingAllowed) return;
    ensureAmbientStarted();
    if (typingState.isProcessingSequence) {
      takeOverSequenceAtCursor();
    } else if (typingState.currentGhostText) {
      commitGhostText();
    }
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: SPECIAL_KEY_INSERT_TEXT });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: SPECIAL_KEY_TEXT.toUpperCase() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: Date.now() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    playXerofagHowl();
  };

  const handleSpacebarPress = () => {
    if (!typingState.typingAllowed) return;
    ensureAmbientStarted();
    if (typingState.isProcessingSequence) {
      takeOverSequenceAtCursor();
    } else if (typingState.currentGhostText) {
      commitGhostText();
    }
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: ' ' });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: ' ' });
    dispatchGhostwriter({ type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: Date.now() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    playKeySound();
  };

  const handleStorytellerPress = async (slot) => {
    if (!slot?.filled || !sessionId || !typingState.typingAllowed) return;
    ensureAmbientStarted();
    setActiveStorytellerPress({ slotKey: slot.slotKey });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: true });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: true });
    dispatchGhostwriter({
      type: ghostwriterActionTypes.SET_AWAITING_USER_INPUT_AFTER_SEQUENCE,
      payload: false
    });
    playStorytellerKeyPressSound();

    try {
      const response = await fetchStorytellerTypewriterReply(sessionId, slot.storytellerId, {
        slotIndex: slot.slotIndex,
        fadeTimingScale: debugSettings.fadeTimingScale
      });
      if (response?.error || !response?.data) {
        setActiveStorytellerPress(null);
        dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
        dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
        return;
      }

      if (Array.isArray(response.data.entityKeys)) {
        setStoryEntityKeys((prev) => mergeStoryEntityKeys(prev, response.data.entityKeys));
      } else if (response.data.entityKey) {
        setStoryEntityKeys((prev) => mergeStoryEntityKeys(prev, [response.data.entityKey]));
      }

      const sequenceStarted = applyTypewriterReply(response.data, pageText);

      if (!sequenceStarted) {
        setActiveStorytellerPress(null);
        dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
        dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
      }
    } catch (error) {
      console.error('Error triggering storyteller intervention:', error);
      setActiveStorytellerPress(null);
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_IS_AWAITING_API_REPLY, payload: false });
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    }
  };

  const debugGhostStyle = mergeFontMetadata(lastContinuationInsights?.style, currentFontStyles);
  const storytellerSlotDebugStates = storytellerSlots.map((slot) => getStorytellerSlotDebugState(slot));

  // --- RENDER ---
  return (
    <div
      className="typewriter-container"
      tabIndex="0"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <PageNavigation
        currentPage={currentPage}
        totalPages={pages.length}
        onPrevPage={() => handleHistoryNavigation(currentPage - 1)}
        onNextPage={() => handleHistoryNavigation(currentPage + 1)}
        isSliding={isSliding} // Directly from pageTransitionState
        // Pass relevant styling constants
        PAGE_NAVIGATION_BUTTONS_TOP={PAGE_NAVIGATION_BUTTONS_TOP}
        PAGE_NAVIGATION_BUTTONS_Z_INDEX={PAGE_NAVIGATION_BUTTONS_Z_INDEX}
        PAGE_NAVIGATION_BUTTONS_PADDING={PAGE_NAVIGATION_BUTTONS_PADDING}
        PAGE_NAVIGATION_BUTTON_FONT_SIZE={PAGE_NAVIGATION_BUTTON_FONT_SIZE}
        PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY={PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY}
        PAGE_COUNT_TEXT_COLOR={PAGE_COUNT_TEXT_COLOR}
        PAGE_COUNT_TEXT_FONT_FAMILY={PAGE_COUNT_TEXT_FONT_FAMILY}
        PAGE_COUNT_TEXT_FONT_SIZE={PAGE_COUNT_TEXT_FONT_SIZE}
      />

      <img
        src={GRIT_SHELL_OVERLAY_URL}
        alt="grit shell overlay"
        className="typewriter-overlay"
      />

      <div className="typewriter-session-badge" aria-live="polite">
        <span className="typewriter-session-label">
          {isFreshSession ? 'New session' : 'Session'}
        </span>
        <strong>{sessionId || 'assigning...'}</strong>
      </div>

      <button
        type="button"
        className="typewriter-debug-toggle"
        onClick={() => setDebugSettings((prev) => ({ ...prev, panelOpen: !prev.panelOpen }))}
        aria-expanded={debugSettings.panelOpen}
      >
        Debug
      </button>

      {debugSettings.panelOpen ? (
        <div className="typewriter-debug-panel" aria-live="polite">
          <div className="typewriter-debug-panel-title">Typewriter Debug</div>
          <label className="typewriter-debug-option">
            <input
              type="checkbox"
              checked={debugSettings.showInsightsPanel}
              onChange={(event) => setDebugSettings((prev) => ({
                ...prev,
                showInsightsPanel: event.target.checked
              }))}
            />
            Show insights panel
          </label>
          <label className="typewriter-debug-option">
            <input
              type="checkbox"
              checked={debugSettings.showTimingDetails}
              onChange={(event) => setDebugSettings((prev) => ({
                ...prev,
                showTimingDetails: event.target.checked
              }))}
            />
            Show timing values
          </label>
          <label className="typewriter-debug-option typewriter-debug-slider">
            Fade timing scale
            <input
              type="range"
              min="0.35"
              max="5"
              step="0.05"
              value={debugSettings.fadeTimingScale}
              onChange={(event) => {
                const next = Number(event.target.value);
                setDebugSettings((prev) => ({
                  ...prev,
                  fadeTimingScale: Number.isFinite(next) ? next : prev.fadeTimingScale
                }));
              }}
            />
            <span>x{Number(debugSettings.fadeTimingScale).toFixed(2)}</span>
          </label>
          <label className="typewriter-debug-option typewriter-debug-slider">
            Visual fade scale
            <input
              type="range"
              min="0.4"
              max="3"
              step="0.05"
              value={debugSettings.fadeVisualScale}
              onChange={(event) => {
                const next = Number(event.target.value);
                setDebugSettings((prev) => ({
                  ...prev,
                  fadeVisualScale: Number.isFinite(next) ? next : prev.fadeVisualScale
                }));
              }}
            />
            <span>x{Number(debugSettings.fadeVisualScale).toFixed(2)}</span>
          </label>
          {debugSettings.showTimingDetails || storytellerSlotDebugStates.length ? (
            <div className="typewriter-debug-runtime">
              {debugSettings.showTimingDetails && lastContinuationTiming ? (
                <>
                  <span>Last fade interval {formatTimingWithMs(lastContinuationTiming.fade_interval_ms) || 'n/a'}</span>
                  <span>Last visual fade {formatTimingWithMs(lastContinuationTiming.visual_fade_duration_ms) || 'n/a'}</span>
                  <span>Last total fade {formatTimingWithMs(lastContinuationTiming.estimated_total_duration_ms) || 'n/a'}</span>
                </>
              ) : null}
              {storytellerSlotDebugStates.map((slotState) => (
                <span key={`${slotState.label}-${slotState.status}`}>
                  {slotState.label} {slotState.status}{slotState.storytellerName ? ` (${slotState.storytellerName})` : ''}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {debugSettings.showInsightsPanel && lastContinuationInsights ? (
        <div className="typewriter-continuation-insights" aria-live="polite">
          <div className="typewriter-continuation-insights-head-row">
            <div className="typewriter-continuation-insights-head">Last Ghostwrite</div>
            <button
              type="button"
              className="typewriter-continuation-insights-hide"
              onClick={() => setDebugSettings((prev) => ({
                ...prev,
                showInsightsPanel: false
              }))}
              aria-label="Hide last ghostwrite panel"
            >
              Hide
            </button>
          </div>
          <div className="typewriter-continuation-insights-stats">
            {lastContinuationInsights.continuation_word_count !== null ? (
              <span>Words {lastContinuationInsights.continuation_word_count}</span>
            ) : null}
            {lastContinuationInsights.current_storytelling_points_pool !== null ? (
              <span>Pool {lastContinuationInsights.current_storytelling_points_pool}</span>
            ) : null}
            {lastContinuationInsights.points_earned !== null ? (
              <span>
                Delta {lastContinuationInsights.points_earned >= 0 ? `+${lastContinuationInsights.points_earned}` : lastContinuationInsights.points_earned}
              </span>
            ) : null}
            {debugGhostStyle?.font ? (
              <span>Font {debugGhostStyle.font}</span>
            ) : null}
            {debugGhostStyle?.font_size ? (
              <span>Size {debugGhostStyle.font_size}</span>
            ) : null}
            {debugGhostStyle?.font_color ? (
              <span>Color {debugGhostStyle.font_color}</span>
            ) : null}
            {lastContinuationInsights.entities.length ? (
              <span>Entities {lastContinuationInsights.entities.length}</span>
            ) : null}
            {debugSettings.showTimingDetails && Number.isFinite(lastContinuationTiming?.fade_interval_ms) ? (
              <span>Fade interval {formatTimingWithMs(lastContinuationTiming.fade_interval_ms)}</span>
            ) : null}
            {debugSettings.showTimingDetails && Number.isFinite(lastContinuationTiming?.estimated_total_duration_ms) ? (
              <span>Total fade {formatTimingWithMs(lastContinuationTiming.estimated_total_duration_ms)}</span>
            ) : null}
            {debugSettings.showTimingDetails && Number.isFinite(lastContinuationTiming?.visual_fade_duration_ms) ? (
              <span>Visual fade {formatTimingWithMs(lastContinuationTiming.visual_fade_duration_ms)}</span>
            ) : null}
            {debugSettings.showTimingDetails && Number.isFinite(lastContinuationTiming?.timing_scale) ? (
              <span>Scale x{lastContinuationTiming.timing_scale.toFixed(2)}</span>
            ) : null}
          </div>
          {lastContinuationInsights.contextual_strengthening ? (
            <p className="typewriter-continuation-insights-context">
              {lastContinuationInsights.contextual_strengthening}
            </p>
          ) : null}
          {lastContinuationInsights.meaning.length ? (
            <div className="typewriter-continuation-insights-meaning">
              {lastContinuationInsights.meaning.slice(0, 3).map((line, index) => (
                <span key={`${line}-${index}`}>{line}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <PaperDisplay
        pageText={pageText}
        ghostText={currentGhostText}
        sequenceUserText={sequenceUserText}
        currentFontStyles={currentFontStyles}
        fadeState={typingState.fadeState}
        pageBg={pageBg}
        scrollRef={scrollRef}
        lastLineRef={lastLineRef}
        strikerRef={strikerRef}
        showCursor={showCursor}
        isProcessingSequence={typingState.isProcessingSequence}
        preGhostAtmosphere={preGhostAtmosphere}
        isSliding={isSliding}
        slideX={slideX}
        slideDir={slideDir}
        prevFilmBgUrl={prevFilmBgUrl}
        nextFilmBgUrl={nextFilmBgUrl}
        prevText={prevText}
        nextText={nextText}
        MAX_LINES={MAX_LINES}
        TOP_OFFSET={TOP_OFFSET}
        BOTTOM_PADDING={BOTTOM_PADDING}
        FRAME_HEIGHT={FRAME_HEIGHT}
        FILM_HEIGHT={FILM_HEIGHT}
        scrollAreaHeight={scrollAreaHeight}
        neededHeight={neededHeight}
        SLIDE_DURATION_MS={SLIDE_DURATION_MS}
        SPECIAL_KEY_TEXT={SPECIAL_KEY_TEXT}
        // Pass all necessary animation/style constants used by PaperDisplay and its renderSlideWrapper
        FILM_SLIDE_WRAPPER_WIDTH={FILM_SLIDE_WRAPPER_WIDTH}
        FILM_SLIDE_WRAPPER_Z_INDEX={FILM_SLIDE_WRAPPER_Z_INDEX}
        FILM_BG_SLIDE_OPACITY={FILM_BG_SLIDE_OPACITY}
        FILM_BG_SLIDE_BOX_SHADOW_LEFT={FILM_BG_SLIDE_BOX_SHADOW_LEFT}
        FILM_BG_SLIDE_BOX_SHADOW_RIGHT={FILM_BG_SLIDE_BOX_SHADOW_RIGHT}
        FILM_BG_SLIDE_CONTRAST_OUTGOING={FILM_BG_SLIDE_CONTRAST_OUTGOING}
        FILM_BG_SLIDE_BRIGHTNESS_OUTGOING={FILM_BG_SLIDE_BRIGHTNESS_OUTGOING}
        FILM_BG_SLIDE_CONTRAST_INCOMING={FILM_BG_SLIDE_CONTRAST_INCOMING}
        FILM_BG_SLIDE_BRIGHTNESS_INCOMING={FILM_BG_SLIDE_BRIGHTNESS_INCOMING}
        FILM_FLICKER_OVERLAY_Z_INDEX={FILM_FLICKER_OVERLAY_Z_INDEX}
        FILM_FLICKER_OVERLAY_TEXTURE_URL={FILM_FLICKER_OVERLAY_TEXTURE_URL}
        FILM_FLICKER_OVERLAY_GRADIENT={FILM_FLICKER_OVERLAY_GRADIENT}
        FILM_FLICKER_OVERLAY_OPACITY={FILM_FLICKER_OVERLAY_OPACITY}
        FILM_FLICKER_OVERLAY_BLEND_MODE={FILM_FLICKER_OVERLAY_BLEND_MODE}
        FILM_FLICKER_OVERLAY_ANIMATION={FILM_FLICKER_OVERLAY_ANIMATION}
        FILM_BACKGROUND_Z_INDEX={FILM_BACKGROUND_Z_INDEX}
        FILM_BACKGROUND_OPACITY={FILM_BACKGROUND_OPACITY}
        TYPEWRITER_TEXT_Z_INDEX={TYPEWRITER_TEXT_Z_INDEX}
        STRIKER_CURSOR_OFFSET_LEFT={STRIKER_CURSOR_OFFSET_LEFT}
        SLIDE_DIRECTION_LEFT={SLIDE_DIRECTION_LEFT}
      />

      <div className="storyteller-sigil">
        <img
          src={SIGIL_IMAGE_URL}
          alt="Storyteller's Society Sigil"
        />
      </div>

      {storyEntityKeys.length > 0 ? (
        <div className="story-entity-key-rail" aria-label="Story entities">
          {storyEntityKeys.map((entityKey, index) => (
            <div
              key={entityKey.id || `${entityKey.keyText}-${index}`}
              className="story-entity-key-chip"
              title={entityKey.summary || entityKey.entityName}
            >
              <span className="story-entity-key-label">{entityKey.keyText}</span>
              <span className="story-entity-key-name">{entityKey.entityName}</span>
            </div>
          ))}
        </div>
      ) : null}

      <Keyboard
        keys={keys}
        keyTextures={displayedKeyTextures}
        storytellerSlots={storytellerSlots}
        lastPressedKey={lastPressedKey}
        pressedStorytellerKey={activeStorytellerPress?.slotKey || null}
        ghostPressedKey={ghostPressedKey}
        typingAllowed={typingAllowed}
        onKeyPress={handleRegularKeyPress}
        onStorytellerPress={handleStorytellerPress}
        onXerofagPress={handleXerofagKeyPress}
        onSpacebarPress={handleSpacebarPress}
        playEndOfPageSound={playEndOfPageSound} // Pass the function directly
        // playKeySound and playXerofagHowl are called within the handlers above
        // Props for styling randomization, if Keyboard component uses them:
        KEY_TILT_RANDOM_MAX={KEY_TILT_RANDOM_MAX}
        KEY_TILT_RANDOM_MIN={KEY_TILT_RANDOM_MIN}
        KEY_OFFSET_Y_RANDOM_MAX={KEY_OFFSET_Y_RANDOM_MAX}
        KEY_OFFSET_Y_RANDOM_MIN={KEY_OFFSET_Y_RANDOM_MIN}
        SPECIAL_KEY_TEXT={SPECIAL_KEY_TEXT}
      />

      <div
        className="turn-page-lever-float"
        style={{
          position: 'absolute',
          bottom: TURN_PAGE_LEVER_BOTTOM,
          left: TURN_PAGE_LEVER_LEFT,
          zIndex: TURN_PAGE_LEVER_Z_INDEX,
          pointerEvents: 'auto', // so user can click/tap lever!
        }}
      >
        <TurnPageLever
          level={leverLevel}
          canPull={canPullTurnPageLever}
          disabled={pageChangeInProgress}
          onPull={() => {
            setLeverLevel(0);
            handlePageTurnScroll();
          }}
        />
      </div>
      <OrreryComponent />

    </div>
  );
};

export default TypewriterFramework;

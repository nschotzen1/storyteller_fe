import React, { useState, useEffect, useRef, useReducer } from 'react';
import './TypeWriter.css';
import TurnPageLever from './TurnPageLever.jsx';
import Keyboard from './components/typewriter/Keyboard.jsx';
import PaperDisplay from './components/typewriter/PaperDisplay.jsx';
import PageNavigation from './components/typewriter/PageNavigation.jsx'; // Import the new PageNavigation component
import OrreryComponent from './OrreryComponent.jsx';
import { getRandomTexture, playKeySound, playEnterSound, playXerofagHowl, playEndOfPageSound, countLines, playGhostWriterSound } from './utils.js';
import { fetchNextFilmImage, fetchTypewriterReply, fetchShouldGenerateContinuation } from './apiService.js';

// --- Constants ---
const FILM_HEIGHT = 1400;
const LINE_HEIGHT = 2.4 * 16; // Roughly 38.4
const TOP_OFFSET = 180;
const BOTTOM_PADDING = 220;
const FRAME_HEIGHT = 600; // Increased from 520
const MAX_LINES = Math.floor((FILM_HEIGHT - TOP_OFFSET - BOTTOM_PADDING) / LINE_HEIGHT);

// Default values
const DEFAULT_FILM_BG_URL = '/textures/decor/film_frame_desert.png';
const INITIAL_SCROLL_MODE = 'cinematic';
const NORMAL_SCROLL_MODE = 'normal';
const SLIDE_DIRECTION_LEFT = 'left';
const SLIDE_DIRECTION_RIGHT = 'right';
const SESSION_ID_STORAGE_KEY = 'sessionId';

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
const GHOST_KEY_TYPING_INTERVAL = 90; // ms
const GHOSTWRITER_AI_TRIGGER_INTERVAL = 1000; // ms
const SLIDE_DURATION_MS_ALREADY_DEFINED = 1200; // Already defined as SLIDE_DURATION_MS, kept for reference

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

};

const initialGhostwriterState = {
  lastUserInputTime: Date.now(),
  responseQueued: false,
  lastGeneratedLength: 0,
  lastGhostwriterWordCount: 0, // NEW: Track last ghostwriter addition size

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
  currentGhostText: [],
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
        isProcessingSequence: false,
        fadeState: { isActive: false, to_text: '', phase: 0 },
      };
    case typingActionTypes.HANDLE_BACKSPACE:
      if (state.inputBuffer.length === 0) { // If input buffer is empty
        if (state.isProcessingSequence) {
          // Dispatch CANCEL_SEQUENCE or handle directly
          // For direct handling here:
          return {
            ...state,
            actionSequence: [],
            currentActionIndex: 0,
            currentGhostText: '', // Clear ghost text on cancel
            isProcessingSequence: false,
            fadeState: { isActive: false, to_text: '', phase: 0 },
            requestPageTextUpdate: false, // No page text update from cancelling a sequence this way
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
        isProcessingSequence: true,
        fadeState: { isActive: false, to_text: '', phase: 0 },
        inputBuffer: '', // Clear input buffer when a new sequence starts
      };
    case typingActionTypes.PROCESS_NEXT_ACTION:
      return {
        ...state,
        currentActionIndex: state.currentActionIndex + 1,
      };
    case typingActionTypes.UPDATE_GHOST_TEXT:
      return {
        ...state,
        currentGhostText: action.payload,
      };
    case typingActionTypes.SET_FADE_STATE:
      return {
        ...state,
        fadeState: action.payload,
      };
    case typingActionTypes.SEQUENCE_COMPLETE:
    case typingActionTypes.CANCEL_SEQUENCE:
      // Both can share the same logic for now
      return {
        ...state,
        actionSequence: [],
        currentActionIndex: 0,
        currentGhostText: '', // Ensure ghost text is cleared on sequence completion/cancellation
        isProcessingSequence: false,
        fadeState: { isActive: false, to_text: '', phase: 0 },
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


const keys = [
  'Q','W','E','R','T','Y','U','I','O','P',
  'A','S','D','F','G','H','J','K','L',
  'Z','X','C','V','B','N','M','THE XEROFAG'
];

const TypewriterFramework = () => {
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
    isProcessingSequence,
    fadeState,
  } = typingState;

  const [ghostwriterState, dispatchGhostwriter] = useReducer(ghostwriterReducer, initialGhostwriterState);
  const {
    lastUserInputTime,
    responseQueued,
    lastGeneratedLength,
  } = ghostwriterState;


  // --- Page History State (Still useState as per instructions) ---
  const [pages, setPages] = useState([
    { text: '', filmBgUrl: DEFAULT_FILM_BG_URL }
  ]);
  const [currentPage, setCurrentPage] = useState(0);

  // --- Other State ---
  const [keyTextures, setKeyTextures] = useState(keys.map(getRandomTexture)); // UI specific, might remain useState
  // lastUserInputTime, responseQueued, lastGeneratedLength are now in ghostwriterState
  // Level: 0 = empty, 3 = full (ready for page turn)
  const [leverLevel, setLeverLevel] = useState(0);
  const [currentFontStyles, setCurrentFontStyles] = useState(null);



  const SLIDE_DURATION_MS = 1200;

  // --- Refs ---
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const lastLineRef = useRef(null);
  const strikerRef = useRef(null);

  const [sessionId] = useState(() => {
    const stored = localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem(SESSION_ID_STORAGE_KEY, newId);
    return newId;
  });

  // --- Derived ---
  const { text: pageText, filmBgUrl: pageBg } = pages[currentPage] || {};
  // Ghost text is now derived from typingState.responses
  const ghostText = typingState.currentGhostText;
  const visibleLineCount = Math.min(countLines(pageText, ghostText), MAX_LINES);
  const neededHeight = TOP_OFFSET + visibleLineCount * LINE_HEIGHT + NEEDED_HEIGHT_OFFSET;
  const scrollAreaHeight = Math.max(FRAME_HEIGHT, neededHeight);

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
    if (!scrollRef.current || !lastLineRef.current) return;
    if (pageTransitionState.scrollMode === NORMAL_SCROLL_MODE) {
      requestAnimationFrame(() => {
        lastLineRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [pageText, ghostText, pageTransitionState.scrollMode]);

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
          fetchNextFilmImage(pageText + ghostText, sessionId).then(data => {
            const newUrl = data?.data.image_url || null;
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
      playEndOfPageSound();
      return;
    }
    const char = e.key === "Enter" ? '\n' : e.key;
    // Use typingState.inputBuffer and typingState.currentGhostText for currentLines calculation
    
    const ghostTextString = Array.isArray(ghostText)
    ? ghostText.map(g => g.char).join('')
    : (ghostText || '');
    const fullCombinedText = pageText + ghostTextString;
    const currentLines = fullCombinedText.split('\n');

    if (currentLines >= MAX_LINES && e.key !== 'Backspace') {
      handlePageTurnScroll();
      return;
    }
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: e.key.toUpperCase() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: Date.now() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });

    if (e.key.length === 1 || e.key === "Enter") {
      e.preventDefault();
      if (typingState.isProcessingSequence || typingState.currentGhostText) {
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
      setPages(prev => {
        const updatedPages = [...prev];
        updatedPages[currentPage] = {
          ...updatedPages[currentPage],
          text: updatedPages[currentPage].text + charToCommit
        };
        return updatedPages;
      });
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
  }, [typingState.inputBuffer, typingState.typingAllowed, currentPage, setPages]); // Added setPages to dependencies

  // --- Key Visual State ---
  useEffect(() => {
    if (!typingState.lastPressedKey) return;
    const timeout = setTimeout(() => dispatchTyping({ type: typingActionTypes.CLEAR_LAST_PRESSED_KEY }), LAST_PRESSED_KEY_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [typingState.lastPressedKey]);

  // --- Key Texture Refresh ---
  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * keyTextures.length);
      setKeyTextures(prev => {
        const updated = [...prev];
        const key = keys[idx];
        updated[idx] = getRandomTexture(key);
        return updated;
      });
    }, KEY_TEXTURE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [keyTextures]);

  // --- Action Sequence Processing ---
  useEffect(() => {
    let timeoutId;

    if (typingState.isProcessingSequence && typingState.currentActionIndex < typingState.actionSequence.length) {
      const currentAction = typingState.actionSequence[typingState.currentActionIndex];

      // Refined Fade Deactivation Logic: Part 1
      // If fade was active and current action is not a fade, deactivate fade first.
      if (typingState.fadeState.isActive && currentAction.action !== 'fade') {
        dispatchTyping({ type: typingActionTypes.SET_FADE_STATE, payload: { isActive: false, to_text: '', phase: 0 } });
      }

      switch (currentAction.action) {
       case 'type': {
          if (typeof currentAction.text !== "string") {
            console.error("Type action missing 'text':", currentAction);
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
            break;
          }

          const textToAdd = currentAction.text;
          let letterIdx = 0;
          let ghostText = Array.isArray(typingState.currentGhostText)
            ? [...typingState.currentGhostText]
            : [];

          function typeNextLetter() {
            if (letterIdx < textToAdd.length) {
              ghostText = [
                ...ghostText,
                {
                  char: textToAdd[letterIdx],
                  ghost: true,
                  key: `${Date.now()}_${Math.random()}_${letterIdx}`,
                  justAppeared: true  // Only new letter animates
                }
              ];
              console.log("Typing letter:", textToAdd[letterIdx], "at index:", letterIdx);
              letterIdx % 5 == 0 && playGhostWriterSound && playGhostWriterSound();
              dispatchTyping({
                type: typingActionTypes.UPDATE_GHOST_TEXT,
                payload: ghostText,
              });

              // Clear animation class after it's played
              setTimeout(() => {
                ghostText = ghostText.map((g, idx) =>
                  idx === ghostText.length - 1 ? { ...g, justAppeared: false } : g
                );
                dispatchTyping({
                  type: typingActionTypes.UPDATE_GHOST_TEXT,
                  payload: ghostText,
                });
              }, 420); // Match to your animation duration

              // --- Rhythm logic for spooky effect ---
              let delay;
              const char = textToAdd[letterIdx];

              if (Math.random() < 0.15) delay = 35 + Math.random() * 25;
              else if (/[.,;:!? ]/.test(char) && Math.random() < 0.33) delay = 350 + Math.random() * 500;
              else if (letterIdx > 0 && letterIdx % (5 + Math.floor(Math.random() * 4)) === 0 && Math.random() < 0.4) delay = 200 + Math.random() * 400;
              else delay = 80 + Math.random() * 110;

              letterIdx++;
              timeoutId = setTimeout(typeNextLetter, delay);
            } else {
              timeoutId = setTimeout(() => {
                dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
              }, currentAction.delay || 0);
            }
          }



          typeNextLetter();
          break;
        }



        case 'pause':
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, currentAction.delay);
          break;
        case 'delete':
          const newGhostTextDelete = typingState.currentGhostText.slice(0, -currentAction.count);
          dispatchTyping({ type: typingActionTypes.UPDATE_GHOST_TEXT, payload: newGhostTextDelete });
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, currentAction.delay);
          break;
        case 'fade':
          dispatchTyping({
            type: typingActionTypes.SET_FADE_STATE,
            payload: {
              isActive: true,
              prev_text: typingState.currentGhostText || (pages[currentPage]?.text || ""),
              to_text: currentAction.to_text,
              phase: currentAction.phase
            }
          });
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, currentAction.delay);
          break;
        case 'retype':
          // Ensure action.count and action.text are available from the sequence object
          if (typeof currentAction.count === 'number' && typeof currentAction.text === 'string') {
            dispatchTyping({
              type: typingActionTypes.RETYPE_ACTION,
              payload: { count: currentAction.count, text: currentAction.text }
            });
            timeoutId = setTimeout(() => {
              dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
            }, currentAction.delay);
          } else {
            // If data is malformed, log an error and proceed to next action without delay
            console.error("Malformed 'retype' action in sequence:", currentAction);
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }
          break;
        default:
          // Unknown action, proceed to next
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, 0);
          break;
      }
    } else if (typingState.isProcessingSequence && typingState.currentActionIndex >= typingState.actionSequence.length) {
      // All actions processed, sequence is naturally completing.
      const finalGhostTextOfSequence = Array.isArray(typingState.currentGhostText)
      ? typingState.currentGhostText.map(x => x.char).join('')
      : typingState.currentGhostText;

      const currentPageText = pages[currentPage]?.text || ''; // pages and currentPage are now dependencies
      
      if (finalGhostTextOfSequence) {
  const textToCommit = currentPageText + finalGhostTextOfSequence;
  const textToCommitLines = textToCommit.split('\n').length;
  const newTextForPage =
    textToCommitLines > MAX_LINES
      ? textToCommit.split('\n').slice(0, MAX_LINES).join('\n')
      : textToCommit;

  setPages(prev => {
    const updatedPages = [...prev];
    updatedPages[currentPage] = {
      ...updatedPages[currentPage],
      text: newTextForPage
    };
    return updatedPages;
  });
  dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: newTextForPage.length });
  // ---- PATCH: Track last ghostwriter addition (in words) ----
  const ghostwriterWords = finalGhostTextOfSequence.trim().split(/\s+/).filter(Boolean).length;
  dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GHOSTWRITER_WORD_COUNT, payload: ghostwriterWords });
} else {
  dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: currentPageText.length });
  dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GHOSTWRITER_WORD_COUNT, payload: 0 });
}

      
      dispatchTyping({ type: typingActionTypes.SEQUENCE_COMPLETE }); 
      if (typingState.fadeState.isActive) {
        dispatchTyping({ type: typingActionTypes.SET_FADE_STATE, payload: { isActive: false, to_text: '', phase: 0 } });
      }
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    typingState.isProcessingSequence, 
    typingState.actionSequence, 
    typingState.currentActionIndex, 
    typingState.fadeState.isActive, 
    // typingState.currentGhostText, // Removed as per instruction
    dispatchTyping, 
    dispatchGhostwriter, 
    pages, 
    currentPage, 
    setPages 
  ]);


  // --- Ghost Key Typing Simulation ---
 useEffect(() => {
  if (!typingState.typingAllowed) return;

  const interval = setInterval(async () => {
    const fullText = pages[currentPage]?.text || '';
    const addition = fullText.slice(ghostwriterState.lastGeneratedLength);
    const pauseSeconds = (Date.now() - ghostwriterState.lastUserInputTime) / 1000;

    if (ghostwriterState.responseQueued) return;

    // --- INACTIVITY COMPLETION: leave as-is if you want this ---
    if (
      pauseSeconds >= 15 &&
      !typingState.isProcessingSequence &&
      typingState.inputBuffer.length === 0 &&
      (fullText.length === ghostwriterState.lastGeneratedLength || ghostwriterState.lastGeneratedLength === 0)
    ) {
      // (optional: you can disable this block if you never want inactivity autocompletion)
      fetchTypewriterReply(fullText, sessionId).then(response => {
        const reply = response.data;
        if (reply && reply.writing_sequence && reply.metadata) {
          setCurrentFontStyles(reply.metadata);
          dispatchTyping({ type: typingActionTypes.START_NEW_SEQUENCE, payload: reply.writing_sequence });
          dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: fullText.length });
          dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: true });
        }
      }).catch(error => {
        console.error("Error fetching typewriter reply due to inactivity:", error);
      });
      return;
    }

    // --- USER-initiated continuation with GOLDEN RATIO THRESHOLD ---
   if (
  !typingState.isProcessingSequence &&
  typingState.inputBuffer.length === 0 // Not while user is typing or ghostwriting
) {
  fetchShouldGenerateContinuation(
    fullText,
    addition,
    pauseSeconds,
    ghostwriterState.lastGhostwriterWordCount // <-- pass this to the API
  )
    .then(shouldGenerateData => {
      // On server, shouldGenerateData.shouldGenerate (no .data)
      const shouldGenerate = shouldGenerateData.shouldGenerate;
      // DEBUG: log API-side threshold handling
      console.log(
        `[ghostwriter trigger] Server response: shouldGenerate=${shouldGenerate}, userAdditionLen=${addition.trim().split(/\s+/).length}, lastGhostwriterWordCount=${ghostwriterState.lastGhostwriterWordCount}`
      );
      if (shouldGenerate) {
        fetchTypewriterReply(fullText, sessionId).then(response => {
          const reply = response.data;
          if (reply && reply.writing_sequence && reply.metadata) {
            setCurrentFontStyles(reply.metadata);
            dispatchTyping({ type: typingActionTypes.START_NEW_SEQUENCE, payload: reply.writing_sequence });
            dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: fullText.length });
            dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: true });
            // lastGhostwriterWordCount will be set after sequence commits
          }
        }).catch(error => {
          console.error("Error fetching typewriter reply after shouldGenerate check:", error);
        });
      }
    })
    .catch(error => {
      console.error("Error fetching shouldGenerateContinuation:", error);
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
  sessionId,
  dispatchTyping,
  dispatchGhostwriter,
  setCurrentFontStyles
]);

 


  // --- Commit Ghost Text ---
  const commitGhostText = () => {
  // Get ghost text from typingState.currentGhostText
  const fullGhostText = Array.isArray(typingState.currentGhostText)
    ? typingState.currentGhostText.map(g => g.char).join('')
    : (typingState.currentGhostText || '');
  // Modified guard clause as per instructions
  if (!fullGhostText && !typingState.isProcessingSequence) {
      // If no ghost text and not processing, ensure responseQueued is false.
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
      return;
  }

  const currentText = pages[currentPage]?.text || ''; // Get current page text
  const mergedText = currentText + fullGhostText; // Merged text
  const mergedLines = mergedText.split('\n').length;
  const newTextForPage =
    mergedLines > MAX_LINES
      ? mergedText.split('\n').slice(0, MAX_LINES).join('\n')
      : mergedText;

  setPages(prev => {
    const updatedPages = [...prev];
    updatedPages[currentPage] = {
      ...updatedPages[currentPage],
      text: newTextForPage // Use the potentially truncated newTextForPage
    };
    return updatedPages;
  });

  // Update lastGeneratedLength to the length of the fully committed text
  dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: newTextForPage.length });
  
  dispatchTyping({ type: typingActionTypes.SEQUENCE_COMPLETE });
  dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
};


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
    // If there's an active sequence or ghost text, commit it first
    if (typingState.isProcessingSequence || typingState.currentGhostText) {
      commitGhostText();
    }
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: keyText });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: keyText.toUpperCase() });
    playKeySound();
  };

  const handleXerofagKeyPress = () => {
    if (typingState.isProcessingSequence || typingState.currentGhostText) {
      commitGhostText();
    }
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: SPECIAL_KEY_INSERT_TEXT });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: SPECIAL_KEY_TEXT.toUpperCase() });
    playXerofagHowl();
  };

  const handleSpacebarPress = () => {
    if (typingState.isProcessingSequence || typingState.currentGhostText) {
      commitGhostText();
    }
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: ' ' });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: ' ' });
    playKeySound();
  };

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

      <PaperDisplay
        pageText={pageText}
        ghostText={ghostText}
        currentFontStyles={currentFontStyles}
        fadeState={typingState.fadeState}
        pageBg={pageBg}
        scrollRef={scrollRef}
        lastLineRef={lastLineRef}
        strikerRef={strikerRef}
        showCursor={showCursor}
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

      <Keyboard
        keys={keys}
        keyTextures={keyTextures}
        lastPressedKey={lastPressedKey}
        typingAllowed={typingAllowed}
        onKeyPress={handleRegularKeyPress}
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
    canPull={leverLevel === LEVER_LEVEL_WORD_THRESHOLDS.length -1 && !pageChangeInProgress && typingAllowed}
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

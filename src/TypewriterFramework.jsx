import React, { useState, useEffect, useRef, useReducer } from 'react';
import './TypeWriter.css';
import TurnPageLever from './TurnPageLever.jsx';
import Keyboard from './components/typewriter/Keyboard.jsx';
import PaperDisplay from './components/typewriter/PaperDisplay.jsx';
import PageNavigation from './components/typewriter/PageNavigation.jsx'; // Import the new PageNavigation component
import { getRandomTexture, playKeySound, playEnterSound, playXerofagHowl, playEndOfPageSound, countLines } from './utils.js';
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
const WORD_EROSION_INTERVAL_MS = 200; // Time between starting erosion of one word and the next
const WORD_ERASE_DELAY_MS = 1600; // Time from when a word starts eroding until it's erased (CSS animation is 1.5s)


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
const GHOSTWRITER_MIN_WORDS_TRIGGER = 3;
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
};

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
      return { ...state, pageChangeInProgress: true };
    case pageTransitionActionTypes.PREPARE_SLIDE:
      return {
        ...state,
        slideDir: action.payload.slideDir,
        prevFilmBgUrl: action.payload.prevFilmBgUrl,
        prevText: action.payload.prevText,
        nextFilmBgUrl: action.payload.nextFilmBgUrl,
        nextText: action.payload.nextText,
        isSliding: true,
        slideX: 0, 
      };
    case pageTransitionActionTypes.START_SLIDE_ANIMATION:
      return { ...state, slideX: action.payload.slideX };
    case pageTransitionActionTypes.FINISH_SLIDE_ANIMATION:
      return {
        ...state,
        isSliding: false,
        pageChangeInProgress: false,
        scrollMode: action.payload.newScrollMode || INITIAL_SCROLL_MODE,
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
      return { ...state, scrollMode: action.payload.scrollMode };
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
};

const initialGhostwriterState = {
  lastUserInputTime: Date.now(),
  responseQueued: false,
  lastGeneratedLength: 0,
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
    default:
      return state;
  }
}

// --- Typing Reducer ---
const typingActionTypes = {
  SET_TYPING_ALLOWED: 'SET_TYPING_ALLOWED',
  SET_SHOW_CURSOR: 'SET_SHOW_CURSOR',
  ADD_TO_INPUT_BUFFER: 'ADD_TO_INPUT_BUFFER',
  CONSUME_INPUT_BUFFER: 'CONSUME_INPUT_BUFFER', 
  SET_LAST_PRESSED_KEY: 'SET_LAST_PRESSED_KEY',
  CLEAR_LAST_PRESSED_KEY: 'CLEAR_LAST_PRESSED_KEY',
  ADD_RESPONSE: 'ADD_RESPONSE', 
  UPDATE_LAST_RESPONSE_CONTENT: 'UPDATE_LAST_RESPONSE_CONTENT', 
  CLEAR_RESPONSES: 'CLEAR_RESPONSES',
  SET_GHOST_KEY_QUEUE: 'SET_GHOST_KEY_QUEUE', 
  CONSUME_GHOST_KEY_QUEUE: 'CONSUME_GHOST_KEY_QUEUE', 
  RESET_TYPING_STATE_FOR_NEW_PAGE: 'RESET_TYPING_STATE_FOR_NEW_PAGE', 
  HANDLE_BACKSPACE: 'HANDLE_BACKSPACE',
  RESET_PAGE_TEXT_UPDATE_REQUEST: 'RESET_PAGE_TEXT_UPDATE_REQUEST',
  PREPARE_GHOST_WORDS_FOR_EROSION: 'PREPARE_GHOST_WORDS_FOR_EROSION',
  SET_GHOST_WORD_ERODING: 'SET_GHOST_WORD_ERODING',
  SET_GHOST_WORD_ERASED: 'SET_GHOST_WORD_ERASED',
  RESET_EROSION_STATE: 'RESET_EROSION_STATE',
};

const initialTypingState = {
  inputBuffer: '',
  typingAllowed: true,
  lastPressedKey: null,
  responses: [], 
  ghostKeyQueue: [],
  showCursor: true,
  requestPageTextUpdate: false, 
  ghostWords: [], 
  isGhostTextStable: false,
  displayableGhostText: '',
};

// Helper to build displayableGhostText from ghostWords
const buildDisplayableGhostText = (ghostWords) => {
  return ghostWords.map(word => {
    if (word.status === 'eroding') {
      return `<span class="word-eroding-fadeout">${word.text}</span>`;
    }
    if (word.status === 'visible') {
      return word.text;
    }
    return ''; // Erased words contribute nothing
  }).filter(Boolean).join(' '); // Filter out empty strings from erased words and join
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
    case typingActionTypes.ADD_RESPONSE:
      return { ...state, responses: [...state.responses, action.payload], requestPageTextUpdate: false };
    case typingActionTypes.UPDATE_LAST_RESPONSE_CONTENT:
      if (state.responses.length === 0) return { ...state, requestPageTextUpdate: false };
      const updatedResponses = state.responses.map((res, index) =>
        index === state.responses.length - 1
          ? { ...res, content: res.content + action.payload }
          : res
      );
      return { ...state, responses: updatedResponses, requestPageTextUpdate: false };
    case typingActionTypes.CLEAR_RESPONSES:
      return { 
        ...state, 
        responses: [], 
        requestPageTextUpdate: false,
        ghostWords: [],
        isGhostTextStable: false,
        displayableGhostText: ''
      };
    case typingActionTypes.SET_GHOST_KEY_QUEUE:
      return { ...state, ghostKeyQueue: action.payload, requestPageTextUpdate: false };
    case typingActionTypes.CONSUME_GHOST_KEY_QUEUE:
      return { ...state, ghostKeyQueue: state.ghostKeyQueue.slice(1), requestPageTextUpdate: false };
    case typingActionTypes.RESET_TYPING_STATE_FOR_NEW_PAGE:
      return {
        ...state,
        responses: [],
        ghostKeyQueue: [],
        inputBuffer: '', 
        requestPageTextUpdate: false,
        ghostWords: [],
        isGhostTextStable: false,
        displayableGhostText: ''
      };
    case typingActionTypes.HANDLE_BACKSPACE:
      if (state.inputBuffer.length > 0) {
        return { ...state, inputBuffer: state.inputBuffer.slice(0, -1), requestPageTextUpdate: false };
      }
      if (state.responses.length > 0) {
        return { 
          ...state, 
          responses: [], 
          ghostKeyQueue: [], 
          requestPageTextUpdate: false,
          ghostWords: [],
          isGhostTextStable: false,
          displayableGhostText: ''
        };
      }
      return { ...state, requestPageTextUpdate: true };
    case typingActionTypes.RESET_PAGE_TEXT_UPDATE_REQUEST:
      return { ...state, requestPageTextUpdate: false };
    case typingActionTypes.PREPARE_GHOST_WORDS_FOR_EROSION:
      const words = action.payload.split(' ').filter(word => word.length > 0);
      const newGhostWords = words.map((word, index) => ({
        text: word,
        status: 'visible',
        id: `${Date.now()}-${index}` 
      }));
      return {
        ...state,
        ghostWords: newGhostWords,
        isGhostTextStable: true,
        displayableGhostText: buildDisplayableGhostText(newGhostWords)
      };
    case typingActionTypes.SET_GHOST_WORD_ERODING:
      const erodingWords = state.ghostWords.map(gw =>
        gw.id === action.payload.wordId ? { ...gw, status: 'eroding' } : gw
      );
      return {
        ...state,
        ghostWords: erodingWords,
        displayableGhostText: buildDisplayableGhostText(erodingWords)
      };
    case typingActionTypes.SET_GHOST_WORD_ERASED:
      const erasedWords = state.ghostWords.map(gw =>
        gw.id === action.payload.wordId ? { ...gw, status: 'erased' } : gw
      );
      return {
        ...state,
        ghostWords: erasedWords,
        displayableGhostText: buildDisplayableGhostText(erasedWords)
      };
    case typingActionTypes.RESET_EROSION_STATE:
      return {
        ...state,
        ghostWords: [],
        isGhostTextStable: false,
        displayableGhostText: ''
      };
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
  const [pageTransitionState, dispatchPageTransition] = useReducer(pageTransitionReducer, initialPageTransitionState);
  const {
    scrollMode, 
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
    responses,
    ghostKeyQueue,
    showCursor,
    ghostWords,
    isGhostTextStable,
    displayableGhostText,
  } = typingState;

  const [ghostwriterState, dispatchGhostwriter] = useReducer(ghostwriterReducer, initialGhostwriterState);
  const {
    lastUserInputTime,
    responseQueued,
    lastGeneratedLength,
  } = ghostwriterState;

  const [pages, setPages] = useState([{ text: '', filmBgUrl: DEFAULT_FILM_BG_URL }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [keyTextures, setKeyTextures] = useState(keys.map(getRandomTexture)); 
  const [leverLevel, setLeverLevel] = useState(0);
  const SLIDE_DURATION_MS = 1200;

  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const lastLineRef = useRef(null);
  const strikerRef = useRef(null);
  const erosionTimeoutRef = useRef(null); 

  const [sessionId] = useState(() => {
    const stored = localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem(SESSION_ID_STORAGE_KEY, newId);
    return newId;
  });

  const { text: pageText, filmBgUrl: pageBg } = pages[currentPage] || {};
  const ghostTextForDisplay = isGhostTextStable 
    ? displayableGhostText 
    : (responses.length > 0 ? responses[responses.length - 1]?.content || '' : '');
  
  const visibleLineCount = Math.min(countLines(pageText, ghostTextForDisplay), MAX_LINES);
  const neededHeight = TOP_OFFSET + visibleLineCount * LINE_HEIGHT + NEEDED_HEIGHT_OFFSET;
  const scrollAreaHeight = Math.max(FRAME_HEIGHT, neededHeight);

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
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      ref.current.scrollTop = start + change * ease;
      if (progress < 1) requestAnimationFrame(animateScroll);
    }
    requestAnimationFrame(animateScroll);
  }

  useEffect(() => {
    if (!scrollRef.current || !lastLineRef.current) return;
    if (pageTransitionState.scrollMode === NORMAL_SCROLL_MODE) {
      requestAnimationFrame(() => {
        lastLineRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [pageText, ghostTextForDisplay, responses, pageTransitionState.scrollMode]); 

  const handlePageTurnScroll = async () => {
    if (pageChangeInProgress) return;
    dispatchPageTransition({ type: pageTransitionActionTypes.START_PAGE_TURN_SCROLL });
    dispatchTyping({ type: typingActionTypes.SET_TYPING_ALLOWED, payload: false });
    dispatchTyping({ type: typingActionTypes.SET_SHOW_CURSOR, payload: false });
    playEndOfPageSound();
    if (scrollRef.current) {
      const start = scrollRef.current.scrollTop;
      const duration = PAGE_TURN_SCROLL_ANIMATION_DURATION;
      const startTime = performance.now();
      function animateScroll(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); 
        scrollRef.current.scrollTop = start - start * ease;
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          scrollRef.current.scrollTop = 0;
          fetchNextFilmImage(pageText + ghostTextForDisplay, sessionId).then(data => { 
            const newUrl = data?.data.image_url || null;
            const newFilm = newUrl || DEFAULT_FILM_BG_URL;
            dispatchPageTransition({
              type: pageTransitionActionTypes.PREPARE_SLIDE,
              payload: { slideDir: SLIDE_DIRECTION_LEFT, prevFilmBgUrl: pageBg, prevText: pageText, nextFilmBgUrl: newFilm, nextText: '' }
            });
            setPages(prev => [...prev.slice(0, currentPage + 1),{ text: '', filmBgUrl: newFilm }]);
            setCurrentPage(prev => prev + 1);
            requestAnimationFrame(() => {
              dispatchPageTransition({ type: pageTransitionActionTypes.START_SLIDE_ANIMATION, payload: { slideX: PAGE_SLIDE_X_OFFSET } });
            });
            setTimeout(() => {
              dispatchPageTransition({ type: pageTransitionActionTypes.FINISH_SLIDE_ANIMATION, payload: { newScrollMode: INITIAL_SCROLL_MODE } });
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

  const handleHistoryNavigation = (targetIdx) => {
    if (pageChangeInProgress || isSliding) return;
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
      dispatchPageTransition({ type: pageTransitionActionTypes.START_SLIDE_ANIMATION, payload: { slideX: toNext ? PAGE_SLIDE_X_OFFSET : -PAGE_SLIDE_X_OFFSET } });
    });
    setTimeout(() => {
      setCurrentPage(targetIdx); 
      dispatchPageTransition({ type: pageTransitionActionTypes.FINISH_SLIDE_ANIMATION, payload: { newScrollMode: INITIAL_SCROLL_MODE } });
      dispatchTyping({ type: typingActionTypes.SET_TYPING_ALLOWED, payload: (targetIdx === pages.length - 1) });
      dispatchTyping({ type: typingActionTypes.SET_SHOW_CURSOR, payload: true });
      dispatchTyping({ type: typingActionTypes.RESET_TYPING_STATE_FOR_NEW_PAGE });
      dispatchGhostwriter({ type: ghostwriterActionTypes.RESET_GHOSTWRITER_STATE });
    }, SLIDE_DURATION_MS);
  };

  const handleKeyDown = (e) => {
    if (pageChangeInProgress || !typingAllowed) {
      playEndOfPageSound();
      return;
    }
    if (isGhostTextStable) { 
        dispatchTyping({ type: typingActionTypes.RESET_EROSION_STATE });
    }
    const char = e.key === "Enter" ? '\n' : e.key;
    const currentLines = (pageText + ghostTextForDisplay + inputBuffer).split('\n').length;
    if (currentLines >= MAX_LINES && e.key !== 'Backspace') {
      handlePageTurnScroll();
      return;
    }
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: e.key.toUpperCase() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.UPDATE_LAST_USER_INPUT_TIME, payload: Date.now() });
    dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });

    if (e.key.length === 1 || e.key === "Enter") {
      e.preventDefault();
      if (responses.length > 0 && !isGhostTextStable) { 
        commitGhostText(); 
      }
      dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: char });
      if (e.key === "Enter") playEnterSound();
      else playKeySound();
      return; 
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      const oldInputBufferLength = inputBuffer.length;
      const oldResponsesLength = responses.length;
      dispatchTyping({ type: typingActionTypes.HANDLE_BACKSPACE }); 
      if (oldInputBufferLength === 0 && oldResponsesLength === 0) {
        setPages(prev => {
          const updatedPages = [...prev];
          if (updatedPages[currentPage] && updatedPages[currentPage].text.length > 0) {
            updatedPages[currentPage] = { ...updatedPages[currentPage], text: updatedPages[currentPage].text.slice(0, -1) };
          }
          return updatedPages;
        });
      }
      playKeySound();
      return; 
    }
  };

  useEffect(() => {
    if (typingState.requestPageTextUpdate) {
      dispatchTyping({ type: typingActionTypes.RESET_PAGE_TEXT_UPDATE_REQUEST });
    }
  }, [typingState.requestPageTextUpdate, dispatchTyping, setPages, currentPage]);

  useEffect(() => {
    if (!inputBuffer.length || !typingAllowed) return;
    const charToCommit = inputBuffer[0];
    const timeout = setTimeout(() => {
      setPages(prev => {
        const newPages = [...prev];
        newPages[currentPage] = { ...newPages[currentPage], text: newPages[currentPage].text + charToCommit };
        return newPages;
      });
      dispatchTyping({ type: typingActionTypes.CONSUME_INPUT_BUFFER });
      if (charToCommit === '\n' && strikerRef.current) {
        strikerRef.current.classList.add('striker-return');
        setTimeout(() => strikerRef.current?.classList.remove('striker-return'), STRIKER_RETURN_ANIMATION_DURATION);
      }
    }, TYPING_ANIMATION_INTERVAL);
    return () => clearTimeout(timeout);
  }, [inputBuffer, typingAllowed, currentPage, setPages]); 

  useEffect(() => {
    if (!lastPressedKey) return;
    const timeout = setTimeout(() => dispatchTyping({ type: typingActionTypes.CLEAR_LAST_PRESSED_KEY }), LAST_PRESSED_KEY_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [lastPressedKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * keyTextures.length);
      setKeyTextures(prev => {
        const updated = [...prev];
        updated[idx] = getRandomTexture(keys[idx]);
        return updated;
      });
    }, KEY_TEXTURE_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [keyTextures]);

  useEffect(() => {
    if (!typingAllowed) return;
    let interval;
    if (ghostKeyQueue.length > 0) {
      interval = setInterval(() => {
        const charToAppend = ghostKeyQueue[0];
        if (charToAppend) {
          dispatchTyping({ type: typingActionTypes.UPDATE_LAST_RESPONSE_CONTENT, payload: charToAppend });
        }
        dispatchTyping({ type: typingActionTypes.CONSUME_GHOST_KEY_QUEUE });
      }, GHOST_KEY_TYPING_INTERVAL);
    } else if (responses.length > 0 && !isGhostTextStable) {
      const lastResponseContent = responses[responses.length - 1].content;
      if (lastResponseContent) {
        dispatchTyping({ type: typingActionTypes.PREPARE_GHOST_WORDS_FOR_EROSION, payload: lastResponseContent });
      }
    }
    return () => clearInterval(interval);
  }, [ghostKeyQueue, typingAllowed, responses, isGhostTextStable, dispatchTyping]);

  useEffect(() => {
    if (isGhostTextStable && typingAllowed) {
      const visibleWords = ghostWords.filter(gw => gw.status === 'visible');
      if (visibleWords.length > 0) {
        if (erosionTimeoutRef.current) {
          clearTimeout(erosionTimeoutRef.current);
        }
        erosionTimeoutRef.current = setTimeout(() => {
          const randomIndex = Math.floor(Math.random() * visibleWords.length);
          const wordToErode = visibleWords[randomIndex];
          dispatchTyping({ type: typingActionTypes.SET_GHOST_WORD_ERODING, payload: { wordId: wordToErode.id } });
          setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.SET_GHOST_WORD_ERASED, payload: { wordId: wordToErode.id } });
          }, WORD_ERASE_DELAY_MS);
        }, WORD_EROSION_INTERVAL_MS); 
      }
    }
    return () => {
      if (erosionTimeoutRef.current) {
        clearTimeout(erosionTimeoutRef.current);
      }
    };
  }, [isGhostTextStable, ghostWords, typingAllowed, dispatchTyping]);

  useEffect(() => {
    if (!typingAllowed) return;
    const interval = setInterval(async () => {
      const fullText = pages[currentPage]?.text || '';
      const addition = fullText.slice(lastGeneratedLength);
      const pauseSeconds = (Date.now() - lastUserInputTime) / 1000;
      if (addition.trim().split(/\s+/).length >= GHOSTWRITER_MIN_WORDS_TRIGGER && !responseQueued) {
        const data = await fetchShouldGenerateContinuation(fullText, addition, pauseSeconds);
        if (data.data.shouldGenerate) {
          const resp = await fetchTypewriterReply(fullText, sessionId);
          const reply = resp.data;
          if (reply && reply.content) {
            dispatchTyping({ type: typingActionTypes.RESET_EROSION_STATE }); 
            dispatchTyping({ type: typingActionTypes.ADD_RESPONSE, payload: { ...reply, id: Date.now().toString(), content: '' } });
            dispatchTyping({ type: typingActionTypes.SET_GHOST_KEY_QUEUE, payload: reply.content.split('') });
            dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: fullText.length });
            dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: true });
          }
        }
      }
    }, GHOSTWRITER_AI_TRIGGER_INTERVAL);
    return () => clearInterval(interval);
  }, [pages, currentPage, typingAllowed, lastUserInputTime, responseQueued, lastGeneratedLength, sessionId, dispatchTyping, dispatchGhostwriter]);

  const commitGhostText = () => {
    const fullGhostText = responses.map(r => r.content).join('');
    if (!fullGhostText && !isGhostTextStable) return; 
    let textToCommit = fullGhostText;
    if (isGhostTextStable) { 
        textToCommit = displayableGhostText;
    }
    if (!textToCommit) return;
    const mergedText = pageText + textToCommit;
    const mergedLines = mergedText.split('\n').length;
    const newTextForPage = mergedLines > MAX_LINES ? mergedText.split('\n').slice(0, MAX_LINES).join('\n') : mergedText;
    setPages(prev => {
      const updatedPages = [...prev];
      updatedPages[currentPage] = { ...updatedPages[currentPage], text: newTextForPage };
      return updatedPages;
    });
    dispatchTyping({ type: typingActionTypes.CLEAR_RESPONSES }); 
    dispatchTyping({ type: typingActionTypes.SET_GHOST_KEY_QUEUE, payload: [] });
    dispatchTyping({ type: typingActionTypes.RESET_EROSION_STATE }); 
  };

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    const text = pages[currentPage]?.text || '';
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    let newLevel = 0;
    if (words >= LEVER_LEVEL_WORD_THRESHOLDS[3]) newLevel = 3;
    else if (words >= LEVER_LEVEL_WORD_THRESHOLDS[2]) newLevel = 2;
    else if (words >= LEVER_LEVEL_WORD_THRESHOLDS[1]) newLevel = 1;
    setLeverLevel(newLevel);
  }, [pages, currentPage]);

  const handleRegularKeyPress = (keyText) => {
    if (isGhostTextStable) dispatchTyping({ type: typingActionTypes.RESET_EROSION_STATE });
    if (responses.length > 0 && !isGhostTextStable) commitGhostText(); 
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: keyText });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: keyText.toUpperCase() });
    playKeySound();
  };

  const handleXerofagKeyPress = () => {
    if (isGhostTextStable) dispatchTyping({ type: typingActionTypes.RESET_EROSION_STATE });
    if (responses.length > 0 && !isGhostTextStable) commitGhostText();
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: SPECIAL_KEY_INSERT_TEXT });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: SPECIAL_KEY_TEXT.toUpperCase() });
    playXerofagHowl();
  };

  const handleSpacebarPress = () => {
    if (isGhostTextStable) dispatchTyping({ type: typingActionTypes.RESET_EROSION_STATE });
    if (responses.length > 0 && !isGhostTextStable) commitGhostText();
    dispatchTyping({ type: typingActionTypes.ADD_TO_INPUT_BUFFER, payload: ' ' });
    dispatchTyping({ type: typingActionTypes.SET_LAST_PRESSED_KEY, payload: ' ' });
    playKeySound();
  };

  return (
    <div className="typewriter-container" tabIndex="0" onKeyDown={handleKeyDown} ref={containerRef}>
      <PageNavigation
        currentPage={currentPage} totalPages={pages.length}
        onPrevPage={() => handleHistoryNavigation(currentPage - 1)} onNextPage={() => handleHistoryNavigation(currentPage + 1)}
        isSliding={isSliding} PAGE_NAVIGATION_BUTTONS_TOP={PAGE_NAVIGATION_BUTTONS_TOP} PAGE_NAVIGATION_BUTTONS_Z_INDEX={PAGE_NAVIGATION_BUTTONS_Z_INDEX}
        PAGE_NAVIGATION_BUTTONS_PADDING={PAGE_NAVIGATION_BUTTONS_PADDING} PAGE_NAVIGATION_BUTTON_FONT_SIZE={PAGE_NAVIGATION_BUTTON_FONT_SIZE}
        PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY={PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY} PAGE_COUNT_TEXT_COLOR={PAGE_COUNT_TEXT_COLOR}
        PAGE_COUNT_TEXT_FONT_FAMILY={PAGE_COUNT_TEXT_FONT_FAMILY} PAGE_COUNT_TEXT_FONT_SIZE={PAGE_COUNT_TEXT_FONT_SIZE}
      />
      <img src={GRIT_SHELL_OVERLAY_URL} alt="grit shell overlay" className="typewriter-overlay" />
      <PaperDisplay
        pageText={pageText} 
        ghostText={ghostTextForDisplay} 
        isGhostTextStable={isGhostTextStable} // Pass this prop
        pageBg={pageBg} scrollRef={scrollRef} lastLineRef={lastLineRef} strikerRef={strikerRef}
        showCursor={showCursor} isSliding={isSliding} slideX={slideX} slideDir={slideDir} prevFilmBgUrl={prevFilmBgUrl} nextFilmBgUrl={nextFilmBgUrl}
        prevText={prevText} nextText={nextText} MAX_LINES={MAX_LINES} TOP_OFFSET={TOP_OFFSET} BOTTOM_PADDING={BOTTOM_PADDING} FRAME_HEIGHT={FRAME_HEIGHT}
        FILM_HEIGHT={FILM_HEIGHT} scrollAreaHeight={scrollAreaHeight} neededHeight={neededHeight} SLIDE_DURATION_MS={SLIDE_DURATION_MS}
        SPECIAL_KEY_TEXT={SPECIAL_KEY_TEXT} FILM_SLIDE_WRAPPER_WIDTH={FILM_SLIDE_WRAPPER_WIDTH} FILM_SLIDE_WRAPPER_Z_INDEX={FILM_SLIDE_WRAPPER_Z_INDEX}
        FILM_BG_SLIDE_OPACITY={FILM_BG_SLIDE_OPACITY} FILM_BG_SLIDE_BOX_SHADOW_LEFT={FILM_BG_SLIDE_BOX_SHADOW_LEFT}
        FILM_BG_SLIDE_BOX_SHADOW_RIGHT={FILM_BG_SLIDE_BOX_SHADOW_RIGHT} FILM_BG_SLIDE_CONTRAST_OUTGOING={FILM_BG_SLIDE_CONTRAST_OUTGOING}
        FILM_BG_SLIDE_BRIGHTNESS_OUTGOING={FILM_BG_SLIDE_BRIGHTNESS_OUTGOING} FILM_BG_SLIDE_CONTRAST_INCOMING={FILM_BG_SLIDE_CONTRAST_INCOMING}
        FILM_BG_SLIDE_BRIGHTNESS_INCOMING={FILM_BG_SLIDE_BRIGHTNESS_INCOMING} FILM_FLICKER_OVERLAY_Z_INDEX={FILM_FLICKER_OVERLAY_Z_INDEX}
        FILM_FLICKER_OVERLAY_TEXTURE_URL={FILM_FLICKER_OVERLAY_TEXTURE_URL} FILM_FLICKER_OVERLAY_GRADIENT={FILM_FLICKER_OVERLAY_GRADIENT}
        FILM_FLICKER_OVERLAY_OPACITY={FILM_FLICKER_OVERLAY_OPACITY} FILM_FLICKER_OVERLAY_BLEND_MODE={FILM_FLICKER_OVERLAY_BLEND_MODE}
        FILM_FLICKER_OVERLAY_ANIMATION={FILM_FLICKER_OVERLAY_ANIMATION} FILM_BACKGROUND_Z_INDEX={FILM_BACKGROUND_Z_INDEX}
        FILM_BACKGROUND_OPACITY={FILM_BACKGROUND_OPACITY} TYPEWRITER_TEXT_Z_INDEX={TYPEWRITER_TEXT_Z_INDEX}
        STRIKER_CURSOR_OFFSET_LEFT={STRIKER_CURSOR_OFFSET_LEFT} SLIDE_DIRECTION_LEFT={SLIDE_DIRECTION_LEFT}
      />
      <div className="storyteller-sigil"><img src={SIGIL_IMAGE_URL} alt="Storyteller's Society Sigil"/></div>
      <Keyboard
        keys={keys} keyTextures={keyTextures} lastPressedKey={lastPressedKey} typingAllowed={typingAllowed}
        onKeyPress={handleRegularKeyPress} onXerofagPress={handleXerofagKeyPress} onSpacebarPress={handleSpacebarPress}
        playEndOfPageSound={playEndOfPageSound} KEY_TILT_RANDOM_MAX={KEY_TILT_RANDOM_MAX} KEY_TILT_RANDOM_MIN={KEY_TILT_RANDOM_MIN}
        KEY_OFFSET_Y_RANDOM_MAX={KEY_OFFSET_Y_RANDOM_MAX} KEY_OFFSET_Y_RANDOM_MIN={KEY_OFFSET_Y_RANDOM_MIN} SPECIAL_KEY_TEXT={SPECIAL_KEY_TEXT}
      />
      <div className="turn-page-lever-float" style={{position: 'absolute', bottom: TURN_PAGE_LEVER_BOTTOM, left: TURN_PAGE_LEVER_LEFT, zIndex: TURN_PAGE_LEVER_Z_INDEX, pointerEvents: 'auto'}}>
        <TurnPageLever level={leverLevel} canPull={leverLevel === 3 && !pageChangeInProgress && typingAllowed} disabled={pageChangeInProgress} onPull={() => { setLeverLevel(0); handlePageTurnScroll(); }}/>
      </div>
    </div>
  );
};

export default TypewriterFramework;

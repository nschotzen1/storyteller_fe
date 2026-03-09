import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, LoaderCircle, Send } from 'lucide-react';
import './Messanger.css';
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_SCENE_ID,
  loadMessengerConversation,
  sendMessengerMessage
} from './api/messenger';

const API_BASE_STORAGE_KEY = 'typewriterAdminApiBaseUrl';
const SESSION_STORAGE_KEY = 'sessionId';
const MOCK_STORAGE_KEY = 'messangerForceMock';
const INTRO_AUDIO_SRC = '/audio/typewriter-narration.mp3';
const INTRO_COVER_SRC = '/tapestries/intro.png';
const INTRO_AUDIO_DELAY_MS = 160;
const INTRO_FLIP_PRELUDE_MS = 1480;
const INTRO_FLIP_DURATION_MS = 6400;
const SYSTEM_TYPING_BASE_DELAY_MS = 16;
const SYSTEM_TYPING_SPACE_DELAY_MS = 26;
const SYSTEM_TYPING_PUNCTUATION_DELAY_MS = 92;
const INTERFERENCE_IDLE_MIN_DELAY_MS = 5600;
const INTERFERENCE_IDLE_MAX_DELAY_MS = 12800;
const INTERFERENCE_ACTIVE_MIN_DELAY_MS = 2400;
const INTERFERENCE_ACTIVE_MAX_DELAY_MS = 6200;
const INTERFERENCE_SOFT_MIN_DURATION_MS = 240;
const INTERFERENCE_SOFT_MAX_DURATION_MS = 520;
const INTERFERENCE_HARD_MIN_DURATION_MS = 520;
const INTERFERENCE_HARD_MAX_DURATION_MS = 980;

const createSessionId = () => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 14);
};

const getInitialApiBaseUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : DEFAULT_API_BASE_URL;
};

const getInitialSessionId = () => {
  if (typeof window === 'undefined') return createSessionId();
  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (stored && stored.trim()) {
    return stored.trim();
  }
  const generated = createSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
};

const getInitialForceMock = () => {
  if (typeof window === 'undefined') return false;
  const stored = `${window.localStorage.getItem(MOCK_STORAGE_KEY) || ''}`.trim().toLowerCase();
  return stored === '1' || stored === 'true' || stored === 'yes';
};

const formatMessageTime = (createdAt, pending = false) => {
  if (pending) return 'sending';
  if (!createdAt) return '';
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return '';
  try {
    return new Intl.DateTimeFormat([], {
      hour: 'numeric',
      minute: '2-digit'
    }).format(parsed);
  } catch {
    return '';
  }
};

const getSystemTypingDelay = (currentCharacter) => {
  if (!currentCharacter) return SYSTEM_TYPING_BASE_DELAY_MS;
  if (/[,.!?;:]/.test(currentCharacter)) return SYSTEM_TYPING_PUNCTUATION_DELAY_MS;
  if (/\s/.test(currentCharacter)) return SYSTEM_TYPING_SPACE_DELAY_MS;
  return SYSTEM_TYPING_BASE_DELAY_MS;
};

const normalizeMessages = (payload) => {
  if (!Array.isArray(payload)) return [];
  return payload.map((message, index) => ({
    id: message?.id || `message-${index}`,
    sender: message?.sender === 'user' ? 'user' : 'system',
    text: typeof message?.text === 'string' ? message.text : '',
    type: typeof message?.type === 'string' ? message.type : 'response',
    pending: Boolean(message?.pending),
    hasChatEnded: Boolean(message?.hasChatEnded),
    createdAt: typeof message?.createdAt === 'string' ? message.createdAt : ''
  }));
};

const MessageCard = ({ message }) => {
  const messageLabel = message.type === 'initial'
    ? 'Initial dispatch'
    : message.sender === 'system'
      ? 'Society relay'
      : 'Your note';
  const timeLabel = formatMessageTime(message.createdAt, message.pending);

  return (
  <motion.article
    layout
    initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -14 }}
    transition={{ duration: 0.32, ease: 'easeOut' }}
    className={`messangerMessage messangerMessage--${message.sender}${message.pending ? ' is-pending' : ''}`}
  >
    <div className="messangerMessage__meta">
      <span>{message.sender === 'system' ? 'Storyteller Society' : 'You'}</span>
      <span>{message.pending ? 'Outbound' : message.type === 'initial' ? 'Boot' : 'Secure'}</span>
    </div>
    <div className="messangerMessage__body">
      {message.text}
      {message.isTyping ? <span className="messangerMessage__cursor" aria-hidden="true" /> : null}
    </div>
    {(messageLabel || timeLabel) && (
      <div className="messangerMessage__footer">
        <span>{messageLabel}</span>
        {timeLabel ? <span>{timeLabel}</span> : null}
      </div>
    )}
  </motion.article>
  );
};

const Messanger = ({ start = true, onCurtainDropComplete }) => {
  const apiBaseUrl = useMemo(getInitialApiBaseUrl, []);
  const sessionId = useMemo(getInitialSessionId, []);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [forceMock, setForceMock] = useState(getInitialForceMock);
  const [runtime, setRuntime] = useState(null);
  const [chatEnded, setChatEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [revealedTextById, setRevealedTextById] = useState({});
  const [typingMessageId, setTypingMessageId] = useState('');
  const [interferenceLevel, setInterferenceLevel] = useState('');
  const [isOpeningMessenger, setIsOpeningMessenger] = useState(false);
  const [isFlippingMessenger, setIsFlippingMessenger] = useState(false);
  const [hasOpenedMessenger, setHasOpenedMessenger] = useState(false);

  const threadRef = useRef(null);
  const introAudioRef = useRef(null);
  const introAudioTimerRef = useRef(null);
  const lastIntroPlaybackKeyRef = useRef('');
  const typingTimerRef = useRef(null);
  const previousMessageIdsRef = useRef([]);
  const interferenceTriggerTimerRef = useRef(null);
  const interferenceClearTimerRef = useRef(null);
  const introFlipTimerRef = useRef(null);
  const introFlipCompletionTimerRef = useRef(null);

  const stopIntroAudio = () => {
    if (introAudioTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(introAudioTimerRef.current);
      introAudioTimerRef.current = null;
    }

    if (!introAudioRef.current) {
      return;
    }

    try {
      introAudioRef.current.pause();
      introAudioRef.current.currentTime = 0;
    } catch (error) {
      console.warn('Unable to stop messenger intro audio:', error);
    } finally {
      introAudioRef.current = null;
    }
  };

  const stopTypingAnimation = () => {
    if (typingTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setTypingMessageId('');
  };

  const stopInterference = () => {
    if (typeof window !== 'undefined') {
      if (interferenceTriggerTimerRef.current) {
        window.clearTimeout(interferenceTriggerTimerRef.current);
        interferenceTriggerTimerRef.current = null;
      }
      if (interferenceClearTimerRef.current) {
        window.clearTimeout(interferenceClearTimerRef.current);
        interferenceClearTimerRef.current = null;
      }
    }
    setInterferenceLevel('');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MOCK_STORAGE_KEY, forceMock ? 'true' : 'false');
  }, [forceMock]);

  useEffect(() => {
    threadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pendingMessage, sending, revealedTextById, typingMessageId]);

  useEffect(() => () => {
    if (introFlipTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(introFlipTimerRef.current);
      introFlipTimerRef.current = null;
    }
    if (introFlipCompletionTimerRef.current && typeof window !== 'undefined') {
      window.clearTimeout(introFlipCompletionTimerRef.current);
      introFlipCompletionTimerRef.current = null;
    }
    stopIntroAudio();
    stopTypingAnimation();
    stopInterference();
  }, []);

  useEffect(() => {
    if (!start || typeof window === 'undefined' || !hasOpenedMessenger) {
      setInterferenceLevel('');
      return undefined;
    }

    let cancelled = false;
    const isActiveTransmission = loading || sending || Boolean(typingMessageId);
    const minDelay = isActiveTransmission ? INTERFERENCE_ACTIVE_MIN_DELAY_MS : INTERFERENCE_IDLE_MIN_DELAY_MS;
    const maxDelay = isActiveTransmission ? INTERFERENCE_ACTIVE_MAX_DELAY_MS : INTERFERENCE_IDLE_MAX_DELAY_MS;

    stopInterference();

    const scheduleNextBurst = (isInitial = false) => {
      const delay = isInitial
        ? ((isActiveTransmission ? 900 : 1800) + Math.round(Math.random() * 1400))
        : (minDelay + Math.round(Math.random() * (maxDelay - minDelay)));
      interferenceTriggerTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;

        const nextLevel = (isActiveTransmission || Math.random() < 0.34) ? 'hard' : 'soft';
        const minDuration = nextLevel === 'hard' ? INTERFERENCE_HARD_MIN_DURATION_MS : INTERFERENCE_SOFT_MIN_DURATION_MS;
        const maxDuration = nextLevel === 'hard' ? INTERFERENCE_HARD_MAX_DURATION_MS : INTERFERENCE_SOFT_MAX_DURATION_MS;
        const duration = minDuration + Math.round(Math.random() * (maxDuration - minDuration));

        setInterferenceLevel(nextLevel);
        interferenceClearTimerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          setInterferenceLevel('');
          scheduleNextBurst();
        }, duration);
      }, delay);
    };

    scheduleNextBurst(true);

    return () => {
      cancelled = true;
      stopInterference();
    };
  }, [hasOpenedMessenger, loading, sending, start, typingMessageId]);

  useEffect(() => {
    if (!chatEnded || typeof onCurtainDropComplete !== 'function') return undefined;
    const timer = window.setTimeout(() => {
      onCurtainDropComplete();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [chatEnded, onCurtainDropComplete]);

  useEffect(() => {
    if (!start) return undefined;
    let active = true;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await loadMessengerConversation(apiBaseUrl, {
          sessionId,
          sceneId: DEFAULT_SCENE_ID
        });
        if (!active) return;
        setMessages(normalizeMessages(payload?.messages));
        setChatEnded(Boolean(payload?.hasChatEnded));
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load messenger conversation.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, sessionId, start]);

  useEffect(() => {
    if (!start || !hasOpenedMessenger || typeof window === 'undefined' || typeof Audio !== 'function') {
      return undefined;
    }

    const firstMessage = messages[0];
    const shouldPlayIntro = (
      messages.length === 1
      && firstMessage?.sender === 'system'
      && firstMessage?.type === 'initial'
      && typeof firstMessage?.text === 'string'
      && firstMessage.text.trim()
    );

    if (!shouldPlayIntro) {
      return undefined;
    }

    const playbackKey = `${sessionId}:${DEFAULT_SCENE_ID}:${firstMessage.id || 'initial'}`;
    if (lastIntroPlaybackKeyRef.current === playbackKey) {
      return undefined;
    }

    lastIntroPlaybackKeyRef.current = playbackKey;
    introAudioTimerRef.current = window.setTimeout(() => {
      stopIntroAudio();
      const audio = new Audio(INTRO_AUDIO_SRC);
      introAudioRef.current = audio;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((error) => {
          console.warn('Messenger intro playback prevented:', error);
        });
      }
      introAudioTimerRef.current = null;
    }, INTRO_AUDIO_DELAY_MS);

    return () => {
      if (introAudioTimerRef.current) {
        window.clearTimeout(introAudioTimerRef.current);
        introAudioTimerRef.current = null;
      }
    };
  }, [hasOpenedMessenger, messages, sessionId, start]);

  useEffect(() => {
    const previousIds = new Set(previousMessageIdsRef.current);
    const animateInitialDispatch = (
      previousMessageIdsRef.current.length === 0
      && messages.length === 1
      && messages[0]?.sender === 'system'
      && messages[0]?.type === 'initial'
    );

    const animatedMessage = animateInitialDispatch
      ? messages[0]
      : [...messages].reverse().find((message) =>
        message?.sender === 'system'
        && !previousIds.has(message.id)
        && typeof message.text === 'string'
        && message.text.trim()
      );

    setRevealedTextById((previousMap) => {
      const nextMap = {};
      for (const message of messages) {
        if (message.id === animatedMessage?.id) {
          nextMap[message.id] = previousIds.has(message.id)
            ? (previousMap[message.id] || '')
            : '';
          continue;
        }
        nextMap[message.id] = message.text;
      }
      return nextMap;
    });

    previousMessageIdsRef.current = messages.map((message) => message.id);

    if (!animatedMessage) {
      stopTypingAnimation();
      return undefined;
    }

    stopTypingAnimation();
    setTypingMessageId(animatedMessage.id);

    const fullText = animatedMessage.text;
    let nextLength = 0;

    const revealNextSlice = () => {
      nextLength += 1;
      const revealedSlice = fullText.slice(0, nextLength);
      setRevealedTextById((previousMap) => ({
        ...previousMap,
        [animatedMessage.id]: revealedSlice
      }));

      if (nextLength >= fullText.length) {
        typingTimerRef.current = null;
        setTypingMessageId('');
        return;
      }

      typingTimerRef.current = window.setTimeout(
        revealNextSlice,
        getSystemTypingDelay(fullText[nextLength - 1])
      );
    };

    revealNextSlice();

    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [messages]);

  const threadMessages = useMemo(() => {
    const renderedMessages = messages.map((message) => ({
      ...message,
      text: message.sender === 'system'
        ? (revealedTextById[message.id] ?? '')
        : message.text,
      isTyping: typingMessageId === message.id
    }));

    if (!pendingMessage) return renderedMessages;
    return [
      ...renderedMessages,
      {
        id: 'pending-user-message',
        sender: 'user',
        text: pendingMessage,
        type: 'user',
        pending: true,
        hasChatEnded: false,
        createdAt: '',
        isTyping: false
      }
    ];
  }, [messages, pendingMessage, revealedTextById, typingMessageId]);

  const handleSend = async () => {
    const draft = input.trim();
    if (!draft || sending) return;

    setSending(true);
    setPendingMessage(draft);
    setInput('');
    setError('');

    try {
      const payload = await sendMessengerMessage(apiBaseUrl, {
        sessionId,
        sceneId: DEFAULT_SCENE_ID,
        message: draft,
        mocked_api_calls: forceMock ? true : undefined
      });
      setMessages(normalizeMessages(payload?.messages));
      setRuntime(payload?.runtime || null);
      setChatEnded(Boolean(payload?.has_chat_ended));
    } catch (err) {
      setInput(draft);
      setError(err.message || 'Unable to send messenger reply.');
    } finally {
      setPendingMessage('');
      setSending(false);
    }
  };
  const handsetTime = useMemo(() => {
    try {
      return new Intl.DateTimeFormat([], {
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date());
    } catch {
      return '11:47';
    }
  }, []);
  const threadStateLabel = chatEnded ? 'Thread sealed' : 'Waiting for your note';
  const transmissionModeLabel = runtime?.mocked || forceMock ? 'Mock transmission' : 'Live transmission';

  const handleOpenMessenger = () => {
    if (hasOpenedMessenger || isOpeningMessenger || isFlippingMessenger || typeof window === 'undefined') {
      return;
    }

    setIsOpeningMessenger(true);
    introFlipTimerRef.current = window.setTimeout(() => {
      setIsOpeningMessenger(false);
      setIsFlippingMessenger(true);
      introFlipTimerRef.current = null;
      introFlipCompletionTimerRef.current = window.setTimeout(() => {
        setIsFlippingMessenger(false);
        setHasOpenedMessenger(true);
        introFlipCompletionTimerRef.current = null;
      }, INTRO_FLIP_DURATION_MS);
    }, INTRO_FLIP_PRELUDE_MS);
  };

  return (
    <div className={`messangerScene${chatEnded ? ' is-ended' : ''}`}>
      <div className="messangerScene__grain" />
      <div className="messangerScene__veil" />

      <div className="messangerFrame">
        <div className="messangerPhoneWrap">
          <div className="messangerUtilityBar">
            <label className="messangerModeSwitch">
              <input
                type="checkbox"
                checked={forceMock}
                onChange={(event) => setForceMock(event.target.checked)}
              />
              <span className="messangerModeSwitch__track" aria-hidden="true">
                <span className="messangerModeSwitch__thumb" />
              </span>
              <span className="messangerModeSwitch__label">
                {forceMock ? 'Mock' : 'Live'}
              </span>
            </label>
          </div>

          <div className="messangerPhone">
            <div className="messangerPhone__hardware" aria-hidden="true">
              <span className="messangerPhone__rail is-left" />
              <span className="messangerPhone__rail is-right" />
              <span className="messangerPhone__brace is-top" />
              <span className="messangerPhone__brace is-bottom" />
              <span className="messangerPhone__bolt is-top-left" />
              <span className="messangerPhone__bolt is-top-right" />
              <span className="messangerPhone__bolt is-bottom-left" />
              <span className="messangerPhone__bolt is-bottom-right" />
            </div>

            <div className="messangerPhone__bezel">
              <span className="messangerPhone__camera" />
              <span className="messangerPhone__speaker" />
            </div>

            <div className={`messangerPhone__screen${interferenceLevel ? ` is-interference-${interferenceLevel}` : ''}`}>
              <div className={`messangerFlipStage${isOpeningMessenger ? ' is-opening' : ''}${isFlippingMessenger ? ' is-flipping' : ''}${hasOpenedMessenger ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="messangerIntroFace"
                  onClick={handleOpenMessenger}
                  aria-label="Open messenger transmission"
                  disabled={isOpeningMessenger || isFlippingMessenger || hasOpenedMessenger}
                >
                  <span className="messangerIntroFace__frame" aria-hidden="true" />
                  <img src={INTRO_COVER_SRC} alt="Storyteller Society transmission cover" className="messangerIntroFace__image" />
                  <span className="messangerIntroFace__caption">
                    Tap to receive transmission
                  </span>
                </button>

                <div className="messangerChatFace">
                  <div className="messangerStatusBar">
                    <span className="messangerStatusBar__time">{handsetTime}</span>
                    <div className="messangerStatusBar__icons" aria-hidden="true">
                      <span className="messangerSignal">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="messangerBattery">
                        <b />
                      </span>
                    </div>
                  </div>

                  <section className="messangerConsole">
                    <header className="messangerConsole__header">
                      <div className="messangerConsole__contact">
                        <div className="messangerAvatar">
                          <span>SS</span>
                        </div>
                        <div className="messangerConsole__titles">
                          <span className="messangerConsole__eyebrow">Encrypted thread · carrier weak</span>
                          <h2>Storyteller Society</h2>
                          <p>{threadStateLabel}</p>
                        </div>
                      </div>
                      <div className="messangerConsole__status">
                        <span className={`messangerChip${runtime?.mocked || forceMock ? ' is-mock' : ''}`}>
                          {transmissionModeLabel}
                        </span>
                        <span className="messangerChip">{chatEnded ? 'Sealed' : 'Open'}</span>
                      </div>
                    </header>

                    <div className="messangerConsole__radioScale" aria-hidden="true">
                      <span className="messangerConsole__radioScaleDot" />
                      <span className="messangerConsole__radioScaleNeedle" />
                    </div>

                    <div className={`messangerThread${interferenceLevel ? ` is-interference-${interferenceLevel}` : ''}`}>
                      <div className={`messangerThread__interference${interferenceLevel ? ` is-${interferenceLevel}` : ''}`} aria-hidden="true">
                        <span className="messangerThread__static" />
                        <span className="messangerThread__scanlines" />
                        <span className="messangerThread__burst" />
                        <span className="messangerThread__break messangerThread__break--one" />
                        <span className="messangerThread__break messangerThread__break--two" />
                      </div>

                      <div className="messangerThread__datePill">
                        Dispatch line · {DEFAULT_SCENE_ID}
                      </div>

                      {loading && (
                        <div className="messangerBanner">
                          <LoaderCircle size={16} className="spin" />
                          <span>Loading conversation from the archive.</span>
                        </div>
                      )}

                      {error && (
                        <div className="messangerBanner is-error">
                          <AlertCircle size={16} />
                          <span>{error}</span>
                        </div>
                      )}

                      <AnimatePresence initial={false}>
                        {threadMessages.map((message) => (
                          <MessageCard key={message.id} message={message} />
                        ))}
                      </AnimatePresence>

                      {sending && (
                        <div className="messangerTyping">
                          <span />
                          <span />
                          <span />
                        </div>
                      )}

                      <div ref={threadRef} />
                    </div>

                    <div className="messangerComposer">
                      <div className="messangerComposer__field">
                        <textarea
                          value={input}
                          onChange={(event) => setInput(event.target.value)}
                          placeholder={
                            sending
                              ? 'Awaiting the Society...'
                              : 'Describe the room, the window, the weather, and where the typewriter could vanish if required.'
                          }
                          disabled={sending}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              handleSend();
                            }
                          }}
                        />
                      </div>
                      <button type="button" onClick={handleSend} disabled={sending || !input.trim()}>
                        {sending ? <LoaderCircle size={18} className="spin" /> : <Send size={18} />}
                        <span>Send</span>
                      </button>
                    </div>
                  </section>

                  <div className="messangerPhone__homebar" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messanger;

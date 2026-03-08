import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Eraser, LoaderCircle, Radio, RefreshCcw, Send, Sparkles } from 'lucide-react';
import './Messanger.css';
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_SCENE_ID,
  loadMessengerConversation,
  resetMessengerConversation,
  sendMessengerMessage
} from './api/messenger';

const API_BASE_STORAGE_KEY = 'typewriterAdminApiBaseUrl';
const SESSION_STORAGE_KEY = 'sessionId';
const MOCK_STORAGE_KEY = 'messangerForceMock';
const INTRO_AUDIO_SRC = '/audio/typewriter-narration.mp3';
const INTRO_AUDIO_DELAY_MS = 160;

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
    <div className="messangerMessage__body">{message.text}</div>
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
  const [apiBaseUrl, setApiBaseUrl] = useState(getInitialApiBaseUrl);
  const [sessionId, setSessionId] = useState(getInitialSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [forceMock, setForceMock] = useState(getInitialForceMock);
  const [runtime, setRuntime] = useState(null);
  const [chatEnded, setChatEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');

  const threadRef = useRef(null);
  const introAudioRef = useRef(null);
  const introAudioTimerRef = useRef(null);
  const lastIntroPlaybackKeyRef = useRef('');

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(API_BASE_STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MOCK_STORAGE_KEY, forceMock ? 'true' : 'false');
  }, [forceMock]);

  useEffect(() => {
    threadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pendingMessage, sending]);

  useEffect(() => () => {
    stopIntroAudio();
  }, []);

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
        setStatus('Messenger console synced.');
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
    if (!start || typeof window === 'undefined' || typeof Audio !== 'function') {
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
  }, [messages, sessionId, start]);

  const threadMessages = useMemo(() => {
    if (!pendingMessage) return messages;
    return [
      ...messages,
      {
        id: 'pending-user-message',
        sender: 'user',
        text: pendingMessage,
        type: 'user',
        pending: true,
        hasChatEnded: false
      }
    ];
  }, [messages, pendingMessage]);

  const handleSend = async () => {
    const draft = input.trim();
    if (!draft || sending) return;

    setSending(true);
    setPendingMessage(draft);
    setInput('');
    setError('');
    setStatus('');

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
      setStatus(payload?.mocked ? 'Mocked messenger response received.' : 'Live messenger response received.');
    } catch (err) {
      setInput(draft);
      setError(err.message || 'Unable to send messenger reply.');
    } finally {
      setPendingMessage('');
      setSending(false);
    }
  };

  const handleResetConversation = async () => {
    setResetting(true);
    setError('');
    setStatus('');
    lastIntroPlaybackKeyRef.current = '';
    stopIntroAudio();
    try {
      await resetMessengerConversation(apiBaseUrl, {
        sessionId,
        sceneId: DEFAULT_SCENE_ID
      });
      const payload = await loadMessengerConversation(apiBaseUrl, {
        sessionId,
        sceneId: DEFAULT_SCENE_ID
      });
      setMessages(normalizeMessages(payload?.messages));
      setRuntime(null);
      setChatEnded(false);
      setStatus('Conversation cleared and re-opened from the initial dispatch.');
    } catch (err) {
      setError(err.message || 'Unable to reset messenger conversation.');
    } finally {
      setResetting(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const payload = await loadMessengerConversation(apiBaseUrl, {
        sessionId,
        sceneId: DEFAULT_SCENE_ID
      });
      setMessages(normalizeMessages(payload?.messages));
      setChatEnded(Boolean(payload?.hasChatEnded));
      setStatus('Conversation reloaded from the server.');
    } catch (err) {
      setError(err.message || 'Unable to reload messenger conversation.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    const nextSessionId = createSessionId();
    lastIntroPlaybackKeyRef.current = '';
    stopIntroAudio();
    setRuntime(null);
    setMessages([]);
    setChatEnded(false);
    setPendingMessage('');
    setError('');
    setStatus(`Opened new messenger session ${nextSessionId}.`);
    setSessionId(nextSessionId);
  };

  const runtimeLabel = runtime
    ? `${runtime.mocked ? 'mock' : 'live'} / ${runtime.provider || 'openai'} / ${runtime.model || 'default'}`
    : 'Awaiting response';
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
  const circuitLabel = runtime?.mocked || forceMock ? 'Mock-SIM' : '5G ether';
  const storageLabel = runtime?.storage === 'file' ? 'off-grid' : 'synced';
  const threadStateLabel = chatEnded ? 'Thread sealed' : 'Waiting for your note';

  return (
    <div className={`messangerScene${chatEnded ? ' is-ended' : ''}`}>
      <div className="messangerScene__grain" />
      <div className="messangerScene__veil" />

      <div className="messangerFrame">
        <div className="messangerPhoneWrap">
          <div className="messangerPhone">
            <div className="messangerPhone__bezel">
              <span className="messangerPhone__camera" />
              <span className="messangerPhone__speaker" />
            </div>

            <div className="messangerPhone__screen">
              <div className="messangerStatusBar">
                <span className="messangerStatusBar__time">{handsetTime}</span>
                <div className="messangerStatusBar__icons">
                  <span>{circuitLabel}</span>
                  <span>{storageLabel}</span>
                </div>
              </div>

              <section className="messangerConsole">
                <header className="messangerConsole__header">
                  <div className="messangerConsole__contact">
                    <div className="messangerAvatar">
                      <span>SS</span>
                    </div>
                    <div className="messangerConsole__titles">
                      <span className="messangerConsole__eyebrow">Encrypted thread</span>
                      <h2>Storyteller Society</h2>
                      <p>{threadStateLabel}</p>
                    </div>
                  </div>
                  <div className="messangerConsole__status">
                    <span className={`messangerChip${runtime?.mocked || forceMock ? ' is-mock' : ''}`}>
                      {runtime?.mocked || forceMock ? 'Mock' : 'Live'}
                    </span>
                    <span className="messangerChip">{chatEnded ? 'Sealed' : 'Open'}</span>
                  </div>
                </header>

                <div className="messangerThread">
                  <div className="messangerThread__datePill">
                    Dispatch line · {DEFAULT_SCENE_ID}
                  </div>

                  {loading && (
                    <div className="messangerBanner">
                      <LoaderCircle size={16} className="spin" />
                      <span>Loading conversation from the archive.</span>
                    </div>
                  )}

                  {status && !error && (
                    <div className="messangerBanner is-success">
                      <Radio size={16} />
                      <span>{status}</span>
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
                      disabled={sending || resetting}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                  </div>
                  <button type="button" onClick={handleSend} disabled={sending || resetting || !input.trim()}>
                    {sending ? <LoaderCircle size={18} className="spin" /> : <Send size={18} />}
                    <span>Send</span>
                  </button>
                </div>
              </section>

              <div className="messangerPhone__homebar" />
            </div>
          </div>
        </div>

        <aside className="messangerDossier">
          <div className="messangerDossier__crest">
            <span className="messangerDossier__eyebrow">Switchboard</span>
            <h1>Messanger</h1>
            <p>
              The handset is the primary experience. This sidecar keeps the wiring visible so you can debug
              sessions, runtime, and transport without breaking the mobile illusion.
            </p>
          </div>

          <label className="messangerField">
            <span>API base</span>
            <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} />
          </label>

          <label className="messangerField">
            <span>Session</span>
            <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
          </label>

          <label className="messangerToggle">
            <input
              type="checkbox"
              checked={forceMock}
              onChange={(event) => setForceMock(event.target.checked)}
            />
            <span>Force mock replies on this handset</span>
          </label>

          <div className="messangerActions">
            <button type="button" onClick={handleReload} disabled={loading || sending || resetting}>
              <RefreshCcw size={15} />
              Reload
            </button>
            <button type="button" onClick={handleResetConversation} disabled={loading || sending || resetting}>
              <Eraser size={15} />
              Reset Log
            </button>
            <button type="button" onClick={handleNewSession} disabled={sending || resetting}>
              <Sparkles size={15} />
              New Thread
            </button>
          </div>

          <dl className="messangerStats">
            <div>
              <dt>Route</dt>
              <dd>/api/messenger/chat</dd>
            </div>
            <div>
              <dt>Legacy Alias</dt>
              <dd>/api/sendMessage</dd>
            </div>
            <div>
              <dt>Scene</dt>
              <dd>{DEFAULT_SCENE_ID}</dd>
            </div>
            <div>
              <dt>Messages</dt>
              <dd>{messages.length}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{runtimeLabel}</dd>
            </div>
            <div>
              <dt>State</dt>
              <dd>{threadStateLabel}</dd>
            </div>
          </dl>

          <div className="messangerNotice">
            <Radio size={16} />
            <span>Open directly with `?view=messanger` when you want the handset and the debug wiring together.</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Messanger;

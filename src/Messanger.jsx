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
  if (stored && stored.trim()) return stored.trim();
  const generated = createSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
};

const getInitialForceMock = () => {
  if (typeof window === 'undefined') return false;
  const stored = `${window.localStorage.getItem(MOCK_STORAGE_KEY) || ''}`.trim().toLowerCase();
  return stored === '1' || stored === 'true' || stored === 'yes';
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

const formatMessageTime = (createdAt, pending = false) => {
  if (pending) return 'sending';
  if (!createdAt) return '';
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return '';
  try {
    return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(parsed);
  } catch {
    return '';
  }
};

const MessageCard = ({ message }) => {
  const label = message.sender === 'system' ? 'Storyteller Society' : 'You';
  const timeLabel = formatMessageTime(message.createdAt, message.pending);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`messangerMessage messangerMessage--${message.sender}${message.pending ? ' is-pending' : ''}`}
    >
      <div className="messangerMessage__meta">
        <span>{label}</span>
        <span>{message.pending ? 'Outbound' : message.type === 'initial' ? 'Boot' : 'Secure'}</span>
      </div>
      <div className="messangerMessage__body">{message.text}</div>
      {timeLabel ? (
        <div className="messangerMessage__footer">
          <span>{timeLabel}</span>
        </div>
      ) : null}
    </motion.article>
  );
};

export default function Messanger({ start = true, onCurtainDropComplete }) {
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
  const threadEndRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MOCK_STORAGE_KEY, forceMock ? 'true' : 'false');
  }, [forceMock]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pendingMessage, sending]);

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
        if (active) setError(err.message || 'Unable to load messenger conversation.');
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
    if (!chatEnded || typeof onCurtainDropComplete !== 'function') return undefined;
    const timer = window.setTimeout(() => {
      onCurtainDropComplete();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [chatEnded, onCurtainDropComplete]);

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
        hasChatEnded: false,
        createdAt: ''
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

  const threadStateLabel = chatEnded ? 'Thread sealed' : 'Waiting for your note';
  const transmissionModeLabel = runtime?.mocked || forceMock ? 'Mock transmission' : 'Live transmission';

  return (
    <div className={`messangerScene${chatEnded ? ' is-ended' : ''}`} data-testid="messanger">
      <div className="messangerScene__grain" />
      <div className="messangerScene__veil" />

      <div className="messangerFrame">
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
            <span className="messangerModeSwitch__label">{forceMock ? 'Mock' : 'Live'}</span>
          </label>
        </div>

        <div className="messangerPhone">
          <div className="messangerPhone__bezel" aria-hidden="true">
            <span className="messangerPhone__camera" />
            <span className="messangerPhone__speaker" />
          </div>

          <div className="messangerPhone__screen">
            <div className="messangerStatusBar">
              <span>The Society</span>
              <span>signal weak</span>
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
                    {transmissionModeLabel}
                  </span>
                  <span className="messangerChip">{chatEnded ? 'Sealed' : 'Open'}</span>
                </div>
              </header>

              <div className="messangerConsole__radioScale" aria-hidden="true">
                <span className="messangerConsole__radioScaleDot" />
                <span className="messangerConsole__radioScaleNeedle" />
              </div>

              <div className="messangerThread">
                <div className="messangerThread__datePill">Dispatch line - {DEFAULT_SCENE_ID}</div>

                {loading ? (
                  <div className="messangerBanner">
                    <LoaderCircle size={16} className="spin" />
                    <span>Loading conversation from the archive.</span>
                  </div>
                ) : null}

                {error ? (
                  <div className="messangerBanner is-error" role="alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                ) : null}

                {!loading && !error && threadMessages.length === 0 ? (
                  <div className="messangerBanner">
                    <span>Awaiting the Society's first dispatch.</span>
                  </div>
                ) : null}

                <AnimatePresence initial={false}>
                  {threadMessages.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </AnimatePresence>

                {sending ? (
                  <div className="messangerTyping" data-testid="messanger-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : null}

                <div ref={threadEndRef} />
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
          </div>

          <div className="messangerPhone__homebar" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

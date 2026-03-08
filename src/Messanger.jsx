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

const normalizeMessages = (payload) => {
  if (!Array.isArray(payload)) return [];
  return payload.map((message, index) => ({
    id: message?.id || `message-${index}`,
    sender: message?.sender === 'user' ? 'user' : 'system',
    text: typeof message?.text === 'string' ? message.text : '',
    type: typeof message?.type === 'string' ? message.type : 'response',
    pending: Boolean(message?.pending),
    hasChatEnded: Boolean(message?.hasChatEnded)
  }));
};

const MessageCard = ({ message }) => (
  <motion.article
    layout
    initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -14 }}
    transition={{ duration: 0.32, ease: 'easeOut' }}
    className={`messangerMessage messangerMessage--${message.sender}${message.pending ? ' is-pending' : ''}`}
  >
    <div className="messangerMessage__meta">
      <span>{message.sender === 'system' ? 'Storyteller Society' : 'Recipient'}</span>
      <span>{message.type === 'initial' ? 'Dispatch' : message.pending ? 'Sending' : 'Cipher'}</span>
    </div>
    <div className="messangerMessage__body">{message.text}</div>
  </motion.article>
);

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

  return (
    <div className={`messangerScene${chatEnded ? ' is-ended' : ''}`}>
      <div className="messangerScene__grain" />
      <div className="messangerScene__veil" />

      <div className="messangerFrame">
        <aside className="messangerDossier">
          <div className="messangerDossier__crest">
            <span className="messangerDossier__eyebrow">Debug View</span>
            <h1>Messanger</h1>
            <p>
              A live console for the Society’s delivery inquiry. This view stays intentionally wired to the
              backend so you can inspect runtime state while reshaping the experience.
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
            <span>Force mock replies on this view</span>
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
              <dd>{chatEnded ? 'Conversation concluded' : 'Awaiting more detail'}</dd>
            </div>
          </dl>

          <div className="messangerNotice">
            <Radio size={16} />
            <span>Open directly with `?view=messanger` for backend debugging.</span>
          </div>
        </aside>

        <section className="messangerConsole">
          <header className="messangerConsole__header">
            <div>
              <span className="messangerConsole__eyebrow">The Storyteller Society</span>
              <h2>Dispatch Correspondence</h2>
            </div>
            <div className="messangerConsole__status">
              <span className={`messangerChip${runtime?.mocked || forceMock ? ' is-mock' : ''}`}>
                {runtime?.mocked || forceMock ? 'Mock circuit' : 'Live circuit'}
              </span>
              <span className="messangerChip">{chatEnded ? 'Sealed' : 'Open'}</span>
            </div>
          </header>

          <div className="messangerThread">
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
            <button type="button" onClick={handleSend} disabled={sending || resetting || !input.trim()}>
              {sending ? <LoaderCircle size={18} className="spin" /> : <Send size={18} />}
              <span>Dispatch</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Messanger;

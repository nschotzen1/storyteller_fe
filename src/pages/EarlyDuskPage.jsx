import React, { useEffect, useRef, useState } from 'react';
import { startChronicle, fetchChronicleState, respondToChat } from '../api/chronicle';
import SocietyChat from '../components/society-chat/SocietyChat';
import './EarlyDuskPage.css';

const ACT_TITLES = {
  SOCIETY_CHAT: 'The Esteemed Storyteller’s Society',
  ARRIVAL_SCENE: 'Early Evening, Near Your Door',
  RESTORATION: 'The Restoration Desk',
  COMPLETE: 'The Route Appears'
};

function readChronicleIdFromUrl() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('chronicle');
}

function writeChronicleIdToUrl(chronicleId) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('chronicle', chronicleId);
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function transcriptToMessages(transcript = []) {
  return transcript.filter((entry) => entry.role === 'society' || entry.role === 'player');
}

export default function EarlyDuskPage() {
  const [chronicleId, setChronicleId] = useState(null);
  const [act, setAct] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    async function freshStart() {
      const started = await startChronicle();
      if (started.error) {
        setError(started.error);
        return;
      }
      writeChronicleIdToUrl(started.data.chronicleId);
      setChronicleId(started.data.chronicleId);
      setAct(started.data.act);
      setMessages(started.data.messages || []);
      setQuestion(started.data.question || null);
    }

    async function bootstrap() {
      const existingId = readChronicleIdFromUrl();
      if (existingId) {
        const result = await fetchChronicleState(existingId);
        if (!result.error) {
          setChronicleId(existingId);
          setAct(result.data.act);
          setMessages(transcriptToMessages(result.data.transcript));
          setQuestion(result.data.pendingQuestion || null);
          return;
        }
        if (result.error.status !== 404) {
          setError(result.error);
          return;
        }
        // dead id: fall through to a fresh start
      }
      await freshStart();
    }

    bootstrap();
  }, []);

  async function handleRespond({ choiceId, freeText }) {
    const option = question.options.find((o) => o.id === choiceId);
    const answeredBeatId = question.beatId;
    setMessages((prev) => [
      ...prev,
      {
        role: 'player',
        beatId: answeredBeatId,
        choiceId,
        choiceLabel: option ? option.label : choiceId,
        ...(freeText ? { freeText } : {})
      }
    ]);
    setQuestion(null);
    setBusy(true);
    const result = await respondToChat(chronicleId, { choiceId, freeText });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessages((prev) => [...prev, ...(result.data.messages || [])]);
    setQuestion(result.data.question || null);
    setAct(result.data.act);
  }

  if (error) {
    return (
      <div className="earlyDuskPage" data-testid="early-dusk-error">
        <p className="earlyDuskError">
          The signal wavers. The Society cannot reach you right now.
        </p>
        <p className="earlyDuskErrorDetail">{error.message}</p>
      </div>
    );
  }

  if (!act) {
    return (
      <div className="earlyDuskPage" data-testid="early-dusk-loading">
        <p className="earlyDuskLoading">Tuning…</p>
      </div>
    );
  }

  return (
    <div className="earlyDuskPage">
      <div className="earlyDuskActPanel" data-testid={`act-panel-${act}`}>
        {act === 'SOCIETY_CHAT' ? (
          <SocietyChat messages={messages} question={question} busy={busy} onRespond={handleRespond} />
        ) : (
          <>
            <h1 className="earlyDuskActTitle">{ACT_TITLES[act] || act}</h1>
            <p className="earlyDuskActHint">{`Act placeholder: ${act} (built in a later plan)`}</p>
          </>
        )}
      </div>
    </div>
  );
}

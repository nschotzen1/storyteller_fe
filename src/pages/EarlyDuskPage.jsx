import React, { useEffect, useState } from 'react';
import { startChronicle, fetchChronicleState } from '../api/chronicle';
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

export default function EarlyDuskPage() {
  const [chronicleId, setChronicleId] = useState(readChronicleIdFromUrl);
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      let id = chronicleId;
      if (!id) {
        const started = await startChronicle();
        if (cancelled) return;
        if (started.error) {
          setError(started.error);
          return;
        }
        id = started.data.chronicleId;
        writeChronicleIdToUrl(id);
        setChronicleId(id);
      }
      const result = await fetchChronicleState(id);
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
        return;
      }
      setState(result.data);
    }

    bootstrap();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (!state) {
    return (
      <div className="earlyDuskPage" data-testid="early-dusk-loading">
        <p className="earlyDuskLoading">Tuning…</p>
      </div>
    );
  }

  return (
    <div className="earlyDuskPage">
      <div className="earlyDuskActPanel" data-testid={`act-panel-${state.act}`}>
        <h1 className="earlyDuskActTitle">{ACT_TITLES[state.act] || state.act}</h1>
        <p className="earlyDuskActHint">
          {state.act === 'SOCIETY_CHAT'
            ? 'A strange message is about to arrive.'
            : `Act placeholder: ${state.act} (built in a later plan)`}
        </p>
      </div>
    </div>
  );
}

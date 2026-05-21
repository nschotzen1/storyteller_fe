import './index.css';
import './App.css';

import React, { useEffect, useState } from 'react';
import CurtainIntro from './CurtainIntro';
import CurtainOutro from './CurtainOutro';
import TypewriterAdminPage from './pages/TypewriterAdminPage';
import TypewriterFramework from './TypewriterFramework';

const VIEW = {
  TYPEWRITER: 'typewriter',
  STORY_ADMIN: 'story-admin'
};

const VIEW_OPTIONS = [
  { id: VIEW.TYPEWRITER, label: 'Typewriter' },
  { id: VIEW.STORY_ADMIN, label: 'Story Admin' }
];

const TYPEWRITER_CURTAIN_PHASE = {
  IDLE: 'idle',
  INTRO: 'intro',
  OUTRO: 'outro'
};

const readInitialView = () => {
  if (typeof window === 'undefined') return VIEW.TYPEWRITER;
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('view');
  if (requested === 'typewriter-admin') {
    return VIEW.STORY_ADMIN;
  }
  if (requested && Object.values(VIEW).includes(requested)) {
    return requested;
  }
  return VIEW.TYPEWRITER;
};

function App() {
  const [view, setView] = useState(readInitialView);
  const [pendingView, setPendingView] = useState(null);
  const [typewriterCurtainPhase, setTypewriterCurtainPhase] = useState(() => (
    readInitialView() === VIEW.TYPEWRITER ? TYPEWRITER_CURTAIN_PHASE.INTRO : TYPEWRITER_CURTAIN_PHASE.IDLE
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [view]);

  const isTypewriterCurtainActive = view === VIEW.TYPEWRITER && typewriterCurtainPhase !== TYPEWRITER_CURTAIN_PHASE.IDLE;

  const handleViewChange = (nextView) => {
    if (nextView === view) return;
    if (isTypewriterCurtainActive) return;

    if (view === VIEW.TYPEWRITER) {
      setPendingView(nextView);
      setTypewriterCurtainPhase(TYPEWRITER_CURTAIN_PHASE.OUTRO);
      return;
    }

    setPendingView(null);
    setView(nextView);
    setTypewriterCurtainPhase(
      nextView === VIEW.TYPEWRITER ? TYPEWRITER_CURTAIN_PHASE.INTRO : TYPEWRITER_CURTAIN_PHASE.IDLE
    );
  };

  const handleTypewriterOutroComplete = () => {
    if (!pendingView) {
      setTypewriterCurtainPhase(TYPEWRITER_CURTAIN_PHASE.IDLE);
      return;
    }

    setView(pendingView);
    setPendingView(null);
    setTypewriterCurtainPhase(
      pendingView === VIEW.TYPEWRITER ? TYPEWRITER_CURTAIN_PHASE.INTRO : TYPEWRITER_CURTAIN_PHASE.IDLE
    );
  };

  return (
    <div className="appShell">
      <nav className={`appViewSwitch ${isTypewriterCurtainActive ? 'appViewSwitch-obscured' : ''}`} aria-label="App views">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={view === option.id ? 'active' : ''}
            onClick={() => handleViewChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      <main className="appMain">
        {view === VIEW.TYPEWRITER && (
          <div className="typewriterViewShell">
            <TypewriterFramework />
            {typewriterCurtainPhase === TYPEWRITER_CURTAIN_PHASE.INTRO ? (
              <CurtainIntro onReveal={() => setTypewriterCurtainPhase(TYPEWRITER_CURTAIN_PHASE.IDLE)} />
            ) : null}
            {typewriterCurtainPhase === TYPEWRITER_CURTAIN_PHASE.OUTRO ? (
              <CurtainOutro onDropComplete={handleTypewriterOutroComplete} />
            ) : null}
          </div>
        )}
        {view === VIEW.STORY_ADMIN && <TypewriterAdminPage />}
      </main>
    </div>
  );
}

export default App;

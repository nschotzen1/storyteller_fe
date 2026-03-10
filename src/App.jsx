import './index.css';
import './FlipCard.css';
import './App.css';

import React, { useEffect, useMemo, useState } from 'react';
import CurtainIntro from './CurtainIntro';
import CurtainOutro from './CurtainOutro';
import StorytellerArenaConsole from './components/storyteller/StorytellerArenaConsole';
import PlayerLogin from './pages/PlayerLogin';
import QuestAdventurePage from './pages/QuestAdventurePage';
import QuestAdminPage from './pages/QuestAdminPage';
import MemorySpreadPage from './pages/MemorySpreadPage';
import ImmersiveRpgPage from './pages/ImmersiveRpgPage';
import TypewriterAdminPage from './pages/TypewriterAdminPage';
import TypewriterFramework from './TypewriterFramework';
import Messanger from './Messanger';

const VIEW = {
  ARENA: 'arena',
  TYPEWRITER: 'typewriter',
  STORY_ADMIN: 'story-admin',
  QUEST: 'quest',
  QUEST_ADMIN: 'quest-admin',
  MEMORY_SPREAD: 'memory-spread',
  MESSANGER: 'messanger',
  IMMERSIVE_RPG: 'immersive-rpg'
};

const VIEW_OPTIONS = [
  { id: VIEW.ARENA, label: 'Arena' },
  { id: VIEW.TYPEWRITER, label: 'Typewriter' },
  { id: VIEW.STORY_ADMIN, label: 'Story Admin' },
  { id: VIEW.MESSANGER, label: 'Messanger' },
  { id: VIEW.QUEST, label: 'Quest' },
  { id: VIEW.QUEST_ADMIN, label: 'Quest Admin' },
  { id: VIEW.MEMORY_SPREAD, label: 'Memory Spread' },
  { id: VIEW.IMMERSIVE_RPG, label: 'Immersive RPG' }
];

const TYPEWRITER_CURTAIN_PHASE = {
  IDLE: 'idle',
  INTRO: 'intro',
  OUTRO: 'outro'
};

const readInitialView = () => {
  if (typeof window === 'undefined') return VIEW.ARENA;
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('view');
  if (requested === 'typewriter-admin') {
    return VIEW.STORY_ADMIN;
  }
  if (requested && Object.values(VIEW).includes(requested)) {
    return requested;
  }
  return VIEW.ARENA;
};

function App() {
  const [view, setView] = useState(readInitialView);
  const [pendingView, setPendingView] = useState(null);
  const [typewriterCurtainPhase, setTypewriterCurtainPhase] = useState(() => (
    readInitialView() === VIEW.TYPEWRITER ? TYPEWRITER_CURTAIN_PHASE.INTRO : TYPEWRITER_CURTAIN_PHASE.IDLE
  ));
  const [login, setLogin] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [view]);

  const arenaContent = useMemo(() => {
    if (!login) {
      return <PlayerLogin onSubmit={setLogin} />;
    }

    return (
      <StorytellerArenaConsole
        key={`${login.sessionId}-${login.playerName}`}
        initialSessionId={login.sessionId}
        initialPlayerName={login.playerName}
        initialPlayerId={login.playerId}
        lockPrimaryPlayerId
      />
    );
  }, [login]);

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
        {view === VIEW.ARENA && arenaContent}
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
        {view === VIEW.QUEST && <QuestAdventurePage />}
        {view === VIEW.QUEST_ADMIN && <QuestAdminPage />}
        {view === VIEW.MEMORY_SPREAD && <MemorySpreadPage />}
        {view === VIEW.MESSANGER && <Messanger />}
        {view === VIEW.IMMERSIVE_RPG && <ImmersiveRpgPage />}
      </main>
    </div>
  );
}

export default App;

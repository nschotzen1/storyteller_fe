import './index.css';
import './FlipCard.css';
import './CurtainIntro.css';
import './App.css';

import React, { useEffect, useMemo, useState } from 'react';
import StorytellerArenaConsole from './components/storyteller/StorytellerArenaConsole';
import PlayerLogin from './pages/PlayerLogin';
import QuestAdventurePage from './pages/QuestAdventurePage';
import QuestAdminPage from './pages/QuestAdminPage';
import MemorySpreadPage from './pages/MemorySpreadPage';
import TypewriterFramework from './TypewriterFramework';

const VIEW = {
  ARENA: 'arena',
  TYPEWRITER: 'typewriter',
  QUEST: 'quest',
  QUEST_ADMIN: 'quest-admin',
  MEMORY_SPREAD: 'memory-spread'
};

const VIEW_OPTIONS = [
  { id: VIEW.ARENA, label: 'Arena' },
  { id: VIEW.TYPEWRITER, label: 'Typewriter' },
  { id: VIEW.QUEST, label: 'Quest' },
  { id: VIEW.QUEST_ADMIN, label: 'Quest Admin' },
  { id: VIEW.MEMORY_SPREAD, label: 'Memory Spread' }
];

const readInitialView = () => {
  if (typeof window === 'undefined') return VIEW.ARENA;
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('view');
  if (requested && Object.values(VIEW).includes(requested)) {
    return requested;
  }
  return VIEW.ARENA;
};

function App() {
  const [view, setView] = useState(readInitialView);
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

  return (
    <div className="appShell">
      <nav className="appViewSwitch" aria-label="App views">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={view === option.id ? 'active' : ''}
            onClick={() => setView(option.id)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      <main className="appMain">
        {view === VIEW.ARENA && arenaContent}
        {view === VIEW.TYPEWRITER && <TypewriterFramework />}
        {view === VIEW.QUEST && <QuestAdventurePage />}
        {view === VIEW.QUEST_ADMIN && <QuestAdminPage />}
        {view === VIEW.MEMORY_SPREAD && <MemorySpreadPage />}
      </main>
    </div>
  );
}

export default App;

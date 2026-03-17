import React, { useEffect, useState } from 'react';
import RoseCourtWellScene from '../components/well/RoseCourtWellScene';

const DEFAULT_WELL_STATE = {
  phase: 'observing',
  latestFragment: '',
  readyForWriting: false,
  draftLine: '',
  submittedLine: '',
  wordCount: 0,
  wordsRemaining: 10,
  fragmentCount: 0
};

function WellDemoPage() {
  const [sceneKey, setSceneKey] = useState(0);
  const [wellState, setWellState] = useState(DEFAULT_WELL_STATE);
  const [lastLine, setLastLine] = useState('');

  const resetScene = () => {
    setSceneKey((value) => value + 1);
    setWellState(DEFAULT_WELL_STATE);
    setLastLine('');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.render_game_to_text = () => JSON.stringify({
      mode: 'well-debug',
      sceneKey,
      lastLine,
      well: wellState
    });

    window.advanceTime = () => {};

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [lastLine, sceneKey, wellState]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        background: 'radial-gradient(circle at 50% -20%, #4b2f1b, #090706 68%)',
        color: '#f5dfb0',
        fontFamily: "'Spectral', Georgia, serif"
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem 1.2rem',
          borderBottom: '1px solid rgba(241, 180, 97, 0.28)',
          background: 'rgba(8, 6, 5, 0.72)'
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#d9b77d' }}>
            Direct Debug View
          </p>
          <h1 style={{ margin: '0.15rem 0 0', fontSize: '1.6rem', fontFamily: "'Cinzel', 'Times New Roman', serif" }}>
            Well of Fragments
          </h1>
        </div>
        <button
          type="button"
          onClick={resetScene}
          style={{
            border: '1px solid rgba(255, 208, 143, 0.7)',
            borderRadius: '999px',
            background: 'linear-gradient(135deg, #d09a48, #8d5928)',
            color: '#1f1309',
            fontWeight: 700,
            padding: '0.55rem 1rem',
            cursor: 'pointer'
          }}
        >
          Reset Scene
        </button>
      </header>

      <main style={{ minHeight: 0, padding: '1rem' }}>
        <div
          style={{
            height: '100%',
            minHeight: '32rem',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(241, 180, 97, 0.32)',
            boxShadow: '0 18px 42px rgba(0, 0, 0, 0.38)'
          }}
        >
          <RoseCourtWellScene
            key={sceneKey}
            onStateChange={setWellState}
            onComplete={setLastLine}
          />
        </div>
      </main>

      <footer
        style={{
          display: 'grid',
          gap: '0.35rem',
          padding: '0.95rem 1.2rem 1.1rem',
          borderTop: '1px solid rgba(241, 180, 97, 0.24)',
          background: 'rgba(8, 6, 5, 0.74)'
        }}
      >
        <p style={{ margin: 0 }}>
          {lastLine
            ? `Last submitted line: "${lastLine}"`
            : wellState.readyForWriting
              ? `Parchment ready. ${wellState.wordsRemaining} words remain.`
              : 'Waiting for the fragments to surface and the parchment to appear.'}
        </p>
        {wellState.latestFragment ? (
          <p style={{ margin: 0, color: '#d9c29d' }}>
            Latest fragment: "{wellState.latestFragment}"
          </p>
        ) : null}
      </footer>
    </div>
  );
}

export default WellDemoPage;

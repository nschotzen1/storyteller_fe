import React, { useEffect, useState } from 'react';
import SceneRuntimePage from '../scene-runtime/SceneRuntimePage';
import { ROSE_COURT_PROLOGUE_RUNTIME_PROFILE } from '../scene-runtime/roseCourtPrologueRuntimeProfile';
import RoseCourtOpeningSequence from './RoseCourtOpeningSequence';
import './RoseCourtProloguePage.css';

function RoseCourtOpeningSequencePreview() {
  const [introState, setIntroState] = useState({
    mode: 'rose-court-opening-sequence',
    phase: 'device',
    label: 'Act I: Weak Carrier'
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const previousRenderGameToText = window.render_game_to_text;
    window.render_game_to_text = () => JSON.stringify(introState);

    return () => {
      if (typeof previousRenderGameToText === 'function') {
        window.render_game_to_text = previousRenderGameToText;
      } else {
        delete window.render_game_to_text;
      }
    };
  }, [introState]);

  return (
    <RoseCourtOpeningSequence
      onStateChange={setIntroState}
    />
  );
}

function RoseCourtProloguePage(props) {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openingSequencePreview') === '1') {
      return <RoseCourtOpeningSequencePreview />;
    }
  }

  return (
    <SceneRuntimePage
      {...props}
      profile={ROSE_COURT_PROLOGUE_RUNTIME_PROFILE}
    />
  );
}

export default RoseCourtProloguePage;

import React, { useEffect, useState } from 'react';
import RoseCourtOpeningSequence from './RoseCourtOpeningSequence';

function RoseCourtMontagePage() {
  const [introState, setIntroState] = useState({
    mode: 'rose-court-opening-sequence',
    phase: 'montage',
    label: 'Act V: forgotten',
    montageBeatId: 'forgotten'
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
      initialPhase="montage"
      onStateChange={setIntroState}
    />
  );
}

export default RoseCourtMontagePage;

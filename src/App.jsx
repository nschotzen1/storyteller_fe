import './index.css';
import './FlipCard.css';
import './CurtainIntro.css';

import React, { useState } from 'react';
import MysteryMessenger from './Messanger';
import CurtainIntro from './CurtainIntro';

function App() {
  const [curtainLifted, setCurtainLifted] = useState(false);
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="relative w-[360px] h-[720px] bg-black isolate overflow-hidden">

        {/* ✨ Card is always mounted */}
        <div className="flip-card w-full h-full z-10">
          <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
            <div className="flip-card-front" onClick={() => setFlipped(true)}>
              <img
                src="/tapestries/intro.png"
                alt="Initial Card"
                className="w-full h-full object-contain rounded-xl shadow-xl"
              />
            </div>
            <div className="flip-card-back">
              <MysteryMessenger />
            </div>
          </div>
        </div>

        {/* 🧵 Curtain overlays card */}
        {!curtainLifted && (
          <CurtainIntro onReveal={() => setCurtainLifted(true)} />
        )}
      </div>
    </div>
  );
}

export default App;

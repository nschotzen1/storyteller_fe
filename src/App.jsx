import './index.css';
import './FlipCard.css';
import React, { useState } from 'react';
import MysteryMessenger from './Messanger';
import CurtainIntro from './CurtainIntro';

function App() {
  const [curtainGone, setCurtainGone] = useState(false);
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="relative w-[360px] h-[720px] bg-black isolate overflow-hidden">

        {/* Stage 1: Curtain with light */}
        {!curtainGone && <CurtainIntro onReveal={() => setCurtainGone(true)} />}

        {/* Stage 2: Flip card after curtain gone */}
        {curtainGone && (
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
        )}
      </div>
    </div>
  );
}

export default App;

import './index.css';
import './FlipCard.css';
import React, { useState } from 'react';
import MysteryMessenger from './MysteryMessenger';
import TapestryIntro from './TapestryIntro';

function App() {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    if (!flipped) setFlipped(true);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="relative w-[360px] h-[720px] bg-black isolate overflow-hidden">
        <div className="flip-card w-full h-full z-10">
          <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
            <div className="flip-card-front" onClick={handleFlip}>
              <img
                src="/tapestries/intro.png"
                alt="Relic"
                className="w-full h-full object-contain rounded-xl shadow-xl"
              />
            </div>
            <div className="flip-card-back">
              <MysteryMessenger />
            </div>
          </div>
        </div>

        {/* Always rendered, visually animated out */}
        <TapestryIntro />
      </div>
    </div>
  );
}

export default App;

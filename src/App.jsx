import './index.css';
import './FlipCard.css';
import './CurtainIntro.css';

import React, { useState } from 'react';
import MysteryMessenger from './Messanger';
import CurtainIntro from './CurtainIntro';

function App() {
  const [curtainLifted, setCurtainLifted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [curtainShouldExpand, setCurtainShouldExpand] = useState(false);
  const [showTimecard, setShowTimecard] = useState(false);
  const [showCircleFade, setShowCircleFade] = useState(false);


  return (
    
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div className={`relative h-[720px] bg-black isolate overflow-hidden transition-all transition-all duration-[3000ms] ease-in-out
 ${
        curtainShouldExpand ? 'w-full max-w-screen-xl' : 'w-[360px]'
    }`}>

        {/* ✨ Flip card is always mounted */}
        <div className="flip-card w-full h-full z-10">
          <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
            {/* Front side of the card */}
            <div className="flip-card-front" onClick={() => setFlipped(true)}>
              <img
                src="/tapestries/intro.png"
                alt="Initial Card"
                className="w-full h-full object-contain rounded-xl shadow-xl"
              />
            </div>

            {/* Back side of the card (chat) */}
            <div className="flip-card-back">
                <MysteryMessenger
                  start={flipped}
                  onCurtainDropComplete={() => { 
                    setCurtainShouldExpand(true); 
                    setTimeout(() => setShowTimecard(true), 4000);
                    setTimeout(() => setShowCircleFade(true), 7000); // 3s after the text

                  }}
                />

                {showTimecard && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center text-white text-center animate-fadeInSlow pointer-events-none">
                    <h1 className="text-4xl md:text-6xl font-[Cinzel] tracking-wide drop-shadow-lg">
                      A few days later…
                    </h1>
                  </div>
                )}
                {showCircleFade && (
                <div className="iris-mask pointer-events-none absolute inset-0 z-60">
                  <div className="iris-circle" />
                </div>
                )}

              </div>

          </div>
        </div>

        {/* 🧵 Curtain overlays the card only until it's lifted */}
        {!curtainLifted && (
          <CurtainIntro onReveal={() => setCurtainLifted(true)} />
        )}
      </div>
    </div>
  );
}

export default App;

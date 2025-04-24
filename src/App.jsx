import './index.css';
import './FlipCard.css';
import './CurtainIntro.css';

import { motion, AnimatePresence } from 'framer-motion';

import React, { useState, useEffect } from 'react';
import MysteryMessenger from './Messanger';
import CurtainIntro from './CurtainIntro';

function App() {
  const [curtainLifted, setCurtainLifted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [curtainShouldExpand, setCurtainShouldExpand] = useState(false);
  const [showTimecard, setShowTimecard] = useState(false);
  const [showCircleFade, setShowCircleFade] = useState(false);
  const [locationLineVisible, setLocationLineVisible] = useState(false);

  // ✨ Trigger second line after timecard shows
  useEffect(() => {
    if (showTimecard) {
      const timeout = setTimeout(() => setLocationLineVisible(true), 1500);
      return () => clearTimeout(timeout);
    }
  }, [showTimecard]);

  

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <div
        className={`relative h-[720px] bg-black isolate overflow-hidden transition-all duration-[3000ms] ease-in-out ${
          curtainShouldExpand ? 'w-full max-w-screen-xl' : 'w-[360px]'
        }`}
      >
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
                
                  setTimeout(() => setShowTimecard(true), 4000);          // Show line 1
                  setTimeout(() => setLocationLineVisible(true), 5500);   // Show line 2
                
                  setTimeout(() => setShowCircleFade(true), 8500);        // Iris begins
                                                           // Fade out both
                }}
                
              />

            
              {showCircleFade && (
                <div className="iris-mask pointer-events-none absolute inset-0 z-50">
                  <div className="iris-circle" />
                </div>
              )}

            </div>
          </div>
        </div>

        <AnimatePresence>
  {showTimecard && (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 8.5, duration: 2 }}
      onAnimationComplete={() => setShowTimecard(false)}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center text-white text-center pointer-events-none space-y-4"
    >
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 2 }}
        className="text-4xl md:text-6xl font-[Cinzel] tracking-wide drop-shadow-lg"
      >
        A few days later…
      </motion.h1>

      {locationLineVisible && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 }}
          className="text-xl md:text-2xl font-mono text-yellow-100/90"
        >
          in the outskirts of the sun-streaked streets of San Juan
        </motion.p>
      )}
      </motion.div>
      )}
      </AnimatePresence>



        {/* 🧵 Curtain overlays the card only until it's lifted */}
        {!curtainLifted && <CurtainIntro onReveal={() => setCurtainLifted(true)} />}
      </div>
    </div>
  );
}

export default App;

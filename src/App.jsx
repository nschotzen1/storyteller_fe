import './index.css';
import './FlipCard.css';
import './CurtainIntro.css';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import MysteryMessenger from './Messanger';
import CurtainIntro from './CurtainIntro';
import NarrativeScene from './NarrativeScene';

function App() {
  const [curtainLifted, setCurtainLifted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [curtainShouldExpand, setCurtainShouldExpand] = useState(false);
  const [showTimecard, setShowTimecard] = useState(false);
  const [showCircleFade, setShowCircleFade] = useState(false);
  const [locationLineVisible, setLocationLineVisible] = useState(false);
  const [shouldFadeText, setShouldFadeText] = useState(false);
  const [hasFadedOut, setHasFadedOut] = useState(false);

  useEffect(() => {
    if (showTimecard) {
      const timeout = setTimeout(() => setLocationLineVisible(true), 1500);
      return () => clearTimeout(timeout);
    }
  }, [showTimecard]);

  useEffect(() => {
    if (showCircleFade) {
      const timeout = setTimeout(() => {
        setShowTimecard(false);
        setLocationLineVisible(false);
      }, 11000);
      return () => clearTimeout(timeout);
    }
  }, [showCircleFade]);

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
            {/* Front side */}
            <div className="flip-card-front" onClick={() => setFlipped(true)}>
              <img
                src="/tapestries/intro.png"
                alt="Initial Card"
                className="w-full h-full object-contain rounded-xl shadow-xl"
              />
            </div>

            {/* Back side (chat + iris) */}
            <div className="flip-card-back">
              <MysteryMessenger
                start={flipped}
                onCurtainDropComplete={() => {
                  setCurtainShouldExpand(true);
                  setTimeout(() => setShowTimecard(true), 4000);
                  setTimeout(() => setLocationLineVisible(true), 5500);
                  setTimeout(() => setShowCircleFade(true), 8500);
                  setTimeout(() => setShouldFadeText(true), 11500);
                  setTimeout(() => {
                    setHasFadedOut(true);
                    setShowTimecard(false);
                    setLocationLineVisible(false);
                    setShouldFadeText(false);
                  }, 14000);
                }}
              />

              {/* Iris */}
              {showCircleFade && (
                <div className="iris-mask pointer-events-none absolute inset-0 z-50">
                  <div className="iris-circle" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 📽 Narrative Scene after fadeout */}
        <AnimatePresence>
          {hasFadedOut && (
            <motion.div
              className="absolute inset-0 z-[100] bg-black letterbox vignette"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2 }}
            >
              <NarrativeScene visible={hasFadedOut} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🕯 Timecard */}
        <AnimatePresence>
          {showTimecard && !hasFadedOut && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: shouldFadeText ? 0 : 1 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 z-[70] flex flex-col items-center justify-center text-white text-center pointer-events-none space-y-4"
            >
              <h1 className="text-4xl md:text-6xl font-[Cinzel] tracking-wide drop-shadow-lg">
                A few days later…
              </h1>
              {locationLineVisible && (
                <p className="text-xl md:text-2xl font-mono text-yellow-100/90">
                  in the outskirts of the sun-streaked streets of San Juan
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🧵 Intro curtain */}
        {!curtainLifted && <CurtainIntro onReveal={() => setCurtainLifted(true)} />}
      </div>
    </div>
  );
}

export default App;

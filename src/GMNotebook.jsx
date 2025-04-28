// src/GMNotebook.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SERVER = 'http://localhost:5001';

const GMNotebook = ({ rollInstruction, onSendResult }) => {
  const [phase, setPhase] = useState('ready'); // ready | rolled | pushed | sending
  const [results, setResults] = useState([]);
  const [pushedResults, setPushedResults] = useState([]);
  const [timer, setTimer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(rollInstruction?.pushTimeoutMs / 1000 || 10);

  const rollDice = (numDice, sides) => {
    return Array.from({ length: numDice }, () => Math.floor(Math.random() * sides) + 1);
  };

  const parseDice = (diceString) => {
    const [num, sides] = diceString.toLowerCase().split('d').map(Number);
    return { num, sides };
  };

  const startRoll = () => {
    const { num, sides } = parseDice(rollInstruction.dice);
    const rolled = rollDice(num, sides);
    setResults(rolled);
    setPhase('rolled');
    startTimeout();
  };

  const pushRoll = () => {
    const { sides } = parseDice(rollInstruction.dice);
    const failedDice = results.filter(r => r < 6); // Only re-roll failures (less than 6)
    if (failedDice.length === 0) {
      console.log("No dice eligible to push."); 
      return; // Nothing to push!
    }
    const pushed = rollDice(failedDice.length, sides);
    setPushedResults(pushed);
    setPhase('pushed');
  };
  

  const startTimeout = () => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          sendResult();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setTimer(interval);
  };

  const sendResult = () => {
    if (timer) clearInterval(timer);
    setTimeLeft(0);
    setPhase('sending');
  
    const payload = {
      check: rollInstruction.check,
      dice: rollInstruction.dice,
      results,
      pushedResults: pushedResults.length ? pushedResults : [],
      finalSuccess: calculateSuccess(results, pushedResults),
      wasPushed: pushedResults.length > 0,
      rolledAt: new Date().toISOString(),
      pushedAt: pushedResults.length > 0 ? new Date().toISOString() : null
    };
  
    console.log("Sending payload:", payload);
    
    fetch(`${SERVER}/api/submitRoll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to submit roll');
        console.log('Roll submitted successfully!');
      })
      .catch(err => {
        console.error('Error submitting roll:', err);
      });
  };
  

  const calculateSuccess = (original, pushed) => {
    const all = [...original, ...pushed];
    return all.some(r => r === 6);
  };

  useEffect(() => {
    if (rollInstruction) {
      // Ready to roll
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [rollInstruction]);

  return (
    <motion.div
      initial={{ opacity: 0, rotate: -12, scale: 0.5, x: 300, y: -100 }}
      animate={{ opacity: 1, rotate: 0, scale: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, rotate: 12, scale: 0.8, x: 300, y: -100 }}
      transition={{ type: 'spring', stiffness: 100, damping: 14 }}
      className="absolute top-10 right-10 z-[85] w-[340px] bg-paper-grid p-5 rounded-md shadow-2xl border border-gray-400/40 text-gray-800 font-mono text-sm"
      style={{
        backgroundImage: `
          url('/textures/paper_texture_rugged.jpg'),
          url('/textures/math_notebook_grid.png')
        `,
        backgroundSize: 'cover, contain',
        backgroundBlendMode: 'multiply',
        backgroundRepeat: 'no-repeat, repeat',
      }}
    >
      <h2 className="text-lg font-bold mb-3 underline decoration-dashed decoration-gray-500">GM Notebook</h2>

      <div className="space-y-2">
        <div className="italic">{rollInstruction.check}</div>
        <div>Rolling {rollInstruction.dice}:</div>
        <div className="font-bold">
          {results.join(', ')}
        </div>
        {pushedResults.length > 0 && (
          <div className="font-bold text-yellow-600">
            Pushed: {pushedResults.join(', ')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-5">
        {phase === 'ready' && (
          <button
            onClick={startRoll}
            className="tooltip-btn"
            title="Roll Dice 🎲"
          >
            🎲
          </button>
        )}

        {(phase === 'rolled' && rollInstruction.canPush) && (
          <button
            onClick={pushRoll}
            className="tooltip-btn"
            title="Push Roll ✊"
          >
            ✊
          </button>
        )}

        {(phase === 'rolled' || phase === 'pushed') && (
          <button
            onClick={sendResult}
            className="tooltip-btn"
            title="Send Result 📨"
          >
            📨
          </button>
        )}

        {phase === 'sending' && (
          <div className="text-green-700 text-sm animate-pulse">
            Sending...
          </div>
        )}
      </div>

      {phase !== 'ready' && (
        <div className="text-xs text-gray-600 mt-2">
          Auto sending in {timeLeft}s...
        </div>
      )}
    </motion.div>
  );
};

export default GMNotebook;

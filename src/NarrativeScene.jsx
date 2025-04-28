import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import PlayerInput from './PlayerInput';
import GMNotebook from './GMNotebook';

const SERVER = 'http://localhost:5001'; // <- Your backend domain

const classMap = {
  font: {
    mono: 'font-mono',
    cinzel: 'font-[Cinzel]',
    serif: 'font-serif',
    sans: 'font-sans',
  },
  size: {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
  },
};

const NarrativeScene = ({ visible }) => {
  const [fetchedScript, setFetchedScript] = useState([]);
  const [visibleLines, setVisibleLines] = useState([]);
  const [showNotebook, setShowNotebook] = useState(false);

  // 👇 FIRST: fetch narration script from backend
  useEffect(() => {
    if (!visible) return;

    fetch(`${SERVER}/api/getNarrationScript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sceneId: "opening_scene" }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch narration script');
        return response.json();
      })
      .then(data => {
        console.log('Narration script received:', data);
        setFetchedScript(data);
      })
      .catch(err => {
        console.error('Error fetching narration script:', err);
      });
  }, [visible]);

  // 👇 SECOND: seed the fetchedScript into visibleLines
  useEffect(() => {
    if (!fetchedScript.length) return;

    let timeouts = [];

    fetchedScript.forEach((entry) => {
      timeouts.push(
        setTimeout(() => {
          setVisibleLines(prev => [...prev, { ...entry, wordsRevealed: 0 }]);
        }, entry.delay)
      );
    });

    return () => timeouts.forEach(clearTimeout);
  }, [fetchedScript]);

  // 👇 THIRD: type word-by-word
  useEffect(() => {
    if (!visibleLines.length) return;

    const interval = setInterval(() => {
      setVisibleLines(prevLines => {
        return prevLines.map((line) => {
          if (line.wordsRevealed === undefined) return line;

          const totalWords = line.text.split(' ').length;
          return line.wordsRevealed < totalWords
            ? { ...line, wordsRevealed: line.wordsRevealed + 1 }
            : { ...line, wordsRevealed: undefined };
        });
      });
    }, 80);

    return () => clearInterval(interval);
  }, [visibleLines.length]);

  return (
    <div className="relative w-full h-full letterbox vignette">
      
      {/* ✍️ Narration Lines */}
      <div className="absolute top-10 left-10 z-[80] text-left space-y-4 max-w-xl pointer-events-none">
        {visibleLines.map((entry, idx) => {
          const fontClass = classMap.font[entry.font] || 'font-mono';
          const sizeClass = classMap.size[entry.size] || 'text-base';
          const italicClass = entry.italic ? 'italic' : '';
          const colorClass = entry.color || 'text-white';

          const words = entry.text.split(' ');
          const shownWords = entry.wordsRevealed !== undefined ? words.slice(0, entry.wordsRevealed).join(' ') : entry.text;

          return (
            <motion.p
              key={idx}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className={`leading-relaxed drop-shadow ${fontClass} ${sizeClass} ${colorClass} ${italicClass}`}
            >
              {shownWords}
            </motion.p>
          );
        })}
      </div>

      {/* 📒 GM Notebook */}
      <GMNotebook
        rollInstruction={{
          check: "Observation + Wits",
          dice: "6d6",
          canPush: true,
          pushCondition: "optional",
          pushTimeoutMs: 10000,
        }}
        onSendResult={(payload) => {
          console.log('Result to send:', payload);
          // TODO: POST payload to backend API
        }}
      />

      {/* 👤 Player Input */}
      <PlayerInput />
    </div>
  );
};

export default NarrativeScene;

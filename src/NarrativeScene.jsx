import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import PlayerInput from './PlayerInput';
import GMNotebook from './GMNotebook';

const SERVER = 'http://localhost:5001';

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
  const [requiredRolls, setRequiredRolls] = useState(null);
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('sessionId');
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('sessionId', newId);
    return newId;
  });

  // 👉 Fetch narration script
  useEffect(() => {
    if (!visible) return;

    fetch(`${SERVER}/api/getNarrationScript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, sceneId: "opening_scene" }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch narration script');
        return response.json();
      })
      .then(data => {
        console.log('Narration script received:', data);
        setFetchedScript(data.narrationScript || []);
        setRequiredRolls(data.required_rolls || null);
      })
      .catch(err => {
        console.error('Error fetching narration script:', err);
      });
  }, [visible, sessionId]);

  // 👉 Seed narration lines based on delays
  useEffect(() => {
    if (!fetchedScript.length) return;

    let timeouts = [];

    fetchedScript.forEach((entry) => {
      const timeoutId = setTimeout(() => {
        setVisibleLines(prev => [...prev, { ...entry, wordsRevealed: 0 }]);
      }, entry.delay);
      timeouts.push(timeoutId);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [fetchedScript]);

  // 👉 Animate word-by-word
  useEffect(() => {
    if (!visibleLines.length) return;

    const interval = setInterval(() => {
      setVisibleLines(prevLines => 
        prevLines.map((line) => {
          if (line.wordsRevealed === undefined) return line;
          const totalWords = line.text.split(' ').length;
          return line.wordsRevealed < totalWords
            ? { ...line, wordsRevealed: line.wordsRevealed + 1 }
            : { ...line, wordsRevealed: undefined };
        })
      );
    }, 80);

    return () => clearInterval(interval);
  }, [visibleLines.length]);

  // 👉 Handle player response
  const handlePlayerResponse = (playerContent) => {
    fetch(`${SERVER}/api/getNarrationScript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, sceneId: "opening_scene", content: playerContent }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch updated script');
        return response.json();
      })
      .then(data => {
        console.log('Updated narration script received:', data);
        setFetchedScript(data.narrationScript || []);
        setRequiredRolls(data.required_rolls || null);
        setVisibleLines([]); // Reset visible lines for new entries
      })
      .catch(err => {
        console.error('Error sending player response:', err);
      });
  };

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

      {/* 📒 GM Notebook if required */}
      {requiredRolls && (
        <GMNotebook
          rollInstruction={{
            check: requiredRolls.check,
            dice: requiredRolls.dice,
            canPush: requiredRolls.canPush,
            pushCondition: "optional",
            pushTimeoutMs: 10000,
          }}
          onSendResult={(payload) => {
            console.log('Result to send:', payload);
            // You can POST this payload to server if needed
          }}
        />
      )}

      {/* 👤 Player Input */}
      <PlayerInput onSend={handlePlayerResponse} />

    </div>
  );
};

export default NarrativeScene;

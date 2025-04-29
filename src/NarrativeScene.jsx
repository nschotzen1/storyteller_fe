import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

  const [bookmarks, setBookmarks] = useState([
    { id: 'typewriter',  unlocked: true, texture: '/bookmarks/typewriter.png' },
    { id: 'journal',  unlocked: true, texture: '/bookmarks/journal.png' },
    { id: 'cards', unlocked: true, texture: '/bookmarks/cards.png' },
  ]);

  const [activeFramework, setActiveFramework] = useState('typewriter');

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
        setFetchedScript(data.narrationScript || []);
        setRequiredRolls(data.required_rolls || null);
      })
      .catch(err => {
        console.error('Error fetching narration script:', err);
      });
  }, [visible, sessionId]);

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
        setFetchedScript(data.narrationScript || []);
        setRequiredRolls(data.required_rolls || null);
        setVisibleLines([]); // Reset lines when new input happens
      })
      .catch(err => {
        console.error('Error sending player response:', err);
      });
  };

  return (
    <div className="relative w-full h-full letterbox vignette">

      {/* 📚 Bookmarks on left side */}
      {/* 📚 Bookmarks on RIGHT side */}
      <div className="fixed top-20 right-0 flex flex-col gap-6 pr-1 z-[2000] items-end pointer-events-auto">


      {bookmarks.map((b, i) => (
        b.unlocked && (
          <motion.button
            key={b.id}
            onClick={() => setActiveFramework(b.id)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.2 + i * 0.1 }}
            className={`bookmark-img ${activeFramework === b.id ? 'active-bookmark' : ''}`}
            style={{ backgroundImage: `url(${b.texture})` }}
          />
        )
      ))}
      </div>


      {/* ✍️ Main Narration Area */}
      <div className="absolute top-0 left-0 w-full h-full p-16 pt-28 space-y-4 overflow-y-auto pointer-events-none">
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

      {/* 📒 Frameworks */}
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
          }}
        />
      )}

      {/* 👤 Player Input */}
      <PlayerInput onSend={handlePlayerResponse} />

    </div>
  );
};

export default NarrativeScene;

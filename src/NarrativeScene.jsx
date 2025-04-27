import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import PlayerInput from './PlayerInput';

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

const exampleRolls = [
  {
    check: "Observation + Wits",
    dice: "6d6",
    results: [2, 5, 6, 1, 3, 4],
    success: true,
    notes: "Found hidden passage",
  },
  {
    check: "Sanity Check",
    dice: "1d20",
    results: [18],
    success: false,
    notes: "Minor Madness",
  },
];


const NarrativeScene = ({ visible }) => {
  const [visibleLines, setVisibleLines] = useState([]);

  const fullScript = [
    { text: "It's been a few days since that strange messaging correspondence...", font: "mono", size: "lg", color: "text-white", delay: 0 },
    { text: "Something about a typewriter... you almost forgot.", font: "cinzel", size: "2xl", color: "text-yellow-100", delay: 3000 },
    { text: "It's nearly dusk. The streets of San Juan are dry and hot.", font: "serif", size: "xl", italic: true, color: "text-white", delay: 6000 },
    { text: "You turn the key to your apartment.", font: "mono", size: "lg", color: "text-white", delay: 9000 },
  ];

  useEffect(() => {
    if (!visible) return;

    let timeouts = [];

    fullScript.forEach((entry, idx) => {
      timeouts.push(
        setTimeout(() => {
          setVisibleLines(prev => [...prev, { ...entry, wordsRevealed: 0 }]);
        }, entry.delay)
      );
    });

    return () => timeouts.forEach(clearTimeout);
  }, [visible]);

  useEffect(() => {
    if (!visibleLines.length) return;

    const interval = setInterval(() => {
      setVisibleLines(prevLines => {
        return prevLines.map(line => {
          if (line.wordsRevealed === undefined) return line;

          const totalWords = line.text.split(' ').length;
          if (line.wordsRevealed < totalWords) {
            return { ...line, wordsRevealed: line.wordsRevealed + 1 };
          } else {
            return { ...line, wordsRevealed: undefined }; // Done revealing
          }
        });
      });
    }, 80); // Typing speed here (ms)

    return () => clearInterval(interval);
  }, [visibleLines.length]);

  return (
    <div className="relative w-full h-full letterbox vignette">
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
        
      <PlayerInput />
    </div>
  );
};

export default NarrativeScene;

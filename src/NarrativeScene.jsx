// src/NarrativeScene.jsx
import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import PlayerInput from './PlayerInput'; // ← we’ll make this next

const NarrativeScene = ({ visible }) => {
  const [lines, setLines] = useState([]);
  const fullText = [
    "It's been a few days since that strange messaging correspondence...",
    "Something about a typewriter... you almost forgot.",
    "It's almost night. You walk home through the dusty heat of San Juan.",
    "The air smells like metal and mango. Your key turns in the door."
  ];

  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const interval = setInterval(() => {
      setLines((prev) => [...prev, fullText[i]]);
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 3000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <div className="relative w-full h-full letterbox vignette">
      <div className="absolute top-10 left-10 z-[80] text-left space-y-4 max-w-xl pointer-events-none">
        {lines.map((line, idx) => (
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-white font-mono text-lg leading-relaxed drop-shadow"
          >
            {line}
          </motion.p>
        ))}
      </div>

      <PlayerInput />
    </div>
  );
};

export default NarrativeScene;

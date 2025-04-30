import React, { useState, useEffect, useRef } from 'react';
import './typewriter.css';

const keys = [
  'Q','W','E','R','T','Y','U','I','O','P',
  'A','S','D','F','G','H','J','K','L',
  'Z','X',null,'V','B',null,'N','M'
];

const styleOptions = [
  'key-style-1',
  'key-style-2',
  'key-style-3',
  'key-style-4 ',
  'key-style-5',
  'key-style-6'
];

const randomStyleClass = () =>
  styleOptions[Math.floor(Math.random() * styleOptions.length)];

const TypewriterFramework = () => {
  const [typedText, setTypedText] = useState('');
  const [inputBuffer, setInputBuffer] = useState('');
  const [typingAllowed, setTypingAllowed] = useState(true);
  const [keyStyles, setKeyStyles] = useState(
    keys.map(() => randomStyleClass())
  );

  const containerRef = useRef(null);

  // Handle slow buffer typing
  useEffect(() => {
    if (!inputBuffer.length) return;
    const timeout = setTimeout(() => {
      setTypedText(prev => prev + inputBuffer[0]);
      setInputBuffer(prev => prev.slice(1));
    }, 100);
    return () => clearTimeout(timeout);
  }, [inputBuffer]);

  // Focus container to capture keystrokes
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (!typingAllowed) return;
    if (e.key.length === 1 || e.key === "Enter") {
      e.preventDefault();
      let char = e.key;
      if (e.key === "Enter") char = '\n';
      setInputBuffer(prev => prev + char);
    }
  };

  // Change one key style every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const indexToChange = Math.floor(Math.random() * keyStyles.length);
      const newStyle = randomStyleClass();
      setKeyStyles(prev => {
        const copy = [...prev];
        copy[indexToChange] = newStyle;
        return copy;
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [keyStyles]);

  return (
    <div
      className="typewriter-container"
      tabIndex="0"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <div className="typewriter-paper">
        <pre className="typewriter-text">
          <span>{typedText}</span>
          <span className="striker-cursor" />
        </pre>
      </div>

      <div className="typewriter-keyboard">
        {keys.map((key, idx) => (
          <div
            key={idx}
            className={`typewriter-key ${idx % 3 == 0? 'key-engraved-glyph': ''} ${key === null ? 'key-missing' : ''} ${keyStyles[idx]}`}
          >
            {key}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TypewriterFramework;

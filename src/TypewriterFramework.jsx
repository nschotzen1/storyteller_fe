import React, { useState, useEffect, useRef } from 'react';
import './TypeWriter.css';

const keys = [
  'Q','W','E','R','T','Y','U','I','O','P',
  'A','S','D','F','G','H','J','K','L',
  'Z','X','C',null,'V','B',null,'N','M'
];

const materialOptions = ['stone', 'bone', 'brass'];

const getRandomTexture = (key) => {
  if (!key) return null;
  const material = materialOptions[Math.floor(Math.random() * materialOptions.length)];
  const variant = Math.random() < 0.3 ? '_glow' : ''; // 30% chance to glow
  return `/textures/keys/${key}_1.png`; // replace with `${key}_${material}_1${variant}.png` if you generate variations
};

const playKeySound = () => {
  const audio = new Audio('/sounds/typewriter-clack.mp3');
  audio.volume = 0.3;
  audio.play();
};

const TypewriterFramework = () => {
  const [typedText, setTypedText] = useState('');
  const [inputBuffer, setInputBuffer] = useState('');
  const [typingAllowed, setTypingAllowed] = useState(true);
  const [lastPressedKey, setLastPressedKey] = useState(null);
  const [keyTextures, setKeyTextures] = useState(keys.map(getRandomTexture));
  const containerRef = useRef(null);

  const topRow = ['Q','W','E','R','T','Y','U','I','O','P'];
  const midRow = ['A','S','D','F','G','H','J','K','L'];
  const botRow = ['Z','X','C','V','B','N','M'];

  const generateRow = (rowKeys) => (
    <div className="key-row">
      {rowKeys.map((key, idx) => {
        const texture = keyTextures.find((_, i) => keys[i] === key);
        const offset = Math.floor(Math.random() * 3) - 1;
        const tilt = (Math.random() * 1.4 - 0.7).toFixed(2);
        return (
          <div
            key={key + idx}
            className={`typewriter-key-wrapper ${lastPressedKey === key ? 'key-pressed' : ''}`}
            style={{ '--offset-y': `${offset}px`, '--tilt': `${tilt}deg` }}
          >
            {texture && (
              <img
                src={texture}
                alt={`Key ${key}`}
                className="typewriter-key-img"
              />
            )}
          </div>
        );
      })}
    </div>
  );

  useEffect(() => {
    if (!inputBuffer.length) return;
    const timeout = setTimeout(() => {
      setTypedText(prev => prev + inputBuffer[0]);
      setInputBuffer(prev => prev.slice(1));
    }, 100);
    return () => clearTimeout(timeout);
  }, [inputBuffer]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (!typingAllowed) return;
    const keyChar = e.key.toUpperCase();
    setLastPressedKey(keyChar);

    if (e.key.length === 1 || e.key === "Enter") {
      e.preventDefault();
      const char = e.key === "Enter" ? '\n' : e.key;
      setInputBuffer(prev => prev + char);
    }

    playKeySound();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * keyTextures.length);
      setKeyTextures(prev => {
        const updated = [...prev];
        const key = keys[idx];
        updated[idx] = getRandomTexture(key);
        return updated;
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [keyTextures]);

  useEffect(() => {
    if (!lastPressedKey) return;
    const timeout = setTimeout(() => setLastPressedKey(null), 120);
    return () => clearTimeout(timeout);
  }, [lastPressedKey]);

  return (
    <div
      className="typewriter-container"
      tabIndex="0"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <img
        src="/textures/overlay_grit_shell.png"
        alt="grit shell overlay"
        className="typewriter-overlay"
      />
      <div className="typewriter-paper-frame">
        <div className="typewriter-paper">
            <pre className="typewriter-text">
            <span>{typedText}</span>
            <span className="striker-cursor" />
            </pre>
        </div>
        </div>


      <div className="keyboard-plate">
        {generateRow(topRow)}
        {generateRow(midRow)}
        {generateRow(botRow)}
      </div>
    </div>
  );
};

export default TypewriterFramework;

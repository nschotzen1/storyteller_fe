import React, { useState, useEffect, useRef } from 'react';
import './TypeWriter.css';

const keys = [
  'Q','W','E','R','T','Y','U','I','O','P',
  'A','S','D','F','G','H','J','K','L',
  'Z','X','C','V','B','N','M','THE XEROFAG'
];

const materialOptions = ['stone', 'bone', 'brass'];

const getRandomTexture = (key) => {
  if (!key) return null;
  const material = materialOptions[Math.floor(Math.random() * materialOptions.length)];
  const variant = Math.random() < 0.3 ? '_glow' : '';
  return `/textures/keys/${key}_1.png`;
};

const playKeySound = () => {
  const audio = new Audio('/sounds/typewriter-clack.mp3');
  audio.volume = 0.3;
  audio.play();
};


const playEnterSound = () => {
  const audio = new Audio('/sounds/typewriter-enter.mp3');
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
  const scrollRef = useRef(null);
  const strikerRef = useRef(null);
  const lastLineRef = useRef(null);

  const topRow = ['Q','W','E','R','T','Y','U','I','O','P'];
  const midRow = ['A','S','D','F','G','H','J','K','L'];
  const botRow = ['Z','X','C','V','B','N','M'];

  const generateRow = (rowKeys) => (
    <div className="key-row">
      {rowKeys.map((key, idx) => {
        const globalIdx = keys.findIndex(k => k === key);
        const texture = keyTextures[globalIdx];
        const offset = Math.floor(Math.random() * 3) - 1;
        const tilt = (Math.random() * 1.4 - 0.7).toFixed(2);

        return (
          <div
            key={key + idx}
            className={`typewriter-key-wrapper ${lastPressedKey === key ? 'key-pressed' : ''}`}
            style={{ '--offset-y': `${offset}px`, '--tilt': `${tilt}deg` }}
            onClick={() => {
              setInputBuffer(prev => prev + key);
              setLastPressedKey(key);
              playKeySound();
            }}
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
    const char = inputBuffer[0];
    const timeout = setTimeout(() => {
      setTypedText(prev => prev + char);
      setInputBuffer(prev => prev.slice(1));

      if (char === '\n' && strikerRef.current) {
        strikerRef.current.classList.add('striker-return');
        const timeout = setTimeout(() => {
          strikerRef.current.classList.remove('striker-return');
        }, 600);
        return () => clearTimeout(timeout);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [inputBuffer]);


  useEffect(() => {
    if (lastLineRef.current) {
      lastLineRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [typedText]);

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
    if (e.key === "Enter") playEnterSound();
    if (e.key === 'Backspace') {
      e.preventDefault();
      setTypedText(prev => prev.slice(0, -1));
      return;
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
    <div className="paper-scroll-area" ref={scrollRef}>
      <div className="typewriter-text">
        {typedText.split('\n').map((line, idx, arr) => (
          <div key={idx} className="typewriter-line">
            {line}
            {idx === arr.length - 1 && (
              <>
                <span ref={lastLineRef}></span>
                <span className="striker-cursor" ref={strikerRef} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
        </div>


      <div className="storyteller-sigil">
        <img src="/textures/sigil_storytellers_society.png" alt="Storyteller's Society Sigil" />
      </div>


      <div className="keyboard-plate">
        {generateRow(topRow)}
        {generateRow(midRow)}
        {generateRow(botRow)}

        <div className="key-row spacebar-row">
          <div
            className="spacebar-wrapper"
            onClick={() => {
              setInputBuffer(prev => prev + ' ');
              setLastPressedKey(' ');
              playKeySound();
            }}
          >
            <img
              src="/textures/keys/spacebar.png"
              alt="Spacebar"
              className="spacebar-img"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default TypewriterFramework;

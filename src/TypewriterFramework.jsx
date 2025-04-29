import React, { useState, useEffect, useRef } from 'react';
import './typewriter.css';

const TypewriterFramework = () => {
  const [typedText, setTypedText] = useState('');
  const [inputBuffer, setInputBuffer] = useState('');
  const [typingAllowed, setTypingAllowed] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!inputBuffer.length) return;

    const timeout = setTimeout(() => {
      setTypedText(prev => prev + inputBuffer[0]);
      setInputBuffer(prev => prev.slice(1));
    }, 100); // <-- slow typing: 100ms per letter

    return () => clearTimeout(timeout);
  }, [inputBuffer]);

  // Auto focus to container to catch keypresses
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

  const keys = [
    'Q','W','E','R','T','Y','U','I','O','P',
    'A','S','D','F','G','H','J','K','L',
    'Z','X',null,'V','B',null,'N','M'
  ];

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
          <div key={idx} className={`typewriter-key ${key === null ? 'key-missing' : ''}`}>
            {key}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TypewriterFramework;

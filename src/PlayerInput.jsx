import React, { useState, useRef, useEffect } from 'react';

const PlayerInput = ({ pulseSpeed = 'normal', cursorShape = '█' }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const pulseClass = {
    slow: 'animate-heartbeat-slow',
    normal: 'animate-heartbeat',
    fast: 'animate-heartbeat-fast',
  }[pulseSpeed] || 'animate-heartbeat';

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="absolute bottom-10 left-10 z-[90] text-mono text-yellow-200 text-lg flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-yellow-400">{'>'}</span>
        <div className="relative flex items-center w-[600px]">
          <span className="whitespace-pre">{input}</span>
          <span className={`ml-1 ${pulseClass}`}>{cursorShape}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="absolute left-0 top-0 w-full h-full opacity-0 bg-transparent text-transparent caret-transparent"
            placeholder="Type your response..."
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerInput;

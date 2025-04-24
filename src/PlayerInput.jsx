// src/PlayerInput.jsx
import React, { useState } from 'react';

const PlayerInput = () => {
  const [input, setInput] = useState("");

  return (
    <div className="absolute bottom-10 left-10 z-[90] text-mono text-yellow-200 text-lg flex items-center gap-1">
      <span>&gt;</span>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="bg-transparent outline-none border-none w-[600px] placeholder-yellow-500"
        placeholder="type here…"
      />
      <span className="blinking-cursor">▋</span>
    </div>
  );
};

export default PlayerInput;

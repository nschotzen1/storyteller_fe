import React, { useState, useEffect } from 'react';

function TurnPageLever({ level, onPull, canPull, disabled }) {
  const leverImages = [
    '/textures/lever/lever_phase1.png',
    '/textures/lever/lever_phase2.png',
    '/textures/lever/lever_phase3.png',
    '/textures/lever/lever_phase4.png'
  ];
  const [turning, setTurning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const prevLevelRef = React.useRef(level);

  // Play a sound when leverLevel increases
  useEffect(() => {
    if (level !== prevLevelRef.current) {
      if (level > 0 && level <= 3 && level > prevLevelRef.current) {
        const sound = new Audio(`/sounds/lever/lever_${level}.mp3`);
        sound.volume = 0.6;
        sound.play();
      }
      prevLevelRef.current = level;
    }
  }, [level]);

  // Pull/turn lever animation and callback
  const handlePull = () => {
    if (!canPull || disabled || turning) return;
    setTurning(true);
    setTimeout(() => {
      if (onPull) onPull();
      setTurning(false);
      setResetting(true);
      setTimeout(() => setResetting(false), 480); // matches CSS snap back
    }, 440); // matches lever turn duration
  };

  return (
    <div className="turn-page-lever" style={{ userSelect: 'none' }}>
      <img
        src={leverImages[level]}
        alt={`Lever level ${level + 1}`}
        className={[
          "lever-image",
          turning ? "lever-turn" : "",
          resetting ? "lever-reset" : ""
        ].join(" ")}
        style={{
          width: 210,
          height: 210,
          opacity: disabled ? 0.35 : 1,
          cursor: canPull && !disabled ? "pointer" : "not-allowed",
          transition: 'filter 0.3s, opacity 0.3s'
        }}
        draggable={false}
        onClick={handlePull}
      />
      <div
        className="lever-label"
        style={{
          color: canPull && !disabled ? "#ecdca9" : "#6e6051",
          fontSize: "1.23rem",
          marginTop: "0.55em",
          opacity: canPull && !disabled ? 1 : 0.45,
          fontFamily: "'IM Fell English SC', serif",
          textAlign: "center",
          letterSpacing: "0.03em",
          userSelect: "none"
        }}
      >
        Turn Page
      </div>
    </div>
  );
}

export default TurnPageLever;

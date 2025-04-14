// src/CurtainIntro.jsx
import React, { useEffect, useState } from 'react';
import './CurtainIntro.css';

const CurtainIntro = ({ onReveal }) => {
  const [lightOn, setLightOn] = useState(false);
  const [lift, setLift] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setLightOn(true), 1000); // delay before light shows
    return () => clearTimeout(timeout);
  }, []);

  const handleClick = () => {
    if (lift) return;
    setLift(true);
    setTimeout(() => {
      if (onReveal) onReveal();
    }, 6000); // sync with lift animation
  };

  return (
    <div className={`curtain-stage ${lift ? 'lifting' : ''}`} onClick={handleClick}>

      {lightOn && <div className="projector-beam" />}
      <img
        src="/tapestries/curtain.png"
        alt="Curtain"
        className={`curtain-image ${lift ? 'lifted' : ''}`}
      />
    </div>
  );
};

export default CurtainIntro;

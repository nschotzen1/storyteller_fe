import React, { useEffect, useState } from 'react';
import './CurtainIntro.css';

const CurtainIntro = ({ onReveal }) => {
  const [lightOn, setLightOn] = useState(false);
  const [lift, setLift] = useState(false);
  const [hide, setHide] = useState(false);

  // Light fades in after short delay
  useEffect(() => {
    const timeout = setTimeout(() => setLightOn(true), 1000);
    return () => clearTimeout(timeout);
  }, []);

  // Only triggered by user click
  const handleClick = () => {
    if (lift || hide) return;

    setLift(true);

    setTimeout(() => {
      setHide(true);        // Actually remove curtain from DOM
      if (onReveal) onReveal(); // Flip card only after curtain is gone
    }, 6500); // Match your animation
  };

  if (hide) return null;

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

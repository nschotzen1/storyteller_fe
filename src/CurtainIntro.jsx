import React, { useEffect, useState } from 'react';
import './CurtainIntro.css';

const CurtainIntro = ({
  onReveal,
  onLiftStart,
  lightDelayMs = 1000,
  revealDelayMs = 7000
}) => {
  const [lightOn, setLightOn] = useState(false);
  const [lift, setLift] = useState(false);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setLightOn(true), lightDelayMs);
    return () => clearTimeout(timeout);
  }, [lightDelayMs]);

  const handleClick = () => {
    if (lift || hide) return;

    onLiftStart?.();
    setLift(true);

    setTimeout(() => {
      setHide(true);
      if (onReveal) onReveal();
    }, revealDelayMs);
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

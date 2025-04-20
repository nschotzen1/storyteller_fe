import React, { useEffect, useState } from 'react';
import './CurtainIntro.css';

const CurtainIntro = ({ onReveal }) => {
  const [lightOn, setLightOn] = useState(false);
  const [lift, setLift] = useState(false);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setLightOn(true), 1000);
    return () => clearTimeout(timeout);
  }, []);

  const handleClick = () => {
    if (lift || hide) return;

    setLift(true);

    setTimeout(() => {
      setHide(true);
      if (onReveal) onReveal();
    }, 7000);
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

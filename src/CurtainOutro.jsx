import React, { useEffect, useState } from 'react';
import './CurtainIntro.css';

const CurtainOutro = ({ onDropComplete }) => {
  const [dropStarted, setDropStarted] = useState(false);
  const [expand, setExpand] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setDropStarted(true), 100);      // Start drop
    const t2 = setTimeout(() => onDropComplete?.(), 2800);       // Notify App to expand container
    const t3 = setTimeout(() => setExpand(true), 3000);          // Begin curtain horizontal growth

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDropComplete]);

  return (
    <div className={`curtain-stage lifting ${expand ? 'widescreen' : ''}`}>
      <div className="projector-beam" />
      <img
        src="/tapestries/curtain.png"
        alt="Curtain"
        className={`curtain-image ${dropStarted ? 'drop' : ''}`}
      />
    </div>
  );
};

export default CurtainOutro;

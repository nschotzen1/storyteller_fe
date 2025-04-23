import React, { useEffect, useState } from 'react';
import './CurtainIntro.css'; // reuse the same CSS for symmetry

const CurtainOutro = () => {
  const [drop, setDrop] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDrop(true), 100); // small delay to start animation
    return () => clearTimeout(timeout);
  }, []);

  if (!drop) return null;

  return (
    <div className="curtain-stage lifting">
      <div className="projector-beam" />
      <img
        src="/tapestries/curtain.png"
        alt="Curtain"
        className="curtain-image drop" // add .drop override in css
      />
    </div>
  );
};

export default CurtainOutro;

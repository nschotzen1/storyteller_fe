import React, { useState } from 'react';
import './TapestryIntro.css';

const TapestryIntro = () => {
  const [fade, setFade] = useState(false);

  const handleClick = () => {
    if (!fade) setFade(true);
  };

  return (
    <div className={`tapestry-container ${fade ? 'fully-gone' : ''}`} onClick={handleClick}>
      <img
        src="/tapestries/intro.png"
        alt="Tapestry"
        className={`tapestry-img ${fade ? 'fade-out' : ''}`}
      />
    </div>
  );
};

export default TapestryIntro;

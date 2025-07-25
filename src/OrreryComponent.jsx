import React, { useState } from 'react';
import { archetypes } from './components/orrery/archetypes';
import Figurine from './components/orrery/Figurine';
import './OrreryComponent.css';

function OrreryComponent() {
  const size = 300;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size * 0.35;

  const [positions, setPositions] = useState(
    archetypes.reduce((acc, a, i) => {
      acc[a.id] = 0.8;
      return acc;
    }, {})
  );

  const updatePosition = (id, newRadius) => {
    setPositions((prev) => ({ ...prev, [id]: newRadius }));
  };

  return (
    <div className="orrery-container" style={{ width: size, height: size }}>
      <div className="orrery-background" />
      {archetypes.map((a, i) => {
        const angle = (i / archetypes.length) * 2 * Math.PI;
        return (
          <Figurine
            key={a.id}
            image={a.image}
            angle={angle}
            radius={positions[a.id]}
            centerX={centerX}
            centerY={centerY}
            maxRadius={maxRadius}
            onMove={(r) => updatePosition(a.id, r)}
          />
        );
      })}
    <img
  src="/assets/orrery/octagonal_base.png"
  alt="Orrery Base"
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: size,
    height: size,
    pointerEvents: 'none',
    zIndex: 1,
  }}
/>
    </div>
  );
}

export default OrreryComponent;

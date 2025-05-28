import React, { useRef, useEffect, useState } from 'react';

function Figurine({ image, angle, radius, centerX, centerY, maxRadius, onMove }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);

  const r = radius * maxRadius;
  const x = centerX + r * Math.cos(angle);
  const y = centerY + r * Math.sin(angle);

  const startDrag = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const stopDrag = () => {
    setDragging(false);
  };

  const doDrag = (e) => {
    if (!dragging) return;
    const rect = ref.current?.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    const projectedLength = dx * Math.cos(angle) + dy * Math.sin(angle);
    const clamped = Math.max(0, Math.min(projectedLength, maxRadius));
    const newRadius = clamped / maxRadius;

    onMove(newRadius);
  };

  useEffect(() => {
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  });

  return (
    <div
      ref={ref}
      onMouseDown={startDrag}
      style={{
        position: 'absolute',
        left: x - 32,
        top: y - 32,
        width: 64,
        height: 64,
        backgroundImage: `url(${image})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        cursor: 'grab',
        userSelect: 'none',
        zIndex: 5,
      }}
    />
  );
}

export default Figurine;

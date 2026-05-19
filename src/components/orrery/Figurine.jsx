import React, { useRef, useEffect, useState, useCallback } from 'react';

function Figurine({
  id,
  name,
  image,
  angle,
  radius,
  centerX,
  centerY,
  maxRadius,
  disabled = false,
  onMove,
  onMoveStart,
  onMoveEnd
}) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);

  const r = radius * maxRadius;
  const x = centerX + r * Math.cos(angle);
  const y = centerY + r * Math.sin(angle);

  const startDrag = (e) => {
    if (disabled) return;
    e.preventDefault();
    setDragging(true);
    onMoveStart?.(id);
  };

  const stopDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onMoveEnd?.(id);
  }, [dragging, id, onMoveEnd]);

  const doDrag = useCallback((e) => {
    if (!dragging || disabled) return;
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
  }, [angle, centerX, centerY, disabled, dragging, maxRadius, onMove]);

  useEffect(() => {
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [doDrag, stopDrag]);

  return (
    <div
      ref={ref}
      onMouseDown={startDrag}
      role="slider"
      aria-label={name || id}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(radius * 100)}
      aria-disabled={disabled}
      data-testid={`orrery-figurine-${id}`}
      style={{
        position: 'absolute',
        left: x - 32,
        top: y - 32,
        width: 64,
        height: 64,
        backgroundImage: `url(${image})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.55 : 1,
        userSelect: 'none',
        zIndex: 5,
      }}
    />
  );
}

export default Figurine;

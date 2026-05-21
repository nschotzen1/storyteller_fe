import React, { useRef, useEffect, useState, useCallback } from 'react';

function Figurine({
  id,
  name,
  image,
  angle,
  radius,
  level = 0,
  stageLabel = '',
  maxLevel = 5,
  active = false,
  centerX,
  centerY,
  maxRadius,
  size = 64,
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
  const halfSize = size / 2;

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
      className={`orrery-figurine ${active ? 'orrery-figurine--active' : ''}`.trim()}
      onMouseDown={startDrag}
      role="slider"
      aria-label={`${name || id}: ${stageLabel || `level ${level}`}`}
      aria-valuemin={0}
      aria-valuemax={maxLevel}
      aria-valuenow={level}
      aria-valuetext={stageLabel || `Level ${level}`}
      aria-disabled={disabled}
      data-testid={`orrery-figurine-${id}`}
      title={`${name || id} - ${stageLabel || `Level ${level}`}`}
      style={{
        position: 'absolute',
        left: x - halfSize,
        top: y - halfSize,
        width: size,
        height: size,
        backgroundImage: `url(${image})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        cursor: disabled ? 'not-allowed' : 'grab',
        opacity: disabled ? 0.48 : 1,
        userSelect: 'none',
      }}
    />
  );
}

export default Figurine;

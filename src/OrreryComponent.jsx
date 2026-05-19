import React, { useEffect, useRef, useState } from 'react';
import { archetypes } from './components/orrery/archetypes';
import Figurine from './components/orrery/Figurine';
import {
  clampOrreryRadiusToBudget,
  getOrreryBand,
  getOrreryBandCenter,
  getOrreryRadialDistanceCost,
  normalizeOrreryPositions,
  ORRERY_SLIDE_COMMIT_EPSILON,
  resolveOrreryVibeForPositions
} from './components/orrery/vibes';
import './OrreryComponent.css';

function OrreryComponent({
  positions: controlledPositions,
  radialDistanceBudget = 0,
  currentVibe = '',
  onSlideCommit
}) {
  const size = 300;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size * 0.35;

  const [positions, setPositions] = useState(() => normalizeOrreryPositions(controlledPositions));
  const positionsRef = useRef(positions);
  const dragStartRef = useRef(null);
  const availableRadialDistance = Math.max(0, Math.floor(Number(radialDistanceBudget) || 0));
  const canSlide = availableRadialDistance > 0;

  useEffect(() => {
    const normalized = normalizeOrreryPositions(controlledPositions);
    positionsRef.current = normalized;
    setPositions(normalized);
  }, [controlledPositions]);

  const updatePosition = (id, newRadius) => {
    if (!canSlide) return;
    setPositions((prev) => {
      const dragStartRadius = dragStartRef.current?.id === id
        ? dragStartRef.current.radius
        : prev[id];
      const clampedRadius = clampOrreryRadiusToBudget(
        dragStartRadius,
        newRadius,
        availableRadialDistance
      );
      const next = normalizeOrreryPositions({ ...prev, [id]: clampedRadius });
      positionsRef.current = next;
      return next;
    });
  };

  const handleMoveStart = (id) => {
    if (!canSlide) return;
    dragStartRef.current = {
      id,
      radius: positionsRef.current[id]
    };
  };

  const handleMoveEnd = (id) => {
    if (!canSlide) return;
    const dragStart = dragStartRef.current;
    dragStartRef.current = null;
    if (!dragStart || dragStart.id !== id) return;

    const nextPositions = normalizeOrreryPositions(positionsRef.current);
    const nextRadius = nextPositions[id];
    if (Math.abs(nextRadius - dragStart.radius) < ORRERY_SLIDE_COMMIT_EPSILON) return;
    const radialDistanceCost = getOrreryRadialDistanceCost(dragStart.radius, nextRadius);
    if (radialDistanceCost <= 0) return;
    const snappedPositions = normalizeOrreryPositions({
      ...nextPositions,
      [id]: getOrreryBandCenter(getOrreryBand(nextRadius))
    });
    positionsRef.current = snappedPositions;
    setPositions(snappedPositions);

    onSlideCommit?.({
      archetypeId: id,
      radialDistanceCost,
      positions: snappedPositions,
      vibe: resolveOrreryVibeForPositions(snappedPositions)
    });
  };

  return (
    <div
      className={`orrery-container ${canSlide ? '' : 'orrery-container--locked'}`.trim()}
      data-testid="orrery-control"
      style={{ width: size, height: size }}
    >
      <div className="orrery-background" />
      <div className="orrery-status" aria-live="polite">
        <span data-testid="orrery-slide-budget">{availableRadialDistance}</span>
        <span>{availableRadialDistance === 1 ? ' radial point' : ' radial points'}</span>
        {currentVibe ? <strong>{currentVibe}</strong> : <strong>untuned</strong>}
      </div>
      {archetypes.map((a, i) => {
        const angle = (i / archetypes.length) * 2 * Math.PI;
        return (
          <Figurine
            key={a.id}
            id={a.id}
            name={a.name}
            image={a.image}
            angle={angle}
            radius={positions[a.id]}
            centerX={centerX}
            centerY={centerY}
            maxRadius={maxRadius}
            disabled={!canSlide}
            onMove={(r) => updatePosition(a.id, r)}
            onMoveStart={handleMoveStart}
            onMoveEnd={handleMoveEnd}
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

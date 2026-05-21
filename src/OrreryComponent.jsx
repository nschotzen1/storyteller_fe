import React, { useEffect, useRef, useState } from 'react';
import { archetypes } from './components/orrery/archetypes';
import Figurine from './components/orrery/Figurine';
import {
  clampOrreryLevelToBudget,
  getOrreryLevelFromRadius,
  getOrreryLevelRadius,
  getOrreryRadialDistanceCost,
  getOrreryStage,
  normalizeOrreryVector,
  ORRERY_MAX_LEVEL,
  ORRERY_STAGE_DEFINITIONS,
  positionsFromOrreryVector,
  resolveOrreryVibeForVector
} from './components/orrery/vibes';
import './OrreryComponent.css';

function OrreryComponent({
  vector: controlledVector,
  positions: legacyPositions,
  radialDistanceBudget = 0,
  currentVibe = '',
  onSlideCommit
}) {
  const size = 280;
  const figurineSize = Math.round(size * 0.18);
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = size * 0.39;

  const [vector, setVector] = useState(() => normalizeOrreryVector(controlledVector, legacyPositions));
  const [activeDrag, setActiveDrag] = useState(null);
  const vectorRef = useRef(vector);
  const dragStartRef = useRef(null);
  const availableRadialDistance = Math.max(0, Math.floor(Number(radialDistanceBudget) || 0));
  const canSlide = availableRadialDistance > 0;
  const positions = positionsFromOrreryVector(vector);
  const activeArchetype = activeDrag?.id
    ? archetypes.find((archetype) => archetype.id === activeDrag.id)
    : null;
  const activeStage = activeDrag
    ? getOrreryStage(activeDrag.level)
    : null;

  useEffect(() => {
    const normalized = normalizeOrreryVector(controlledVector, legacyPositions);
    vectorRef.current = normalized;
    setVector(normalized);
  }, [controlledVector, legacyPositions]);

  const updatePosition = (id, newRadius) => {
    if (!canSlide) return;
    setVector((prev) => {
      const dragStartLevel = dragStartRef.current?.id === id
        ? dragStartRef.current.level
        : prev[id];
      const targetLevel = getOrreryLevelFromRadius(newRadius);
      const clampedLevel = clampOrreryLevelToBudget(
        dragStartLevel,
        targetLevel,
        availableRadialDistance
      );
      const next = normalizeOrreryVector({ ...prev, [id]: clampedLevel });
      vectorRef.current = next;
      setActiveDrag({ id, level: clampedLevel });
      return next;
    });
  };

  const handleMoveStart = (id) => {
    if (!canSlide) return;
    const startLevel = vectorRef.current[id];
    dragStartRef.current = {
      id,
      level: startLevel
    };
    setActiveDrag({ id, level: startLevel });
  };

  const handleMoveEnd = (id) => {
    if (!canSlide) return;
    const dragStart = dragStartRef.current;
    dragStartRef.current = null;
    setActiveDrag(null);
    if (!dragStart || dragStart.id !== id) return;

    const nextVector = normalizeOrreryVector(vectorRef.current);
    const nextLevel = nextVector[id];
    const radialDistanceCost = getOrreryRadialDistanceCost(dragStart.level, nextLevel);
    if (radialDistanceCost <= 0) return;
    const snappedVector = normalizeOrreryVector({
      ...nextVector,
      [id]: nextLevel
    });
    vectorRef.current = snappedVector;
    setVector(snappedVector);

    onSlideCommit?.({
      archetypeId: id,
      level: nextLevel,
      fromLevel: dragStart.level,
      radialDistanceCost,
      vector: snappedVector,
      positions: positionsFromOrreryVector(snappedVector),
      vibe: resolveOrreryVibeForVector(snappedVector)
    });
  };

  return (
    <div
      className={`orrery-container ${canSlide ? '' : 'orrery-container--locked'}`.trim()}
      data-testid="orrery-control"
      style={{ width: size, height: size }}
    >
      <div className="orrery-background" />
      <img
        className="orrery-base-plate"
        src="/assets/orrery/octagonal_base.png"
        alt=""
        aria-hidden="true"
      />
      <div className="orrery-rings" aria-hidden="true">
        {ORRERY_STAGE_DEFINITIONS.filter((stage) => stage.level > 0).map((stage) => {
          const ringSize = getOrreryLevelRadius(stage.level) * maxRadius * 2;
          return (
            <div
              key={stage.level}
              className={`orrery-stage-ring orrery-stage-ring--${stage.level}`}
              style={{ width: ringSize, height: ringSize }}
            />
          );
        })}
      </div>
      <div className="orrery-core" aria-hidden="true">
        <span>0</span>
      </div>
      <div className="orrery-stage-legend" aria-hidden="true">
        {ORRERY_STAGE_DEFINITIONS.filter((stage) => stage.level > 0).map((stage) => (
          <span key={stage.level}>{stage.shortLabel}</span>
        ))}
      </div>
      <div className="orrery-status" aria-live="polite">
        <span data-testid="orrery-slide-budget">{availableRadialDistance}</span>
        <span>{availableRadialDistance === 1 ? ' radial point' : ' radial points'}</span>
        <strong>
          {activeArchetype && activeStage
            ? `${activeArchetype.name.replace('The ', '')} ${activeStage.shortLabel}`
            : (currentVibe || 'untuned')}
        </strong>
      </div>
      {archetypes.map((a, i) => {
        const angle = (i / archetypes.length) * 2 * Math.PI;
        const stage = getOrreryStage(vector[a.id]);
        return (
          <Figurine
            key={a.id}
            id={a.id}
            name={a.name}
            image={a.image}
            angle={angle}
            radius={positions[a.id]}
            level={stage.level}
            stageLabel={stage.label}
            maxLevel={ORRERY_MAX_LEVEL}
            active={activeDrag?.id === a.id}
            centerX={centerX}
            centerY={centerY}
            maxRadius={maxRadius}
            size={figurineSize}
            disabled={!canSlide}
            onMove={(r) => updatePosition(a.id, r)}
            onMoveStart={handleMoveStart}
            onMoveEnd={handleMoveEnd}
          />
        );
      })}
    </div>
  );
}

export default OrreryComponent;

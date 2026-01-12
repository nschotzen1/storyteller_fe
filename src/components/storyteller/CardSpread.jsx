import React from 'react';

const SPREAD_PRESETS = [
  { id: 'arc', label: 'Arc', type: 'arc' },
  { id: 'crescent', label: 'Crescent', type: 'arc', curve: 1.25 },
  { id: 'horseshoe', label: 'Horseshoe', type: 'arc', curve: 1.4 },
  {
    id: 'cross',
    label: 'Cross',
    type: 'fixed',
    positions: [
      { x: 0, y: 0, rot: 0 },
      { x: -140, y: 10, rot: -8 },
      { x: 140, y: 10, rot: 8 },
      { x: 0, y: -140, rot: 0 },
      { x: 0, y: 140, rot: 0 },
      { x: 230, y: 0, rot: 90 },
      { x: 320, y: -70, rot: 6 },
      { x: 320, y: 70, rot: -6 }
    ]
  }
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getArcMetrics = (count, preset) => {
  const wide = count > 5;
  const rotStep = wide ? 4 : 6;
  const xStep = wide ? 64 : 78;
  const yStep = wide ? 14 : 10;
  const curve = preset?.curve || 1;
  return { rotStep, xStep, yStep, curve };
};

const computeArcTransform = (index, count, preset) => {
  const t = index - (count - 1) / 2;
  const { rotStep, xStep, yStep, curve } = getArcMetrics(count, preset);
  const rot = clamp(t * rotStep, -18, 18);
  const x = t * xStep;
  const y = Math.abs(t) ** curve * yStep;
  return { x, y, rot };
};

const getSpreadPositions = (count, presetId) => {
  const preset = SPREAD_PRESETS.find((item) => item.id === presetId) || SPREAD_PRESETS[0];
  if (preset.type === 'fixed') {
    return Array.from({ length: count }, (_, index) => preset.positions[index] || { x: 0, y: 0, rot: 0 });
  }
  return Array.from({ length: count }, (_, index) => computeArcTransform(index, count, preset));
};

const CardSpread = ({ cards, presetId, renderCard, getCardKey, selectedMap }) => {
  const positions = getSpreadPositions(cards.length, presetId);

  return (
    <div className="cardSpreadStage">
      <div className="cardSpreadSurface" />
      <div className="cardSpreadRow">
        {cards.map((card, index) => {
          const position = positions[index] || { x: 0, y: 0, rot: 0 };
          const key = getCardKey(card, index);
          const isSelected = selectedMap?.[key];
          const baseZ = 100 + (cards.length - Math.abs(index - (cards.length - 1) / 2) * 10);
          return (
            <div
              key={key}
              className={`cardSpreadItem ${isSelected ? 'selected' : ''}`}
              style={{
                '--spread-x': `${position.x}px`,
                '--spread-y': `${position.y}px`,
                '--spread-rot': `${position.rot}deg`,
                zIndex: isSelected ? 220 : baseZ
              }}
            >
              {renderCard(card, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { SPREAD_PRESETS };
export default CardSpread;

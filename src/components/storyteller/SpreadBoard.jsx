import React from 'react';
import ArenaCard from './ArenaCard';

const SpreadBoard = ({
  layout,
  slots,
  baseUrl,
  selectedMap,
  flippedMap,
  onToggleSelect,
  onToggleFlip,
  onPlaceToSide,
  onPlaceToCenter
}) => (
  <div className="spreadBoard">
    <div className="spreadBoardHeader">
      <div>
        <h2>Your Spread</h2>
        <p>{layout?.label || 'Spread'} formation.</p>
      </div>
    </div>
    <div className="spreadBoardSurface">
      {slots.map((slot) => {
        const card = slot.card;
        const selected = Boolean(selectedMap?.[slot.id]);
        const flipped = Boolean(flippedMap?.[slot.id]);
        return (
          <div
            key={slot.id}
            className={`spreadBoardSlot ${card ? 'filled' : ''} ${selected ? 'selected' : ''}`}
            style={{ '--slot-x': `${slot.x}%`, '--slot-y': `${slot.y}%` }}
          >
            {card ? (
              <div className="spreadBoardCard">
                <ArenaCard
                  card={card}
                  baseUrl={baseUrl}
                  visibility="full"
                  flipped={flipped}
                  selected={selected}
                  size="lg"
                  onSelect={() => onToggleSelect?.(slot.id)}
                  onFlip={() => onToggleFlip?.(slot.id)}
                  label={slot.label}
                />
                <div className="spreadBoardActions">
                  <button type="button" className="ghost" onClick={() => onPlaceToSide?.(slot.id)}>
                    Place to Side
                  </button>
                  <button type="button" className="primary" onClick={() => onPlaceToCenter?.(slot.id)}>
                    Place to Center
                  </button>
                </div>
              </div>
            ) : (
              <span className="spreadBoardSlotLabel">{slot.label}</span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default SpreadBoard;

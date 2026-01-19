import React from 'react';
import ArenaCard from './ArenaCard';
import arenaMap from './arenaMaps/petal_hex_v1.json';

const SIDES_ORDER = ['south', 'north', 'northwest', 'northeast'];

const ArenaBoard = ({
  baseUrl,
  players,
  activePlayerId,
  centerSlots,
  showSlotOverlay = false,
  revealOtherPlayers = false,
  revealMode = 'back',
  backgroundUrl = ''
}) => {
  const backgroundStyle = backgroundUrl
    ? { backgroundImage: `url(${backgroundUrl})` }
    : undefined;

  return (
    <div className="arenaBoard" style={backgroundStyle}>
      <div className="arenaBoardInner">
        {arenaMap.centerSlots.map((slot, index) => {
          const cardSlot = centerSlots[index];
          const visibility = cardSlot?.card
            ? 'full'
            : showSlotOverlay
              ? 'sealed'
              : 'sealed';
          return (
            <div
              key={slot.id}
              className={`arenaSlot center ${showSlotOverlay ? 'debug' : ''}`}
              style={{
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.w}%`,
                height: `${slot.h}%`,
                transform: `translate(-50%, -50%) rotate(${slot.rotate}deg)`
              }}
            >
              {cardSlot?.card ? (
                <ArenaCard card={cardSlot.card} baseUrl={baseUrl} visibility="full" size="sm" />
              ) : (
                <div className="arenaSlotMarker">{slot.id}</div>
              )}
              {showSlotOverlay && <span className="arenaSlotTag">{slot.id}</span>}
            </div>
          );
        })}

        {SIDES_ORDER.map((side, sideIndex) => {
          const player = players[sideIndex];
          const isActive = player?.id === activePlayerId;
          const slots = arenaMap.sideSlots[side] || [];
          const playerSlots = player?.sideSlots || [];
          return slots.map((slot, slotIndex) => {
            const cardSlot = playerSlots[slotIndex];
            const card = cardSlot?.card;
            let visibility = 'sealed';
            if (card) {
              if (isActive || revealOtherPlayers) {
                visibility = revealOtherPlayers && revealMode === 'full' ? 'full' : 'back';
                if (isActive) visibility = 'full';
              } else {
                visibility = 'back';
              }
            }
            return (
              <div
                key={slot.id}
                className={`arenaSlot side ${showSlotOverlay ? 'debug' : ''} ${
                  player?.sealed ? 'sealed' : ''
                }`}
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  width: `${slot.w}%`,
                  height: `${slot.h}%`,
                  transform: `translate(-50%, -50%) rotate(${slot.rotate}deg)`
                }}
              >
                {card ? (
                  <ArenaCard card={card} baseUrl={baseUrl} visibility={visibility} size="sm" />
                ) : (
                  <div className="arenaSlotMarker">{slot.id}</div>
                )}
                {showSlotOverlay && <span className="arenaSlotTag">{slot.id}</span>}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};

export default ArenaBoard;

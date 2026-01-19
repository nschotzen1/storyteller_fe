import React from 'react';
import ArenaCard from './ArenaCard';

const DeckStack = ({ deck = [], baseUrl, onDraw, onShuffle, debugReveal = false }) => {
  const preview = deck.slice(0, 3);
  const topCard = deck[0];
  const visibility = debugReveal ? 'full' : 'back';

  return (
    <div className="deckStackShell">
      <div className="deckStackTop">
        {topCard ? (
          <ArenaCard card={topCard} baseUrl={baseUrl} visibility={visibility} size="md" />
        ) : (
          <div className="deckStackEmpty">Empty</div>
        )}
        <div className="deckStackCount">{deck.length}</div>
        <div className="deckStackPreview">
          {preview.map((card, index) => (
            <div key={card.entityId || card.entityName || `deck-${index}`} className="deckStackPreviewCard">
              <ArenaCard card={card} baseUrl={baseUrl} visibility={visibility} size="sm" />
            </div>
          ))}
        </div>
      </div>
      <div className="deckStackActions">
        <button type="button" className="primary" onClick={onDraw}>
          Draw
        </button>
        <button type="button" className="ghost" onClick={onShuffle}>
          Shuffle
        </button>
      </div>
    </div>
  );
};

export default DeckStack;

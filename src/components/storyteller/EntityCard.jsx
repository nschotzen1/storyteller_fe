import React from 'react';

const EntityCard = ({
  card,
  frontUrl,
  backUrl,
  flipped,
  selected,
  layoutMode,
  onFlip,
  onSelect
}) => {
  const displayEntityId = card.entityId || card.entity_id || card.id || '';

  const handleShellClick = (event) => {
    if (event.target.closest('button')) return;
    onSelect?.();
  };

  const handleFlipClick = (event) => {
    event.stopPropagation();
    onFlip?.();
  };

  const handleSelectClick = (event) => {
    event.stopPropagation();
    onSelect?.();
  };

  return (
    <div
      className={`cardShell ${selected ? 'selected' : ''} ${layoutMode === 'spread' ? 'spread' : ''}`}
      onClick={layoutMode === 'spread' ? handleShellClick : undefined}
      role={layoutMode === 'spread' ? 'button' : undefined}
      tabIndex={layoutMode === 'spread' ? 0 : undefined}
      onKeyDown={(event) => {
        if (layoutMode !== 'spread') return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className={`cardInner ${flipped ? 'flipped' : ''}`}>
        <div
          className="cardFace cardFront"
          onClick={handleFlipClick}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleFlipClick(event);
            }
          }}
        >
          <div className="cardImage">
            {frontUrl ? (
              <img src={frontUrl} alt={`${card.entityName} front`} />
            ) : (
              <div className="cardPlaceholder">Front art unavailable</div>
            )}
          </div>
          <div className="cardContent">
            <h3>{card.entityName || 'Unknown entity'}</h3>
            {displayEntityId && <p className="cardMetaLine">Entity ID: {displayEntityId}</p>}
            <p>{card.front?.prompt || 'No front prompt available.'}</p>
          </div>
        </div>
        <div
          className="cardFace cardBack"
          onClick={handleFlipClick}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleFlipClick(event);
            }
          }}
        >
          <div className="cardImage">
            {backUrl ? (
              <img src={backUrl} alt={`${card.entityName} back`} />
            ) : (
              <div className="cardPlaceholder">Back texture unavailable</div>
            )}
          </div>
          <div className="cardContent">
            <h3>{card.entityName || 'Unknown entity'}</h3>
            {displayEntityId && <p className="cardMetaLine">Entity ID: {displayEntityId}</p>}
            <p>{card.back?.prompt || 'No back prompt available.'}</p>
          </div>
        </div>
      </div>
      <div className="cardActions">
        <button
          type="button"
          className="ghost"
          onClick={handleFlipClick}
          aria-label={flipped ? 'Show front of card' : 'Show back of card'}
          aria-expanded={flipped}
        >
          {flipped ? 'Show Front' : 'Show Back'}
        </button>
        <button
          type="button"
          className="primary"
          onClick={handleSelectClick}
          aria-pressed={selected}
        >
          {selected ? 'Deselect' : 'Select'}
        </button>
      </div>
    </div>
  );
};

export default EntityCard;

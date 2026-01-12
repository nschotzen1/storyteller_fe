import React from 'react';

const StorytellerVoicesBar = ({ storytellers, activeId, onSelect }) => {
  if (!storytellers || storytellers.length === 0) {
    return null;
  }

  return (
    <div className="storytellerVoicesBar" role="tablist" aria-label="Storyteller voices">
      {storytellers.map((storyteller) => (
        <button
          key={storyteller.id}
          type="button"
          className={`voiceChip ${activeId === storyteller.id ? 'active' : ''}`}
          onClick={() => onSelect?.(storyteller)}
          role="tab"
          aria-selected={activeId === storyteller.id}
        >
          <span className="voiceName">{storyteller.name || 'Unnamed'}</span>
          {storyteller.status && (
            <span className={`voiceStatus ${storyteller.status}`}>{storyteller.status}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default StorytellerVoicesBar;

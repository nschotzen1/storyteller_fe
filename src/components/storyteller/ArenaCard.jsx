import React from 'react';

const resolveAssetUrl = (base, url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!base) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

const ArenaCard = ({
  card,
  baseUrl,
  visibility = 'full',
  flipped = false,
  size = 'md',
  onFlip,
  onSelect,
  selected = false,
  label
}) => {
  const displayName = card?.entityName || card?.name || 'Unknown';
  const entityId = card?.entityId || card?.entity_id || card?.id || '';
  const frontUrl = resolveAssetUrl(baseUrl, card?.front?.imageUrl || card?.imageUrl);
  const backUrl = resolveAssetUrl(baseUrl, card?.back?.imageUrl);

  if (visibility === 'sealed') {
    return (
      <div className={`arenaCardShell ${size} sealed`}>
        <span>Sealed</span>
      </div>
    );
  }

  const showBack = visibility === 'back' || flipped;
  const imageUrl = showBack ? backUrl : frontUrl;

  return (
    <div
      className={`arenaCardShell ${size} ${selected ? 'selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className="arenaCardImage">
        {imageUrl ? <img src={imageUrl} alt={displayName} /> : <span>{displayName}</span>}
      </div>
      <div className="arenaCardMeta">
        <span>{label || displayName}</span>
        {entityId && visibility === 'full' && <span className="arenaCardId">{entityId}</span>}
      </div>
      {visibility === 'full' && (
        <button type="button" className="ghost subtle" onClick={onFlip}>
          {showBack ? 'Show Front' : 'Show Back'}
        </button>
      )}
    </div>
  );
};

export default ArenaCard;

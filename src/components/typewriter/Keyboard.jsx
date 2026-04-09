import React from 'react';

const DEFAULT_TEXT_KEY_TEXTURE = '/textures/keys/blank_rect_horizontal_1.png';

const Keyboard = ({
  keys,
  keyRows = [],
  keyTextures,
  storytellerSlots = [],
  textualTypewriterKeys = [],
  inlineTextualKeyTexts = [],
  lastPressedKey,
  pressedStorytellerKey,
  ghostPressedKey,
  typingAllowed,
  onKeyPress,
  onStorytellerPress,
  onTextKeyPress,
  onSpacebarPress,
  playEndOfPageSound,
  KEY_TILT_RANDOM_MAX,
  KEY_TILT_RANDOM_MIN,
  KEY_OFFSET_Y_RANDOM_MAX,
  KEY_OFFSET_Y_RANDOM_MIN,
}) => {
  const normalizeKeyIdentity = (value) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '';

  const getStorytellerSlotForKey = (key) =>
    storytellerSlots.find((slot) => slot.slotKey === key) || null;

  const inlineTextualKeyIdentitySet = new Set(
    inlineTextualKeyTexts
      .map((keyText) => normalizeKeyIdentity(keyText))
      .filter(Boolean)
  );

  const textualKeyByIdentity = textualTypewriterKeys.reduce((map, typewriterKey) => {
    const identity = normalizeKeyIdentity(typewriterKey?.keyText);
    if (identity) {
      map.set(identity, typewriterKey);
    }
    return map;
  }, new Map());

  const getRandomizedWrapperStyle = () => {
    const offsetYMax = KEY_OFFSET_Y_RANDOM_MAX !== undefined ? KEY_OFFSET_Y_RANDOM_MAX : 1;
    const offsetYMin = KEY_OFFSET_Y_RANDOM_MIN !== undefined ? KEY_OFFSET_Y_RANDOM_MIN : -1;
    const tiltMax = KEY_TILT_RANDOM_MAX !== undefined ? KEY_TILT_RANDOM_MAX : 0.7;
    const tiltMin = KEY_TILT_RANDOM_MIN !== undefined ? KEY_TILT_RANDOM_MIN : -0.7;
    const offset = Math.floor(Math.random() * (offsetYMax - offsetYMin + 1)) + offsetYMin;
    const tilt = (Math.random() * (tiltMax - tiltMin) + tiltMin).toFixed(2);
    return { '--offset-y': `${offset}px`, '--tilt': `${tilt}deg` };
  };

  const getStorytellerAltText = (key, storytellerSlot) => {
    if (!storytellerSlot) {
      return `Key ${key}`;
    }
    if (storytellerSlot.storytellerName) {
      return `Storyteller key ${storytellerSlot.storytellerName}`;
    }
    return `Blank storyteller slot ${storytellerSlot.slotIndex + 1}`;
  };

  const renderTextualKey = (typewriterKey, wrapperClassName = '') => {
    if (!typewriterKey) return null;
    const keyImageUrl = typeof typewriterKey.keyImageUrl === 'string' ? typewriterKey.keyImageUrl.trim() : '';
    const visualUrl = keyImageUrl || typewriterKey.textureUrl || DEFAULT_TEXT_KEY_TEXTURE;
    const shouldShowLabel = !keyImageUrl;
    const tooltipText = typeof typewriterKey.playerFacingTooltip === 'string'
      ? typewriterKey.playerFacingTooltip.trim()
      : '';

    return (
      <div
        key={typewriterKey.id || typewriterKey.keyText}
        className={`typewriter-key-wrapper typewriter-text-key-wrapper ${wrapperClassName} ${keyImageUrl ? 'typewriter-text-key-wrapper-image' : ''} ${lastPressedKey === typewriterKey.keyText ? 'key-pressed' : ''} ${!typingAllowed ? 'key-disabled' : ''}`}
        style={getRandomizedWrapperStyle()}
        title={tooltipText || undefined}
        onClick={() => {
          if (!typingAllowed) {
            playEndOfPageSound();
            return;
          }
          onTextKeyPress?.(typewriterKey);
        }}
      >
        <img
          src={visualUrl}
          alt={`Key ${typewriterKey.keyText}`}
          className={`typewriter-key-img ${!typingAllowed ? 'key-disabled-img' : ''}`}
        />
        {shouldShowLabel ? <span className="typewriter-text-key-label">{typewriterKey.keyText}</span> : null}
      </div>
    );
  };

  const renderStandardRow = (rowKeys) => (
    <div className="key-row">
      {rowKeys.map((key) => {
        const globalIdx = keys.findIndex((entry) => entry === key);
        const texture = keyTextures[globalIdx];
        const storytellerSlot = getStorytellerSlotForKey(key);
        const keyIdentity = normalizeKeyIdentity(key);
        const isInlineTextualSlot = !storytellerSlot && inlineTextualKeyIdentitySet.has(keyIdentity);
        const inlineTextualKey = storytellerSlot
          ? null
          : textualKeyByIdentity.get(keyIdentity) || null;

        if (inlineTextualKey) {
          return renderTextualKey(inlineTextualKey, 'typewriter-inline-text-key-wrapper');
        }

        if (isInlineTextualSlot) {
          return (
            <div
              key={key}
              className="typewriter-key-wrapper typewriter-text-key-wrapper typewriter-inline-text-key-wrapper key-disabled"
              style={getRandomizedWrapperStyle()}
              title={key}
              onClick={() => {
                playEndOfPageSound();
              }}
            >
              <img
                src={texture || DEFAULT_TEXT_KEY_TEXTURE}
                alt={`Key ${key}`}
                className="typewriter-key-img key-disabled-img"
              />
            </div>
          );
        }

        const altText = getStorytellerAltText(key, storytellerSlot);
        const isStorytellerPressed = storytellerSlot?.slotKey === pressedStorytellerKey;

        return (
          <div
            key={storytellerSlot?.slotKey || key}
            className={`typewriter-key-wrapper ${storytellerSlot ? 'storyteller-slot-key' : ''} ${storytellerSlot?.filled ? 'storyteller-slot-filled' : ''} ${storytellerSlot?.filled ? 'storyteller-slot-pressable' : ''} ${lastPressedKey === key || isStorytellerPressed ? 'key-pressed' : ''} ${isStorytellerPressed ? 'storyteller-key-held' : ''} ${ghostPressedKey === key ? 'ghost-key-glow' : ''} ${!typingAllowed && !storytellerSlot ? 'key-disabled' : ''}`}
            style={getRandomizedWrapperStyle()}
            title={storytellerSlot?.storytellerName || ''}
            onClick={() => {
              if (storytellerSlot) {
                if (!storytellerSlot.filled || !onStorytellerPress) {
                  return;
                }
                if (!typingAllowed || storytellerSlot.canPress === false || storytellerSlot.typewriterInterventionInFlight) {
                  playEndOfPageSound();
                  return;
                }
                onStorytellerPress(storytellerSlot);
                return;
              }

              if (!typingAllowed) {
                playEndOfPageSound();
                return;
              }

              onKeyPress(key);
            }}
          >
            {texture ? (
              <img
                src={texture}
                alt={altText}
                className={`typewriter-key-img ${!typingAllowed && !storytellerSlot ? 'key-disabled-img' : ''}`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );

  const renderTextualKeyRow = () => {
    const floatingTextualKeys = textualTypewriterKeys.filter((typewriterKey) => {
      const identity = normalizeKeyIdentity(typewriterKey?.keyText);
      return identity && !inlineTextualKeyIdentitySet.has(identity);
    });
    if (!floatingTextualKeys.length) return null;

    return (
      <div className="key-row typewriter-text-key-row" aria-label="Textual typewriter keys">
        {floatingTextualKeys.map((typewriterKey, index) => (
          renderTextualKey(typewriterKey, `typewriter-floating-text-key-wrapper typewriter-floating-text-key-wrapper-${index}`)
        ))}
      </div>
    );
  };

  const resolvedKeyRows = Array.isArray(keyRows) && keyRows.length
    ? keyRows
    : [keys.slice(0, 11), keys.slice(11, 21), keys.slice(21)];

  return (
    <div className="keyboard-plate">
      {resolvedKeyRows.map((rowKeys, rowIndex) => (
        <React.Fragment key={`row-${rowIndex}`}>
          {renderStandardRow(rowKeys)}
        </React.Fragment>
      ))}
      {renderTextualKeyRow()}
      <div className="key-row spacebar-row">
        <div
          className={`spacebar-wrapper ${lastPressedKey === ' ' ? 'key-pressed' : ''} ${ghostPressedKey === ' ' ? 'ghost-key-glow' : ''} ${!typingAllowed ? 'key-disabled' : ''}`}
          onClick={() => {
            if (!typingAllowed) {
              playEndOfPageSound();
              return;
            }
            onSpacebarPress();
          }}
        >
          <img
            src="/textures/keys/spacebar.png"
            alt="Spacebar"
            className={`spacebar-img ${!typingAllowed ? 'key-disabled-img' : ''}`}
          />
        </div>
      </div>
    </div>
  );
};

export default Keyboard;

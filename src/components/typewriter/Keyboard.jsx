import React from 'react';

const DEFAULT_TEXT_KEY_TEXTURE = '/textures/keys/blank_rect_horizontal_1.png';

const Keyboard = ({
  keys,
  keyTextures,
  storytellerSlots = [],
  textualTypewriterKeys = [],
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
  const getStorytellerSlotForKey = (key) =>
    storytellerSlots.find((slot) => slot.slotKey === key) || null;

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

  const renderStandardRow = (rowKeys) => (
    <div className="key-row">
      {rowKeys.map((key) => {
        const globalIdx = keys.findIndex((entry) => entry === key);
        const texture = keyTextures[globalIdx];
        const storytellerSlot = getStorytellerSlotForKey(key);
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
                if (!typingAllowed) {
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
    if (!textualTypewriterKeys.length) return null;

    return (
      <div className="key-row typewriter-text-key-row" aria-label="Textual typewriter keys">
        {textualTypewriterKeys.map((typewriterKey, index) => (
          <div
            key={typewriterKey.id || `${typewriterKey.keyText}-${index}`}
            className={`typewriter-key-wrapper typewriter-text-key-wrapper ${lastPressedKey === typewriterKey.keyText ? 'key-pressed' : ''} ${!typingAllowed ? 'key-disabled' : ''}`}
            style={getRandomizedWrapperStyle()}
            title={typewriterKey.description || typewriterKey.entityName || typewriterKey.keyText}
            onClick={() => {
              if (!typingAllowed) {
                playEndOfPageSound();
                return;
              }
              onTextKeyPress?.(typewriterKey);
            }}
          >
            <img
              src={typewriterKey.textureUrl || DEFAULT_TEXT_KEY_TEXTURE}
              alt={`Key ${typewriterKey.keyText}`}
              className={`typewriter-key-img ${!typingAllowed ? 'key-disabled-img' : ''}`}
            />
            <span className="typewriter-text-key-label">{typewriterKey.keyText}</span>
          </div>
        ))}
      </div>
    );
  };

  const row1Keys = keys.slice(0, 11);
  const row2Keys = keys.slice(11, 21);
  const row3Keys = keys.slice(21);

  return (
    <div className="keyboard-plate">
      {renderStandardRow(row1Keys)}
      {renderStandardRow(row2Keys)}
      {renderStandardRow(row3Keys)}
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

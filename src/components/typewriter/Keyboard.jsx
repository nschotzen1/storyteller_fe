import React from 'react';

// Constants that might be needed by Keyboard if not passed (e.g. for styling or layout if specific)
// For now, assuming all necessary data like SPECIAL_KEY_TEXT comes via props or is handled in callbacks

const Keyboard = ({
  keys, // Full array of key strings: ['Q', ..., 'THE XEROFAG']
  keyTextures, // Array of texture URLs corresponding to `keys`
  storytellerSlots = [],
  lastPressedKey,
  ghostPressedKey, // New prop for ghost typing
  typingAllowed,
  onKeyPress, // (keyText: string) => void
  onXerofagPress, // () => void
  onSpacebarPress, // () => void
  playEndOfPageSound, // () => void;
  // playKeySound and playXerofagHowl are used within the onKeyPress, onXerofagPress handlers
  // passed from TypewriterFramework, so they don't need to be props for Keyboard itself,
  // unless Keyboard calls them directly under some new condition.
  // Based on the prompt, the functions like onKeyPress will call playKeySound.
  // Let's assume playEndOfPageSound is for when typing is not allowed.
  // playKeySound and playXerofagHowl will be invoked by the callback props.

  // Constants from TypewriterFramework that define key layout
  // These could be passed as props or defined here if static
  // For now, assuming keys prop contains all keys in order.
  // The slicing for rows will be done here.
  KEY_TILT_RANDOM_MAX,
  KEY_TILT_RANDOM_MIN,
  KEY_OFFSET_Y_RANDOM_MAX,
  KEY_OFFSET_Y_RANDOM_MIN,
  SPECIAL_KEY_TEXT,
}) => {
  const getStorytellerSlotForKey = (key) =>
    storytellerSlots.find((slot) => slot.slotKey === key) || null;

  const getKeyAltText = (key, storytellerSlot) => {
    if (!storytellerSlot) {
      return `Key ${key}`;
    }
    if (storytellerSlot.storytellerName) {
      return `Storyteller key ${storytellerSlot.storytellerName}`;
    }
    return `Blank storyteller slot ${storytellerSlot.slotIndex + 1}`;
  };

  const generateRow = (rowKeys) => (
    <div className="key-row">
      {rowKeys.map((key) => { // Removed idx from map as globalIdx can be found by key string
        const globalIdx = keys.findIndex(k => k === key);
        const texture = keyTextures[globalIdx];
        const storytellerSlot = getStorytellerSlotForKey(key);
        // Ensure random calculations are done if these props are passed, otherwise use defaults or simplify
        const offsetYMax = KEY_OFFSET_Y_RANDOM_MAX !== undefined ? KEY_OFFSET_Y_RANDOM_MAX : 1; // Default to 1 if not provided
        const offsetYMin = KEY_OFFSET_Y_RANDOM_MIN !== undefined ? KEY_OFFSET_Y_RANDOM_MIN : -1; // Default to -1 if not provided
        const tiltMax = KEY_TILT_RANDOM_MAX !== undefined ? KEY_TILT_RANDOM_MAX : 0.7; // Default to 0.7 if not provided
        const tiltMin = KEY_TILT_RANDOM_MIN !== undefined ? KEY_TILT_RANDOM_MIN : -0.7; // Default to -0.7 if not provided

        const offset = Math.floor(Math.random() * (offsetYMax - offsetYMin + 1)) + offsetYMin;
        const tilt = (Math.random() * (tiltMax - tiltMin) + tiltMin).toFixed(2);

        const isSpecialKey = key === SPECIAL_KEY_TEXT;
        const altText = getKeyAltText(key, storytellerSlot);

        return (
          <div
            key={storytellerSlot?.slotKey || key}
            className={`typewriter-key-wrapper ${storytellerSlot ? 'storyteller-slot-key' : ''} ${storytellerSlot?.filled ? 'storyteller-slot-filled' : ''} ${lastPressedKey === key ? 'key-pressed' : ''} ${ghostPressedKey === key ? 'ghost-key-glow' : ''} ${!typingAllowed && !storytellerSlot ? 'key-disabled' : ''}`}
            style={{ '--offset-y': `${offset}px`, '--tilt': `${tilt}deg` }}
            title={storytellerSlot?.storytellerName || ''}
            onClick={() => {
              if (storytellerSlot) {
                return;
              }
              if (!typingAllowed) {
                playEndOfPageSound(); // This prop is used here
                return;
              }
              if (isSpecialKey) {
                onXerofagPress();
              } else {
                onKeyPress(key);
              }
            }}
          >
            {texture && (
              <img
                src={texture}
                alt={altText}
                className={`typewriter-key-img ${!typingAllowed && !storytellerSlot ? 'key-disabled-img' : ''}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // Determine row slices based on the keys array structure from TypewriterFramework
  // Layout includes one storyteller slot appended to each row.
  // This needs to be robust if `keys` structure changes.
  const row1Keys = keys.slice(0, 11);
  const row2Keys = keys.slice(11, 21);
  const row3Keys = keys.slice(21); // Contains storyteller slot and THE XEROFAG

  return (
    <div className="keyboard-plate">
      {generateRow(row1Keys)}
      {generateRow(row2Keys)}
      {generateRow(row3Keys)}
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
            src="/textures/keys/spacebar.png" // Consider making this texture path a prop if it can vary
            alt="Spacebar"
            className={`spacebar-img ${!typingAllowed ? 'key-disabled-img' : ''}`}
          />
        </div>
      </div>
    </div>
  );
};

export default Keyboard;

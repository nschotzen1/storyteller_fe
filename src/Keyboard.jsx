import React from 'react';

// Constants that might be needed by Keyboard if not passed (e.g. for styling or layout if specific)
// For now, assuming all necessary data like SPECIAL_KEY_TEXT comes via props or is handled in callbacks

const Keyboard = ({
  keys, // Full array of key strings: ['Q', ..., 'THE XEROFAG']
  keyTextures, // Array of texture URLs corresponding to `keys`
  lastPressedKey,
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

  const generateRow = (rowKeys) => (
    <div className="key-row">
      {rowKeys.map((key) => { // Removed idx from map as globalIdx can be found by key string
        const globalIdx = keys.findIndex(k => k === key);
        const texture = keyTextures[globalIdx];
        // Ensure random calculations are done if these props are passed, otherwise use defaults or simplify
        const offsetYMax = KEY_OFFSET_Y_RANDOM_MAX !== undefined ? KEY_OFFSET_Y_RANDOM_MAX : 1; // Default to 1 if not provided
        const offsetYMin = KEY_OFFSET_Y_RANDOM_MIN !== undefined ? KEY_OFFSET_Y_RANDOM_MIN : -1; // Default to -1 if not provided
        const tiltMax = KEY_TILT_RANDOM_MAX !== undefined ? KEY_TILT_RANDOM_MAX : 0.7; // Default to 0.7 if not provided
        const tiltMin = KEY_TILT_RANDOM_MIN !== undefined ? KEY_TILT_RANDOM_MIN : -0.7; // Default to -0.7 if not provided

        const offset = Math.floor(Math.random() * (offsetYMax - offsetYMin + 1)) + offsetYMin;
        const tilt = (Math.random() * (tiltMax - tiltMin) + tiltMin).toFixed(2);
        
        const isSpecialKey = key === SPECIAL_KEY_TEXT;

        return (
          <div
            key={key} // Use key string itself as key, assuming they are unique
            className={`typewriter-key-wrapper ${lastPressedKey === key ? 'key-pressed' : ''} ${!typingAllowed ? 'key-disabled' : ''}`}
            style={{ '--offset-y': `${offset}px`, '--tilt': `${tilt}deg` }}
            onClick={() => {
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
                alt={`Key ${key}`}
                className={`typewriter-key-img ${!typingAllowed ? 'key-disabled-img' : ''}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
  
  // Determine row slices based on the keys array structure from TypewriterFramework
  // Assuming 10 keys in the first row, 9 in the second, and the rest in the third.
  // This needs to be robust if `keys` structure changes.
  const row1Keys = keys.slice(0, 10);
  const row2Keys = keys.slice(10, 19);
  const row3Keys = keys.slice(19); // Contains 'THE XEROFAG'

  return (
    <div className="keyboard-plate">
      {generateRow(row1Keys)}
      {generateRow(row2Keys)}
      {generateRow(row3Keys)}
      <div className="key-row spacebar-row">
        <div
          className={`spacebar-wrapper ${!typingAllowed ? 'key-disabled' : ''}`}
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

import React, { useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_TEXT_KEY_TEXTURE = '/textures/keys/blank_rect_horizontal_1.png';
const SPACE_KEY_ID = '__space__';
const CIRCUIT_ACTIVE_REVEAL_MS = 560;
const CIRCUIT_TRAIL_REVEAL_MS = 420;
const CIRCUIT_PATH_THRESHOLD_MS = 1000;
const CIRCUIT_TRAIL_STEP_DELAY_MS = 46;
const CIRCUIT_STATE_PRIORITY = {
  trail: 1,
  active: 2,
};

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
  const normalizeKeyIdentity = (value) => {
    if (value === ' ') return SPACE_KEY_ID;
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
  };

  const resolvedKeyRows = useMemo(() => (
    Array.isArray(keyRows) && keyRows.length
      ? keyRows
      : [keys.slice(0, 11), keys.slice(11, 21), keys.slice(21)]
  ), [keyRows, keys]);

  const keyPositionByIdentity = useMemo(() => {
    const positions = new Map();
    resolvedKeyRows.forEach((rowKeys, rowIndex) => {
      rowKeys.forEach((key, columnIndex) => {
        const identity = normalizeKeyIdentity(key);
        if (identity) {
          positions.set(identity, { rowIndex, columnIndex });
        }
      });
    });
    return positions;
  }, [resolvedKeyRows]);

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

  const [circuitKeyStates, setCircuitKeyStates] = useState({});
  const circuitKeyStatesRef = useRef({});
  const previousCircuitKeyRef = useRef({ identity: '', timestamp: 0 });
  const circuitTimeoutsRef = useRef(new Map());

  useEffect(() => () => {
    circuitTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    circuitTimeoutsRef.current.clear();
  }, []);

  const clearCircuitTimeout = (timeoutKey) => {
    const existingTimeout = circuitTimeoutsRef.current.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      circuitTimeoutsRef.current.delete(timeoutKey);
    }
  };

  const isCircuitPathKey = (key) => (
    typeof key === 'string'
    && key !== ' '
    && !key.startsWith('STORYTELLER_SLOT_')
  );

  const getKeyAtPosition = (rowIndex, columnIndex) => (
    resolvedKeyRows[rowIndex]?.[columnIndex] || ''
  );

  const getCircuitPathIdentities = (fromIdentity, toIdentity) => {
    const fromPosition = keyPositionByIdentity.get(fromIdentity);
    const toPosition = keyPositionByIdentity.get(toIdentity);
    if (!fromPosition || !toPosition) return [];
    if (fromIdentity === toIdentity) return [];

    const rowDelta = toPosition.rowIndex - fromPosition.rowIndex;
    const columnDelta = toPosition.columnIndex - fromPosition.columnIndex;
    const steps = Math.max(Math.abs(rowDelta), Math.abs(columnDelta));
    if (!steps) return [];

    const pathIdentities = [];
    const seenIdentities = new Set();

    for (let step = 0; step < steps; step += 1) {
      const progress = step / steps;
      const rowIndex = Math.round(fromPosition.rowIndex + rowDelta * progress);
      const columnIndex = Math.round(fromPosition.columnIndex + columnDelta * progress);
      const key = getKeyAtPosition(rowIndex, columnIndex);
      const pathIdentity = normalizeKeyIdentity(key);

      if (
        pathIdentity
        && pathIdentity !== toIdentity
        && !seenIdentities.has(pathIdentity)
        && isCircuitPathKey(key)
      ) {
        seenIdentities.add(pathIdentity);
        pathIdentities.push(pathIdentity);
      }
    }

    return pathIdentities;
  };

  const revealCircuitKey = (identity, state, revealMs) => {
    if (!identity) return;

    const currentState = circuitKeyStatesRef.current[identity];
    if (
      currentState
      && (CIRCUIT_STATE_PRIORITY[currentState] || 0) > (CIRCUIT_STATE_PRIORITY[state] || 0)
    ) {
      return;
    }

    const nextStates = {
      ...circuitKeyStatesRef.current,
      [identity]: state,
    };
    circuitKeyStatesRef.current = nextStates;
    setCircuitKeyStates(nextStates);

    const clearKey = `${identity}:clear`;
    clearCircuitTimeout(clearKey);
    const clearTimeoutId = setTimeout(() => {
      circuitTimeoutsRef.current.delete(clearKey);
      if (!circuitKeyStatesRef.current[identity]) return;
      const next = { ...circuitKeyStatesRef.current };
      delete next[identity];
      circuitKeyStatesRef.current = next;
      setCircuitKeyStates(next);
    }, revealMs);
    circuitTimeoutsRef.current.set(clearKey, clearTimeoutId);
  };

  const queueCircuitReveal = (keyValue) => {
    const identity = normalizeKeyIdentity(keyValue);
    if (!identity) return;

    const now = Date.now();
    const previousCircuitKey = previousCircuitKeyRef.current;
    const shouldRevealPath = Boolean(
      previousCircuitKey.identity
      && previousCircuitKey.identity !== identity
      && now - previousCircuitKey.timestamp <= CIRCUIT_PATH_THRESHOLD_MS
    );

    clearCircuitTimeout(`${identity}:trail`);
    revealCircuitKey(identity, 'active', CIRCUIT_ACTIVE_REVEAL_MS);

    if (shouldRevealPath) {
      getCircuitPathIdentities(previousCircuitKey.identity, identity).forEach((trailIdentity, index) => {
        const revealKey = `${trailIdentity}:trail`;
        clearCircuitTimeout(revealKey);
        const delay = index * CIRCUIT_TRAIL_STEP_DELAY_MS;
        const revealTimeout = setTimeout(() => {
          circuitTimeoutsRef.current.delete(revealKey);
          revealCircuitKey(trailIdentity, 'trail', CIRCUIT_TRAIL_REVEAL_MS);
        }, delay);
        circuitTimeoutsRef.current.set(revealKey, revealTimeout);
      });
    }

    previousCircuitKeyRef.current = { identity, timestamp: now };
  };

  useEffect(() => {
    queueCircuitReveal(lastPressedKey);
  }, [lastPressedKey]);

  useEffect(() => {
    queueCircuitReveal(ghostPressedKey);
  }, [ghostPressedKey]);

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

  const getStorytellerTitle = (storytellerSlot) => {
    if (!storytellerSlot) return '';
    const titleParts = [];
    if (storytellerSlot.storytellerName) {
      titleParts.push(storytellerSlot.storytellerName);
    }
    const stageLabel = typeof storytellerSlot.pressPolicy?.stageLabel === 'string'
      ? storytellerSlot.pressPolicy.stageLabel.trim()
      : '';
    const archetypeLabel = typeof storytellerSlot.archetype?.label === 'string'
      ? storytellerSlot.archetype.label.trim()
      : typeof storytellerSlot.pressPolicy?.archetype?.label === 'string'
        ? storytellerSlot.pressPolicy.archetype.label.trim()
        : '';
    if (archetypeLabel) {
      titleParts.push(archetypeLabel);
    }
    if (stageLabel) {
      titleParts.push(`Next: ${stageLabel}`);
    }
    return titleParts.join(' - ');
  };

  const getCircuitClassName = (keyValue) => {
    const identity = normalizeKeyIdentity(keyValue);
    if (!identity) return '';
    if (circuitKeyStates[identity] === 'active') {
      return 'key-circuit-active';
    }
    return circuitKeyStates[identity] === 'trail' ? 'key-circuit-trail' : '';
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
        className={`typewriter-key-wrapper typewriter-text-key-wrapper ${wrapperClassName} ${keyImageUrl ? 'typewriter-text-key-wrapper-image' : ''} ${lastPressedKey === typewriterKey.keyText ? 'key-pressed' : ''} ${getCircuitClassName(typewriterKey.keyText)} ${!typingAllowed ? 'key-disabled' : ''}`}
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
              className={`typewriter-key-wrapper typewriter-text-key-wrapper typewriter-inline-text-key-wrapper ${getCircuitClassName(key)} key-disabled`}
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
            className={`typewriter-key-wrapper ${storytellerSlot ? 'storyteller-slot-key' : ''} ${storytellerSlot?.filled ? 'storyteller-slot-filled' : ''} ${storytellerSlot?.filled ? 'storyteller-slot-pressable' : ''} ${lastPressedKey === key || isStorytellerPressed ? 'key-pressed' : ''} ${isStorytellerPressed ? 'storyteller-key-held' : ''} ${ghostPressedKey === key ? 'ghost-key-glow' : ''} ${getCircuitClassName(key)} ${!typingAllowed && !storytellerSlot ? 'key-disabled' : ''}`}
            style={getRandomizedWrapperStyle()}
            title={getStorytellerTitle(storytellerSlot)}
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
          className={`spacebar-wrapper ${lastPressedKey === ' ' ? 'key-pressed' : ''} ${ghostPressedKey === ' ' ? 'ghost-key-glow' : ''} ${getCircuitClassName(' ')} ${!typingAllowed ? 'key-disabled' : ''}`}
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

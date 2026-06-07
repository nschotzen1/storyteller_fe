import React from 'react';
import {
  getNextStoryWellLeverValue,
  STORY_WELL_LEVER_LABELS,
} from './storyWellPlaces';

const VALUE_LABELS = {
  '-1': 'outward',
  0: 'neutral',
  1: 'inward',
};

function StoryLever({ leverId, value = 0, x = 50, y = 50, disabled = false, onChange }) {
  const label = STORY_WELL_LEVER_LABELS[leverId] || leverId;
  const nextValue = getNextStoryWellLeverValue(value);

  const handleClick = () => {
    if (disabled) return;
    onChange?.(leverId, nextValue);
  };

  return (
    <button
      type="button"
      className={`story-well-lever story-well-lever--${leverId} story-well-lever--value-${value}`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
      }}
      aria-label={`${label} lever ${VALUE_LABELS[value] || 'neutral'}`}
      aria-pressed={value !== 0}
      disabled={disabled}
      data-testid={`story-well-lever-${leverId}`}
      onClick={handleClick}
    >
      <span className="story-well-lever__socket" aria-hidden="true" />
      <span className="story-well-lever__handle" aria-hidden="true" />
      <span className="story-well-lever__sigil" aria-hidden="true">
        {label.slice(0, 1)}
      </span>
    </button>
  );
}

export default StoryLever;

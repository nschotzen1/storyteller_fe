import React from 'react';
import StoryLever from './StoryLever';
import {
  STORY_WELL_LEVER_IDS,
  STORY_WELL_LEVER_LABELS,
} from './storyWellPlaces';
import './StoryWell.css';

const clampUnit = (value, fallback = 0.5) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0.08, Math.min(0.92, numeric));
};

function StoryWell({
  place,
  leverState = {},
  disabled = false,
  onLeverChange,
}) {
  const cells = Array.isArray(place?.cells) ? place.cells : [];

  return (
    <section className="story-well-shell" aria-label="StoryWell" data-testid="story-well">
      <div className="story-well-readout" aria-live="polite">
        <strong>{place?.title || 'StoryWell'}</strong>
        <span>{place?.textureId || 'untuned'}</span>
      </div>
      <div className="story-well-device">
        <div className="story-well-shadow" aria-hidden="true" />
        <div className="story-well-frame" aria-hidden="true">
          <img
            src="/assets/storywell/reference/02_storywell_frame_reference.png"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className="story-well-basin" aria-hidden="true">
          <img
            src="/assets/storywell/reference/03_inner_basin_star_depth_reference.png"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className="story-well-grid" aria-hidden="true">
          <img
            src="/assets/storywell/reference/04_depth_grid_overlay_reference.png"
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className="story-well-cells" aria-hidden="true">
          {cells.map((cell) => (
            <div
              key={cell.id}
              className={`story-well-cell story-well-cell--${cell.type || 'fragment'}`}
              style={{
                left: `${clampUnit(cell.x) * 100}%`,
                top: `${clampUnit(cell.y) * 100}%`,
                '--cell-depth': Math.max(1, Math.min(6, Number(cell.depth) || 1)),
              }}
              data-testid={`story-well-cell-${cell.id}`}
            >
              <span>{cell.text}</span>
            </div>
          ))}
        </div>
        <div className="story-well-glass" aria-hidden="true" />
        {STORY_WELL_LEVER_IDS.map((leverId, index) => {
          const angle = -90 + index * 60;
          const angleRadians = (angle * Math.PI) / 180;
          const radius = 43;
          return (
            <StoryLever
              key={leverId}
              leverId={leverId}
              value={leverState[leverId] ?? 0}
              x={50 + Math.cos(angleRadians) * radius}
              y={50 + Math.sin(angleRadians) * radius}
              disabled={disabled}
              onChange={onLeverChange}
              label={STORY_WELL_LEVER_LABELS[leverId]}
            />
          );
        })}
      </div>
    </section>
  );
}

export default StoryWell;

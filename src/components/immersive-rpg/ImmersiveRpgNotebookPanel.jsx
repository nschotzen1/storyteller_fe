import React from 'react';
import { Dices, LoaderCircle, NotebookPen } from 'lucide-react';

const formatTimestamp = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat([], {
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed);
};

const formatNotebookModeLabel = (value) => {
  const normalized = `${value || ''}`.trim();
  if (!normalized) return 'Story';
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export default function ImmersiveRpgNotebookPanel({
  notebook,
  sceneId,
  lastRoll,
  activePendingRoll,
  rollForm,
  setRollForm,
  handleRollSubmit,
  isNotebookDrivenRoll,
  rolling
}) {
  const successTrack = notebook.successTrack;
  const successTrackLength = Math.max(
    successTrack?.successesRequired || 0,
    successTrack?.successes || 0
  );

  return (
    <div className="immersiveRpgNotebook">
      <span className="immersiveRpgNotebook__tape immersiveRpgNotebook__tape--left" aria-hidden="true" />
      <span className="immersiveRpgNotebook__tape immersiveRpgNotebook__tape--right" aria-hidden="true" />

      <div className="immersiveRpgPanelHeader">
        <div>
          <span className="immersiveRpgPanelHeader__label">Mechanics Notebook</span>
          <h3>Square Roll Pad</h3>
        </div>
        <NotebookPen size={20} />
      </div>

      <div className="immersiveRpgNotebook__page">
        <div className="immersiveRpgNotebook__statusRow">
          <span className={`immersiveRpgNotebook__mode immersiveRpgNotebook__mode--${notebook.mode}`}>
            {formatNotebookModeLabel(notebook.mode)}
          </span>
          {notebook.updatedAt ? <span className="immersiveRpgNotebook__updated">{formatTimestamp(notebook.updatedAt)}</span> : null}
        </div>

        <h4 className="immersiveRpgNotebook__title">{notebook.title}</h4>
        <p className="immersiveRpgNotebook__prompt">{notebook.prompt}</p>
        {notebook.instruction ? (
          <p className="immersiveRpgNotebook__instruction">{notebook.instruction}</p>
        ) : null}

        {notebook.focusTags?.length ? (
          <div className="immersiveRpgNotebook__tagRow">
            {notebook.focusTags.map((tag) => (
              <span key={tag} className="immersiveRpgNotebook__tag">{tag}</span>
            ))}
          </div>
        ) : null}

        {notebook.scratchLines?.length ? (
          <div className="immersiveRpgNotebook__scratch">
            {notebook.scratchLines.map((line, index) => (
              <p
                key={`${line}-${index}`}
                className="immersiveRpgNotebook__scratchLine"
                style={{ transform: `rotate(${index % 2 === 0 ? -0.9 : 0.75}deg)` }}
              >
                {line}
              </p>
            ))}
          </div>
        ) : null}

        {activePendingRoll ? (
          <div className="immersiveRpgNotebook__rollSummary">
            <span>{activePendingRoll.skill}</span>
            <span>{activePendingRoll.diceNotation}</span>
            <span>{activePendingRoll.difficulty}</span>
          </div>
        ) : null}

        {notebook.diceFaces?.length ? (
          <div className="immersiveRpgNotebook__chips">
            {notebook.diceFaces.map((value, index) => (
              <span
                key={`${sceneId || 'scene'}-${index}-${value}`}
                className={value >= (activePendingRoll?.successThreshold || lastRoll?.successThreshold || 0) ? 'is-success' : ''}
                style={{ transform: `rotate(${index % 2 === 0 ? -4 : 3}deg)` }}
              >
                {value}
              </span>
            ))}
          </div>
        ) : null}

        {successTrackLength > 0 ? (
          <div className="immersiveRpgNotebook__successTrack">
            {Array.from({ length: successTrackLength }, (_, index) => {
              const filled = index < (successTrack?.successes || 0);
              const failed = successTrack?.passed === false && index >= (successTrack?.successes || 0);
              return (
                <span
                  key={`success-${index}`}
                  className={[
                    'immersiveRpgNotebook__successDot',
                    filled ? 'is-filled' : '',
                    failed ? 'is-failed' : ''
                  ].filter(Boolean).join(' ')}
                />
              );
            })}
          </div>
        ) : null}

        <p className="immersiveRpgNotebook__summary">{notebook.resultSummary}</p>
      </div>

      <form className="immersiveRpgNotebook__form" onSubmit={handleRollSubmit}>
        <label>
          <span>Skill</span>
          <input
            value={rollForm.skill}
            onChange={(event) => setRollForm((current) => ({ ...current, skill: event.target.value }))}
            readOnly={isNotebookDrivenRoll}
          />
        </label>
        <label>
          <span>Dice</span>
          <input
            value={rollForm.diceNotation}
            onChange={(event) => setRollForm((current) => ({ ...current, diceNotation: event.target.value }))}
            readOnly={isNotebookDrivenRoll}
          />
        </label>
        <label>
          <span>Threshold</span>
          <input
            type="number"
            value={rollForm.successThreshold}
            onChange={(event) => setRollForm((current) => ({ ...current, successThreshold: Number(event.target.value) || 1 }))}
            readOnly={isNotebookDrivenRoll}
          />
        </label>
        <label>
          <span>Needed</span>
          <input
            type="number"
            value={rollForm.successesRequired}
            onChange={(event) => setRollForm((current) => ({ ...current, successesRequired: Number(event.target.value) || 1 }))}
            readOnly={isNotebookDrivenRoll}
          />
        </label>
        <label className="immersiveRpgNotebook__wide">
          <span>Label</span>
          <input
            value={rollForm.label}
            onChange={(event) => setRollForm((current) => ({ ...current, label: event.target.value }))}
            readOnly={isNotebookDrivenRoll}
          />
        </label>
        <button type="submit" className="immersiveRpgButton immersiveRpgButton--ink" disabled={rolling}>
          {rolling ? <LoaderCircle size={16} className="spin" /> : <Dices size={16} />}
          {isNotebookDrivenRoll ? 'Resolve GM Roll' : 'Resolve Roll'}
        </button>
      </form>
    </div>
  );
}

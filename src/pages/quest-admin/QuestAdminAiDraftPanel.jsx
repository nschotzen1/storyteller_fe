import React, { useEffect, useMemo, useState } from 'react';
import { generateQuestAuthoringDraft } from '../../api/questScreens';

const FIELD_LABELS = {
  sceneName: 'Scene Name',
  sceneTemplate: 'Base Scene Template',
  sceneComponents: 'Attached Components',
  authoringBrief: 'Master Scene Brief',
  phaseGuidance: 'GM Scene Guide',
  visualStyleGuide: 'Scene Visual Guide',
  title: 'Screen Title',
  prompt: 'Screen Text',
  promptGuidance: 'Extra GM Guidance',
  sceneEndCondition: 'Screen End Condition',
  image_prompt: 'Generator Image Prompt',
  referenceImagePrompt: 'Reference Text-to-Image Prompt',
  visualContinuityGuidance: 'Visual Continuity Notes',
  visualTransitionIntent: 'Transition From Nearby Screens',
  textPromptPlaceholder: 'Text Input Placeholder'
};

function asTrimmedString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function formatValuePreview(value) {
  if (value === null || value === undefined || value === '') {
    return 'Empty';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

function getChangeHeading(change) {
  if (!change || typeof change !== 'object') return 'Proposed change';
  if (change.action === 'add_screen') return change.label || 'Add screen';
  if (change.action === 'add_direction') return change.label || 'Add built-in choice';
  if (change.action === 'add_prompt_route') return change.label || 'Add free-text route';
  return change.label || FIELD_LABELS[change.field] || 'Proposed change';
}

const QuestAdminAiDraftPanel = ({
  apiBaseUrl,
  adminKey,
  sessionId,
  questId,
  config,
  selectedScreen,
  formatDate,
  pipelineSettings,
  pipelineModelOptions,
  promptEntry,
  promptDraft,
  runtimeLoading = false,
  onPromptDraftChange,
  onPipelineSettingsChange,
  onSaveRuntime,
  onSavePrompt,
  onApplyDraft
}) => {
  const [mode, setMode] = useState('fill_missing');
  const [draftResponse, setDraftResponse] = useState(null);
  const [selectedChangeIds, setSelectedChangeIds] = useState([]);
  const [generateStatus, setGenerateStatus] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState('');
  const [runtimeError, setRuntimeError] = useState('');
  const [runtimeSaving, setRuntimeSaving] = useState(false);
  const [promptSaving, setPromptSaving] = useState(false);

  const changes = useMemo(
    () => (Array.isArray(draftResponse?.changes) ? draftResponse.changes : []),
    [draftResponse]
  );

  useEffect(() => {
    setDraftResponse(null);
    setSelectedChangeIds([]);
    setGenerateStatus('');
    setGenerateError('');
  }, [sessionId, questId, selectedScreen?.id]);

  useEffect(() => {
    setSelectedChangeIds(changes.map((change) => change.id));
  }, [changes]);

  const promptSourceLabel = promptEntry?.meta?.fallbackFromCode
    ? `Code default (${promptEntry?.meta?.source || 'backend'})`
    : promptEntry?.version
      ? `Database version ${promptEntry.version}`
      : 'Not loaded';

  const handleGenerate = async (nextMode) => {
    if (!config) return;
    setMode(nextMode);
    setGenerating(true);
    setGenerateError('');
    setGenerateStatus('');

    try {
      const response = await generateQuestAuthoringDraft(
        apiBaseUrl,
        {
          sessionId,
          questId,
          selectedScreenId: selectedScreen?.id || '',
          mode: nextMode,
          config
        },
        {
          adminKey: adminKey.trim() ? adminKey.trim() : undefined
        }
      );
      setDraftResponse(response);
      setGenerateStatus(response?.summary || 'Draft generated. Review the proposed changes before applying them.');
    } catch (error) {
      setDraftResponse(null);
      setGenerateError(error.message || 'Unable to generate quest authoring draft.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleChange = (changeId, checked) => {
    setSelectedChangeIds((previous) => {
      if (checked) {
        return Array.from(new Set([...previous, changeId]));
      }
      return previous.filter((entry) => entry !== changeId);
    });
  };

  const handleApply = () => {
    if (!changes.length || selectedChangeIds.length === 0) return;
    onApplyDraft(changes, selectedChangeIds);
    setDraftResponse(null);
    setSelectedChangeIds([]);
    setGenerateStatus(`Applied ${selectedChangeIds.length} drafted change${selectedChangeIds.length === 1 ? '' : 's'} to the editor. Save Scene when ready.`);
    setGenerateError('');
  };

  const handleSaveRuntime = async () => {
    if (!onSaveRuntime) return;
    setRuntimeSaving(true);
    setRuntimeError('');
    setRuntimeStatus('');
    try {
      await onSaveRuntime();
      setRuntimeStatus('Saved AI drafting runtime.');
    } catch (error) {
      setRuntimeError(error.message || 'Unable to save AI drafting runtime.');
    } finally {
      setRuntimeSaving(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!onSavePrompt) return;
    if (!asTrimmedString(promptDraft)) {
      setRuntimeError('AI drafting prompt cannot be empty.');
      setRuntimeStatus('');
      return;
    }
    setPromptSaving(true);
    setRuntimeError('');
    setRuntimeStatus('');
    try {
      await onSavePrompt();
      setRuntimeStatus('Saved AI drafting prompt to the prompt store.');
    } catch (error) {
      setRuntimeError(error.message || 'Unable to save AI drafting prompt.');
    } finally {
      setPromptSaving(false);
    }
  };

  return (
    <section className="editorSection">
      <div className="editorSectionHeader">
        <div>
          <h3>AI Drafting</h3>
          <p>Use the master scene brief to draft reviewable edits, then accept only the ones you want.</p>
        </div>
      </div>

      <div className="aiDraftActionRow">
        <button type="button" onClick={() => handleGenerate('scene')} disabled={generating || !config}>
          {generating && mode === 'scene' ? 'Drafting Scene…' : 'Draft Scene'}
        </button>
        <button type="button" onClick={() => handleGenerate('fill_missing')} disabled={generating || !config}>
          {generating && mode === 'fill_missing' ? 'Filling…' : 'Fill Missing'}
        </button>
        <button
          type="button"
          onClick={() => handleGenerate('selected_screen')}
          disabled={generating || !config || !selectedScreen}
        >
          {generating && mode === 'selected_screen' ? 'Drafting Screen…' : 'Draft Selected Screen'}
        </button>
      </div>

      <p className="editorMessage">
        The draft uses the current unsaved editor state. Nothing is persisted until you click <strong>Save Scene</strong>.
      </p>

      {!asTrimmedString(config?.authoringBrief) && (
        <p className="editorMessage">
          Add a short <strong>Master Scene Brief</strong> first. The drafter works best when that brief is specific.
        </p>
      )}

      {(generateStatus || generateError) && (
        <div className={`questAdminInlineNotice ${generateError ? 'error' : 'ok'}`}>
          {generateError || generateStatus}
        </div>
      )}

      {draftResponse && (
        <div className="aiDraftSummaryCard">
          <div>
            <strong>{draftResponse.summary || 'Draft ready'}</strong>
            <span>
              {draftResponse.mocked ? 'Mocked draft' : 'Live draft'}
              {draftResponse.runtime?.model ? ` · ${draftResponse.runtime.model}` : ''}
            </span>
          </div>
          <div>
            <strong>{changes.length}</strong>
            <span>proposed change{changes.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}

      {changes.length > 0 && (
        <div className="aiDraftList">
          {changes.map((change) => {
            const checked = selectedChangeIds.includes(change.id);
            return (
              <article key={change.id} className="aiDraftCard">
                <label className="aiDraftToggle">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggleChange(change.id, event.target.checked)}
                  />
                  <span>{getChangeHeading(change)}</span>
                </label>

                <div className="aiDraftDiffGrid">
                  <div>
                    <strong>Current</strong>
                    <pre>{formatValuePreview(change.currentValue)}</pre>
                  </div>
                  <div>
                    <strong>Proposed</strong>
                    <pre>{formatValuePreview(change.proposedValue)}</pre>
                  </div>
                </div>
              </article>
            );
          })}

          <div className="sceneEditorActions">
            <button type="button" onClick={handleApply} disabled={selectedChangeIds.length === 0}>
              Apply Selected ({selectedChangeIds.length})
            </button>
            <button type="button" className="ghost" onClick={() => setDraftResponse(null)}>
              Discard Draft
            </button>
          </div>
        </div>
      )}

      <details className="editorDetails">
        <summary>Advanced AI Drafting Settings</summary>
        <div className="editorDetailsBody">
          <section className="editorSection editorSectionNested">
            <div className="editorSectionHeader">
              <div>
                <h3>AI Drafting Runtime</h3>
                <p>Provider, model, and saved prompt template for the quest scene authoring pipeline.</p>
              </div>
            </div>

            {(runtimeStatus || runtimeError) && (
              <div className={`questAdminInlineNotice ${runtimeError ? 'error' : 'ok'}`}>
                {runtimeError || runtimeStatus}
              </div>
            )}

            {runtimeLoading && <p className="editorMessage">Loading AI drafting settings…</p>}
            {!runtimeLoading && !pipelineSettings && (
              <p className="editorMessage">AI drafting settings are unavailable.</p>
            )}
            {!runtimeLoading && pipelineSettings && (
              <>
                <div className="questRuntimeGrid">
                  <label>
                    Provider
                    <select
                      value={pipelineSettings.provider || 'openai'}
                      onChange={(event) =>
                        onPipelineSettingsChange({
                          provider: event.target.value
                        })
                      }
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </label>

                  <label>
                    Model
                    <select
                      value={pipelineSettings.model || ''}
                      onChange={(event) =>
                        onPipelineSettingsChange({
                          model: event.target.value
                        })
                      }
                    >
                      {pipelineModelOptions.length === 0 && (
                        <option value="">Select model</option>
                      )}
                      {pipelineModelOptions.map((modelId) => (
                        <option key={modelId} value={modelId}>
                          {modelId}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="toggleField">
                    <span>Mock Runtime</span>
                    <input
                      type="checkbox"
                      checked={Boolean(pipelineSettings.useMock)}
                      onChange={(event) =>
                        onPipelineSettingsChange({
                          useMock: event.target.checked
                        })
                      }
                    />
                  </label>
                </div>

                <div className="sceneEditorActions">
                  <button
                    type="button"
                    onClick={handleSaveRuntime}
                    disabled={runtimeSaving || runtimeLoading}
                  >
                    {runtimeSaving ? 'Saving Runtime…' : 'Save Runtime'}
                  </button>
                </div>

                <label>
                  Saved Prompt Template
                  <textarea
                    rows={10}
                    value={promptDraft}
                    onChange={(event) => onPromptDraftChange(event.target.value)}
                    placeholder="Latest prompt template for quest scene authoring"
                  />
                </label>

                <p className="editorMessage">
                  Source: {promptSourceLabel}
                  {promptEntry?.updatedAt ? ` | Updated: ${formatDate(promptEntry.updatedAt)}` : ''}
                </p>

                <div className="sceneEditorActions">
                  <button
                    type="button"
                    onClick={handleSavePrompt}
                    disabled={promptSaving || runtimeLoading}
                  >
                    {promptSaving ? 'Saving Prompt…' : 'Save Prompt to DB'}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </details>
    </section>
  );
};

export default QuestAdminAiDraftPanel;

import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_API_BASE_URL, resetWellSceneConfig, saveWellSceneConfig } from '../../api/wellAdmin';
import RoseCourtWellScene from './RoseCourtWellScene';
import useWellSceneConfig from './useWellSceneConfig';
import {
  buildRoseCourtWellSceneProps,
  normalizeWellSceneConfig,
  parseFragmentsDraft,
  serializeFragmentsDraft
} from './wellSceneConfig';
import './WellAdminWorkspace.css';

const DEFAULT_WELL_STATE = {
  phase: 'observing',
  latestFragment: '',
  readyForWriting: false,
  draftLine: '',
  submittedLine: '',
  wordCount: 0,
  wordsRemaining: 10,
  fragmentCount: 0
};

function WellAdminWorkspace({
  apiBaseUrl = DEFAULT_API_BASE_URL,
  adminKey = '',
  showEditor = true,
  previewNote = '',
  onDebugStateChange
}) {
  const { config, setConfig, meta, loading, error: loadError, reload } = useWellSceneConfig(apiBaseUrl);
  const [sceneKey, setSceneKey] = useState(0);
  const [wellState, setWellState] = useState(DEFAULT_WELL_STATE);
  const [lastLine, setLastLine] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [fragmentDraft, setFragmentDraft] = useState('');

  const normalizedConfig = useMemo(() => normalizeWellSceneConfig(config), [config]);
  const sceneProps = useMemo(() => buildRoseCourtWellSceneProps(normalizedConfig), [normalizedConfig]);
  const resolvedApiBaseUrl = `${apiBaseUrl || ''}`.trim() || DEFAULT_API_BASE_URL;

  useEffect(() => {
    setFragmentDraft(serializeFragmentsDraft(config.fragments));
  }, [config.fragments]);

  const resetScene = (configSource = normalizedConfig) => {
    const wordLimit = normalizeWellSceneConfig(configSource).component.wordLimit;
    setSceneKey((value) => value + 1);
    setWellState({
      ...DEFAULT_WELL_STATE,
      wordsRemaining: wordLimit
    });
    setLastLine('');
  };

  const updateComponent = (key, value) => {
    setConfig((current) => ({
      ...current,
      component: {
        ...current.component,
        [key]: value
      }
    }));
  };

  const updateCopy = (key, value) => {
    setConfig((current) => ({
      ...current,
      copy: {
        ...current.copy,
        [key]: value
      }
    }));
  };

  const handleFragmentsChange = (value) => {
    setFragmentDraft(value);
    setConfig((current) => ({
      ...current,
      fragments: parseFragmentsDraft(value)
    }));
  };

  const handleReload = async () => {
    setStatus('');
    setError('');
    const payload = await reload();
    if (payload?.config) {
      const nextConfig = normalizeWellSceneConfig(payload.config);
      setStatus('Reloaded saved well config.');
      resetScene(nextConfig);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const payload = await saveWellSceneConfig(apiBaseUrl, normalizedConfig, { adminKey });
      const nextConfig = normalizeWellSceneConfig(payload?.config);
      setConfig(nextConfig);
      setStatus('Saved well config.');
      resetScene(nextConfig);
    } catch (err) {
      setError(err.message || 'Unable to save well config.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSavedConfig = async () => {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const payload = await resetWellSceneConfig(apiBaseUrl, { adminKey });
      const nextConfig = normalizeWellSceneConfig(payload?.config);
      setConfig(nextConfig);
      setStatus('Reset saved well config to defaults.');
      resetScene(nextConfig);
    } catch (err) {
      setError(err.message || 'Unable to reset well config.');
    } finally {
      setSaving(false);
    }
  };

  const footerText = lastLine
    ? `${normalizedConfig.copy.footerLastSubmittedPrefix} "${lastLine}"`
    : wellState.readyForWriting
      ? `${normalizedConfig.copy.footerReadyPrefix} ${wellState.wordsRemaining} words remain.`
      : normalizedConfig.copy.footerWaiting;

  useEffect(() => {
    if (!onDebugStateChange) return;
    onDebugStateChange({
      mode: showEditor ? 'well-admin' : 'well-debug',
      sceneKey,
      status,
      error: error || loadError,
      lastLine,
      config: normalizedConfig,
      well: wellState
    });
  }, [
    error,
    lastLine,
    loadError,
    normalizedConfig,
    onDebugStateChange,
    sceneKey,
    showEditor,
    status,
    wellState
  ]);

  return (
    <div className={`wellAdminWorkspace ${showEditor ? '' : 'wellAdminWorkspace--previewOnly'}`}>
      <div className="wellAdminWorkspace__previewHeader">
        <div>
          <h2>{showEditor ? 'Well Scene Preview' : 'Live Well Preview'}</h2>
          <p>
            {showEditor
              ? 'This preview uses the same shared config as the quest well and the Rose Court prologue.'
              : 'This direct view is for scene debugging. Editing now lives in Story Admin under the Well component.'}
          </p>
        </div>
        <div className="wellAdminWorkspace__toolbar">
          <button type="button" className="wellAdminWorkspace__ghostButton" onClick={handleReload} disabled={loading || saving}>
            {loading ? 'Loading...' : 'Reload Saved'}
          </button>
          <button type="button" className="wellAdminWorkspace__primaryButton" onClick={() => resetScene()}>
            Reset Scene
          </button>
        </div>
      </div>

      <div className="wellAdminWorkspace__layout">
        <section className="wellAdminWorkspace__previewPanel">
          <div className="wellAdminWorkspace__previewFrame">
            <RoseCourtWellScene
              key={sceneKey}
              {...sceneProps}
              onStateChange={setWellState}
              onComplete={setLastLine}
            />
          </div>
          <footer className="wellAdminWorkspace__previewFooter">
            <p>{footerText}</p>
            {wellState.latestFragment ? (
              <p>
                {normalizedConfig.copy.footerLatestPrefix} "{wellState.latestFragment}"
              </p>
            ) : null}
            {previewNote ? <p className="wellAdminWorkspace__note">{previewNote}</p> : null}
            {status ? <p className="wellAdminWorkspace__status wellAdminWorkspace__status--success">{status}</p> : null}
            {error || loadError ? (
              <p className="wellAdminWorkspace__status wellAdminWorkspace__status--error">{error || loadError}</p>
            ) : null}
          </footer>
        </section>

        {showEditor ? (
          <aside className="wellAdminWorkspace__editorPanel">
            <section className="wellAdminWorkspace__card">
              <div className="wellAdminWorkspace__cardHeader">
                <div>
                  <h3>API</h3>
                  <p>The well uses the same shared config endpoints as the quest and direct debug views.</p>
                </div>
                <div className="wellAdminWorkspace__toolbar">
                  <button type="button" className="wellAdminWorkspace__primaryButton" onClick={handleSave} disabled={saving || loading}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="wellAdminWorkspace__ghostButton" onClick={handleResetSavedConfig} disabled={saving}>
                    Reset Saved
                  </button>
                </div>
              </div>

              <div className="wellAdminWorkspace__metaGrid">
                <div>
                  <strong>Story Admin connection</strong>
                  <span>{resolvedApiBaseUrl}</span>
                </div>
                <div>
                  <strong>Admin auth</strong>
                  <span>{adminKey ? 'Using shared Story Admin key' : 'No admin key provided'}</span>
                </div>
                <div>
                  <strong>Public route</strong>
                  <span>{meta.routes?.publicConfig}</span>
                </div>
                <div>
                  <strong>Admin save</strong>
                  <span>{meta.routes?.adminConfig}</span>
                </div>
                <div>
                  <strong>Admin reset</strong>
                  <span>{meta.routes?.adminReset}</span>
                </div>
              </div>

              <ul className="wellAdminWorkspace__consumerList">
                {(meta.consumers || []).map((consumer) => (
                  <li key={`${consumer.label}-${consumer.route || consumer.screenId || ''}`}>
                    <strong>{consumer.label}</strong>
                    <span>{consumer.route || `${consumer.questId} / ${consumer.screenId}`}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="wellAdminWorkspace__card">
              <div className="wellAdminWorkspace__cardHeader">
                <div>
                  <h3>Component</h3>
                  <p>These fields drive the shared `RoseCourtWellScene` props directly.</p>
                </div>
              </div>

              <div className="wellAdminWorkspace__grid">
                <label className="wellAdminWorkspace__field">
                  <span>Background image</span>
                  <input
                    type="text"
                    value={normalizedConfig.component.backgroundSrc}
                    onChange={(event) => updateComponent('backgroundSrc', event.target.value)}
                  />
                </label>
                <label className="wellAdminWorkspace__field">
                  <span>Parchment dock</span>
                  <select
                    value={normalizedConfig.component.promptDock}
                    onChange={(event) => updateComponent('promptDock', event.target.value)}
                  >
                    <option value="side">Side</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </label>
                <label className="wellAdminWorkspace__field">
                  <span>Word limit</span>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={normalizedConfig.component.wordLimit}
                    onChange={(event) => updateComponent('wordLimit', event.target.value)}
                  />
                </label>
                <label className="wellAdminWorkspace__field">
                  <span>Prompt delay (ms)</span>
                  <input
                    type="number"
                    min="0"
                    max="30000"
                    value={normalizedConfig.component.promptDelayMs}
                    onChange={(event) => updateComponent('promptDelayMs', event.target.value)}
                  />
                </label>
                <label className="wellAdminWorkspace__field">
                  <span>Spawn interval (ms)</span>
                  <input
                    type="number"
                    min="200"
                    max="30000"
                    value={normalizedConfig.component.fragmentSpawnMs}
                    onChange={(event) => updateComponent('fragmentSpawnMs', event.target.value)}
                  />
                </label>
                <label className="wellAdminWorkspace__field">
                  <span>Fragment lifetime (ms)</span>
                  <input
                    type="number"
                    min="800"
                    max="45000"
                    value={normalizedConfig.component.fragmentLifetimeMs}
                    onChange={(event) => updateComponent('fragmentLifetimeMs', event.target.value)}
                  />
                </label>
                <label className="wellAdminWorkspace__field">
                  <span>Departure duration (ms)</span>
                  <input
                    type="number"
                    min="600"
                    max="30000"
                    value={normalizedConfig.component.departureDurationMs}
                    onChange={(event) => updateComponent('departureDurationMs', event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="wellAdminWorkspace__card">
              <div className="wellAdminWorkspace__cardHeader">
                <div>
                  <h3>Prompts</h3>
                  <p>Author the visible copy the player sees around the well.</p>
                </div>
              </div>

              <div className="wellAdminWorkspace__grid">
                <label className="wellAdminWorkspace__field">
                  <span>Scene eyebrow</span>
                  <input
                    type="text"
                    value={normalizedConfig.copy.sceneEyebrow}
                    onChange={(event) => updateCopy('sceneEyebrow', event.target.value)}
                  />
                </label>
                <label className="wellAdminWorkspace__field">
                  <span>Scene title</span>
                  <input
                    type="text"
                    value={normalizedConfig.copy.sceneTitle}
                    onChange={(event) => updateCopy('sceneTitle', event.target.value)}
                  />
                </label>
              </div>

              <label className="wellAdminWorkspace__field">
                <span>Parchment label</span>
                <input
                  type="text"
                  value={normalizedConfig.copy.promptLabel}
                  onChange={(event) => updateCopy('promptLabel', event.target.value)}
                />
              </label>
              <label className="wellAdminWorkspace__field">
                <span>Parchment hint</span>
                <textarea
                  value={normalizedConfig.copy.promptHint}
                  onChange={(event) => updateCopy('promptHint', event.target.value)}
                />
              </label>
              <label className="wellAdminWorkspace__field">
                <span>Input placeholder</span>
                <input
                  type="text"
                  value={normalizedConfig.copy.promptPlaceholder}
                  onChange={(event) => updateCopy('promptPlaceholder', event.target.value)}
                />
              </label>
              <label className="wellAdminWorkspace__field">
                <span>Departure status</span>
                <textarea
                  value={normalizedConfig.copy.departureStatus}
                  onChange={(event) => updateCopy('departureStatus', event.target.value)}
                />
              </label>
            </section>

            <section className="wellAdminWorkspace__card">
              <div className="wellAdminWorkspace__cardHeader">
                <div>
                  <h3>Fragment Bank</h3>
                  <p>One fragment per line. The well cycles through this shortlist repeatedly.</p>
                </div>
              </div>

              <label className="wellAdminWorkspace__field">
                <span>Surface lines</span>
                <textarea
                  value={fragmentDraft}
                  onChange={(event) => handleFragmentsChange(event.target.value)}
                  rows={10}
                />
              </label>
            </section>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default WellAdminWorkspace;

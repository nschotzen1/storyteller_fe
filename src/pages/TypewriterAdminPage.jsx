import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_API_BASE_URL,
  loadOpenAiModels,
  loadTypewriterPrompts,
  loadTypewriterAiSettings,
  loadTypewriterPromptVersions,
  resetTypewriterAiSettings,
  seedCurrentTypewriterPrompts,
  saveTypewriterPrompt,
  setLatestTypewriterPromptVersion,
  saveTypewriterAiSettings
} from '../api/typewriterAdmin';
import './TypewriterAdminPage.css';

const TYPEWRITER_ADMIN_API_BASE_STORAGE_KEY = 'typewriterAdminApiBaseUrl';
const TYPEWRITER_ADMIN_KEY_STORAGE_KEY = 'typewriterAdminApiKey';

const SETTING_PIPELINES = [
  {
    key: 'story_continuation',
    label: 'Story continuation',
    description: '/api/send_typewriter_text',
    modelKind: 'text'
  },
  {
    key: 'memory_creation',
    label: 'Memory creation',
    description: '/api/fragmentToMemories',
    modelKind: 'text'
  },
  {
    key: 'entity_creation',
    label: 'Entity creation',
    description: '/api/textToEntity',
    modelKind: 'text'
  },
  {
    key: 'storyteller_creation',
    label: 'Storyteller creation',
    description: '/api/textToStoryteller (persona stage)',
    modelKind: 'text'
  },
  {
    key: 'texture_creation',
    label: 'Texture creation',
    description: 'Card/front/back image generation',
    modelKind: 'image'
  },
  {
    key: 'illustration_creation',
    label: 'Illustration creation',
    description: '/api/textToStoryteller (illustration stage)',
    modelKind: 'image'
  }
];

const PROMPT_PIPELINES = [
  {
    key: 'story_continuation',
    label: 'Story continuation',
    description: '/api/send_typewriter_text',
    settingsKey: 'story_continuation'
  },
  {
    key: 'memory_creation',
    label: 'Memory creation',
    description: '/api/fragmentToMemories memory extraction',
    settingsKey: 'memory_creation'
  },
  {
    key: 'memory_card_front',
    label: 'Memory card front',
    description: '/api/fragmentToMemories front image generation',
    settingsKey: 'texture_creation'
  },
  {
    key: 'memory_card_back',
    label: 'Memory card back',
    description: '/api/fragmentToMemories back image generation',
    settingsKey: 'texture_creation'
  },
  {
    key: 'entity_creation',
    label: 'Entity creation',
    description: '/api/textToEntity entity extraction',
    settingsKey: 'entity_creation'
  },
  {
    key: 'entity_card_front',
    label: 'Entity card front',
    description: '/api/textToEntity front image generation',
    settingsKey: 'texture_creation'
  },
  {
    key: 'texture_creation',
    label: 'Entity card back texture',
    description: '/api/textToEntity back texture generation',
    settingsKey: 'texture_creation'
  },
  {
    key: 'storyteller_creation',
    label: 'Storyteller creation',
    description: '/api/textToStoryteller persona generation',
    settingsKey: 'storyteller_creation'
  },
  {
    key: 'storyteller_key_creation',
    label: 'Storyteller key image',
    description: '/api/textToStoryteller typewriter key image generation',
    settingsKey: 'illustration_creation'
  },
  {
    key: 'illustration_creation',
    label: 'Storyteller illustration',
    description: '/api/textToStoryteller illustration generation',
    settingsKey: 'illustration_creation'
  }
];

const getInitialApiBaseUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  const stored = window.localStorage.getItem(TYPEWRITER_ADMIN_API_BASE_STORAGE_KEY);
  return stored && stored.trim() ? stored : DEFAULT_API_BASE_URL;
};

const getInitialAdminKey = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(TYPEWRITER_ADMIN_KEY_STORAGE_KEY);
  return stored && stored.trim() ? stored : '';
};

const buildEmptySettings = () => {
  const pipelines = {};
  for (const pipeline of SETTING_PIPELINES) {
    pipelines[pipeline.key] = {
      key: pipeline.key,
      useMock: false,
      model: '',
      modelKind: pipeline.modelKind
    };
  }
  return {
    pipelines,
    updatedAt: '',
    updatedBy: ''
  };
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Never';
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return 'Never';
  return new Date(parsed).toLocaleString();
};

const TypewriterAdminPage = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState(getInitialApiBaseUrl);
  const [adminKey, setAdminKey] = useState(getInitialAdminKey);
  const [settings, setSettings] = useState(buildEmptySettings);
  const [models, setModels] = useState({ textModels: [], imageModels: [], source: 'fallback', fetchedAt: '' });
  const [prompts, setPrompts] = useState({ pipelines: {} });
  const [promptDrafts, setPromptDrafts] = useState({});
  const [promptVersions, setPromptVersions] = useState({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TYPEWRITER_ADMIN_API_BASE_STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TYPEWRITER_ADMIN_KEY_STORAGE_KEY, adminKey);
  }, [adminKey]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError('');
      setStatus('');
      try {
        const [settingsPayload, modelsPayload, promptsPayload] = await Promise.all([
          loadTypewriterAiSettings(apiBaseUrl, { adminKey }),
          loadOpenAiModels(apiBaseUrl, { adminKey }),
          loadTypewriterPrompts(apiBaseUrl, { adminKey })
        ]);
        if (!active) return;
        setSettings(settingsPayload || buildEmptySettings());
        setModels(modelsPayload || { textModels: [], imageModels: [], source: 'fallback', fetchedAt: '' });
        setPrompts(promptsPayload || { pipelines: {} });
        setPromptDrafts(() => {
          const nextDrafts = {};
          PROMPT_PIPELINES.forEach((pipeline) => {
            nextDrafts[pipeline.key] = promptsPayload?.pipelines?.[pipeline.key]?.promptTemplate || '';
          });
          return nextDrafts;
        });
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load admin settings.');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, adminKey]);

  const pipelineRows = useMemo(() => {
    return SETTING_PIPELINES.map((pipeline) => {
      const current = settings?.pipelines?.[pipeline.key] || {};
      return {
        ...pipeline,
        useMock: Boolean(current.useMock),
        model: typeof current.model === 'string' ? current.model : '',
        modelKind: current.modelKind || pipeline.modelKind
      };
    });
  }, [settings]);

  const getModelOptions = (modelKind, currentModel) => {
    const sourceModels = modelKind === 'image' ? models.imageModels : models.textModels;
    const modelIds = (Array.isArray(sourceModels) ? sourceModels : [])
      .map((entry) => (typeof entry?.id === 'string' ? entry.id.trim() : ''))
      .filter(Boolean);
    if (currentModel && !modelIds.includes(currentModel)) {
      modelIds.unshift(currentModel);
    }
    return Array.from(new Set(modelIds));
  };

  const updatePipeline = (pipelineKey, patch) => {
    setSettings((prev) => {
      const current = prev?.pipelines?.[pipelineKey] || {};
      return {
        ...(prev || {}),
        pipelines: {
          ...(prev?.pipelines || {}),
          [pipelineKey]: {
            ...current,
            ...patch
          }
        }
      };
    });
  };

  const updatePromptDraft = (pipelineKey, value) => {
    setPromptDrafts((prev) => ({
      ...prev,
      [pipelineKey]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const payload = {
        pipelines: {}
      };
      for (const row of pipelineRows) {
        payload.pipelines[row.key] = {
          useMock: Boolean(row.useMock),
          model: row.model
        };
      }
      const response = await saveTypewriterAiSettings(apiBaseUrl, payload, {
        adminKey,
        updatedBy: 'typewriter-admin-ui'
      });
      setSettings(response || buildEmptySettings());
      setStatus('Saved runtime AI settings.');
    } catch (err) {
      setError(err.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const response = await resetTypewriterAiSettings(apiBaseUrl, {
        adminKey,
        updatedBy: 'typewriter-admin-ui'
      });
      setSettings(response || buildEmptySettings());
      setStatus('Reset settings to defaults.');
    } catch (err) {
      setError(err.message || 'Unable to reset settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshModels = async () => {
    setRefreshingModels(true);
    setError('');
    setStatus('');
    try {
      const payload = await loadOpenAiModels(apiBaseUrl, { adminKey, forceRefresh: true });
      setModels(payload || { textModels: [], imageModels: [], source: 'fallback', fetchedAt: '' });
      setStatus('Refreshed model list.');
    } catch (err) {
      setError(err.message || 'Unable to refresh model list.');
    } finally {
      setRefreshingModels(false);
    }
  };

  const handleSavePrompt = async (pipelineKey) => {
    setSavingPrompts(true);
    setError('');
    setStatus('');
    try {
      const promptTemplate = promptDrafts[pipelineKey] || '';
      await saveTypewriterPrompt(apiBaseUrl, pipelineKey, promptTemplate, {
        adminKey,
        updatedBy: 'typewriter-admin-ui',
        markLatest: true
      });
      const [latestPrompts, versionsPayload] = await Promise.all([
        loadTypewriterPrompts(apiBaseUrl, { adminKey }),
        loadTypewriterPromptVersions(apiBaseUrl, pipelineKey, { adminKey, limit: 10 })
      ]);
      setPrompts(latestPrompts || { pipelines: {} });
      setPromptVersions((prev) => ({
        ...prev,
        [pipelineKey]: Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : []
      }));
      setStatus(`Saved prompt for ${pipelineKey} as latest.`);
    } catch (err) {
      setError(err.message || 'Unable to save prompt.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleSeedCurrentPrompts = async () => {
    setSavingPrompts(true);
    setError('');
    setStatus('');
    try {
      await seedCurrentTypewriterPrompts(apiBaseUrl, {
        adminKey,
        updatedBy: 'typewriter-admin-ui',
        overwrite: false
      });
      const latestPrompts = await loadTypewriterPrompts(apiBaseUrl, { adminKey });
      setPrompts(latestPrompts || { pipelines: {} });
      setPromptDrafts((prev) => {
        const nextDrafts = { ...prev };
        PROMPT_PIPELINES.forEach((pipeline) => {
          nextDrafts[pipeline.key] = latestPrompts?.pipelines?.[pipeline.key]?.promptTemplate || prev[pipeline.key] || '';
        });
        return nextDrafts;
      });
      setStatus('Seeded missing prompt templates from current backend code.');
    } catch (err) {
      setError(err.message || 'Unable to seed prompt templates.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleLoadPromptVersions = async (pipelineKey) => {
    setSavingPrompts(true);
    setError('');
    try {
      const versionsPayload = await loadTypewriterPromptVersions(apiBaseUrl, pipelineKey, { adminKey, limit: 10 });
      setPromptVersions((prev) => ({
        ...prev,
        [pipelineKey]: Array.isArray(versionsPayload?.versions) ? versionsPayload.versions : []
      }));
    } catch (err) {
      setError(err.message || 'Unable to load prompt versions.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const handleUsePromptVersion = async (pipelineKey, versionId) => {
    setSavingPrompts(true);
    setError('');
    setStatus('');
    try {
      await setLatestTypewriterPromptVersion(apiBaseUrl, pipelineKey, {
        adminKey,
        id: versionId
      });
      const latestPrompts = await loadTypewriterPrompts(apiBaseUrl, { adminKey });
      setPrompts(latestPrompts || { pipelines: {} });
      setPromptDrafts((prev) => ({
        ...prev,
        [pipelineKey]: latestPrompts?.pipelines?.[pipelineKey]?.promptTemplate || prev[pipelineKey] || ''
      }));
      setStatus(`Set selected prompt version as latest for ${pipelineKey}.`);
    } catch (err) {
      setError(err.message || 'Unable to set latest prompt version.');
    } finally {
      setSavingPrompts(false);
    }
  };

  return (
    <div className="typewriterAdminPage">
      <header className="typewriterAdminHeader">
        <h1>Typewriter AI Admin</h1>
        <p>Toggle mock mode and select models for the main typewriter pipelines.</p>
      </header>

      <section className="typewriterAdminConnection">
        <label>
          API Base URL
          <input
            type="text"
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
            placeholder={DEFAULT_API_BASE_URL}
          />
        </label>
        <label>
          Admin Key
          <input
            type="password"
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            placeholder="Optional x-admin-key"
          />
        </label>
        <div className="typewriterAdminButtons">
          <button type="button" onClick={handleRefreshModels} disabled={loading || saving || refreshingModels}>
            {refreshingModels ? 'Refreshing models...' : 'Refresh models'}
          </button>
          <button type="button" onClick={handleReset} disabled={loading || saving}>
            Reset defaults
          </button>
          <button type="button" onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </section>

      <section className="typewriterAdminMeta">
        <span>
          Last update: <strong>{formatDate(settings?.updatedAt)}</strong>
        </span>
        <span>
          Updated by: <strong>{settings?.updatedBy || 'Unknown'}</strong>
        </span>
        <span>
          Models source: <strong>{models?.source || 'unknown'}</strong>
        </span>
        <span>
          Models fetched: <strong>{formatDate(models?.fetchedAt)}</strong>
        </span>
      </section>

      {error ? <p className="typewriterAdminError">{error}</p> : null}
      {status ? <p className="typewriterAdminStatus">{status}</p> : null}
      {loading ? <p className="typewriterAdminLoading">Loading settings...</p> : null}

      <section className="typewriterAdminTableWrap">
        <table className="typewriterAdminTable">
          <thead>
            <tr>
              <th>Pipeline</th>
              <th>Use Mock</th>
              <th>Model</th>
            </tr>
          </thead>
          <tbody>
            {pipelineRows.map((row) => {
              const options = getModelOptions(row.modelKind, row.model);
              return (
                <tr key={row.key}>
                  <td>
                    <div className="typewriterPipelineCell">
                      <strong>{row.label}</strong>
                      <span>{row.description}</span>
                    </div>
                  </td>
                  <td>
                    <label className="typewriterMockToggle">
                      <input
                        type="checkbox"
                        checked={row.useMock}
                        onChange={(event) => updatePipeline(row.key, { useMock: event.target.checked })}
                      />
                      <span>{row.useMock ? 'Mock' : 'Live'}</span>
                    </label>
                  </td>
                  <td>
                    <select
                      value={row.model}
                      onChange={(event) => updatePipeline(row.key, { model: event.target.value })}
                    >
                      {options.map((optionId) => (
                        <option key={optionId} value={optionId}>
                          {optionId}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="typewriterPromptEditor">
        <div className="typewriterPromptEditorHeader">
          <div>
            <h2>Prompt Overrides (Mongo, latest used by default)</h2>
            <p>Seed the current in-code prompts once, then edit versions here instead of changing backend files.</p>
          </div>
          <button
            type="button"
            className="typewriterSeedPromptsBtn"
            onClick={handleSeedCurrentPrompts}
            disabled={loading || savingPrompts}
          >
            {savingPrompts ? 'Working...' : 'Seed current prompts'}
          </button>
        </div>
        {PROMPT_PIPELINES.map((pipeline) => {
          const latestPrompt = prompts?.pipelines?.[pipeline.key];
          const versions = promptVersions?.[pipeline.key] || [];
          return (
            <article key={pipeline.key} className="typewriterPromptCard">
              <header>
                <h3>{pipeline.label}</h3>
                <p>{pipeline.description}</p>
                <p className="typewriterPromptMeta">
                  Latest version: {latestPrompt?.version || 'None'} | Updated:{' '}
                  {formatDate(latestPrompt?.updatedAt)}
                </p>
                <p className="typewriterPromptMeta">Execution settings: {pipeline.settingsKey}</p>
                {latestPrompt?.meta?.source ? (
                  <p className="typewriterPromptMeta">Source: {latestPrompt.meta.source}</p>
                ) : null}
              </header>
              <textarea
                value={promptDrafts[pipeline.key] || ''}
                onChange={(event) => updatePromptDraft(pipeline.key, event.target.value)}
                placeholder={`Enter prompt template for ${pipeline.label}. Use {{variable_name}} placeholders.`}
              />
              <div className="typewriterPromptButtons">
                <button
                  type="button"
                  onClick={() => handleSavePrompt(pipeline.key)}
                  disabled={loading || savingPrompts}
                >
                  {savingPrompts ? 'Saving...' : `Save ${pipeline.label} Prompt`}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPromptVersions(pipeline.key)}
                  disabled={loading || savingPrompts}
                >
                  Load versions
                </button>
              </div>
              {versions.length ? (
                <ul className="typewriterPromptVersions">
                  {versions.map((version) => (
                    <li key={version.id}>
                      v{version.version} | {formatDate(version.updatedAt)} | {version.createdBy || 'admin'}
                      {version.isLatest ? (
                        <strong> (latest)</strong>
                      ) : (
                        <button
                          type="button"
                          className="typewriterUseVersionBtn"
                          onClick={() => handleUsePromptVersion(pipeline.key, version.id)}
                          disabled={savingPrompts}
                        >
                          Use as latest
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default TypewriterAdminPage;

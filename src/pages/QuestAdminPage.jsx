import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_API_BASE_URL,
  loadQuestScreens,
  resetQuestScreens,
  saveQuestScreens
} from '../api/questScreens';
import './QuestAdminPage.css';

const QUEST_API_BASE_STORAGE_KEY = 'questApiBaseUrl';
const QUEST_ADMIN_KEY_STORAGE_KEY = 'questAdminApiKey';
const QUEST_SESSION_ID_STORAGE_KEY = 'questSessionId';
const QUEST_ID_STORAGE_KEY = 'questId';

const DEFAULT_QUEST_SESSION_ID = 'rose-court-demo';
const DEFAULT_QUEST_ID = 'ruined_rose_court';

const DIRECTION_OPTIONS = [
  'north',
  'south',
  'east',
  'west',
  'up',
  'down',
  'inside',
  'outside',
  'forward',
  'back'
];

const getInitialApiBaseUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_API_BASE_URL;
  const stored = window.localStorage.getItem(QUEST_API_BASE_STORAGE_KEY);
  return stored && stored.trim() ? stored : DEFAULT_API_BASE_URL;
};

const getInitialAdminKey = () => {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(QUEST_ADMIN_KEY_STORAGE_KEY);
  return stored && stored.trim() ? stored : '';
};

const getInitialSessionId = () => {
  if (typeof window === 'undefined') return DEFAULT_QUEST_SESSION_ID;
  const stored = window.localStorage.getItem(QUEST_SESSION_ID_STORAGE_KEY);
  return stored && stored.trim() ? stored : DEFAULT_QUEST_SESSION_ID;
};

const getInitialQuestId = () => {
  if (typeof window === 'undefined') return DEFAULT_QUEST_ID;
  const stored = window.localStorage.getItem(QUEST_ID_STORAGE_KEY);
  return stored && stored.trim() ? stored : DEFAULT_QUEST_ID;
};

const slugify = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const normalizeDirection = (direction) => {
  if (!direction || typeof direction !== 'object') return null;
  const normalizedDirection = typeof direction.direction === 'string' ? direction.direction.trim().toLowerCase() : '';
  const targetScreenId = typeof direction.targetScreenId === 'string' ? direction.targetScreenId.trim() : '';
  if (!normalizedDirection || !targetScreenId) return null;
  return {
    direction: normalizedDirection,
    label: typeof direction.label === 'string' && direction.label.trim() ? direction.label.trim() : normalizedDirection,
    targetScreenId
  };
};

const normalizeScreen = (screen) => {
  if (!screen || typeof screen !== 'object') return null;
  const id = typeof screen.id === 'string' ? screen.id.trim() : '';
  if (!id) return null;
  return {
    id,
    title: typeof screen.title === 'string' && screen.title.trim() ? screen.title.trim() : id,
    prompt: typeof screen.prompt === 'string' ? screen.prompt : '',
    imageUrl: typeof screen.imageUrl === 'string' ? screen.imageUrl.trim() : '',
    image_prompt: typeof screen.image_prompt === 'string' ? screen.image_prompt : '',
    textPromptPlaceholder:
      typeof screen.textPromptPlaceholder === 'string' && screen.textPromptPlaceholder.trim()
        ? screen.textPromptPlaceholder.trim()
        : 'What do you do?',
    directions: Array.isArray(screen.directions)
      ? screen.directions.map(normalizeDirection).filter(Boolean)
      : []
  };
};

const normalizeConfig = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const screens = Array.isArray(source.screens)
    ? source.screens.map(normalizeScreen).filter(Boolean)
    : [];

  if (!screens.length) {
    return {
      sessionId:
        typeof source.sessionId === 'string' && source.sessionId.trim()
          ? source.sessionId.trim()
          : DEFAULT_QUEST_SESSION_ID,
      questId:
        typeof source.questId === 'string' && source.questId.trim()
          ? source.questId.trim()
          : DEFAULT_QUEST_ID,
      startScreenId: '',
      screens: [],
      updatedAt: ''
    };
  }

  const screenIds = new Set(screens.map((screen) => screen.id));
  const filteredScreens = screens.map((screen) => ({
    ...screen,
    directions: screen.directions.filter((direction) => screenIds.has(direction.targetScreenId))
  }));

  const requestedStartScreenId = typeof source.startScreenId === 'string' ? source.startScreenId.trim() : '';

  return {
    sessionId:
      typeof source.sessionId === 'string' && source.sessionId.trim()
        ? source.sessionId.trim()
        : DEFAULT_QUEST_SESSION_ID,
    questId:
      typeof source.questId === 'string' && source.questId.trim()
        ? source.questId.trim()
        : DEFAULT_QUEST_ID,
    startScreenId: screenIds.has(requestedStartScreenId) ? requestedStartScreenId : filteredScreens[0].id,
    screens: filteredScreens,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : ''
  };
};

const createNewScreenId = (existingScreens) => {
  const existingIds = new Set(existingScreens.map((screen) => screen.id));
  let nextId = 'new_screen';
  let index = 2;
  while (existingIds.has(nextId)) {
    nextId = `new_screen_${index}`;
    index += 1;
  }
  return nextId;
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Never';
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return 'Never';
  return new Date(parsed).toLocaleString();
};

const QuestAdminPage = ({
  initialApiBaseUrl = getInitialApiBaseUrl(),
  initialAdminKey = getInitialAdminKey(),
  initialSessionId = getInitialSessionId(),
  initialQuestId = getInitialQuestId()
}) => {
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [adminKey, setAdminKey] = useState(initialAdminKey);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [questId, setQuestId] = useState(initialQuestId);
  const [config, setConfig] = useState(null);
  const [selectedScreenId, setSelectedScreenId] = useState('');
  const [screenIdDraft, setScreenIdDraft] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedScreen = useMemo(
    () => config?.screens?.find((screen) => screen.id === selectedScreenId) || null,
    [config, selectedScreenId]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_API_BASE_STORAGE_KEY, apiBaseUrl);
  }, [apiBaseUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_ADMIN_KEY_STORAGE_KEY, adminKey);
  }, [adminKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_SESSION_ID_STORAGE_KEY, sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(QUEST_ID_STORAGE_KEY, questId);
  }, [questId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      setError('');
      setStatus('');
      try {
        const payload = await loadQuestScreens(apiBaseUrl, { sessionId, questId });
        if (!active) return;
        const normalized = normalizeConfig(payload);
        setSessionId(normalized.sessionId || sessionId);
        setQuestId(normalized.questId || questId);
        setConfig(normalized);
        setSelectedScreenId((prev) => {
          if (prev && normalized.screens.some((screen) => screen.id === prev)) {
            return prev;
          }
          return normalized.startScreenId || normalized.screens[0]?.id || '';
        });
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load quest screens.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [apiBaseUrl, sessionId, questId]);

  useEffect(() => {
    setScreenIdDraft(selectedScreen?.id || '');
  }, [selectedScreen]);

  const updateSelectedScreen = (updater) => {
    if (!selectedScreenId) return;
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        screens: prev.screens.map((screen) => {
          if (screen.id !== selectedScreenId) return screen;
          return updater(screen);
        })
      };
    });
  };

  const handleAddScreen = () => {
    setConfig((prev) => {
      if (!prev) return prev;
      const nextId = createNewScreenId(prev.screens);
      const nextScreen = {
        id: nextId,
        title: 'Untitled Screen',
        prompt: '',
        imageUrl: '',
        image_prompt: 'Cinematic fantasy quest scene, ruined rose-court setting, weathered stone architecture, dusk atmosphere.',
        textPromptPlaceholder: 'What do you do?',
        directions: []
      };
      const next = {
        ...prev,
        startScreenId: prev.startScreenId || nextId,
        screens: [...prev.screens, nextScreen]
      };
      setSelectedScreenId(nextId);
      return next;
    });
    setStatus('Screen added.');
    setError('');
  };

  const handleRemoveSelectedScreen = () => {
    if (!config || !selectedScreen) return;
    if (config.screens.length <= 1) {
      setError('At least one screen is required.');
      return;
    }

    const removedId = selectedScreen.id;
    const remainingScreens = config.screens
      .filter((screen) => screen.id !== removedId)
      .map((screen) => ({
        ...screen,
        directions: screen.directions.filter((direction) => direction.targetScreenId !== removedId)
      }));

    const nextStartScreenId = config.startScreenId === removedId
      ? remainingScreens[0].id
      : config.startScreenId;

    setConfig({
      ...config,
      startScreenId: nextStartScreenId,
      screens: remainingScreens
    });
    setSelectedScreenId(remainingScreens[0].id);
    setStatus(`Removed screen "${removedId}".`);
    setError('');
  };

  const handleCommitScreenId = () => {
    if (!config || !selectedScreen) return;
    const nextId = slugify(screenIdDraft);

    if (!nextId) {
      setScreenIdDraft(selectedScreen.id);
      setError('Screen ID must include letters or numbers.');
      return;
    }

    if (nextId === selectedScreen.id) {
      setScreenIdDraft(nextId);
      return;
    }

    const idCollision = config.screens.some((screen) => screen.id === nextId);
    if (idCollision) {
      setScreenIdDraft(selectedScreen.id);
      setError(`Screen ID "${nextId}" already exists.`);
      return;
    }

    const oldId = selectedScreen.id;
    const renamedScreens = config.screens.map((screen) => {
      const nextScreen = screen.id === oldId ? { ...screen, id: nextId } : screen;
      return {
        ...nextScreen,
        directions: nextScreen.directions.map((direction) => ({
          ...direction,
          targetScreenId: direction.targetScreenId === oldId ? nextId : direction.targetScreenId
        }))
      };
    });

    setConfig({
      ...config,
      startScreenId: config.startScreenId === oldId ? nextId : config.startScreenId,
      screens: renamedScreens
    });
    setSelectedScreenId(nextId);
    setScreenIdDraft(nextId);
    setStatus('Screen ID updated.');
    setError('');
  };

  const handleAddDirection = () => {
    if (!config || !selectedScreen) return;
    updateSelectedScreen((screen) => ({
      ...screen,
      directions: [
        ...screen.directions,
        {
          direction: 'north',
          label: 'Go north',
          targetScreenId: config.startScreenId || config.screens[0]?.id || screen.id
        }
      ]
    }));
    setStatus('Direction added.');
  };

  const handleDirectionFieldChange = (directionIndex, field, value) => {
    updateSelectedScreen((screen) => ({
      ...screen,
      directions: screen.directions.map((direction, index) => {
        if (index !== directionIndex) return direction;
        if (field === 'direction') {
          const normalizedDirection = String(value || '').trim().toLowerCase();
          return {
            ...direction,
            direction: normalizedDirection,
            label: direction.label && direction.label !== direction.direction ? direction.label : normalizedDirection
          };
        }
        return {
          ...direction,
          [field]: value
        };
      })
    }));
  };

  const handleDirectionRemove = (directionIndex) => {
    updateSelectedScreen((screen) => ({
      ...screen,
      directions: screen.directions.filter((_, index) => index !== directionIndex)
    }));
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    setError('');
    setStatus('');

    try {
      const payload = {
        sessionId,
        questId,
        startScreenId: config.startScreenId,
        screens: config.screens
      };
      const saved = await saveQuestScreens(apiBaseUrl, payload, {
        adminKey: adminKey.trim() ? adminKey.trim() : undefined
      });
      const normalized = normalizeConfig(saved);
      setConfig(normalized);
      setSelectedScreenId((prev) => {
        if (prev && normalized.screens.some((screen) => screen.id === prev)) {
          return prev;
        }
        return normalized.startScreenId || normalized.screens[0]?.id || '';
      });
      setStatus('Quest screens saved successfully.');
    } catch (err) {
      setError(err.message || 'Unable to save quest screens.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setError('');
    setStatus('');

    try {
      const payload = await resetQuestScreens(
        apiBaseUrl,
        { sessionId, questId },
        { adminKey: adminKey.trim() ? adminKey.trim() : undefined }
      );
      const normalized = normalizeConfig(payload);
      setConfig(normalized);
      setSessionId(normalized.sessionId || sessionId);
      setQuestId(normalized.questId || questId);
      setSelectedScreenId(normalized.startScreenId || normalized.screens[0]?.id || '');
      setStatus('Quest screens reset to defaults.');
    } catch (err) {
      setError(err.message || 'Unable to reset quest screens.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="questAdminRoot">
      <div className="questAdminBackdrop" />
      <section className="questAdminPanel">
        <header className="questAdminHeader">
          <div>
            <p className="questAdminEyebrow">Quest Admin</p>
            <h1>Screen Graph Builder</h1>
            <p>
              Build each scene, assign image + prompt, and wire directional exits.
            </p>
          </div>
          <div className="questAdminMeta">
            <div>Last Updated: {formatDate(config?.updatedAt)}</div>
            <div>Total Screens: {config?.screens?.length || 0}</div>
          </div>
        </header>

        <div className="questAdminToolbar">
          <label>
            API Base URL
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              placeholder="http://localhost:5001"
            />
          </label>
          <label>
            Admin API Key (optional)
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="x-admin-key"
            />
          </label>
          <label>
            Session ID
            <input
              type="text"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              placeholder={DEFAULT_QUEST_SESSION_ID}
            />
          </label>
          <label>
            Quest ID
            <input
              type="text"
              value={questId}
              onChange={(event) => setQuestId(event.target.value)}
              placeholder={DEFAULT_QUEST_ID}
            />
          </label>
          <button type="button" onClick={handleSave} disabled={saving || loading || !config}>
            {saving ? 'Saving…' : 'Save Config'}
          </button>
          <button type="button" className="ghost" onClick={handleReset} disabled={saving || loading}>
            Reset Defaults
          </button>
        </div>

        {(status || error) && (
          <div className={`questAdminNotice ${error ? 'error' : 'ok'}`}>
            {error || status}
          </div>
        )}

        <div className="questAdminBody">
          <aside className="questAdminSidebar">
            <div className="sidebarHeader">
              <h2>Screens</h2>
              <button type="button" onClick={handleAddScreen}>+ Add</button>
            </div>
            {loading && <p className="sidebarMessage">Loading screens…</p>}
            {!loading && (!config || config.screens.length === 0) && (
              <p className="sidebarMessage">No screens loaded.</p>
            )}
            {!loading && config?.screens?.map((screen) => (
              <button
                type="button"
                key={screen.id}
                className={`screenListButton ${screen.id === selectedScreenId ? 'active' : ''}`}
                onClick={() => {
                  setSelectedScreenId(screen.id);
                  setStatus('');
                  setError('');
                }}
              >
                <strong>{screen.title || screen.id}</strong>
                <span>{screen.id}</span>
              </button>
            ))}
          </aside>

          <section className="questAdminEditor">
            {!selectedScreen && (
              <p className="editorMessage">Choose a screen from the list.</p>
            )}

            {selectedScreen && (
              <>
                <div className="editorTopRow">
                  <label>
                    Start Screen
                    <select
                      value={config?.startScreenId || ''}
                      onChange={(event) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                startScreenId: event.target.value
                              }
                            : prev
                        )
                      }
                    >
                      {config?.screens?.map((screen) => (
                        <option key={`start-${screen.id}`} value={screen.id}>
                          {screen.title || screen.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="danger" onClick={handleRemoveSelectedScreen}>
                    Remove Screen
                  </button>
                </div>

                <label>
                  Screen ID
                  <input
                    type="text"
                    value={screenIdDraft}
                    onChange={(event) => setScreenIdDraft(event.target.value)}
                    onBlur={handleCommitScreenId}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleCommitScreenId();
                      }
                    }}
                  />
                </label>

                <label>
                  Screen Title
                  <input
                    type="text"
                    value={selectedScreen.title}
                    onChange={(event) =>
                      updateSelectedScreen((screen) => ({
                        ...screen,
                        title: event.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  Prompt
                  <textarea
                    rows={3}
                    value={selectedScreen.prompt}
                    onChange={(event) =>
                      updateSelectedScreen((screen) => ({
                        ...screen,
                        prompt: event.target.value
                      }))
                    }
                  />
                </label>

                <label>
                  Image URL
                  <input
                    type="text"
                    value={selectedScreen.imageUrl}
                    onChange={(event) =>
                      updateSelectedScreen((screen) => ({
                        ...screen,
                        imageUrl: event.target.value
                      }))
                    }
                    placeholder="/ruin_south_a.png or https://..."
                  />
                </label>

                <label>
                  Image Prompt
                  <textarea
                    rows={3}
                    value={selectedScreen.image_prompt}
                    onChange={(event) =>
                      updateSelectedScreen((screen) => ({
                        ...screen,
                        image_prompt: event.target.value
                      }))
                    }
                    placeholder="Prompt used to generate this scene image"
                  />
                </label>

                <label>
                  Text Prompt Placeholder
                  <input
                    type="text"
                    value={selectedScreen.textPromptPlaceholder}
                    onChange={(event) =>
                      updateSelectedScreen((screen) => ({
                        ...screen,
                        textPromptPlaceholder: event.target.value
                      }))
                    }
                  />
                </label>

                <section className="directionEditor">
                  <div className="directionEditorHeader">
                    <h3>Directions</h3>
                    <button type="button" onClick={handleAddDirection}>+ Add Direction</button>
                  </div>

                  {selectedScreen.directions.length === 0 && (
                    <p className="editorMessage">No directions yet for this screen.</p>
                  )}

                  {selectedScreen.directions.map((direction, index) => (
                    <div key={`${direction.direction}-${index}`} className="directionRow">
                      <select
                        value={direction.direction}
                        onChange={(event) =>
                          handleDirectionFieldChange(index, 'direction', event.target.value)
                        }
                      >
                        {DIRECTION_OPTIONS.map((option) => (
                          <option key={`${selectedScreen.id}-dir-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={direction.label}
                        onChange={(event) =>
                          handleDirectionFieldChange(index, 'label', event.target.value)
                        }
                        placeholder="Button label"
                      />
                      <select
                        value={direction.targetScreenId}
                        onChange={(event) =>
                          handleDirectionFieldChange(index, 'targetScreenId', event.target.value)
                        }
                      >
                        {config?.screens?.map((screen) => (
                          <option key={`${selectedScreen.id}-target-${screen.id}-${index}`} value={screen.id}>
                            {screen.title || screen.id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="removeDirection"
                        onClick={() => handleDirectionRemove(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </section>
              </>
            )}
          </section>

          <aside className="questAdminPreview">
            <h2>Preview</h2>
            {selectedScreen ? (
              <article className="previewCard">
                <div
                  className="previewImage"
                  style={{
                    backgroundImage: `linear-gradient(160deg, rgba(18, 12, 10, 0.55), rgba(14, 8, 7, 0.85)), url(${selectedScreen.imageUrl || '/ruin_south_a.png'})`
                  }}
                >
                  <header>
                    <p>{selectedScreen.id}</p>
                    <h3>{selectedScreen.title}</h3>
                  </header>
                  <p>{selectedScreen.prompt || 'No prompt yet.'}</p>
                </div>
                <div className="previewDirections">
                  <span>Image prompt: {selectedScreen.image_prompt || 'not set'}</span>
                  {selectedScreen.directions.length === 0 && <span>No exits yet.</span>}
                  {selectedScreen.directions.map((direction, index) => (
                    <span key={`${selectedScreen.id}-preview-${index}`}>
                      {direction.label} → {direction.targetScreenId}
                    </span>
                  ))}
                </div>
              </article>
            ) : (
              <p className="editorMessage">No screen selected.</p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
};

export default QuestAdminPage;

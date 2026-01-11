import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './StorytellerMissionPanel.css';

const coerceArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};

const normalizeApiBase = (value) => {
  if (!value) {
    return '';
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const buildUrl = (base, path, params) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return `${base}${path}${query ? `?${query}` : ''}`;
};

const StorytellerMissionPanel = ({
  sessionId,
  apiBaseUrl = '',
  defaultEntityId,
  defaultStorytellerId,
  onMissionSent
}) => {
  const [entities, setEntities] = useState([]);
  const [storytellers, setStorytellers] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(defaultEntityId || null);
  const [selectedStorytellerId, setSelectedStorytellerId] = useState(defaultStorytellerId || null);
  const [storytellerDetail, setStorytellerDetail] = useState(null);
  const [filters, setFilters] = useState({
    mainEntityId: '',
    isSubEntity: undefined
  });
  const [missionForm, setMissionForm] = useState({
    storytellingPoints: 10,
    message: '',
    duration: 3
  });
  const [loading, setLoading] = useState({
    entities: false,
    storytellers: false,
    storytellerDetail: false,
    sendMission: false
  });
  const [error, setError] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  const baseUrl = useMemo(() => normalizeApiBase(apiBaseUrl), [apiBaseUrl]);

  const selectedEntity = useMemo(
    () => entities.find((item) => item._id === selectedEntityId) || null,
    [entities, selectedEntityId]
  );

  const selectedStoryteller = useMemo(
    () => storytellers.find((item) => item.id === selectedStorytellerId) || null,
    [storytellers, selectedStorytellerId]
  );

  const setSectionLoading = (key, value) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  };

  const requestJson = useCallback(
    async (url, options = {}) => {
      const response = await fetch(url, options);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error || payload?.message || 'Request failed.';
        throw new Error(message);
      }
      return payload;
    },
    []
  );

  const loadEntities = useCallback(async () => {
    if (!sessionId) {
      setError('Session ID is required to load entities.');
      return;
    }
    setSectionLoading('entities', true);
    setError(null);
    try {
      const url = buildUrl(baseUrl, '/api/entities', {
        sessionId,
        mainEntityId: filters.mainEntityId,
        isSubEntity: filters.isSubEntity
      });
      const data = await requestJson(url);
      setEntities(coerceArray(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setSectionLoading('entities', false);
    }
  }, [baseUrl, filters.isSubEntity, filters.mainEntityId, requestJson, sessionId]);

  const loadStorytellers = useCallback(async () => {
    if (!sessionId) {
      setError('Session ID is required to load storytellers.');
      return;
    }
    setSectionLoading('storytellers', true);
    setError(null);
    try {
      const url = buildUrl(baseUrl, '/api/storytellers', { sessionId });
      const data = await requestJson(url);
      setStorytellers(coerceArray(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setSectionLoading('storytellers', false);
    }
  }, [baseUrl, requestJson, sessionId]);

  const loadStorytellerDetail = useCallback(
    async (id) => {
      if (!sessionId || !id) {
        return;
      }
      setSectionLoading('storytellerDetail', true);
      setError(null);
      try {
        const url = buildUrl(baseUrl, `/api/storytellers/${id}`, { sessionId });
        const data = await requestJson(url);
        setStorytellerDetail(data || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setSectionLoading('storytellerDetail', false);
      }
    },
    [baseUrl, requestJson, sessionId]
  );

  useEffect(() => {
    loadEntities();
    loadStorytellers();
  }, [loadEntities, loadStorytellers]);

  useEffect(() => {
    if (defaultEntityId && !selectedEntityId) {
      setSelectedEntityId(defaultEntityId);
    }
  }, [defaultEntityId, selectedEntityId]);

  useEffect(() => {
    if (defaultStorytellerId && !selectedStorytellerId) {
      setSelectedStorytellerId(defaultStorytellerId);
    }
  }, [defaultStorytellerId, selectedStorytellerId]);

  useEffect(() => {
    if (!selectedStorytellerId) {
      setStorytellerDetail(null);
      return;
    }
    loadStorytellerDetail(selectedStorytellerId);
  }, [loadStorytellerDetail, selectedStorytellerId]);

  const handleSendMission = async () => {
    if (!sessionId) {
      setError('Session ID is required to send a mission.');
      return;
    }
    if (!selectedEntityId) {
      setError('Select an entity before sending a mission.');
      return;
    }
    if (!selectedStorytellerId) {
      setError('Select a storyteller before sending a mission.');
      return;
    }
    if (!Number.isInteger(missionForm.storytellingPoints) || missionForm.storytellingPoints <= 0) {
      setError('Storytelling points must be a positive integer.');
      return;
    }
    if (!missionForm.message.trim()) {
      setError('Mission message cannot be empty.');
      return;
    }
    if (selectedStoryteller?.status === 'in_mission') {
      setError('This storyteller is already in a mission.');
      return;
    }

    setSectionLoading('sendMission', true);
    setError(null);
    try {
      const url = buildUrl(baseUrl, '/api/sendStorytellerToEntity', {});
      const payload = await requestJson(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          entityId: selectedEntityId,
          storytellerId: selectedStorytellerId,
          storytellingPoints: missionForm.storytellingPoints,
          message: missionForm.message.trim(),
          durationDays: missionForm.duration
        })
      });
      setSendResult(payload || null);
      onMissionSent?.(payload);
      await Promise.all([loadStorytellers(), loadEntities()]);
      if (selectedStorytellerId) {
        await loadStorytellerDetail(selectedStorytellerId);
      }
      setMissionForm((prev) => ({ ...prev, message: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSectionLoading('sendMission', false);
    }
  };

  return (
    <section className="storytellerPanel">
      <header className="panelHeader">
        <div>
          <p className="panelEyebrow">Storyteller Mission Console</p>
          <h2>Dispatch a Chronicle</h2>
        </div>
        <div className="panelMeta">
          <span>Session</span>
          <strong>{sessionId || 'Missing'}</strong>
        </div>
      </header>

      {error && (
        <div className="errorBanner" role="alert">
          {error}
        </div>
      )}

      <div className="panelGrid">
        <div className="panelColumn">
          <div className="panelSection">
            <div className="sectionHeader">
              <h3>Entities</h3>
              {loading.entities && <span className="spinner" />}
            </div>
            <div className="filterStack">
              <label className="field">
                <span>Main Entity ID</span>
                <input
                  type="text"
                  value={filters.mainEntityId}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, mainEntityId: event.target.value }))
                  }
                  placeholder="Filter by main entity"
                />
              </label>
              <label className="field">
                <span>Sub-entities</span>
                <select
                  value={
                    filters.isSubEntity === undefined ? 'all' : filters.isSubEntity ? 'true' : 'false'
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      isSubEntity: value === 'all' ? undefined : value === 'true'
                    }));
                  }}
                >
                  <option value="all">All</option>
                  <option value="false">Main only</option>
                  <option value="true">Sub only</option>
                </select>
              </label>
              <button className="ghostButton" type="button" onClick={loadEntities}>
                Refresh
              </button>
            </div>
            <div className="listContainer">
              {loading.entities && entities.length === 0 && <p className="emptyState">Loading...</p>}
              {!loading.entities && entities.length === 0 && (
                <p className="emptyState">No entities yet.</p>
              )}
              {entities.map((entity) => (
                <button
                  key={entity._id}
                  type="button"
                  className={`listRow ${selectedEntityId === entity._id ? 'active' : ''}`}
                  onClick={() => setSelectedEntityId(entity._id)}
                >
                  <div className="rowTitle">
                    {entity.name}
                    {entity.isSubEntity && <span className="badge subtle">Sub</span>}
                  </div>
                  <div className="rowMeta">
                    {entity.type || 'Unknown'} {entity.subtype ? `• ${entity.subtype}` : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panelColumn">
          <div className="panelSection">
            <div className="sectionHeader">
              <h3>Storytellers</h3>
              {loading.storytellers && <span className="spinner" />}
            </div>
            <div className="listContainer">
              {loading.storytellers && storytellers.length === 0 && (
                <p className="emptyState">Loading...</p>
              )}
              {!loading.storytellers && storytellers.length === 0 && (
                <p className="emptyState">No storytellers yet.</p>
              )}
              {storytellers.map((storyteller) => (
                <button
                  key={storyteller.id}
                  type="button"
                  className={`listRow ${selectedStorytellerId === storyteller.id ? 'active' : ''}`}
                  onClick={() => setSelectedStorytellerId(storyteller.id)}
                >
                  <div className="rowTitle">
                    {storyteller.name}
                    <span className={`statusBadge ${storyteller.status}`}>{storyteller.status}</span>
                  </div>
                  {storyteller.lastMission ? (
                    <div className="rowMeta">
                      {storyteller.lastMission.outcome || 'pending'} •{' '}
                      {storyteller.lastMission.message || 'No summary'}
                    </div>
                  ) : (
                    <div className="rowMeta">No missions logged.</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panelColumn">
          <div className="panelSection">
            <div className="sectionHeader">
              <h3>Mission Detail</h3>
              {loading.storytellerDetail && <span className="spinner" />}
            </div>
            <div className="detailCard">
              <div className="detailBlock">
                <h4>Selected Entity</h4>
                {selectedEntity ? (
                  <>
                    <p className="detailTitle">{selectedEntity.name}</p>
                    <p className="detailMeta">
                      {selectedEntity.type || 'Unknown'}{' '}
                      {selectedEntity.subtype ? `• ${selectedEntity.subtype}` : ''}
                    </p>
                    {selectedEntity.description && <p>{selectedEntity.description}</p>}
                  </>
                ) : (
                  <p className="emptyState">Pick an entity to preview details.</p>
                )}
              </div>
              <div className="detailBlock">
                <h4>Selected Storyteller</h4>
                {storytellerDetail ? (
                  <>
                    <p className="detailTitle">{storytellerDetail.name}</p>
                    <p className="detailMeta">
                      Status: <span className={`statusBadge ${storytellerDetail.status}`}>{storytellerDetail.status}</span>
                    </p>
                    <div className="missionHistory">
                      <p className="historyLabel">Recent Missions</p>
                      {storytellerDetail.missions && storytellerDetail.missions.length > 0 ? (
                        storytellerDetail.missions.slice(0, 4).map((mission, index) => (
                          <div key={`${mission.createdAt || index}`} className="historyRow">
                            <span>{mission.outcome || 'pending'}</span>
                            <span>{mission.message || mission.userText || 'No notes'}</span>
                          </div>
                        ))
                      ) : (
                        <p className="emptyState">No mission history yet.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="emptyState">Select a storyteller to load details.</p>
                )}
              </div>
            </div>

            <div className="panelSection missionForm">
              <h3>Send Mission</h3>
              <label className="field">
                <span>Storytelling Points</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={missionForm.storytellingPoints}
                  onChange={(event) =>
                    setMissionForm((prev) => ({
                      ...prev,
                      storytellingPoints: Number(event.target.value)
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Duration (days)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={missionForm.duration}
                  onChange={(event) =>
                    setMissionForm((prev) => ({ ...prev, duration: Number(event.target.value) }))
                  }
                />
              </label>
              <label className="field">
                <span>Mission Message</span>
                <textarea
                  rows="3"
                  value={missionForm.message}
                  onChange={(event) =>
                    setMissionForm((prev) => ({ ...prev, message: event.target.value }))
                  }
                  placeholder="Summon the storyteller with a directive..."
                />
              </label>
              <button
                type="button"
                className="primaryButton"
                onClick={handleSendMission}
                disabled={loading.sendMission || selectedStoryteller?.status === 'in_mission'}
              >
                {loading.sendMission ? 'Sending...' : 'Send Storyteller'}
              </button>
              {selectedStoryteller?.status === 'in_mission' && (
                <p className="inlineWarning">This storyteller is already in a mission.</p>
              )}
              {sendResult && (
                <div className="resultCard">
                  <p className="resultTitle">Mission Response</p>
                  {sendResult.userText && <p>{sendResult.userText}</p>}
                  {sendResult.gmNote && <p className="resultNote">{sendResult.gmNote}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StorytellerMissionPanel;

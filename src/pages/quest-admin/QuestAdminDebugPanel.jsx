import React, { useEffect, useState } from 'react';
import { inspectQuestDebugContext } from '../../api/questScreens';

const formatJson = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return '{}';
  }
};

const QuestAdminDebugPanel = ({
  apiBaseUrl,
  adminKey,
  sessionId,
  questId,
  selectedScreen,
  formatDate
}) => {
  const [testAction, setTestAction] = useState('');
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDebugData(null);
    setError('');
  }, [selectedScreen?.id, sessionId, questId, apiBaseUrl, adminKey]);

  const handleInspect = async () => {
    if (!selectedScreen?.id) return;

    setLoading(true);
    setError('');

    try {
      const payload = await inspectQuestDebugContext(
        apiBaseUrl,
        {
          sessionId,
          questId,
          currentScreenId: selectedScreen.id,
          promptText: testAction
        },
        {
          adminKey: adminKey.trim() ? adminKey.trim() : undefined
        }
      );
      setDebugData(payload);
    } catch (err) {
      setError(err.message || 'Unable to inspect the scene.');
    } finally {
      setLoading(false);
    }
  };

  const matchedRoutes = Array.isArray(debugData?.authoredRouteDiagnostics)
    ? debugData.authoredRouteDiagnostics.filter((entry) => entry?.matched)
    : [];

  return (
    <details className="editorDetails questDebugPanel">
      <summary>Advanced Scene Inspector</summary>
      <div className="editorDetailsBody">
        <section className="editorSection editorSectionNested">
          <div className="editorSectionHeader">
            <div>
              <h3>Scene Inspector</h3>
              <p>Inspect the exact backend view of this scene before you test it in play.</p>
            </div>
          </div>

          {!selectedScreen && (
            <p className="editorMessage">Choose a screen to inspect its prompt, routes, and generation path.</p>
          )}

          {selectedScreen && (
            <>
              <label>
                Test Action
                <textarea
                  rows={3}
                  value={testAction}
                  onChange={(event) => setTestAction(event.target.value)}
                  placeholder="Type a sample player action to see whether the scene stays authored or goes to the LLM."
                />
              </label>

              <div className="sceneEditorActions">
                <button type="button" onClick={handleInspect} disabled={loading}>
                  {loading ? 'Inspecting…' : 'Inspect Scene'}
                </button>
              </div>

              {error && <div className="questAdminInlineNotice error">{error}</div>}

              {!debugData && !error && (
                <p className="editorMessage">
                  Use the inspector when you want to verify route matching, prompt source, or the exact compiled prompt.
                </p>
              )}

              {debugData && (
                <>
                  <div className="debugSummaryGrid">
                    <div className="debugSummaryCard">
                      <span className="debugLabel">Current screen</span>
                      <strong>{debugData.currentScreen?.title || selectedScreen.title || selectedScreen.id}</strong>
                      <span>{debugData.currentScreen?.id || selectedScreen.id}</span>
                    </div>
                    <div className="debugSummaryCard">
                      <span className="debugLabel">Anchor screen</span>
                      <strong>{debugData.anchorScreen?.title || 'None'}</strong>
                      <span>{debugData.anchorScreen?.id || ''}</span>
                    </div>
                    <div className="debugSummaryCard">
                      <span className="debugLabel">Generation path</span>
                      <strong>{debugData.wouldBypassGeneration ? 'Authored route' : 'Quest generator'}</strong>
                      <span>
                        {debugData.authoredRouteMatch?.id
                          ? `Matched ${debugData.authoredRouteMatch.id}`
                          : 'No authored route matched'}
                      </span>
                    </div>
                    <div className="debugSummaryCard">
                      <span className="debugLabel">Runtime</span>
                      <strong>{debugData.runtime?.provider || 'openai'}</strong>
                      <span>{debugData.runtime?.model || 'No model selected'}</span>
                    </div>
                    <div className="debugSummaryCard">
                      <span className="debugLabel">Prompt source</span>
                      <strong>{debugData.promptSource?.source || 'missing'}</strong>
                      <span>
                        {debugData.promptSource?.version
                          ? `Version ${debugData.promptSource.version}`
                          : 'No saved version'}
                      </span>
                    </div>
                    <div className="debugSummaryCard">
                      <span className="debugLabel">Prompt updated</span>
                      <strong>
                        {debugData.promptSource?.updatedAt
                          ? formatDate(debugData.promptSource.updatedAt)
                          : 'Never'}
                      </strong>
                      <span>{debugData.promptSource?.createdBy || 'unknown source'}</span>
                    </div>
                  </div>

                  <details className="debugDetails" open={matchedRoutes.length > 0}>
                    <summary>Prompt Routes</summary>
                    {Array.isArray(debugData.authoredRouteDiagnostics) && debugData.authoredRouteDiagnostics.length > 0 ? (
                      <div className="debugRouteList">
                        {debugData.authoredRouteDiagnostics.map((route) => (
                          <article
                            key={`${route.id || route.targetScreenId}-${route.description || 'route'}`}
                            className={`debugRouteCard ${route.matched ? 'matched' : ''}`}
                          >
                            <div className="debugRouteHeader">
                              <strong>{route.id || route.targetScreenId || 'Unnamed route'}</strong>
                              <span>{route.matched ? 'Matched' : route.appliesToCurrentScreen ? 'Available' : 'Different screen'}</span>
                            </div>
                            <p>{route.description || 'No description.'}</p>
                            <p className="debugRouteMeta">
                              Target: {route.targetScreenTitle || route.targetScreenId || 'unknown'} | Mode: {route.matchMode}
                            </p>
                            <pre>{formatJson(route.patterns || [])}</pre>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="editorMessage">No prompt routes are configured for this quest.</p>
                    )}
                  </details>

                  <details className="debugDetails">
                    <summary>Prompt Payload</summary>
                    <pre>{formatJson(debugData.promptPayload || {})}</pre>
                  </details>

                  <details className="debugDetails">
                    <summary>Compiled Prompt</summary>
                    <pre>{debugData.compiledPrompt || 'No compiled prompt available.'}</pre>
                  </details>

                  <details className="debugDetails">
                    <summary>Prompt Messages</summary>
                    <pre>{formatJson(debugData.promptMessages || [])}</pre>
                  </details>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </details>
  );
};

export default QuestAdminDebugPanel;

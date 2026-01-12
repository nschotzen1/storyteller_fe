import React, { useEffect, useState } from 'react';
import './PlayerLogin.css';
import { fetchSessionPlayers, registerPlayer } from '../api/storytellerSession';

const DEFAULT_API_BASE_URL = 'http://localhost:5001';

const PlayerLogin = ({
  onSubmit,
  initialSessionId = '',
  initialPlayerName = '',
  apiBaseUrl = DEFAULT_API_BASE_URL
}) => {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [playerCount, setPlayerCount] = useState(null);
  const [countError, setCountError] = useState('');
  const [countLoading, setCountLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const refreshIntervalMs = 5000;

  const canSubmit = sessionId.trim().length > 0 && playerName.trim().length > 0;

  useEffect(() => {
    const trimmedSessionId = sessionId.trim();
    if (!trimmedSessionId) {
      setPlayerCount(null);
      setCountError('');
      return;
    }

    let isActive = true;

    const loadCount = async (showLoading) => {
      if (showLoading) setCountLoading(true);
      setCountError('');
      try {
        const payload = await fetchSessionPlayers(apiBaseUrl, trimmedSessionId);
        const count = Array.isArray(payload?.players)
          ? payload.players.length
          : Number(payload?.count ?? payload?.playerCount ?? 0);
        if (isActive) setPlayerCount(Number.isFinite(count) ? count : 0);
      } catch (err) {
        if (isActive) setCountError(err.message);
      } finally {
        if (isActive && showLoading) setCountLoading(false);
      }
    };

    const timeout = setTimeout(() => loadCount(true), 350);
    const interval = setInterval(() => loadCount(false), refreshIntervalMs);

    return () => {
      isActive = false;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [apiBaseUrl, refreshIntervalMs, sessionId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    const run = async () => {
      setSubmitting(true);
      setSubmitError('');
      try {
        const payload = await registerPlayer(apiBaseUrl, {
          sessionId: sessionId.trim(),
          playerName: playerName.trim()
        });
        onSubmit({
          sessionId: sessionId.trim(),
          playerName: playerName.trim(),
          playerId: payload?.playerId || payload?.id || ''
        });
      } catch (err) {
        setSubmitError(err.message);
      } finally {
        setSubmitting(false);
      }
    };
    run();
  };

  return (
    <div className="loginPage">
      <div className="loginBackdrop" />
      <form className="loginCard" onSubmit={handleSubmit}>
        <p className="loginEyebrow">Storyteller Access</p>
        <h1>Join a Session</h1>
        <p className="loginSubhead">
          Enter a shared session ID to sync with other players.
        </p>
        <label className="loginField">
          Player name
          <input
            type="text"
            placeholder="e.g. Aria"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
          />
        </label>
        <label className="loginField">
          Session ID
          <input
            type="text"
            placeholder="e.g. demo-1"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
          />
        </label>
        <div className="loginMeta">
          <div>
            {countLoading && sessionId.trim() ? 'Checking session…' : 'Players in session:'}
          </div>
          <strong>
            {sessionId.trim()
              ? countError
                ? 'Unavailable'
                : playerCount ?? 0
              : '—'}
          </strong>
        </div>
        {submitError && <div className="loginError">{submitError}</div>}
        <button type="submit" className="loginSubmit" disabled={!canSubmit || submitting}>
          {submitting ? 'Joining…' : 'Enter Workbench'}
        </button>
      </form>
    </div>
  );
};

export default PlayerLogin;

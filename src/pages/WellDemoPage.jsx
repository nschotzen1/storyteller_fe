import React, { useEffect, useState } from 'react';
import { DEFAULT_API_BASE_URL } from '../api/wellAdmin';
import WellAdminWorkspace from '../components/well/WellAdminWorkspace';
import './WellDemoPage.css';

function WellDemoPage() {
  const [debugPayload, setDebugPayload] = useState({
    mode: 'well-debug',
    config: null,
    well: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    window.render_game_to_text = () => JSON.stringify(debugPayload);
    window.advanceTime = (ms = 16) => new Promise((resolve) => {
      window.setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });

    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [debugPayload]);

  return (
    <div className="wellDebugPage">
      <header className="wellDebugPage__header">
        <p className="wellDebugPage__eyebrow">Direct Debug View</p>
        <h1>Well of Fragments</h1>
        <p className="wellDebugPage__subhead">
          Debug the live shared well scene here. Editing now lives in Story Admin under the Well component.
        </p>
      </header>

      <WellAdminWorkspace
        apiBaseUrl={DEFAULT_API_BASE_URL}
        showEditor={false}
        previewNote="Open Story Admin and select the Well component to edit this shared scene."
        onDebugStateChange={setDebugPayload}
      />
    </div>
  );
}

export default WellDemoPage;

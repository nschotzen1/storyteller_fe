import React, { useEffect, useRef, useState } from 'react';
import CurtainIntro from './CurtainIntro';
import './AppIntroOverlay.css';

const APP_INTRO_VIDEO_SRC = '/videos/rose-court-intro.mp4';
const APP_INTRO_AUDIO_SRC = '/audio/app-intro-background.mp3';
const APP_INTRO_STILL_SRC = '/images/app-intro-still.png';
const APP_INTRO_STILL_HOLD_MS = 1400;

function AppIntroOverlay({ onComplete }) {
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const completeTimeoutRef = useRef(null);
  const [phase, setPhase] = useState('curtain');
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (phase !== 'video') return;

    const video = videoRef.current;
    if (!video || typeof video.play !== 'function') return;

    try {
      const playResult = video.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          setPhase('still');
        });
      }
    } catch {
      setPhase('still');
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'still') return undefined;

    completeTimeoutRef.current = window.setTimeout(() => {
      onComplete?.();
    }, APP_INTRO_STILL_HOLD_MS);

    return () => {
      if (completeTimeoutRef.current) {
        window.clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  }, [onComplete, phase]);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const handleLiftStart = () => {
    setVideoReady(true);

    const audio = audioRef.current;
    if (!audio || typeof audio.play !== 'function') return;

    try {
      audio.currentTime = 0;
      const playResult = audio.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {});
      }
    } catch {
      // Ignore background audio startup failures and continue with the intro.
    }
  };

  return (
    <section className={`appIntroOverlay appIntroOverlay--${phase}`} aria-label="Game introduction">
      <img className="appIntroOverlay__still" src={APP_INTRO_STILL_SRC} alt="" aria-hidden="true" />
      <audio ref={audioRef} src={APP_INTRO_AUDIO_SRC} preload="auto" aria-hidden="true" />

      {videoReady ? (
        <video
          ref={videoRef}
          className={`appIntroOverlay__video ${phase === 'video' ? 'appIntroOverlay__video--visible' : ''}`}
          src={APP_INTRO_VIDEO_SRC}
          playsInline
          preload="auto"
          muted
          onEnded={() => setPhase('still')}
          onError={() => setPhase('still')}
        />
      ) : null}

      {phase === 'curtain' ? (
        <CurtainIntro
          lightDelayMs={500}
          revealDelayMs={2600}
          onLiftStart={handleLiftStart}
          onReveal={() => setPhase('video')}
        />
      ) : null}
    </section>
  );
}

export default AppIntroOverlay;

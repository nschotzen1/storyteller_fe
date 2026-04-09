import React, { useEffect, useRef, useState } from 'react';
import CurtainIntro from './CurtainIntro';
import './AppIntroOverlay.css';

const APP_INTRO_VIDEO_SOURCES = Object.freeze([
  '/videos/rose-court-intro.mp4',
  '/videos/rose-court-intro-alt.mp4'
]);
const APP_INTRO_AUDIO_SRC = '/audio/app-intro-background.mp3';
const APP_INTRO_OPENING_STILL_SRC = '/images/app-intro-opening-still.png';
const APP_INTRO_CLOSING_STILL_SRC = '/images/app-intro-still.png';
const APP_INTRO_OPENING_STILL_HOLD_MS = 1200;

const pickRandomIntroVideo = () => (
  APP_INTRO_VIDEO_SOURCES[Math.floor(Math.random() * APP_INTRO_VIDEO_SOURCES.length)]
    || APP_INTRO_VIDEO_SOURCES[0]
);

function AppIntroOverlay({ onComplete }) {
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const phaseTimeoutRef = useRef(null);
  const [phase, setPhase] = useState('curtain');
  const [videoReady, setVideoReady] = useState(false);
  const [videoSrc] = useState(pickRandomIntroVideo);

  useEffect(() => {
    if (phase !== 'opening-still') return undefined;

    phaseTimeoutRef.current = window.setTimeout(() => {
      setPhase('video');
    }, APP_INTRO_OPENING_STILL_HOLD_MS);

    return () => {
      if (phaseTimeoutRef.current) {
        window.clearTimeout(phaseTimeoutRef.current);
        phaseTimeoutRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'video') return;

    const video = videoRef.current;
    if (!video || typeof video.play !== 'function') return;

    try {
      const playResult = video.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(() => {
          setPhase('closing-still');
        });
      }
    } catch {
      setPhase('closing-still');
    }
  }, [phase]);

  useEffect(() => () => {
    if (phaseTimeoutRef.current) {
      window.clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const completeIntro = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    onComplete?.();
  };

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

  const handleOverlayClick = () => {
    if (phase === 'closing-still') {
      completeIntro();
    }
  };

  const handleOverlayKeyDown = (event) => {
    if (phase !== 'closing-still') return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    completeIntro();
  };

  const stillSrc = phase === 'closing-still'
    ? APP_INTRO_CLOSING_STILL_SRC
    : APP_INTRO_OPENING_STILL_SRC;

  return (
    <section
      className={`appIntroOverlay appIntroOverlay--${phase}`}
      aria-label="Game introduction"
      role={phase === 'closing-still' ? 'button' : undefined}
      tabIndex={phase === 'closing-still' ? 0 : -1}
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
    >
      <img className="appIntroOverlay__still" src={stillSrc} alt="" aria-hidden="true" />
      <audio ref={audioRef} src={APP_INTRO_AUDIO_SRC} preload="auto" aria-hidden="true" />

      {videoReady ? (
        <video
          ref={videoRef}
          className={`appIntroOverlay__video ${phase === 'video' ? 'appIntroOverlay__video--visible' : ''}`}
          src={videoSrc}
          playsInline
          preload="auto"
          muted
          onEnded={() => setPhase('closing-still')}
          onError={() => setPhase('closing-still')}
        />
      ) : null}

      {phase === 'curtain' ? (
        <CurtainIntro
          lightDelayMs={500}
          revealDelayMs={2600}
          onLiftStart={handleLiftStart}
          onReveal={() => setPhase('opening-still')}
        />
      ) : null}
    </section>
  );
}

export default AppIntroOverlay;

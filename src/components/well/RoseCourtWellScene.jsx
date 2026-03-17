import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './RoseCourtWellScene.css';

const DEFAULT_FRAGMENT_LINES = [
  'It was almost night as she',
  'Nothing could prepare them for such weather',
  'Elionda was observing herself in the golden embroidered mirror',
  'The house remembered every vow spoken under rain',
  'Someone had written the answer before the question existed',
  'When the bell failed, the birds continued the ceremony',
  'No one noticed the garden leaning closer to hear',
  'By dawn the map had changed its mind again',
  'She kept the key because the lock still dreamed of it',
  'The sea withdrew only long enough to listen'
];

const FRAGMENT_POSITIONS = [
  { left: '49%', top: '68%', rotate: '-4deg', width: '20.5rem' },
  { left: '41%', top: '62%', rotate: '5deg', width: '17.8rem' },
  { left: '58%', top: '60%', rotate: '-6deg', width: '18.8rem' },
  { left: '52%', top: '74%', rotate: '3deg', width: '19.4rem' }
];

const countWords = (value = '') => (
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
);

const truncateToWordLimit = (value = '', wordLimit = 10) => {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, wordLimit).join(' ');
};

function RoseCourtWellScene({
  backgroundSrc = '/well/well_background.png',
  fragmentLines = DEFAULT_FRAGMENT_LINES,
  wordLimit = 10,
  promptDelayMs = 5200,
  fragmentSpawnMs = 1700,
  fragmentLifetimeMs = 5200,
  departureDurationMs = 3600,
  isCompleting = false,
  onComplete,
  onStateChange
}) {
  const [visibleFragments, setVisibleFragments] = useState([]);
  const [spawnCount, setSpawnCount] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [draftLine, setDraftLine] = useState('');
  const [submittedLine, setSubmittedLine] = useState('');
  const [phase, setPhase] = useState('observing');
  const completionTimerRef = useRef(null);
  const fragmentIndexRef = useRef(0);
  const fragmentTimeoutsRef = useRef([]);

  const latestFragment = visibleFragments[visibleFragments.length - 1]?.text || '';
  const wordCount = useMemo(() => countWords(draftLine), [draftLine]);
  const wordsRemaining = Math.max(0, wordLimit - wordCount);
  const canSubmit = wordCount > 0 && wordCount <= wordLimit && phase !== 'departing' && !isCompleting;

  useEffect(() => {
    fragmentIndexRef.current = 0;
    fragmentTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    fragmentTimeoutsRef.current = [];
    setVisibleFragments([]);
    setSpawnCount(0);
    setShowPrompt(false);
    setDraftLine('');
    setSubmittedLine('');
    setPhase('observing');
  }, [backgroundSrc, fragmentLines, wordLimit]);

  useEffect(() => {
    if (phase === 'departing') {
      return undefined;
    }

    const spawnFragment = () => {
      const nextIndex = fragmentIndexRef.current;
      fragmentIndexRef.current += 1;
      const fragmentText = fragmentLines[nextIndex % fragmentLines.length];
      const position = FRAGMENT_POSITIONS[nextIndex % FRAGMENT_POSITIONS.length];
      const fragmentId = `well-fragment-${nextIndex}`;

      setVisibleFragments((prev) => [
        ...prev,
        {
          id: fragmentId,
          text: fragmentText,
          ...position
        }
      ]);
      setSpawnCount(nextIndex + 1);

      const timeoutId = window.setTimeout(() => {
        setVisibleFragments((prev) => prev.filter((fragment) => fragment.id !== fragmentId));
      }, fragmentLifetimeMs);
      fragmentTimeoutsRef.current.push(timeoutId);
    };

    spawnFragment();
    const intervalId = window.setInterval(spawnFragment, fragmentSpawnMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fragmentLines, fragmentLifetimeMs, fragmentSpawnMs, phase]);

  useEffect(() => {
    if (phase === 'departing' || showPrompt) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      setShowPrompt(true);
      setPhase((currentPhase) => (currentPhase === 'observing' ? 'offering' : currentPhase));
    }, promptDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase, promptDelayMs, showPrompt]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      phase,
      latestFragment,
      readyForWriting: showPrompt,
      draftLine,
      submittedLine,
      wordCount,
      wordsRemaining,
      fragmentCount: spawnCount
    });
  }, [
    draftLine,
    latestFragment,
    onStateChange,
    phase,
    showPrompt,
    spawnCount,
    submittedLine,
    wordCount,
    wordsRemaining
  ]);

  useEffect(() => (
    () => {
      if (completionTimerRef.current) {
        window.clearTimeout(completionTimerRef.current);
      }
      fragmentTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    }
  ), []);

  const handleDraftChange = (event) => {
    if (phase === 'departing' || isCompleting) return;
    const nextValue = truncateToWordLimit(event.target.value, wordLimit);
    setDraftLine(nextValue);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const normalizedLine = truncateToWordLimit(draftLine, wordLimit);
    setDraftLine(normalizedLine);
    setSubmittedLine(normalizedLine);
    setPhase('departing');

    completionTimerRef.current = window.setTimeout(() => {
      onComplete?.(normalizedLine);
    }, departureDurationMs);
  };

  return (
    <div className={`roseWellScene ${phase === 'departing' ? 'is-departing' : ''}`}>
      <div
        className="roseWellScene__backdrop"
        style={{ backgroundImage: `url(${backgroundSrc})` }}
      />
      <div className="roseWellScene__waterGlow" />
      <div className="roseWellScene__vignette" />

      <div className="roseWellScene__roof">
        <div className="roseWellScene__beam" />
        <div className={`roseWellFalcon ${showPrompt ? 'is-attentive' : ''} ${phase === 'departing' ? 'is-departing' : ''}`}>
          <span className="roseWellFalcon__wing roseWellFalcon__wing--rear" />
          <span className="roseWellFalcon__body" />
          <span className="roseWellFalcon__head" />
          <span className="roseWellFalcon__satchel" />
        </div>
      </div>

      <div className={`roseWellScene__tower ${phase === 'departing' ? 'is-lit' : ''}`}>
        <div className="roseWellScene__towerBloom" />
        <div className="roseWellScene__dovecot" />
      </div>

      <div className={`roseWellScene__birds ${phase === 'departing' ? 'is-active' : ''}`} aria-hidden="true">
        <span className="roseWellScene__bird" />
        <span className="roseWellScene__bird" />
        <span className="roseWellScene__bird" />
      </div>

      <AnimatePresence>
        {visibleFragments.map((fragment) => (
          <motion.article
            key={fragment.id}
            className="roseWellFragment"
            style={{
              left: fragment.left,
              top: fragment.top,
              rotate: fragment.rotate,
              width: fragment.width
            }}
            initial={{ opacity: 0, y: 50, scale: 0.7, filter: 'blur(12px)' }}
            animate={{
              opacity: [0, 1, 1],
              y: [36, -10, 0],
              scale: [0.7, 1.02, 1],
              filter: ['blur(12px)', 'blur(0px)', 'blur(0.8px)']
            }}
            exit={{ opacity: 0, y: 42, scale: 0.88, filter: 'blur(6px)' }}
            transition={{ duration: 3.2, times: [0, 0.45, 1], ease: 'easeOut' }}
          >
            <span className="roseWellFragment__paper" />
            <span className="roseWellFragment__text">{fragment.text}</span>
          </motion.article>
        ))}
      </AnimatePresence>

      <div className={`roseWellPromptCard ${showPrompt ? 'is-visible' : ''} ${phase === 'departing' ? 'is-departing' : ''}`}>
        <div className="roseWellPromptCard__feather" aria-hidden="true" />
        <p className="roseWellPromptCard__label">The falcon offers a parchment.</p>
        {phase === 'departing' ? (
          <>
            <p className="roseWellPromptCard__line">"{submittedLine}"</p>
            <p className="roseWellPromptCard__status">
              The falcon folds the line into its satchel and rises toward the dovecot.
            </p>
          </>
        ) : (
          <>
            <p className="roseWellPromptCard__hint">Write one line. The ink will hold ten words at most.</p>
            <input
              className="roseWellPromptCard__input"
              type="text"
              value={draftLine}
              onChange={handleDraftChange}
              placeholder="A single line for the court..."
              maxLength={180}
            />
            <div className="roseWellPromptCard__footer">
              <span>{wordsRemaining} words left</span>
              <button
                type="button"
                className="roseWellPromptCard__button"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                Offer the line
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default RoseCourtWellScene;

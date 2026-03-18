import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './RoseCourtWellScene.css';
import { DEFAULT_FRAGMENT_LINES } from './wellSceneConfig';

const FRAGMENT_POSITIONS = [
  { left: '34%', top: '58%', rotate: '-7deg', width: '18.8rem' },
  { left: '47%', top: '52%', rotate: '6deg', width: '17.4rem' },
  { left: '63%', top: '58%', rotate: '-5deg', width: '19.1rem' },
  { left: '37%', top: '71%', rotate: '3deg', width: '18.6rem' },
  { left: '54%', top: '68%', rotate: '-2deg', width: '18rem' },
  { left: '68%', top: '72%', rotate: '5deg', width: '18.5rem' }
];

const FRAGMENT_VARIANTS = [
  {
    paperKind: 'image',
    paperImage: '/well/fragments/generated/well_fragment_01.png',
    aspectRatio: '1084 / 422',
    textInset: '19% 10% 23% 10%',
    tone: 'soft'
  },
  {
    paperKind: 'image',
    paperImage: '/well/fragments/generated/well_fragment_02.png',
    aspectRatio: '1022 / 439',
    textInset: '20% 12% 24% 12%',
    tone: 'dusty'
  },
  {
    paperKind: 'image',
    paperImage: '/well/fragments/generated/well_fragment_03.png',
    aspectRatio: '1039 / 488',
    textInset: '19% 12% 25% 12%',
    tone: 'faded'
  },
  {
    paperKind: 'image',
    paperImage: '/well/fragments/generated/well_fragment_04.png',
    aspectRatio: '978 / 499',
    textInset: '19% 13% 25% 13%',
    tone: 'stained'
  },
  {
    paperKind: 'image',
    paperImage: '/well/fragments/generated/well_fragment_05.png',
    aspectRatio: '960 / 406',
    textInset: '19% 11% 23% 11%',
    tone: 'soft'
  },
  {
    paperKind: 'image',
    paperImage: '/well/fragments/generated/well_fragment_06.png',
    aspectRatio: '1124 / 398',
    textInset: '18% 11% 23% 11%',
    tone: 'stained'
  }
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

const randomBetween = (min, max) => min + (Math.random() * (max - min));

const shiftPercent = (value = '50%', shift = 0) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return value;
  return `${numeric + shift}%`;
};

const scaleRemValue = (value = '18rem', factor = 1) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return value;
  const unit = String(value).replace(String(numeric), '') || 'rem';
  return `${(numeric * factor).toFixed(2)}${unit}`;
};

const randomizeFragmentDelay = (baseMs = 1700) => (
  Math.max(420, Math.round(baseMs * randomBetween(0.44, 1.85)))
);

const randomizeFragmentLifetime = (baseMs = 5200) => (
  Math.max(2600, Math.round(baseMs * randomBetween(0.72, 1.18)))
);

const clampDraftToWordLimit = (value = '', wordLimit = 10) => {
  const nextValue = String(value || '').replace(/\r?\n+/g, ' ');
  const wordMatches = nextValue.match(/\S+/g) || [];
  if (wordMatches.length <= wordLimit) {
    return nextValue;
  }
  return truncateToWordLimit(nextValue, wordLimit);
};

function RoseCourtWellScene({
  backgroundSrc = '/well/well_background.png',
  fragmentLines = DEFAULT_FRAGMENT_LINES,
  wordLimit = 10,
  promptDelayMs = 5200,
  fragmentSpawnMs = 1700,
  fragmentLifetimeMs = 5200,
  departureDurationMs = 3600,
  promptDock = 'side',
  promptLabel = 'The falcon offers a parchment.',
  promptHint = 'Write one line. The ink will hold ten words at most.',
  promptPlaceholder = 'A single line for the court...',
  departureStatusText = 'The falcon folds the line into its satchel and rises toward the dovecot.',
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
  const fragmentLoopTimerRef = useRef(null);

  const latestFragment = visibleFragments[visibleFragments.length - 1]?.text || '';
  const wordCount = useMemo(() => countWords(draftLine), [draftLine]);
  const wordsRemaining = Math.max(0, wordLimit - wordCount);
  const canSubmit = wordCount > 0 && wordCount <= wordLimit && phase !== 'departing' && !isCompleting;
  const fragmentLeftShift = promptDock === 'side' ? -3 : 0;
  const fragmentTopShift = promptDock === 'side' ? -8 : 0;

  useEffect(() => {
    fragmentIndexRef.current = 0;
    if (fragmentLoopTimerRef.current) {
      window.clearTimeout(fragmentLoopTimerRef.current);
      fragmentLoopTimerRef.current = null;
    }
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
      const variant = FRAGMENT_VARIANTS[nextIndex % FRAGMENT_VARIANTS.length];
      const fragmentId = `well-fragment-${nextIndex}`;
      const lifetimeMs = randomizeFragmentLifetime(fragmentLifetimeMs);
      const driftX = randomBetween(-7.2, 7.2);
      const driftY = randomBetween(-4.8, 3.2);
      const widthScale = randomBetween(0.92, 1.1);
      const rotateJitter = randomBetween(-6, 6);
      const glowDelay = `${randomBetween(0, 1.8).toFixed(2)}s`;
      const shimmerDelay = `${randomBetween(0, 2.2).toFixed(2)}s`;
      const motionDuration = Number(randomBetween(3.2, 4.8).toFixed(2));

      setVisibleFragments((prev) => [
        ...prev,
        {
          id: fragmentId,
          text: fragmentText,
          left: shiftPercent(position.left, driftX),
          top: shiftPercent(position.top, driftY),
          rotate: `${Number.parseFloat(position.rotate) + rotateJitter}deg`,
          width: scaleRemValue(position.width, widthScale),
          lifetimeMs,
          glowDelay,
          shimmerDelay,
          motionDuration,
          ...variant,
        }
      ]);
      setSpawnCount(nextIndex + 1);

      const timeoutId = window.setTimeout(() => {
        setVisibleFragments((prev) => prev.filter((fragment) => fragment.id !== fragmentId));
      }, lifetimeMs);
      fragmentTimeoutsRef.current.push(timeoutId);
    };

    const scheduleNextFragment = (delayMs) => {
      fragmentLoopTimerRef.current = window.setTimeout(() => {
        spawnFragment();
        scheduleNextFragment(randomizeFragmentDelay(fragmentSpawnMs));
      }, delayMs);
    };

    scheduleNextFragment(Math.max(260, Math.round(randomizeFragmentDelay(fragmentSpawnMs) * 0.55)));

    return () => {
      if (fragmentLoopTimerRef.current) {
        window.clearTimeout(fragmentLoopTimerRef.current);
        fragmentLoopTimerRef.current = null;
      }
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
      if (fragmentLoopTimerRef.current) {
        window.clearTimeout(fragmentLoopTimerRef.current);
      }
      fragmentTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    }
  ), []);

  const handleDraftChange = (event) => {
    if (phase === 'departing' || isCompleting) return;
    const nextValue = clampDraftToWordLimit(event.target.value, wordLimit);
    setDraftLine(nextValue);
  };

  const handleDraftKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
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
              left: shiftPercent(fragment.left, fragmentLeftShift),
              top: shiftPercent(fragment.top, fragmentTopShift),
              rotate: fragment.rotate,
              width: fragment.width,
              '--fragment-aspect': fragment.aspectRatio,
              '--fragment-paper-image': `url(${fragment.paperImage})`,
              '--fragment-mask-image': fragment.paperMask ? `url(${fragment.paperMask})` : 'none',
              '--fragment-text-inset': fragment.textInset || '18% 18% 20% 18%',
              '--fragment-glow-delay': fragment.glowDelay || '0s',
              '--fragment-shimmer-delay': fragment.shimmerDelay || '0s'
            }}
            initial={{ opacity: 0, y: 52, scale: 0.82 }}
            animate={{
              opacity: [0, 1, 1],
              y: [34, -10, 2],
              scale: [0.82, 1.03, 0.98]
            }}
            exit={{
              opacity: 0,
              y: 22,
              scale: 0.92
            }}
            transition={{ duration: fragment.motionDuration || 3.8, times: [0, 0.38, 1], ease: [0.2, 0.95, 0.3, 1] }}
          >
            <span className="roseWellFragment__reflection" aria-hidden="true" />
            <span className={`roseWellFragment__paper roseWellFragment__paper--${fragment.paperKind} roseWellFragment__paper--${fragment.tone || 'soft'}`}>
              {fragment.paperKind === 'masked' ? (
                <>
                  <span className="roseWellFragment__paperFibers" aria-hidden="true" />
                  <span className="roseWellFragment__paperDust" aria-hidden="true" />
                </>
              ) : null}
            </span>
            <span className="roseWellFragment__text">{fragment.text}</span>
          </motion.article>
        ))}
      </AnimatePresence>

      <div
        className={[
          'roseWellPromptCard',
          showPrompt ? 'is-visible' : '',
          phase === 'departing' ? 'is-departing' : '',
          promptDock === 'bottom' ? 'is-bottomDock' : 'is-sideDock'
        ].filter(Boolean).join(' ')}
      >
        <div className="roseWellPromptCard__feather" aria-hidden="true" />
        <p className="roseWellPromptCard__label">{promptLabel}</p>
        {phase === 'departing' ? (
          <>
            <p className="roseWellPromptCard__line">"{submittedLine}"</p>
            <p className="roseWellPromptCard__status">
              {departureStatusText}
            </p>
          </>
        ) : (
          <>
            <p className="roseWellPromptCard__hint">{promptHint}</p>
            <div className="roseWellPromptCard__sheet">
              <textarea
                className="roseWellPromptCard__input"
                value={draftLine}
                onChange={handleDraftChange}
                onKeyDown={handleDraftKeyDown}
                placeholder={promptPlaceholder}
                maxLength={180}
                rows={3}
                spellCheck={false}
                disabled={!showPrompt || phase === 'departing' || isCompleting}
              />
            </div>
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import './RoseCourtWellScene.css';
import { DEFAULT_API_BASE_URL } from '../../api/wellAdmin';
import {
  handoffWellBundle,
  nextWellFragment,
  saveWellJot,
  startWellSession
} from '../../api/wellSession';
import {
  DEFAULT_FRAGMENT_LINES,
  normalizeTextualBank
} from './wellSceneConfig';
import RoseWellFragmentCanvas from './RoseWellFragmentCanvas';

const DEFAULT_BACKGROUND_SRC = '/well/well_background.png';
const FRAGMENT_POSITIONS = [
  { left: '45%', top: '63%', rotate: '-7deg', width: '19rem' },
  { left: '50%', top: '58%', rotate: '5deg', width: '18rem' },
  { left: '55%', top: '65%', rotate: '-4deg', width: '18.6rem' },
  { left: '48%', top: '69%', rotate: '3deg', width: '17.6rem' },
  { left: '53%', top: '61%', rotate: '-2deg', width: '17.8rem' }
];

const FRAGMENT_VARIANTS = [
  ['well_fragment_01.png', '897 / 356', '18% 10% 22% 10%', 'soft'],
  ['well_fragment_02.png', '980 / 389', '18% 11% 22% 11%', 'dusty'],
  ['well_fragment_03.png', '877 / 448', '20% 12% 24% 12%', 'faded'],
  ['well_fragment_04.png', '796 / 488', '20% 13% 25% 13%', 'stained'],
  ['well_fragment_05.png', '489 / 235', '19% 12% 22% 12%', 'dusty'],
  ['well_fragment_06.png', '722 / 180', '22% 9% 24% 9%', 'stained'],
  ['well_fragment_07.png', '388 / 198', '18% 14% 22% 14%', 'soft'],
  ['well_fragment_08.png', '492 / 285', '20% 13% 24% 13%', 'faded'],
  ['well_fragment_09.png', '361 / 168', '22% 10% 24% 10%', 'dusty'],
  ['well_fragment_10.png', '615 / 210', '20% 10% 23% 10%', 'stained'],
  ['well_fragment_11.png', '373 / 135', '22% 10% 24% 10%', 'soft'],
  ['well_fragment_12.png', '498 / 212', '20% 11% 22% 11%', 'faded'],
  ['well_fragment_13.png', '539 / 208', '19% 10% 22% 10%', 'dusty'],
  ['well_fragment_14.png', '275 / 152', '19% 12% 22% 12%', 'stained']
].map(([fileName, aspectRatio, textInset, tone]) => ({
  paperKind: 'image',
  paperImage: `/well/fragments/generated/${fileName}`,
  aspectRatio,
  textInset,
  tone
}));

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `well-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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

const clampDraftToWordLimit = (value = '', wordLimit = 10) => {
  const nextValue = String(value || '').replace(/\r?\n+/g, ' ');
  const wordMatches = nextValue.match(/\S+/g) || [];
  if (wordMatches.length <= wordLimit) {
    return nextValue;
  }
  return truncateToWordLimit(nextValue, wordLimit);
};

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

const randomBetween = (min, max) => min + (Math.random() * (max - min));

const buildVisualFragment = (fragment, index = 0, lifetimeMs = 7600, promptDock = 'side') => {
  const position = FRAGMENT_POSITIONS[index % FRAGMENT_POSITIONS.length];
  const variant = FRAGMENT_VARIANTS[index % FRAGMENT_VARIANTS.length];
  const driftX = randomBetween(-4.2, 4.2) + (promptDock === 'side' ? -2 : 0);
  const driftY = randomBetween(-2.8, 2.8) + (promptDock === 'side' ? -8 : 0);
  return {
    id: fragment.id || createId(),
    bankId: fragment.bankId || fragment.id || '',
    type: 'textual',
    text: fragment.surface?.text || fragment.text || '',
    left: shiftPercent(position.left, driftX),
    top: shiftPercent(position.top, driftY),
    rotate: `${Number.parseFloat(position.rotate) + randomBetween(-4, 4)}deg`,
    width: scaleRemValue(position.width, randomBetween(0.94, 1.08)),
    lifetimeMs,
    bornAt: typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now(),
    waveSeed: randomBetween(0, Math.PI * 2),
    rippleSeed: randomBetween(0, Math.PI * 2),
    sinkSeed: randomBetween(0, Math.PI * 2),
    crossDrift: randomBetween(-8, 8),
    surfaceBias: randomBetween(-0.5, 0.5),
    sinkDepth: randomBetween(0.2, 0.6),
    readWindowStart: randomBetween(0.2, 0.28),
    readWindowEnd: randomBetween(0.68, 0.8),
    ...variant
  };
};

const buildBundleSummary = (bundle = []) => bundle
  .map((entry) => entry.rawJotText || '')
  .filter(Boolean)
  .join(' / ');

function RoseCourtWellScene({
  backgroundSrc = DEFAULT_BACKGROUND_SRC,
  textualFragments = [],
  fragmentLines = DEFAULT_FRAGMENT_LINES,
  requiredTextualJots = 3,
  wordLimit = 10,
  promptDelayMs = 5200,
  fragmentSpawnMs = 2200,
  fragmentLifetimeMs = 7600,
  departureDurationMs = 3600,
  promptDock = 'side',
  promptLabel = 'What words do you remember?',
  promptHint = 'Jot down what you caught before the well swallows it again.',
  promptPlaceholder = 'A remembered line, name, or place...',
  handoffLabel = 'Hand the bundle to the falcon',
  impatienceStatusText = 'The falcon grows impatient. It wants the gathered bundle now.',
  observingHint = 'A scrap hangs in the water. Catch it before it slips your memory.',
  jotActionLabel = 'Jot this scrap',
  departureStatusText = 'The falcon folds the gathered bundle into its satchel and rises toward the dovecot.',
  apiBaseUrl = DEFAULT_API_BASE_URL,
  sessionId = '',
  playerId = '',
  isCompleting = false,
  onComplete,
  onStateChange
}) {
  const normalizedTextualBank = useMemo(() => (
    normalizeTextualBank(
      textualFragments?.length ? textualFragments : fragmentLines,
      normalizeTextualBank(DEFAULT_FRAGMENT_LINES)
    )
  ), [fragmentLines, textualFragments]);

  const [phase, setPhase] = useState('observing');
  const [activeFragment, setActiveFragment] = useState(null);
  const [activeFragmentReady, setActiveFragmentReady] = useState(false);
  const [jotSourceFragment, setJotSourceFragment] = useState(null);
  const [bundle, setBundle] = useState([]);
  const [draftLine, setDraftLine] = useState('');
  const [lastSubmittedLine, setLastSubmittedLine] = useState('');
  const [latestFragment, setLatestFragment] = useState('');
  const [capturedTextual, setCapturedTextual] = useState(0);
  const [requiredCount, setRequiredCount] = useState(requiredTextualJots);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionMode, setSessionMode] = useState(sessionId ? 'remote' : 'local');
  const [runtimeNotice, setRuntimeNotice] = useState('');
  const [sceneError, setSceneError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [backgroundHasFailed, setBackgroundHasFailed] = useState(false);

  const completionTimerRef = useRef(null);
  const fragmentExpiryTimerRef = useRef(null);
  const fragmentDrawTimerRef = useRef(null);
  const fragmentReadyTimerRef = useRef(null);
  const localCursorRef = useRef(0);
  const runTokenRef = useRef(0);

  const wordCount = useMemo(() => countWords(draftLine), [draftLine]);
  const resolvedBackgroundSrc = useMemo(() => {
    const configured = typeof backgroundSrc === 'string' && backgroundSrc.trim()
      ? backgroundSrc.trim()
      : DEFAULT_BACKGROUND_SRC;
    if (backgroundHasFailed && configured !== DEFAULT_BACKGROUND_SRC) {
      return DEFAULT_BACKGROUND_SRC;
    }
    return configured;
  }, [backgroundHasFailed, backgroundSrc]);
  const wordsRemaining = Math.max(0, wordLimit - wordCount);
  const readyForHandoff = capturedTextual >= requiredCount;
  const canSubmitJot = phase === 'jotting' && wordCount > 0 && wordCount <= wordLimit && !isSubmitting && !isCompleting;
  const canJot = phase === 'observing' && Boolean(activeFragment) && activeFragmentReady && !isSubmitting && !isCompleting;
  const canHandoff = phase === 'bundle-ready' && !isSubmitting && !isCompleting;
  const observingLabel = activeFragmentReady
    ? (latestFragment || 'The well is dark for a moment.')
    : 'A scrap is rising through the water.';
  const observingPromptHint = activeFragmentReady
    ? observingHint
    : 'Wait until the words clear at the surface.';

  const clearTimers = () => {
    if (completionTimerRef.current) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (fragmentExpiryTimerRef.current) {
      window.clearTimeout(fragmentExpiryTimerRef.current);
      fragmentExpiryTimerRef.current = null;
    }
    if (fragmentDrawTimerRef.current) {
      window.clearTimeout(fragmentDrawTimerRef.current);
      fragmentDrawTimerRef.current = null;
    }
    if (fragmentReadyTimerRef.current) {
      window.clearTimeout(fragmentReadyTimerRef.current);
      fragmentReadyTimerRef.current = null;
    }
  };

  const activateFragment = (fragment, indexHint = 0) => {
    if (!fragment) return;
    const visual = buildVisualFragment(fragment, indexHint, fragmentLifetimeMs, promptDock);
    setActiveFragment(visual);
    setActiveFragmentReady(false);
    setLatestFragment('');
    setPhase('observing');
    if (fragmentReadyTimerRef.current) {
      window.clearTimeout(fragmentReadyTimerRef.current);
    }
    fragmentReadyTimerRef.current = window.setTimeout(() => {
      setActiveFragment((current) => {
        if (!current || current.id !== visual.id) return current;
        setActiveFragmentReady(true);
        setLatestFragment(visual.text);
        return current;
      });
    }, Math.max(320, Math.round(visual.lifetimeMs * visual.readWindowStart)));
    if (fragmentExpiryTimerRef.current) {
      window.clearTimeout(fragmentExpiryTimerRef.current);
    }
    fragmentExpiryTimerRef.current = window.setTimeout(() => {
      setActiveFragmentReady(false);
      setActiveFragment((current) => {
        if (!current || current.id !== visual.id) return current;
        return null;
      });
      fragmentDrawTimerRef.current = window.setTimeout(() => {
        if (sessionMode === 'remote' && sessionId) {
          void requestRemoteFragment({ replaceCurrent: true });
        } else {
          activateLocalNextFragment();
        }
      }, fragmentSpawnMs);
    }, fragmentLifetimeMs);
  };

  const hydrateSessionState = (session, { resumeDeparture = false } = {}) => {
    if (!session) return;
    setBundle(Array.isArray(session.bundle) ? session.bundle : []);
    setJotSourceFragment(null);
    setActiveFragmentReady(false);
    setCapturedTextual(Number(session.captured?.textual) || 0);
    setRequiredCount(Number(session.required?.textual) || requiredTextualJots);
    setLatestFragment(session.currentFragment?.surface?.text || latestFragment || '');
    if (session.status === 'completed') {
      setActiveFragment(null);
      setPhase(resumeDeparture ? 'departing' : 'completed');
      return;
    }
    if (session.readyForHandoff || session.status === 'bundle_ready') {
      setActiveFragment(null);
      setPhase('bundle-ready');
      return;
    }
    if (session.currentFragment?.surface?.text) {
      activateFragment(session.currentFragment, bundle.length);
      return;
    }
    setPhase('observing');
  };

  const activateLocalNextFragment = () => {
    if (!normalizedTextualBank.length || readyForHandoff || phase === 'departing' || phase === 'completed') {
      return;
    }
    const entry = normalizedTextualBank[localCursorRef.current % normalizedTextualBank.length];
    localCursorRef.current += 1;
    activateFragment({
      id: createId(),
      bankId: entry.id,
      surface: { text: entry.text }
    }, localCursorRef.current - 1);
  };

  const requestRemoteFragment = async ({ replaceCurrent = false, delayMs = 0 } = {}) => {
    if (!sessionId) return;
    if (fragmentDrawTimerRef.current) {
      window.clearTimeout(fragmentDrawTimerRef.current);
      fragmentDrawTimerRef.current = null;
    }
    fragmentDrawTimerRef.current = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const payload = await nextWellFragment(apiBaseUrl, {
          sessionId,
          playerId,
          replaceCurrent
        });
        hydrateSessionState(payload?.session || null);
      } catch (error) {
        setSceneError(error.message || 'Unable to surface the next scrap.');
      } finally {
        setIsLoading(false);
      }
    }, delayMs);
  };

  useEffect(() => {
    let active = true;
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;

    clearTimers();
    localCursorRef.current = 0;
    setActiveFragment(null);
    setActiveFragmentReady(false);
    setJotSourceFragment(null);
    setBundle([]);
    setDraftLine('');
    setLastSubmittedLine('');
    setLatestFragment('');
    setCapturedTextual(0);
    setRequiredCount(requiredTextualJots);
    setSessionReady(false);
    setSceneError('');
    setBackgroundHasFailed(false);

    const initializeLocal = (notice = '') => {
      if (!active) return;
      setSessionMode('local');
      setRuntimeNotice(notice);
      setIsLoading(false);
      setPhase('observing');
      setCapturedTextual(0);
      setRequiredCount(requiredTextualJots);
      fragmentDrawTimerRef.current = window.setTimeout(() => {
        if (!active || runTokenRef.current !== token) return;
        activateLocalNextFragment();
        setSessionReady(true);
      }, promptDelayMs);
    };

    const initializeRemote = async () => {
      if (!sessionId) {
        initializeLocal('');
        return;
      }
      setSessionMode('remote');
      setRuntimeNotice('');
      setIsLoading(true);
      try {
        const payload = await startWellSession(apiBaseUrl, {
          sessionId,
          playerId
        });
        if (!active || runTokenRef.current !== token) return;
        const session = payload?.session || null;
        hydrateSessionState(session);
        setSessionReady(true);
        if (!session?.currentFragment && !session?.readyForHandoff && session?.status !== 'completed') {
          void requestRemoteFragment({ delayMs: promptDelayMs });
        }
      } catch (error) {
        initializeLocal('Using a local textual demo loop because the well session API is unavailable.');
        setSceneError('');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void initializeRemote();

    return () => {
      active = false;
      clearTimers();
    };
  }, [
    apiBaseUrl,
    fragmentLifetimeMs,
    fragmentSpawnMs,
    normalizedTextualBank,
    playerId,
    promptDelayMs,
    promptDock,
    requiredTextualJots,
    sessionId
  ]);

  useEffect(() => {
    if (!onStateChange) return;
    onStateChange({
      phase,
      mode: sessionMode,
      latestFragment,
      readyForWriting: phase === 'jotting',
      draftLine,
      submittedLine: lastSubmittedLine,
      wordCount,
      wordsRemaining,
      fragmentCount: activeFragment ? 1 : 0,
      bundle,
      captured: {
        textual: capturedTextual
      },
      required: {
        textual: requiredCount
      },
      readyForHandoff,
      runtimeNotice,
      sceneError
    });
  }, [
    activeFragment,
    bundle,
    capturedTextual,
    draftLine,
    lastSubmittedLine,
    latestFragment,
    onStateChange,
    phase,
    readyForHandoff,
    requiredCount,
    runtimeNotice,
    sceneError,
    sessionMode,
    wordCount,
    wordsRemaining
  ]);

  const handleDraftChange = (event) => {
    if (phase !== 'jotting' || isSubmitting || isCompleting) return;
    const nextValue = clampDraftToWordLimit(event.target.value, wordLimit);
    setDraftLine(nextValue);
  };

  const handleDraftKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmitJot();
    }
  };

  const handleBeginJot = () => {
    if (!canJot || !activeFragment) return;
    if (fragmentExpiryTimerRef.current) {
      window.clearTimeout(fragmentExpiryTimerRef.current);
      fragmentExpiryTimerRef.current = null;
    }
    setPhase('jotting');
    setActiveFragmentReady(false);
    setDraftLine('');
    setJotSourceFragment(activeFragment);
    setActiveFragment(null);
  };

  const handleSubmitJot = async () => {
    if (!canSubmitJot) return;
    const normalizedLine = truncateToWordLimit(draftLine, wordLimit);
    setDraftLine(normalizedLine);
    setLastSubmittedLine(normalizedLine);
    setIsSubmitting(true);
    setSceneError('');

    try {
      if (sessionMode === 'remote' && sessionId) {
        const payload = await saveWellJot(apiBaseUrl, {
          sessionId,
          playerId,
          fragmentId: jotSourceFragment?.id || '',
          rawJotText: normalizedLine
        });
        const session = payload?.session || null;
        hydrateSessionState(session);
        if (session && !session.readyForHandoff && session.status !== 'completed') {
          void requestRemoteFragment({ delayMs: fragmentSpawnMs });
        }
      } else {
        const nextBundle = [
          ...bundle,
          {
            jotId: createId(),
            fragmentId: jotSourceFragment?.id || createId(),
            fragmentType: 'textual',
            rawJotText: normalizedLine,
            createdAt: new Date().toISOString()
          }
        ];
        setBundle(nextBundle);
        setCapturedTextual(nextBundle.length);
        if (nextBundle.length >= requiredCount) {
          setActiveFragmentReady(false);
          setPhase('bundle-ready');
        } else {
          setPhase('observing');
          fragmentDrawTimerRef.current = window.setTimeout(() => {
            activateLocalNextFragment();
          }, fragmentSpawnMs);
        }
      }
      setJotSourceFragment(null);
    } catch (error) {
      setSceneError(error.message || 'Unable to save the jot.');
      setPhase('jotting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHandoff = async () => {
    if (!canHandoff) return;
    setIsSubmitting(true);
    setSceneError('');
    try {
      let nextBundle = bundle;
      if (sessionMode === 'remote' && sessionId) {
        const payload = await handoffWellBundle(apiBaseUrl, {
          sessionId,
          playerId
        });
        const session = payload?.session || null;
        nextBundle = Array.isArray(session?.bundle) ? session.bundle : nextBundle;
        hydrateSessionState(session, { resumeDeparture: true });
      } else {
        setPhase('departing');
      }

      const summary = buildBundleSummary(nextBundle);
      completionTimerRef.current = window.setTimeout(() => {
        onComplete?.(summary);
        setPhase('completed');
      }, departureDurationMs);
    } catch (error) {
      setSceneError(error.message || 'Unable to hand the bundle to the falcon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const promptCardClasses = [
    'roseWellPromptCard',
    sessionReady ? 'is-visible' : '',
    phase === 'departing' || phase === 'completed' ? 'is-departing' : '',
    promptDock === 'bottom' ? 'is-bottomDock' : 'is-sideDock'
  ].filter(Boolean).join(' ');

  return (
    <div className={`roseWellScene ${phase === 'departing' ? 'is-departing' : ''}`}>
      <div
        className="roseWellScene__backdrop"
      >
        <img
          className="roseWellScene__backdropImage"
          src={resolvedBackgroundSrc}
          alt=""
          aria-hidden="true"
          onError={() => {
            if (resolvedBackgroundSrc !== DEFAULT_BACKGROUND_SRC) {
              setBackgroundHasFailed(true);
            }
          }}
        />
      </div>
      <div className="roseWellScene__waterGlow" />
      <div className="roseWellScene__vignette" />

      <div className="roseWellScene__roof">
        <div className="roseWellScene__beam" />
        <div className={`roseWellFalcon ${phase === 'bundle-ready' ? 'is-attentive' : ''} ${phase === 'departing' ? 'is-departing' : ''}`}>
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

      <RoseWellFragmentCanvas
        fragments={activeFragment ? [activeFragment] : []}
        fragmentLeftShift={0}
        fragmentTopShift={0}
      />

      <aside className="roseWellBundle">
        <p className="roseWellBundle__eyebrow">Gathered Bundle</p>
        <div className="roseWellBundle__count">
          <strong>{capturedTextual}</strong>
          <span>/ {requiredCount}</span>
        </div>
        <div className="roseWellBundle__list">
          {bundle.length ? bundle.map((entry) => (
            <article key={entry.jotId || entry.fragmentId} className="roseWellBundle__entry">
              <p>{entry.rawJotText}</p>
            </article>
          )) : (
            <p className="roseWellBundle__empty">No scraps gathered yet.</p>
          )}
        </div>
      </aside>

      <div className={promptCardClasses}>
        <div className="roseWellPromptCard__feather" aria-hidden="true" />
        {phase === 'departing' || phase === 'completed' ? (
          <>
            <p className="roseWellPromptCard__label">{departureStatusText}</p>
            <p className="roseWellPromptCard__line">"{buildBundleSummary(bundle)}"</p>
          </>
        ) : phase === 'bundle-ready' ? (
          <>
            <p className="roseWellPromptCard__label">{impatienceStatusText}</p>
            <p className="roseWellPromptCard__hint">The bundle is complete. The falcon will not wait much longer.</p>
            <div className="roseWellPromptCard__footer">
              <span>{capturedTextual} gathered scraps</span>
              <button
                type="button"
                className="roseWellPromptCard__button"
                onClick={handleHandoff}
                disabled={!canHandoff}
              >
                {handoffLabel}
              </button>
            </div>
          </>
        ) : phase === 'jotting' ? (
          <>
            <p className="roseWellPromptCard__label">{promptLabel}</p>
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
                disabled={isSubmitting || isCompleting}
              />
            </div>
            <div className="roseWellPromptCard__footer">
              <span>{wordsRemaining} words left</span>
              <button
                type="button"
                className="roseWellPromptCard__button"
                onClick={() => void handleSubmitJot()}
                disabled={!canSubmitJot}
              >
                Save jot
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="roseWellPromptCard__label">{observingLabel}</p>
            <p className="roseWellPromptCard__hint">{observingPromptHint}</p>
            <div className="roseWellPromptCard__footer">
              <span>{capturedTextual} of {requiredCount} gathered</span>
              <button
                type="button"
                className="roseWellPromptCard__button"
                onClick={handleBeginJot}
                disabled={!canJot}
              >
                {jotActionLabel}
              </button>
            </div>
          </>
        )}
        {isLoading ? <p className="roseWellPromptCard__status">Listening to the water…</p> : null}
        {runtimeNotice ? <p className="roseWellPromptCard__status">{runtimeNotice}</p> : null}
        {sceneError ? <p className="roseWellPromptCard__status roseWellPromptCard__status--error">{sceneError}</p> : null}
      </div>
    </div>
  );
}

export default RoseCourtWellScene;

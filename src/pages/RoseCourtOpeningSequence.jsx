import React, { useEffect, useMemo, useRef, useState } from 'react';
import './RoseCourtOpeningSequence.css';

const DEVICE_TURN_MS = 920;
const LINK_BOOT_MS = 1560;
const RIDDLE_FLIP_MS = 1180;
const MAX_RIDDLE_ATTEMPTS = 5;

const ACCEPTED_ANSWERS = new Set([
  'a dove cot',
  'dove cot',
  'dovecot'
]);

const BLUE_SCREEN_LINES = Object.freeze([
  'opening suspicious link...',
  'identity confirmed: storyteller society',
  'curtain protocol engaged',
  'question incoming'
]);

const MONTAGE_BEATS = Object.freeze([
  {
    id: 'forgotten',
    eyebrow: 'After the fifth miss',
    title: 'You seemed to have forgotten all about it.',
    body: 'Days folded over the failed attempts. The carrier went thin. Morning returned and pretended none of it had ever happened.',
    direction: 'Let the silence sit. The trace returns only after routine has won.',
    image: ''
  },
  {
    id: 'coffee',
    eyebrow: 'One morning',
    title: 'But then, as you were sipping your coffee, you found strange remains on it.',
    body: 'There in the residue sat a rose-like rise, a wall of arches, and a shape that looked less like chance the longer you stared.',
    direction: 'The first return should feel domestic, almost embarrassingly small.',
    image: '/assets/montage/rose_court_cup.png'
  },
  {
    id: 'plants',
    eyebrow: 'Later still',
    title: 'Even when you watered your plants, you saw it again.',
    body: 'The same structure. Moss-covered now. Damp, patient, and far too deliberate to dismiss as a trick of water.',
    direction: 'Show that the pattern survives in green places too.',
    image: '/assets/montage/rose_court_plant.png'
  },
  {
    id: 'wall',
    eyebrow: 'And another',
    title: 'And then in a wall, half-lost in daylight and dust.',
    body: 'A tiny lit hollow. A ring of openings. The same shape again, waiting in stone as calmly as if it belonged there.',
    direction: 'Let the repetition harden into certainty.',
    image: '/assets/montage/rose_court_wall.png'
  },
  {
    id: 'auction',
    eyebrow: 'At last',
    title: 'Then you saw it, as clear as day, in a post about an auction at an old antique shop in Portugal.',
    body: 'It was clearly there. The same strange structure. The rosebud. The hall. No dream now, no residue, no accident.',
    direction: 'End on recognition, not surprise. By now the hall has already chosen you.',
    image: '/assets/montage/rosecourt_tapestry.png',
    ctaLabel: 'Follow the trace'
  }
]);

const normalizeAnswer = (value = '') => (
  value
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const getSequenceLabel = (phase, montageIndex) => {
  if (phase === 'device') return 'Act I: Weak Carrier';
  if (phase === 'society-message') return 'Act II: Society Dispatch';
  if (phase === 'link-bridge') return 'Act III: Relay Window';
  if (phase === 'riddle') return 'Act IV: The Question';
  if (phase === 'riddle-success') return 'Act IV: Connection Confirmed';
  if (phase === 'montage') {
    const beat = MONTAGE_BEATS[montageIndex] || MONTAGE_BEATS[0];
    return `Act V: ${beat.id}`;
  }
  return 'Rose Court opening';
};

const getDirectionHint = (phase, montageBeat, triesRemaining) => {
  if (phase === 'device') return 'Turn the handset and break the routine.';
  if (phase === 'society-message') return 'Open the fishy link before the ink dries.';
  if (phase === 'link-bridge') return 'Hold through the blue relay.';
  if (phase === 'riddle') {
    return triesRemaining <= 1
      ? 'Last chance before the carrier gives out.'
      : 'Keep the answer plain. The curtain hates hesitation.';
  }
  if (phase === 'riddle-success') return 'Step through while the connection holds.';
  if (phase === 'montage') {
    return montageBeat?.direction
      || (montageBeat?.ctaLabel
        ? 'Follow the trace inward.'
        : 'Let the image linger, then continue.');
  }
  return 'Proceed.';
};

function RoseCourtOpeningSequence({
  onComplete,
  onStateChange
}) {
  const [phase, setPhase] = useState('device');
  const [deviceTurning, setDeviceTurning] = useState(false);
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [riddleFlipped, setRiddleFlipped] = useState(false);
  const [riddleFeedback, setRiddleFeedback] = useState('');
  const [montageIndex, setMontageIndex] = useState(0);
  const timeoutIdsRef = useRef([]);
  const riddleInputRef = useRef(null);

  const triesRemaining = MAX_RIDDLE_ATTEMPTS - attemptsUsed;
  const montageBeat = MONTAGE_BEATS[montageIndex] || MONTAGE_BEATS[0];
  const montageCounter = `${String(montageIndex + 1).padStart(2, '0')} / ${String(MONTAGE_BEATS.length).padStart(2, '0')}`;

  const introState = useMemo(() => ({
    mode: 'rose-court-opening-sequence',
    phase,
    label: getSequenceLabel(phase, montageIndex),
    attemptsUsed,
    triesRemaining,
    prompt: phase === 'riddle' ? "what's on top of the rosebud?" : '',
    feedback: riddleFeedback,
    acceptedAnswerHint: phase === 'riddle' ? 'dove cot' : '',
    montageBeatId: phase === 'montage' ? montageBeat.id : '',
    montageTitle: phase === 'montage' ? montageBeat.title : '',
    directionHint: getDirectionHint(phase, montageBeat, triesRemaining),
    awaitingInput: phase === 'riddle',
    awaitingContinue: phase === 'device'
      || phase === 'society-message'
      || phase === 'riddle-success'
      || phase === 'montage',
    deviceTurning,
    riddleFlipped
  }), [
    attemptsUsed,
    deviceTurning,
    montageBeat.id,
    montageBeat.title,
    montageIndex,
    phase,
    riddleFeedback,
    riddleFlipped,
    triesRemaining
  ]);

  useEffect(() => {
    onStateChange?.(introState);
  }, [introState, onStateChange]);

  useEffect(() => () => {
    if (typeof window === 'undefined') return;
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
  }, []);

  useEffect(() => {
    if (phase !== 'riddle') return;
    riddleInputRef.current?.focus();
  }, [phase, riddleFlipped]);

  const scheduleTimeout = (callback, delay) => {
    if (typeof window === 'undefined') return;
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((entry) => entry !== timeoutId);
      callback();
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
  };

  const handleTurnDevice = () => {
    if (deviceTurning) return;
    setDeviceTurning(true);
    scheduleTimeout(() => {
      setDeviceTurning(false);
      setPhase('society-message');
    }, DEVICE_TURN_MS);
  };

  const handleSuspiciousLink = () => {
    setPhase('link-bridge');
    scheduleTimeout(() => {
      setPhase('riddle');
    }, LINK_BOOT_MS);
  };

  const handleRiddleSubmit = (event) => {
    event.preventDefault();
    const normalizedAnswer = normalizeAnswer(riddleAnswer);
    if (!normalizedAnswer) {
      setRiddleFeedback('The curtain waits for an answer.');
      return;
    }

    if (ACCEPTED_ANSWERS.has(normalizedAnswer)) {
      setRiddleFeedback('So finally, the connection held.');
      setPhase('riddle-success');
      return;
    }

    const nextAttemptsUsed = attemptsUsed + 1;
    const nextTriesRemaining = Math.max(0, MAX_RIDDLE_ATTEMPTS - nextAttemptsUsed);
    setAttemptsUsed(nextAttemptsUsed);
    setRiddleAnswer('');
    setRiddleFlipped(true);
    setRiddleFeedback(
      nextTriesRemaining > 0
        ? `No. The signal slips. ${nextTriesRemaining} tries remain.`
        : 'No. The carrier gives out. There are no more tries.'
    );

    scheduleTimeout(() => {
      setRiddleFlipped(false);
      if (nextAttemptsUsed >= MAX_RIDDLE_ATTEMPTS) {
        setMontageIndex(0);
        setPhase('montage');
      }
    }, RIDDLE_FLIP_MS);
  };

  const handleMontageAdvance = () => {
    if (montageIndex >= MONTAGE_BEATS.length - 1) {
      onComplete?.();
      return;
    }
    setMontageIndex((current) => current + 1);
  };

  if (phase === 'device') {
    return (
      <section className="roseIntro roseIntro--device" aria-label="Opening sequence">
        <div className="roseIntro__deviceStage">
          <div className={`roseIntro__deviceCard ${deviceTurning ? 'roseIntro__deviceCard--turning' : ''}`}>
            <div className="roseIntro__imageHalo" aria-hidden="true" />
            <img
              className="roseIntro__deviceImage"
              src="/tapestries/intro.png"
              alt="Decorated message screen"
            />
          </div>
          <div className="roseIntro__captionBlock roseIntro__captionBlock--device">
            <p className="roseIntro__sceneMark roseIntro__reveal roseIntro__reveal--1">Rose Court · Opening cinematic</p>
            <p className="roseIntro__eyebrow roseIntro__reveal roseIntro__reveal--2">Act I · The curtain misbehaves.</p>
            <p className="roseIntro__chapterTitle roseIntro__reveal roseIntro__reveal--3">Weak Carrier</p>
            <h1 className="roseIntro__reveal roseIntro__reveal--4">One day, as you were browsing your most loyal messaging app...</h1>
            <p className="roseIntro__lead roseIntro__reveal roseIntro__reveal--5">
              It was the same faithful curtain you always trusted. Which is why the request to turn it over felt wrong immediately.
            </p>
            <p className="roseIntro__directorNote roseIntro__reveal roseIntro__reveal--6">
              Direction: hold on the ordinary for one beat longer than feels comfortable, then turn the handset.
            </p>
            <div className="roseIntro__cueBar roseIntro__reveal roseIntro__reveal--7">
              <span className="roseIntro__cue">Tap to turn the handset</span>
              <button type="button" className="roseIntro__cta" onClick={handleTurnDevice}>
                Turn it over
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'society-message') {
    return (
      <section className="roseIntro roseIntro--parchment" aria-label="Storyteller Society message">
        <div className="roseIntro__sheet">
          <div className="roseIntro__sheetHeader">
            <p className="roseIntro__sceneMark roseIntro__sceneMark--ink roseIntro__reveal roseIntro__reveal--1">Act II · Society Dispatch</p>
            <p className="roseIntro__chapterTitle roseIntro__chapterTitle--ink roseIntro__reveal roseIntro__reveal--2">The Society Writes Back</p>
          </div>
          <div className="roseIntro__seal roseIntro__reveal roseIntro__reveal--3">
            <img src="/textures/sigil_storytellers_society.png" alt="" aria-hidden="true" />
          </div>
          <p className="roseIntro__eyebrow roseIntro__reveal roseIntro__reveal--4">Storyteller Society</p>
          <div className="roseIntro__scriptPanel roseIntro__reveal roseIntro__reveal--5">
            <p className="roseIntro__scriptText">
              So finally, we made a connection.
              <br />
              Brief as it is.
              <br />
              We&apos;ll continue talking once you reach the majestic grand walls of the Rosebud Hall.
            </p>
            <p className="roseIntro__scriptSignature">Drawn in ink and feather, not typed.</p>
          </div>
          <p className="roseIntro__sheetAside roseIntro__reveal roseIntro__reveal--6">
            The carrier feels hand-drawn, thin, and temporary. As if the note will dry, crack, and vanish if you blink.
          </p>
          <button
            type="button"
            className="roseIntro__fishyLink roseIntro__reveal roseIntro__reveal--7"
            onClick={handleSuspiciousLink}
            autoFocus
          >
            storyteller.society.not-spam-at-all.ink/rose/hall
          </button>
          <p className="roseIntro__linkInstruction roseIntro__reveal roseIntro__reveal--8">Open the link before the page dries.</p>
        </div>
      </section>
    );
  }

  if (phase === 'link-bridge') {
    return (
      <section className="roseIntro roseIntro--terminal" aria-label="Blue screen transition">
        <div className="roseIntro__terminalCurtain" aria-hidden="true">
          <img src="/tapestries/curtain.png" alt="" />
        </div>
        <div className="roseIntro__terminalFrame">
          <p className="roseIntro__sceneMark roseIntro__sceneMark--blue roseIntro__reveal roseIntro__reveal--1">Act III · Relay Window</p>
          <p className="roseIntro__chapterTitle roseIntro__chapterTitle--blue roseIntro__reveal roseIntro__reveal--2">The Curtain Becomes a Question</p>
          <div className="roseIntro__terminalHud roseIntro__reveal roseIntro__reveal--3">
            <span>storyteller society relay</span>
            <span>carrier unstable</span>
          </div>
          <div className="roseIntro__carrierMeter" aria-hidden="true">
            {BLUE_SCREEN_LINES.map((line, index) => (
              <span
                key={`carrier-${line}`}
                className={`roseIntro__carrierBar roseIntro__reveal roseIntro__reveal--${Math.min(index + 3, 8)}`}
              />
            ))}
          </div>
          <div className="roseIntro__terminal">
            {BLUE_SCREEN_LINES.map((line, index) => (
              <p
                key={line}
                className={`roseIntro__terminalLine ${index === BLUE_SCREEN_LINES.length - 1 ? 'roseIntro__terminalLine--accent' : ''} roseIntro__reveal roseIntro__reveal--${Math.min(index + 4, 8)}`}
              >
                {line}
              </p>
            ))}
          </div>
          <p className="roseIntro__terminalPrompt roseIntro__reveal roseIntro__reveal--8">
            Stand by. No flourish. Just the blue screen, then the curtain.
          </p>
        </div>
      </section>
    );
  }

  if (phase === 'riddle' || phase === 'riddle-success') {
    const isSuccess = phase === 'riddle-success';
    return (
      <section className="roseIntro roseIntro--question" aria-label="Rosebud question">
        <div className="roseIntro__terminalCurtain roseIntro__terminalCurtain--question" aria-hidden="true">
          <img src="/tapestries/curtain.png" alt="" />
        </div>
        <div key={phase} className={`roseIntro__riddleShell ${riddleFlipped ? 'roseIntro__riddleShell--flipped' : ''}`}>
          <div className="roseIntro__riddleFace roseIntro__riddleFace--front">
            <p className="roseIntro__sceneMark roseIntro__sceneMark--blue">Act IV · The Question</p>
            <p className="roseIntro__chapterTitle roseIntro__chapterTitle--blue">Name What Crowns It</p>
            <p className="roseIntro__eyebrow">Carrier weak · attempts left {triesRemaining}</p>
            <h2 className="roseIntro__question">what&apos;s on top of the rosebud?</h2>
            <p className="roseIntro__directorNote roseIntro__directorNote--blue">
              {triesRemaining <= 1
                ? 'Direction: no hint now. The carrier is nearly gone.'
                : 'Direction: keep the answer plain. The carrier only wants the name.'}
            </p>
            <div className="roseIntro__attemptTrack" aria-hidden="true">
              {Array.from({ length: MAX_RIDDLE_ATTEMPTS }, (_, index) => (
                <span
                  key={`attempt-${index}`}
                  className={`roseIntro__attemptPip ${index < attemptsUsed ? 'roseIntro__attemptPip--spent' : ''}`}
                />
              ))}
            </div>
            {isSuccess ? (
              <>
                <p className="roseIntro__riddleStatus roseIntro__riddleStatus--success">{riddleFeedback}</p>
                <p className="roseIntro__directionLine roseIntro__directionLine--question">
                  The connection holds. Step through before it thins again.
                </p>
                <button type="button" className="roseIntro__cta" onClick={() => onComplete?.()}>
                  Continue to Rose Court
                </button>
              </>
            ) : (
              <form className="roseIntro__riddleForm" onSubmit={handleRiddleSubmit}>
                <p className="roseIntro__directionLine roseIntro__directionLine--question">
                  Answer before the curtain turns again.
                </p>
                <label className="roseIntro__fieldLabel" htmlFor="rosebud-answer">
                  Your reply
                </label>
                <input
                  ref={riddleInputRef}
                  id="rosebud-answer"
                  type="text"
                  value={riddleAnswer}
                  onChange={(event) => setRiddleAnswer(event.target.value)}
                  className="roseIntro__field"
                  autoComplete="off"
                  spellCheck="false"
                  disabled={riddleFlipped}
                />
                <div className="roseIntro__riddleActions">
                  <button type="submit" className="roseIntro__cta" disabled={riddleFlipped}>
                    Answer
                  </button>
                  <span className="roseIntro__riddleMeta">{attemptsUsed} / {MAX_RIDDLE_ATTEMPTS} attempts used</span>
                </div>
                {riddleFeedback ? <p className="roseIntro__riddleStatus">{riddleFeedback}</p> : null}
              </form>
            )}
          </div>
          <div className="roseIntro__riddleFace roseIntro__riddleFace--back" aria-hidden="true">
            <p className="roseIntro__eyebrow">Carrier slipping</p>
            <p className="roseIntro__flipMessage">{riddleFeedback || 'No. The curtain turns again.'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="roseIntro roseIntro--montage" aria-label="Memory montage">
      <div key={montageBeat.id} className="roseIntro__montageCard">
        <div className="roseIntro__montageCopy">
          <p className="roseIntro__sceneMark roseIntro__sceneMark--montage">Act V · Returning Traces</p>
          <p className="roseIntro__chapterTitle roseIntro__chapterTitle--montage">The Shape Refuses to Leave</p>
          <p className="roseIntro__eyebrow">{montageBeat.eyebrow}</p>
          <h2>{montageBeat.title}</h2>
          <p>{montageBeat.body}</p>
          <p className="roseIntro__directorNote roseIntro__directorNote--montage">
            {getDirectionHint(phase, montageBeat, triesRemaining)}
          </p>
          <div className="roseIntro__riddleActions">
            <button type="button" className="roseIntro__cta" onClick={handleMontageAdvance}>
              {montageBeat.ctaLabel || 'Continue'}
            </button>
            <span className="roseIntro__riddleMeta">
              Trace {montageCounter}
            </span>
          </div>
        </div>
        {montageBeat.image ? (
          <figure className="roseIntro__montageFigure">
            <img src={montageBeat.image} alt="" />
            <figcaption className="roseIntro__montagePlate">
              <span className="roseIntro__montagePlateLabel">Trace {montageCounter}</span>
              <span>{montageBeat.eyebrow}</span>
            </figcaption>
          </figure>
        ) : (
          <div className="roseIntro__memoryVeil" aria-hidden="true">
            <div className="roseIntro__intertitle">
              <span className="roseIntro__intertitleMark">Intertitle</span>
              <p>The question went quiet.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default RoseCourtOpeningSequence;

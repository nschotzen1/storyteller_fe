import React, { useState, useEffect, useRef } from 'react';
import './TypeWriter.css';

// --- Constants matching your CSS ---
const FILM_HEIGHT = 1400;
const LINE_HEIGHT = 2.4 * 16;
const TOP_OFFSET = 180;
const BOTTOM_PADDING = 220;
const FRAME_HEIGHT = 520;
const MAX_LINES = Math.floor((FILM_HEIGHT - TOP_OFFSET - BOTTOM_PADDING) / LINE_HEIGHT);

const keys = [
  'Q','W','E','R','T','Y','U','I','O','P',
  'A','S','D','F','G','H','J','K','L',
  'Z','X','C','V','B','N','M','THE XEROFAG'
];

const SERVER = 'http://localhost:5001';

const fetchNextFilmImage = async (pageText, sessionId) => {
  const response = await fetch(`${SERVER}/api/next_film_image`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text: pageText })
  });
  const data = await response.json();
  return data.image_url;
};

const getRandomTexture = (key) => {
  if (!key) return null;
  const normalizedKey = key.replace(/\s+/g, '_').toUpperCase();
  return `/textures/keys/${normalizedKey}_1.png`;
};

const playKeySound = () => {
  const audio = new Audio('/sounds/typewriter-clack.mp3');
  audio.volume = 0.3;
  audio.play();
};
const playEnterSound = () => {
  const audio = new Audio('/sounds/typewriter-enter.mp3');
  audio.volume = 0.3;
  audio.play();
};
const playXerofagHowl = () => {
  const roll = Math.floor(Math.random() * 20) + 1;
  let audioSrc;
  if (roll > 12) {
    const variant = Math.floor(Math.random() * 5) + 1;
    audioSrc = `/sounds/the_xerofag_${variant}.mp3`;
  } else {
    const howlIndex = Math.floor(Math.random() * 3) + 1;
    audioSrc = `/sounds/howl_${howlIndex}.mp3`;
  }
  const audio = new Audio(audioSrc);
  audio.volume = 0.4;
  audio.play();
};
const playEndOfPageSound = () => {
  const audio = new Audio('/sounds/page_turn.mp3');
  audio.volume = 0.4;
  audio.play();
};

function countLines(typed, ghost = '') {
  return (typed + ghost).split('\n').length;
}

const TypewriterFramework = () => {
  // --- State ---
  const [typedText, setTypedText] = useState('');
  const [inputBuffer, setInputBuffer] = useState('');
  const [typingAllowed, setTypingAllowed] = useState(true);
  const [lastPressedKey, setLastPressedKey] = useState(null);
  const [keyTextures, setKeyTextures] = useState(keys.map(getRandomTexture));
  const [responses, setResponses] = useState([]);
  const [responseQueued, setResponseQueued] = useState(false);
  const [lastGeneratedLength, setLastGeneratedLength] = useState(0);
  const [ghostKeyQueue, setGhostKeyQueue] = useState([]);
  const [scrollMode, setScrollMode] = useState('cinematic');
  const [filmBgUrl, setFilmBgUrl] = useState('/textures/decor/film_frame_desert.png');
  const [pageChangeInProgress, setPageChangeInProgress] = useState(false);
  const [isSlidingLeft, setIsSlidingLeft] = useState(false);
  const [prevFilmBgUrl, setPrevFilmBgUrl] = useState(null);
  const [nextFilmBgUrl, setNextFilmBgUrl] = useState(null);
  const [slideX, setSlideX] = useState(0);

  const slideWrapperRef = useRef(null);

  // --- Refs ---
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const lastLineRef = useRef(null);
  const strikerRef = useRef(null);

  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('sessionId');
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('sessionId', newId);
    return newId;
  });

  // --- Derived ---
  const ghostText = responses.length > 0 ? responses[responses.length - 1]?.content || '' : '';
  const visibleLineCount = Math.min(countLines(typedText, ghostText), MAX_LINES);
  const neededHeight = TOP_OFFSET + visibleLineCount * LINE_HEIGHT + 4;
  const scrollAreaHeight = Math.max(FRAME_HEIGHT, neededHeight);

  // --- Cinematic Scroll intro ---
  useEffect(() => {
    if (scrollMode !== 'cinematic' || !scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
    const timer = setTimeout(() => {
      cinematicScrollTo(scrollRef, 120, 1600);
      setTimeout(() => setScrollMode('normal'), 1600);
    }, 650);
    return () => clearTimeout(timer);
  }, [scrollMode]);

  function cinematicScrollTo(ref, to, duration = 1700) {
    if (!ref.current) return;
    const start = ref.current.scrollTop;
    const change = to - start;
    const startTime = performance.now();
    function animateScroll(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      ref.current.scrollTop = start + change * ease;
      if (progress < 1) requestAnimationFrame(animateScroll);
    }
    requestAnimationFrame(animateScroll);
  }

  // --- Unified scroll effect ---
  useEffect(() => {
    if (!scrollRef.current || !lastLineRef.current) return;
    if (scrollMode === 'normal') {
      requestAnimationFrame(() => {
        lastLineRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [typedText, ghostText, responses, scrollMode]);

  // --- Page Turn: Scroll up, then slide left (film change) ---
  const handlePageTurnScroll = async () => {
    if (pageChangeInProgress) return;
    setPageChangeInProgress(true);
    setTypingAllowed(false);
    playEndOfPageSound();

    if (scrollRef.current) {
      const start = scrollRef.current.scrollTop;
      const duration = 900;
      const startTime = performance.now();

      function animateScroll(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        scrollRef.current.scrollTop = start - start * ease;
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          scrollRef.current.scrollTop = 0;

          // --- Begin Slide Left ---
          setPrevFilmBgUrl(filmBgUrl);

          // Fetch next film from API!
          fetchNextFilmImage(typedText + ghostText, sessionId).then(newUrl => {
            setNextFilmBgUrl(newUrl || '/textures/decor/film_frame_desert.png');
            setIsSlidingLeft(true);
            setSlideX(0);
              setTimeout(() => {
              setSlideX(-50);
          }, 10);

            // Clear text in prep for next page after slide
            setTypedText('');
            setResponses([]);
            setScrollMode('cinematic');
            setLastGeneratedLength(0);

            // Now, actually start the slide animation
            setTimeout(() => {
              setFilmBgUrl(newUrl || '/textures/decor/film_frame_desert.png');
              setIsSlidingLeft(false);
              setTypingAllowed(true);
              setPageChangeInProgress(false);
            }, 1200); // match slide left duration (CSS 1.2s)
          });
        }
      }
      requestAnimationFrame(animateScroll);
    }
  };

  // --- Keyboard Handler ---
  const handleKeyDown = (e) => {
    if (pageChangeInProgress || !typingAllowed) {
      playEndOfPageSound();
      return;
    }
    const char = e.key === "Enter" ? '\n' : e.key;
    const currentLines = (typedText + ghostText + inputBuffer).split('\n').length;
    if (currentLines >= MAX_LINES && e.key !== 'Backspace') {
      handlePageTurnScroll();
      return;
    }
    setLastPressedKey(e.key.toUpperCase());
    if (e.key.length === 1 || e.key === "Enter") {
      e.preventDefault();
      if (responses.length > 0) {
        commitGhostText();
      }
      setInputBuffer(prev => prev + char);
      setResponseQueued(false);
      // setLastUserInputTime(Date.now()); // If needed for ghostwriter
      if (e.key === "Enter") playEnterSound();
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      setTypedText(prev => prev.slice(0, -1));
      return;
    }
    playKeySound();
  };

  // --- Typewriter Input Buffer ---
  useEffect(() => {
    if (!inputBuffer.length || !typingAllowed) return;
    const char = inputBuffer[0];
    const timeout = setTimeout(() => {
      setTypedText(prev => prev + char);
      setInputBuffer(prev => prev.slice(1));
      if (char === '\n' && strikerRef.current) {
        strikerRef.current.classList.add('striker-return');
        setTimeout(() => {
          if (strikerRef.current) {
            strikerRef.current.classList.remove('striker-return');
          }
        }, 600);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [inputBuffer, typingAllowed]);

  // --- Key Visual State ---
  useEffect(() => {
    if (!lastPressedKey) return;
    const timeout = setTimeout(() => setLastPressedKey(null), 120);
    return () => clearTimeout(timeout);
  }, [lastPressedKey]);

  // --- Key Texture Refresh ---
  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * keyTextures.length);
      setKeyTextures(prev => {
        const updated = [...prev];
        const key = keys[idx];
        updated[idx] = getRandomTexture(key);
        return updated;
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [keyTextures]);

  // --- Ghost Key Typing Simulation ---
  useEffect(() => {
    if (!ghostKeyQueue.length || !typingAllowed) return;
    const interval = setInterval(() => {
      const [nextChar, ...rest] = ghostKeyQueue;
      if (nextChar) {
        setResponses(prev => {
          const last = prev[prev.length - 1] || { content: '' };
          const updated = [...prev.slice(0, -1), { ...last, content: last.content + nextChar }];
          return updated;
        });
      }
      setGhostKeyQueue(rest);
    }, 90);
    return () => clearInterval(interval);
  }, [ghostKeyQueue, typingAllowed]);

  // --- Commit Ghost Text ---
  const commitGhostText = () => {
    const fullGhost = responses.map(r => r.content).join('');
    const merged = typedText + fullGhost;
    const mergedLines = merged.split('\n').length;
    if (mergedLines > MAX_LINES) {
      const allowedLines = merged.split('\n').slice(0, MAX_LINES).join('\n');
      setTypedText(allowedLines);
      setResponses([]);
      setGhostKeyQueue([]);
      setLastGeneratedLength(allowedLines.length);
    } else {
      setTypedText(prev => prev + fullGhost);
      setResponses([]);
      setGhostKeyQueue([]);
      setLastGeneratedLength(typedText.length + fullGhost.length);
    }
  };

  // --- Focus on Mount ---
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // --- Keyboard Rows (unchanged) ---
  const generateRow = (rowKeys) => (
    <div className="key-row">
      {rowKeys.map((key, idx) => {
        const globalIdx = keys.findIndex(k => k === key);
        const texture = keyTextures[globalIdx];
        const offset = Math.floor(Math.random() * 3) - 1;
        const tilt = (Math.random() * 1.4 - 0.7).toFixed(2);
        return (
          <div
            key={key + idx}
            className={`typewriter-key-wrapper ${lastPressedKey === key ? 'key-pressed' : ''} ${!typingAllowed ? 'key-disabled' : ''}`}
            style={{ '--offset-y': `${offset}px`, '--tilt': `${tilt}deg` }}
            onClick={() => {
              if (!typingAllowed) {
                playEndOfPageSound();
                return;
              }
              const insertText = key === 'THE XEROFAG' ? 'The Xerofag ' : key;
              const isXerofag = key === 'THE XEROFAG';
              if (responses.length > 0) {
                const ghostText = responses.map(r => r.content).join('');
                setTypedText(prev => prev + ghostText + insertText);
                setResponses([]);
                setGhostKeyQueue([]);
                setLastGeneratedLength(typedText.length + ghostText.length + insertText.length);
              } else {
                setInputBuffer(prev => prev + insertText);
              }
              setLastPressedKey(key);
              isXerofag ? playXerofagHowl() : playKeySound();
            }}
          >
            {texture && (
              <img
                src={texture}
                alt={`Key ${key}`}
                className={`typewriter-key-img ${!typingAllowed ? 'key-disabled-img' : ''}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // --- Render ---
  return (
    <div
      className="typewriter-container"
      tabIndex="0"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      <img
        src="/textures/overlay_grit_shell.png"
        alt="grit shell overlay"
        className="typewriter-overlay"
      />
      <div className="typewriter-paper-frame" style={{ height: `${FRAME_HEIGHT}px` }}>
        <div className="paper-scroll-area" ref={scrollRef}
          style={{
            height: `${scrollAreaHeight}px`,
            maxHeight: `${FRAME_HEIGHT}px`,
            overflowY: neededHeight > FRAME_HEIGHT ? 'auto' : 'hidden',
            position: 'relative',
            width: '100%',
          }}
        >
          {/* Slide left animation: old frame out, new frame in */}
          {isSlidingLeft && (
  <div
    className="film-slide-wrapper animating"
    style={{
      transform: `translateX(${slideX}%)`,
      transition: isSlidingLeft ? 'transform 1.18s cubic-bezier(0.5,0.15,0.35,1) 0s' : 'none',
      width: '200%',
      height: '100%',
      display: 'flex',
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 10,
      pointerEvents: 'none',
    }}
  >
    {/* Outgoing film/paper */}
    <div
      className="film-bg-slide"
      style={{
        backgroundImage: `url('${prevFilmBgUrl || filmBgUrl}')`,
        width: '50%',
        height: '100%',
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.96,
        boxShadow: 'inset -12px 0 24px #120b05b0',
        filter: 'contrast(1.06) brightness(1.04)',
        position: 'relative',
      }}
    >
      {/* Text and cursor of old page */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div className="typewriter-text film-overlay-text" style={{paddingTop: 180, paddingBottom: 220}}>
          {typedText.split('\n').slice(0, MAX_LINES).map((line, idx, arr) => {
            const isLastLine = idx === arr.length - 1;
            return (
              <div className="typewriter-line" key={idx}>
                {line}
                {isLastLine && (
                  <span className="striker-cursor" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    {/* Incoming film/paper */}
    <div
      className="film-bg-slide"
      style={{
        backgroundImage: `url('${nextFilmBgUrl || filmBgUrl}')`,
        width: '50%',
        height: '100%',
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.96,
        boxShadow: 'inset 12px 0 24px #120b05b0',
        filter: 'contrast(1.04) brightness(1.02)',
        position: 'relative',
      }}
    >
      {/* Could show a flicker overlay, or blank/new text */}
      <div style={{
        position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none',
      }}>
        {/* Blank or opening animation for new page */}
      </div>
    </div>
    {/* Flicker/dust overlay, optional */}
    <div className="film-flicker-overlay" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 11,
      background: `url('/textures/grainy.png'), linear-gradient(90deg,rgba(0,0,0,0.09),rgba(0,0,0,0.16))`,
      opacity: 0.15,
      mixBlendMode: 'multiply',
      animation: 'filmFlicker 1.1s infinite linear alternate',
    }}/>
  </div>
)}


          {/* Normal display: show just the film and text */}
          {!isSlidingLeft && (
            <>
              <div
                className="film-background"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '1400px',
                  zIndex: 1,
                  pointerEvents: 'none',
                  backgroundImage: `url('${filmBgUrl}')`,
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'top center',
                  opacity: 0.92,
                }}
              />
              <div
                className="typewriter-text film-overlay-text"
                style={{ zIndex: 2, position: 'relative' }}
              >
                {(() => {
                  const allLines = (typedText + ghostText).split('\n').slice(0, MAX_LINES);
                  return allLines.map((line, idx) => {
                    const isLastLine = idx === allLines.length - 1;
                    const parts = line.includes("The Xerofag")
                      ? line.split(/(The Xerofag)/g).map((part, i) => (
                          part === "The Xerofag" ? (
                            <span key={i} className="xerofag-highlight">{part}</span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        ))
                      : <span>{line}</span>;
                    return (
                      <div
                        key={idx}
                        className="typewriter-line"
                        ref={isLastLine ? lastLineRef : null}
                      >
                        <span className="last-line-content">
                          {parts}
                          {isLastLine && (
                            <span
                              className={"striker-cursor"}
                              ref={strikerRef}
                              style={{ display: 'inline-block', position: 'relative', left: '0px' }}
                            />
                          )}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="storyteller-sigil">
        <img
          src="/textures/sigil_storytellers_society.png"
          alt="Storyteller's Society Sigil"
        />
      </div>
      <div className="keyboard-plate">
        {generateRow(keys.slice(0, 10))}
        {generateRow(keys.slice(10, 20))}
        {generateRow(keys.slice(20))}
        <div className="key-row spacebar-row">
          <div
            className={`spacebar-wrapper ${!typingAllowed ? 'key-disabled' : ''}`}
            onClick={() => {
              if (!typingAllowed) {
                playEndOfPageSound();
                return;
              }
              setInputBuffer(prev => prev + ' ');
              setLastPressedKey(' ');
              playKeySound();
            }}
          >
            <img
              src="/textures/keys/spacebar.png"
              alt="Spacebar"
              className={`spacebar-img ${!typingAllowed ? 'key-disabled-img' : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypewriterFramework;

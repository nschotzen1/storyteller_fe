import React, { useState, useEffect, useRef } from 'react';
import './TypeWriter.css';

// --- Constants ---
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
  // --- Page History State ---
  const [pages, setPages] = useState([
    { text: '', filmBgUrl: '/textures/decor/film_frame_desert.png' }
  ]);
  const [currentPage, setCurrentPage] = useState(0);

  // --- Typing/Animation State ---
  const [inputBuffer, setInputBuffer] = useState('');
  const [typingAllowed, setTypingAllowed] = useState(true);
  const [lastPressedKey, setLastPressedKey] = useState(null);
  const [keyTextures, setKeyTextures] = useState(keys.map(getRandomTexture));
  const [responses, setResponses] = useState([]);
  const [ghostKeyQueue, setGhostKeyQueue] = useState([]);
  const [scrollMode, setScrollMode] = useState('cinematic');
  const [pageChangeInProgress, setPageChangeInProgress] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [slideX, setSlideX] = useState(0);
  const [slideDir, setSlideDir] = useState('left'); // "left" or "right"
  const [prevFilmBgUrl, setPrevFilmBgUrl] = useState(null);
  const [nextFilmBgUrl, setNextFilmBgUrl] = useState(null);
  const [prevText, setPrevText] = useState('');
  const [nextText, setNextText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const SLIDE_DURATION_MS = 1200;

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
  const { text: pageText, filmBgUrl: pageBg } = pages[currentPage] || {};
  const ghostText = responses.length > 0 ? responses[responses.length - 1]?.content || '' : '';
  const visibleLineCount = Math.min(countLines(pageText, ghostText), MAX_LINES);
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
  }, [pageText, ghostText, responses, scrollMode]);

  // --- PAGE TURN: Scroll up, then slide left (NEW PAGE) ---
  const handlePageTurnScroll = async () => {
    if (pageChangeInProgress) return;
    setPageChangeInProgress(true);
    setTypingAllowed(false);
    setShowCursor(false);
    playEndOfPageSound();

    // Animate scroll up
    if (scrollRef.current) {
      const start = scrollRef.current.scrollTop;
      const duration = 900;
      const startTime = performance.now();

      function animateScroll(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        scrollRef.current.scrollTop = start - start * ease;
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        } else {
          scrollRef.current.scrollTop = 0;

          // Prepare for slide left
          setSlideDir('left');
          setPrevFilmBgUrl(pageBg);
          setPrevText(pageText);

          // Fetch next film image
          fetchNextFilmImage(pageText + ghostText, sessionId).then(newUrl => {
            const newFilm = newUrl || '/textures/decor/film_frame_desert.png';
            setNextFilmBgUrl(newFilm);
            setNextText('');

            // Update pages: Add new blank page, move to it
            setPages(prev => [
              ...prev.slice(0, currentPage + 1),
              { text: '', filmBgUrl: newFilm }
            ]);
            setCurrentPage(prev => prev + 1);

            // Animate slide left
            setIsSliding(true);
            setSlideX(0);
            requestAnimationFrame(() => setSlideX(-50));
            setTimeout(() => {
              setIsSliding(false);
              setTypingAllowed(true);
              setShowCursor(true);
              setPageChangeInProgress(false);
              setResponses([]);
              setScrollMode('cinematic');
            }, SLIDE_DURATION_MS);
          });
        }
      }
      requestAnimationFrame(animateScroll);
    }
  };

  // --- PAGE TURN: Slide right (BACK/NEXT in history) ---
  const handleHistoryNavigation = (targetIdx) => {
    if (pageChangeInProgress || isSliding) return;
    setPageChangeInProgress(true);
    setTypingAllowed(false);
    setShowCursor(false);

    // Slide dir and page content
    const toNext = targetIdx > currentPage;
    setSlideDir(toNext ? 'left' : 'right');
    setPrevFilmBgUrl(pageBg);
    setPrevText(pageText);
    setNextFilmBgUrl(pages[targetIdx]?.filmBgUrl || '/textures/decor/film_frame_desert.png');
    setNextText(pages[targetIdx]?.text || '');

    // Animate slide
    setIsSliding(true);
    setSlideX(0);
    requestAnimationFrame(() => setSlideX(toNext ? -50 : 50));
    setTimeout(() => {
      setIsSliding(false);
      setCurrentPage(targetIdx);
      setTypingAllowed(targetIdx === pages.length - 1);
      setShowCursor(true);
      setPageChangeInProgress(false);
      setResponses([]);
      setScrollMode('cinematic');
    }, SLIDE_DURATION_MS);
  };

  // --- Keyboard Handler ---
  const handleKeyDown = (e) => {
    if (pageChangeInProgress || !typingAllowed) {
      playEndOfPageSound();
      return;
    }
    const char = e.key === "Enter" ? '\n' : e.key;
    const currentLines = (pageText + ghostText + inputBuffer).split('\n').length;
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
      if (e.key === "Enter") playEnterSound();
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      // Remove last char from page text
      setPages(prev => {
        const updated = [...prev];
        updated[currentPage] = {
          ...updated[currentPage],
          text: updated[currentPage].text.slice(0, -1)
        };
        return updated;
      });
      return;
    }
    playKeySound();
  };

  // --- Typing: apply inputBuffer to current page text ---
  useEffect(() => {
    if (!inputBuffer.length || !typingAllowed) return;
    const char = inputBuffer[0];
    const timeout = setTimeout(() => {
      setPages(prev => {
        const updated = [...prev];
        updated[currentPage] = {
          ...updated[currentPage],
          text: updated[currentPage].text + char
        };
        return updated;
      });
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
  }, [inputBuffer, typingAllowed, currentPage]);

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
    const merged = pageText + fullGhost;
    const mergedLines = merged.split('\n').length;
    const newText =
      mergedLines > MAX_LINES
        ? merged.split('\n').slice(0, MAX_LINES).join('\n')
        : pageText + fullGhost;

    setPages(prev => {
      const updated = [...prev];
      updated[currentPage] = {
        ...updated[currentPage],
        text: newText
      };
      return updated;
    });
    setResponses([]);
    setGhostKeyQueue([]);
  };

  // --- Focus on Mount ---
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // --- Keyboard Rows ---
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
                setPages(prev => {
                  const updated = [...prev];
                  updated[currentPage] = {
                    ...updated[currentPage],
                    text: updated[currentPage].text + ghostText + insertText
                  };
                  return updated;
                });
                setResponses([]);
                setGhostKeyQueue([]);
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

  // --- PAGE SLIDE JSX (forwards/backwards) ---
  const getSlideX = () => slideDir === 'left' ? slideX : -slideX;
  const renderSlideWrapper = () => (
    <div
      className="film-slide-wrapper animating"
      style={{
        transform: `translateX(${getSlideX()}%)`,
        transition: isSliding ? `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.5,0.15,0.35,1)` : 'none',
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
          backgroundImage: `url('${prevFilmBgUrl}')`,
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
        {/* Text of outgoing page */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div className="typewriter-text film-overlay-text" style={{paddingTop: 180, paddingBottom: 220}}>
            {prevText.split('\n').slice(0, MAX_LINES).map((line, idx, arr) => {
              const isLastLine = idx === arr.length - 1;
              return (
                <div className="typewriter-line" key={idx}>
                  {line}
                  {isLastLine && showCursor && (
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
          backgroundImage: `url('${nextFilmBgUrl}')`,
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
        {/* Text of incoming page */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div className="typewriter-text film-overlay-text" style={{paddingTop: 180, paddingBottom: 220}}>
            {nextText.split('\n').slice(0, MAX_LINES).map((line, idx, arr) => {
              const isLastLine = idx === arr.length - 1;
              return (
                <div className="typewriter-line" key={idx}>
                  {line}
                  {isLastLine && showCursor && (
                    <span className="striker-cursor" />
                  )}
                </div>
              );
            })}
          </div>
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
  );

  // --- RENDER ---
  return (
    <div
      className="typewriter-container"
      tabIndex="0"
      onKeyDown={handleKeyDown}
      ref={containerRef}
    >
      {/* Page navigation buttons */}
      <div style={{
        position: 'absolute', top: '3vh', left: 0, right: 0, zIndex: 20, width: '100%',
        display: 'flex', justifyContent: 'space-between', pointerEvents: 'auto',
        padding: '0 3vw'
      }}>
        <button
          disabled={currentPage === 0 || isSliding}
          onClick={() => handleHistoryNavigation(currentPage - 1)}
          style={{ fontSize: 24, opacity: currentPage === 0 ? 0.3 : 1 }}
        >← Prev</button>
        <span style={{ color: '#887', fontFamily: 'IBM Plex Mono, monospace', fontSize: 16 }}>
          Page {currentPage + 1} / {pages.length}
        </span>
        <button
          disabled={currentPage === pages.length - 1 || isSliding}
          onClick={() => handleHistoryNavigation(currentPage + 1)}
          style={{ fontSize: 24, opacity: currentPage === pages.length - 1 ? 0.3 : 1 }}
        >Next →</button>
      </div>

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
          {/* Page slide animation */}
          {isSliding && renderSlideWrapper()}

          {/* Normal display */}
          {!isSliding && (
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
                  backgroundImage: `url('${pageBg}')`,
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
                  const allLines = (pageText + ghostText).split('\n').slice(0, MAX_LINES);
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
                          {isLastLine && showCursor && (
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

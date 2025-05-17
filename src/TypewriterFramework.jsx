import React, { useState, useEffect, useRef } from 'react';
import './TypeWriter.css';

// -- Configs matching your CSS --
const FILM_HEIGHT = 1400;   // must match your .film-background
const LINE_HEIGHT = 2.4 * 16; // px, matches CSS
const TOP_OFFSET = 180;      // px, for where first line starts
const BOTTOM_PADDING = 220;   // px, so cursor never flush with bottom
const FRAME_HEIGHT = 520;     // matches .typewriter-paper-frame

const MAX_LINES = Math.floor((FILM_HEIGHT - TOP_OFFSET - BOTTOM_PADDING) / LINE_HEIGHT);

const keys = [
  'Q','W','E','R','T','Y','U','I','O','P',
  'A','S','D','F','G','H','J','K','L',
  'Z','X','C','V','B','N','M','THE XEROFAG'
];
const materialOptions = ['stone', 'bone', 'brass'];
const SERVER = 'http://localhost:5001'; // replace if needed

const fetchTypewriterReply = async (text) => {
  const response = await fetch(`${SERVER}/api/send_typewriter_text`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'example-session', message: text })
  });
  const data = await response.json();
  return data; // expects { content, font, font_size, font_color }
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

const playEnterSound = () => {
  const audio = new Audio('/sounds/typewriter-enter.mp3');
  audio.volume = 0.3;
  audio.play();
};

const playEndOfPageSound = () => {
  const audio = new Audio('/sounds/typewriter-bell.mp3');
  audio.volume = 0.4;
  audio.play();
};

function countLines(typed, ghost = '') {
  return (typed + ghost).split('\n').length;
}

const TypewriterFramework = () => {
  const [lastUserInputTime, setLastUserInputTime] = useState(Date.now());
  const [typedText, setTypedText] = useState('');
  const [inputBuffer, setInputBuffer] = useState('');
  const [typingAllowed, setTypingAllowed] = useState(true);
  const [lastPressedKey, setLastPressedKey] = useState(null);
  const [keyTextures, setKeyTextures] = useState(keys.map(getRandomTexture));
  const [responses, setResponses] = useState([]);
  const [responseQueued, setResponseQueued] = useState(false);
  const [lastGeneratedLength, setLastGeneratedLength] = useState(0);
  const [ghostKeyQueue, setGhostKeyQueue] = useState([]);
  const [endOfPageReached, setEndOfPageReached] = useState(false);
  const [cinematicIntro, setCinematicIntro] = useState(true); 
  const [scrollMode, setScrollMode] = useState('cinematic');
  const [initialLineCount, setInitialLineCount] = useState(0);
  const [hasUserTyped, setHasUserTyped] = useState(false);




  // refs
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const lastLineRef = useRef(null);
  const strikerRef = useRef(null);
  

    function cinematicScrollTo(ref, to, duration = 1700) {
  if (!ref.current) return;
  const start = ref.current.scrollTop;
  const change = to - start;
  const startTime = performance.now();

  function animateScroll(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Cinematic ease (ease-in-out cubic)
    const ease = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    ref.current.scrollTop = start + change * ease;

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }
  requestAnimationFrame(animateScroll);
}

useEffect(() => {
  setInitialLineCount((typedText + ghostText).split('\n').length);
  setScrollMode('cinematic');
}, []); // or on page reset



// Cinematic reveal effect
useEffect(() => {
  if (scrollMode !== 'cinematic') return;
  if (!scrollRef.current) return;
  scrollRef.current.scrollTop = 0;
  const timer = setTimeout(() => {
    cinematicScrollTo(scrollRef, 120, 1600); // always scroll to 120
    setTimeout(() => setScrollMode('normal'), 1600);
  }, 650);
  return () => clearTimeout(timer);
}, [scrollMode]);


  const topRow = ['Q','W','E','R','T','Y','U','I','O','P'];
  const midRow = ['A','S','D','F','G','THE XEROFAG', 'H','J','K','L'];
  const botRow = ['Z','X','C','V','B','N','M'];

  

  // -- Centralized Scroll Effect --
 useEffect(() => {
  if (scrollMode !== 'normal') return;
  if (!scrollRef.current || !lastLineRef.current) return;
  requestAnimationFrame(() => {
    const scrollArea = scrollRef.current;
    const lastLine = lastLineRef.current;
    const offset = lastLine.offsetTop - scrollArea.offsetTop;
    const lineBottom = offset + lastLine.offsetHeight;
    if (lineBottom > scrollArea.clientHeight) {
      const targetScroll = lineBottom - scrollArea.clientHeight + 16;
      scrollArea.scrollTo({ top: targetScroll, behavior: 'smooth' });
      
    } 
    if (lineBottom > scrollArea.clientHeight) {
      const targetScroll = lineBottom - scrollArea.clientHeight + 16;
      scrollArea.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  });
}, [typedText, responses, scrollMode]);

  // Only one scroll effect - remove all other scroll-to-line code!

  // -- Typewriter Ghost Commit Logic --
  const commitGhostText = () => {
    const fullGhost = responses.map(r => r.content).join('');
    const merged = typedText + fullGhost;
    if (countLines(merged) > MAX_LINES) {
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


  
  // -- Line Counting --
  const ghostText = responses.length > 0 ? responses[responses.length - 1]?.content || '' : '';
  const visibleLineCount = Math.min(countLines(typedText, ghostText), MAX_LINES);
  const neededHeight = TOP_OFFSET + visibleLineCount * LINE_HEIGHT + 4;
  const scrollAreaHeight = Math.max(FRAME_HEIGHT, neededHeight);

  // -- Handle Page End --
  useEffect(() => {
    const allLines = (typedText + ghostText).split('\n');
    if (allLines.length >= MAX_LINES && !endOfPageReached) {
      setEndOfPageReached(true);
      setTypingAllowed(false);
      playEndOfPageSound();
      setTimeout(() => {
        // Here you could trigger parent callback for next frame
        setTypedText('');
        setResponses([]);
        setEndOfPageReached(false);
        setTypingAllowed(true);
        setCinematicIntro(true); // <-- This triggers the effect on next frame
        scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });

        // Optionally: switch background image here
      }, 800);
    }
  }, [typedText, ghostText, endOfPageReached]);

  // -- Keyboard Handlers --
  const handleKeyDown = (e) => {
    if (!typingAllowed) {
      playEndOfPageSound();
      return;
    }
    if (!hasUserTyped) setHasUserTyped(true);
    const char = e.key === "Enter" ? '\n' : e.key;
    const merged = typedText + inputBuffer + ghostText + (char || '');
    const allLines = (typedText + ghostText).split('\n').slice(0, MAX_LINES);

    if (char === '\n' && allLines.length > MAX_LINES) {
      playEndOfPageSound();
      return;
    }

    setLastPressedKey(e.key.toUpperCase());

    if (e.key.length === 1 || e.key === "Enter") {
      e.preventDefault();
      if (responses.length > 0) {
        commitGhostText();
      }
      setInputBuffer(prev => prev + char);
      setLastUserInputTime(Date.now());
      setResponseQueued(false);
      if (e.key === "Enter") playEnterSound();
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      setTypedText(prev => prev.slice(0, -1));
      return;
    }

    playKeySound();
  };

  // -- Typewriter Input Buffer (typing simulation) --
  useEffect(() => {
    if (!inputBuffer.length || !typingAllowed) return;
    const char = inputBuffer[0];
    const timeout = setTimeout(() => {
      setTypedText(prev => prev + char);
      setInputBuffer(prev => prev.slice(1));

      if (char === '\n' && strikerRef.current) {
        strikerRef.current.classList.add('striker-return');
        setTimeout(() => {
          strikerRef.current.classList.remove('striker-return');
        }, 600);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [inputBuffer, typingAllowed]);


  useEffect(() => {
  // Only if in cinematic mode and content increased, switch to normal mode
  if (scrollMode === 'cinematic') {
    
    if (typedText.length > 1) {
      setScrollMode('normal');
    }
  }
}, [typedText, responses, scrollMode, initialLineCount, ghostText]);


  // -- Keyboard Focus --
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // -- Key Visual Refresh --
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

  // -- Ghost Key Typing Simulation --
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

  // -- Key Visual State --
  useEffect(() => {
    if (!lastPressedKey) return;
    const timeout = setTimeout(() => setLastPressedKey(null), 120);
    return () => clearTimeout(timeout);
  }, [lastPressedKey]);

  // -- Ghostwriter AI Trigger --
  useEffect(() => {
    if (!typingAllowed) return;
    const interval = setInterval(async () => {
      const now = Date.now();
      const pauseSeconds = (now - lastUserInputTime) / 1000;
      const fullText = typedText;
      const addition = fullText.slice(lastGeneratedLength);

      if (addition.trim().split(/\s+/).length >= 3 && !responseQueued) {
        const response = await fetch(`${SERVER}/api/shouldGenerateContinuation`, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentText: fullText,
            latestAddition: addition,
            latestPauseSeconds: pauseSeconds
          })
        });
        const { shouldGenerate } = await response.json();

        if (shouldGenerate) {
          const reply = await fetchTypewriterReply(fullText);
          setResponses(prev => [...prev, { ...reply, content: '' }]);
          setGhostKeyQueue(reply.content.split(''));
          setLastGeneratedLength(fullText.length);
          setResponseQueued(true);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [typedText, lastUserInputTime, responseQueued, typingAllowed]);

  // -- Keyboard Row Rendering --
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

  // -- Render --
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
        <div
          className="paper-scroll-area"
          ref={scrollRef}
          style={{
            height: `${scrollAreaHeight}px`,
            maxHeight: `${FRAME_HEIGHT}px`,
            overflowY: neededHeight > FRAME_HEIGHT ? 'auto' : 'hidden',
            position: 'relative',
            width: '100%',
          }}
        >
          <div
            className="film-background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${FILM_HEIGHT}px`,
              zIndex: 1,
              pointerEvents: 'none'
            }}
          />
          <div className="typewriter-text film-overlay-text" style={{ zIndex: 2, position: 'relative' }}>
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
                  <div key={idx} className="typewriter-line" ref={isLastLine ? lastLineRef : null}>
                    <span className="last-line-content">
                      {parts}
                      {isLastLine && (
                        <span
                          className="striker-cursor"
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
        </div>
      </div>
      <div className="storyteller-sigil">
        <img
          src="/textures/sigil_storytellers_society.png"
          alt="Storyteller's Society Sigil"
        />
      </div>
      <div className="keyboard-plate">
        {generateRow(topRow)}
        {generateRow(midRow)}
        {generateRow(botRow)}
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

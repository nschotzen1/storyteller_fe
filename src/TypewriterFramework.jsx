import React, { useState, useEffect, useRef } from 'react';
import './TypeWriter.css';


const FILM_HEIGHT = 1400;
const LINE_HEIGHT = 2.4 * 16; // px
const TOP_OFFSET = 100;

function lineCount(typed, ghost = '') {
  return (typed + ghost).split('\n').length;
}

const MAX_LINES = Math.floor((FILM_HEIGHT - TOP_OFFSET) / LINE_HEIGHT);

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
  const material = materialOptions[Math.floor(Math.random() * materialOptions.length)];
  const variant = Math.random() < 0.3 ? '_glow' : '';
  return `/textures/keys/${normalizedKey}_1.png`;
};

const playKeySound = () => {
  const audio = new Audio('/sounds/typewriter-clack.mp3');
  audio.volume = 0.3;
  audio.play();
};

const playXerofagHowl = () => {
  const roll = Math.floor(Math.random() * 20) + 1; // d20 roll

  let audioSrc;
  if (roll > 12) {
    const variant = Math.floor(Math.random() * 5) + 1; // 1–5
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
  const audio = new Audio('/sounds/typewriter-bell.mp3'); // You'll need to add this sound
  audio.volume = 0.4;
  audio.play();
};



const TypewriterFramework = () => {
  const [lastUserInputTime, setLastUserInputTime] = useState(Date.now());
  const [typedText, setTypedText] = useState('');
  const [inputBuffer, setInputBuffer] = useState('');
  const [typingAllowed, setTypingAllowed] = useState(true);
  const [lastPressedKey, setLastPressedKey] = useState(null);
  const [keyTextures, setKeyTextures] = useState(keys.map(getRandomTexture));
  const [responses, setResponses] = useState([]);
  const [lastSubmittedLine, setLastSubmittedLine] = useState('');
  const [responseQueued, setResponseQueued] = useState(false);
  const [lastGeneratedLength, setLastGeneratedLength] = useState(0);
  const [ghostKeyQueue, setGhostKeyQueue] = useState([]);
  const [revealAmount, setRevealAmount] = useState(0);
  const [endOfPageReached, setEndOfPageReached] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
  
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const strikerRef = useRef(null);
  const lastLineRef = useRef(null);
  const ghostTextRef = useRef(null);
  const cursorRef = useRef(null);
  
  const triggerGhostKey = (char) => {
    const upper = char.toUpperCase();
    setLastPressedKey(upper); // will trigger key press visual
    playKeySound();           // reuse your existing sound
  };
  
  const topRow = ['Q','W','E','R','T','Y','U','I','O','P'];
  const midRow = ['A','S','D','F','G','THE XEROFAG', 'H','J','K','L'];
  const botRow = ['Z','X','C','V','B','N','M'];

  // Get combined text (typed + ghost) for scroll calculations
  const getCombinedText = () => {
    const ghostText = responses.map(r => r.content).join('');
    return typedText + ghostText;
  };

  const lineCount = (typed, ghost = '') =>
  (typed + ghost).split('\n').length;

  const scrollHeight =
  TOP_OFFSET + lineCount(typedText, responses.length ? responses[responses.length - 1]?.content : '').valueOf() * LINE_HEIGHT + 40; // +40px padding at bottom


  
useEffect(() => {
  // Scroll so that the last line is at the bottom of the .paper-scroll-area
  requestAnimationFrame(() => {
    if (scrollRef.current && lastLineRef.current) {
      // If the bottom of lastLineRef is within the scroll area, scroll so it aligns to the bottom
      const scrollArea = scrollRef.current;
      const lastLine = lastLineRef.current;
      // Scroll so last line is at the bottom of the visible area
      const offset = lastLine.offsetTop - scrollArea.offsetTop;
      const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
      let targetScroll = offset - scrollArea.clientHeight + lastLine.offsetHeight + 32; // +32 for bottom padding
      if (targetScroll > maxScroll) targetScroll = maxScroll;
      if (targetScroll < 0) targetScroll = 0;
      scrollArea.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  });
}, [typedText, responses]);


  

const commitGhostText = () => {
  const fullGhost = responses.map(r => r.content).join('');
  const merged = typedText + fullGhost;
  if (countLines(merged) > MAX_LINES) {
    // Only commit up to the allowed lines
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

              // 🧠 Commit ghost if needed
              if (responses.length > 0) {
                const ghostText = responses.map(r => r.content).join('');
                setTypedText(prev => {
                  return prev + ghostText + insertText;
                });
                setResponses([]);
                setGhostKeyQueue([]);
                setLastGeneratedLength(typedText.length + ghostText.length + insertText.length);
              } else {
                // no ghost to commit, just type as normal
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

  
  // Update reveal amount based on combined text
  useEffect(() => {
    const combinedText = getCombinedText();
    const linesTyped = combinedText.split('\n').length;
    // Don't automatically set reveal based on lines, let scroll position handle it
  }, [typedText, responses]);

  

  useEffect(() => {
    if (!inputBuffer.length || !typingAllowed) return;
    const char = inputBuffer[0];
    const timeout = setTimeout(() => {
      setTypedText(prev => prev + char);
      setInputBuffer(prev => prev.slice(1));

      if (char === '\n' && strikerRef.current) {
        strikerRef.current.classList.add('striker-return');
        const timeout = setTimeout(() => {
          strikerRef.current.classList.remove('striker-return');
        }, 600);
        return () => clearTimeout(timeout);
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [inputBuffer, typingAllowed]);

  
  useEffect(() => {
    containerRef.current?.focus();
  }, []);



// Utility to count lines, including newlines in ghost text
function countLines(str) {
  return str.split('\n').length;
}


// Watch for overflow (page end)
useEffect(() => {
  const lines = countLines(typedText, responses);
  if (lines >= MAX_LINES && !endOfPageReached) {
    setEndOfPageReached(true);
    setTypingAllowed(false);

    // This is where you trigger the next frame logic, e.g.:
    setTimeout(() => {
      // Pass control to parent, change background, reset state, etc.
      // For example, if you get a prop: onPageEnd()
      // onPageEnd();

      // For now, just reset for demo:
      setTypedText('');
      setResponses([]);
      setEndOfPageReached(false);
      setTypingAllowed(true);
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      // Optionally change the film background here
    }, 800); // short pause before flip
  }
}, [typedText, responses, endOfPageReached]);


 const handleKeyDown = (e) => {
  if (!typingAllowed) {
    playEndOfPageSound();
    return;
  }
  
  const char = e.key === "Enter" ? '\n' : e.key;
  
  

  const merged = typedText + inputBuffer + ghostText + (char || '');
  if (char === '\n' && countLines(merged) > MAX_LINES) {
    playEndOfPageSound();
    return; // Block more lines!
  }

  setLastPressedKey(e.key.toUpperCase());

  if (e.key.length === 1 || e.key === "Enter") {
    e.preventDefault();
    // Commit ghost text so new input comes after it
    if (responses.length > 0) {
      commitGhostText();
    }
    setInputBuffer(prev => prev + char);
    setLastUserInputTime(Date.now());
    setResponseQueued(false);
    if (e.key === "Enter") {
      playEnterSound();
    }
  }

  if (e.key === 'Backspace') {
    e.preventDefault();
    setTypedText(prev => prev.slice(0, -1));
    return;
  }

  playKeySound();
};

 

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
  
  useEffect(() => {
    if (!ghostKeyQueue.length || !typingAllowed) return;
  
    const interval = setInterval(() => {
      const [nextChar, ...rest] = ghostKeyQueue;
      if (nextChar) {
        triggerGhostKey(nextChar);
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
  
  useEffect(() => {
    if (!lastPressedKey) return;
    const timeout = setTimeout(() => setLastPressedKey(null), 120);
    return () => clearTimeout(timeout);
  }, [lastPressedKey]);

  useEffect(() => {
    if (!typingAllowed) return; // Don't generate when typing is disabled
    
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

  const displayedContent = responses.map(r => r.content).join('');
  const ghostText = responses.length > 0 ? responses[responses.length - 1]?.content || '' : '';
  const revealedHeight = Math.min(
    FILM_HEIGHT,
    TOP_OFFSET + lineCount(typedText, ghostText) * LINE_HEIGHT + 40 // +40px pad
  );

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
  
      <div className="typewriter-paper-frame">
  <div
    className="paper-scroll-area"
    ref={scrollRef}
    style={{
      height: `${revealedHeight}px`,
      overflow: 'hidden',      // Prevent scrolling past revealed area
      position: 'relative'
    }}
    tabIndex={0}
  >
    <div className="film-background" />
    <div className="typewriter-text film-overlay-text">
      {(() => {
        const merged = typedText + ghostText;
        const mergedLines = merged.split('\n');
        return mergedLines.map((line, idx) => {
          const isLastLine = idx === mergedLines.length - 1;
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
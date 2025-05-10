import React, { useState, useEffect, useRef } from 'react';
import './TypeWriter.css';

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
  







  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const strikerRef = useRef(null);
  const lastLineRef = useRef(null);
  

  const triggerGhostKey = (char) => {
    const upper = char.toUpperCase();
    setLastPressedKey(upper); // will trigger key press visual
    playKeySound();           // reuse your existing sound
  };
  

  const topRow = ['Q','W','E','R','T','Y','U','I','O','P'];
  const midRow = ['A','S','D','F','G','THE XEROFAG', 'H','J','K','L'];
  const botRow = ['Z','X','C','V','B','N','M'];

  const scrollToCurrentLine = () => {
    if (scrollRef.current && lastLineRef.current) {
      const container = scrollRef.current;
      const line = lastLineRef.current;
  
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
  
      const lineTop = line.offsetTop;
      const lineBottom = lineTop + line.offsetHeight;
  
      const margin = 10; // small margin above/below
  
      const isAbove = lineTop < containerTop + margin;
      const isBelow = lineBottom > containerBottom - margin;
  
      if (isAbove || isBelow) {
        line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const commitGhostText = () => {
    const fullGhost = responses.map(r => r.content).join('');
    setTypedText(prev => prev + fullGhost);
    setResponses([]);
    setGhostKeyQueue([]);
    setLastGeneratedLength(typedText.length + fullGhost.length);
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
            className={`typewriter-key-wrapper ${lastPressedKey === key ? 'key-pressed' : ''}`}
            style={{ '--offset-y': `${offset}px`, '--tilt': `${tilt}deg` }}
            onClick={() => {
              const insertText = key === 'THE XEROFAG' ? 'The Xerofag ' : key;
              const isXerofag = key === 'THE XEROFAG';
              const chars = [...insertText]; // This ensures emoji/multibyte support too
              setInputBuffer(prev => prev + chars.join(''));
              setLastPressedKey(key);
              if (isXerofag) {
                playXerofagHowl();
              } else {
                playKeySound();
              }
            }}
            
          >
            {texture && (
              <img
                src={texture}
                alt={`Key ${key}`}
                className="typewriter-key-img"
              />
            )}
          </div>
        );
      })}
    </div>
  );


  useEffect(() => {
    if (!inputBuffer.length) return;
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
  }, [inputBuffer]);


  useEffect(() => {
    if (!scrollRef.current || !lastLineRef.current) return;
  
    const container = scrollRef.current;
    const line = lastLineRef.current;
  
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;
  
    const lineTop = line.offsetTop;
    const lineBottom = lineTop + line.offsetHeight;
  
    const margin = 20;
  
    const isBelow = lineBottom > containerBottom - margin;
    const isAbove = lineTop < containerTop + margin;
  
    if (isBelow || isAbove) {
      line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [typedText]);
  
  


  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (!typingAllowed) return;
    const keyChar = e.key.toUpperCase();
    setLastPressedKey(keyChar);
  
    if (e.key.length === 1 || e.key === "Enter") {
      e.preventDefault();
    
      // Commit ghost text so new input comes after it
      if (responses.length > 0) {
        commitGhostText();
      }
    
      const char = e.key === "Enter" ? '\n' : e.key;
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
    if (!ghostKeyQueue.length) return;
  
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
  }, [ghostKeyQueue]);
  

  useEffect(() => {
    if (!lastPressedKey) return;
    const timeout = setTimeout(() => setLastPressedKey(null), 120);
    return () => clearTimeout(timeout);
  }, [lastPressedKey]);


  useEffect(() => {
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
  }, [typedText, lastUserInputTime, responseQueued]);


  const displayedContent = responses.map(r => r.content).join('');

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
        <div className="side-frame side-left" />
        <div className="side-frame side-right" />
  
        <div className="typewriter-paper">
          <div className="paper-scroll-area" ref={scrollRef}>
            <div className="typewriter-text">
            {typedText.split('\n').map((line, idx, arr) => {
  const isLastLine = idx === arr.length - 1;
  const parts = line.includes("The Xerofag")
    ? line.split(/(The Xerofag)/g).map((part, i, subArr) => {
        const isLast = i === subArr.length - 1;
        const endsWithSpace = isLast && part.endsWith(' ');
        return part === "The Xerofag" ? (
          <span key={i} className="xerofag-highlight">{part}</span>
        ) : endsWithSpace ? (
          <span key={i}>
            {part}
            <span className="visible-space">&nbsp;</span>
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })
    : line.endsWith(' ') ? (
      <>
        <span>{line}</span>
        <span className="visible-space">&nbsp;</span>
      </>
    ) : (
      <span>{line}</span>
    );

  return (
    <div key={idx} className="typewriter-line">
 {isLastLine ? (
  <span>
    {parts}
    {responses.length > 0 &&
      responses[responses.length - 1]?.content !== '' && (
        <>
          {(() => {
  const ghostContent = responses[responses.length - 1].content;
  const charCount = ghostContent.length;

  // Generate & shuffle indices
  const indices = Array.from({ length: charCount }, (_, i) => i);
  const shuffled = [...indices].sort(() => Math.random() - 0.5);

  // Assign random delays
  const delayMap = {};
  shuffled.forEach((charIndex, i) => {
    delayMap[charIndex] = (i / charCount) * 1500 + Math.random() * 100;
  });

  // Render letters in order, but with random delays
  return ghostContent.split('').map((char, i) => {
    const delay = delayMap[i];
    const fuzzX = (Math.random() * 0.4 - 0.2).toFixed(2);
    const fuzzY = (Math.random() * 0.6 - 0.3).toFixed(2);

    return (
      <span
        key={`ghost-char-${i}`}
        className="emergent-letter"
        style={{
          animationDelay: `${delay}ms`,
          animationDuration: '0.9s',
          transform: `translate(${fuzzX}px, ${fuzzY}px)`,
          fontFamily: responses[0]?.font,
          fontSize: responses[0]?.font_size,
          color: responses[0]?.font_color,
        }}
      >
        {char}
      </span>
    );
  });
})()}



        </>
    )}
    <span ref={lastLineRef}></span>
    <span className="striker-cursor" ref={strikerRef} />
  </span>
) : (
  parts
)}

</div>

  );
})}

            </div>
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
            className="spacebar-wrapper"
            onClick={() => {
              setInputBuffer(prev => prev + ' ');
              setLastPressedKey(' ');
              playKeySound();
            }}
          >
            <img
              src="/textures/keys/spacebar.png"
              alt="Spacebar"
              className="spacebar-img"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default TypewriterFramework;

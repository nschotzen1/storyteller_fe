import React from 'react';

// Animation classes for ghost characters
const GHOST_ANIMATION_CLASSES = [
  'ghost-char-materialize',
  'ghost-char-shimmer',
  'ghost-char-pulse'
];

// Helper function to get a random animation class
const getRandomAnimationClass = () => {
  return GHOST_ANIMATION_CLASSES[Math.floor(Math.random() * GHOST_ANIMATION_CLASSES.length)];
};

// This component will handle the rendering of the paper, text, film background,
// and the page slide animations.

const PaperDisplay = ({
  // Text and content props
  pageText,
  ghostText,
  currentFontStyles, // New prop
  fadeState, // New prop
  pageBg,
  showCursor,

  // Refs
  scrollRef,
  lastLineRef,
  strikerRef,

  // Sliding animation state props
  isSliding,
  slideX, // Renamed from pageTransitionState.slideX for clarity in props
  slideDir, // Renamed from pageTransitionState.slideDir
  prevFilmBgUrl, // Renamed from pageTransitionState.prevFilmBgUrl
  nextFilmBgUrl, // Renamed from pageTransitionState.nextFilmBgUrl
  prevText, // Renamed from pageTransitionState.prevText
  nextText, // Renamed from pageTransitionState.nextText
  userText,

  // Constants for layout and styling
  MAX_LINES,
  TOP_OFFSET,
  BOTTOM_PADDING,
  FRAME_HEIGHT,
  // LINE_HEIGHT, // Not directly used in JSX, but in calculation of NEEDED_HEIGHT
  FILM_HEIGHT, // Used in film-background style
  
  // Calculated layout values
  scrollAreaHeight, // Renamed from SCROLL_AREA_HEIGHT for camelCase consistency
  neededHeight,     // Renamed from NEEDED_HEIGHT

  // Animation constants
  SLIDE_DURATION_MS,
  
  // Constants for text processing
  SPECIAL_KEY_TEXT, // For Xerofag highlighting, formerly XEROFAG_HIGHLIGHT_KEY

  // Constants from TypewriterFramework that were used in renderSlideWrapper and paper display
  FILM_SLIDE_WRAPPER_WIDTH,
  FILM_SLIDE_WRAPPER_Z_INDEX,
  FILM_BG_SLIDE_OPACITY,
  FILM_BG_SLIDE_BOX_SHADOW_LEFT,
  FILM_BG_SLIDE_BOX_SHADOW_RIGHT,
  FILM_BG_SLIDE_CONTRAST_OUTGOING,
  FILM_BG_SLIDE_BRIGHTNESS_OUTGOING,
  FILM_BG_SLIDE_CONTRAST_INCOMING,
  FILM_BG_SLIDE_BRIGHTNESS_INCOMING,
  FILM_FLICKER_OVERLAY_Z_INDEX,
  FILM_FLICKER_OVERLAY_TEXTURE_URL,
  FILM_FLICKER_OVERLAY_GRADIENT,
  FILM_FLICKER_OVERLAY_OPACITY,
  FILM_FLICKER_OVERLAY_BLEND_MODE,
  FILM_FLICKER_OVERLAY_ANIMATION,
  FILM_BACKGROUND_Z_INDEX,
  FILM_BACKGROUND_OPACITY,
  TYPEWRITER_TEXT_Z_INDEX,
  STRIKER_CURSOR_OFFSET_LEFT,
  SLIDE_DIRECTION_LEFT, // To compare with slideDir
}) => {
  const [outgoingGhostInfo, setOutgoingGhostInfo] = React.useState({ text: '', key: null });
  const [incomingGhostInfo, setIncomingGhostInfo] = React.useState({ text: '', key: null });

  // Apply font styles
  const textStyles = {
    zIndex: TYPEWRITER_TEXT_Z_INDEX,
    position: 'relative',
    // Default font style if nothing is provided.
    // These might be overridden by currentFontStyles
    fontFamily: "'Special Elite', cursive", // Example default
    fontSize: '1.8rem', // Example default
    color: '#3b1d15', // Example default
  };

  // Prepare ghost letters for display, whether it's an array or a string
  const ghostLetters = Array.isArray(ghostText)
  ? ghostText
  : (ghostText || '').split('').map((char, idx) => ({ char, ghost: false, key: idx }));

  
  if (currentFontStyles) {
    if (currentFontStyles.font) textStyles.fontFamily = currentFontStyles.font;
    if (currentFontStyles.font_size) textStyles.fontSize = currentFontStyles.font_size;
    if (currentFontStyles.font_color) textStyles.color = currentFontStyles.font_color;
  }

  React.useEffect(() => {
    if (fadeState.isActive) {
        const sUserText = String(userText || '');
        const currentGhostText = String(fadeState.to_text || '').startsWith(sUserText)
            ? String(fadeState.to_text || '').slice(sUserText.length)
            : String(fadeState.to_text || '');

        // When a new phase comes in from props.fadeState, the current 'incoming' becomes 'outgoing'
        setOutgoingGhostInfo(prevIncoming => {
            // Only set outgoing if the phase is actually different and incoming wasn't empty.
            // This prevents setting outgoing on the very first phase or if content was identical.
            if (prevIncoming.key !== null && prevIncoming.key !== `phase-${fadeState.phase}`) {
                return { ...prevIncoming, key: `outgoing-${prevIncoming.key}` }; // Ensure a new key for outgoing
            }
            return { text: '', key: null }; // No outgoing if it's the first meaningful phase
        });

        // Set the new 'incoming' text based on the current fadeState from props
        setIncomingGhostInfo({ text: currentGhostText, key: `phase-${fadeState.phase}` });

    } else {
        // When fading stops, clear both
        setOutgoingGhostInfo({ text: '', key: null });
        setIncomingGhostInfo({ text: '', key: null });
    }
  }, [fadeState.isActive, fadeState.to_text, fadeState.phase, userText]);

  // --- PAGE SLIDE JSX (forwards/backwards) ---
  // This function was moved from TypewriterFramework.jsx
  const getSlideX = () => slideDir === SLIDE_DIRECTION_LEFT ? slideX : -slideX;
  
  const renderSlideWrapper = () => (
    <div
      className="film-slide-wrapper animating"
      style={{
        transform: `translateX(${getSlideX()}%)`,
        transition: isSliding ? `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.5,0.15,0.35,1)` : 'none',
        width: FILM_SLIDE_WRAPPER_WIDTH,
        height: '100%',
        display: 'flex',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: FILM_SLIDE_WRAPPER_Z_INDEX,
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
          opacity: FILM_BG_SLIDE_OPACITY,
          boxShadow: FILM_BG_SLIDE_BOX_SHADOW_LEFT,
          filter: `contrast(${FILM_BG_SLIDE_CONTRAST_OUTGOING}) brightness(${FILM_BG_SLIDE_BRIGHTNESS_OUTGOING})`,
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div className="typewriter-text film-overlay-text" style={{ paddingTop: TOP_OFFSET, paddingBottom: BOTTOM_PADDING }}>
            {prevText.split('\n').slice(0, MAX_LINES).map((line, idx, arr) => {
              const isLastLine = idx === arr.length - 1;
              return (
                <div className="typewriter-line" key={idx}>
                  {line}
                  {isLastLine && showCursor && ( // Assuming showCursor is still relevant for sliding text
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
          opacity: FILM_BG_SLIDE_OPACITY,
          boxShadow: FILM_BG_SLIDE_BOX_SHADOW_RIGHT,
          filter: `contrast(${FILM_BG_SLIDE_CONTRAST_INCOMING}) brightness(${FILM_BG_SLIDE_BRIGHTNESS_INCOMING})`,
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div className="typewriter-text film-overlay-text" style={{ paddingTop: TOP_OFFSET, paddingBottom: BOTTOM_PADDING }}>
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
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: FILM_FLICKER_OVERLAY_Z_INDEX,
        background: `url('${FILM_FLICKER_OVERLAY_TEXTURE_URL}'), ${FILM_FLICKER_OVERLAY_GRADIENT}`,
        opacity: FILM_FLICKER_OVERLAY_OPACITY,
        mixBlendMode: FILM_FLICKER_OVERLAY_BLEND_MODE,
        animation: FILM_FLICKER_OVERLAY_ANIMATION,
      }} />
    </div>
  );

  return (
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
        {isSliding && renderSlideWrapper()}

        {!isSliding && (
          <>
            <div
              className="film-background"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${FILM_HEIGHT}px`,
                zIndex: FILM_BACKGROUND_Z_INDEX,
                pointerEvents: 'none',
                backgroundImage: `url('${pageBg}')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'top center',
                opacity: FILM_BACKGROUND_OPACITY,
              }}
            />
            <div
              className="typewriter-text film-overlay-text"
              style={textStyles} // Apply the combined styles here
            >
                {fadeState && fadeState.isActive ? (
                (() => {
                  // Inside the (() => { ... })() block for fadeState.isActive
                  const sUserText = String(userText || ''); // Destructured prop
                  const sToText = String(fadeState.to_text || '');

                  const ghostTextForCurrentPhase = sToText.startsWith(sUserText) ? sToText.slice(sUserText.length) : sToText;

                  console.log('[FadeRender-Simple] userText (prefix):', sUserText);
                  console.log('[FadeRender-Simple] fadeState.to_text:', fadeState.to_text);
                  console.log('[FadeRender-Simple] ghostTextForCurrentPhase:', ghostTextForCurrentPhase);
                  console.log('[FadeRender-Simple] fadeState.phase:', fadeState.phase, 'time:', Date.now());

                  // Helper to render text with <br /> tags for newlines
                  const renderTextWithLineBreaks = (text) => {
                      return text.split('\n').map((line, index, array) => (
                          <React.Fragment key={index}>
                              {line}
                              {index < array.length - 1 && <br />}
                          </React.Fragment>
                      ));
                  };

                  // Logging for the state passed from TypewriterFramework
                  console.log('[FadeRender-Crossfade] Parent fadeState:', fadeState);
                  // Logging for internal component states
                  console.log('[FadeRender-Crossfade] sUserText:', sUserText);
                  console.log('[FadeRender-Crossfade] incomingGhostInfo:', incomingGhostInfo);
                  console.log('[FadeRender-Crossfade] outgoingGhostInfo:', outgoingGhostInfo);

                  return (
      <div className="typewriter-line">
        <span style={{ display: 'inline-block', verticalAlign: 'baseline' }}>
          {sUserText && (
            <span style={{ display: 'inline' }}>
              {renderTextWithLineBreaks(sUserText)}
            </span>
          )}
          {/* Container for cross-fading ghost texts */}
          <span style={{ display: 'inline-block', position: 'relative', verticalAlign: 'baseline' }} className="cross-fade-ghost-container">
            {outgoingGhostInfo.text && outgoingGhostInfo.key && (
              <span
                key={outgoingGhostInfo.key}
                className="ghost-text-block cross-fade-outgoing"
                style={{ display: 'inline-block', position: 'absolute', top: 0, left: 0 }}
              >
                {/* --- ENHANCED: Fade out each char as smudge/afterimage --- */}
                {outgoingGhostInfo.text.split('').map((char, i) => (
                  <span
                    key={i}
                    style={{ position: 'relative', display: 'inline-block', minWidth: '0.7ch' }}
                  >
                    <span
                      className="smudge-fade-out"
                      style={{ animationDelay: `${i * 0.042}s` }}
                    >
                      {char === '\n' ? <br /> : char}
                    </span>
                    <span
                      className="afterimage-fade"
                      style={{ animationDelay: `${i * 0.042 + 0.13}s` }}
                    >
                      {char === '\n' ? <br /> : char}
                    </span>
                  </span>
                ))}
              </span>
            )}
            {incomingGhostInfo.text && incomingGhostInfo.key && (
              <span
                key={incomingGhostInfo.key}
                className="ghost-text-block cross-fade-incoming"
                style={{ display: 'inline-block' }}
              >
                {/* Appear instantly, or add a subtle fade-in if you want */}
                {incomingGhostInfo.text.split('').map((char, i) => (
                  <span key={i}>{char === '\n' ? <br /> : char}</span>
                ))}
              </span>
            )}
          </span>
        </span>
      </div>
    );
  })()
)  : (
                (() => {
                  const pageTextLength = pageText.length;
                  const ghostTextString = Array.isArray(ghostText)
                      ? ghostText.map(g => g.char).join('')
                      : (ghostText || '');
                    const fullCombinedText = pageText + ghostTextString;
                  const originalLines = fullCombinedText.split('\n');

                  const allLinesToRender = originalLines.slice(0, MAX_LINES);
                  
                  return allLinesToRender.map((line, lineIdx) => {
                    const isLastLineOfRenderedSet = lineIdx === allLinesToRender.length - 1;
                    
                    let currentLineGlobalStartOffset = 0;
                    for(let i=0; i < lineIdx; i++) {
                      currentLineGlobalStartOffset += originalLines[i].length + 1; 
                    }

                    let currentOffsetWithinLine = 0; 
                    
                    const segments = line.includes(SPECIAL_KEY_TEXT)
                      ? line.split(new RegExp(`(${SPECIAL_KEY_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'))
                      : [line]; 

                    const processedSegments = segments.map((segment, segmentIdx) => {
                      if (segment === SPECIAL_KEY_TEXT) {
                        const segmentKey = `seg-${lineIdx}-${segmentIdx}-xerofag`;
                        currentOffsetWithinLine += segment.length;
                        return <span key={segmentKey} className="xerofag-highlight">{segment}</span>;
                      } else {
                        const segmentChars = segment.split('').map((char, charIdxInSegment) => {
                          const charGlobalIndex = currentLineGlobalStartOffset + currentOffsetWithinLine + charIdxInSegment;
                          const charKey = `char-${lineIdx}-${segmentIdx}-${charIdxInSegment}-${charGlobalIndex}`;
                          
                          if (charGlobalIndex >= pageTextLength && ghostText.length > 0) {
                            // Only animate the most recently added ghost letter
                            const ghostIdx = charGlobalIndex - pageTextLength;
                            const isLastGhost = ghostIdx === ghostText.length - 1;
                            const g = ghostText[ghostIdx];
                            return (
                              <span
                                key={charKey}
                                className={
                                  "ghost-char" + (g.justAppeared ? " ghost-char-materialize" : "")
                                }
                                style={{ display: 'inline-block' }}
                              >
                                {g.char}
                              </span>

                            );
                          } else {
                            return char;
                          }

                        });
                        currentOffsetWithinLine += segment.length;
                        return <React.Fragment key={`seg-${lineIdx}-${segmentIdx}-normal`}>{segmentChars}</React.Fragment>;
                      }
                    });

                    return (
                      <div
                        key={lineIdx}
                        className="typewriter-line"
                        ref={isLastLineOfRenderedSet ? lastLineRef : null}
                      >
                        <span className="last-line-content">
                          {processedSegments}

                            
                              {isLastLineOfRenderedSet && showCursor && (
                                <span
                                  className={"striker-cursor"}
                                  ref={strikerRef}
                                  style={{ display: 'inline-block', position: 'relative', left: STRIKER_CURSOR_OFFSET_LEFT }}
                                />
                              )}

                        </span>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaperDisplay;

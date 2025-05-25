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

const PaperDisplay = ({
  // Text and content props
  pageText,
  ghostText, // Receives ghostTextForDisplay from TypewriterFramework (can be plain or HTML)
  isGhostTextStable, // Indicates if ghostText contains pre-formatted HTML
  pageBg,
  showCursor,

  // Refs
  scrollRef,
  lastLineRef,
  strikerRef,

  // Sliding animation state props
  isSliding,
  slideX, 
  slideDir, 
  prevFilmBgUrl, 
  nextFilmBgUrl, 
  prevText, 
  nextText, 

  // Constants for layout and styling
  MAX_LINES,
  TOP_OFFSET,
  BOTTOM_PADDING,
  FRAME_HEIGHT,
  FILM_HEIGHT, 
  
  scrollAreaHeight, 
  neededHeight,     

  SLIDE_DURATION_MS,
  SPECIAL_KEY_TEXT, 

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
  SLIDE_DIRECTION_LEFT, 
}) => {

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
          width: '50%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat', opacity: FILM_BG_SLIDE_OPACITY, boxShadow: FILM_BG_SLIDE_BOX_SHADOW_LEFT,
          filter: `contrast(${FILM_BG_SLIDE_CONTRAST_OUTGOING}) brightness(${FILM_BG_SLIDE_BRIGHTNESS_OUTGOING})`,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none'}}>
          <div className="typewriter-text film-overlay-text" style={{ paddingTop: TOP_OFFSET, paddingBottom: BOTTOM_PADDING }}>
            {prevText.split('\n').slice(0, MAX_LINES).map((line, idx, arr) => (
              <div className="typewriter-line" key={`prev-${idx}`}>
                {line}
                {idx === arr.length - 1 && showCursor && (<span className="striker-cursor" />)}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Incoming film/paper */}
      <div
        className="film-bg-slide"
        style={{
          backgroundImage: `url('${nextFilmBgUrl}')`,
          width: '50%', height: '100%', backgroundSize: 'cover', backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat', opacity: FILM_BG_SLIDE_OPACITY, boxShadow: FILM_BG_SLIDE_BOX_SHADOW_RIGHT,
          filter: `contrast(${FILM_BG_SLIDE_CONTRAST_INCOMING}) brightness(${FILM_BG_SLIDE_BRIGHTNESS_INCOMING})`,
          position: 'relative',
        }}
      >
        <div style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', pointerEvents: 'none'}}>
          <div className="typewriter-text film-overlay-text" style={{ paddingTop: TOP_OFFSET, paddingBottom: BOTTOM_PADDING }}>
            {nextText.split('\n').slice(0, MAX_LINES).map((line, idx, arr) => (
              <div className="typewriter-line" key={`next-${idx}`}>
                {line}
                {idx === arr.length - 1 && showCursor && (<span className="striker-cursor" />)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="film-flicker-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: FILM_FLICKER_OVERLAY_Z_INDEX, background: `url('${FILM_FLICKER_OVERLAY_TEXTURE_URL}'), ${FILM_FLICKER_OVERLAY_GRADIENT}`, opacity: FILM_FLICKER_OVERLAY_OPACITY, mixBlendMode: FILM_FLICKER_OVERLAY_BLEND_MODE, animation: FILM_FLICKER_OVERLAY_ANIMATION }} />
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
                position: 'absolute', top: 0, left: 0, width: '100%', height: `${FILM_HEIGHT}px`,
                zIndex: FILM_BACKGROUND_Z_INDEX, pointerEvents: 'none', backgroundImage: `url('${pageBg}')`,
                backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'top center',
                opacity: FILM_BACKGROUND_OPACITY,
              }}
            />
            <div
              className="typewriter-text film-overlay-text"
              style={{ zIndex: TYPEWRITER_TEXT_Z_INDEX, position: 'relative' }}
            >
              {(() => {
                const pageTextLength = pageText.length;
                // ghostText here is ghostTextForDisplay from the framework
                // If isGhostTextStable, ghostText is already formatted HTML string.
                // Otherwise, it's plain text for character-by-character animation.
                const fullCombinedText = pageText + ghostText;
                const originalLines = fullCombinedText.split('\n'); 
                const allLinesToRender = originalLines.slice(0, MAX_LINES);
                
                let charGlobalOffset = 0; // Tracks character position across all original lines

                return allLinesToRender.map((line, lineIdx) => {
                  const isLastLineOfRenderedSet = lineIdx === allLinesToRender.length - 1;
                  let lineContentOutput = [];
                  let currentSegmentStartGlobalOffset = charGlobalOffset;

                  const segments = line.includes(SPECIAL_KEY_TEXT)
                    ? line.split(new RegExp(`(${SPECIAL_KEY_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'))
                    : [line];

                  segments.forEach((segment, segmentIdx) => {
                    const segmentKeyBase = `line-${lineIdx}-seg-${segmentIdx}`;

                    if (segment === SPECIAL_KEY_TEXT) {
                      lineContentOutput.push(<span key={`${segmentKeyBase}-xerofag`} className="xerofag-highlight">{segment}</span>);
                    } else if (segment.length > 0) {
                      // Determine if this segment falls into pageText or ghostText
                      if (currentSegmentStartGlobalOffset + segment.length <= pageTextLength) { // Entirely pageText
                        lineContentOutput.push(<React.Fragment key={`${segmentKeyBase}-page`}>{segment}</React.Fragment>);
                      } else if (currentSegmentStartGlobalOffset >= pageTextLength) { // Entirely ghostText
                        if (isGhostTextStable) {
                          lineContentOutput.push(<span key={`${segmentKeyBase}-ghost-stable`} dangerouslySetInnerHTML={{ __html: segment }} />);
                        } else {
                          lineContentOutput.push(
                            segment.split('').map((char, charIdx) => (
                              <span key={`${segmentKeyBase}-ghost-char-${charIdx}`} className={`ghost-char ${getRandomAnimationClass()}`}>{char}</span>
                            ))
                          );
                        }
                      } else { // Segment spans across pageText and ghostText
                        const pageTextPart = segment.substring(0, pageTextLength - currentSegmentStartGlobalOffset);
                        const ghostTextPart = segment.substring(pageTextLength - currentSegmentStartGlobalOffset);
                        
                        lineContentOutput.push(<React.Fragment key={`${segmentKeyBase}-page-part`}>{pageTextPart}</React.Fragment>);

                        if (ghostTextPart.length > 0) {
                          if (isGhostTextStable) {
                            lineContentOutput.push(<span key={`${segmentKeyBase}-ghost-stable-part`} dangerouslySetInnerHTML={{ __html: ghostTextPart }} />);
                          } else {
                            lineContentOutput.push(
                              ghostTextPart.split('').map((char, charIdx) => (
                                <span key={`${segmentKeyBase}-ghost-char-part-${charIdx}`} className={`ghost-char ${getRandomAnimationClass()}`}>{char}</span>
                              ))
                            );
                          }
                        }
                      }
                    }
                    currentSegmentStartGlobalOffset += segment.length;
                  });
                  
                  // Add 1 for the newline character that was removed by split('\n')
                  charGlobalOffset += line.length + 1; 

                  return (
                    <div
                      key={`line-${lineIdx}`}
                      className="typewriter-line"
                      ref={isLastLineOfRenderedSet ? lastLineRef : null}
                    >
                      <span className="last-line-content">
                        {lineContentOutput}
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
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaperDisplay;

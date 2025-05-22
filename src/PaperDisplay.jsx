import React from 'react';

// This component will handle the rendering of the paper, text, film background,
// and the page slide animations.

const PaperDisplay = ({
  // Text and content props
  pageText,
  ghostText,
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
              style={{ zIndex: TYPEWRITER_TEXT_Z_INDEX, position: 'relative' }}
            >
              {(() => {
                const allLines = (pageText + ghostText).split('\n').slice(0, MAX_LINES);
                return allLines.map((line, idx) => {
                  const isLastLine = idx === allLines.length - 1;
                  const parts = line.includes(SPECIAL_KEY_TEXT) // Use SPECIAL_KEY_TEXT prop
                    ? line.split(new RegExp(`(${SPECIAL_KEY_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g')).map((part, i) => ( // Escape regex special chars
                        part === SPECIAL_KEY_TEXT ? (
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

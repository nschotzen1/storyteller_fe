import React from 'react';

const GHOST_ANIMATION_CLASSES = ['ghost-char-materialize', 'ghost-char-shimmer', 'ghost-char-pulse'];
const getRandomAnimationClass = () => GHOST_ANIMATION_CLASSES[Math.floor(Math.random() * GHOST_ANIMATION_CLASSES.length)];

const useGhostTextRenderer = (ghostText, MAX_LINES, pageTextLength, SPECIAL_KEY_TEXT, aiFontColor) => {
  if (!ghostText) {
    return [];
  }

  const lines = ghostText.split('\n');
  let charCount = pageTextLength; // Start counting from the end of pageText

  return lines.flatMap((line, lineIndex) => {
    if (charCount / (MAX_LINES * 80) > MAX_LINES) { // Heuristic to limit excessive rendering
        return [];
    }
    const elements = [];
    let currentSegment = '';
    let remainingLine = line;

    const charStyle = aiFontColor ? { color: aiFontColor } : {};

    while (remainingLine.length > 0) {
      const specialKeyIndex = remainingLine.indexOf(SPECIAL_KEY_TEXT);

      if (specialKeyIndex === -1) {
        // No more special key text in this line
        currentSegment += remainingLine;
        remainingLine = '';
      } else {
        // Special key text found
        currentSegment += remainingLine.substring(0, specialKeyIndex);
        elements.push(
          ...currentSegment.split('').map((char, charIndex) => {
            charCount++;
            return (
              <span
                key={`ghost-${lineIndex}-${charCount}-${charIndex}`}
                className={`ghost-char ${getRandomAnimationClass()}`}
                style={charStyle}
              >
                {char}
              </span>
            );
          })
        );
        currentSegment = ''; // Reset segment

        // Add highlighted special key text
        // AI color should take precedence for ghost text, even for special highlights
        elements.push(
          <span
            key={`ghost-special-${lineIndex}-${charCount}`}
            className="text-highlight" // This class might have its own color, but inline style will override
            style={charStyle}
          >
            {SPECIAL_KEY_TEXT}
          </span>
        );
        charCount += SPECIAL_KEY_TEXT.length;
        remainingLine = remainingLine.substring(specialKeyIndex + SPECIAL_KEY_TEXT.length);
      }
    }

    // Add any remaining part of the line
    if (currentSegment.length > 0) {
      elements.push(
        ...currentSegment.split('').map((char, charIndex) => {
          charCount++;
          return (
            <span
              key={`ghost-${lineIndex}-${charCount}-${charIndex}-rem`}
              className={`ghost-char ${getRandomAnimationClass()}`}
              style={charStyle}
            >
              {char}
            </span>
          );
        })
      );
    }

    // Add line break if it's not the last line (ghostText might not end with \n)
    if (lineIndex < lines.length - 1) {
      elements.push(<br key={`ghost-br-${lineIndex}-${charCount}`} />);
    }
    return elements;
  });
};

export default useGhostTextRenderer;

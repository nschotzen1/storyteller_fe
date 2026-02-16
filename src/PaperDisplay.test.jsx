import React from 'react';
import { render, screen, within } from '@testing-library/react';
import PaperDisplay from './components/typewriter/PaperDisplay';
import '@testing-library/jest-dom';

// Define or import necessary constants from TypewriterFramework.jsx
const MAX_LINES = 20; // Example, should match the one used in TypewriterFramework
const TOP_OFFSET = 180;
const BOTTOM_PADDING = 220;
const FRAME_HEIGHT = 520;
const FILM_HEIGHT = 1400;
const SLIDE_DURATION_MS = 1200;
const SPECIAL_KEY_TEXT = 'The Xerofag'; // Should match exactly
const SLIDE_DIRECTION_LEFT = 'left';
const SLIDE_DIRECTION_RIGHT = 'right';

// Styling constants passed as props (matching those in TypewriterFramework)
const STYLING_PROPS = {
  FILM_SLIDE_WRAPPER_WIDTH: '200%',
  FILM_SLIDE_WRAPPER_Z_INDEX: 10,
  FILM_BG_SLIDE_OPACITY: 0.96,
  FILM_BG_SLIDE_BOX_SHADOW_LEFT: 'inset -12px 0 24px #120b05b0',
  FILM_BG_SLIDE_BOX_SHADOW_RIGHT: 'inset 12px 0 24px #120b05b0',
  FILM_BG_SLIDE_CONTRAST_OUTGOING: 1.06,
  FILM_BG_SLIDE_BRIGHTNESS_OUTGOING: 1.04,
  FILM_BG_SLIDE_CONTRAST_INCOMING: 1.04,
  FILM_BG_SLIDE_BRIGHTNESS_INCOMING: 1.02,
  FILM_FLICKER_OVERLAY_Z_INDEX: 11,
  FILM_FLICKER_OVERLAY_TEXTURE_URL: '/textures/grainy.png',
  FILM_FLICKER_OVERLAY_GRADIENT: 'linear-gradient(90deg,rgba(0,0,0,0.09),rgba(0,0,0,0.16))',
  FILM_FLICKER_OVERLAY_OPACITY: 0.15,
  FILM_FLICKER_OVERLAY_BLEND_MODE: 'multiply',
  FILM_FLICKER_OVERLAY_ANIMATION: 'filmFlicker 1.1s infinite linear alternate',
  FILM_BACKGROUND_Z_INDEX: 1,
  FILM_BACKGROUND_OPACITY: 0.92,
  TYPEWRITER_TEXT_Z_INDEX: 2,
  STRIKER_CURSOR_OFFSET_LEFT: '-40px',
  // SLIDE_DIRECTION_LEFT is a logical constant, already defined above.
};

describe('PaperDisplay Component', () => {
  // Mock refs: createRef is suitable for testing ref assignment
  const mockScrollRef = React.createRef();
  const mockLastLineRef = React.createRef();
  const mockStrikerRef = React.createRef();

  // Default props for tests
  const defaultProps = {
    pageText: 'Hello world',
    ghostText: ' from beyond',
    pageBg: '/path/to/default_bg.png',
    scrollRef: mockScrollRef,
    lastLineRef: mockLastLineRef,
    strikerRef: mockStrikerRef,
    showCursor: true,
    isSliding: false,
    slideX: 0,
    slideDir: SLIDE_DIRECTION_LEFT,
    prevFilmBgUrl: '/path/to/prev_bg.png', // Provide defaults even if not sliding initially
    nextFilmBgUrl: '/path/to/next_bg.png',
    prevText: 'Previous page text',
    nextText: 'Next page text',
    MAX_LINES,
    TOP_OFFSET,
    BOTTOM_PADDING,
    FRAME_HEIGHT,
    FILM_HEIGHT,
    scrollAreaHeight: FRAME_HEIGHT, // Example, actual calculation in TypewriterFramework
    neededHeight: TOP_OFFSET + 2 * 24 + 4, // Example for a couple of lines
    SLIDE_DURATION_MS,
    SPECIAL_KEY_TEXT,
    SLIDE_DIRECTION_LEFT, // Pass this constant
    ...STYLING_PROPS,
  };
  
  beforeEach(() => {
    // Reset refs if they were simple mock objects. React.createRef() handles this.
    // If refs were simple objects like { current: null }, you'd reset them here.
    // e.g., mockLastLineRef.current = null;
  });

  describe('Basic Rendering (Not Sliding)', () => {
    test('renders pageText and ghostText combined', () => {
      render(<PaperDisplay {...defaultProps} />);
      // The text is split into lines; check for the combined content within the text container.
      // Assuming the combined text "Hello world from beyond" will be present.
      // Individual lines might be separate elements.
      // A more robust way is to query for the container of lines.
      const textContainer = screen.getByTestId('paper-frame'); // Assuming paper-frame contains the text
      expect(within(textContainer).getByText(/Hello world from beyond/)).toBeInTheDocument();
    });

    test('applies the film background image when not sliding', () => {
      render(<PaperDisplay {...defaultProps} pageBg="/specific/bg.png" />);
      const filmBgDiv = screen.getByTestId('film-background-div');
      expect(filmBgDiv).toHaveStyle('background-image: url(/specific/bg.png)');
    });

    test('shows striker cursor on the last line when showCursor is true', () => {
      // Render with text that ensures the last line is distinct
      render(<PaperDisplay {...defaultProps} pageText="Line1\nLast Line" ghostText="" showCursor={true} />);
      // Check if the striker cursor element is rendered
      expect(screen.getByTestId('striker-cursor-element')).toBeInTheDocument();
      // And ensure the strikerRef is attached (which implies it's on the last line by component logic)
      expect(mockStrikerRef.current).not.toBeNull();
    });

    test('does not show striker cursor when showCursor is false', () => {
      render(<PaperDisplay {...defaultProps} pageText="Line1\nLast Line" ghostText="" showCursor={false} />);
      expect(screen.queryByTestId('striker-cursor-element')).not.toBeInTheDocument();
    });
    
    test('does not show striker cursor if text is empty, even if showCursor is true', () => {
        render(<PaperDisplay {...defaultProps} pageText="" ghostText="" showCursor={true} />);
        expect(screen.queryByTestId('striker-cursor-element')).not.toBeInTheDocument();
    });

    test('highlights SPECIAL_KEY_TEXT (The Xerofag)', () => {
      render(<PaperDisplay {...defaultProps} pageText={`This is ${SPECIAL_KEY_TEXT} indeed.`} ghostText="" />);
      const highlightedText = screen.getByText(SPECIAL_KEY_TEXT);
      expect(highlightedText).toBeInTheDocument();
      expect(highlightedText).toHaveClass('xerofag-highlight');
    });

    test('assigns lastLineRef to the last rendered line element', () => {
      render(<PaperDisplay {...defaultProps} pageText="First Line\nSecond Line Is Last" ghostText="" />);
      expect(mockLastLineRef.current).not.toBeNull();
      expect(mockLastLineRef.current.textContent).toContain('Second Line Is Last');
    });
  });

  describe('Sliding Animation (isSliding is true)', () => {
    const slidingProps = {
      ...defaultProps,
      isSliding: true,
      slideX: -50, // Example: sliding left
      slideDir: SLIDE_DIRECTION_LEFT,
    };

    test('renders the slide wrapper and not the normal display', () => {
      render(<PaperDisplay {...slidingProps} />);
      expect(screen.getByTestId('film-slide-wrapper-div')).toBeInTheDocument();
      expect(screen.queryByTestId('film-background-div')).not.toBeInTheDocument(); // Normal background should be hidden
    });

    test('applies correct transform style for left slide', () => {
      render(<PaperDisplay {...slidingProps} slideX={-50} slideDir={SLIDE_DIRECTION_LEFT} />);
      const slideWrapper = screen.getByTestId('film-slide-wrapper-div');
      expect(slideWrapper).toHaveStyle('transform: translateX(-50%)');
    });
    
    test('applies correct transform style for right slide (slideX positive, slideDir right)', () => {
      render(<PaperDisplay {...slidingProps} slideX={50} slideDir={SLIDE_DIRECTION_RIGHT} />);
      const slideWrapper = screen.getByTestId('film-slide-wrapper-div');
      // slideDir=right means getSlideX() will return -slideX
      expect(slideWrapper).toHaveStyle('transform: translateX(-50%)'); 
    });

    test('renders previous and next film backgrounds and text content', () => {
      render(
        <PaperDisplay
          {...slidingProps}
          prevFilmBgUrl="/prev_bg_test.png"
          nextFilmBgUrl="/next_bg_test.png"
          prevText="Previous Content"
          nextText="Next Content"
        />
      );
      const prevBgDiv = screen.getByTestId('prev-bg-slide');
      const nextBgDiv = screen.getByTestId('next-bg-slide');

      expect(prevBgDiv).toHaveStyle('background-image: url(/prev_bg_test.png)');
      expect(nextBgDiv).toHaveStyle('background-image: url(/next_bg_test.png)');
      
      expect(within(prevBgDiv).getByText('Previous Content')).toBeInTheDocument();
      expect(within(nextBgDiv).getByText('Next Content')).toBeInTheDocument();
    });
  });

  describe('MAX_LINES Handling', () => {
    test('renders only up to MAX_LINES lines of combined text', () => {
      const textWithMoreThanMaxLines = Array.from({ length: MAX_LINES + 5 }, (_, i) => `Line ${i + 1}`).join('\n');
      render(<PaperDisplay {...defaultProps} pageText={textWithMoreThanMaxLines} ghostText="" />);
      
      // Query for elements that represent lines. Assuming each .typewriter-line contains one line.
      // This requires .typewriter-line to be on the elements produced by the map.
      const paperFrame = screen.getByTestId('paper-frame');
      const linesRendered = within(paperFrame).getAllByText(/Line \d+/);
      expect(linesRendered.length).toBe(MAX_LINES);
      expect(linesRendered[MAX_LINES - 1].textContent).toBe(`Line ${MAX_LINES}`);
    });

    test('renders all lines if total lines are less than MAX_LINES', () => {
      const textWithLessThanMaxLines = Array.from({ length: MAX_LINES - 5 }, (_, i) => `Line ${i + 1}`).join('\n');
      render(<PaperDisplay {...defaultProps} pageText={textWithLessThanMaxLines} ghostText="" />);
      const paperFrame = screen.getByTestId('paper-frame');
      const linesRendered = within(paperFrame).getAllByText(/Line \d+/);
      expect(linesRendered.length).toBe(MAX_LINES - 5);
    });
    
    test('renders all lines if total lines are equal to MAX_LINES', () => {
      const textWithMaxLines = Array.from({ length: MAX_LINES }, (_, i) => `Line ${i + 1}`).join('\n');
      render(<PaperDisplay {...defaultProps} pageText={textWithMaxLines} ghostText="" />);
      const paperFrame = screen.getByTestId('paper-frame');
      const linesRendered = within(paperFrame).getAllByText(/Line \d+/);
      expect(linesRendered.length).toBe(MAX_LINES);
    });
  });
});

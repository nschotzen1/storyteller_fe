// src/TypewriterFramework.integration.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TypewriterFramework from './TypewriterFramework';
import '@testing-library/jest-dom';
import { MAX_LINES as ACTUAL_MAX_LINES, DEFAULT_FILM_BG_URL } from './TypewriterFramework'; // Import constants

import { vi } from 'vitest';

// Mock API services
vi.mock('./apiService', () => ({
  fetchNextFilmImage: vi.fn(), // Default mock setup in beforeEach
  fetchTypewriterReply: vi.fn().mockResolvedValue({ data: { content: 'mock AI reply' }, error: null }),
  fetchShouldGenerateContinuation: vi.fn().mockResolvedValue({ data: { shouldGenerate: false }, error: null }),
}));

// Mock utility functions (sound)
vi.mock('./utils', () => {
  const originalUtils = jest.requireActual('./utils');
  return {
    ...originalUtils,
    playKeySound: jest.fn(),
    playEnterSound: jest.fn(),
    playXerofagHowl: jest.fn(),
    playEndOfPageSound: jest.fn(),
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn(key => delete store[key]),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Import the mocked instances to allow per-test configuration
import { fetchNextFilmImage, fetchTypewriterReply, fetchShouldGenerateContinuation } from './apiService';
import { playKeySound, playEnterSound, playEndOfPageSound } from './utils';


describe('TypewriterFramework Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.setItem('sessionId', 'test-session-id-123');

    // Default mock for fetchNextFilmImage for most tests
    fetchNextFilmImage.mockResolvedValue({ data: { image_url: 'default_mock_image.png' }, error: null });
    fetchTypewriterReply.mockResolvedValue({ data: { content: 'mock AI reply from test' }, error: null });
    fetchShouldGenerateContinuation.mockResolvedValue({ data: { shouldGenerate: false }, error: null });


    vi.useFakeTimers();
  });

  afterEach(() => {
    // vi.runAllTimers(); // Ensure all timers are run before moving to next test
    vi.useRealTimers();
  });

  const typeCharacter = (charKey) => {
    const keyElement = screen.getByAltText(`Key ${charKey.toUpperCase()}`).closest('.typewriter-key-wrapper');
    if (!keyElement) throw new Error(`Key element for "${charKey}" not found.`);
    fireEvent.click(keyElement);
  };
  
  const pressEnter = (container) => {
     // Simulate 'Enter' key press on the main container that has the onKeyDown handler
    fireEvent.keyDown(container, { key: 'Enter', code: 'Enter', charCode: 13 });
  };


  test('user can type text and it appears on the paper, and Enter creates a newline', async () => {
    const { container } = render(<TypewriterFramework />);
    
    typeCharacter('H');
    typeCharacter('I');
    
    act(() => { vi.advanceTimersByTime(250); }); // Advance for 2 * TYPING_ANIMATION_INTERVAL + buffer

    await waitFor(() => {
      // PaperDisplay renders lines. We expect one line element containing "HI"
      // The text is rendered inside spans within .typewriter-line
      const lineElements = container.querySelectorAll('.typewriter-line .last-line-content');
      expect(lineElements.length).toBeGreaterThan(0);
      expect(lineElements[0].textContent).toContain('HI');
    });

    pressEnter(container.firstChild); // container.firstChild is the .typewriter-container div
    act(() => { vi.advanceTimersByTime(150); }); // TYPING_ANIMATION_INTERVAL for the newline

    typeCharacter('T');
    act(() => { vi.advanceTimersByTime(150); });
    typeCharacter('O');
    act(() => { vi.advanceTimersByTime(150); });
    
    await waitFor(() => {
      const lineElements = container.querySelectorAll('.typewriter-line .last-line-content');
      expect(lineElements.length).toBe(2); // Should be two lines now
      expect(lineElements[0].textContent).toContain('HI');
      expect(lineElements[1].textContent).toContain('TO');
    });
  });


  test('triggers page turn when MAX_LINES is exceeded', async () => {
    const NEW_PAGE_IMAGE = 'new_page_specific.png';
    fetchNextFilmImage.mockResolvedValue({ data: { image_url: NEW_PAGE_IMAGE }, error: null });

    const { container } = render(<TypewriterFramework />);
    const typewriterContainerDiv = container.firstChild;

    // Type MAX_LINES lines
    for (let i = 0; i < ACTUAL_MAX_LINES; i++) {
      typeCharacter('A'); // Type a character
      act(() => { vi.advanceTimersByTime(150); }); // Allow character to process
      if (i < ACTUAL_MAX_LINES -1) { // Press Enter for all but the last line to make them distinct lines
          pressEnter(typewriterContainerDiv);
          act(() => { vi.advanceTimersByTime(150); }); // Allow newline to process
      }
    }
    
    // At this point, the (ACTUAL_MAX_LINES)-th character of the last line is typed.
    // The next key press (Enter or character) should trigger the page turn.
    // Let's press Enter to trigger it.
    pressEnter(typewriterContainerDiv);
    act(() => { vi.advanceTimersByTime(150); }); // For the Enter key to be processed by input buffer

    // Page turn logic involves:
    // 1. playEndOfPageSound
    // 2. Scroll animation (900ms)
    // 3. fetchNextFilmImage
    // 4. Slide animation (SLIDE_DURATION_MS = 1200ms)
    
    expect(playEndOfPageSound).toHaveBeenCalled();
    
    act(() => { vi.advanceTimersByTime(900 + 10); }); // Scroll up animation + buffer

    await waitFor(() => {
      expect(fetchNextFilmImage).toHaveBeenCalled();
    });

    act(() => { vi.advanceTimersByTime(1200 + 10); }); // Slide animation + buffer
    
    // Verify new page content
    await waitFor(() => {
      // Check if the new background image is applied (via PaperDisplay's film-background)
      const paperDisplay = screen.getByTestId('paper-frame');
      const filmBackground = within(paperDisplay).getByTestId('film-background-div');
      expect(filmBackground).toHaveStyle(`background-image: url(${NEW_PAGE_IMAGE})`);
      
      // Text area should be cleared (or have default intro cinematic scroll content if any)
      // For simplicity, check that the previously typed 'AAA...' content isn't there.
      const lineElements = typewriterContainerDiv.querySelectorAll('.typewriter-line .last-line-content');
      // This check depends on how quickly the text is cleared and if cinematic scroll adds initial text.
      // If cinematic scroll adds text, this check needs adjustment.
      // Assuming text is cleared to empty initially on new page before cinematic scroll might add something.
      if (lineElements.length > 0) {
          expect(lineElements[0].textContent).not.toContain('AAA'); // Assuming 'A' was typed
      } else {
          expect(lineElements.length).toBe(0); // Or no lines at all
      }
    });
  });

  test('can navigate between pages using Prev/Next buttons', async () => {
    const PAGE1_TEXT = "Page one content.";
    const PAGE2_TEXT = "Page two stuff.";
    const PAGE1_IMG = 'page1_img.png';
    const PAGE2_IMG = 'page2_img.png';
    const PAGE3_IMG = 'page3_img.png'; // For the third page after second MAX_LINES

    fetchNextFilmImage
      .mockResolvedValueOnce({ data: { image_url: PAGE2_IMG }, error: null }) // For first page turn
      .mockResolvedValueOnce({ data: { image_url: PAGE3_IMG }, error: null }); // For second page turn (if any)

    const { container } = render(<TypewriterFramework />);
    const typewriterContainerDiv = container.firstChild;

    // --- Create Page 1 ---
    PAGE1_TEXT.split('').forEach(char => {
      typeCharacter(char === '.' ? 'M' : char); // Use 'M' for '.' as '.' is not on keyboard
      act(() => vi.advanceTimersByTime(150));
    });
    await waitFor(() => expect(screen.getByText(PAGE1_TEXT.replace('.','M'))).toBeInTheDocument());


    // --- Trigger Page Turn to Page 2 ---
    for (let i = 0; i < ACTUAL_MAX_LINES -1; i++) { // -1 because PAGE1_TEXT is already one line
      pressEnter(typewriterContainerDiv);
      act(() => vi.advanceTimersByTime(150));
      typeCharacter('X'); // Fill lines
      act(() => vi.advanceTimersByTime(150));
    }
    pressEnter(typewriterContainerDiv); // This should trigger the page turn
    act(() => vi.advanceTimersByTime(150 + 900 + 1200 + 100)); // Input processing + scroll + fetch + slide + buffer
    
    await waitFor(() => {
      const filmBackground = screen.getByTestId('film-background-div');
      expect(filmBackground).toHaveStyle(`background-image: url(${PAGE2_IMG})`);
      expect(screen.getByText('Page 2 / 2')).toBeInTheDocument();
    });

    // --- Create Page 2 ---
    PAGE2_TEXT.split('').forEach(char => {
      typeCharacter(char === '.' ? 'M' : char);
      act(() => vi.advanceTimersByTime(150));
    });
    await waitFor(() => expect(screen.getByText(PAGE2_TEXT.replace('.','M'))).toBeInTheDocument());

    // --- Click Prev Button ---
    const prevButton = screen.getByText('← Prev');
    fireEvent.click(prevButton);
    act(() => vi.advanceTimersByTime(1200 + 100)); // Slide duration + buffer

    await waitFor(() => {
      // Should show Page 1 content and background (which was default at start)
      const filmBackground = screen.getByTestId('film-background-div');
      // The initial pageBg is DEFAULT_FILM_BG_URL if not overridden by a fetch for the first page
      expect(filmBackground).toHaveStyle(`background-image: url(${DEFAULT_FILM_BG_URL})`);
      expect(screen.getByText(PAGE1_TEXT.replace('.','M'))).toBeInTheDocument();
      expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();
      expect(screen.queryByText(PAGE2_TEXT.replace('.','M'))).not.toBeInTheDocument();
    });

    // --- Click Next Button ---
    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);
    act(() => vi.advanceTimersByTime(1200 + 100)); // Slide duration + buffer

    await waitFor(() => {
      // Should show Page 2 content and background
      const filmBackground = screen.getByTestId('film-background-div');
      expect(filmBackground).toHaveStyle(`background-image: url(${PAGE2_IMG})`);
      expect(screen.getByText(PAGE2_TEXT.replace('.','M'))).toBeInTheDocument();
      expect(screen.getByText('Page 2 / 2')).toBeInTheDocument();
      expect(screen.queryByText(PAGE1_TEXT.replace('.','M'))).not.toBeInTheDocument();
    });
  });

  test('handles writing and fade sequences from new API response structure', async () => {
    fetchTypewriterReply.mockResolvedValueOnce({
      data: {
        metadata: { font: "'IM Fell English SC', serif", font_size: "1.9rem", font_color: "#2a120f" },
        writing_sequence: [
          { action: "type", delay: 20, text: "Initial text.", style: {} },
          { action: "pause", delay: 30 },
          { action: "type", delay: 20, text: " More text.", style: {} },
        ],
        fade_sequence: [
          { action: "fade", phase: 1, delay: 100, to_text: "Faded text 1", style: {} },
          { action: "fade", phase: 2, delay: 80, to_text: "Faded text 2", style: {} },
          { action: "fade", phase: 3, delay: 60, to_text: "", style: {} }
        ]
      },
      error: null
    });
    const expectedTextAfterWriting = "Initial text. More text.";

    const { container } = render(<TypewriterFramework />);

    // Trigger fetchTypewriterReply via inactivity
    // Simulate a key press to set lastUserInputTime
    fireEvent.keyDown(container.firstChild, { key: 'A', code: 'KeyA' });
    act(() => { vi.advanceTimersByTime(150); }); // Allow key press to register

    // Advance timers for inactivity check (GHOSTWRITER_AI_TRIGGER_INTERVAL is 1000ms)
    // and inactivity threshold (15s)
    act(() => { vi.advanceTimersByTime(16000); }); // > 15s + GHOSTWRITER_AI_TRIGGER_INTERVAL

    await waitFor(() => expect(fetchTypewriterReply).toHaveBeenCalledTimes(1));

    // Verify writing_sequence processing
    // Delays: 20 (type) + 30 (pause) + 20 (type) = 70ms
    // Characters: "Initial text." (13) + " More text." (11) = 24 characters.
    // Estimated typing time for test: 24 chars * ~10ms/char_test_approx (this is a rough estimate, actual is GHOST_KEY_TYPING_INTERVAL=90ms, but many letters can process faster due to internal logic)
    // Let's use sum of explicit delays + buffer for typing letters.
    // The actual ghost key typing interval is 90ms per letter, but the test sequence has its own delays.
    // The 'type' action has internal letter-by-letter timeouts.
    // Sum of explicit delays in sequence: 20+30+20 = 70ms.
    // For "Initial text.": 13 chars. If each char takes ~80-110ms (from TypewriterFramework's random delay in 'type' action)
    // For " More text.": 11 chars.
    // This part of timing is tricky. Let's use a generous buffer for all letters in "type" actions.
    // A single "type" action processes all its text with internal delays.
    // So, delay for "Initial text." is 20ms (action delay) + internal letter delays.
    // Then 30ms pause.
    // Then delay for " More text." is 20ms (action delay) + internal letter delays.
    // Let's assume ~30ms per char average for test purposes to be safe for internal typing animation within a 'type' action.
    // 13 chars * 30ms = 390ms. 11 chars * 30ms = 330ms.
    // Total: 20(action) + 390(typing) + 30(pause) + 20(action) + 330(typing) = 790ms.
    // Adding a safety buffer.
    act(() => { vi.advanceTimersByTime(1000); }); // Increased buffer for writing sequence

    await waitFor(() => {
      const lineElements = container.querySelectorAll('.typewriter-line .last-line-content');
      expect(lineElements.length).toBeGreaterThanOrEqual(1);
      // Ghost text is rendered character by character, then committed.
      // We are checking the state *after* the writing_sequence should have completed.
      // At this point, the text from writing_sequence is in currentGhostText.
      // It gets committed to pageText when the sequence completes OR when user types.
      // In this test, sequence completion should commit it.
      // The PaperDisplay shows pageText + ghostText.
      // When writing_sequence completes, currentGhostText becomes the content.
      expect(lineElements[0].textContent).toBe(expectedTextAfterWriting);
    }, { timeout: 2000 });


    // Verify fade_sequence processing
    // Fade 1
    act(() => { vi.advanceTimersByTime(100); }); // Delay for fade phase 1
    await waitFor(() => {
      const lineContent = container.querySelector('.typewriter-line .last-line-content');
      expect(lineContent.textContent).toBe("Faded text 1");
    });

    // Fade 2
    act(() => { vi.advanceTimersByTime(80); }); // Delay for fade phase 2
    await waitFor(() => {
      const lineContent = container.querySelector('.typewriter-line .last-line-content');
      expect(lineContent.textContent).toBe("Faded text 2");
    });

    // Fade 3 (to empty)
    act(() => { vi.advanceTimersByTime(60); }); // Delay for fade phase 3
    await waitFor(() => {
      const lineContent = container.querySelector('.typewriter-line .last-line-content');
      expect(lineContent.textContent).toBe("");
    });

    // Verify Final State (Text is the content of the last fade)
    // After the entire sequence completes, the page text should be the `to_text` of the *last* fade action.
    // In this test's mock data, the last fade action has `to_text: ""`.
    act(() => { vi.advanceTimersByTime(100); }); // Buffer for sequence completion logic

    await waitFor(() => {
      // The content should now be permanently set to the final fade's content.
      const lineContent = container.querySelector('.typewriter-line');
      // It might be a single line element that is empty.
      expect(lineContent.textContent).toBe("");
    });
  });
});

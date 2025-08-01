// src/TypewriterFramework.integration.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TypewriterFramework from './TypewriterFramework';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach, test } from 'vitest';

// Mock API services
vi.mock('./apiService', () => ({
  fetchNextFilmImage: vi.fn(), // Default mock setup in beforeEach
  fetchTypewriterReply: vi.fn().mockResolvedValue({ data: { content: 'mock AI reply' }, error: null }),
  fetchShouldGenerateContinuation: vi.fn().mockResolvedValue({ data: { shouldGenerate: false }, error: null }),
}));

// Mock utility functions (sound)
vi.mock('./utils', async () => {
  const originalUtils = await vi.importActual('./utils');
  return {
    ...originalUtils,
    playKeySound: vi.fn(),
    playEnterSound: vi.fn(),
    playXerofagHowl: vi.fn(),
    playEndOfPageSound: vi.fn(),
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
import { playEndOfPageSound } from './utils';
import { DEFAULT_FILM_BG_URL } from './TypewriterFramework';

describe('TypewriterFramework Integration Tests', () => {
    let ACTUAL_MAX_LINES = 20; // Example value, adjust if needed

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.HTMLMediaElement.prototype.play = vi.fn();
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
  }, 120000);


  test('triggers page turn when MAX_LINES is exceeded', async () => {
    const NEW_PAGE_IMAGE = 'new_page_specific.png';
    fetchNextFilmImage.mockResolvedValue({ data: { image_url: NEW_PAGE_IMAGE }, error: null });

    const { container } = render(<TypewriterFramework />);
    const typewriterContainerDiv = container.firstChild;

    // Type MAX_LINES lines
    for (let i = 0; i < ACTUAL_MAX_LINES + 20; i++) {
      fireEvent.keyDown(typewriterContainerDiv, { key: 'Enter' });
      act(() => { vi.advanceTimersByTime(150); }); // Allow newline to process
    }

    expect(playEndOfPageSound).toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(900 + 10); });

    await waitFor(() => {
      expect(fetchNextFilmImage).toHaveBeenCalled();
    });

    act(() => { vi.advanceTimersByTime(1200 + 10); });

    await waitFor(() => {
      const paperDisplay = screen.getByTestId('paper-frame');
      const filmBackground = within(paperDisplay).getByTestId('film-background-div');
      expect(filmBackground).toHaveStyle(`background-image: url(${NEW_PAGE_IMAGE})`);

      const lineElements = typewriterContainerDiv.querySelectorAll('.typewriter-line .last-line-content');
      if (lineElements.length > 0) {
          expect(lineElements[0].textContent).toBe('');
      } else {
          expect(lineElements.length).toBe(0);
      }
    });
  }, 120000);

  test('can navigate between pages using Prev/Next buttons', async () => {
    const PAGE1_TEXT = "Page one content.";
    const PAGE2_TEXT = "Page two stuff.";
    const PAGE1_IMG = 'page1_img.png';
    const PAGE2_IMG = 'page2_img.png';
    const PAGE3_IMG = 'page3_img.png';

    fetchNextFilmImage
      .mockResolvedValueOnce({ data: { image_url: PAGE2_IMG }, error: null })
      .mockResolvedValueOnce({ data: { image_url: PAGE3_IMG }, error: null });

    const { container } = render(<TypewriterFramework />);
    const typewriterContainerDiv = container.firstChild;

    // --- Create Page 1 ---
    PAGE1_TEXT.split('').forEach(char => {
        fireEvent.keyDown(typewriterContainerDiv, { key: char });
        act(() => vi.advanceTimersByTime(150));
    });
    await waitFor(() => expect(screen.getByText(PAGE1_TEXT)).toBeInTheDocument());


    // --- Trigger Page Turn to Page 2 ---
    for (let i = 0; i < ACTUAL_MAX_LINES + 1; i++) {
      pressEnter(typewriterContainerDiv);
      act(() => vi.advanceTimersByTime(150));
    }

    await waitFor(() => {
      const filmBackground = screen.getByTestId('film-background-div');
      expect(filmBackground).toHaveStyle(`background-image: url(/${PAGE2_IMG})`);
      expect(screen.getByText('Page 2 / 2')).toBeInTheDocument();
    });

    // --- Create Page 2 ---
    PAGE2_TEXT.split('').forEach(char => {
        fireEvent.keyDown(typewriterContainerDiv, { key: char });
        act(() => vi.advanceTimersByTime(150));
    });
    await waitFor(() => expect(screen.getByText(PAGE2_TEXT)).toBeInTheDocument());

    // --- Click Prev Button ---
    const prevButton = screen.getByText('← Prev');
    fireEvent.click(prevButton);
    act(() => vi.advanceTimersByTime(1200 + 100));

    await waitFor(() => {
      const filmBackground = screen.getByTestId('film-background-div');
      expect(filmBackground).toHaveStyle(`background-image: url(${DEFAULT_FILM_BG_URL})`);
      expect(screen.getByText(PAGE1_TEXT)).toBeInTheDocument();
      expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();
      expect(screen.queryByText(PAGE2_TEXT)).not.toBeInTheDocument();
    });

    // --- Click Next Button ---
    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);
    act(() => vi.advanceTimersByTime(1200 + 100));

    await waitFor(() => {
      const filmBackground = screen.getByTestId('film-background-div');
      expect(filmBackground).toHaveStyle(`background-image: url(/${PAGE2_IMG})`);
      expect(screen.getByText(PAGE2_TEXT)).toBeInTheDocument();
      expect(screen.getByText('Page 2 / 2')).toBeInTheDocument();
      expect(screen.queryByText(PAGE1_TEXT)).not.toBeInTheDocument();
    });
  }, 120000);

  test('handles writing and fade sequences from new API response structure', async () => {
    fetchTypewriterReply.mockResolvedValueOnce({
      data: {
        metadata: { font: "'IM Fell English SC', serif", font_size: "1.9rem", font_color: "#2a120f" },
        writing_seqeunce: [
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

    fireEvent.keyDown(container.firstChild, { key: 'A', code: 'KeyA' });
    act(() => { vi.advanceTimersByTime(150); });

    act(() => { vi.advanceTimersByTime(16000); });

    await waitFor(() => expect(fetchTypewriterReply).toHaveBeenCalledTimes(1));

    act(() => { vi.advanceTimersByTime(1000); });

    await waitFor(() => {
      const lineElements = container.querySelectorAll('.typewriter-line .last-line-content');
      expect(lineElements.length).toBeGreaterThanOrEqual(1);
      expect(lineElements[0].textContent).toBe(expectedTextAfterWriting);
    }, { timeout: 2000 });


    // Verify fade_sequence processing
    act(() => { vi.advanceTimersByTime(100); });
    await waitFor(() => {
      const lineContent = container.querySelector('.typewriter-line .last-line-content');
      expect(lineContent.textContent).toBe("Faded text 1");
    });

    act(() => { vi.advanceTimersByTime(80); });
    await waitFor(() => {
      const lineContent = container.querySelector('.typewriter-line .last-line-content');
      expect(lineContent.textContent).toBe("Faded text 2");
    });

    act(() => { vi.advanceTimersByTime(60); });
    await waitFor(() => {
      const lineContent = container.querySelector('.typewriter-line .last-line-content');
      expect(lineContent.textContent).toBe("");
    });

    act(() => { vi.advanceTimersByTime(100); });

    await waitFor(() => {
      const lineElements = container.querySelectorAll('.typewriter-line .last-line-content');
      expect(lineElements.length).toBeGreaterThanOrEqual(1);
      expect(lineElements[0].textContent).toBe(expectedTextAfterWriting);
    });
  }, 120000);
});

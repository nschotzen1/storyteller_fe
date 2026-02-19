import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import TypewriterFramework, { MAX_LINES, normalizeTypewriterReply } from './TypewriterFramework';
import '@testing-library/jest-dom';

vi.mock('./apiService', () => ({
  fetchNextFilmImage: vi.fn(),
  fetchTypewriterReply: vi.fn().mockResolvedValue({ data: { content: 'mock AI reply' }, error: null }),
  fetchShouldGenerateContinuation: vi.fn().mockResolvedValue({ shouldGenerate: false }),
}));

vi.mock('./utils', async () => {
  const originalUtils = await vi.importActual('./utils');
  return {
    ...originalUtils,
    playKeySound: vi.fn(),
    playEnterSound: vi.fn(),
    playXerofagHowl: vi.fn(),
    playEndOfPageSound: vi.fn(),
    playGhostWriterSound: vi.fn(),
  };
});

import {
  fetchNextFilmImage,
  fetchTypewriterReply,
  fetchShouldGenerateContinuation,
} from './apiService';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key) => delete store[key]),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const clickKey = (key) => {
  if (key === ' ') {
    fireEvent.click(screen.getByAltText('Spacebar').closest('.spacebar-wrapper'));
    return;
  }
  const element = screen.getByAltText(`Key ${key.toUpperCase()}`).closest('.typewriter-key-wrapper');
  if (!element) throw new Error(`Missing key ${key}`);
  fireEvent.click(element);
};

describe('TypewriterFramework integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.clear();
    localStorageMock.setItem('sessionId', 'test-session-id-123');
    fetchNextFilmImage.mockResolvedValue({ data: { image_url: 'default_mock_image.png' }, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('user typing renders text and Enter creates a new line', async () => {
    const { container } = render(<TypewriterFramework />);

    clickKey('H');
    clickKey('I');
    act(() => {
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      const lines = container.querySelectorAll('.typewriter-line .last-line-content');
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0].textContent).toContain('HI');
    });

    fireEvent.keyDown(container.firstChild, { key: 'Enter', code: 'Enter' });
    act(() => {
      vi.advanceTimersByTime(120);
    });

    clickKey('T');
    act(() => {
      vi.advanceTimersByTime(120);
    });
    clickKey('O');
    act(() => {
      vi.advanceTimersByTime(120);
    });

    await waitFor(() => {
      const lines = container.querySelectorAll('.typewriter-line .last-line-content');
      expect(lines.length).toBe(2);
      expect(lines[0].textContent).toContain('HI');
      expect(lines[1].textContent).toContain('TO');
    });
  });

  test('page turn fetches next film image when line limit is exceeded', async () => {
    fetchNextFilmImage.mockResolvedValue({ data: { image_url: 'new_page_specific.png' }, error: null });

    const { container } = render(<TypewriterFramework />);
    const root = container.firstChild;

    for (let i = 0; i < MAX_LINES; i += 1) {
      clickKey('A');
      act(() => {
        vi.advanceTimersByTime(120);
      });
      if (i < MAX_LINES - 1) {
        fireEvent.keyDown(root, { key: 'Enter', code: 'Enter' });
        act(() => {
          vi.advanceTimersByTime(120);
        });
      }
    }

    fireEvent.keyDown(root, { key: 'Enter', code: 'Enter' });

    act(() => {
      vi.advanceTimersByTime(2400);
    });

    await waitFor(() => {
      expect(fetchNextFilmImage).toHaveBeenCalled();
      const nextSlide = screen.getByTestId('next-bg-slide');
      expect(nextSlide).toHaveStyle('background-image: url("new_page_specific.png")');
    });
  });

  test('normalizes mock and non-mock reply schemas into a single sequence', () => {
    const mockStyle = normalizeTypewriterReply({
      metadata: { fontName: 'Test Font', fontSize: '1rem', fontColor: '#111' },
      writing_sequence: [
        { action: 'type', continuation: 'hello', delay: 0 },
        { action: 'pause', delay: 20 },
      ],
      fade_sequence: [
        { action: 'fade', continuation: 'short', phase: 1, delay: 10 },
      ],
    });

    expect(mockStyle.metadata).toEqual({
      font: 'Test Font',
      font_size: '1rem',
      font_color: '#111',
    });
    expect(mockStyle.sequence.map((s) => s.action)).toEqual(['type', 'pause', 'fade']);
    expect(mockStyle.sequence[0].text).toBe('hello');
    expect(mockStyle.sequence[2].to_text).toBe('short');

    const nonMockStyle = normalizeTypewriterReply({
      style: { font: 'Other Font', font_size: '2rem', font_color: '#222' },
      sequence: [
        { type: 'type', text: 'abc', delay: 5 },
        { type: 'delete', count: 1, delay: 2 },
        { type: 'fade', to_text: '', delay: 3 },
      ],
    });

    expect(nonMockStyle.metadata).toEqual({
      font: 'Other Font',
      font_size: '2rem',
      font_color: '#222',
    });
    expect(nonMockStyle.sequence.map((s) => s.action)).toEqual(['type', 'delete', 'fade']);
    expect(nonMockStyle.sequence[0].text).toBe('abc');
  });

  test('renders fade phase when a typewriter sequence includes fade actions', async () => {
    fetchShouldGenerateContinuation.mockResolvedValue({ shouldGenerate: true });
    fetchTypewriterReply.mockResolvedValue({
      data: {
        metadata: { font: 'Test Fade Font', font_size: '1.8rem', font_color: '#111' },
        sequence: [
          { action: 'type', text: 'AB', delay: 0 },
          { action: 'pause', delay: 10 },
          { action: 'fade', to_text: 'A', phase: 1, delay: 600 },
          { action: 'fade', to_text: '', phase: 2, delay: 600 },
        ],
      },
      error: null,
    });

    const { container } = render(<TypewriterFramework />);

    clickKey('H');
    clickKey('I');
    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    await waitFor(() => {
      expect(container.querySelector('.fade-ghost-container')).toBeInTheDocument();
      expect(container.querySelector('.fade-ghost-layer.fade-ghost-in')).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(700);
    });

    await waitFor(() => {
      expect(container.querySelector('.fade-ghost-layer.fade-ghost-out')).toBeInTheDocument();
    });
  });

  test('restores cursor after fade and does not auto-retrigger until user types again', async () => {
    fetchShouldGenerateContinuation.mockResolvedValue({ shouldGenerate: true });
    fetchTypewriterReply.mockResolvedValue({
      data: {
        metadata: { font: 'Test Fade Font', font_size: '1.8rem', font_color: '#111' },
        sequence: [
          { action: 'type', text: 'AB', delay: 0 },
          { action: 'pause', delay: 20 },
          { action: 'fade', to_text: 'A', phase: 1, delay: 60 },
          { action: 'fade', to_text: '', phase: 2, delay: 60 },
        ],
      },
      error: null,
    });

    render(<TypewriterFramework />);

    clickKey('H');
    clickKey('I');
    act(() => {
      vi.advanceTimersByTime(320);
    });

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    await waitFor(() => {
      expect(document.querySelector('.fade-ghost-container')).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(9000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('striker-cursor-element')).toBeInTheDocument();
    });

    const callCountAfterSequence = fetchTypewriterReply.mock.calls.length;
    expect(callCountAfterSequence).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(40000);
    });

    await waitFor(() => {
      expect(fetchTypewriterReply).toHaveBeenCalledTimes(callCountAfterSequence);
    });
  });

  test('allows user typing during a fade pause and cancels remaining fade steps', async () => {
    fetchShouldGenerateContinuation.mockResolvedValue({ shouldGenerate: true });
    fetchTypewriterReply.mockResolvedValue({
      data: {
        metadata: { font: 'Test Fade Font', font_size: '1.8rem', font_color: '#111' },
        sequence: [
          { action: 'type', text: 'AB', delay: 0 },
          { action: 'fade', to_text: 'A', phase: 1, delay: 0 },
          { action: 'pause', delay: 5000 },
          { action: 'fade', to_text: '', phase: 2, delay: 5000 },
        ],
      },
      error: null,
    });

    const { container } = render(<TypewriterFramework />);

    clickKey('H');
    clickKey('I');
    act(() => {
      vi.advanceTimersByTime(320);
    });

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    act(() => {
      vi.advanceTimersByTime(2200);
    });

    await waitFor(() => {
      expect(container.querySelector('.fade-ghost-container')).toBeInTheDocument();
      expect(screen.getByTestId('striker-cursor-element')).toBeInTheDocument();
    });

    clickKey('Z');
    act(() => {
      vi.advanceTimersByTime(220);
    });

    await waitFor(() => {
      const line = container.querySelector('.typewriter-line .last-line-content');
      expect(line).not.toBeNull();
      expect(line.textContent).toContain('HIZ');
    });

    const callCountAfterUserTakeover = fetchTypewriterReply.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(12000);
    });

    await waitFor(() => {
      expect(fetchTypewriterReply).toHaveBeenCalledTimes(callCountAfterUserTakeover);
    });
  });

});

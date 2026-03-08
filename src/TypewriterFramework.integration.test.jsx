import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { vi } from 'vitest';
import TypewriterFramework, {
  FIRST_FADE_HANDOFF_DELAY,
  MAX_LINES,
  normalizeContinuationInsights,
  normalizeTypewriterReply,
} from './TypewriterFramework';
import '@testing-library/jest-dom';

vi.mock('./apiService', () => ({
  fetchNextFilmImage: vi.fn(),
  fetchShouldCreateStorytellerKey: vi.fn(),
  fetchTypewriterReply: vi.fn().mockResolvedValue({ data: { content: 'mock AI reply' }, error: null }),
  fetchShouldGenerateContinuation: vi.fn().mockResolvedValue({ shouldGenerate: false }),
  startTypewriterSession: vi.fn().mockResolvedValue({ data: { sessionId: 'test-session-id-123' }, error: null }),
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
  fetchShouldCreateStorytellerKey,
  fetchTypewriterReply,
  fetchShouldGenerateContinuation,
  startTypewriterSession,
} from './apiService';
import { playEndOfPageSound } from './utils';

const buildStorytellerSlotPayload = (overrides = {}) => ([
  {
    slotIndex: 0,
    slotKey: 'STORYTELLER_SLOT_HORIZONTAL',
    keyShape: 'horizontal',
    blankTextureUrl: '/textures/keys/blank_horizontal_1.png',
    filled: false,
    storytellerId: '',
    storytellerName: '',
    keyImageUrl: '',
    symbol: '',
    description: '',
  },
  {
    slotIndex: 1,
    slotKey: 'STORYTELLER_SLOT_VERTICAL',
    keyShape: 'vertical',
    blankTextureUrl: '/textures/keys/blank_vertical_1.png',
    filled: false,
    storytellerId: '',
    storytellerName: '',
    keyImageUrl: '',
    symbol: '',
    description: '',
  },
  {
    slotIndex: 2,
    slotKey: 'STORYTELLER_SLOT_RECT_HORIZONTAL',
    keyShape: 'rect_horizontal',
    blankTextureUrl: '/textures/keys/blank_rect_horizontal_1.png',
    filled: false,
    storytellerId: '',
    storytellerName: '',
    keyImageUrl: '',
    symbol: '',
    description: '',
  },
]).map((slot) => ({
  ...slot,
  ...(overrides[slot.slotIndex] || {}),
}));

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
  const advanceUntil = async (conditionFn, maxMs = 5000, step = 50) => {
    let elapsed = 0;
    while (elapsed < maxMs) {
      if (conditionFn()) return true;
      act(() => { vi.advanceTimersByTime(step); });
      await Promise.resolve(); // flush microtasks
      elapsed += step;
    }
    return false;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    localStorageMock.clear();
    localStorageMock.setItem('sessionId', 'test-session-id-123');
    fetchNextFilmImage.mockResolvedValue({ data: { image_url: 'default_mock_image.png' }, error: null });
    fetchShouldCreateStorytellerKey.mockResolvedValue({
      data: { slots: buildStorytellerSlotPayload() },
      error: null
    });
    fetchTypewriterReply.mockResolvedValue({ data: { sequence: [] }, error: null });
    startTypewriterSession.mockResolvedValue({ data: { sessionId: 'test-session-id-123' }, error: null });
  });

  afterEach(() => {
    vi.clearAllTimers();
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
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

  test('line-limit Enter does not auto-turn page before lever is enabled', async () => {
    fetchNextFilmImage.mockResolvedValue({ data: { image_url: 'new_page_specific.png' }, error: null });
    fetchShouldGenerateContinuation.mockResolvedValue({ shouldGenerate: false });

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

    expect(fetchNextFilmImage).not.toHaveBeenCalled();
    expect(playEndOfPageSound).not.toHaveBeenCalled();
  });

  test('turn page lever fetches next film image once lever is enabled', async () => {
    fetchNextFilmImage.mockResolvedValue({ data: { image_url: 'new_page_specific.png' }, error: null });
    fetchShouldGenerateContinuation.mockResolvedValue({ shouldGenerate: false });

    render(<TypewriterFramework />);

    for (let i = 0; i < 31; i += 1) {
      clickKey('A');
      act(() => {
        vi.advanceTimersByTime(120);
      });
      clickKey(' ');
      act(() => {
        vi.advanceTimersByTime(120);
      });
    }

    const lever = await screen.findByAltText('Lever level 4');
    fireEvent.click(lever);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(fetchNextFilmImage).toHaveBeenCalled();
      const nextSlide = screen.getByTestId('next-bg-slide');
      expect(nextSlide).toHaveStyle('background-image: url("new_page_specific.png")');
    });
  });

  test('renders storyteller slots and swaps in generated storyteller key art', async () => {
    fetchShouldCreateStorytellerKey.mockResolvedValue({
      data: {
        slots: buildStorytellerSlotPayload({
          0: {
            filled: true,
            storytellerId: 'storyteller-1',
            storytellerName: 'Aster Vell',
            keyImageUrl: 'http://localhost:5001/assets/demo/aster_vell_key.png',
            symbol: 'ink moth',
            description: 'Weathered brass and smoky enamel.',
          },
        }),
      },
      error: null
    });

    render(<TypewriterFramework />);

    act(() => {
      vi.advanceTimersByTime(900);
    });

    await waitFor(() => {
      expect(fetchShouldCreateStorytellerKey).toHaveBeenCalled();
    });

    expect(screen.getByAltText('Storyteller key Aster Vell')).toHaveAttribute(
      'src',
      'http://localhost:5001/assets/demo/aster_vell_key.png'
    );
    expect(screen.getByAltText('Blank storyteller slot 2')).toHaveAttribute(
      'src',
      '/textures/keys/blank_vertical_1.png'
    );
    expect(screen.getByAltText('Blank storyteller slot 3')).toHaveAttribute(
      'src',
      '/textures/keys/blank_rect_horizontal_1.png'
    );
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

  test('normalizes continuation insights payload including Entities array', () => {
    const normalized = normalizeContinuationInsights({
      continuation_insights: {
        meaning: ['Signal implies shelter.', 'Approach raises stakes.'],
        contextual_strengthening: 'The cue connects bell, smoke, and movement.',
        continuation_word_count: 7,
        current_storytelling_points_pool: 35,
        points_earned: 0,
        Entities: [
          {
            entity_name: 'Monastery kitchen chimney',
            ner_category: 'STRUCTURE',
            ascope_pmesii: 'Infrastructure',
            storytelling_points: 4,
            reuse: false,
          },
        ],
      },
    });

    expect(normalized).toEqual({
      meaning: ['Signal implies shelter.', 'Approach raises stakes.'],
      contextual_strengthening: 'The cue connects bell, smoke, and movement.',
      continuation_word_count: 7,
      current_storytelling_points_pool: 35,
      points_earned: 0,
      entities: [
        {
          entity_name: 'Monastery kitchen chimney',
          ner_category: 'STRUCTURE',
          ascope_pmesii: 'Infrastructure',
          storytelling_points: 4,
          reuse: false,
        },
      ],
      style: null,
    });
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

    await waitFor(() => {
      expect(fetchNextFilmImage).not.toHaveBeenCalled(); // dummy check
    });

    const fadeAppeared = await advanceUntil(() => container.querySelector('.fade-ghost-container') !== null, 4000);
    expect(fadeAppeared).toBe(true);

    await waitFor(() => {
      expect(container.querySelector('.fade-ghost-container')).toBeInTheDocument();
      expect(container.querySelector('.fade-ghost-layer.fade-ghost-in')).toBeInTheDocument();
    });

    const fadeOutAppeared = await advanceUntil(() => container.querySelector('.fade-ghost-layer.smudge-fade-out') !== null, 3000);
    expect(fadeOutAppeared).toBe(true);

    await waitFor(() => {
      expect(container.querySelector('.fade-ghost-layer.smudge-fade-out')).toBeInTheDocument();
    });
  });

  test('adds a first-fade handoff delay without affecting later fade phases', () => {
    const normalized = normalizeTypewriterReply({
      sequence: [
        { action: 'type', text: 'AB', delay: 200 },
        { action: 'pause', delay: 300 },
        { action: 'fade', to_text: 'A', phase: 1, delay: 600 },
        { action: 'fade', to_text: '', phase: 2, delay: 600 },
      ],
    });

    expect(normalized.sequence[2].leadDelay).toBe(FIRST_FADE_HANDOFF_DELAY - 500);
    expect(normalized.sequence[3].leadDelay).toBe(0);
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

    await waitFor(() => {
      expect(fetchNextFilmImage).not.toHaveBeenCalled();
    });

    const fadeAppeared = await advanceUntil(() => document.querySelector('.fade-ghost-container') !== null, 4000);
    expect(fadeAppeared).toBe(true);

    await waitFor(() => {
      expect(document.querySelector('.fade-ghost-container')).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(4200); // finish sequence and restore cursor
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

  test('typing during fade interval freezes current fade text and stops remaining fades', async () => {
    fetchShouldGenerateContinuation
      .mockResolvedValueOnce({ shouldGenerate: true })
      .mockResolvedValue({ shouldGenerate: false });
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

    await waitFor(() => {
      expect(fetchNextFilmImage).not.toHaveBeenCalled();
    });

    const fadeAppeared = await advanceUntil(() => container.querySelector('.fade-ghost-container') !== null, 4000);
    expect(fadeAppeared).toBe(true);

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
      const lineText = String(line.textContent || '');
      expect(lineText).toContain('HI AZ');
      expect(container.querySelector('.fade-ghost-container')).not.toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    await waitFor(() => {
      expect(fetchTypewriterReply).toHaveBeenCalledTimes(1);
      expect(container.querySelector('.fade-ghost-container')).not.toBeInTheDocument();
      const line = container.querySelector('.typewriter-line .last-line-content');
      expect(String(line?.textContent || '')).toContain('HI AZ');
    });
  });

});

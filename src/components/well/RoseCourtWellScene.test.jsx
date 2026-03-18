import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RoseCourtWellScene from './RoseCourtWellScene';

describe('RoseCourtWellScene', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it('caps the parchment line at ten words and completes with the truncated line', () => {
    const handleComplete = vi.fn();

    render(
      <RoseCourtWellScene
        promptDelayMs={50}
        fragmentSpawnMs={1000}
        fragmentLifetimeMs={1500}
        departureDurationMs={120}
        onComplete={handleComplete}
      />
    );

    act(() => {
      vi.advanceTimersByTime(60);
    });

    const input = screen.getByPlaceholderText('A single line for the court...');
    fireEvent.change(input, {
      target: {
        value: 'one '
      }
    });

    expect(input).toHaveValue('one ');

    fireEvent.change(input, {
      target: {
        value: 'one two three four five six seven eight nine ten eleven twelve'
      }
    });

    expect(input).toHaveValue('one two three four five six seven eight nine ten');
    expect(screen.getByText('0 words left')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Offer the line' }));

    act(() => {
      vi.advanceTimersByTime(140);
    });

    expect(handleComplete).toHaveBeenCalledWith('one two three four five six seven eight nine ten');
  });
});

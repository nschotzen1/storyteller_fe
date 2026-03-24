import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RoseCourtOpeningSequence from './RoseCourtOpeningSequence';

const reachRiddle = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Turn it over' }));
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  fireEvent.click(screen.getByRole('button', { name: /storyteller\.society\.not-spam-at-all\.ink\/rose\/hall/i }));
  act(() => {
    vi.advanceTimersByTime(1600);
  });
};

describe('RoseCourtOpeningSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('reaches the Storyteller Society dispatch after turning the opener', () => {
    render(<RoseCourtOpeningSequence />);

    expect(screen.getByText(/browsing your most loyal messaging app/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Turn it over' }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/Storyteller Society/i)).toBeInTheDocument();
    expect(screen.getByText(/So finally, we made a connection/i)).toBeInTheDocument();
  });

  it('accepts dove cot as the correct answer and completes the intro', () => {
    const onComplete = vi.fn();
    render(<RoseCourtOpeningSequence onComplete={onComplete} />);

    reachRiddle();

    fireEvent.change(screen.getByLabelText('Your reply'), {
      target: { value: 'dove cot' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));

    const continueButton = screen.getByRole('button', { name: 'Continue to Rose Court' });
    expect(continueButton).toBeInTheDocument();

    fireEvent.click(continueButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('falls into the montage after five failed answers', () => {
    render(<RoseCourtOpeningSequence />);

    reachRiddle();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      fireEvent.change(screen.getByLabelText('Your reply'), {
        target: { value: `wrong ${attempt}` }
      });
      fireEvent.click(screen.getByRole('button', { name: 'Answer' }));

      act(() => {
        vi.advanceTimersByTime(1200);
      });
    }

    expect(screen.getByText(/You seemed to have forgotten all about it/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });
});

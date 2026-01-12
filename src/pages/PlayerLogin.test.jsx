import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerLogin from './PlayerLogin';
import { fetchSessionPlayers } from '../api/storytellerSession';

jest.mock('../api/storytellerSession', () => ({
  fetchSessionPlayers: jest.fn(),
  registerPlayer: jest.fn()
}));

describe('PlayerLogin', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchSessionPlayers.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('refreshes the session player count periodically', async () => {
    fetchSessionPlayers
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });

    render(<PlayerLogin onSubmit={() => {}} initialSessionId="session1" />);

    await act(async () => {
      jest.advanceTimersByTime(350);
      await Promise.resolve();
    });

    expect(fetchSessionPlayers).toHaveBeenCalledWith('http://localhost:5001', 'session1');
    expect(screen.getByText('1')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(fetchSessionPlayers).toHaveBeenCalledTimes(2);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import EarlyDuskPage from './EarlyDuskPage';

const STATE = {
  chronicleId: 'abc-123',
  act: 'SOCIETY_CHAT',
  recoveredFacts: {},
  character: { tendencies: {}, notes: [] },
  evidence: [],
  cells: [],
  pressure: { value: 0, threshold: 6 },
  transcript: []
};

describe('EarlyDuskPage', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/?view=early-dusk');
    global.fetch = vi.fn(async (url) => {
      if (String(url).endsWith('/api/chronicle/early-dusk/start')) {
        return { ok: true, json: async () => ({ chronicleId: 'abc-123', act: 'SOCIETY_CHAT' }) };
      }
      if (String(url).includes('/api/chronicle/abc-123/state')) {
        return { ok: true, json: async () => STATE };
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('starts a chronicle when none is in the URL and renders the act panel', async () => {
    render(<EarlyDuskPage />);
    await waitFor(() => {
      expect(screen.getByTestId('act-panel-SOCIETY_CHAT')).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chronicle/early-dusk/start'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(new URLSearchParams(window.location.search).get('chronicle')).toBe('abc-123');
  });

  test('rehydrates from an existing chronicle id without starting a new one', async () => {
    window.history.replaceState({}, '', '/?view=early-dusk&chronicle=abc-123');
    render(<EarlyDuskPage />);
    await waitFor(() => {
      expect(screen.getByTestId('act-panel-SOCIETY_CHAT')).toBeInTheDocument();
    });
    const startCalls = global.fetch.mock.calls.filter(([url]) =>
      String(url).includes('/start')
    );
    expect(startCalls).toHaveLength(0);
  });

  test('shows an error panel when the backend is unreachable', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, statusText: 'boom' }));
    render(<EarlyDuskPage />);
    await waitFor(() => {
      expect(screen.getByTestId('early-dusk-error')).toBeInTheDocument();
    });
  });
});

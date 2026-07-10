import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EarlyDuskPage from './EarlyDuskPage';

const startPayload = {
  chronicleId: '11111111-2222-3333-4444-555555555555',
  act: 'SOCIETY_CHAT',
  messages: [
    { role: 'society', beatId: 'm_first_contact', text: 'You are the author of record.', flags: {} }
  ],
  question: {
    beatId: 'q_identity',
    text: 'Are you the author?',
    options: [{ id: 'opt_am', label: 'I am.' }],
    allowFreeText: true
  }
};

const respondPayload = {
  messages: [{ role: 'society', beatId: 'm_react_identity', text: 'Noted. Validation is required.', flags: {} }],
  question: { beatId: 'q_page_count', text: 'How many pages?', options: [{ id: 'opt_214', label: 'Two hundred and fourteen' }], allowFreeText: false },
  act: 'SOCIETY_CHAT'
};

const statePayload = {
  chronicleId: '11111111-2222-3333-4444-555555555555',
  act: 'SOCIETY_CHAT',
  recoveredFacts: {},
  character: {},
  evidence: [],
  cells: [],
  pressure: { value: 0, threshold: 6 },
  transcript: [
    { role: 'society', beatId: 'm_first_contact', text: 'You are the author of record.', flags: {} },
    { role: 'player', beatId: 'q_identity', choiceId: 'opt_am', choiceLabel: 'I am.' }
  ],
  pendingQuestion: {
    beatId: 'q_page_count',
    text: 'How many pages?',
    options: [{ id: 'opt_214', label: 'Two hundred and fourteen' }],
    allowFreeText: false
  }
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  window.history.replaceState({}, '', '/?view=early-dusk');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('EarlyDuskPage', () => {
  test('starts a chronicle, shows the opening chat, and answering advances it', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/start')) return jsonResponse(startPayload, 201);
      if (String(url).endsWith('/chat/respond')) return jsonResponse(respondPayload);
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<EarlyDuskPage />);
    await screen.findByText('You are the author of record.');
    expect(screen.getByTestId('act-panel-SOCIETY_CHAT')).toBeTruthy();
    expect(new URLSearchParams(window.location.search).get('chronicle')).toBe(startPayload.chronicleId);

    fireEvent.click(screen.getByRole('button', { name: 'I am.' }));
    await screen.findByText('Noted. Validation is required.');
    expect(screen.getByText('How many pages?')).toBeTruthy();
    expect(screen.getByText('I am.')).toBeTruthy(); // player bubble
  });

  test('does not start twice under StrictMode double-mount', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith('/start')) return jsonResponse(startPayload, 201);
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <React.StrictMode>
        <EarlyDuskPage />
      </React.StrictMode>
    );
    await screen.findByText('You are the author of record.');
    const startCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/start'));
    expect(startCalls).toHaveLength(1);
  });

  test('rehydrates an existing chronicle from the URL without starting a new one', async () => {
    window.history.replaceState({}, '', `/?view=early-dusk&chronicle=${statePayload.chronicleId}`);
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/state')) return jsonResponse(statePayload);
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<EarlyDuskPage />);
    await screen.findByText('You are the author of record.');
    expect(screen.getByText('How many pages?')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/start'))).toBe(false);
  });

  test('a dead chronicle id falls back to a fresh start', async () => {
    window.history.replaceState({}, '', '/?view=early-dusk&chronicle=dead-id');
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/state')) return jsonResponse({ error: 'chronicle not found: dead-id' }, 404);
      if (String(url).endsWith('/start')) return jsonResponse(startPayload, 201);
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<EarlyDuskPage />);
    await screen.findByText('You are the author of record.');
    expect(new URLSearchParams(window.location.search).get('chronicle')).toBe(startPayload.chronicleId);
  });

  test('shows the error panel when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    render(<EarlyDuskPage />);
    await screen.findByTestId('early-dusk-error');
  });
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Messanger from './Messanger';
import { loadMessengerConversation, sendMessengerMessage } from './api/messenger';

vi.mock('./api/messenger', () => ({
  DEFAULT_API_BASE_URL: 'http://localhost:5001',
  DEFAULT_SCENE_ID: 'messanger',
  loadMessengerConversation: vi.fn(),
  sendMessengerMessage: vi.fn()
}));

const openingPayload = {
  hasChatEnded: false,
  messages: [
    {
      id: 'intro',
      sender: 'system',
      text: 'The Society is pleased to reopen this channel.',
      type: 'initial',
      hasChatEnded: false,
      createdAt: '2026-07-12T09:00:00.000Z'
    }
  ]
};

beforeEach(() => {
  vi.clearAllMocks();
  const storage = new Map();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key) => (storage.has(key) ? storage.get(key) : null)),
      setItem: vi.fn((key, value) => storage.set(key, String(value))),
      removeItem: vi.fn((key) => storage.delete(key))
    }
  });
  window.localStorage.setItem('sessionId', 'session-1');
});

describe('Messanger', () => {
  test('loads the legacy messenger conversation', async () => {
    loadMessengerConversation.mockResolvedValue(openingPayload);

    render(<Messanger />);

    expect(await screen.findByText('The Society is pleased to reopen this channel.')).toBeInTheDocument();
    expect(loadMessengerConversation).toHaveBeenCalledWith('http://localhost:5001', {
      sessionId: 'session-1',
      sceneId: 'messanger'
    });
  });

  test('sends a reply through the messenger API and renders the returned thread', async () => {
    loadMessengerConversation.mockResolvedValue(openingPayload);
    sendMessengerMessage.mockResolvedValue({
      has_chat_ended: false,
      runtime: { mocked: true },
      messages: [
        ...openingPayload.messages,
        {
          id: 'user-1',
          sender: 'user',
          text: 'The typewriter can wait by the rain-streaked window.',
          type: 'user',
          hasChatEnded: false,
          createdAt: '2026-07-12T09:01:00.000Z'
        },
        {
          id: 'reply-1',
          sender: 'system',
          text: 'Good. Now tell us where it can disappear.',
          type: 'response',
          hasChatEnded: false,
          createdAt: '2026-07-12T09:02:00.000Z'
        }
      ]
    });

    render(<Messanger />);

    await screen.findByText('The Society is pleased to reopen this channel.');
    fireEvent.change(screen.getByPlaceholderText(/describe the room/i), {
      target: { value: 'The typewriter can wait by the rain-streaked window.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await screen.findByText('Good. Now tell us where it can disappear.');
    expect(sendMessengerMessage).toHaveBeenCalledWith('http://localhost:5001', {
      sessionId: 'session-1',
      sceneId: 'messanger',
      message: 'The typewriter can wait by the rain-streaked window.',
      mocked_api_calls: undefined
    });
    await waitFor(() => {
      expect(screen.getByText('Mock transmission')).toBeInTheDocument();
    });
  });
});

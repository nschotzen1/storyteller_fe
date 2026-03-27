import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MemorySpreadPage from './MemorySpreadPage';

const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;
const LIVE_BACKEND_ENABLED = process.env.MEMORY_SPREAD_LIVE_BACKEND === '1';
const LIVE_TEXT_MOCK_IMAGES_ENABLED = process.env.MEMORY_SPREAD_LIVE_TEXT_MOCK_IMAGES === '1';
const LIVE_BACKEND_BASE_URL = process.env.MEMORY_SPREAD_BACKEND_BASE_URL || 'http://127.0.0.1:5001';
const LIVE_BACKEND_WAIT_TIMEOUT_MS = 60000;
const liveBackendTest = LIVE_BACKEND_ENABLED ? test : test.skip;
const liveTextMockImagesTest = LIVE_TEXT_MOCK_IMAGES_ENABLED ? test : test.skip;

const createLocalStorageMock = () => {
  let store = {};

  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
};

const createMemoryPayload = () => ({
  memories: [
    {
      id: 'memory-live-1',
      short_title: 'Warm Mud Print',
      dramatic_definition: 'a familiar place betrays a new possibility',
      actual_result: 'warmth confirmed on mud and lantern',
      miseenscene: 'A lantern fogged while a fresh print held impossible warmth.',
      emotional_sentiment: 'uneasy awe',
      action_name: 'Inspecting the last print',
      estimated_action_length: 'a few minutes',
      time_within_action: 'middle',
      related_through_what: 'the translucent thumbprint on the lantern glass',
      geographical_relevance: 'local',
      temporal_relation: 'concurrent with the fragment',
      organizational_affiliation: 'Harlan household',
      consequences: 'reckoning that a person moved through the barn',
      distance_from_fragment_location_km: 0,
      shot_type: 'close-up POV',
      time_of_day: 'night',
      whose_eyes: 'Thatch Wren',
      'interior/exterior': 'exterior (barn apron)',
      what_is_being_watched: 'the last outward-facing hoof/footprint and the lantern',
      location: 'Harlan farm - milking barn',
      estimated_duration_of_memory: 30,
      memory_distance: 'immediate',
      entities_in_memory: ['Maren', 'Thatch Wren', 'lantern'],
      currently_assumed_turns_to_round: 'one held breath',
      relevant_rolls: ['Perception +3', 'Intuition +1'],
      action_level: 'investigative'
    }
  ]
});

const createEntityPayload = ({ mockedTextures = false } = {}) => ({
  entities: [
    {
      id: 'entity-live-1',
      name: 'Watchtower',
      ner_type: 'LOCATION',
      ner_subtype: 'Ruined Tower'
    }
  ],
  cards: [
    {
      entityId: 'entity-live-1',
      entityName: 'Watchtower',
      front: { imageUrl: '/assets/entity_front.png' },
      back: { imageUrl: '/assets/entity_back.png' }
    }
  ],
  mocked: mockedTextures,
  mockedEntities: false,
  mockedTextures
});

const createStorytellerGenerationPayload = ({ mockedIllustrations = false } = {}) => ({
  storytellers: [
    {
      _id: 'storyteller-live-1',
      name: 'Kestrel Vane',
      status: 'active',
      level: 5,
      illustration: '/assets/storyteller_mock.png',
      keyImageUrl: '/assets/storyteller_key_mock.png'
    }
  ],
  mocked: mockedIllustrations,
  mockedStorytellers: false,
  mockedIllustrations
});

const createStorytellerListPayload = () => ({
  storytellers: [
    {
      _id: 'storyteller-live-1',
      name: 'Kestrel Vane',
      status: 'active',
      level: 5,
      illustration: '/assets/storyteller_mock.png',
      keyImageUrl: '/assets/storyteller_key_mock.png'
    }
  ]
});

const createAbortableFetchMock = () =>
  vi.fn((url, options = {}) => new Promise((resolve, reject) => {
    const signal = options?.signal;
    if (!signal) return;
    if (signal.aborted) {
      const abortedError = new Error('Aborted');
      abortedError.name = 'AbortError';
      reject(abortedError);
      return;
    }
    signal.addEventListener(
      'abort',
      () => {
        const abortedError = new Error('Aborted');
        abortedError.name = 'AbortError';
        reject(abortedError);
      },
      { once: true }
    );
  }));

const createDelayedJsonResponseMock = (payload, delayMs) =>
  vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    clone: () => ({
      text: async () => JSON.stringify(payload)
    }),
    json: () => new Promise((resolve) => {
      setTimeout(() => resolve(payload), delayMs);
    })
  }));

describe('MemorySpreadPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    if (nativeFetch) {
      global.fetch = nativeFetch;
    }
    Object.defineProperty(window, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    window.localStorage.clear();
    window.history.replaceState({}, '', '/?view=memory-spread&memoryDebug=1');
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__memorySpreadDebug;
  });

  test('dedupes the startup memory load in StrictMode and records a trace', async () => {
    let resolveFetch;
    const fetchMock = vi.fn(() => new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    global.fetch = fetchMock;

    render(
      <React.StrictMode>
        <MemorySpreadPage />
      </React.StrictMode>
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => createMemoryPayload()
      });
    });

    await screen.findByText('Warm Mud Print');
    expect(screen.getByText('Trace')).toBeInTheDocument();
    expect(screen.getAllByText('/api/fragmentToMemories').length).toBeGreaterThan(0);

    await waitFor(() => {
      const events = window.__memorySpreadDebug?.events || [];
      expect(events.some((event) => event.label === '/api/fragmentToMemories' && event.stage === 'succeeded')).toBe(true);
    });
  });

  test('shows a timeout error and failed trace entry when the memory API stalls', async () => {
    vi.useFakeTimers();
    global.fetch = createAbortableFetchMock();
    window.history.replaceState({}, '', '/?view=memory-spread&memoryDebug=1&memoryTimeoutMs=12000');

    render(<MemorySpreadPage />);

    await act(async () => {
      vi.advanceTimersByTime(12050);
    });

    await screen.findByText('Memory API: Request timed out after 12s.');
    expect(screen.getAllByText('/api/fragmentToMemories').length).toBeGreaterThan(0);

    await waitFor(() => {
      const events = window.__memorySpreadDebug?.events || [];
      expect(events.some((event) => event.label === '/api/fragmentToMemories' && event.stage === 'failed')).toBe(true);
    });
  });

  test('keeps waiting for JSON after headers arrive before the timeout window closes', async () => {
    vi.useFakeTimers();
    global.fetch = createDelayedJsonResponseMock(createMemoryPayload(), 1500);
    window.history.replaceState({}, '', '/?view=memory-spread&memoryDebug=1&memoryTimeoutMs=1000');

    render(<MemorySpreadPage />);

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.queryByText(/Request timed out/i)).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      const snapshot = window.__memorySpreadDebug?.snapshot || {};
      expect(snapshot.generationTimeoutMs).toBe(1000);
      expect(snapshot.memorySource).toBe('api');
      const events = window.__memorySpreadDebug?.events || [];
      expect(events.some((event) => event.label === '/api/fragmentToMemories' && event.stage === 'succeeded')).toBe(true);
    });
  });

  test('supports live text with mock PNG images only and labels the flow as hybrid', async () => {
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (`${url}`.includes('/api/fragmentToMemories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ...createMemoryPayload(),
            mocked: true,
            mockedMemories: false,
            mockedTextures: true
          })
        };
      }
      if (`${url}`.includes('/api/textToEntity')) {
        return {
          ok: true,
          status: 200,
          json: async () => createEntityPayload({ mockedTextures: true })
        };
      }
      if (`${url}`.includes('/api/textToStoryteller')) {
        return {
          ok: true,
          status: 200,
          json: async () => createStorytellerGenerationPayload({ mockedIllustrations: true })
        };
      }
      if (`${url}`.includes('/api/storytellers')) {
        return {
          ok: true,
          status: 200,
          json: async () => createStorytellerListPayload()
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    global.fetch = fetchMock;

    window.history.replaceState({}, '', '/?view=memory-spread&memoryDebug=1&memoryMockImages=1');

    render(<MemorySpreadPage />);

    await screen.findByText('Warm Mud Print');
    expect(window.__memorySpreadDebug?.snapshot?.forceMockImages).toBe(true);
    expect(window.__memorySpreadDebug?.snapshot?.memorySource).toBe('hybrid');

    fireEvent.click(screen.getByRole('button', { name: /Warm Mud Print/i }));

    await waitFor(() => {
      const snapshot = window.__memorySpreadDebug?.snapshot || {};
      expect(snapshot.phase).toBe('spread');
      expect(snapshot.deckSource).toBe('hybrid');
      expect(snapshot.storytellerSource).toBe('hybrid');
    });

    const fragmentRequest = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fragmentRequest.mockImage).toBe(true);
    expect(fragmentRequest.mockTextures).toBe(true);
    expect(fragmentRequest.mocked_api_calls).toBeUndefined();

    const entityRequest = fetchMock.mock.calls
      .map((call) => ({ url: `${call[0]}`, body: call[1]?.body }))
      .find((call) => call.url.includes('/api/textToEntity'));
    expect(entityRequest).toBeTruthy();
    expect(JSON.parse(entityRequest.body).mockTextures).toBe(true);

    const storytellerRequest = fetchMock.mock.calls
      .map((call) => ({ url: `${call[0]}`, body: call[1]?.body }))
      .find((call) => call.url.includes('/api/textToStoryteller'));
    expect(storytellerRequest).toBeTruthy();
    const storytellerBody = JSON.parse(storytellerRequest.body);
    expect(storytellerBody.mockImage).toBe(true);
    expect(storytellerBody.mockIllustrations).toBe(true);
  });

  liveBackendTest('runs the memory -> entity -> storyteller flow against the live backend in forced mock mode', async () => {
    if (!nativeFetch) {
      throw new Error('Global fetch is unavailable in this test runtime.');
    }

    const liveBackendFetch = (url, options = {}) => {
      const { signal, ...rest } = options || {};
      return nativeFetch(url, rest);
    };
    global.fetch = liveBackendFetch;
    globalThis.fetch = liveBackendFetch;
    window.fetch = liveBackendFetch;

    window.history.replaceState(
      {},
      '',
      `/?view=memory-spread&memoryDebug=1&memoryMock=1&memoryApiBaseUrl=${encodeURIComponent(LIVE_BACKEND_BASE_URL)}`
    );

    render(<MemorySpreadPage />);

    const selectedMemoryButton = await screen.findByRole(
      'button',
      { name: /Stone Gives Way/i },
      { timeout: LIVE_BACKEND_WAIT_TIMEOUT_MS }
    );

    await waitFor(() => {
      const events = window.__memorySpreadDebug?.events || [];
      expect(events.some((event) => event.label === '/api/fragmentToMemories' && event.stage === 'succeeded')).toBe(true);
    }, { timeout: LIVE_BACKEND_WAIT_TIMEOUT_MS });

    fireEvent.click(selectedMemoryButton);

    await waitFor(() => {
      expect(window.__memorySpreadDebug?.snapshot?.phase).toBe('spread');
    }, { timeout: 5000 });

    await waitFor(() => {
      const events = window.__memorySpreadDebug?.events || [];
      expect(events.some((event) => event.label === '/api/textToEntity' && event.stage === 'succeeded')).toBe(true);
      expect(events.some((event) => event.label === '/api/textToStoryteller' && event.stage === 'succeeded')).toBe(true);
      expect(
        events.some(
          (event) => typeof event.label === 'string' && event.label.startsWith('/api/storytellers?') && event.stage === 'succeeded'
        )
      ).toBe(true);
    }, { timeout: LIVE_BACKEND_WAIT_TIMEOUT_MS });

    const snapshot = window.__memorySpreadDebug?.snapshot || {};
    expect(snapshot.apiBaseUrl).toBe(LIVE_BACKEND_BASE_URL);
    expect(snapshot.forceMock).toBe(true);
    expect(snapshot.memorySource).toBe('mock');
    expect(snapshot.deckSource).toBe('mock');
    expect(snapshot.storytellerSource).toBe('mock');
  }, 90000);

  liveTextMockImagesTest('runs the memory -> entity -> storyteller flow against the live backend with live text and mock PNGs', async () => {
    if (!nativeFetch) {
      throw new Error('Global fetch is unavailable in this test runtime.');
    }

    const observedRequests = [];
    const liveBackendFetch = async (url, options = {}) => {
      const { signal, ...rest } = options || {};
      observedRequests.push({
        url: `${url}`,
        method: rest?.method || 'GET',
        body: typeof rest?.body === 'string' ? rest.body : null
      });
      return nativeFetch(url, rest);
    };
    global.fetch = liveBackendFetch;
    globalThis.fetch = liveBackendFetch;
    window.fetch = liveBackendFetch;

    window.history.replaceState(
      {},
      '',
      `/?view=memory-spread&memoryDebug=1&memoryMockImages=1&memoryApiBaseUrl=${encodeURIComponent(LIVE_BACKEND_BASE_URL)}`
    );

    const { container } = render(<MemorySpreadPage />);

    await waitFor(() => {
      expect(window.__memorySpreadDebug?.snapshot?.memorySource).toBe('hybrid');
    }, { timeout: LIVE_BACKEND_WAIT_TIMEOUT_MS });

    const firstMemoryButton = container.querySelector('.memoryPillarCard');
    expect(firstMemoryButton).toBeTruthy();
    fireEvent.click(firstMemoryButton);

    await waitFor(() => {
      const snapshot = window.__memorySpreadDebug?.snapshot || {};
      expect(snapshot.phase).toBe('spread');
      expect(snapshot.deckSource).toBe('hybrid');
      expect(snapshot.storytellerSource).toBe('hybrid');
    }, { timeout: LIVE_BACKEND_WAIT_TIMEOUT_MS });

    const fragmentRequest = observedRequests.find((request) => request.url.includes('/api/fragmentToMemories'));
    expect(fragmentRequest).toBeTruthy();
    const fragmentBody = JSON.parse(fragmentRequest.body);
    expect(fragmentBody.mockImage).toBe(true);
    expect(fragmentBody.mockTextures).toBe(true);
    expect(fragmentBody.mocked_api_calls).toBeUndefined();

    const entityRequest = observedRequests.find((request) => request.url.includes('/api/textToEntity'));
    expect(entityRequest).toBeTruthy();
    const entityBody = JSON.parse(entityRequest.body);
    expect(entityBody.mockImage).toBe(true);
    expect(entityBody.mockTextures).toBe(true);
    expect(entityBody.mocked_api_calls).toBeUndefined();

    const storytellerRequest = observedRequests.find((request) => request.url.includes('/api/textToStoryteller'));
    expect(storytellerRequest).toBeTruthy();
    const storytellerBody = JSON.parse(storytellerRequest.body);
    expect(storytellerBody.mockImage).toBe(true);
    expect(storytellerBody.mockIllustrations).toBe(true);
    expect(storytellerBody.mocked_api_calls).toBeUndefined();

    const snapshot = window.__memorySpreadDebug?.snapshot || {};
    expect(snapshot.apiBaseUrl).toBe(LIVE_BACKEND_BASE_URL);
    expect(snapshot.forceMock).toBe(false);
    expect(snapshot.forceMockImages).toBe(true);
    expect(snapshot.memorySource).toBe('hybrid');
    expect(snapshot.deckSource).toBe('hybrid');
    expect(snapshot.storytellerSource).toBe('hybrid');
  }, 90000);
});

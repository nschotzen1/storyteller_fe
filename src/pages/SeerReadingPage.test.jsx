import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import MemorySpreadPage from './MemorySpreadPage';

const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;

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

const createReadingPayload = (overrides = {}) => ({
  readingId: 'seer-reading-1',
  sessionId: 'session-seer-1',
  worldId: 'world-ashwind',
  universeId: 'universe-stone-rite',
  status: 'active',
  beat: 'card_attunement',
  transcript: [
    {
      id: 'turn-1',
      role: 'seer',
      content: 'Three cards answer. One burns close enough to speak.'
    }
  ],
  cards: [
    {
      id: 'card-character',
      kind: 'character',
      title: 'Ashward Marrow',
      status: 'front_revealed',
      focusState: 'idle',
      clarity: 0.42,
      confidence: 0.36,
      revealTier: 2,
      back: { mood: ['unease'], motifs: ['ash', 'rope'] },
      front: { summary: 'A watcher who knows this sign already.' },
      linkedEntityIds: []
    },
    {
      id: 'card-location',
      kind: 'location',
      title: 'North-Facing Cairn',
      status: 'sharpening',
      focusState: 'active',
      clarity: 0.34,
      confidence: 0.28,
      revealTier: 1,
      back: { mood: ['warning'], motifs: ['stone', 'wind', 'river'] },
      front: { summary: 'A high place that sees too far.' },
      linkedEntityIds: []
    },
    {
      id: 'card-event',
      kind: 'event',
      title: 'The Sign Is Read',
      status: 'back_only',
      focusState: 'idle',
      clarity: 0.12,
      confidence: 0.1,
      revealTier: 0,
      back: { mood: ['urgency'], motifs: ['rope', 'ash'] },
      front: { summary: 'Recognition arrives before certainty.' },
      linkedEntityIds: []
    }
  ],
  memories: [
    {
      id: 'memory-before',
      temporalSlot: 'before',
      strength: 'durable',
      clarity: 0.32,
      revealTier: 1,
      focusState: 'idle',
      visibleFields: ['whose_eyes', 'location', 'emotional_sentiment'],
      card: {
        title: 'River Haul',
        subtitle: 'A burden dragged below the pass.'
      },
      raw: {
        whose_eyes: 'Maris Kest',
        location: 'River bend under the pass',
        emotional_sentiment: 'determined, tired'
      }
    },
    {
      id: 'memory-during',
      temporalSlot: 'during',
      strength: 'vivid',
      clarity: 0.52,
      revealTier: 2,
      focusState: 'active',
      visibleFields: ['whose_eyes', 'time_of_day', 'location', 'emotional_sentiment'],
      card: {
        title: 'Rope on Cairn',
        subtitle: 'The sign is seen for what it is.'
      },
      raw: {
        whose_eyes: 'Ashward Marrow',
        time_of_day: 'dusk / almost night',
        location: 'North-facing plateau cairn above the serpentine river',
        emotional_sentiment: 'uneasy reverence'
      }
    },
    {
      id: 'memory-after',
      temporalSlot: 'after',
      strength: 'faint',
      clarity: 0.18,
      revealTier: 0,
      focusState: 'idle',
      visibleFields: [],
      card: {
        title: 'Ash Mark Signal',
        subtitle: 'A warning arrives downstream.'
      },
      raw: {}
    }
  ],
  spread: {
    layoutMode: 'seer_vision_cards',
    focusMemoryId: 'memory-during',
    focusCardId: 'card-location',
    cardLayout: [
      { id: 'card-character', kind: 'character', label: 'Ashward Marrow', x: -0.9, y: 0.2 },
      { id: 'card-location', kind: 'location', label: 'North-Facing Cairn', x: 0, y: -0.7 },
      { id: 'card-event', kind: 'event', label: 'The Sign Is Read', x: 0.9, y: 0.2 }
    ],
    nodes: [
      { id: 'fragment-anchor', kind: 'fragment', label: 'Fragment', x: 0, y: 0 },
      { id: 'memory-before', kind: 'memory', label: 'River Haul', temporalSlot: 'before', x: -0.9, y: 0.35 },
      { id: 'memory-during', kind: 'memory', label: 'Rope on Cairn', temporalSlot: 'during', x: 0, y: -0.6 },
      { id: 'memory-after', kind: 'memory', label: 'Ash Mark Signal', temporalSlot: 'after', x: 0.92, y: 0.32 }
    ]
  },
  entities: [
    { id: 'entity-1', name: 'Maris Kest' },
    { id: 'entity-2', name: 'braided rope' }
  ],
  apparitions: [
    { id: 'apparition-1', name: 'Kestrel Vane' }
  ],
  orchestrator: {
    runtimeId: 'seer-agent-runtime-v1',
    pipeline: { useMock: true },
    persona: { id: 'ritual-seer' },
    availableTools: [
      { id: 'reveal_memory_tier' },
      { id: 'propose_relation' }
    ]
  },
  focus: {
    memoryId: 'memory-during',
    cardId: 'card-location',
    entityIds: []
  },
  composer: {
    disabled: false,
    mode: 'short_text',
    prompt: 'What does North-Facing Cairn seem to be or want?',
    suggestions: ['A high place that sees too far.', 'stone', 'wind', 'river'],
    submitLabel: 'Answer',
    focusCardId: 'card-location',
    focusMemoryId: 'memory-during'
  },
  claimedCards: [],
  claimedEntityLinks: [],
  characterSheet: null,
  metadata: {
    cardConfig: {
      generationMode: 'mock_pipeline',
      generatedKinds: ['character', 'location', 'event']
    }
  },
  lastTurn: null,
  ...overrides
});

const createCharacterSheet = (overrides = {}) => ({
  playerId: 'memory-spread-player',
  playerName: 'Test Player',
  identity: {
    name: 'Ashward Marrow',
    archetype: 'North-Facing Cairn',
    occupation: 'Ritual watchkeeper'
  },
  coreTraits: {
    drive: 'Keep the old warnings legible.',
    burden: 'Knows the sign before understanding it.'
  },
  skills: {
    awareness: 20,
    occult: 15
  },
  notes: [
    'location: North-Facing Cairn - A high place that sees too far.'
  ],
  ...overrides
});

describe('SeerReadingPage mode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (nativeFetch) {
      global.fetch = nativeFetch;
    }
    Object.defineProperty(window, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true
    });
    window.localStorage.clear();
    window.history.replaceState({}, '', '/?view=memory-spread&readingId=seer-reading-1');
  });

  test('renders the seer shell as the default memory-spread experience', async () => {
    const payload = createReadingPayload();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload
    }));
    global.fetch = fetchMock;

    render(<MemorySpreadPage />);

    await screen.findByRole('heading', { name: 'Seer Reading' });

    expect(screen.getByText('Seer Voice')).toBeInTheDocument();
    expect(screen.getByText('Reading Cards')).toBeInTheDocument();
    expect(screen.getAllByText('Ashward Marrow').length).toBeGreaterThan(0);
    expect(screen.getAllByText('North-Facing Cairn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('The Sign Is Read').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ashward Marrow').length).toBeGreaterThan(0);
    expect(screen.queryByText('Trace')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/seer/readings/seer-reading-1?playerId=memory-spread-player'),
        expect.objectContaining({})
      );
    });
  });

  test('can bootstrap a reading from a sessionId passed in the URL', async () => {
    window.history.replaceState({}, '', '/?view=memory-spread&sessionId=query-session');
    const payload = createReadingPayload({ readingId: 'seer-reading-query' });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload
    }));
    global.fetch = fetchMock;

    render(<MemorySpreadPage />);

    await screen.findByRole('heading', { name: 'Seer Reading' });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/seer/readings'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"sessionId":"query-session"')
        })
      );
    });
  });

  test('passes mock mode through reading creation and storyteller missions when requested in the URL', async () => {
    window.history.replaceState({}, '', '/?view=memory-spread&sessionId=query-session&seerMock=1');
    const readingPayload = createReadingPayload({
      readingId: 'seer-reading-query',
      claimedCards: [
        {
          cardId: 'card-location',
          title: 'North-Facing Cairn',
          kind: 'location',
          claimedAt: '2026-03-29T00:00:00.000Z',
          entityExternalId: 'entity-ext-north-facing-cairn'
        }
      ],
      claimedEntityLinks: [
        {
          cardId: 'card-location',
          title: 'North-Facing Cairn',
          entityId: 'entity-db-1',
          entityExternalId: 'entity-ext-north-facing-cairn',
          readingId: 'seer-reading-query',
          claimedAt: '2026-03-29T00:00:00.000Z'
        }
      ],
      characterSheet: createCharacterSheet(),
      metadata: {
        demoMockMode: true
      }
    });
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (`${url}`.includes('/api/immersive-rpg/character-sheet')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ characterSheet: createCharacterSheet() })
        };
      }
      if (`${url}`.includes('/api/entities?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            entities: [
              {
                _id: 'entity-db-1',
                externalId: 'entity-ext-north-facing-cairn',
                name: 'North-Facing Cairn',
                type: 'location',
                canonicalStatus: 'claimed',
                reuseCount: 2,
                mediaAssets: [{ kind: 'image' }],
                evidence: [{ kind: 'memory' }],
                sourceReadingIds: ['seer-reading-query'],
                tags: ['watchpoint']
              }
            ]
          })
        };
      }
      if (`${url}`.includes('/api/storytellers?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            storytellers: [
              { id: 'apparition-1', name: 'Kestrel Vane', status: 'active' }
            ]
          })
        };
      }
      if (`${url}`.includes('/api/sendStorytellerToEntity')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            outcome: 'success',
            userText: 'Kestrel Vane returns with a weather omen.',
            gmNote: 'Mock mission completed.',
            subEntities: [],
            runtime: {
              mission: {
                mocked: true
              }
            },
            characterSheet: createCharacterSheet()
          })
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => readingPayload
      };
    });
    global.fetch = fetchMock;

    render(<MemorySpreadPage />);

    await screen.findByRole('heading', { name: 'Seer Reading' });
    expect(screen.getByRole('button', { name: 'Mock Mode' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Instruction'), {
      target: { value: 'Trace what this cairn taught me about storms.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Storyteller' }));

    await screen.findByText('Kestrel Vane returns with a weather omen.');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/seer/readings'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"mock":true')
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendStorytellerToEntity'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"mock":true')
        })
      );
    });
  });

  test('submits a player reply and renders the updated seer turn', async () => {
    const initialPayload = createReadingPayload();
    const updatedPayload = createReadingPayload({
      beat: 'card_attunement',
      transcript: [
        ...initialPayload.transcript,
        {
          id: 'turn-player-2',
          role: 'player',
          content: 'It is a warning place, not a refuge.'
        },
        {
          id: 'turn-seer-2',
          role: 'seer',
          content: 'North-Facing Cairn sharpens. Another edge of it comes into view.'
        }
      ],
      cards: initialPayload.cards.map((card) => (
        card.id === 'card-location'
          ? {
            ...card,
            revealTier: 2,
            clarity: 0.56,
            confidence: 0.39,
            status: 'front_revealed',
            front: {
              ...card.front,
              summary: 'A high watchpoint where recognition becomes fate.'
            }
          }
          : card
      )),
      composer: {
        disabled: false,
        mode: 'tagged_inference',
        prompt: 'Who or what does North-Facing Cairn bind to?',
        suggestions: ['Ashward Marrow', 'braided rope'],
        submitLabel: 'Answer',
        focusCardId: 'card-location',
        focusMemoryId: 'memory-during'
      },
      lastTurn: {
        transitionType: 'card_reveal',
        spokenMessage: 'North-Facing Cairn sharpens. Another edge of it comes into view.',
        focusCardId: 'card-location',
        focusMemoryId: 'memory-during'
      }
    });

    const fetchMock = vi.fn(async (url, options = {}) => {
      if (`${url}`.includes('/api/seer/readings/seer-reading-1/turn')) {
        return {
          ok: true,
          status: 200,
          json: async () => updatedPayload
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => initialPayload
      };
    });
    global.fetch = fetchMock;

    render(<MemorySpreadPage />);

    await screen.findByRole('heading', { name: 'Seer Reading' });

    fireEvent.change(screen.getByLabelText('Player reply'), {
      target: { value: 'It is a warning place, not a refuge.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Answer' }));

    await screen.findByText('North-Facing Cairn sharpens. Another edge of it comes into view.');

    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByLabelText('Player reply')).toHaveValue('');
    expect(screen.getByText('Who or what does North-Facing Cairn bind to?')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/seer/readings/seer-reading-1/turn'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  test('shows the runtime trace when memoryDebug=1', async () => {
    window.history.replaceState({}, '', '/?view=memory-spread&readingId=seer-reading-1&memoryDebug=1');
    const payload = createReadingPayload({
      lastTurn: {
        transitionType: 'reveal',
        spokenMessage: 'The glimpse sharpens. Rope on Cairn yields another layer.',
        focusMemoryId: 'memory-during',
        toolCalls: [
          {
            tool_id: 'reveal_memory_tier',
            reason: 'The focused memory is still incomplete.'
          }
        ]
      }
    });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload
    }));
    global.fetch = fetchMock;

    render(<MemorySpreadPage />);

    await screen.findByRole('heading', { name: 'Seer Reading' });

    expect(screen.getByText('Trace')).toBeInTheDocument();
    expect(screen.getByText('seer-agent-runtime-v1')).toBeInTheDocument();
    expect(screen.getByText('Mock')).toBeInTheDocument();
    expect(screen.getByText('mock_pipeline')).toBeInTheDocument();
    expect(screen.getAllByText('reveal_memory_tier').length).toBeGreaterThan(0);
  });

  test('claims a claimable card and shows it in the sealed set', async () => {
    const initialPayload = createReadingPayload({
      cards: createReadingPayload().cards.map((card) => (
        card.id === 'card-location'
          ? {
            ...card,
            status: 'claimable',
            revealTier: 3,
            clarity: 0.84,
            confidence: 0.78,
            linkedEntityIds: ['entity-1']
          }
          : card
      )),
      composer: {
        disabled: false,
        mode: 'short_text',
        prompt: 'What truth lets you keep North-Facing Cairn?',
        suggestions: ['It is the watchpoint where the warning became fate.'],
        submitLabel: 'Seal',
        focusCardId: 'card-location',
        focusMemoryId: 'memory-during'
      }
    });
    const claimedPayload = createReadingPayload({
      cards: initialPayload.cards.map((card) => (
        card.id === 'card-location'
          ? { ...card, status: 'claimed', focusState: 'resolved', clarity: 1, confidence: 0.9 }
          : card.id === 'card-character'
            ? { ...card, focusState: 'active' }
            : card
      )),
      claimedCards: [
        {
          cardId: 'card-location',
          title: 'North-Facing Cairn',
          kind: 'location',
          claimedAt: '2026-03-29T00:00:00.000Z',
          entityExternalId: 'entity-ext-north-facing-cairn'
        }
      ],
      claimedEntityLinks: [
        {
          cardId: 'card-location',
          title: 'North-Facing Cairn',
          entityId: 'entity-db-1',
          entityExternalId: 'entity-ext-north-facing-cairn',
          readingId: 'seer-reading-1',
          claimedAt: '2026-03-29T00:00:00.000Z'
        }
      ],
      characterSheet: createCharacterSheet(),
      transcript: [
        {
          id: 'turn-1',
          role: 'seer',
          content: 'Three cards answer. One burns close enough to speak.'
        },
        {
          id: 'turn-player-claim',
          role: 'player',
          content: 'I claim North-Facing Cairn.'
        },
        {
          id: 'turn-seer-claim',
          role: 'seer',
          content: 'North-Facing Cairn is yours now. Keep it, and turn next to Ashward Marrow.'
        }
      ],
      focus: {
        memoryId: 'memory-during',
        cardId: 'card-character',
        entityIds: ['entity-1']
      },
      composer: {
        disabled: false,
        mode: 'short_text',
        prompt: 'What truth has Ashward Marrow made legible?',
        suggestions: ['A watcher who knows this sign already.'],
        submitLabel: 'Answer',
        focusCardId: 'card-character',
        focusMemoryId: 'memory-during'
      },
      lastTurn: {
        transitionType: 'card_claimed',
        spokenMessage: 'North-Facing Cairn is yours now. Keep it, and turn next to Ashward Marrow.',
        focusCardId: 'card-character',
        focusMemoryId: 'memory-during',
        toolCalls: [
          {
            tool_id: 'claim_card',
            reason: 'Player sealed a fully revealed card into the reading.'
          }
        ]
      }
    });
    const bankPayload = {
      entities: [
        {
          _id: 'entity-db-1',
          externalId: 'entity-ext-north-facing-cairn',
          name: 'North-Facing Cairn',
          type: 'location',
          canonicalStatus: 'claimed',
          reuseCount: 2,
          mediaAssets: [{ kind: 'image' }],
          evidence: [{ kind: 'memory' }],
          sourceReadingIds: ['seer-reading-1'],
          tags: ['watchpoint', 'ritual']
        }
      ]
    };

    const fetchMock = vi.fn(async (url) => {
      if (`${url}`.includes('/api/immersive-rpg/character-sheet')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ characterSheet: createCharacterSheet() })
        };
      }
      if (`${url}`.includes('/api/entities?')) {
        return {
          ok: true,
          status: 200,
          json: async () => bankPayload
        };
      }
      if (`${url}`.includes('/api/storytellers?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ storytellers: [{ id: 'apparition-1', name: 'Kestrel Vane', status: 'active' }] })
        };
      }
      if (`${url}`.includes('/cards/card-location/claim')) {
        return {
          ok: true,
          status: 200,
          json: async () => claimedPayload
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => initialPayload
      };
    });
    global.fetch = fetchMock;

    render(<MemorySpreadPage />);

    await screen.findByRole('heading', { name: 'Seer Reading' });

    fireEvent.click(screen.getByRole('button', { name: 'Seal and Keep' }));

    await screen.findByText('entity-ext-north-facing-cairn');
    expect(screen.getByText('Claimed Cards')).toBeInTheDocument();
    expect(screen.getAllByText('North-Facing Cairn').length).toBeGreaterThan(0);
    expect(screen.getByText('Canonical Thread')).toBeInTheDocument();
    expect(screen.getByText('entity-ext-north-facing-cairn')).toBeInTheDocument();
    expect(screen.getByText('Character Sheet')).toBeInTheDocument();
    expect(screen.getByText('Keep the old warnings legible.')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/seer/readings/seer-reading-1/cards/card-location/claim'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  test('can deepen a claimed entity and show the mission outcome with updated sheet state', async () => {
    const readingPayload = createReadingPayload({
      claimedCards: [
        {
          cardId: 'card-location',
          title: 'North-Facing Cairn',
          kind: 'location',
          claimedAt: '2026-03-29T00:00:00.000Z',
          entityExternalId: 'entity-ext-north-facing-cairn'
        }
      ],
      claimedEntityLinks: [
        {
          cardId: 'card-location',
          title: 'North-Facing Cairn',
          entityId: 'entity-db-1',
          entityExternalId: 'entity-ext-north-facing-cairn',
          readingId: 'seer-reading-1',
          claimedAt: '2026-03-29T00:00:00.000Z'
        }
      ],
      characterSheet: createCharacterSheet()
    });
    const updatedCharacterSheet = createCharacterSheet({
      coreTraits: {
        drive: 'Keep the old warnings legible.',
        burden: 'The cairn now speaks back through storm and omen.'
      },
      notes: [
        'location: North-Facing Cairn - A high place that sees too far.',
        'mission: The cairn taught Ashward how to read danger in the weather.'
      ]
    });
    const fetchMock = vi.fn(async (url, options = {}) => {
      if (`${url}`.includes('/api/immersive-rpg/character-sheet')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ characterSheet: updatedCharacterSheet })
        };
      }
      if (`${url}`.includes('/api/entities?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            entities: [
              {
                _id: 'entity-db-1',
                externalId: 'entity-ext-north-facing-cairn',
                name: 'North-Facing Cairn',
                type: 'location',
                canonicalStatus: 'claimed',
                reuseCount: 3,
                mediaAssets: [{ kind: 'image' }],
                evidence: [{ kind: 'memory' }, { kind: 'mission' }],
                sourceReadingIds: ['seer-reading-1'],
                tags: ['watchpoint', 'ritual']
              }
            ]
          })
        };
      }
      if (`${url}`.includes('/api/storytellers?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            storytellers: [
              { id: 'apparition-1', name: 'Kestrel Vane', status: 'active' }
            ]
          })
        };
      }
      if (`${url}`.includes('/api/sendStorytellerToEntity')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            outcome: 'success',
            userText: 'Kestrel Vane returns with weather-sense carved into memory.',
            gmNote: 'Push the plateau into a recurring omen later.',
            subEntities: [
              { externalId: 'entity-sub-1', name: 'Storm Psalm' }
            ],
            runtime: {
              mission: {
                mocked: true
              }
            },
            characterSheet: updatedCharacterSheet
          })
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => readingPayload
      };
    });
    global.fetch = fetchMock;

    render(<MemorySpreadPage />);

    await screen.findByText('Deepen This Thread');

    fireEvent.change(screen.getByLabelText('Instruction'), {
      target: { value: 'Trace what this cairn taught me about coming storms.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Storyteller' }));

    await screen.findByText('Kestrel Vane returns with weather-sense carved into memory.');

    expect(screen.getByText('Storm Psalm')).toBeInTheDocument();
    expect(screen.getByText('The cairn now speaks back through storm and omen.')).toBeInTheDocument();
    expect(screen.getByText('mission: The cairn taught Ashward how to read danger in the weather.')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/sendStorytellerToEntity'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"entityId":"entity-ext-north-facing-cairn"')
        })
      );
    });
  });
});

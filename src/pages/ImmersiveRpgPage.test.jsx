import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ImmersiveRpgPage from './ImmersiveRpgPage';
import {
  fetchImmersiveRpgScene,
  rollImmersiveRpg,
  sendImmersiveRpgChat
} from '../api/immersiveRpg';

vi.mock('../api/immersiveRpg', () => ({
  DEFAULT_API_BASE_URL: 'http://localhost:5001',
  fetchImmersiveRpgScene: vi.fn(),
  rollImmersiveRpg: vi.fn(),
  saveImmersiveRpgCharacterSheet: vi.fn(),
  sendImmersiveRpgChat: vi.fn()
}));

const buildSceneEnvelope = (notebook, overrides = {}) => ({
  scene: {
    id: 'scene-1',
    sessionId: 'shared-session-1',
    playerId: 'pc',
    currentSceneKey: 'scene_3_mysterious_encounter',
    sceneTitle: 'Scene 3: The Mysterious Encounter',
    currentBeat: overrides.currentBeat || 'journal_attempt',
    status: 'active',
    sourceSceneBrief: {
      placeName: 'The Lane House',
      placeSummary: 'A narrow lane and a house watched too carefully.'
    },
    transcript: [
      {
        entryId: 'gm-1',
        role: 'gm',
        kind: 'opening',
        text: 'The stranger is still searching. What do you do?',
        createdAt: '2026-03-10T10:00:00.000Z'
      }
    ],
    rollLog: overrides.rollLog || [],
    pendingRoll: overrides.pendingRoll ?? notebook.pendingRoll ?? null,
    notebook,
    stageLayout: overrides.stageLayout || 'focus-left',
    stageModules: overrides.stageModules || [
      {
        moduleId: 'stage-1',
        type: 'illustration',
        variant: 'landscape',
        title: 'Approach to Home',
        caption: 'The lane feels watched.',
        imageUrl: '/assets/mocks/memory_cards/memory_front_01.png',
        altText: 'A watched lane leading home.',
        emphasis: 'primary',
        rotateDeg: -2,
        tone: 'uneasy',
        body: '',
        meta: {}
      },
      {
        moduleId: 'stage-2',
        type: 'evidence_note',
        variant: 'scribble',
        title: 'Keeper Margin',
        caption: 'Pace the dread.',
        imageUrl: '',
        altText: '',
        emphasis: 'secondary',
        rotateDeg: 3,
        tone: 'gaslight',
        body: 'The intrusion should arrive by degrees.',
        meta: {}
      }
    ],
    sceneFlags: {},
    notes: []
  },
  characterSheet: {
    sessionId: 'shared-session-1',
    playerId: 'pc',
    playerName: 'Iris Vale',
    identity: {
      name: 'Iris Vale',
      occupation: 'Illustrator'
    },
    coreTraits: {
      drive: 'Understand who has been studying the house.'
    },
    attributes: {},
    skills: {
      awareness: 55,
      stealth: 40
    },
    inventory: [],
    notes: []
  }
});

describe('ImmersiveRpgPage notebook wiring', () => {
  beforeEach(() => {
    let storageState = {};
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => (key in storageState ? storageState[key] : null),
        setItem: (key, value) => {
          storageState[key] = String(value);
        },
        removeItem: (key) => {
          delete storageState[key];
        },
        clear: () => {
          storageState = {};
        }
      }
    });
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('renders the GM-provided notebook state from the scene payload', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope({
      mode: 'roll_request',
      title: 'Journal Margin Test',
      prompt: 'The journal is within reach, but only for a moment.',
      instruction: 'Roll 5d6 Awareness. Count 5s and 6s as successes.',
      scratchLines: [
        'Failure means the stranger catches the movement.',
        'Success buys only a few seconds with the pages.'
      ],
      focusTags: ['awareness', 'speed', 'concealment'],
      pendingRoll: {
        contextKey: 'journal_retrieval',
        skill: 'awareness',
        label: 'Retrieve the journal unnoticed',
        diceNotation: '5d6',
        difficulty: 'moderate-high',
        successThreshold: 5,
        successesRequired: 2,
        instructions: 'Roll 5d6 Awareness. Count 5s and 6s as successes.'
      },
      diceFaces: [],
      successTrack: {
        successes: 0,
        successesRequired: 2,
        passed: null
      },
      resultSummary: 'Awaiting roll.',
      updatedAt: '2026-03-10T10:00:00.000Z'
    }));

    render(<ImmersiveRpgPage />);

    expect(await screen.findByText('Journal Margin Test')).toBeInTheDocument();
    expect(screen.getByText('The journal is within reach, but only for a moment.')).toBeInTheDocument();
    expect(screen.getByText('Failure means the stranger catches the movement.')).toBeInTheDocument();
    expect(screen.getByText('Approach to Home')).toBeInTheDocument();
    expect(screen.getByText('Keeper Margin')).toBeInTheDocument();
    expect(screen.getAllByText('awareness').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5d6').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Resolve GM Roll/i })).toBeInTheDocument();
    expect(fetchImmersiveRpgScene).toHaveBeenCalledWith('http://localhost:5001', {
      sessionId: 'shared-session-1',
      playerName: 'Iris Vale'
    });
  });

  it('updates the notebook after resolving a mocked roll', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    fetchImmersiveRpgScene.mockResolvedValueOnce(buildSceneEnvelope({
      mode: 'roll_request',
      title: 'Journal Margin Test',
      prompt: 'The journal is within reach, but only for a moment.',
      instruction: 'Roll 5d6 Awareness. Count 5s and 6s as successes.',
      scratchLines: ['Failure means the stranger catches the movement.'],
      focusTags: ['awareness'],
      pendingRoll: {
        contextKey: 'journal_retrieval',
        skill: 'awareness',
        label: 'Retrieve the journal unnoticed',
        diceNotation: '5d6',
        difficulty: 'moderate-high',
        successThreshold: 5,
        successesRequired: 2,
        instructions: 'Roll 5d6 Awareness. Count 5s and 6s as successes.'
      },
      diceFaces: [],
      successTrack: {
        successes: 0,
        successesRequired: 2,
        passed: null
      },
      resultSummary: 'Awaiting roll.',
      updatedAt: '2026-03-10T10:00:00.000Z'
    }));

    rollImmersiveRpg.mockResolvedValue(buildSceneEnvelope({
      mode: 'roll_result',
      title: 'Journal Reached',
      prompt: 'The journal yields its sketches before the stranger notices.',
      instruction: '5d6 Awareness at moderate-high difficulty.',
      scratchLines: ['Then a patient portrait of the PC.'],
      focusTags: ['success', 'journal'],
      pendingRoll: null,
      diceFaces: [6, 5, 2, 1, 4],
      successTrack: {
        successes: 2,
        successesRequired: 2,
        passed: true
      },
      resultSummary: 'Success with 2 successes.',
      updatedAt: '2026-03-10T10:01:00.000Z'
    }, {
      currentBeat: 'journal_glimpse',
      pendingRoll: null,
      rollLog: [
        {
          rollId: 'roll-1',
          contextKey: 'journal_retrieval',
          skill: 'awareness',
          label: 'Retrieve the journal unnoticed',
          diceNotation: '5d6',
          difficulty: 'moderate-high',
          successThreshold: 5,
          successesRequired: 2,
          rolls: [6, 5, 2, 1, 4],
          successes: 2,
          passed: true,
          summary: 'Success with 2 successes.'
        }
      ]
    }));

    render(<ImmersiveRpgPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Resolve GM Roll/i }));

    expect(await screen.findByText('Journal Reached')).toBeInTheDocument();
    expect(screen.getByText('Success with 2 successes.')).toBeInTheDocument();
    await waitFor(() => {
      expect(rollImmersiveRpg).toHaveBeenCalledWith('http://localhost:5001', expect.objectContaining({
        sessionId: 'shared-session-1',
        playerName: 'Iris Vale',
        skill: 'awareness',
        diceNotation: '5d6'
      }));
    });
  });

  it('shows a blocked-state card when required persisted context is missing', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    fetchImmersiveRpgScene.mockResolvedValue({
      ready: false,
      currentSceneNumber: 3,
      currentSceneKey: 'scene_3_mysterious_encounter',
      missingContext: ['messenger_scene_brief'],
      mockedContext: [],
      scene: null,
      characterSheet: null
    });

    render(<ImmersiveRpgPage />);

    expect(await screen.findByText(/Scene Blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing context: messenger_scene_brief/i)).toBeInTheDocument();
  });

  it('shows the shared-session instruction when Story Admin has not set a session', () => {
    render(<ImmersiveRpgPage />);

    expect(screen.getByText(/Set or generate the shared session in Story Admin/i)).toBeInTheDocument();
    expect(fetchImmersiveRpgScene).not.toHaveBeenCalled();
  });

  it('supports switching party speaker and prefixes chat by mode', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));
    sendImmersiveRpgChat.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Party Roster');

    fireEvent.change(screen.getByPlaceholderText('Serin Vale'), { target: { value: 'Bram Ash' } });
    fireEvent.change(screen.getByPlaceholderText('Scout'), { target: { value: 'Scout' } });
    fireEvent.change(screen.getByPlaceholderText('Sees omens before danger turns visible'), { target: { value: 'Tracks movement in the dark' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Seat/i }));

    fireEvent.click(screen.getByRole('button', { name: /Survey details/i }));
    fireEvent.change(screen.getByPlaceholderText(/Speak as Bram Ash/i), { target: { value: 'What scrape marks are fresh here?' } });
    fireEvent.click(screen.getByRole('button', { name: /Send Action/i }));

    await waitFor(() => {
      expect(sendImmersiveRpgChat).toHaveBeenCalledWith('http://localhost:5001', {
        sessionId: 'shared-session-1',
        playerName: 'Bram Ash',
        message: expect.stringContaining('[Survey details: Bram Ash |')
      });
    });
  });

  it('supports proposing and canonizing world lore candidates', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Lore Forge');

    fireEvent.change(screen.getByPlaceholderText(/Propose one world truth/i), {
      target: { value: 'The moonlit canal only opens when two bells ring in sequence.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^Propose$/i }));

    expect(await screen.findByText(/moonlit canal only opens/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Canonize/i }));

    expect(await screen.findByText(/0 pending/i)).toBeInTheDocument();
    expect(await screen.findByText('canon')).toBeInTheDocument();
  });

  it('requires majority seat support before canonizing lore in multiplayer flow', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Lore Forge');

    fireEvent.change(screen.getByPlaceholderText('Serin Vale'), { target: { value: 'Bram Ash' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Seat/i }));
    fireEvent.click(screen.getByRole('button', { name: /Iris Vale Seat 1/i }));

    fireEvent.change(screen.getByPlaceholderText(/Propose one world truth/i), {
      target: { value: 'The moonlit canal only opens when two bells ring in sequence.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^Propose$/i }));

    const candidateEntry = screen.getByText(/moonlit canal only opens/i).closest('article');
    expect(candidateEntry).not.toBeNull();
    const candidateScope = within(candidateEntry);
    const canonizeButton = candidateScope.getByRole('button', { name: /Canonize/i });
    expect(canonizeButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Bram Ash Seat 2/i }));
    fireEvent.click(candidateScope.getByRole('button', { name: /Support/i }));

    expect(candidateScope.getByText(/2\/2 seats backing this truth/i)).toBeInTheDocument();
    const refreshedCanonizeButton = candidateScope.getByRole('button', { name: /Canonize/i });
    expect(refreshedCanonizeButton).not.toBeDisabled();
    fireEvent.click(refreshedCanonizeButton);

    expect(await screen.findByText(/0 pending/i)).toBeInTheDocument();
    expect(await screen.findByText(/Iris Vale, Bram Ash/i)).toBeInTheDocument();
  });

  it('can adopt a lore proposal as the active objective and prime the composer', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Lore Forge');

    fireEvent.change(screen.getByPlaceholderText(/Propose one world truth/i), {
      target: { value: 'Every witness in the lane house heard the clock chime thirteen times.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^Propose$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Adopt As Objective/i }));

    expect(screen.getByDisplayValue('Every witness in the lane house heard the clock chime thirteen times.')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/We anchor the next beat around this shared truth/i)).toBeInTheDocument();
    expect(screen.getByText(/Canon phase|Ready phase|Action phase|Intent phase|Anchor phase/i)).toBeInTheDocument();
  });

  it('supports multiplayer intent consensus and applies it to the composer', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));
    sendImmersiveRpgChat.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Intent Sync');

    fireEvent.change(screen.getByPlaceholderText('Serin Vale'), { target: { value: 'Bram Ash' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Seat/i }));

    fireEvent.click(screen.getByRole('button', { name: /Probe Detail/i }));
    expect(screen.getByText(/Bram Ash: probe/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Iris Vale Lead Primary POV/i }));
    fireEvent.click(screen.getByRole('button', { name: /Probe Detail/i }));
    expect(screen.getByText(/Probe Detail leads/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apply Consensus To Composer/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send Action/i }));

    await waitFor(() => {
      expect(sendImmersiveRpgChat).toHaveBeenCalledWith('http://localhost:5001', expect.objectContaining({
        message: expect.stringContaining('[Survey details: Iris Vale |')
      }));
    });
  });

  it('supports objective ready-check flow and tags chat with objective context', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));
    sendImmersiveRpgChat.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Objective Forge');

    fireEvent.change(screen.getByPlaceholderText('Serin Vale'), { target: { value: 'Bram Ash' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Seat/i }));

    fireEvent.change(screen.getByPlaceholderText('Secure the journal before dawn'), {
      target: { value: 'Secure the journal before dawn' }
    });
    fireEvent.change(screen.getByPlaceholderText('If we fail, the watcher marks the house.'), {
      target: { value: 'If we fail, the watcher marks the house.' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Iris Vale Waiting/i }));
    fireEvent.click(screen.getByRole('button', { name: /Bram Ash Waiting/i }));
    expect(screen.getAllByText('2/2 seats ready').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Advance From Ready Check/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send Action/i }));

    await waitFor(() => {
      expect(sendImmersiveRpgChat).toHaveBeenCalledWith('http://localhost:5001', expect.objectContaining({
        message: expect.stringContaining('Objective: Secure the journal before dawn')
      }));
    });
  });

  it('supports tracking worldbook pins as threads and priming action from a thread', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));
    sendImmersiveRpgChat.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Worldbook Pins');

    fireEvent.click(screen.getByRole('button', { name: /Pin Current Beat/i }));
    fireEvent.click(screen.getByRole('button', { name: /Track As Thread/i }));

    const worldThreadsSection = screen.getByText('World Threads').closest('.immersiveRpgWorldThreads');
    expect(worldThreadsSection).not.toBeNull();
    const threadEntry = within(worldThreadsSection).getByText(/truth: Scene 3: The Mysterious Encounter/i);
    const threadArticle = threadEntry.closest('article');
    expect(threadArticle).not.toBeNull();
    const threadScope = within(threadArticle);

    fireEvent.click(threadScope.getByRole('button', { name: /Advance Thread/i }));
    expect(threadScope.getByText('1/3')).toBeInTheDocument();

    fireEvent.click(threadScope.getByRole('button', { name: /Prime Composer/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send Action/i }));

    await waitFor(() => {
      expect(sendImmersiveRpgChat).toHaveBeenCalledWith('http://localhost:5001', expect.objectContaining({
        message: expect.stringContaining('Thread focus: truth: Scene 3: The Mysterious Encounter')
      }));
    });
  });

  it('supports multiplayer dive ritual handoff into an action send', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));
    sendImmersiveRpgChat.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Dive Ritual');

    fireEvent.change(screen.getByPlaceholderText('Serin Vale'), { target: { value: 'Bram Ash' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Seat/i }));

    fireEvent.change(screen.getByPlaceholderText('Wet stone, bell haze, candle smoke'), {
      target: { value: 'Wet stone, bell haze, candle smoke' }
    });
    fireEvent.change(screen.getByPlaceholderText('The thirteenth chime means the house is listening'), {
      target: { value: 'The thirteenth chime means the house is listening' }
    });

    const commitmentInputs = screen.getAllByPlaceholderText('One line commitment');
    fireEvent.change(commitmentInputs[0], { target: { value: 'I keep eyes on the doorway.' } });
    fireEvent.change(commitmentInputs[1], { target: { value: 'I shadow the bell rope.' } });

    fireEvent.click(screen.getByRole('button', { name: /Start Dive Beat/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send Action/i }));

    await waitFor(() => {
      expect(sendImmersiveRpgChat).toHaveBeenCalledWith('http://localhost:5001', expect.objectContaining({
        message: expect.stringContaining('Dive beat. Ambience: Wet stone, bell haze, candle smoke.')
      }));
    });
  });

  it('supports spotlight lead + assists before priming a multiplayer beat', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));
    sendImmersiveRpgChat.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    await screen.findByText('Spotlight Baton');

    fireEvent.change(screen.getByPlaceholderText('Serin Vale'), { target: { value: 'Bram Ash' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Seat/i }));

    const spotlightPanel = screen.getByText('Spotlight Baton').closest('.immersiveRpgSpotlightRail');
    expect(spotlightPanel).not.toBeNull();
    const spotlightScope = within(spotlightPanel);

    fireEvent.click(spotlightScope.getByRole('button', { name: /Iris Vale/i }));
    fireEvent.change(spotlightScope.getByPlaceholderText('Cross the lane unseen before the watcher turns'), {
      target: { value: 'Slip past the watcher before the lantern turns' }
    });

    const primeButton = spotlightScope.getByRole('button', { name: /Prime Spotlight Beat/i });
    expect(primeButton).toBeDisabled();

    fireEvent.click(spotlightScope.getByRole('button', { name: /Bram Ash Tap to assist/i }));
    expect(primeButton).not.toBeDisabled();
    fireEvent.click(primeButton);

    expect(screen.getByDisplayValue(/Spotlight beat\. Lead: Iris Vale\./i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Send Action/i }));

    await waitFor(() => {
      expect(sendImmersiveRpgChat).toHaveBeenCalledWith('http://localhost:5001', expect.objectContaining({
        message: expect.stringContaining('Spotlight: Iris Vale -> Slip past the watcher before the lantern turns')
      }));
    });
  });

  it('tracks seat presence modes and reflects multiplayer handoff readiness', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);
    await screen.findByText('Presence Sync');

    fireEvent.change(screen.getByPlaceholderText('Serin Vale'), { target: { value: 'Bram Ash' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Seat/i }));

    const presencePanel = screen.getAllByText('Presence Sync').find((node) => node.closest('.immersiveRpgPresenceSync'))?.closest('.immersiveRpgPresenceSync');
    expect(presencePanel).not.toBeNull();
    const presenceScope = within(presencePanel);
    const bramSeat = presenceScope.getByText('Bram Ash').closest('.immersiveRpgPresenceSync__seat');
    expect(bramSeat).not.toBeNull();

    fireEvent.click(within(bramSeat).getByRole('button', { name: 'Away' }));
    expect(presenceScope.getByText(/Away: 1/i)).toBeInTheDocument();
  });

  it('can promote transcript echoes into world threads', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    const echoSection = await screen.findByText('Transcript Echo Seeds');
    const echoScope = within(echoSection.closest('.immersiveRpgTranscriptEchoes'));
    fireEvent.click(echoScope.getByRole('button', { name: /Track Thread/i }));

    const worldThreadsSection = screen.getByText('World Threads').closest('.immersiveRpgWorldThreads');
    expect(worldThreadsSection).not.toBeNull();
    expect(within(worldThreadsSection).getByText(/The stranger is still searching\./i)).toBeInTheDocument();
  });

  it('primes an immersive scene pact into the composer when anchor, tone, and role coverage are set', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');
    window.localStorage.setItem('immersiveRpgObjectiveState', JSON.stringify({
      title: 'Hold the lantern line',
      stakes: 'If the line breaks, the watcher sees us.',
      progress: 1,
      maxProgress: 4
    }));

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);

    const scenePactTitle = await screen.findByText('Scene Pact');
    const scenePactPanel = scenePactTitle.closest('.immersiveRpgScenePact');
    expect(scenePactPanel).not.toBeNull();
    const scenePactScope = within(scenePactPanel);

    fireEvent.click(scenePactScope.getByRole('button', { name: /Objective: Hold the lantern line/i }));
    fireEvent.change(scenePactScope.getByPlaceholderText('hushed urgency'), { target: { value: 'hushed urgency' } });
    fireEvent.click(scenePactScope.getByRole('button', { name: 'Scout' }));
    fireEvent.click(scenePactScope.getByRole('button', { name: /Prime Scene Pact/i }));

    expect(screen.getByDisplayValue(/Scene pact\. Anchor: Hold the lantern line\./i)).toBeInTheDocument();
  });

  it('bridges world thread lore into multiplayer action through world weave', async () => {
    window.localStorage.setItem('typewriterAdminApiBaseUrl', 'http://localhost:5001');
    window.localStorage.setItem('sessionId', 'shared-session-1');
    window.localStorage.setItem('immersiveRpgPlayerName', 'Iris Vale');

    const freeformNotebook = {
      mode: 'story',
      title: 'Shared Table',
      prompt: 'Multiple voices are available.',
      instruction: '',
      scratchLines: [],
      focusTags: [],
      pendingRoll: null,
      diceFaces: [],
      successTrack: null,
      resultSummary: 'Standing by.'
    };
    fetchImmersiveRpgScene.mockResolvedValue(buildSceneEnvelope(freeformNotebook));
    sendImmersiveRpgChat.mockResolvedValue(buildSceneEnvelope(freeformNotebook));

    render(<ImmersiveRpgPage />);
    await screen.findByText('World Weave');

    fireEvent.click(screen.getByRole('button', { name: /Pin Current Beat/i }));
    fireEvent.click(screen.getByRole('button', { name: /Track As Thread/i }));
    fireEvent.change(screen.getByPlaceholderText('Serin Vale'), { target: { value: 'Bram Ash' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Seat/i }));

    const worldWeavePanel = screen.getByText('World Weave').closest('.immersiveRpgWorldWeave');
    expect(worldWeavePanel).not.toBeNull();
    const worldWeaveScope = within(worldWeavePanel);

    fireEvent.click(worldWeaveScope.getByRole('button', { name: /truth: Scene 3: The Mysterious Encounter/i }));

    const echoInputs = worldWeaveScope.getAllByPlaceholderText('One sensory line that roots this thread');
    fireEvent.change(echoInputs[0], { target: { value: 'Lantern oil stings the air by the gate.' } });
    fireEvent.change(echoInputs[1], { target: { value: 'Footsteps skip every third stone in the lane.' } });

    const primeButton = worldWeaveScope.getByRole('button', { name: /Prime World Weave/i });
    expect(primeButton).not.toBeDisabled();
    fireEvent.click(primeButton);

    expect(screen.getByDisplayValue(/World weave\. Thread:/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Send Action/i }));

    await waitFor(() => {
      expect(sendImmersiveRpgChat).toHaveBeenCalledWith('http://localhost:5001', expect.objectContaining({
        message: expect.stringContaining('World weave. Thread:')
      }));
    });
  });
});

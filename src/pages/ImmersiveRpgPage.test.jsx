import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImmersiveRpgPage from './ImmersiveRpgPage';
import {
  fetchImmersiveRpgScene,
  rollImmersiveRpg
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
});

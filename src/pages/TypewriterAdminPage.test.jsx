import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as typewriterAdminApi from '../api/typewriterAdmin';
import TypewriterAdminPage from './TypewriterAdminPage';

vi.mock('../api/typewriterAdmin', () => ({
  DEFAULT_API_BASE_URL: 'http://localhost:5001',
  loadLlmRouteConfigs: vi.fn(async () => ({
    storyteller_typewriter_intervention: {
      routeKey: 'storyteller_typewriter_intervention',
      routePath: '/api/send_storyteller_typewriter_text',
      method: 'POST',
      description: 'Structured continuation contract',
      promptMode: 'contract',
      promptTemplate: '',
      promptCore: 'Return storyteller intervention JSON.',
      responseSchema: {
        type: 'object',
        required: ['continuation'],
        properties: {
          continuation: { type: 'string' }
        }
      },
      fieldDocs: {
        continuation: 'Write the next fragment.'
      },
      examplePayload: {
        continuation: 'A figure stepped from between the keys.'
      },
      outputRules: ['Return JSON only.'],
      version: 3,
      updatedAt: '2026-03-24T10:00:00.000Z'
    }
  })),
  loadLlmRouteConfigVersions: vi.fn(async () => ({ versions: [] })),
  loadOpenAiModels: vi.fn(async () => ({
    textModels: [{ id: 'gpt-4.1-mini' }, { id: 'gpt-4.1' }],
    imageModels: [{ id: 'gpt-image-1' }],
    source: 'mock',
    fetchedAt: '2026-03-24T10:00:00.000Z',
    providers: {
      openai: {
        textModels: [{ id: 'gpt-4.1-mini' }, { id: 'gpt-4.1' }],
        imageModels: [{ id: 'gpt-image-1' }]
      },
      anthropic: {
        textModels: [{ id: 'claude-sonnet-4-6' }]
      }
    }
  })),
  loadTypewriterAiSettings: vi.fn(async () => ({
    updatedAt: '2026-03-24T10:00:00.000Z',
    updatedBy: 'test',
    pipelines: {
      story_continuation: {
        useMock: false,
        model: 'gpt-4.1-mini',
        provider: 'openai'
      },
      xerofag_inspection: {
        useMock: true,
        model: 'gpt-4.1-mini',
        provider: 'openai'
      },
      storyteller_intervention: {
        useMock: false,
        model: 'claude-sonnet-4-6',
        provider: 'anthropic'
      },
      typewriter_key_verification: {
        useMock: false,
        model: 'gpt-4.1-mini',
        provider: 'openai'
      },
      storyteller_creation: {
        useMock: false,
        model: 'gpt-4.1-mini',
        provider: 'openai',
        storytellerCount: 4
      },
      illustration_creation: {
        useMock: true,
        model: 'gpt-image-1',
        provider: 'openai'
      }
    }
  })),
  loadTypewriterPrompts: vi.fn(async () => ({
    pipelines: {
      story_continuation: {
        promptTemplate: 'Continue the page from the active fragment.',
        version: 4,
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      xerofag_inspection: {
        promptTemplate: 'Decide whether Xerofag should appear.',
        version: 2,
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      storyteller_intervention: {
        promptTemplate: 'Legacy synced storyteller intervention prompt.',
        version: 1,
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      storyteller_key_creation: {
        promptTemplate: 'Render the storyteller key.',
        version: 1,
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      illustration_creation: {
        promptTemplate: 'Render the storyteller portrait.',
        version: 1,
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      typewriter_key_verification: {
        promptTemplate: 'Judge whether the textual key may enter the page.',
        version: 1,
        updatedAt: '2026-03-24T10:00:00.000Z'
      }
    }
  })),
  loadTypewriterPromptVersions: vi.fn(async () => ({ versions: [] })),
  resetLlmRouteConfig: vi.fn(),
  resetTypewriterAiSettings: vi.fn(),
  saveLlmRouteConfigVersion: vi.fn(),
  saveTypewriterAiSettings: vi.fn(),
  saveTypewriterPrompt: vi.fn(),
  seedCurrentTypewriterPrompts: vi.fn(),
  setLatestLlmRouteConfigVersion: vi.fn(),
  setLatestTypewriterPromptVersion: vi.fn(),
  startOrSeedTypewriterSession: vi.fn(async () => ({ sessionId: 'session-test' })),
  inspectTypewriterSession: vi.fn(async () => ({
    sessionId: 'session-test',
    fragment: 'A dim salt wind crossed the watchtower balcony.',
    initialFragment: 'A dim salt wind crossed the watchtower balcony.',
    narrativeWordCount: 9,
    slots: [],
    typewriterKeys: [],
    entityKeys: [],
    storytellers: [],
    entities: [],
    counts: {
      storytellerCount: 0,
      slotFilledCount: 0,
      typewriterKeyCount: 0,
      entityCount: 0
    }
  })),
  loadTypewriterStorytellerPolicy: vi.fn(async () => ({
    checkIntervalWords: 5,
    policy: {
      version: 1,
      keyEmergence: {
        checkIntervalWords: 5,
        wordThresholds: [30, 50, 100]
      },
      progression: {
        mode: 'per_storyteller',
        repressGrowthFactor: 1.1,
        stages: [
          {
            id: 'signature',
            label: 'Signature Entry',
            pressNumber: 1,
            proximity: 'distant',
            narrativeAuthority: 'additive',
            firstPersonAllowed: false,
            currentSceneInterventionAllowed: false,
            outputWordMin: 45,
            outputWordMax: 80,
            instruction: 'Let the storyteller join as a style and sensibility.'
          },
          {
            id: 'intervention',
            label: 'Current Intervention',
            pressNumber: 4,
            proximity: 'present',
            narrativeAuthority: 'interventionist',
            firstPersonAllowed: true,
            currentSceneInterventionAllowed: true,
            outputWordMin: 65,
            outputWordMax: 105,
            instruction: 'Let the storyteller interrupt the current scene.'
          }
        ]
      },
      substanceBudget: {
        maxNewEntities: 1,
        minReusedEntities: 1,
        requireConcreteNaming: true,
        allowNewPlace: true,
        allowNewPerson: true,
        allowNewItem: true,
        allowMajorPlotChange: false
      },
      archetypes: [
        {
          id: 'cartographer',
          label: 'The Cartographer',
          style: 'precise, spatial, archival',
          narrativeRole: 'maps routes, borders, thresholds, and forgotten jurisdictions',
          substanceBias: ['places', 'routes'],
          interventionStyle: 'reveals a hidden spatial relation'
        }
      ]
    }
  })),
  saveTypewriterStorytellerPolicy: vi.fn(async (_baseUrl, policy) => ({
    checkIntervalWords: policy?.keyEmergence?.checkIntervalWords || 5,
    policy
  })),
  previewTypewriterStorytellerPrompt: vi.fn(async () => ({
    sessionId: 'session-test',
    fragmentText: 'A dim salt wind crossed the watchtower balcony.',
    fragmentSource: 'override',
    storyteller: {
      id: 'storyteller-1',
      name: 'Ashward Marrow'
    },
    pressPolicy: {
      stageId: 'signature',
      stageLabel: 'Signature Entry',
      pressNumber: 1,
      firstPersonAllowed: false,
      currentSceneInterventionAllowed: false,
      archetype: {
        id: 'cartographer',
        label: 'The Cartographer'
      }
    },
    runtime: {
      pipeline: 'storyteller_intervention',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      mocked: true
    },
    prompt: {
      systemPrompt: 'COMPOSED SYSTEM PROMPT\nStage: Signature Entry',
      userPayload: {
        storyteller_stage_label: 'Signature Entry',
        storyteller_first_person_allowed: 'false'
      },
      messages: [
        { role: 'system', content: 'COMPOSED SYSTEM PROMPT\nStage: Signature Entry' },
        { role: 'user', content: '{"storyteller_stage_label":"Signature Entry"}' }
      ]
    }
  })),
  createTypewriterStorytellerKey: vi.fn(async () => ({
    sessionId: 'session-test',
    created: true,
    createdStoryteller: {
      id: 'storyteller-1',
      name: 'Ashward Marrow',
      keySlotIndex: 0,
      archetype: {
        id: 'cartographer',
        label: 'The Cartographer'
      }
    },
    slots: [
      {
        slotIndex: 0,
        filled: true,
        storytellerId: 'storyteller-1',
        storytellerName: 'Ashward Marrow',
        archetype: {
          id: 'cartographer',
          label: 'The Cartographer'
        },
        pressPolicy: {
          stageLabel: 'Signature Entry'
        }
      }
    ]
  })),
  triggerTypewriterStorytellerIntervention: vi.fn(async () => ({
    sessionId: 'session-test',
    writing_sequence: [
      {
        text: 'Ashward Marrow noticed the salt-dark hinge and named the Buraha Bell.'
      }
    ],
    storytellerPressPolicy: {
      stageLabel: 'Signature Entry'
    }
  }))
}));

describe('TypewriterAdminPage control center', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    window.localStorage.clear();
    window.__TYPEWRITER_ADMIN_NAVIGATE__ = undefined;
  });

  it('can seed a typewriter session fragment from the session tools', async () => {
    render(<TypewriterAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Component Control Center')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Session Bootstrap'));
    fireEvent.click(screen.getByRole('button', { name: 'Generate session + fragment' }));

    await waitFor(() => {
      expect(typewriterAdminApi.startOrSeedTypewriterSession).toHaveBeenCalledWith(
        'http://localhost:5001',
        expect.objectContaining({
          fragment: expect.any(String),
          setInitialFragment: true
        })
      );
    });

    expect(window.localStorage.getItem('sessionId')).toBe('session-test');
    expect(screen.getByText('Generated session session-test and saved the fragment to Mongo.')).toBeInTheDocument();
  });

  it('renders flow-ordered route cards and swaps the prompt workspace to the selected route', async () => {
    render(<TypewriterAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Component Control Center')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Current stored session')).not.toBeVisible();
    fireEvent.click(screen.getByText('Session Bootstrap'));
    expect(screen.getByLabelText('Current stored session')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Typewriter' }));

    expect(screen.getByText('Session hydration')).not.toBeVisible();
    fireEvent.click(screen.getByText('Typewriter Asset Flow'));
    expect(screen.getByText('Session hydration')).toBeVisible();

    expect(screen.getByText('Flow At A Glance')).toBeInTheDocument();
    expect(screen.getByText(/Story continuation -> Textual key verification/i)).toBeInTheDocument();
    expect(screen.getByText('Available Routes')).toBeInTheDocument();
    expect(screen.getByText('Saved textual typewriter keys')).toBeInTheDocument();

    expect(screen.getByText('Core loop')).toBeInTheDocument();
    expect(screen.getByText('Guards')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Story continuation' })).toBeInTheDocument();
    expect(screen.getByText('Runtime summary')).toBeInTheDocument();
    expect(screen.queryByText('Runtime mode and models')).not.toBeInTheDocument();
    expect(screen.getByText('Direct prompt templates')).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole('table', { name: /Typewriter route summary/i }))
        .getByRole('button', { name: /Storyteller intervention/i })
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Storyteller intervention' })).toBeInTheDocument();
    });

    expect(screen.getByText('Schemas and generated prompts')).toBeInTheDocument();
    expect(screen.getByText('Structured continuation contract')).toBeInTheDocument();
  });

  it('saves quick runtime edits from the route summary table', async () => {
    render(<TypewriterAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Component Control Center')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Typewriter' }));

    const routeSummaryTable = screen.getByRole('table', { name: /Typewriter route summary/i });
    const storyContinuationMockToggle = within(routeSummaryTable).getByRole('checkbox', {
      name: /Story continuation Story continuation mock toggle/i
    });

    expect(storyContinuationMockToggle).not.toBeChecked();
    fireEvent.click(storyContinuationMockToggle);
    expect(storyContinuationMockToggle).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Save Quick Runtime Edits' }));

    await waitFor(() => {
      expect(typewriterAdminApi.saveTypewriterAiSettings).toHaveBeenCalledWith(
        'http://localhost:5001',
        expect.objectContaining({
          pipelines: expect.objectContaining({
            story_continuation: expect.objectContaining({
              useMock: true,
              model: 'gpt-4.1-mini',
              provider: 'openai'
            })
          })
        }),
        {
          adminKey: '',
          updatedBy: 'story-admin-control-overview'
        }
      );
    });
  });

  it('renders and saves the storyteller progression policy in the runtime control room', async () => {
    render(<TypewriterAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Component Control Center')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Runtime' }));

    expect(screen.getByText('Typewriter Control Room')).toBeInTheDocument();
    expect(screen.getByText('Storyteller Emergence')).toBeInTheDocument();
    expect(screen.getByText('Signature Entry')).toBeInTheDocument();
    expect(screen.getAllByText('The Cartographer').length).toBeGreaterThan(0);
    expect(screen.getByText(/Thresholds: 30, 50, 100/)).toBeInTheDocument();

    const policyDraft = screen.getByLabelText('Storyteller policy JSON');
    const nextPolicy = JSON.parse(policyDraft.value);
    nextPolicy.keyEmergence.wordThresholds = [25, 60, 120];
    nextPolicy.progression.repressGrowthFactor = 1.25;

    fireEvent.change(policyDraft, {
      target: {
        value: JSON.stringify(nextPolicy, null, 2)
      }
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save Storyteller Policy' })[0]);

    await waitFor(() => {
      expect(typewriterAdminApi.saveTypewriterStorytellerPolicy).toHaveBeenCalledWith(
        'http://localhost:5001',
        expect.objectContaining({
          keyEmergence: expect.objectContaining({
            wordThresholds: [25, 60, 120]
          }),
          progression: expect.objectContaining({
            repressGrowthFactor: 1.25
          })
        }),
        {
          adminKey: '',
          updatedBy: 'story-admin-ui'
        }
      );
    });
    expect(screen.getByText('Saved storyteller progression policy.')).toBeInTheDocument();
  });

  it('previews the composed storyteller prompt and can trigger playground routes', async () => {
    render(<TypewriterAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Component Control Center')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Runtime' }));

    expect(screen.getByText('Prompt Playground')).toBeInTheDocument();
    expect(screen.getByText('Set the scene')).toBeInTheDocument();
    expect(screen.getByText('Choose a storyteller')).toBeInTheDocument();
    expect(screen.getByText('Selected Storyteller')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '3 Preview Prompt' }));

    await waitFor(() => {
      expect(typewriterAdminApi.previewTypewriterStorytellerPrompt).toHaveBeenCalledWith(
        'http://localhost:5001',
        expect.objectContaining({
          sessionId: 'session-test',
          slotIndex: 0,
          currentNarrative: expect.any(String),
          mocked_api_calls: true
        }),
        { adminKey: '' }
      );
    });

    expect(screen.getByText('Resolved Stage')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/COMPOSED SYSTEM PROMPT/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2 Create Storyteller Key' }));
    await waitFor(() => {
      expect(typewriterAdminApi.createTypewriterStorytellerKey).toHaveBeenCalledWith(
        'http://localhost:5001',
        expect.objectContaining({
          sessionId: 'session-test',
          mocked_api_calls: true
        }),
        { adminKey: '' }
      );
    });
    expect(screen.getAllByText('Ashward Marrow').length).toBeGreaterThan(0);
    expect(screen.getAllByText('The Cartographer').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '4 Press Storyteller For Real' }));
    await waitFor(() => {
      expect(typewriterAdminApi.triggerTypewriterStorytellerIntervention).toHaveBeenCalledWith(
        'http://localhost:5001',
        expect.objectContaining({
          sessionId: 'session-test',
          storytellerId: 'storyteller-1',
          mocked_api_calls: true
        }),
        { adminKey: '' }
      );
    });
    expect(screen.getAllByText(/Ashward Marrow noticed/).length).toBeGreaterThan(0);
  });

  it('loads the session inspector and shows internal truth versus player-facing key knowledge', async () => {
    window.localStorage.setItem('sessionId', 'session-stored');
    vi.mocked(typewriterAdminApi.inspectTypewriterSession).mockResolvedValueOnce({
      sessionId: 'session-stored',
      fragment: 'The watchman saw blue lights hovering above the Buraha sea.',
      initialFragment: 'The watchman saw blue lights hovering above the Buraha sea.',
      narrativeWordCount: 10,
      slots: [
        {
          slotIndex: 1,
          slotKey: 'storyteller_slot_1',
          keyShape: 'horizontal',
          blankTextureUrl: '/textures/keys/blank_horizontal_1.png',
          blankShape: 'horizontal',
          filled: true,
          storytellerId: 'storyteller-1',
          storytellerName: 'Ashward Marrow',
          keyImageUrl: '/textures/keys/storyteller_ashward.png',
          symbol: 'salt eye',
          description: 'A weathered enamel eye with salt-laced cracks.'
        }
      ],
      typewriterKeys: [
        {
          id: 'key-xerofag',
          entityId: 'entity-xerofag',
          entityName: 'The Xerofag',
          keyText: 'THE XEROFAG',
          insertText: 'The Xerofag',
          description: 'Ancient carrion lore not yet discovered by the player.',
          sourceType: 'builtin',
          sourceRoute: '/api/shouldAllowXerofag',
          storytellerId: '',
          storytellerName: '',
          knowledgeState: 'hidden',
          playerFacingTooltip: '',
          keyImageUrl: '/textures/keys/THE_XEROFAG_1.png',
          verificationKind: 'typewriter_key_verification',
          timesPressed: 0,
          lastPressedAt: null
        },
        {
          id: 'key-bell',
          entityId: 'entity-bell',
          entityName: 'Buraha Storm-Bell',
          keyText: 'Storm Bell',
          insertText: 'Storm Bell',
          description: 'An iron bell that sounds only before drowned arrivals.',
          sourceType: 'storyteller_intervention',
          sourceRoute: '/api/send_storyteller_typewriter_text',
          storytellerId: 'storyteller-1',
          storytellerName: 'Ashward Marrow',
          knowledgeState: 'named',
          playerFacingTooltip: 'A storm bell Ashward recognized from older wreck songs.',
          keyImageUrl: '',
          verificationKind: 'typewriter_key_verification',
          timesPressed: 1,
          lastPressedAt: '2026-03-25T10:00:00.000Z'
        }
      ],
      entityKeys: [],
      storytellers: [
        {
          id: 'storyteller-1',
          name: 'Ashward Marrow',
          status: 'active',
          level: 8,
          keyImageUrl: '/textures/keys/storyteller_ashward.png',
          keySlotIndex: 1,
          introducedInTypewriter: true,
          typewriterInterventionsCount: 1,
          lastTypewriterInterventionAt: '2026-03-25T10:00:00.000Z',
          symbol: 'salt eye',
          description: 'A weathered enamel eye with salt-laced cracks.'
        }
      ],
      entities: [
        {
          id: 'entity-bell',
          name: 'Buraha Storm-Bell',
          description: 'An iron bell that sounds only before drowned arrivals.',
          lore: 'It is said to ring inland when a ship is claimed without witnesses.',
          type: 'item',
          subtype: 'ritual alarm',
          tags: ['sea', 'warning'],
          source: 'storyteller_intervention',
          typewriterKeyText: 'Storm Bell',
          introducedByStorytellerId: 'storyteller-1',
          introducedByStorytellerName: 'Ashward Marrow'
        }
      ],
      counts: {
        storytellerCount: 1,
        slotFilledCount: 1,
        typewriterKeyCount: 2,
        entityCount: 1
      }
    });

    render(<TypewriterAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Story Admin')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Inspect session' }));

    await waitFor(() => {
      expect(typewriterAdminApi.inspectTypewriterSession).toHaveBeenCalledWith('http://localhost:5001', {
        sessionId: 'session-stored',
        adminKey: ''
      });
    });

    expect(screen.getByText('Typewriter Session Inspector')).toBeInTheDocument();
    expect(screen.getByText('THE XEROFAG')).toBeInTheDocument();
    expect(screen.getByText('Hidden until discovered.')).toBeInTheDocument();
    expect(screen.getAllByText('Ashward Marrow').length).toBeGreaterThan(0);
    expect(screen.getByText('Buraha Storm-Bell')).toBeInTheDocument();
    expect(screen.getByText(/NarrativeEntity/)).toBeInTheDocument();
  });
});

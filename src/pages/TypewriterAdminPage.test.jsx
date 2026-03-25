import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TypewriterAdminPage from './TypewriterAdminPage';

vi.mock('../components/well/WellAdminWorkspace', () => ({
  default: () => <div data-testid="well-admin-workspace">Well admin workspace</div>
}));

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
      memory_creation: {
        useMock: false,
        model: 'gpt-4.1-mini',
        provider: 'openai',
        memoryCount: 3
      },
      texture_creation: {
        useMock: true,
        model: 'gpt-image-1',
        provider: 'openai'
      },
      entity_creation: {
        useMock: false,
        model: 'gpt-4.1-mini',
        provider: 'openai',
        entityCount: 8
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
      memory_card_front: {
        promptTemplate: 'Paint the front of the memory card.',
        version: 1,
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      memory_card_back: {
        promptTemplate: 'Paint the back of the memory card.',
        version: 1,
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      entity_creation: {
        promptTemplate: 'Extract entities from the fragment.',
        version: 1,
        updatedAt: '2026-03-24T10:00:00.000Z'
      },
      texture_creation: {
        promptTemplate: 'Render the entity back texture.',
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
  startOrSeedTypewriterSession: vi.fn(async () => ({ sessionId: 'session-test' }))
}));

describe('TypewriterAdminPage control center', () => {
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
    window.localStorage.clear();
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

    expect(screen.getByText('Core loop')).toBeInTheDocument();
    expect(screen.getByText('Guards')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Story continuation' })).toBeInTheDocument();
    expect(screen.getByText('Direct prompt templates')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Storyteller intervention/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save Storyteller intervention' })).toBeInTheDocument();
    });

    expect(screen.getByText('Schemas and generated prompts')).toBeInTheDocument();
    expect(screen.getByText('Structured continuation contract')).toBeInTheDocument();
  });

  it('shows when a selected route shares its runtime pipeline with other routes', async () => {
    render(<TypewriterAdminPage />);

    await waitFor(() => {
      expect(screen.getByText('Component Control Center')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Memory Spread' }));
    fireEvent.click(screen.getByRole('button', { name: /Memory card front image/i }));

    await waitFor(() => {
      expect(screen.getByText(/Shared pipeline\. Changes also affect/i)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import StorytellerArenaConsole from './StorytellerArenaConsole';

// Mock dependencies
// We mock the API modules to control responses and simulate server state
vi.mock('../../api/storytellerSession', () => ({
    fetchSessionPlayers: vi.fn(),
    registerPlayer: vi.fn(),
}));

vi.mock('../../api/arenaRelationships.api', () => ({
    validateRelationship: vi.fn(),
    proposeRelationship: vi.fn(),
    fetchArenaState: vi.fn(),
}));

// Import mocks to configure them in tests
import { fetchSessionPlayers } from '../../api/storytellerSession';
import { validateRelationship, proposeRelationship, fetchArenaState } from '../../api/arenaRelationships.api';

describe('StorytellerArenaConsole Integration - 2 Players & Relationships', () => {
    let mockServerState;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset simulated server state
        mockServerState = {
            sessionId: 'test-session-multi',
            players: {
                'player-1': { id: 'player-1', name: 'Alice', deck: [] },
                'player-2': { id: 'player-2', name: 'Bob', deck: [] }
            },
            arena: {
                center: [], // { slotId, cardInstanceId, ownerPlayerId }
                edges: { south: [] },
                cardDefinitions: {},
                cardInstances: {},
                graphEdges: []
            }
        };

        // Setup default API mocks
        setupDefaultMocks();

        // Mock global fetch for internally handled requests (textToEntity etc)
        global.fetch = vi.fn((url, options) => handleFetch(url, options));
    });

    const setupDefaultMocks = () => {
        // 1. fetchSessionPlayers
        fetchSessionPlayers.mockImplementation(async (baseUrl, sessionId) => {
            return {
                players: Object.values(mockServerState.players).map(p => ({ playerId: p.id, playerName: p.name }))
            };
        });

        // 2. fetchArenaState
        fetchArenaState.mockImplementation(async (sessionId, playerId) => {
            return {
                sessionId,
                playerId,
                arena: { ...mockServerState.arena },
                edges: mockServerState.arena.graphEdges,
                scores: {}
            };
        });

        // 3. validateRelationship
        validateRelationship.mockResolvedValue({
            verdict: 'accepted',
            quality: { score: 0.9, reasons: ['Valid test connection'] },
            message: 'Relationship valid'
        });

        // 4. proposeRelationship
        proposeRelationship.mockImplementation(async (payload) => {
            const { source, targets, relationship } = payload;
            const newEdge = {
                edgeId: `edge-${Date.now()}`,
                sourceId: source.cardId,
                targetId: targets[0].cardId, // Assuming single target for now
                surfaceText: relationship.surfaceText,
                sourcePlayerId: payload.playerId
            };

            // Update server state
            mockServerState.arena.graphEdges.push(newEdge);

            return {
                verdict: 'accepted',
                edge: newEdge,
                points: { awarded: 10 }
            };
        });
    };

    const handleFetch = async (url, options) => {
        // Handle /api/textToEntity
        if (url.includes('/api/textToEntity')) {
            const body = JSON.parse(options.body);
            const newCards = [
                { entityId: `ent-${Date.now()}`, name: 'Test Entity', imageUrl: 'test.png' }
            ];
            return {
                ok: true,
                json: async () => ({ cards: newCards })
            };
        }

        // Handle /api/sessions/.../arena (Save/Load/Sync via requestJson inside component)
        if (url.includes('/api/sessions') && url.includes('/arena')) {
            if (options?.method === 'POST') {
                // Save Arena
                const body = JSON.parse(options.body);
                // Update mock server state with payload
                if (body.arena) {
                    // Simplified merge
                    mockServerState.arena.center = body.arena.center || [];
                    mockServerState.arena.edges = body.arena.edges || {};
                    mockServerState.arena.cardDefinitions = { ...mockServerState.arena.cardDefinitions, ...body.arena.cardDefinitions };
                    mockServerState.arena.cardInstances = { ...mockServerState.arena.cardInstances, ...body.arena.cardInstances };
                }
                return { ok: true, json: async () => ({ arena: mockServerState.arena }) };
            } else {
                // GET Arena (Load/Sync)
                return { ok: true, json: async () => ({ arena: mockServerState.arena }) };
            }
        }

        // Default fallback
        return { ok: true, json: async () => ({}) };
    };

    test('Two players can sync arena, see each others cards, and form a relationship', async () => {
        // --- Step 1: Render Player 1's View ---
        const { container, getByText, getByLabelText, findByText, getAllByText } = render(
            <StorytellerArenaConsole
                initialSessionId="test-session-multi"
                initialPlayerName="Alice"
                initialPlayerId="player-1"
            />
        );

        // Increase timeout for async operations
        const longTimeout = { timeout: 3000 };

        // Wait for initial load
        await waitFor(() => expect(screen.getByDisplayValue('Alice')).toBeInTheDocument());

        // --- Step 2: Player 1 Generates & Places an Entity ---
        // Generate
        fireEvent.click(screen.getByText('Generate Entities'));
        await waitFor(() => expect(screen.getByText('Test Entity')).toBeInTheDocument(), longTimeout);

        // Draw to Spread (simulate "Draw All")
        fireEvent.click(screen.getByText('Draw All'));

        // Select the card in spread (it might be in slot-0)
        // We need to find the card in the spread. It renders ArenaCard.
        const spreadSlot = container.querySelector('.consoleSpreadSlot.filled');
        expect(spreadSlot).toBeInTheDocument();

        // Click to select
        const cardInSpread = within(spreadSlot).getByRole('button', { hidden: true }); // ArenaCard usually has a button role or click handler
        fireEvent.click(cardInSpread);

        // Place to Center
        fireEvent.click(screen.getByText('Place to Center'));

        // Save Arena (to push to "server")
        fireEvent.click(screen.getByText('Save Arena'));
        await findByText('Arena saved.');

        // Verify server state has P1's card
        const centerSlots = mockServerState.arena.center.filter(s => s.cardInstanceId);
        expect(centerSlots.length).toBe(1);
        const p1InstanceId = centerSlots[0].cardInstanceId;

        // --- Step 3: Simulate Player 2 Actions (Backend Side) ---
        // Inject P2's card into server state directly to simulate them placing it
        const p2InstanceId = 'inst-p2-1';
        const p2EntityId = 'ent-p2-1';
        mockServerState.arena.cardDefinitions[p2EntityId] = { entityId: p2EntityId, entityName: 'Player 2 Entity', imageUrl: 'p2.png' };
        mockServerState.arena.cardInstances[p2InstanceId] = { instanceId: p2InstanceId, entityId: p2EntityId, ownerPlayerId: 'player-2', faceUp: true };

        // Put P2 card in center slot 2
        mockServerState.arena.center[1].cardInstanceId = p2InstanceId;
        mockServerState.arena.center[1].ownerPlayerId = 'player-2';

        // --- Step 4: Player 1 Syncs Session ---
        fireEvent.click(screen.getByText('Sync Session'));
        await findByText('Session synced.'); // Or 'Arena loaded.'

        // Verify P2 entity is visible on P1's screen
        await findByText('Player 2 Entity');

        // --- Step 5: Form Relationship ---
        // P1 wants to connect their entity (Test Entity) to P2's entity (Player 2 Entity)

        // 1. Hover/Click connection source (P1's card)
        // The UI requires clicking "Connect" on the card overlay.
        // We need to show the overlay first by setting visibility/hover?
        // In the code: renderSlotCard uses `visibility === 'full'` to show the Connect button.
        // Center cards are always 'full' visibility.
        // The overlay is .card-action-overlay

        // Find P1's card in the arena (Center)
        const p1ArenaCard = screen.getAllByText('Test Entity').find(el => el.closest('.arenaConsoleSlot.center'));
        expect(p1ArenaCard).toBeInTheDocument();
        const p1Slot = p1ArenaCard.closest('.arenaConsoleSlot.center');

        // Click "Connect" button inside P1's slot
        const connectBtn = within(p1Slot).getByText('Connect');
        fireEvent.click(connectBtn);

        // Notice should say "Select a target card..."
        await findByText('Select a target card to connect.');

        // 2. Select Target (P2's card)
        const p2ArenaCard = screen.getByText('Player 2 Entity').closest('.arenaConsoleSlot.center');
        // Click the slot to select as target
        fireEvent.click(p2ArenaCard);

        // Modal should appear
        await findByText('Create Connection');

        // 3. Enter Text & Submit
        const input = screen.getByPlaceholderText(/e.g. hunts, loves/i);
        fireEvent.change(input, { target: { value: 'allied with' } });

        // Wait for validation (debounce)
        await act(async () => {
            await new Promise(r => setTimeout(r, 600));
        });

        // Check validation feedback if any '✓ Good connection'
        await findByText(/Good connection/i);

        // Click Create Link
        fireEvent.click(screen.getByText('Create Link'));

        // Wait for success
        await findByText(/Connection established/i);

        // --- Step 6: Verify Edge ---
        // Check visual line (EdgeLine)
        // The component renders an SVG with EdgeLine components.
        // We can check if the EdgeLine is rendered by looking for the svg line or a specific test id if added.
        // Or check mockServerState.arena.graphEdges
        expect(mockServerState.arena.graphEdges.length).toBe(1);
        expect(mockServerState.arena.graphEdges[0].sourceId).toBe(p1InstanceId);
        expect(mockServerState.arena.graphEdges[0].targetId).toBe(p2InstanceId);
        expect(mockServerState.arena.graphEdges[0].surfaceText).toBe('allied with');
    });
});

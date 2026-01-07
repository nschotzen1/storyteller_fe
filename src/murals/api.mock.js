/**
 * Mock API for Mural Selection Stage.
 * Simulates network latency and backend state persistence in memory.
 */

// Initial mock data
const generateMurals = () => {
    const directions = ['north', 'east', 'south', 'west'];
    const segments = ['A', 'B'];
    const murals = [];

    directions.forEach(dir => {
        segments.forEach(seg => {
            // 3 murals per segment
            for (let i = 0; i < 3; i++) {
                murals.push({
                    id: `${dir}_${seg}_${i}`,
                    direction: dir,
                    segment: seg,
                    index: i,
                    status: 'available', // available | occupied | locked
                    occupiedBy: null, // playerId
                    lockedBy: null // playerId
                });
            }
        });
    });
    return murals;
};

// In-memory "Database"
const mockDb = {
    sessionId: 'session_alpha',
    players: [], // { id, name, lockedMuralId }
    murals: generateMurals()
};

const LATENCY_MS = 300; // Simulate network delay

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const muralApi = {
    /**
     * joinSession
     * POST /api/session/join
     */
    joinSession: async (playerName) => {
        await delay(LATENCY_MS);

        let player = mockDb.players.find(p => p.name === playerName);
        if (!player) {
            player = {
                id: `p_${Date.now()}`,
                name: playerName,
                lockedMuralId: null
            };
            mockDb.players.push(player);
        }

        return {
            playerId: player.id,
            sessionId: mockDb.sessionId,
            state: await muralApi.getSessionState()
        };
    },

    /**
     * hoverMural
     * POST /api/mural/hover
     * (Optional: could verify if valid, but mostly client-side visual, 
     * maybe broadcasts ghost position in real impl)
     */
    hoverMural: async (muralId, playerId) => {
        // In a real socket implementation, this would broadcast ghost location
        await delay(50);
        return { success: true };
    },

    /**
     * inspectMural
     * POST /api/mural/inspect
     * Validates if mural is available
     */
    inspectMural: async (muralId, playerId) => {
        await delay(LATENCY_MS);

        const mural = mockDb.murals.find(m => m.id === muralId);
        if (!mural) throw new Error("Mural not found");

        if (mural.status === 'locked' && mural.lockedBy !== playerId) {
            return { success: false, reason: "Locked by another player" };
        }

        // In a real impl, this might mark it as "being inspected" (occupied) temporarily
        // For this mock, we'll auto-occupy it to simulate checking availability
        // Note: The prompt says "If a mural is being inspected by another player it is marked Occupied"
        // We'll simulate this by setting status='occupied' IF it's currently available

        if (mural.status === 'available') {
            mural.status = 'occupied'; // Ephemeral state
            mural.occupiedBy = playerId;

            // Auto-release other murals occupied by this player
            mockDb.murals.forEach(m => {
                if (m.id !== muralId && m.occupiedBy === playerId && m.status === 'occupied') {
                    m.status = 'available';
                    m.occupiedBy = null;
                }
            });
        } else if (mural.occupiedBy && mural.occupiedBy !== playerId) {
            return { success: false, reason: "Occupied by' " + mural.occupiedBy };
        }

        return { success: true, mural };
    },

    /**
     * uninspectMural
     * Helper to release "occupied" state if player cancels inspection
     */
    uninspectMural: async (muralId, playerId) => {
        await delay(100);
        const mural = mockDb.murals.find(m => m.id === muralId);
        if (mural && mural.occupiedBy === playerId && mural.status === 'occupied') {
            mural.status = 'available';
            mural.occupiedBy = null;
        }
        return { success: true };
    },

    /**
     * lockMural
     * POST /api/mural/lock
     * Commits the player to this mural
     */
    lockMural: async (muralId, playerId) => {
        await delay(LATENCY_MS);

        const mural = mockDb.murals.find(m => m.id === muralId);
        const player = mockDb.players.find(p => p.id === playerId);

        if (!mural || !player) throw new Error("Invalid ID");

        if (mural.status === 'locked' && mural.lockedBy !== playerId) {
            return { success: false, reason: "Already locked" };
        }

        // Lock it
        mural.status = 'locked';
        mural.lockedBy = playerId;

        // Update player
        player.lockedMuralId = muralId;

        return { success: true, mural };
    },

    /**
     * getSessionState
     * GET /api/session/state
     */
    getSessionState: async () => {
        // Randomly move "ghost" players for simulation?
        // Not doing that in pure GET, maybe a separate "simulate" helper
        return {
            murals: [...mockDb.murals],
            players: [...mockDb.players]
        };
    },

    // Helper for debug/simulation
    debugMoveGhost: () => {
        // Pick a random available mural and occupy it by a "ghost"
        const available = mockDb.murals.filter(m => m.status === 'available');
        if (available.length > 0) {
            const m = available[Math.floor(Math.random() * available.length)];
            m.status = 'occupied';
            m.occupiedBy = 'ghost_sim';

            // Release it after a bit
            setTimeout(() => {
                if (m.occupiedBy === 'ghost_sim') {
                    m.status = 'available';
                    m.occupiedBy = null;
                }
            }, 5000);
        }
    }
};

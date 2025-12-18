import { MASKS, VIAL_TITLES, BREW_SNIPPETS, VIAL_EFFECTS } from './mockData';

// --- Types (implicitly defined via JSDoc for reference) ---
/**
 * @typedef {Object} RoomState
 * @property {string} roomId
 * @property {'lobby' | 'brewing' | 'complete'} phase
 * @property {Player[]} players
 * @property {TurnState} turn
 * @property {BrewState} brew
 */

/**
 * @typedef {Object} Player
 * @property {string} playerId
 * @property {string} maskId
 * @property {string} maskName
 * @property {'active' | 'watching' | 'ready' | 'not_ready'} status
 * @property {boolean} isBot
 */

/**
 * @typedef {Object} TurnState
 * @property {number} index
 * @property {string} activePlayerId
 * @property {number} round
 * @property {number} totalRounds
 */

/**
 * @typedef {Object} BrewState
 * @property {string[]} summaryLines
 * @property {Vial[]} vials
 */

/**
 * @typedef {Object} Vial
 * @property {string} id
 * @property {string} title
 * @property {string} containerDescription
 * @property {string} substanceDescription
 * @property {string} pourEffect
 * @property {number} timestamp
 * @property {string} addedByMaskId
 * @property {string} [privateIngredient] // Only present if requested by owner
 */


// --- Event Bus ---
class EventBus {
    constructor() {
        this.listeners = {};
    }

    subscribe(roomId, handler) {
        if (!this.listeners[roomId]) {
            this.listeners[roomId] = [];
        }
        this.listeners[roomId].push(handler);
        return () => {
            this.listeners[roomId] = this.listeners[roomId].filter(h => h !== handler);
        };
    }

    emit(roomId, eventType, payload) {
        if (this.listeners[roomId]) {
            this.listeners[roomId].forEach(handler => handler({ type: eventType, payload }));
        }
    }
}

export const eventBus = new EventBus();

// --- Mock Server State ---
// In a real app, this would be a database.
const rooms = {};

// Helper to broadcast room state updates
const broadcastState = (roomId) => {
    const room = rooms[roomId];
    if (room) {
        // Determine connection status or just emit partial updates?
        // For POC, we'll emit the whole state on major changes, or specific events.
        // For specific events, we call eventBus.emit manually.
        // But helpful to have a generic "STATE_SYNC" if needed.
    }
};

// --- API Methods ---

export const mockApi = {
    getRoom: async (roomId) => {
        const room = rooms[roomId];
        if (!room) throw new Error('Room not found');
        return JSON.parse(JSON.stringify(room));
    },

    createRoom: async () => {
        const roomId = 'ROOM_' + Math.random().toString(36).substr(2, 4).toUpperCase();
        rooms[roomId] = {
            roomId,
            phase: 'lobby',
            players: [],
            turn: { index: 0, activePlayerId: null, round: 1, totalRounds: 6 },
            brew: { summaryLines: [], vials: [] }
        };
        return { roomId };
    },

    joinRoom: async (roomId, maskId, name) => {
        const room = rooms[roomId];
        if (!room) throw new Error('Room not found');

        const playerId = 'P_' + Math.random().toString(36).substr(2, 5);
        const mask = MASKS.find(m => m.id === maskId);

        // Check if mask is taken
        if (room.players.find(p => p.maskId === maskId)) {
            throw new Error('Mask already taken');
        }

        const newPlayer = {
            playerId,
            maskId,
            maskName: mask ? mask.name : 'Unknown',
            status: 'not_ready',
            isBot: false,
            displayName: name // only for local usage, theoretically
        };

        room.players.push(newPlayer);

        // Notify others
        eventBus.emit(roomId, 'PLAYER_JOINED', { player: newPlayer, roomState: JSON.parse(JSON.stringify(room)) });

        return { playerId, roomState: JSON.parse(JSON.stringify(room)) };
    },

    setReady: async (roomId, playerId, isReady) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.playerId === playerId);
        if (player) {
            player.status = isReady ? 'ready' : 'not_ready';
            eventBus.emit(roomId, 'PLAYER_READY_CHANGED', { playerId, status: player.status, roomState: JSON.parse(JSON.stringify(room)) });
        }
        return JSON.parse(JSON.stringify(room));
    },

    startBrew: async (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        room.phase = 'brewing';
        room.turn.index = 0;
        room.turn.round = 1;
        // Set first player active
        room.turn.activePlayerId = room.players[0].playerId;
        room.players.forEach(p => p.status = p.playerId === room.turn.activePlayerId ? 'active' : 'watching');

        eventBus.emit(roomId, 'PHASE_CHANGED', { phase: 'brewing', roomState: JSON.parse(JSON.stringify(room)) });
        eventBus.emit(roomId, 'TURN_STARTED', { turn: room.turn });

        return JSON.parse(JSON.stringify(room));
    },

    submitIngredient: async (roomId, playerId, text) => {
        const room = rooms[roomId];
        if (!room) return;
        if (room.turn.activePlayerId !== playerId) return;

        // Acknowledge privately
        // Accessing the private socket isn't real here, but we act as if we sent it.
        // The frontend caller will handle the immediate UI feedback for the sender.
        eventBus.emit(roomId, 'INGREDIENT_ACCEPTED', { playerId, text });

        // Simulate Brewmaster thinking layout
        setTimeout(() => {
            // 1. Generate Vial
            const randomTitle = VIAL_TITLES[Math.floor(Math.random() * VIAL_TITLES.length)];
            const randomEffect = VIAL_EFFECTS[Math.floor(Math.random() * VIAL_EFFECTS.length)];
            const randomSnippet = BREW_SNIPPETS[Math.floor(Math.random() * BREW_SNIPPETS.length)];

            const newVial = {
                id: 'v_' + Date.now(),
                title: randomTitle,
                containerDescription: "A crude iron vessel, cold to the touch.",
                substanceDescription: `Smells of ozone and wet pavement. \n"${text}" was distilled into this.`,
                pourEffect: randomEffect,
                timestamp: Date.now(),
                addedByMaskId: room.players.find(p => p.playerId === playerId)?.maskId,
                privateIngredient: text // In real backend, we wouldn't send this to everyone
            };

            room.brew.vials.push(newVial);
            room.brew.summaryLines.push(randomSnippet);
            if (room.brew.summaryLines.length > 3) room.brew.summaryLines.shift(); // Keep last 3

            // 2. Broadcast Vial Reveal
            // Note: In a real app we'd strip 'privateIngredient' for others.
            // Here we trust the client (frontend-only POC) to not render it for others.
            eventBus.emit(roomId, 'VIAL_REVEALED', { vial: newVial });
            eventBus.emit(roomId, 'BREW_SUMMARY_UPDATED', { summaryLines: room.brew.summaryLines });

            // 3. Next Turn Logic
            setTimeout(() => {
                handleTurnEnd(room);
            }, 3000); // Wait a bit after reveal to switch turns

        }, 1500); // 1.5s thinking time

        return { ok: true };
    },

    // Helper for simulation
    addBot: async (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        const botMasks = MASKS.filter(m => !room.players.find(p => p.maskId === m.id));
        if (botMasks.length === 0) return;
        const mask = botMasks[0];

        const playerId = 'BOT_' + Math.random().toString(36).substr(2, 5);
        const newPlayer = {
            playerId,
            maskId: mask.id,
            maskName: mask.name + " (Bot)",
            status: 'ready', // Bots auto ready
            isBot: true
        };
        room.players.push(newPlayer);
        eventBus.emit(roomId, 'PLAYER_JOINED', { player: newPlayer, roomState: JSON.parse(JSON.stringify(room)) });
    }
};

function handleTurnEnd(room) {
    // Rotate player
    const currentIndex = room.players.findIndex(p => p.playerId === room.turn.activePlayerId);
    let nextIndex = (currentIndex + 1) % room.players.length;

    // Update round logic if wrapped
    if (nextIndex === 0) {
        room.turn.round++;
    }

    if (room.turn.round > room.turn.totalRounds) {
        room.phase = 'complete';
        eventBus.emit(room.roomId, 'BREW_COMPLETED', { brew: room.brew });
        return;
    }

    room.turn.activePlayerId = room.players[nextIndex].playerId;
    room.turn.index++;

    // Update statuses
    room.players.forEach(p => p.status = p.playerId === room.turn.activePlayerId ? 'active' : 'watching');

    eventBus.emit(room.roomId, 'TURN_ENDED', {});
    eventBus.emit(room.roomId, 'TURN_STARTED', { turn: room.turn });

    // Check if new active player is a bot
    const nextPlayer = room.players[nextIndex];
    if (nextPlayer.isBot) {
        setTimeout(() => {
            mockApi.submitIngredient(room.roomId, nextPlayer.playerId, "Bot thought of something weird...");
        }, 2000);
    }
}

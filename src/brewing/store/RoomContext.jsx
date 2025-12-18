import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { mockApi, eventBus } from '../api/mockApi';

const RoomContext = createContext();

const initialState = {
    roomId: null,
    playerId: null,
    roomState: null,
    isConnected: false,
    messages: [], // Log for UI
};

function roomReducer(state, action) {
    switch (action.type) {
        case 'SET_ROOM_ID':
            return { ...state, roomId: action.payload };
        case 'SET_PLAYER_ID':
            return { ...state, playerId: action.payload };
        case 'UPDATE_ROOM_STATE':
            return { ...state, roomState: action.payload };
        case 'ADD_MESSAGE':
            // Keep last 50
            return { ...state, messages: [...state.messages, action.payload].slice(-50) };
        case 'SET_CONNECTED':
            return { ...state, isConnected: action.payload };
        default:
            return state;
    }
}

export function RoomProvider({ children }) {
    const [state, dispatch] = useReducer(roomReducer, initialState);

    // Expose easier finding of "Me"
    const me = state.roomState?.players.find(p => p.playerId === state.playerId);
    const isMyTurn = state.roomState?.turn?.activePlayerId === state.playerId;

    useEffect(() => {
        if (!state.roomId) return;

        // Subscribe to events
        const unsubscribe = eventBus.subscribe(state.roomId, (event) => {
            console.log('EVENT:', event); // Debug

            if (event.type === 'PLAYER_JOINED' || event.type === 'PLAYER_READY_CHANGED' ||
                event.type === 'PHASE_CHANGED' || event.type === 'TURN_STARTED' ||
                event.type === 'TURN_ENDED') {
                // These events usually carry the full roomState or partial updates
                if (event.payload.roomState) {
                    dispatch({ type: 'UPDATE_ROOM_STATE', payload: event.payload.roomState });
                } else {
                    // If payload doesnt have roomState, we might need to re-fetch or trust local opt updates.
                    // For POC mockApi, let's assume major events return roomState or we can fetch.
                    // Actually, let's just cheat and read the mockApi's state if needed, but better to receive it.
                    // In mockApi I sent it for most.
                    // For TURN_ENDED, I didn't send roomState. Let's rely on TURN_STARTED to sync.
                }
            }

            if (event.type === 'VIAL_REVEALED') {
                // Manually update local state if we didn't get full roomState
                // But wait, BREW_SUMMARY_UPDATED usually follows.
                // Let's just handle specific notifications.
                dispatch({ type: 'ADD_MESSAGE', payload: { type: 'vial', content: event.payload.vial } });
            }

            // Sync state for safety if missing
            // In a real app we'd fetch.
        });

        dispatch({ type: 'SET_CONNECTED', payload: true });
        return () => {
            unsubscribe();
            dispatch({ type: 'SET_CONNECTED', payload: false });
        };
    }, [state.roomId]);

    return (
        <RoomContext.Provider value={{ state, dispatch, me, isMyTurn }}>
            {children}
        </RoomContext.Provider>
    );
}

export const useRoom = () => useContext(RoomContext);

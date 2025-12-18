import React, { useState } from 'react';
import { RoomProvider, useRoom } from './store/RoomContext';
import { mockApi } from './api/mockApi';
import Lobby from './Lobby';
import Chamber from './Chamber';
import './brewing.css'; // Will create this next

function BrewingGameContent() {
    const { state, dispatch } = useRoom();
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');

    const handleCreate = async () => {
        try {
            const { roomId } = await mockApi.createRoom();
            dispatch({ type: 'SET_ROOM_ID', payload: roomId });
        } catch (e) {
            setError(e.message);
        }
    };

    const handleJoin = async () => {
        // In this flow, we just set the room ID locally to Enter the "Lobby".
        // We don't actually "Join" (mockApi.joinRoom) until we pick a mask in the Lobby.
        if (!joinCode) return;
        dispatch({ type: 'SET_ROOM_ID', payload: joinCode });
    };

    if (!state.roomId) {
        return (
            <div className="brewing-container flex flex-col items-center justify-center min-h-screen bg-stone-50 text-stone-900 font-mono">
                <h1 className="text-4xl mb-8 font-serif italic">Brewing a Universe</h1>

                <div className="flex flex-col space-y-4 w-64">
                    <button onClick={handleCreate} className="btn-primary">
                        Create Room
                    </button>

                    <div className="flex space-x-2 mt-4">
                        <input
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value)}
                            placeholder="Room Code"
                            className="border border-stone-400 p-2 flex-1 bg-transparent"
                        />
                        <button onClick={handleJoin} className="btn-secondary">
                            Join
                        </button>
                    </div>
                </div>
                {error && <p className="text-red-800 mt-4">{error}</p>}
            </div>
        );
    }

    // Once we have a Room ID, we decide view based on Phase
    // But wait, if we just set RoomID, we might not have the RoomState yet if we haven't joined/fetched.
    // The Lobby needs to deal with "I am pending join" or "I am joined".
    // Actually, Lobby should render first to let user pick mask.

    if (!state.roomState || state.roomState.phase === 'lobby') {
        return <Lobby />;
    }

    return <Chamber />;
}

export default function BrewingGame() {
    return (
        <RoomProvider>
            <BrewingGameContent />
        </RoomProvider>
    );
}

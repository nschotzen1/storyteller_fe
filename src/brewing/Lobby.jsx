import React, { useEffect, useState } from 'react';
import { useRoom } from './store/RoomContext';
import { mockApi, MASKS } from './api/mockApi'; // Need to export MASKS if not already
import { MASKS as MASKS_DATA } from './api/mockData';

export default function Lobby() {
    const { state, dispatch, me } = useRoom();
    const [loading, setLoading] = useState(true);
    const [selectedMaskId, setSelectedMaskId] = useState(null);
    const [displayName, setDisplayName] = useState('');

    // Fetch initial room state
    useEffect(() => {
        mockApi.getRoom(state.roomId).then(room => {
            dispatch({ type: 'UPDATE_ROOM_STATE', payload: room });
            setLoading(false);
        }).catch(err => {
            console.error(err);
            // Maybe redirect back if room not found
        });
    }, [state.roomId, dispatch]);

    const handleJoin = async () => {
        if (!selectedMaskId) return;
        try {
            const { playerId, roomState } = await mockApi.joinRoom(state.roomId, selectedMaskId, displayName);
            dispatch({ type: 'SET_PLAYER_ID', payload: playerId });
            dispatch({ type: 'UPDATE_ROOM_STATE', payload: roomState });
        } catch (e) {
            alert(e.message);
        }
    };

    const handleReady = async () => {
        if (!me) return;
        const newState = await mockApi.setReady(state.roomId, me.playerId, me.status !== 'ready');
        // Note: Event bus usually updates us, but good to have response
    };

    const handleStart = async () => {
        await mockApi.startBrew(state.roomId);
    };

    const handleSimulateBot = async () => {
        await mockApi.addBot(state.roomId);
    };

    if (loading) return <div className="p-8">Connecting to ethereal planes...</div>;

    // Render mask list
    const players = state.roomState?.players || [];
    const takenMasks = players.map(p => p.maskId);

    // If I have already joined:
    if (me) {
        return (
            <div className="brewing-container p-8 flex flex-col items-center">
                <h1 className="text-2xl mb-4 font-serif">The Antechamber</h1>
                <p className="mb-8">Room: {state.roomId}</p>

                <div className="w-full max-w-md border border-stone-400 p-4 bg-white/50">
                    <h2 className="border-b border-stone-300 pb-2 mb-4">GATHERED SPIRITS</h2>
                    <ul className="space-y-2">
                        {players.map(p => (
                            <li key={p.playerId} className="flex justify-between">
                                <span>{p.maskName} {p.isBot && '(Bot)'}</span>
                                <span className={p.status === 'ready' ? 'text-green-700' : 'text-stone-400'}>
                                    [{p.status === 'ready' ? 'READY' : 'WAITING'}]
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-8 flex gap-4">
                    <button onClick={handleReady} className="btn-primary">
                        {me.status === 'ready' ? 'Not Ready' : 'Mark Ready'}
                    </button>

                    {/* Host logic? For POC anyone can start if 2+ players */}
                    {players.length >= 2 && (
                        <button onClick={handleStart} className="btn-secondary font-bold">
                            START BREW
                        </button>
                    )}
                </div>

                <div className="mt-12 pt-8 border-t border-stone-300 w-full max-w-md text-center">
                    <p className="text-xs text-stone-500 mb-2">DEV TOOLS</p>
                    <button onClick={handleSimulateBot} className="text-xs bg-stone-200 px-2 py-1 rounded">
                        + Add Bot Player
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="brewing-container p-8 flex flex-col items-center">
            <h1 className="text-2xl mb-2 font-serif">Choose Your Mask</h1>
            <p className="mb-8 text-stone-500">Room: {state.roomId}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {MASKS_DATA.map(mask => {
                    const taken = takenMasks.includes(mask.id);
                    const selected = selectedMaskId === mask.id;
                    return (
                        <button
                            key={mask.id}
                            onClick={() => !taken && setSelectedMaskId(mask.id)}
                            disabled={taken}
                            className={`p-4 text-left border transition-all ${selected ? 'border-black bg-stone-100 ring-1 ring-black' :
                                    taken ? 'border-stone-200 text-stone-300 cursor-not-allowed' : 'border-stone-300 hover:border-stone-500'
                                }`}
                        >
                            <span className="text-2xl mr-3">{mask.glyph}</span>
                            <span className="font-serif text-lg">{mask.name}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 w-full max-w-xs space-y-4">
                <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full border-b border-black bg-transparent p-2 focus:outline-none"
                />
                <button
                    onClick={handleJoin}
                    disabled={!selectedMaskId}
                    className="btn-primary w-full disabled:opacity-50"
                >
                    Enter Chamber
                </button>
            </div>
        </div>
    );
}

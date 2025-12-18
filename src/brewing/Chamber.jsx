import React, { useState } from 'react';
import { useRoom } from './store/RoomContext';
import CauldronPanel from './components/CauldronPanel';
import TurnPanel from './components/TurnPanel';
import PlayersPanel from './components/PlayersPanel';
import VialModal from './components/VialModal';

export default function Chamber() {
    const { state, isMyTurn } = useRoom();
    const [viewingVial, setViewingVial] = useState(null);

    const { roomState } = state;
    const { turn } = roomState;

    // Find active player name
    const activePlayer = roomState.players.find(p => p.playerId === turn.activePlayerId);
    const activeName = activePlayer ? activePlayer.maskName : 'Unknown';

    return (
        <div className="brewing-container overflow-hidden">
            {/* HEADER */}
            <header className="brewing-header text-sm">
                <div className="font-bold">ROOM: {roomState.roomId}</div>
                <div className="font-serif italic">
                    Round {turn.round} / {turn.totalRounds} — Active: {activeName}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-green-600">● Live</span>
                </div>
            </header>
            <div className="header-spacer"></div>

            {/* MAIN COLUMNS */}
            <div className="chamber-layout">
                {/* LEFT: CAULDRON */}
                <div className="panel bg-stone-50/50">
                    <CauldronPanel
                        brew={roomState.brew}
                        onVialClick={setViewingVial}
                    />
                </div>

                {/* MIDDLE: TURN WINDOW */}
                <div className="panel bg-white relative">
                    <TurnPanel />
                </div>

                {/* RIGHT: PLAYERS */}
                <div className="panel bg-stone-50/50">
                    <PlayersPanel players={roomState.players} activeId={turn.activePlayerId} />
                </div>
            </div>

            {/* MODAL */}
            {viewingVial && (
                <VialModal vial={viewingVial} onClose={() => setViewingVial(null)} />
            )}
        </div>
    );
}

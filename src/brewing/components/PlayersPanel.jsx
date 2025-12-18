import React from 'react';
import { MASKS } from '../api/mockData';

export default function PlayersPanel({ players, activeId }) {
    // Helper to get glyph
    const getGlyph = (maskId) => MASKS.find(m => m.id === maskId)?.glyph || '?';

    return (
        <div className="flex flex-col h-full">
            <h3 className="font-bold border-b border-stone-300 pb-2 mb-4 tracking-widest text-xs uppercase">In The Room</h3>
            <ul className="space-y-4">
                {players.map(p => {
                    const isActive = p.playerId === activeId;
                    return (
                        <li key={p.playerId} className={`flex items-start ${isActive ? 'text-black' : 'text-stone-500'}`}>
                            <span className="text-xl mr-2">{getGlyph(p.maskId)}</span>
                            <div>
                                <div className={`font-serif ${isActive ? 'font-bold' : ''}`}>
                                    {p.maskName}
                                </div>
                                <div className="text-xs uppercase tracking-wider mt-1">
                                    {isActive ? (
                                        <span className="bg-black text-white px-1 py-0.5">Active</span>
                                    ) : (
                                        <span>Watching</span>
                                    )}
                                    {p.isBot && <span className="ml-2 text-stone-400">(Bot)</span>}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

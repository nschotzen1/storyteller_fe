import React from 'react';
import MuralRegion from './MuralRegion';
import { useMuralContext } from '../context/MuralContext';

/**
 * WallSegment
 * Represents one half of a direction (A or B).
 * Contains the large background PNG and the embedded MuralRegions.
 */
const WallSegment = ({ direction, segment, imageSrc }) => {
    const { murals } = useMuralContext();

    // Filter murals for this segment
    const segmentMurals = murals.filter(
        m => m.direction === direction && m.segment === segment
    );

    // Mock coordinates for the 3 murals in this segment
    // In real implementation this comes from a config or passed prop
    const MURAL_COORDS = [
        { x: 14, y: 38, w: 18, h: 32 }, // Adjusted for the triple archway image
        { x: 41, y: 35, w: 18, h: 32 },
        { x: 68, y: 38, w: 18, h: 32 },
    ];

    return (
        <div className="relative w-[1200px] h-[800px] flex-shrink-0 bg-stone-900 overflow-hidden shadow-2xl mx-1"
            style={{
                background: imageSrc ? 'black' : `linear-gradient(to bottom, #1c1917, #0c0a09)`,
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
            }}
        >
            {imageSrc ? (
                <img
                    src={imageSrc}
                    alt={`${direction} - ${segment}`}
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900 bg-grid-scanlines border-4 border-dashed border-stone-800 opacity-50">
                    {/* Placeholder Visuals */}
                    <div className="text-4xl font-bold text-stone-700 tracking-widest uppercase mb-2">
                        {direction} WALL
                    </div>
                    <div className="text-xl text-stone-600 font-mono border px-4 py-1 border-stone-700 rounded-full">
                        SEGMENT {segment}
                    </div>
                    <div className="mt-8 text-xs text-stone-600 max-w-xs text-center">
                        (Mural data active - visuals pending)
                    </div>

                    {/* The Wall Art (Placeholder Noise) */}
                    <div className="absolute inset-0 opacity-10 bg-noise pointer-events-none mix-blend-overlay" />
                </div>
            )}

            {/* Render Murals */}
            {segmentMurals.map((mural, idx) => {
                const coords = MURAL_COORDS[idx % MURAL_COORDS.length];
                return (
                    <MuralRegion
                        key={mural.id}
                        data={mural}
                        x={coords.x}
                        y={coords.y}
                        width={coords.w}
                        height={coords.h}
                    />
                );
            })}
        </div>
    );
};

export default WallSegment;

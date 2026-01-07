import React from 'react';
import { useMuralContext } from '../context/MuralContext';

/**
 * InspectionOverlay
 * The detailed view when a user is inspecting a specific mural.
 */
const InspectionOverlay = ({ muralId, onClose }) => {
    const { murals, lockMural } = useMuralContext();
    const mural = murals.find(m => m.id === muralId);

    if (!mural) return null;

    const handleAttend = async () => {
        await lockMural(mural.id);
        onClose(); // In real app, might transition to next stage instead
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fadeInSlow">
            {/* Close clickable background */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Content Container */}
            <div className="relative w-[80%] h-[80%] bg-stone-900 border border-stone-700 shadow-2xl flex flex-col items-center justify-center overflow-hidden">

                {/* Use the same placeholder logic or mock image */}
                <div className="absolute inset-0 opacity-30 bg-noise"
                    style={{
                        background: `linear-gradient(45deg, #1c1917, #292524)`
                    }}
                />

                <h2 className="z-10 text-3xl font-serif text-stone-300 mb-8 tracking-widest">
                    {mural.direction.toUpperCase()} — {mural.segment}-{mural.index}
                </h2>

                <div className="z-10 w-96 text-center text-stone-400 font-mono text-sm leading-relaxed mb-12">
                    The paint is cracked, yet the image remains clear.
                    Use your imagination to see what is hidden here.
                </div>

                {/* Action Button */}
                <button
                    onClick={handleAttend}
                    className="z-10 px-8 py-4 bg-stone-200 text-stone-900 font-bold uppercase tracking-wider hover:bg-white hover:scale-105 transition-all duration-300 shadow-lg border-2 border-transparent hover:border-yellow-500"
                >
                    Attend to this place
                </button>

                {/* Cancel Button */}
                <button
                    onClick={onClose}
                    className="z-10 mt-6 text-stone-500 hover:text-stone-300 uppercase text-xs tracking-widest hover:underline"
                >
                    Return to Circle
                </button>
            </div>
        </div>
    );
};

export default InspectionOverlay;

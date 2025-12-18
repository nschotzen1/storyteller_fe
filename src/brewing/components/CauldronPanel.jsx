import React from 'react';

export default function CauldronPanel({ brew, onVialClick }) {
    const { summaryLines, vials } = brew;

    return (
        <div className="flex flex-col h-full font-mono text-sm leading-relaxed">
            <h3 className="font-bold border-b border-stone-300 pb-2 mb-4 tracking-widest text-xs uppercase">The Cauldron</h3>

            {/* Brew Summary */}
            <div className="mb-8 pl-4 border-l-2 border-stone-300 italic text-stone-600">
                {summaryLines.length === 0 ? (
                    <span className="opacity-50">The brew has not yet begun...</span>
                ) : (
                    summaryLines.map((line, i) => (
                        <p key={i} className="mb-2">{line}</p>
                    ))
                )}
            </div>

            <h3 className="font-bold border-b border-stone-300 pb-2 mb-2 tracking-widest text-xs uppercase">Added Ingredients</h3>
            <div className="flex-1 overflow-y-auto">
                {vials.length === 0 && <p className="text-stone-400 italic p-2">Empty...</p>}
                {vials.map((vial, i) => (
                    <div key={vial.id} onClick={() => onVialClick(vial)} className="vial-item group">
                        <div className="flex justify-between text-xs text-stone-500 mb-1">
                            <span>{i + 1}. {vial.addedByMaskId}</span>
                            <span>{new Date(vial.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="font-serif text-lg group-hover:underline decoration-stone-400 decoration-1 underline-offset-2">
                            {vial.title}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

import React from 'react';

export default function VialModal({ vial, onClose }) {
    if (!vial) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6 border-b border-black pb-4">
                    <h2 className="text-3xl font-serif">{vial.title}</h2>
                    <button onClick={onClose} className="text-2xl hover:text-stone-500">&times;</button>
                </div>

                <div className="space-y-6 font-mono text-sm">
                    <div>
                        <h4 className="uppercase text-xs tracking-widest text-stone-500 mb-1">Vessel</h4>
                        <p>{vial.containerDescription}</p>
                    </div>

                    <div>
                        <h4 className="uppercase text-xs tracking-widest text-stone-500 mb-1">Essence</h4>
                        <p className="whitespace-pre-line">{vial.substanceDescription}</p>
                    </div>

                    {vial.privateIngredient && (
                        <div className="p-2 border border-stone-300 bg-stone-50 text-stone-500 text-xs italic">
                            (You whispered: "{vial.privateIngredient}")
                        </div>
                    )}

                    <div>
                        <h4 className="uppercase text-xs tracking-widest text-stone-500 mb-1">Effect</h4>
                        <div className="pl-4 border-l-4 border-black font-serif italic text-lg">
                            {vial.pourEffect}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

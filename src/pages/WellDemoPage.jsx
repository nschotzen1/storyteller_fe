import React, { useState } from 'react';
import WellFragmentsScene from '../components/well/WellFragmentsScene';
import { fetchFragmentPayload } from '../components/well/wellFragmentsApi.mock'; // Assuming this export exists
import '../components/well/WellFragmentsScene.css'; // Ensure CSS is loaded

const WellDemoPage = () => {
    const [savedFragments, setSavedFragments] = useState([]);

    const handleSave = (fragment) => {
        console.log("Fragment Saved:", fragment);
        setSavedFragments(prev => [fragment, ...prev]);
    };

    return (
        <div className="w-full h-screen flex flex-col bg-gray-900 text-white font-serif">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center z-10 bg-gray-900">
                <h1 className="text-xl">Well of Fragments Demo</h1>
                <div className="text-sm text-gray-400">
                    Saved: {savedFragments.length}
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                <WellFragmentsScene
                    backgroundSrc="/well/well_background.png"
                    fragmentSpriteKeys={['fragment_02']}
                    fetchFragment={fetchFragmentPayload}
                    onSave={handleSave}
                />
            </div>

            {/* Saved Fragments Panel (Bottom) */}
            <div className="h-48 bg-gray-800 p-4 overflow-x-auto flex gap-4 border-t border-gray-700 z-10">
                {savedFragments.length === 0 && (
                    <div className="text-gray-500 italic self-center">No fragments saved yet. Wait for them to surface...</div>
                )}
                {savedFragments.map((frag) => (
                    <div key={frag.savedAt} className="min-w-[120px] max-w-[160px] bg-[#f0dcaa] text-black p-2 text-xs rounded shadow-lg relative">
                        <div className="font-bold mb-1 border-b border-black/20 pb-1">{frag.id}</div>
                        <div className="italic leading-tight">"{frag.text}"</div>
                        <div className="absolute bottom-1 right-2 text-[8px] opacity-60">
                            {new Date(frag.savedAt).toLocaleTimeString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WellDemoPage;

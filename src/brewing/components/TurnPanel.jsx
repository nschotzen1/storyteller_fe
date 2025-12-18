import React, { useState, useEffect, useRef } from 'react';
import { useRoom } from '../store/RoomContext';
import { mockApi } from '../api/mockApi';

const Typewriter = ({ text, speed = 30 }) => {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        setDisplayed('');
        let i = 0;
        const timer = setInterval(() => {
            setDisplayed(text.substring(0, i));
            i++;
            if (i > text.length) clearInterval(timer);
        }, speed);
        return () => clearInterval(timer);
    }, [text, speed]);

    return <span>{displayed}</span>;
}

export default function TurnPanel() {
    const { state, me, isMyTurn } = useRoom();
    const [ingredient, setIngredient] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [localLog, setLocalLog] = useState([]); // Stuff only I see
    const messagesEndRef = useRef(null);

    const { messages } = state; // Global messages from server

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, localLog]);

    const handleSubmit = async () => {
        if (!ingredient.trim()) return;
        setSubmitting(true);

        // Optimistic update local log
        setLocalLog(prev => [...prev, {
            id: Date.now(),
            type: 'private_input',
            content: `You offered: "${ingredient}"`
        }]);

        try {
            await mockApi.submitIngredient(state.roomId, me.playerId, ingredient);
            setIngredient('');
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    // Combine logs for display?
    // We want a chronological view.
    // The global messages have `vial` objects or other events.
    // Let's just list the global messages.
    // When active, we show the input form at the bottom (or top?).
    // User design: "Turn Window" -> "If active: input", "If not: Witness view".

    // Reconstruct the "Stream":
    // It's basically a chat log but with "Brewmaster" narration.

    // We can merge localLog and messages by timestamp?
    // For POC simplicity: Just render messages. The local input log is separate section as per wireframe: "Private log: - You offered..."

    return (
        <div className="flex flex-col h-full">
            <h3 className="font-bold border-b border-stone-300 pb-2 mb-4 tracking-widest text-xs uppercase px-4 pt-4">This Turn</h3>

            {/* Main Stream */}
            <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
                {messages.map((msg, idx) => {
                    const isLast = idx === messages.length - 1;

                    if (msg.type === 'vial') {
                        return (
                            <div key={idx} className="bg-stone-50 border-l-2 border-black p-3 text-sm">
                                <div className="font-bold mb-1 font-serif">Brewmaster:</div>
                                <div className="font-serif italic leading-relaxed">
                                    {/* Only animate if it's the very last message */}
                                    {isLast ? (
                                        <Typewriter text={msg.content.substanceDescription} /> // Or full description?
                                    ) : (
                                        <span>{msg.content.substanceDescription}</span>
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-stone-500 uppercase tracking-wide">
                                    ➜ {msg.content.pourEffect}
                                </div>
                            </div>
                        );
                    }
                    return null; // Ignore other types for now
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Footer Area */}
            <div className="border-t border-stone-300 p-4 bg-stone-100">
                {isMyTurn ? (
                    <div className="animate-fade-in-up">
                        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-green-900 flex justify-between">
                            <span>You are speaking to the Brewmaster</span>
                            <span className="text-stone-500 font-normal normal-case">Private</span>
                        </div>

                        {/* Private Log of previous inputs this turn? Or just general history? */}
                        {localLog.length > 0 && (
                            <div className="mb-2 text-xs text-stone-500 italic space-y-1">
                                {localLog.slice(-2).map(l => (
                                    <div key={l.id}>{l.content}</div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <textarea
                                value={ingredient}
                                onChange={e => setIngredient(e.target.value)}
                                placeholder="Describe your ingredient..."
                                className="flex-1 p-2 border border-stone-400 font-serif focus:outline-none focus:border-black text-sm h-20 resize-none bg-white"
                                disabled={submitting}
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={!ingredient.trim() || submitting}
                                className="btn-primary self-end h-20 writing-mode-vertical"
                            >
                                OFFER
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-stone-500 italic font-serif">
                        You are witnessing from afar...
                        <div className="mt-2 text-xs font-sans not-italic text-stone-400">
                            (You do not see the active ingredient)
                        </div>

                        {/* Witness Whisper (Optional) */}
                        <div className="mt-4 flex gap-2 justify-center opacity-50 hover:opacity-100 transition-opacity">
                            <input
                                placeholder="Whisper..."
                                className="border-b border-stone-300 bg-transparent text-xs p-1 focus:outline-none w-32 text-center"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

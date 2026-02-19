import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArenaCard from './ArenaCard';
import ArenaConnection from './ArenaConnection';

// --- Constants ---
const CANVAS_WIDTH = 2000; // Virtual canvas size
const CANVAS_HEIGHT = 1500;
const SNAP_GRID = 20;

const initialCards = [
    { id: 'c1', x: 800, y: 700, entityName: 'Miri Lights', summary: 'Ghost lights on the peak.' },
    { id: 'c2', x: 1100, y: 500, entityName: 'Oak Plateau', summary: 'Ancient watching grounds.' },
];

const ArenaGraph = ({
    cards = [],
    edges = [],
    memories = [],
    storytellers = [],
    baseUrl,
    onConnect,     // (sourceId, targetId) -> Promise
    onValidate,    // (sourceId, targetId, text) -> Promise(fastResult)
    onMoveCard,    // (cardId, x, y) -> void
    onMission      // (storytellerId, cardId) -> void
}) => {
    // Local state for smooth drag interactions
    const [localCards, setLocalCards] = useState(initialCards); // initialized with mock data if props empty
    useEffect(() => {
        if (cards && cards.length > 0) {
            // Map props cards to local state with positions tailored for graph (if existing pos)
            // For new cards without pos, scatter them.
            setLocalCards(prev => {
                // merge logic here would be more complex in prod, simplifying:
                return cards.map((c, i) => ({
                    ...c,
                    x: c.x || (prev.find(p => p.id === c.cardId)?.x) || 800 + (i * 150),
                    y: c.y || (prev.find(p => p.id === c.cardId)?.y) || 600 + (i * 100)
                }));
            });
        }
    }, [cards]);

    const [connecting, setConnecting] = useState(null); // { sourceId, startX, startY, currentX, currentY }
    const [hoverTargetId, setHoverTargetId] = useState(null);

    const containerRef = useRef(null);
    const [viewTransform, setViewTransform] = useState({ x: -500, y: -400, scale: 1 }); // Pan/Zoom state

    // --- Handlers ---

    const handleDragStart = (e, card) => {
        // Optional: bring to front logic
    };

    const handleDragEnd = (e, info, card) => {
        const newX = Math.round((card.x + info.offset.x) / SNAP_GRID) * SNAP_GRID;
        const newY = Math.round((card.y + info.offset.y) / SNAP_GRID) * SNAP_GRID;
        onMoveCard?.(card.id, newX, newY);

        // Update local immediately for snap feel
        setLocalCards(prev => prev.map(c => c.id === card.id ? { ...c, x: newX, y: newY } : c));
    };

    const startConnection = (e, cardId) => {
        e.stopPropagation();
        const card = localCards.find(c => c.id === cardId);
        if (!card) return;

        // Calculate center of card as start point
        // Assuming card size ~ 160x240 roughly
        const startX = card.x + 80;
        const startY = card.y + 120;

        setConnecting({
            sourceId: cardId,
            startX,
            startY,
            currentX: startX,
            currentY: startY
        });
    };

    const updateConnection = (e) => {
        if (!connecting) return;
        // Need to map screen coordinates to canvas coordinates accounting for pan/zoom
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const scale = viewTransform.scale;
        const x = (e.clientX - rect.left - viewTransform.x) / scale;
        const y = (e.clientY - rect.top - viewTransform.y) / scale;

        setConnecting(prev => ({ ...prev, currentX: x, currentY: y }));
    };

    const endConnection = () => {
        if (connecting && hoverTargetId && hoverTargetId !== connecting.sourceId) {
            onConnect?.(connecting.sourceId, hoverTargetId);
        }
        setConnecting(null);
        setHoverTargetId(null);
    };

    // Flip State
    const [flippedCards, setFlippedCards] = useState({});

    const toggleFlip = (cardId, e) => {
        e.stopPropagation();
        setFlippedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
    };

    // Storyteller Drag Logic
    const handleStorytellerDrop = (e, info, storytellerId) => {
        const dropPoint = info.point; // { x, y } page coordinates

        // Find if dropped on any card
        // We need to convert card canvas coords to screen coords to check simple distance
        // ScreenX = ViewX + (CardX * Scale) (approx, neglecting container offset if full screen)
        // Accessing container offset is safer
        const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };

        const hitCard = cards.find(card => {
            const cardScreenX = containerRect.left + viewTransform.x + (card.x * viewTransform.scale);
            const cardScreenY = containerRect.top + viewTransform.y + (card.y * viewTransform.scale);

            // Simple box/radius check. Card is ~160x240 (w-40 h-60 tailwind units * 4px)
            const cardW = 160 * viewTransform.scale;
            const cardH = 240 * viewTransform.scale;

            return (
                dropPoint.x >= cardScreenX &&
                dropPoint.x <= cardScreenX + cardW &&
                dropPoint.y >= cardScreenY &&
                dropPoint.y <= cardScreenY + cardH
            );
        });

        if (hitCard && onMission) {
            onMission(storytellerId, hitCard.id);
        }
    };

    // --- Render ---

    return (
        <div
            className="w-full h-full overflow-hidden bg-slate-900 distinct-pattern relative cursor-grab active:cursor-grabbing"
            onMouseMove={updateConnection}
            onMouseUp={endConnection}
            ref={containerRef}
        >
            <motion.div
                className="transform-layer origin-top-left"
                style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
                animate={{ x: viewTransform.x, y: viewTransform.y, scale: viewTransform.scale }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >

                {/* Connection Layer (SVG) */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {edges.map(edge => {
                        const source = localCards.find(c => c.id === edge.fromCardId);
                        const target = localCards.find(c => c.id === edge.toCardId);
                        if (!source || !target) return null;
                        return (
                            <ArenaConnection
                                key={edge.edgeId}
                                edge={edge}
                                sourcePos={{ x: source.x + 80, y: source.y + 120 }}
                                targetPos={{ x: target.x + 80, y: target.y + 120 }}
                                status="accepted" // TODO: map quality/status
                            />
                        );
                    })}

                    {connecting && (
                        <ArenaConnection
                            isDraft={true}
                            sourcePos={{ x: connecting.startX, y: connecting.startY }}
                            targetPos={{ x: connecting.currentX, y: connecting.currentY }}
                            status={hoverTargetId ? "validating" : "draft"}
                        />
                    )}
                </svg>

                {/* Memory Layer (Bottom) */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                    {(memories || []).map((mem, i) => (
                        <motion.div
                            key={mem.id}
                            className="absolute w-64 p-4 rounded-full border border-amber-500/30 bg-amber-900/20 backdrop-blur-sm flex flex-col items-center justify-center text-center pointer-events-auto"
                            style={{
                                left: 1000 + (Math.cos(i) * 300) - 128, // Basic circular layout for memories
                                top: 750 + (Math.sin(i) * 200) - 64,
                                height: 128
                            }}
                            drag
                            dragMomentum={false}
                        >
                            <div className="text-amber-200/50 text-[10px] uppercase tracking-widest mb-1">Memory</div>
                            <div className="text-amber-100 font-serif text-sm">{mem.title || 'Forgotten Moment'}</div>
                            <div className="text-amber-200/40 text-[10px] line-clamp-2 mt-1">{mem.content}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Node Layer (HTML) */}
                <div className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 1 }}>
                    {localCards.map(card => {
                        const isFlipped = flippedCards[card.id];
                        return (
                            <motion.div
                                key={card.id}
                                className={`absolute w-40 h-60 rounded-lg shadow-2xl perspective-1000 ${hoverTargetId === card.id ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-slate-900' : ''}`}
                                style={{ left: card.x, top: card.y }}
                                drag
                                dragMomentum={false}
                                onDragStart={(e) => handleDragStart(e, card)}
                                onDragEnd={(e, info) => handleDragEnd(e, info, card)}
                                onMouseEnter={() => connecting && setHoverTargetId(card.id)}
                                onMouseLeave={() => setHoverTargetId(null)}
                            >
                                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                    {/* FRONT */}
                                    <div className="absolute inset-0 backface-hidden w-full h-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden flex flex-col pointer-events-none">
                                        {/* Card Image */}
                                        <div className="h-32 bg-slate-700 overflow-hidden relative">
                                            {card.front?.imageUrl || card.imageUrl ? (
                                                <img src={card.front?.imageUrl || card.imageUrl} className="w-full h-full object-cover opacity-80" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No Image</div>
                                            )}
                                        </div>
                                        {/* Card Body */}
                                        <div className="p-3 flex-1 flex flex-col">
                                            <h3 className="text-sm font-bold text-slate-200 leading-tight mb-1">{card.entityName}</h3>
                                            <p className="text-[10px] text-slate-400 line-clamp-3">{card.summary || card.front?.prompt}</p>
                                        </div>
                                        {/* Flip Btn */}
                                        <button
                                            className="absolute top-2 right-2 p-1 bg-black/40 rounded-full hover:bg-black/60 pointer-events-auto"
                                            onClick={(e) => toggleFlip(card.id, e)}
                                        >
                                            <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* BACK */}
                                    <div className="absolute inset-0 backface-hidden w-full h-full bg-slate-900 border border-slate-600 rounded-lg overflow-hidden flex flex-col p-4 pointer-events-none rotate-y-180">
                                        <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Secrets</div>
                                        <p className="text-xs text-slate-300 italic">{card.secrets || card.back?.text || "No secrets revealed."}</p>

                                        {/* Flip Btn (Back) */}
                                        <button
                                            className="absolute top-2 right-2 p-1 bg-black/40 rounded-full hover:bg-black/60 pointer-events-auto"
                                            onClick={(e) => toggleFlip(card.id, e)}
                                        >
                                            <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Interaction Handles (Only visible on front or always?) */}
                                {/* Right Handle (Output) */}
                                <div
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 border-2 border-amber-500 rounded-full cursor-crosshair hover:scale-125 transition-transform flex items-center justify-center z-10"
                                    onMouseDown={(e) => startConnection(e, card.id)}
                                >
                                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                                </div>

                            </motion.div>
                        );
                    })}
                </div>

            </motion.div>

            {/* Storyteller Dock */}
            {storytellers && storytellers.length > 0 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 p-4 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 z-20">
                    {storytellers.map(st => (
                        <motion.div
                            key={st.id}
                            className="w-12 h-12 rounded-full bg-indigo-900 border-2 border-indigo-400 cursor-grab active:cursor-grabbing flex items-center justify-center relative group"
                            drag
                            dragSnapToOrigin={true}
                            onDragEnd={(e, info) => handleStorytellerDrop(e, info, st.id)}
                            whileHover={{ scale: 1.1 }}
                        >
                            {st.iconUrl ? (
                                <img src={st.iconUrl} className="w-full h-full rounded-full object-cover" alt={st.name} />
                            ) : (
                                <span className="text-xs font-bold text-indigo-200">{st.name?.[0]}</span>
                            )}

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 bg-black text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {st.name}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* HUD Controls */}
            <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-10">
                <button className="w-10 h-10 bg-slate-800 rounded-full text-white hover:bg-slate-700 flex items-center justify-center" onClick={() => setViewTransform(t => ({ ...t, scale: t.scale * 1.1 }))}>+</button>
                <button className="w-10 h-10 bg-slate-800 rounded-full text-white hover:bg-slate-700 flex items-center justify-center" onClick={() => setViewTransform(t => ({ ...t, scale: t.scale * 0.9 }))}>-</button>
            </div>

        </div>
    );
};

export default ArenaGraph;

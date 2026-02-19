import React from 'react';
import { motion } from 'framer-motion';

const ArenaConnection = ({
    edge,
    sourcePos,
    targetPos,
    isDraft = false,
    quality = null, // { score, confidence }
    status = 'accepted' // 'draft', 'validating', 'accepted', 'rejected'
}) => {
    if (!sourcePos || !targetPos) return null;

    // Calculate Bezier Curve
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Control points for smooth "S" curve
    const cp1 = { x: sourcePos.x + dist * 0.4, y: sourcePos.y };
    const cp2 = { x: targetPos.x - dist * 0.4, y: targetPos.y };

    const pathD = `M ${sourcePos.x},${sourcePos.y} C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${targetPos.x},${targetPos.y}`;

    // Visual Styles based on Status
    let strokeColor = '#4b5563'; // gray-600 default
    let strokeWidth = 2;
    let arrayStr = ''; // dashed or solid

    if (isDraft) {
        strokeColor = '#9ca3af'; // gray-400
        arrayStr = '5,5';
    } else if (status === 'validating') {
        strokeColor = '#eab308'; // yellow-500
        strokeWidth = 3;
    } else if (status === 'accepted') {
        strokeColor = '#22c55e'; // green-500 (emerald)
        strokeWidth = 3;
    } else if (status === 'rejected') {
        strokeColor = '#ef4444'; // red-500
        strokeWidth = 3;
        arrayStr = '2,2';
    }

    // Animation Variants
    const pathVariants = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.8, ease: "easeOut" }
        }
    };

    return (
        <g className={`arena-connection status-${status}`}>
            {/* Glow / Interaction Area */}
            <motion.path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth * 4}
                strokeOpacity={0.1}
                initial="hidden"
                animate="visible"
                variants={pathVariants}
            />

            {/* Main Line */}
            <motion.path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={arrayStr}
                strokeLinecap="round"
                initial="hidden"
                animate="visible"
                variants={pathVariants}
            />

            {/* Label (if exists) */}
            {edge?.surfaceText && (
                <foreignObject
                    x={(sourcePos.x + targetPos.x) / 2 - 60}
                    y={(sourcePos.y + targetPos.y) / 2 - 15}
                    width="120"
                    height="30"
                    style={{ overflow: 'visible' }}
                >
                    <div className={`px-2 py-1 text-xs text-center rounded text-white bg-black/60 border border-white/10 backdrop-blur-sm truncate transform -translate-y-1/2`}>
                        {edge.surfaceText}
                    </div>
                </foreignObject>
            )}
        </g>
    );
};

export default ArenaConnection;

import React, { useState } from 'react';

const EdgeLine = ({ edge, fromPosition, toPosition, isNew = false, onHover }) => {
    const [isHovered, setIsHovered] = useState(false);

    // If positions aren't available, don't render
    if (!fromPosition || !toPosition) return null;

    // Calculate control points for a nice Bezier curve
    const dx = toPosition.x - fromPosition.x;
    const dy = toPosition.y - fromPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Midpoint
    const mx = (fromPosition.x + toPosition.x) / 2;
    const my = (fromPosition.y + toPosition.y) / 2;

    // Normalized perpendicular vector for curve offset
    const nx = dy / dist;
    const ny = -dx / dist;

    const curveIntensity = Math.min(dist * 0.2, 20);

    const cp1x = fromPosition.x + dx * 0.25 + nx * curveIntensity;
    const cp1y = fromPosition.y + dy * 0.25 + ny * curveIntensity;

    const cp2x = fromPosition.x + dx * 0.75 + nx * curveIntensity;
    const cp2y = fromPosition.y + dy * 0.75 + ny * curveIntensity;

    const pathD = `M ${fromPosition.x},${fromPosition.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${toPosition.x},${toPosition.y}`;

    // Get quality score - handle different data structures
    const qualityScore = edge.quality?.score ?? edge.relationship?.quality ?? 0.5;

    // Determine color based on quality score
    let strokeColor = '#6b7280'; // grey - default
    let glowColor = 'rgba(107, 114, 128, 0.3)';

    if (qualityScore >= 0.7) {
        strokeColor = '#22c55e'; // green
        glowColor = 'rgba(34, 197, 94, 0.4)';
    } else if (qualityScore >= 0.5) {
        strokeColor = '#eab308'; // yellow
        glowColor = 'rgba(234, 179, 8, 0.4)';
    }

    const labelX = mx + nx * curveIntensity * 0.8;
    const labelY = my + ny * curveIntensity * 0.8;

    // Get display text
    const surfaceText = edge.surfaceText || edge.relationship?.surfaceText || '';
    const displayText = surfaceText.length > 18
        ? surfaceText.slice(0, 17) + '…'
        : surfaceText;

    const handleMouseEnter = () => {
        setIsHovered(true);
        onHover?.(edge);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        onHover?.(null);
    };

    return (
        <g
            className={`edge-group ${isNew ? 'edge-new' : ''} ${isHovered ? 'edge-hovered' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'pointer' }}
        >
            {/* Glow effect for new/hovered edges */}
            {(isNew || isHovered) && (
                <path
                    d={pathD}
                    stroke={glowColor}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className="edge-glow"
                />
            )}

            {/* Background stroke for visibility against map */}
            <path
                d={pathD}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
            />

            {/* Main colored stroke */}
            <path
                d={pathD}
                stroke={strokeColor}
                strokeWidth={isHovered ? 3 : 2}
                fill="none"
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
                className="edge-main"
            />

            {/* Animated dash for new edges */}
            {isNew && (
                <path
                    d={pathD}
                    stroke="white"
                    strokeWidth="1"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="4 8"
                    className="edge-sparkle"
                />
            )}

            {/* Label with improved styling */}
            {surfaceText && (
                <g transform={`translate(${labelX}, ${labelY})`}>
                    {/* Label background with rounded corners */}
                    <rect
                        x="-50"
                        y="-12"
                        width="100"
                        height="24"
                        rx="6"
                        fill={isHovered ? 'rgba(22, 19, 15, 0.95)' : 'rgba(0,0,0,0.85)'}
                        stroke={isHovered ? strokeColor : 'rgba(226, 214, 191, 0.2)'}
                        strokeWidth="1"
                    />

                    {/* Quality indicator dot */}
                    <circle
                        cx="-38"
                        cy="0"
                        r="3"
                        fill={strokeColor}
                    />

                    {/* Label text */}
                    <text
                        x="4"
                        y="4"
                        textAnchor="middle"
                        fill={isHovered ? '#e2d6bf' : 'rgba(226, 214, 191, 0.85)'}
                        fontSize={isHovered ? '11' : '10'}
                        fontFamily="'Space Mono', monospace"
                        style={{ pointerEvents: 'none' }}
                    >
                        {isHovered ? surfaceText.slice(0, 25) + (surfaceText.length > 25 ? '…' : '') : displayText}
                    </text>
                </g>
            )}

            {/* Full tooltip on hover */}
            {isHovered && surfaceText.length > 25 && (
                <g transform={`translate(${labelX}, ${labelY + 28})`}>
                    <rect
                        x={-Math.min(surfaceText.length * 3.5, 100)}
                        y="-10"
                        width={Math.min(surfaceText.length * 7, 200)}
                        height="20"
                        rx="4"
                        fill="rgba(22, 19, 15, 0.98)"
                        stroke={strokeColor}
                        strokeWidth="1"
                    />
                    <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill="#e2d6bf"
                        fontSize="9"
                        fontFamily="'Space Mono', monospace"
                    >
                        {surfaceText}
                    </text>
                </g>
            )}
        </g>
    );
};

export default EdgeLine;

import React from 'react';

const EdgeLine = ({ edge, fromPosition, toPosition, isNew = false }) => {
    // If positions aren't available, don't render
    if (!fromPosition || !toPosition) return null;

    // Calculate control points for a nice Bezier curve
    // We want the curve to go "up and over" or behave like a thread
    const dx = toPosition.x - fromPosition.x;
    const dy = toPosition.y - fromPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Midpoint
    const mx = (fromPosition.x + toPosition.x) / 2;
    const my = (fromPosition.y + toPosition.y) / 2;

    // Control point slightly offset to create curve
    // Offset depends on angle, but simple "lift" works well for top-down views sometimes
    // Or we can just do a quadratic curve
    // Let's try a cubic bezier with two control points slightly perpendicular to the line

    // Normalized vector
    const nx = dy / dist;
    const ny = -dx / dist;

    const curveIntensity = Math.min(dist * 0.2, 20); // Scale curve with distance

    const cp1x = fromPosition.x + dx * 0.25 + nx * curveIntensity;
    const cp1y = fromPosition.y + dy * 0.25 + ny * curveIntensity;

    const cp2x = fromPosition.x + dx * 0.75 + nx * curveIntensity;
    const cp2y = fromPosition.y + dy * 0.75 + ny * curveIntensity;

    const pathD = `M ${fromPosition.x},${fromPosition.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${toPosition.x},${toPosition.y}`;

    // Determine color based on quality score
    let strokeColor = '#6b7280'; // grey
    if (edge.relationship?.quality >= 0.7) strokeColor = '#22c55e'; // green
    else if (edge.relationship?.quality >= 0.5) strokeColor = '#eab308'; // yellow

    const labelX = mx + nx * curveIntensity * 0.8;
    const labelY = my + ny * curveIntensity * 0.8;

    return (
        <g className={`edge-group ${isNew ? 'edge-new' : ''}`}>
            {/* Background stroke for visibility against map */}
            <path
                d={pathD}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
            />
            {/* Maincolored stroke */}
            <path
                d={pathD}
                stroke={strokeColor}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                markerEnd="url(#arrowhead)"
            />

            {/* Label */}
            {edge.relationship?.surfaceText && (
                <g transform={`translate(${labelX}, ${labelY})`}>
                    <rect
                        x="-40" y="-10" width="80" height="20" rx="4"
                        fill="rgba(0,0,0,0.8)"
                    />
                    <text
                        x="0" y="4"
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontFamily="Space Mono, monospace"
                        style={{ pointerEvents: 'none' }}
                    >
                        {edge.relationship.surfaceText.length > 15
                            ? edge.relationship.surfaceText.slice(0, 14) + '…'
                            : edge.relationship.surfaceText}
                    </text>
                </g>
            )}
        </g>
    );
};

export default EdgeLine;

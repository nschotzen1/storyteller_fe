import React, { useEffect, useState, useMemo } from 'react';
import { useMuralContext } from '../context/MuralContext';
import { NAVIGATION_MAP } from '../navigationConfig';
import WallSegment from './WallSegment';
import InspectionOverlay from './InspectionOverlay';

/**
 * CylinderScene
 * 
 * Renders the 8 wall segments in a circle (octagon).
 * Rotates the entire world around the center to face the current node.
 */
const CylinderScene = () => {
    const { currentNodeId, navigate, murals, me, uninspectMural } = useMuralContext();
    const [inspectingId, setInspectingId] = useState(null);

    // Keyboard Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                navigate(e.key);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    // Occupation Listener
    useEffect(() => {
        if (!me) return;
        const myInspection = murals.find(m => m.status === 'occupied' && m.occupiedBy === me.id);
        if (myInspection) setInspectingId(myInspection.id);
    }, [murals, me]);

    const closeInspection = () => {
        if (inspectingId) uninspectMural(inspectingId);
        setInspectingId(null);
    };

    // --- 3D MATH ---
    // 8 Segments
    // Width = 1200px (from WallSegment.jsx)
    // Angle per segment = 360 / 8 = 45 degrees
    // Radius R = (Width / 2) / tan(45/2) 
    // tan(22.5 deg) approx 0.414
    // R = 600 / 0.414 = 1449px (approx 1450)
    const RADIUS = 1500; // Slightly looser for better gap handling
    const SEGMENT_WIDTH = 1200;

    const currentNode = NAVIGATION_MAP[currentNodeId];
    const targetAngle = currentNode ? currentNode.angle : 0;

    // Convert map to array for rendering
    const allNodes = useMemo(() => Object.values(NAVIGATION_MAP), []);

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden flex items-center justify-center">

            {/* Info HUD */}
            <div className="absolute top-4 left-4 z-50 text-white/50 font-mono pointer-events-none">
                LOCATION: {currentNode?.direction.toUpperCase()} {currentNode?.segment}
                <br />
                ANGLE: {targetAngle}°
            </div>

            {/* 3D Viewport */}
            <div
                className="relative w-full h-full perspective-3d"
                style={{ perspective: '1200px' }}
            >
                {/* World Rotator */}
                <div
                    className="absolute inset-0 transform-style-3d transition-transform duration-1000 ease-in-out"
                    style={{
                        transform: `translateZ(${-RADIUS}px) rotateY(${-targetAngle}deg)`
                    }}
                >
                    {allNodes.map((node) => (
                        <div
                            key={node.id}
                            className="absolute top-1/2 left-1/2 transform-style-3d backface-hidden"
                            style={{
                                width: `${SEGMENT_WIDTH}px`,
                                height: '800px',
                                marginLeft: `-${SEGMENT_WIDTH / 2}px`,
                                marginTop: '-400px',
                                transform: `rotateY(${node.angle}deg) translateZ(${RADIUS}px)`
                            }}
                        >
                            <WallSegment
                                direction={node.direction}
                                segment={node.segment}
                                imageSrc={node.image}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Overlay */}
            {inspectingId && (
                <InspectionOverlay muralId={inspectingId} onClose={closeInspection} />
            )}
        </div>
    );
};

export default CylinderScene;

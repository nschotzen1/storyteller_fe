import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * useRotationalNavigation
 * Manages the rotation angle of the camera/player in the circular room.
 * 
 * Features:
 * - 0-360 degrees
 * - Snaps to 0 (N), 90 (E), 180 (S), 270 (W)
 * - Smooth animation
 * - Input handling (Arrows, Drag)
 */
export const useRotationalNavigation = () => {
    const [rotation, setRotation] = useState(0); // Degrees
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef(null);
    const currentRotationRef = useRef(0);

    // Initialize ref
    useEffect(() => { currentRotationRef.current = rotation; }, [rotation]);

    const CARDINAL_ANGLES = [0, 90, 180, 270];

    // Snap to nearest cardinal direction
    const snapToNearest = useCallback(() => {
        let current = currentRotationRef.current % 360;
        if (current < 0) current += 360;

        let closest = CARDINAL_ANGLES[0];
        let minDiff = Math.abs(current - closest);

        // Also check 360 as 0
        if (Math.abs(current - 360) < minDiff) {
            closest = 0; // Effectively 360
            minDiff = Math.abs(current - 360);
        }

        for (let angle of CARDINAL_ANGLES) {
            const diff = Math.abs(current - angle);
            if (diff < minDiff) {
                minDiff = diff;
                closest = angle;
            }
        }

        // Animate to closest (simplified setter for now)
        setRotation(closest);
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') {
                const next = Math.round((currentRotationRef.current + 90) / 90) * 90;
                setRotation(prev => prev + 90);
            } else if (e.key === 'ArrowLeft') {
                const next = Math.round((currentRotationRef.current - 90) / 90) * 90;
                setRotation(prev => prev - 90);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Simple drag visualizer (can be expanded heavily)
    const onDragStart = (clientX) => {
        setIsDragging(true);
        dragStartRef.current = { x: clientX, initialRot: rotation };
    };

    const onDragMove = (clientX) => {
        if (!isDragging || !dragStartRef.current) return;

        const deltaX = clientX - dragStartRef.current.x;
        const SENSITIVITY = 0.5; // Degrees per pixel

        setRotation(dragStartRef.current.initialRot + deltaX * SENSITIVITY);
    };

    const onDragEnd = () => {
        setIsDragging(false);
        dragStartRef.current = null;
        snapToNearest(); // Snap after drag release
    };

    return {
        rotation,
        setRotation,
        dragHandlers: {
            onMouseDown: (e) => onDragStart(e.clientX),
            // Note: Move/Up usually need to be on window to catch exit
            // but for simplicity we return helper functions to be bound
        },
        manualDragStart: onDragStart,
        manualDragMove: onDragMove,
        manualDragEnd: onDragEnd
    };
};

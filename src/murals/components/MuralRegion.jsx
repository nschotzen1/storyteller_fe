import React, { useMemo } from 'react';
import { useMuralContext } from '../context/MuralContext';

/**
 * MuralRegion
 * An interactive zone within the wall segment.
 * 
 * Props:
 * - data: { id, direction, segment, index, status, occupiedBy, lockedBy }
 * - x, y, width, height: region coordinates (percentage or px)
 */
const MuralRegion = ({ data, x, y, width, height }) => {
    const { me, inspectMural } = useMuralContext();

    const isOccupiedOther = data.status === 'occupied' && data.occupiedBy !== me?.id;
    const isLockedOther = data.status === 'locked' && data.lockedBy !== me?.id;
    const isLockedByMe = data.status === 'locked' && data.lockedBy === me?.id;

    const handleClick = () => {
        if (isOccupiedOther || isLockedOther) return;
        // Trigger inspection
        inspectMural(data.id);
    };

    // Dynamic styles mostly for simulation visualization
    // In real app, this would be invisible interactive layer over the PNG
    // but we add slight visual for debugging/mock
    const regionStyle = {
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
    };

    return (
        <div
            className={`absolute cursor-pointer transition-all duration-500
            ${isOccupiedOther ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-100 opacity-0 hover:bg-white/10'}
            ${isLockedByMe ? 'border-2 border-yellow-400 opacity-100 bg-yellow-400/20' : ''}
            ${isLockedOther ? 'border-2 border-red-900 opacity-40 grayscale' : ''}
        `}
            style={regionStyle}
            onClick={handleClick}
            title={data.id}
        >
            {/* Subtle highlight container */}
            <div className="w-full h-full relative group">

                {/* "Ghost" indicator if occupied */}
                {isOccupiedOther && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-white text-xs opacity-70 animate-pulse">
                        Another Soul
                    </div>
                )}

                {/* Locked indicator */}
                {isLockedOther && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-red-500 font-bold text-xl opacity-50">LOCKED</span>
                    </div>
                )}

                {/* Me indicator */}
                {isLockedByMe && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-yellow-300 font-bold text-xl drop-shadow-md">CHOSEN</span>
                    </div>
                )}

                {/* Hover details (simulate "cracks becoming clearer") */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            </div>
        </div>
    );
};

export default MuralRegion;

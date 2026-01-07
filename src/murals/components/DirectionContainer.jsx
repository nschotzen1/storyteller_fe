import React from 'react';
import WallSegment from './WallSegment';

/**
 * DirectionContainer
 * Wraps the two segments (A and B) for a single cardinal direction.
 * This unit is 90 degrees of the full circle.
 */
const DirectionContainer = ({ direction, rotationOffset, segmentImages }) => {
    return (
        <div
            className="absolute top-0 left-0 h-full flex items-center justify-center transform-style-3d backface-hidden"
            style={{
                width: '4000px', // Large circumference simulation
                transform: `rotateY(${rotationOffset}deg) translateZ(1000px)`
                // translateZ pushes it out to form the circle. 
                // NOTE: Precise math needed for perfect cylinder, but for visual mockup this works
                // If circumference is C, radius r = C / 2pi.
            }}
        >
            {/* Inner flex to hold Side A and Side B side-by-side */}
            <div className="flex flex-row gap-0">
                <WallSegment
                    direction={direction}
                    segment="A"
                    imageSrc={segmentImages?.A}
                />
                <WallSegment
                    direction={direction}
                    segment="B"
                    imageSrc={segmentImages?.B}
                />
            </div>
        </div>
    );
};

export default DirectionContainer;

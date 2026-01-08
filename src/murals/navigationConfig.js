/**
 * Navigation Map for node-based wall traversal.
 * 
 * Layout assumption (Perimeter):
 *       N1 -- N2
 *      /        \
 *    W2          E1
 *    |           |
 *    W1          E2
 *      \        /
 *       S1 -- S2  (Southeast Corner)
 * 
 * S2 is defined as our starting "Southeast Corner".
 * 
 * Traversal Rules:
 * - Arrow Left/Right: Move laterally along the current wall (or to corner neighbor).
 * - Arrow Up/Down: Move to adjacent wall at corners.
 */

export const NAVIGATION_MAP = {
    // SOUTH WALL
    'south_a': { // S1 (Southwest-ish)
        id: 'south_a',
        direction: 'south',
        segment: 'A',
        image: null, // Placeholder
        angle: 45,
        neighbors: {
            ArrowRight: 'south_b', // Go East towards S2
            ArrowUp: 'west_a',     // Go North to West Wall? (Corner logic)
        }
    },
    'south_b': { // S2 (Southeast Corner) - This is the asset we have
        id: 'south_b',
        direction: 'south',
        segment: 'B',
        image: '/ruin_south_a.png', // User uploaded this as "South East Corner"
        angle: 0,
        neighbors: {
            ArrowLeft: 'south_a',  // Go West along South Wall
            ArrowUp: 'east_a',     // Go North along East Wall
        }
    },

    // EAST WALL
    'east_a': { // E1 (Northeast-ish or Southeast-ish? Let's assume standard grid logic usually E1 is North.. but let's follow user: "Up arrow to start seeing east wall")
        // If we are at S2 (bottom right), Up goes to bottom of Right wall. 
        // Let's call East Wall Bottom 'east_b' to match standard "B is second/bottom/right"? 
        // Actually let's just stick to user saying "North -> East Wall".
        id: 'east_a',
        direction: 'east',
        segment: 'A',
        angle: 315,
        neighbors: {
            ArrowDown: 'south_b', // Go South back to South Wall
            ArrowLeft: 'east_b',  // Move along east wall? Or Up/Down?
            // If traversing specific wall, maybe arrow keys map to wall axis?
            // For East wall (vertical), Up/Down should traverse it?
            // But user said "North [from SE corner] will get me traversing through the east wall".
            // So on East wall, Up traverses further North?
            ArrowUp: 'east_b'
        }
    },
    'east_b': { // E2 (North top of East Wall)
        id: 'east_b',
        direction: 'east',
        segment: 'B',
        angle: 270,
        neighbors: {
            ArrowDown: 'east_a',
            ArrowLeft: 'north_b' // Go West to North Wall (NE Corner)
        }
    },

    // NORTH WALL
    'north_b': { // N2 (East side of North Wall)
        id: 'north_b',
        direction: 'north',
        segment: 'B',
        angle: 225,
        neighbors: {
            ArrowRight: 'east_b', // Go East to East Wall
            ArrowLeft: 'north_a', // Go West along North Wall
        }
    },
    'north_a': { // N1 (West side of North Wall)
        id: 'north_a',
        direction: 'north',
        segment: 'A',
        angle: 180,
        neighbors: {
            ArrowRight: 'north_b',
            ArrowDown: 'west_b', // Go South to West Wall (NW Corner)
        }
    },

    // WEST WALL
    'west_b': { // W2 (North part of West Wall)
        id: 'west_b',
        direction: 'west',
        segment: 'B',
        angle: 135,
        neighbors: {
            ArrowUp: 'north_a',   // Go North to North Wall
            ArrowDown: 'west_a',  // Go South along West Wall
        }
    },
    'west_a': { // W1 (South part of West Wall)
        id: 'west_a',
        direction: 'west',
        segment: 'A',
        angle: 90,
        neighbors: {
            ArrowUp: 'west_b',
            ArrowRight: 'south_a' // Go East to South Wall (SW Corner)
        }
    },
};

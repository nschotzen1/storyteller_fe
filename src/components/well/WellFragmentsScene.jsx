import React, { useState, useEffect, useRef, useCallback } from 'react';
import './WellFragmentsScene.css';

/**
 * WellFragmentsScene Component
 * 
 * Renders a well background with fragments surfacing, floating, and sinking.
 * 
 * Props:
 * - backgroundSrc: string (URL for background)
 * - fragmentSpriteKeys: string[] (Array of available fragment sprite filenames without extension)
 * - fetchFragment: () => Promise<FragmentApiPayload>
 * - onSave: (savedFragment) => void
 * - minFloatSeconds: number (default 5)
 * - maxFloatSeconds: number (default 10)
 * - disableAutoLoop: boolean (optional)
 */
const WellFragmentsScene = ({
    backgroundSrc,
    fragmentSpriteKeys = ['fragment_01'],
    fetchFragment,
    onSave,
    minFloatSeconds = 5,
    maxFloatSeconds = 10,
    disableAutoLoop = false,
}) => {
    // --- STATE ---
    const [currentFragment, setCurrentFragment] = useState(null);
    const [phase, setPhase] = useState('idle'); // idle | surfacing | floating | sinking | captured

    // --- REFS ---
    // Store timeouts to clear on unmount
    const timeoutsMs = useRef([]);
    // Track if component is mounted
    const isMounted = useRef(true);

    // --- HELPERS ---
    const addTimeout = (cb, delay) => {
        const id = setTimeout(() => {
            // Remove from list when done
            timeoutsMs.current = timeoutsMs.current.filter((t) => t !== id);
            cb();
        }, delay);
        timeoutsMs.current.push(id);
        return id;
    };

    const clearAllTimeouts = () => {
        timeoutsMs.current.forEach((id) => clearTimeout(id));
        timeoutsMs.current = [];
    };

    const getRandomSpriteKey = () => {
        if (!fragmentSpriteKeys || fragmentSpriteKeys.length === 0) return 'fragment_01';
        const idx = Math.floor(Math.random() * fragmentSpriteKeys.length);
        return fragmentSpriteKeys[idx];
    };

    // --- LIFECYCLE ---

    const spawnFragment = useCallback(async () => {
        if (!isMounted.current) return;

        // Reset state
        setPhase('idle');
        setCurrentFragment(null);

        try {
            // 1. Fetch data
            const payload = await fetchFragment();

            if (!isMounted.current) return;

            // 2. Prepare instance
            const durationSeconds = payload.seconds_surfacing ||
                (minFloatSeconds + Math.random() * (maxFloatSeconds - minFloatSeconds));
            const durationMs = durationSeconds * 1000;

            const newFragment = {
                ...payload,
                spriteKey: getRandomSpriteKey(),
                durationMs,
                createdAt: Date.now(),
                // Position & Rotation - Subtle variation around the well center
                x: 47 + Math.random() * 6, // 47% to 53%
                y: 62 + Math.random() * 8, // 62% to 70%
                rot: -4 + Math.random() * 8, // -4 to +4 deg
                scale: 0.35 + Math.random() * 0.20, // 0.35 to 0.55 (Much smaller/Distant)
            };

            setCurrentFragment(newFragment);

            // 3. Start Animation cycle
            // Phase A: Surface
            setPhase('surfacing');
            // Assume surface animation takes ~1.2s in CSS
            const SURFACE_MS = 1200;

            addTimeout(() => {
                if (!isMounted.current) return;

                // Phase B: Float
                setPhase('floating');

                // Schedule Sink
                addTimeout(() => {
                    if (!isMounted.current) return;
                    if (phase === 'captured') return; // Safety check

                    // Phase C: Sink
                    setPhase('sinking');

                    // Assume sink animation takes ~2s
                    const SINK_MS = 2000;

                    addTimeout(() => {
                        // Loop
                        if (!disableAutoLoop && isMounted.current) {
                            spawnFragment();
                        }
                    }, SINK_MS);

                }, durationMs);

            }, SURFACE_MS);

        } catch (err) {
            console.error("Failed to spawn fragment:", err);
            // Retry after delay
            addTimeout(() => {
                if (!disableAutoLoop && isMounted.current) spawnFragment();
            }, 3000);
        }
    }, [fetchFragment, fragmentSpriteKeys, minFloatSeconds, maxFloatSeconds, disableAutoLoop]); // Added refs to dep array but they are stable

    // Initial spawn
    useEffect(() => {
        isMounted.current = true;
        spawnFragment();

        return () => {
            isMounted.current = false;
            clearAllTimeouts();
        };
    }, [spawnFragment]); // Re-run if spawnFragment changes (dependencies change)


    // --- HANDLERS ---

    const handleFragmentClick = (e) => {
        // Only save if floating (or surfacing) and not already captured/sinking
        if (phase !== 'floating' && phase !== 'surfacing') return;
        if (!currentFragment) return;

        // Prevent double clicking
        setPhase('captured');
        clearAllTimeouts(); // Stop the sinking timer

        if (onSave) {
            const saved = {
                ...currentFragment,
                savedAt: Date.now(),
            };
            onSave(saved);
        }

        // After capture animation (~0.8s), spawn next
        const CAPTURE_MS = 800;
        setTimeout(() => {
            if (isMounted.current && !disableAutoLoop) {
                spawnFragment();
            }
        }, CAPTURE_MS);
    };

    // --- RENDER ---

    return (
        <div className="wellScene">
            {/* Background Layer */}
            {backgroundSrc && (
                <img className="wellBg" src={backgroundSrc} alt="Well Interior" />
            )}

            {/* Text Layer */}
            {currentFragment && (
                <div
                    key={currentFragment.id}
                    className={`wellTextLayer ${phase}`}
                    style={{
                        left: `${currentFragment.x}%`,
                        top: `${currentFragment.y}%`,
                        transform: `translate(-50%, -50%) rotate(${currentFragment.rot}deg)`,
                    }}
                    onClick={handleFragmentClick}
                >
                    <div
                        className="wellText"
                        data-text={currentFragment.text}
                        style={{
                            fontSize: `${Math.max(currentFragment.size || 0, 42)}px`,
                            fontFamily: currentFragment.font
                        }}
                    >
                        {currentFragment.text}
                    </div>
                </div>
            )}

            {/* Debug / UI Overlay (Optional) */}
            {/* <div style={{position:'absolute', top: 10, left: 10, color: 'white'}}>
            Phase: {phase}
        </div> */}
        </div>
    );
};

export default WellFragmentsScene;

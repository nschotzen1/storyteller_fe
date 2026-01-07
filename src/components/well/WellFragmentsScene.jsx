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
                // Position & Scale - Centered and Smaller (Distant)
                x: 45 + Math.random() * 10, // 45% to 55% (Center)
                y: 45 + Math.random() * 10, // 45% to 55% (Center)
                rot: -10 + Math.random() * 20, // -10 to +10 deg
                scale: 0.55 + Math.random() * 0.20, // 0.55 to 0.75 (Smaller/Deeper)
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

    const getFragmentStyle = () => {
        if (!currentFragment) return {};
        return {
            left: `${currentFragment.x}%`,
            top: `${currentFragment.y}%`,
            transform: `translate(-50%, -50%) rotate(${currentFragment.rot}deg) scale(${currentFragment.scale})`,
            fontFamily: currentFragment.font,
            color: currentFragment.color || '#423d33',
        };
    };

    return (
        <div className="wellScene">
            {/* Background Layer */}
            {backgroundSrc && (
                <img className="wellBg" src={backgroundSrc} alt="Well Interior" />
            )}

            {/* Fragment Layer */}
            {currentFragment && (
                <div
                    key={currentFragment.id}
                    className={`fragment ${phase}`}
                    style={getFragmentStyle()}
                    onClick={handleFragmentClick}
                >
                    <img
                        className="fragmentImg"
                        src={`/well/fragments/${currentFragment.spriteKey}.png`}
                        alt="Paper Fragment"
                        draggable={false}
                    />
                    <div
                        className="fragmentText"
                        style={{
                            fontSize: `${currentFragment.size}px`,
                            fontFamily: currentFragment.font,
                            color: currentFragment.color
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

import React, { useEffect } from 'react';
import { MuralProvider, useMuralContext } from '../context/MuralContext';
import CylinderScene from './CylinderScene';

/**
 * MuralStage
 * Wrapper for the scene
 */
const MuralStage = () => {
    return (
        <MuralProvider>
            <WrappedScene />
        </MuralProvider>
    );
};

const WrappedScene = () => {
    const { joinSession, me } = useMuralContext();
    useEffect(() => {
        if (!me) joinSession("traveler_" + Math.floor(Math.random() * 1000));
    }, [joinSession, me]);

    if (!me) return <div className="text-white flex items-center justify-center h-screen">Connecting...</div>;

    return <CylinderScene />;
};

export default MuralStage;

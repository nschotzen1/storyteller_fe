import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { muralApi } from '../api.mock';
import { NAVIGATION_MAP } from '../navigationConfig';

const MuralContext = createContext(null);

export const MuralProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [me, setMe] = useState(null);
    const [murals, setMurals] = useState([]);
    const [currentNodeId, setCurrentNodeId] = useState('south_b'); // Start at SE Corner

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Polling for state updates
    useEffect(() => {
        if (!session) return;
        const interval = setInterval(async () => {
            try {
                const state = await muralApi.getSessionState();
                setMurals(state.murals);
            } catch (err) {
                console.error("Polling error", err);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [session]);

    const joinSession = useCallback(async (playerName) => {
        setLoading(true);
        try {
            const res = await muralApi.joinSession(playerName);
            setSession(res.sessionId);
            setMe({ id: res.playerId, name: playerName });
            setMurals(res.state.murals);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const inspectMural = useCallback(async (muralId) => {
        if (!me) return { success: false, reason: "Not logged in" };
        try {
            const res = await muralApi.inspectMural(muralId, me.id);
            if (res.success) {
                setMurals(prev => prev.map(m =>
                    m.id === muralId ? { ...m, status: 'occupied', occupiedBy: me.id } : m
                ));
            }
            return res;
        } catch (err) {
            console.error(err);
            return { success: false, reason: "Network error" };
        }
    }, [me]);

    const uninspectMural = useCallback(async (muralId) => {
        if (!me) return;
        await muralApi.uninspectMural(muralId, me.id);
        setMurals(prev => prev.map(m =>
            m.id === muralId && m.occupiedBy === me.id ? { ...m, status: 'available', occupiedBy: null } : m
        ));
    }, [me]);

    const lockMural = useCallback(async (muralId) => {
        if (!me) return { success: false };
        const res = await muralApi.lockMural(muralId, me.id);
        if (res.success) {
            setMurals(prev => prev.map(m =>
                m.id === muralId ? { ...m, status: 'locked', lockedBy: me.id } : m
            ));
            setMe(prev => ({ ...prev, lockedMuralId: muralId }));
        }
        return res;
    }, [me]);

    const navigate = useCallback((key) => {
        const current = NAVIGATION_MAP[currentNodeId];
        if (current && current.neighbors[key]) {
            console.log(`Navigating from ${currentNodeId} to ${current.neighbors[key]} via ${key}`);
            setCurrentNodeId(current.neighbors[key]);
        } else {
            console.log("No path for", key);
        }
    }, [currentNodeId]);

    const value = {
        session,
        me,
        murals,
        currentNodeId,
        navigate,
        loading,
        error,
        joinSession,
        inspectMural,
        uninspectMural,
        lockMural
    };

    return <MuralContext.Provider value={value}>{children}</MuralContext.Provider>;
};

export const useMuralContext = () => {
    const context = useContext(MuralContext);
    if (!context) throw new Error("useMuralContext must be used within MuralProvider");
    return context;
};

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEV_OVERRIDE_VENUE_ID } from '../config/devVenueOverride';
import { supabase } from '../config/supabase';
import { authService } from '../services/auth';
import { ensureVenueFromSignupMetadata, resolveVenueForUser } from '../services/venuePortal';
import { withTimeout } from '../utils/withTimeout';

const VENUE_REFRESH_TIMEOUT_MS = 26000;

type VenuePortalContextValue = {
    venueId: string | null;
    venueName: string | null;
    /** Signed-in auth user id (for linking venue in Supabase). */
    authUserId: string | null;
    loading: boolean;
    error: string | null;
    /** Resolves venue again; returns linked venue UUID or null. */
    refresh: () => Promise<string | null>;
};

const VenuePortalContext = createContext<VenuePortalContextValue | null>(null);

export function VenuePortalProvider({ children }: { children: React.ReactNode }) {
    const [venueId, setVenueId] = useState<string | null>(null);
    const [venueName, setVenueName] = useState<string | null>(null);
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async (): Promise<string | null> => {
        setLoading(true);
        setError(null);
        try {
            const venueIdResult = await withTimeout(
                (async (): Promise<string | null> => {
                    const {
                        data: { user },
                    } = await supabase.auth.getUser();
                    setAuthUserId(user?.id ?? null);
                    if (!user) {
                        setVenueId(null);
                        setVenueName(null);
                        setError('Not signed in');
                        return null;
                    }
                    let resolved = await resolveVenueForUser(user.id);
                    if (!resolved.venueId) {
                        await ensureVenueFromSignupMetadata(user);
                        resolved = await resolveVenueForUser(user.id);
                    }
                    if (!resolved.venueId) {
                        try {
                            const raw = await AsyncStorage.getItem('user');
                            if (raw) {
                                const c = JSON.parse(raw) as { id?: string; app_venue_id?: string | null };
                                if (
                                    c?.id === user.id &&
                                    typeof c.app_venue_id === 'string' &&
                                    c.app_venue_id.length >= 8
                                ) {
                                    const { data: v } = await supabase
                                        .from('venues')
                                        .select('id, name')
                                        .eq('id', c.app_venue_id)
                                        .maybeSingle();
                                    if (v?.id) {
                                        resolved = { venueId: v.id, venueName: v.name ?? null };
                                    }
                                }
                            }
                        } catch {
                            /* ignore */
                        }
                    }
                    if (!resolved.venueId && DEV_OVERRIDE_VENUE_ID?.trim()) {
                        const vid = DEV_OVERRIDE_VENUE_ID.trim();
                        const { data: v } = await supabase
                            .from('venues')
                            .select('id, name')
                            .eq('id', vid)
                            .maybeSingle();
                        if (v?.id) {
                            resolved = { venueId: v.id, venueName: v.name ?? null };
                        }
                    }
                    setVenueId(resolved.venueId);
                    setVenueName(resolved.venueName);
                    if (resolved.venueId) {
                        void authService.refreshUserCache().catch(() => {});
                    }
                    if (!resolved.venueId) {
                        setError(
                            'No venue linked to this account. Use venue owner sign-up, or set profiles.venue_id to your venue UUID in Supabase.'
                        );
                    }
                    return resolved.venueId;
                })(),
                VENUE_REFRESH_TIMEOUT_MS,
                'Loading your venue timed out. Check network and Supabase settings.'
            );
            return venueIdResult;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load venue';
            setError(msg);
            setVenueId(null);
            setVenueName(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const value = useMemo(
        () => ({ venueId, venueName, authUserId, loading, error, refresh }),
        [venueId, venueName, authUserId, loading, error, refresh]
    );

    return <VenuePortalContext.Provider value={value}>{children}</VenuePortalContext.Provider>;
}

export function useVenuePortal() {
    const ctx = useContext(VenuePortalContext);
    if (!ctx) {
        throw new Error('useVenuePortal must be used inside VenuePortalProvider');
    }
    return ctx;
}

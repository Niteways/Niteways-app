import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { createVenueAndLinkProfile, ensureVenueFromSignupMetadata } from './venuePortal';
import { withTimeout } from '../utils/withTimeout';

const SIGN_IN_AUTH_TIMEOUT_MS = 32000;
const SIGN_IN_SYNC_TIMEOUT_MS = 18000;
const GET_ROLE_SYNC_TIMEOUT_MS = 16000;

export type AppRole = 'guest' | 'venue_owner';

async function syncAndStoreUser(user: any): Promise<void> {
    const metaRole = user?.user_metadata?.role;
    let { data: row } = await supabase
        .from('profiles')
        .select('role, venue_id')
        .eq('id', user.id)
        .maybeSingle();

        if (metaRole === 'venue_owner') {
        if (row && row.role !== 'venue_owner') {
            await supabase.from('profiles').update({ role: 'venue_owner' }).eq('id', user.id);
        }
        if (!row) {
            await supabase.from('profiles').upsert(
                { id: user.id, role: 'venue_owner' },
                { onConflict: 'id' }
            );
        }
    }

    if (metaRole === 'venue_owner' || row?.role === 'venue_owner') {
        await ensureVenueFromSignupMetadata(user);
    }

    const { data: row2, error: rowErr } = await supabase
        .from('profiles')
        .select('role, venue_id')
        .eq('id', user.id)
        .maybeSingle();

    if (rowErr) {
        const fallback: AppRole = metaRole === 'venue_owner' ? 'venue_owner' : 'guest';
        await AsyncStorage.setItem(
            'user',
            JSON.stringify({ ...user, app_role: fallback, app_venue_id: null })
        );
        return;
    }

    const role: AppRole =
        row2?.role === 'venue_owner' || metaRole === 'venue_owner' ? 'venue_owner' : 'guest';
    const venueId = row2?.venue_id ?? null;
    const extended = { ...user, app_role: role, app_venue_id: venueId };
    await AsyncStorage.setItem('user', JSON.stringify(extended));
}

export const authService = {
    async signUp(data: {
        firstName: string;
        lastName: string;
        email: string;
        mobile: string;
        password: string;
    }): Promise<any> {
        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    mobile: data.mobile,
                    role: 'guest',
                },
            },
        });

        if (error) throw error;

        if (authData.user && authData.session) {
            await supabase.from('profiles').update({ role: 'guest' }).eq('id', authData.user.id);
            await syncAndStoreUser(authData.user);
        }

        return authData;
    },

    /**
     * Venue owner registration (Phase 1 — profile role only; venue row in Phase 2).
     */
    async signUpVenue(data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        password: string;
        venueName: string;
        cityId: string;
    }): Promise<any> {
        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    mobile: data.phone,
                    role: 'venue_owner',
                    venue_name: data.venueName,
                    venue_city_id: data.cityId,
                },
            },
        });

        if (error) throw error;

        const user = authData.user;
        if (user && authData.session) {
            const { error: upErr } = await supabase
                .from('profiles')
                .update({ role: 'venue_owner' })
                .eq('id', user.id);

            if (upErr) {
                await supabase.from('profiles').upsert(
                    { id: user.id, role: 'venue_owner' },
                    { onConflict: 'id' }
                );
            }

            const { venueUuid, error: venueErr } = await createVenueAndLinkProfile({
                ownerUserId: user.id,
                venueName: data.venueName,
                cityId: data.cityId,
                ownerEmail: data.email,
                ownerPhone: data.phone?.trim() || null,
            });
            if (venueErr || !venueUuid) {
                throw new Error(
                    venueErr || 'Could not register your venue. Check your connection and try again.'
                );
            }

            await syncAndStoreUser(user);
        }

        return authData;
    },

    async signIn(email: string, password: string): Promise<any> {
        if (__DEV__) {
            // Helps verify the native bundle picked up react-native-config values (requires rebuild after editing .env).
            console.warn('[authService.signIn] Supabase URL:', supabase.supabaseUrl);
        }

        const { data, error } = await withTimeout(
            supabase.auth.signInWithPassword({
                email,
                password,
            }),
            SIGN_IN_AUTH_TIMEOUT_MS,
            'Cannot reach the server (timed out). Check internet, confirm mobile-app/.env has the correct SUPABASE_URL and SUPABASE_ANON_KEY, then rebuild the native app (not just Metro refresh).'
        );

        if (error) throw error;

        if (data.user) {
            try {
                await withTimeout(
                    syncAndStoreUser(data.user),
                    SIGN_IN_SYNC_TIMEOUT_MS,
                    'Profile sync timed out.'
                );
            } catch (syncErr: unknown) {
                const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
                console.warn('[authService.signIn] syncAndStoreUser:', msg);
                const metaRole = data.user.user_metadata?.role;
                const fallback: AppRole = metaRole === 'venue_owner' ? 'venue_owner' : 'guest';
                await AsyncStorage.setItem(
                    'user',
                    JSON.stringify({
                        ...data.user,
                        app_role: fallback,
                        app_venue_id: null,
                    })
                );
            }
        }

        return data;
    },

    async getAppRole(): Promise<AppRole> {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return 'guest';

        const raw = await AsyncStorage.getItem('user');
        if (raw) {
            try {
                const cached = JSON.parse(raw);
                if (
                    cached.id === session.user.id &&
                    (cached.app_role === 'venue_owner' || cached.app_role === 'guest')
                ) {
                    return cached.app_role;
                }
            } catch {
                /* ignore */
            }
        }

        try {
            await withTimeout(
                syncAndStoreUser(session.user),
                GET_ROLE_SYNC_TIMEOUT_MS,
                'getAppRole sync timed out'
            );
        } catch (e: unknown) {
            console.warn('[authService.getAppRole]', e);
            return session.user.user_metadata?.role === 'venue_owner' ? 'venue_owner' : 'guest';
        }

        const raw2 = await AsyncStorage.getItem('user');
        if (raw2) {
            try {
                const c = JSON.parse(raw2);
                if (c.app_role === 'venue_owner') return 'venue_owner';
            } catch {
                /* ignore */
            }
        }
        return 'guest';
    },

    async getProfile(): Promise<any> {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    async updateProfile(data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        mobile?: string;
        birthday?: string;
    }): Promise<any> {
        const { data: curAuth } = await supabase.auth.getUser();
        const cur = curAuth.user;

        const meta: Record<string, unknown> = {};
        if (data.firstName !== undefined) meta.first_name = data.firstName;
        if (data.lastName !== undefined) meta.last_name = data.lastName;
        if (data.mobile !== undefined) meta.mobile = data.mobile;
        if (data.birthday !== undefined) meta.birthday = data.birthday;

        const attrs: { email?: string; data?: Record<string, unknown> } = {};
        if (Object.keys(meta).length > 0) attrs.data = meta;

        const nextEmail = data.email?.trim().toLowerCase();
        if (nextEmail && cur?.email && cur.email.toLowerCase() !== nextEmail) {
            attrs.email = nextEmail;
        }

        const hasData = attrs.data && Object.keys(attrs.data).length > 0;
        const hasEmail = !!attrs.email;
        if (!hasData && !hasEmail) {
            if (!cur) throw new Error('Not signed in');
            return cur;
        }

        const { data: updated, error } = await supabase.auth.updateUser(attrs);

        if (error) throw error;

        if (updated.user) {
            await syncAndStoreUser(updated.user);
        }

        return updated.user;
    },

    async logout(): Promise<void> {
        await supabase.auth.signOut();
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('authToken');
    },

    async isAuthenticated(): Promise<boolean> {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    },

    async getStoredUser(): Promise<any | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            const userStr = await AsyncStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        }

        const raw = await AsyncStorage.getItem('user');
        if (raw) {
            const cached = JSON.parse(raw);
            if (cached.id === session.user.id) {
                return cached;
            }
        }

        await syncAndStoreUser(session.user);
        const raw2 = await AsyncStorage.getItem('user');
        return raw2 ? JSON.parse(raw2) : session.user;
    },

    async resetPassword(email: string): Promise<void> {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    },

    /** Call after cold start when session exists but cache is empty */
    async refreshUserCache(): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await syncAndStoreUser(session.user);
        }
    },
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { isMissingSchemaTableError } from '../utils/supabasePostgrestErrors';

/**
 * Per-user notification preferences (Settings > Notifications tab).
 * Source of truth: public.user_notification_prefs (RLS: own row only).
 * AsyncStorage is a cache keyed per user id for instant UI + offline safety.
 */

export type NotificationPrefs = {
    newBookingAlerts: boolean;
    vipGuestArrivals: boolean;
    securityAlerts: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
    newBookingAlerts: true,
    vipGuestArrivals: true,
    securityAlerts: true,
};

const CACHE_PREFIX = '@venue_notification_prefs_v1:';

function cacheKey(userId: string): string {
    return `${CACHE_PREFIX}${userId}`;
}

function rowToPrefs(row: {
    new_booking_alerts?: boolean | null;
    vip_guest_arrivals?: boolean | null;
    security_alerts?: boolean | null;
}): NotificationPrefs {
    return {
        newBookingAlerts: row.new_booking_alerts ?? DEFAULT_NOTIFICATION_PREFS.newBookingAlerts,
        vipGuestArrivals: row.vip_guest_arrivals ?? DEFAULT_NOTIFICATION_PREFS.vipGuestArrivals,
        securityAlerts: row.security_alerts ?? DEFAULT_NOTIFICATION_PREFS.securityAlerts,
    };
}

export async function loadCachedNotificationPrefs(
    userId: string
): Promise<NotificationPrefs | null> {
    try {
        const raw = await AsyncStorage.getItem(cacheKey(userId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
        return {
            newBookingAlerts:
                typeof parsed.newBookingAlerts === 'boolean'
                    ? parsed.newBookingAlerts
                    : DEFAULT_NOTIFICATION_PREFS.newBookingAlerts,
            vipGuestArrivals:
                typeof parsed.vipGuestArrivals === 'boolean'
                    ? parsed.vipGuestArrivals
                    : DEFAULT_NOTIFICATION_PREFS.vipGuestArrivals,
            securityAlerts:
                typeof parsed.securityAlerts === 'boolean'
                    ? parsed.securityAlerts
                    : DEFAULT_NOTIFICATION_PREFS.securityAlerts,
        };
    } catch {
        return null;
    }
}

async function writeCache(userId: string, prefs: NotificationPrefs): Promise<void> {
    try {
        await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(prefs));
    } catch {
        /* cache writes are best-effort */
    }
}

export async function fetchNotificationPrefs(userId: string): Promise<NotificationPrefs> {
    const { data, error } = await supabase
        .from('user_notification_prefs')
        .select('new_booking_alerts, vip_guest_arrivals, security_alerts')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        if (!isMissingSchemaTableError(error)) {
            console.warn('[venueNotificationPrefs] fetch', error.message);
        }
        return { ...DEFAULT_NOTIFICATION_PREFS };
    }
    const prefs = data ? rowToPrefs(data) : { ...DEFAULT_NOTIFICATION_PREFS };
    void writeCache(userId, prefs);
    return prefs;
}

export async function saveNotificationPrefs(
    userId: string,
    prefs: NotificationPrefs
): Promise<{ ok: boolean; error?: string }> {
    void writeCache(userId, prefs);

    const { error } = await supabase.from('user_notification_prefs').upsert(
        {
            user_id: userId,
            new_booking_alerts: prefs.newBookingAlerts,
            vip_guest_arrivals: prefs.vipGuestArrivals,
            security_alerts: prefs.securityAlerts,
        },
        { onConflict: 'user_id' }
    );

    if (error) {
        if (isMissingSchemaTableError(error)) {
            return {
                ok: false,
                error:
                    'Notification preferences table is missing. Run the user_notification_prefs migration in Supabase.',
            };
        }
        console.warn('[venueNotificationPrefs] save', error.message);
        return { ok: false, error: error.message };
    }
    return { ok: true };
}

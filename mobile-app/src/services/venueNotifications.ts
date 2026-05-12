import { supabase } from '../config/supabase';

export type VenueUserNotification = {
    id: string;
    title: string;
    message: string;
    type: string;
    related_id: string | null;
    /** Prefer boolean; Supabase/legacy rows may use null or strings. */
    is_read: boolean;
    created_at: string;
};

/** Stable unread check — only explicit unread states count (not null/missing). */
export function venueNotificationIsUnread(n: { is_read?: boolean | null | unknown }): boolean {
    return n.is_read === false;
}

function normalizedEmail(email: string | null | undefined): string {
    return (email || '').trim().toLowerCase();
}

function coerceNotificationRead(raw: unknown): boolean {
    if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
    return true;
}

/** PostgREST when table is missing on this Supabase project — avoid LogBox noise. */
function isMissingUserNotificationsTable(error: { message?: string; code?: string }): boolean {
    const msg = (error.message || '').toLowerCase();
    const code = error.code || '';
    if (code === 'PGRST205') return true;
    if (msg.includes('user_notifications') && msg.includes('schema cache')) return true;
    if (msg.includes('user_notifications') && msg.includes('does not exist')) return true;
    return false;
}

/** Notifications for the signed-in user (matches `user_notifications` + web user app). */
export async function fetchVenueUserNotifications(
    userId: string,
    email: string | null
): Promise<VenueUserNotification[]> {
    const em = normalizedEmail(email);
    let q = supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (em) {
        q = q.or(`user_id.eq.${userId},user_email.eq.${em}`);
    } else {
        q = q.eq('user_id', userId);
    }

    const { data, error } = await q;
    if (error) {
        if (!isMissingUserNotificationsTable(error)) {
            console.warn('[venueNotifications] fetch', error.message);
        }
        return [];
    }
    return (data || []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
            ...(row as VenueUserNotification),
            is_read: coerceNotificationRead(r.is_read),
        };
    });
}

export async function fetchVenueUnreadNotificationCount(
    userId: string,
    email: string | null
): Promise<number> {
    const list = await fetchVenueUserNotifications(userId, email);
    return list.filter((n) => venueNotificationIsUnread(n)).length;
}

/** Marks every unread row for this user as read (same scope as fetch). */
export async function markAllVenueNotificationsRead(
    userId: string,
    email: string | null
): Promise<{ ok: boolean; error?: string }> {
    const em = normalizedEmail(email);
    let q = supabase.from('user_notifications').update({ is_read: true });
    if (em) {
        q = q.or(`user_id.eq.${userId},user_email.eq.${em}`);
    } else {
        q = q.eq('user_id', userId);
    }
    q = q.or('is_read.eq.false,is_read.is.null');

    const { error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function markVenueNotificationRead(id: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export function subscribeVenueUserNotifications(
    userId: string,
    email: string | null,
    onChange: () => void
): () => void {
    const em = normalizedEmail(email);
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const sub = (filter: string, suffix: string) => {
        const ch = supabase
            .channel(`venue-notifications-${userId}-${suffix}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_notifications',
                    filter,
                },
                () => onChange()
            )
            .subscribe();
        channels.push(ch);
    };

    if (em) {
        sub(`user_email=eq.${em}`, 'email');
    }
    sub(`user_id=eq.${userId}`, 'uid');

    return () => {
        channels.forEach((c) => {
            void supabase.removeChannel(c);
        });
    };
}

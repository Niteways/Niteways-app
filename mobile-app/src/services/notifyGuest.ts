import { supabase } from '../config/supabase';

/**
 * Tier 1 notification helper — RN twin of `src/lib/notifyGuest.ts`.
 *
 * Inserts a `user_notifications` row that the bell + notifications screen
 * both consume (and that the DB trigger replays as `pg_notify` for the
 * future push pipeline).
 */

export type GuestNotificationType =
    | 'vip_added'
    | 'guest_checked_in'
    | 'guest_added'
    | 'manual';

export interface NotifyGuestInput {
    userId?: string | null;
    userEmail?: string | null;
    title: string;
    message: string;
    type?: GuestNotificationType;
    relatedId?: string | null;
}

export interface NotifyGuestResult {
    ok: boolean;
    error?: string;
}

export async function notifyGuest(input: NotifyGuestInput): Promise<NotifyGuestResult> {
    const {
        userId = null,
        userEmail = null,
        title,
        message,
        type = 'manual',
        relatedId = null,
    } = input;

    if (!userId && !userEmail) {
        return { ok: false, error: 'notifyGuest requires userId or userEmail' };
    }
    if (!title || !message) {
        return { ok: false, error: 'notifyGuest requires title and message' };
    }

    const cleanEmail = userEmail ? userEmail.trim().toLowerCase() || null : null;

    const { error } = await supabase.from('user_notifications').insert({
        user_id: userId,
        user_email: cleanEmail,
        title,
        message,
        type,
        related_id: relatedId,
        is_read: false,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

export async function notifyGuestById(
    guestId: string,
    payload: Omit<NotifyGuestInput, 'userId' | 'userEmail'>
): Promise<NotifyGuestResult & { skipped?: boolean }> {
    const { data, error } = await supabase
        .from('guests')
        .select('id, email')
        .eq('id', guestId)
        .maybeSingle();

    if (error) return { ok: false, error: error.message };
    const email = (data?.email || '').trim().toLowerCase();
    if (!email) return { ok: true, skipped: true };

    return notifyGuest({ ...payload, userEmail: email });
}

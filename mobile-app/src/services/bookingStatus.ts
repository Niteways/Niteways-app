import { supabase } from '../config/supabase';

/** Canonical booking status set — same as web `src/lib/bookingStatus.ts`. */
export type BookingStatus =
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'checked_in'
    | 'no_show'
    | 'completed'
    | 'blocked';

export type SetBookingStatusResult = { ok: boolean; error?: string };

/**
 * Calls the `set_booking_status` Supabase RPC so status writes + guest notifications
 * stay in sync between the web venue portal and the native venue app.
 */
export async function setBookingStatus(
    bookingId: string,
    status: BookingStatus
): Promise<SetBookingStatusResult> {
    const { error } = await supabase.rpc('set_booking_status', {
        p_booking_id: bookingId,
        p_status: status,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
}

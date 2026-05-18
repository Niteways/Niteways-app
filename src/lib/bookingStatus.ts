import { supabase } from "@/integrations/supabase/client";

/** Canonical booking status set — both apps must use these values (no `declined`). */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "checked_in"
  | "no_show"
  | "completed"
  | "blocked";

export type SetBookingStatusResult = { ok: boolean; error?: string };

/**
 * Single source of truth for changing booking status across web + mobile.
 * Calls `public.set_booking_status` RPC, which also writes a
 * `user_notifications` row for guest-facing statuses (confirmed/cancelled/checked_in).
 */
export async function setBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<SetBookingStatusResult> {
  const { error } = await supabase.rpc("set_booking_status", {
    p_booking_id: bookingId,
    p_status: status,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

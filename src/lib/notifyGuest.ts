import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tier 1 notification helper — inserts a `user_notifications` row that the
 * native app + venue portal both render via the bell + notifications page,
 * and that the database trigger (`trg_user_notifications_insert`) replays as
 * a `pg_notify` so push pipelines (FCM / Expo) can plug in later.
 *
 * Usage:
 *   await notifyGuest({ userEmail: 'foo@bar.com', title: 'VIP added', ... });
 *
 * At least one of `userId` / `userEmail` must be set. Otherwise the bell would
 * have no scope to filter against and we'd silently leak the message to
 * everyone — so the helper returns an error instead of inserting.
 */

export type GuestNotificationType =
  | "vip_added"
  | "guest_checked_in"
  | "guest_added"
  | "manual";

export interface NotifyGuestInput {
  userId?: string | null;
  userEmail?: string | null;
  title: string;
  message: string;
  type?: GuestNotificationType;
  relatedId?: string | null;
  /** Override the singleton client (used by tests / non-default workspaces). */
  client?: SupabaseClient;
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
    type = "manual",
    relatedId = null,
    client = supabase,
  } = input;

  if (!userId && !userEmail) {
    return { ok: false, error: "notifyGuest requires userId or userEmail" };
  }
  if (!title || !message) {
    return { ok: false, error: "notifyGuest requires title and message" };
  }

  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() || null : null;

  const { error } = await client.from("user_notifications").insert({
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

/**
 * Looks up a guest's email by `public.guests.id` and notifies them. Returns
 * `{ ok: true, skipped: true }` when the guest has no email on file — the
 * caller should not surface that as an error to the operator.
 */
export async function notifyGuestById(
  guestId: string,
  payload: Omit<NotifyGuestInput, "userId" | "userEmail">
): Promise<NotifyGuestResult & { skipped?: boolean }> {
  const client = payload.client ?? supabase;

  const { data, error } = await client
    .from("guests")
    .select("id, email")
    .eq("id", guestId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  const email = (data?.email || "").trim().toLowerCase();
  if (!email) return { ok: true, skipped: true };

  return notifyGuest({ ...payload, userEmail: email });
}

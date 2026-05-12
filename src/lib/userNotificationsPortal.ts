import type { SupabaseClient } from "@supabase/supabase-js";

/** Matches mobile `venuesNotifications` / venue portal rows in `user_notifications`. */
export type PortalUserNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
};

export function coerceNotificationRead(raw: unknown): boolean {
  if (raw === true || raw === "true" || raw === 1 || raw === "1") return true;
  if (raw === false || raw === "false" || raw === 0 || raw === "0") return false;
  return true;
}

/** Only explicit `is_read === false` counts as unread (aligned with mobile venue app). */
export function portalNotificationIsUnread(n: { is_read?: boolean }): boolean {
  return n.is_read === false;
}

function normalizedEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Same scope as native Venue app: rows where `user_id` OR `user_email` matches the signed-in user.
 */
export async function fetchPortalUserNotifications(
  supabase: SupabaseClient,
  userId: string | null,
  email: string | null
): Promise<PortalUserNotification[]> {
  const uid = userId?.trim();
  const em = normalizedEmail(email);

  let q = supabase
    .from("user_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (em && uid) {
    q = q.or(`user_id.eq.${uid},user_email.eq.${em}`);
  } else if (uid) {
    q = q.eq("user_id", uid);
  } else if (em) {
    q = q.eq("user_email", em);
  } else {
    return [];
  }

  const { data, error } = await q;
  if (error) {
    console.warn("[userNotificationsPortal] fetch", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ...(row as PortalUserNotification),
      is_read: coerceNotificationRead(r.is_read),
    };
  });
}

export async function markAllPortalNotificationsRead(
  supabase: SupabaseClient,
  userId: string | null,
  email: string | null
): Promise<{ ok: boolean; error?: string }> {
  const uid = userId?.trim();
  const em = normalizedEmail(email);

  let q = supabase.from("user_notifications").update({ is_read: true });

  if (em && uid) {
    q = q.or(`user_id.eq.${uid},user_email.eq.${em}`);
  } else if (uid) {
    q = q.eq("user_id", uid);
  } else if (em) {
    q = q.eq("user_email", em);
  } else {
    return { ok: false, error: "Not signed in" };
  }

  q = q.or("is_read.eq.false,is_read.is.null");

  const { error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markPortalNotificationRead(
  supabase: SupabaseClient,
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("user_notifications").update({ is_read: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Realtime refresh for rows visible to this user (same filters as fetch). */
export function subscribePortalUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
  onChange: () => void
): () => void {
  const channels: ReturnType<typeof supabase.channel>[] = [];
  const em = normalizedEmail(email);

  const sub = (filter: string, suffix: string) => {
    const ch = supabase
      .channel(`portal-notifications-${userId}-${suffix}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter,
        },
        () => onChange()
      )
      .subscribe();
    channels.push(ch);
  };

  sub(`user_id=eq.${userId}`, "uid");
  if (em) {
    sub(`user_email=eq.${em}`, "email");
  }

  return () => {
    channels.forEach((c) => {
      void supabase.removeChannel(c);
    });
  };
}

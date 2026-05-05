import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

type PushNotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  user_email: string | null;
  created_at: string;
};

/**
 * Web push (in-browser) notifications when booking-status notifications are created.
 *
 * This intentionally does NOT request permission automatically.
 * If the user has granted permission, we show system notifications.
 */
export function useUserNotificationPush(userEmail?: string) {
  const normalizedEmail = useMemo(() => userEmail?.trim().toLowerCase() || "", [userEmail]);

  useEffect(() => {
    if (!normalizedEmail) return;

    const canNotify =
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted";

    if (!canNotify) return;

    const channel = supabase
      .channel(`user-notifications-push:${normalizedEmail}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_email=eq.${normalizedEmail}`,
        },
        (payload) => {
          const row = payload.new as PushNotificationRow;
          // Only alert on new unread notifications
          if (row?.is_read) return;
          new Notification(row.title, {
            body: row.message,
            tag: row.id,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizedEmail]);
}

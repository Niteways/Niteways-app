import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * User-app unread notification count sourced from `user_notifications`.
 *
 * Note: This app identifies the user by email stored in local profile state.
 */
export function useUserNotificationUnreadCount(userEmail?: string) {
  const normalizedEmail = useMemo(() => userEmail?.trim().toLowerCase() || "", [userEmail]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!normalizedEmail) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const fetchCount = async () => {
      setIsLoading(true);
      try {
        const { count, error } = await supabase
          .from("user_notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_email", normalizedEmail)
          .eq("is_read", false);

        if (error) throw error;
        if (!isMounted) return;
        setUnreadCount(count ?? 0);
      } catch (e) {
        // Keep UI resilient; don't hard-fail header UI
        if (!isMounted) return;
        setUnreadCount(0);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCount();

    const channel = supabase
      .channel(`user-notifications-unread:${normalizedEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_email=eq.${normalizedEmail}`,
        },
        () => {
          fetchCount();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [normalizedEmail]);

  return { unreadCount, isLoading };
}

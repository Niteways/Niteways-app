import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPortalUserNotifications,
  portalNotificationIsUnread,
} from "@/lib/userNotificationsPortal";

/** Venue portal header badge — same `user_notifications` scope as the native Venue app. */
export function usePortalNotificationUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    const list = await fetchPortalUserNotifications(supabase, user.id, user.email ?? null);
    setUnreadCount(list.filter(portalNotificationIsUnread).length);
  }, []);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { unreadCount, refresh };
}

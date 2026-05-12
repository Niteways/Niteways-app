import { useState, useEffect, useCallback, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, Crown, Shield, Bell, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  fetchPortalUserNotifications,
  portalNotificationIsUnread,
  markAllPortalNotificationsRead,
  markPortalNotificationRead,
  subscribePortalUserNotifications,
  type PortalUserNotification,
} from "@/lib/userNotificationsPortal";

type UiNotificationType = "booking" | "vip" | "security" | "general";

function mapDbTypeToUi(type: string): UiNotificationType {
  const t = (type || "").toLowerCase();
  if (t.includes("booking") || t.includes("table")) return "booking";
  if (t.includes("vip")) return "vip";
  if (t.includes("security") || t.includes("capacity")) return "security";
  return "general";
}

const getNotificationIcon = (type: UiNotificationType) => {
  switch (type) {
    case "booking":
      return CalendarCheck;
    case "vip":
      return Crown;
    case "security":
      return Shield;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: UiNotificationType) => {
  switch (type) {
    case "booking":
      return "text-teal bg-teal/10";
    case "vip":
      return "text-gold bg-gold/10";
    case "security":
      return "text-coral bg-coral/10";
    default:
      return "text-primary bg-primary/10";
  }
};

const Notifications = () => {
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<PortalUserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unsubRef = useRef<(() => void) | undefined>();

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const list = await fetchPortalUserNotifications(supabase, user.id, user.email ?? null);
    setNotifications(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const { data } = supabase.auth.onAuthStateChange(() => void load());
    return () => data.subscription.unsubscribe();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user?.id) return;
      unsubRef.current?.();
      unsubRef.current = subscribePortalUserNotifications(
        supabase,
        user.id,
        user.email ?? null,
        () => void load()
      );
    })();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = undefined;
    };
  }, [load]);

  const markAsRead = async (id: string) => {
    await markPortalNotificationRead(supabase, id);
    await load();
  };

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;
    await markAllPortalNotificationsRead(supabase, user.id, user.email ?? null);
    await load();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    return portalNotificationIsUnread(n);
  });

  const unreadCount = notifications.filter((n) => portalNotificationIsUnread(n)).length;

  return (
    <AdminLayout title="Notifications" subtitle={`${unreadCount} unread notifications`}>
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread ({unreadCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0}
            onClick={() => void markAllAsRead()}
          >
            Mark all read
          </Button>
        </div>

        <ScrollArea className={isMobile ? "h-[calc(100vh-200px)]" : "h-[600px]"}>
          <div className="space-y-2">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification, index) => {
                const uiType = mapDbTypeToUi(notification.type);
                const Icon = getNotificationIcon(uiType);
                const colorClass = getNotificationColor(uiType);
                const read = !portalNotificationIsUnread(notification);
                const timestamp = new Date(notification.created_at);

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => void markAsRead(notification.id)}
                    className={cn(
                      "p-4 rounded-lg cursor-pointer transition-all",
                      read ? "bg-muted/20" : "bg-muted/40 border-l-4 border-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-full", colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={cn("font-medium text-sm", !read && "text-foreground")}>
                            {notification.title}
                          </h4>
                          {!read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium text-foreground">No notifications</p>
                <p className="text-sm">Booking alerts and updates will show up here.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </AdminLayout>
  );
};

export default Notifications;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Bell, Check, Ticket, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface UserAppNotificationsProps {
  onBack: () => void;
  userEmail?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "booking":
      return Calendar;
    case "ticket":
      return Ticket;
    case "guestlist":
      return Users;
    default:
      return Bell;
  }
};

export function UserAppNotifications({ onBack, userEmail }: UserAppNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUserProfile();

  const effectiveEmail = userEmail || profile.email;

  useEffect(() => {
    fetchNotifications();
  }, [effectiveEmail]);

  // Real-time refresh
  useEffect(() => {
    if (!effectiveEmail) return;
    const email = effectiveEmail.trim().toLowerCase();

    const channel = supabase
      .channel(`user-notifications:${email}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_email=eq.${email}`,
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveEmail]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("user_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

       if (effectiveEmail) {
         query = query.eq("user_email", effectiveEmail.trim().toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", id);
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              You'll see booking updates and announcements here
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const isConfirmed = notification.title.includes("Confirmed");
            
            return (
              <motion.button
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "w-full p-4 rounded-xl border text-left transition-all",
                  notification.is_read
                    ? "bg-muted/30 border-border"
                    : "bg-muted/50 border-primary/30"
                )}
              >
                <div className="flex gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    isConfirmed ? "bg-primary/20" : "bg-muted"
                  )}>
                    {isConfirmed ? (
                      <Check className="w-5 h-5 text-primary" />
                    ) : (
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={cn(
                        "font-medium text-sm",
                        !notification.is_read && "text-primary"
                      )}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(notification.created_at), "MMM d")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                </div>
                {!notification.is_read && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full" />
                )}
              </motion.button>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

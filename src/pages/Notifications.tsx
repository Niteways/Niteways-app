import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarCheck,
  Crown,
  Shield,
  Bell,
  Check,
  X,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: "booking" | "vip" | "security" | "general";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Sample notifications - in production these would come from Supabase
const sampleNotifications: Notification[] = [
  {
    id: "1",
    type: "booking",
    title: "New Booking Request",
    message: "Alexander Lindberg requested Table VIP-1 for 8 guests",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    actionUrl: "/booking-requests",
  },
  {
    id: "2",
    type: "vip",
    title: "VIP Guest Arrival",
    message: "Emma Johansson (Platinum) just checked in at Table VIP-2",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
  },
  {
    id: "3",
    type: "security",
    title: "Security Alert",
    message: "ID verification required at Main Entrance",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: true,
    actionUrl: "/mobile-security",
  },
  {
    id: "4",
    type: "booking",
    title: "Booking Confirmed",
    message: "Table T3 confirmed for Sofia Nilsson at 22:30",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    read: true,
  },
  {
    id: "5",
    type: "vip",
    title: "VIP Reservation",
    message: "New VIP reservation from Marcus Berg for Saturday",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: true,
    actionUrl: "/tables",
  },
  {
    id: "6",
    type: "security",
    title: "Capacity Warning",
    message: "Venue capacity at 85% - approaching limit",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    read: true,
  },
];

const getNotificationIcon = (type: Notification["type"]) => {
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

const getNotificationColor = (type: Notification["type"]) => {
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
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Subscribe to real-time notifications
  useEffect(() => {
    // Subscribe to new bookings
    const bookingsChannel = supabase
      .channel("booking-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "table_bookings",
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            type: "booking",
            title: "New Booking Request",
            message: `${payload.new.guest_name} requested ${payload.new.table_number} for ${payload.new.party_size} guests`,
            timestamp: new Date(),
            read: false,
            actionUrl: "/booking-requests",
          };
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    // Subscribe to guest list entries (VIP arrivals)
    const guestChannel = supabase
      .channel("guest-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "guest_list_entries",
          filter: "checked_in=eq.true",
        },
        (payload) => {
          if (payload.new.list_type === "vip") {
            const newNotification: Notification = {
              id: `vip-${payload.new.id}`,
              type: "vip",
              title: "VIP Guest Arrival",
              message: `${payload.new.guest_name} just checked in`,
              timestamp: new Date(),
              read: false,
            };
            setNotifications((prev) => [newNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(guestChannel);
    };
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filteredNotifications = notifications.filter(
    (n) => filter === "all" || !n.read
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AdminLayout 
      title="Notifications" 
      subtitle={`${unreadCount} unread notifications`}
    >
      <div className="space-y-4 pb-20">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className={isMobile ? "h-[calc(100vh-200px)]" : "h-[600px]"}>
          <div className="space-y-2">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification, index) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type);

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => markAsRead(notification.id)}
                    className={cn(
                      "p-4 rounded-lg cursor-pointer transition-all",
                      notification.read
                        ? "bg-muted/20"
                        : "bg-muted/40 border-l-4 border-primary"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-full", colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={cn(
                            "font-medium text-sm",
                            !notification.read && "text-foreground"
                          )}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm">You're all caught up!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </AdminLayout>
  );
};

export default Notifications;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  type: "booking" | "vip" | "security" | "general";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to new bookings
    const bookingsChannel = supabase
      .channel("realtime-booking-notifications")
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
            message: `${payload.new.guest_name} requested ${payload.new.table_number}`,
            timestamp: new Date(),
            read: false,
            actionUrl: "/booking-requests",
          };
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    // Subscribe to VIP guest check-ins
    const guestChannel = supabase
      .channel("realtime-guest-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "guest_list_entries",
        },
        (payload) => {
          if (payload.new.checked_in && payload.new.list_type === "vip") {
            const newNotification: Notification = {
              id: `vip-${payload.new.id}`,
              type: "vip",
              title: "VIP Guest Arrival",
              message: `${payload.new.guest_name} just checked in`,
              timestamp: new Date(),
              read: false,
            };
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
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
      prev.map((n) => {
        if (n.id === id && !n.read) {
          setUnreadCount((count) => Math.max(0, count - 1));
          return { ...n, read: true };
        }
        return n;
      })
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `custom-${Date.now()}`,
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
  };
}

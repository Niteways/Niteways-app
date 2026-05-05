import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type TableBooking = Tables<"table_bookings"> & {
  guests?: { name: string; guest_id: string } | null;
  venues?: { name: string } | null;
};

interface UseRealtimeTableBookingsOptions {
  venueId?: string;
  guestId?: string;
  date?: string;
  statusFilter?: string[];
  limit?: number;
}

export function useRealtimeTableBookings(options: UseRealtimeTableBookingsOptions = {}) {
  const { venueId, guestId, date, statusFilter, limit = 100 } = options;
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("table_bookings")
        .select("*, guests(name, guest_id), venues(name)")
        .order("booking_date", { ascending: false })
        .limit(limit);

      if (venueId) {
        query = query.eq("venue_id", venueId);
      }
      if (guestId) {
        query = query.eq("guest_id", guestId);
      }
      if (date) {
        query = query.eq("booking_date", date);
      }
      if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setBookings(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch bookings"));
    } finally {
      setIsLoading(false);
    }
  }, [venueId, guestId, date, statusFilter, limit]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("table-bookings-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_bookings",
        },
        async (payload) => {
          console.log("Realtime booking update:", payload);

          if (payload.eventType === "INSERT") {
            // Fetch the full record with relations
            const { data } = await supabase
              .from("table_bookings")
              .select("*, guests(name, guest_id), venues(name)")
              .eq("id", payload.new.id)
              .single();

            if (data) {
              // Check if this booking matches our filters
              let matches = true;
              if (venueId && data.venue_id !== venueId) matches = false;
              if (guestId && data.guest_id !== guestId) matches = false;
              if (date && data.booking_date !== date) matches = false;
              if (statusFilter && statusFilter.length > 0 && !statusFilter.includes(data.status)) matches = false;

              if (matches) {
                setBookings((prev) => [data, ...prev].slice(0, limit));
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const { data } = await supabase
              .from("table_bookings")
              .select("*, guests(name, guest_id), venues(name)")
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setBookings((prev) =>
                prev.map((b) => (b.id === data.id ? data : b))
              );
            }
          } else if (payload.eventType === "DELETE") {
            setBookings((prev) =>
              prev.filter((b) => b.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, guestId, date, statusFilter, limit]);

  const addBooking = useCallback(
    async (booking: Omit<Tables<"table_bookings">, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("table_bookings")
        .insert(booking)
        .select("*, guests(name, guest_id), venues(name)")
        .single();

      if (error) throw error;
      return data;
    },
    []
  );

  const updateBooking = useCallback(
    async (id: string, updates: Partial<Tables<"table_bookings">>) => {
      const { data, error } = await supabase
        .from("table_bookings")
        .update(updates)
        .eq("id", id)
        .select("*, guests(name, guest_id), venues(name)")
        .single();

      if (error) throw error;
      return data;
    },
    []
  );

  const deleteBooking = useCallback(async (id: string) => {
    const { error } = await supabase.from("table_bookings").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const confirmBooking = useCallback(
    async (id: string) => {
      return updateBooking(id, { status: "confirmed" });
    },
    [updateBooking]
  );

  const cancelBooking = useCallback(
    async (id: string) => {
      return updateBooking(id, { status: "cancelled" });
    },
    [updateBooking]
  );

  return {
    bookings,
    isLoading,
    error,
    refetch: fetchBookings,
    addBooking,
    updateBooking,
    deleteBooking,
    confirmBooking,
    cancelBooking,
  };
}

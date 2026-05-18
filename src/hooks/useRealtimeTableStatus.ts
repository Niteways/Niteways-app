import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setBookingStatus } from "@/lib/bookingStatus";

export type TableStatus = "available" | "confirmed" | "pending" | "vip" | "blocked";

export interface TableWithBooking {
  id: string;
  label: string;
  status: TableStatus;
  capacity: number;
  venueId?: string;
  booking?: {
    id: string;
    guestName: string;
    guestPhone?: string;
    guestEmail?: string;
    partySize: number;
    time: string;
    price: number;
    notes?: string;
    guestId?: string;
  };
}

interface UseRealtimeTableStatusOptions {
  venueId: string; // Required - no fallback
}

export function useRealtimeTableStatus(date: string, options: UseRealtimeTableStatusOptions) {
  const [tables, setTables] = useState<TableWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const activeVenueId = options.venueId;

  const fetchData = useCallback(async () => {
    try {
      // Always filter by venue - required for proper scoping
      const { data: tablesData, error: tablesError } = await supabase
        .from("venue_tables")
        .select("*")
        .eq("venue_id", activeVenueId)
        .order("label");
      if (tablesError) throw tablesError;

      // Fetch bookings for the selected date - always filter by venue
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("table_bookings")
        .select("*")
        .eq("booking_date", date)
        .eq("venue_id", activeVenueId);

      if (bookingsError) throw bookingsError;

      // Map tables with their booking status
      const tablesWithStatus: TableWithBooking[] = (tablesData || []).map((table: any) => {
        const booking = (bookingsData || []).find(
          (b: any) => b.table_number === table.label && b.status !== "cancelled",
        );

        let status: TableStatus = "available";

        // Prefer booking-based status (so floor map + table status + bookings stay in sync)
        if (booking?.status === "blocked") {
          status = "blocked";
        } else if (booking?.status === "pending") {
          status = "pending";
        } else if (booking?.status === "vip") {
          status = "vip";
        } else if (
          booking?.status === "confirmed" ||
          booking?.status === "completed" ||
          booking?.status === "checked_in"
        ) {
          status = "confirmed";
        } else if (table.status === "blocked") {
          // fallback if a table has been hard-blocked in venue_tables
          status = "blocked";
        }

        return {
          id: table.id,
          label: table.label,
          status,
          capacity: table.capacity,
          venueId: table.venue_id,
          booking: booking
            ? {
                id: booking.id,
                guestName: booking.guest_name,
                guestPhone: booking.guest_phone || undefined,
                guestEmail: booking.guest_email || undefined,
                partySize: booking.party_size,
                time: booking.booking_time,
                price: booking.price || 0,
                notes: booking.notes || undefined,
                guestId: booking.guest_id || undefined,
              }
            : undefined,
        };
      });

      setTables(tablesWithStatus);
    } catch (error) {
      console.error("Error fetching table status:", error);
    } finally {
      setLoading(false);
    }
  }, [date, options.venueId]);

  const blockTable = useCallback(
    async (tableLabel: string) => {
      try {
        // First check if there's already a blocked booking for this table on this date
        const { data: existing, error: checkError } = await supabase
          .from("table_bookings")
          .select("id")
          .eq("table_number", tableLabel)
          .eq("booking_date", date)
          .eq("status", "blocked")
          .maybeSingle();

        if (checkError) throw checkError;

        // If already blocked, skip insert
        if (existing) {
          console.log("Table already blocked for this date");
          return true;
        }

        // Use the table's venueId (fixes "failed to block table" caused by hardcoded venue_id)
        const venueId = tables.find((t) => t.label === tableLabel)?.venueId || activeVenueId;

        const { error } = await supabase.from("table_bookings").insert({
          venue_id: venueId,
          booking_id: `BLK-${Date.now()}`,
          table_number: tableLabel,
          guest_name: "BLOCKED",
          guest_email: null,
          guest_phone: null,
          guest_id: null,
          booking_date: date,
          booking_time: "00:00", // Use correct time format (HH:MM without seconds for PostgreSQL time)
          party_size: 0,
          status: "blocked",
          price: 0,
          notes: "Table blocked by staff",
        });

        if (error) throw error;
        
        // Immediately refetch for faster UI update
        await fetchData();
        return true;
      } catch (error) {
        console.error("Error blocking table:", error);
        return false;
      }
    },
    [date, tables, fetchData],
  );

  const unblockTable = useCallback(
    async (tableLabel: string) => {
      try {
        const { error } = await supabase
          .from("table_bookings")
          .delete()
          .eq("booking_date", date)
          .eq("table_number", tableLabel)
          .eq("status", "blocked");

        if (error) throw error;
        
        // Immediately refetch for faster UI update
        await fetchData();
        return true;
      } catch (error) {
        console.error("Error unblocking table:", error);
        return false;
      }
    },
    [date, fetchData],
  );

  const acceptBooking = useCallback(async (bookingId: string) => {
    // Status write + guest notification go through the Supabase RPC so web/mobile stay in sync.
    const { ok, error } = await setBookingStatus(bookingId, "confirmed");
    if (!ok) {
      console.error("Error accepting booking:", error);
      return false;
    }

    // Email notification (separate channel) — best-effort, don't block on errors.
    try {
      const { data: bookingData } = await supabase
        .from("table_bookings")
        .select("guest_name, guest_email, table_number, booking_date, booking_time, venues:venue_id(name)")
        .eq("id", bookingId)
        .single();
      if (bookingData?.guest_email) {
        await supabase.functions.invoke("booking-notification", {
          body: {
            bookingId,
            status: "confirmed",
            guestEmail: bookingData.guest_email,
            guestName: bookingData.guest_name,
            venueName: bookingData.venues?.name || "Venue",
            tableNumber: bookingData.table_number,
            bookingDate: bookingData.booking_date,
            bookingTime: bookingData.booking_time,
          },
        });
      }
    } catch (notifError) {
      console.warn("Booking email notification failed:", notifError);
    }

    return true;
  }, []);

  const declineBooking = useCallback(async (bookingId: string) => {
    const { ok, error } = await setBookingStatus(bookingId, "cancelled");
    if (!ok) {
      console.error("Error declining booking:", error);
      return false;
    }

    try {
      const { data: bookingData } = await supabase
        .from("table_bookings")
        .select("guest_name, guest_email, table_number, booking_date, booking_time, venues:venue_id(name)")
        .eq("id", bookingId)
        .single();
      if (bookingData?.guest_email) {
        await supabase.functions.invoke("booking-notification", {
          body: {
            bookingId,
            status: "declined",
            guestEmail: bookingData.guest_email,
            guestName: bookingData.guest_name,
            venueName: bookingData.venues?.name || "Venue",
            tableNumber: bookingData.table_number,
            bookingDate: bookingData.booking_date,
            bookingTime: bookingData.booking_time,
          },
        });
      }
    } catch (notifError) {
      console.warn("Booking email notification failed:", notifError);
    }

    return true;
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to table changes
    const tablesChannel = supabase
      .channel("table-status-tables")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_tables" },
        () => fetchData(),
      )
      .subscribe();

    // Subscribe to booking changes
    const bookingsChannel = supabase
      .channel("table-status-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_bookings" },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [fetchData]);

  return {
    tables,
    loading,
    blockTable,
    unblockTable,
    acceptBooking,
    declineBooking,
    refetch: fetchData,
  };
}

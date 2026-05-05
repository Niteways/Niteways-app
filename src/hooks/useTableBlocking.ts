import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_VENUE_ID = "f5d0702a-6bd9-42e1-bf2d-87681c103d17";

interface TableBlockingOptions {
  date: string;
  venueId?: string;
  onSuccess?: () => void;
}

/**
 * Unified hook for table blocking/unblocking used by:
 * - FloorMapPreview
 * - MobileTableStatus
 * - TableBooking
 *
 * Features:
 * - Duplicate prevention (checks for existing blocked booking before inserting)
 * - Correct time format (00:00)
 * - Toast notifications
 * - Optional onSuccess callback for immediate refetch
 */
export function useTableBlocking({ date, venueId, onSuccess }: TableBlockingOptions) {
  const blockTable = useCallback(
    async (tableLabel: string, tableVenueId?: string) => {
      try {
        // Check for existing blocked booking to prevent duplicates
        const { data: existing, error: checkError } = await supabase
          .from("table_bookings")
          .select("id")
          .eq("table_number", tableLabel)
          .eq("booking_date", date)
          .eq("status", "blocked")
          .maybeSingle();

        if (checkError) {
          console.error("Error checking existing block:", checkError);
          throw checkError;
        }

        // Already blocked - skip insert
        if (existing) {
          toast.info(`Table ${tableLabel} is already blocked`);
          return true;
        }

        const finalVenueId = tableVenueId || venueId || DEFAULT_VENUE_ID;

        const { error } = await supabase.from("table_bookings").insert({
          venue_id: finalVenueId,
          booking_id: `BLK-${Date.now()}`,
          table_number: tableLabel,
          guest_name: "BLOCKED",
          guest_email: null,
          guest_phone: null,
          guest_id: null,
          booking_date: date,
          booking_time: "00:00",
          party_size: 0,
          status: "blocked",
          price: 0,
          notes: "Table blocked by staff",
        });

        if (error) {
          console.error("Error blocking table:", error);
          throw error;
        }

        toast.success(`Table ${tableLabel} blocked`);
        onSuccess?.();
        return true;
      } catch (error) {
        console.error("Error blocking table:", error);
        toast.error("Failed to block table");
        return false;
      }
    },
    [date, venueId, onSuccess],
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

        if (error) {
          console.error("Error unblocking table:", error);
          throw error;
        }

        toast.success(`Table ${tableLabel} unblocked`);
        onSuccess?.();
        return true;
      } catch (error) {
        console.error("Error unblocking table:", error);
        toast.error("Failed to unblock table");
        return false;
      }
    },
    [date, onSuccess],
  );

  return { blockTable, unblockTable };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GuestEntry {
  id: string;
  name: string;
  plusGuests: number;
  payingGuests: number;
  checkedInCount: number;
  listType: "aa" | "vip" | "standard" | "promo";
  checkedIn: boolean;
  checkInTime?: string;
  isRecurring?: boolean;
  isOneDay?: boolean;
  table?: string;
  promoter?: string;
  addedAt?: string;
  notes?: string;
  listId?: string;
  listName?: string;
}

interface ListInfo {
  id: string;
  name: string;
}

interface UseRealtimeCheckInOptions {
  venueId?: string;
}

export function useRealtimeCheckIn(options: UseRealtimeCheckInOptions = {}) {
  const { venueId } = options;
  const [guestListEntries, setGuestListEntries] = useState<GuestEntry[]>([]);
  const [recurringGuests, setRecurringGuests] = useState<GuestEntry[]>([]);
  const [oneDayGuests, setOneDayGuests] = useState<GuestEntry[]>([]);
  const [tableBookings, setTableBookings] = useState<GuestEntry[]>([]);
  const [recurringLists, setRecurringLists] = useState<ListInfo[]>([]);
  const [oneDayLists, setOneDayLists] = useState<ListInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Convert list type to proper format
  const normalizeListType = (type: string): "aa" | "vip" | "standard" | "promo" => {
    const lowered = type?.toLowerCase() || "standard";
    if (lowered === "aa") return "aa";
    if (lowered === "vip") return "vip";
    if (lowered === "promo") return "promo";
    return "standard";
  };

  // Fetch all check-in data
  const fetchData = useCallback(async () => {
    try {
      // Fetch recurring list guests with list info
      let recurringQuery = supabase
        .from("recurring_list_guests")
        .select(`*, recurring_guest_lists(name)`)
        .order("added_at", { ascending: false });

      if (venueId) {
        recurringQuery = recurringQuery.eq("recurring_guest_lists.venue_id", venueId);
      }

      const { data: recurringData, error: recurringError } = await recurringQuery;

      if (recurringError) throw recurringError;

      const formattedRecurring: GuestEntry[] = (recurringData || []).map(g => {
        const totalParty = 1 + (g.plus_guests || 0);
        return {
          id: g.id,
          name: g.guest_name,
          plusGuests: g.plus_guests || 0,
          payingGuests: g.paying_guests || 0,
          checkedInCount: g.checked_in_count || (g.checked_in ? totalParty : 0),
          listType: normalizeListType(g.guest_type),
          checkedIn: g.checked_in || false,
          checkInTime: g.check_in_time 
            ? new Date(g.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) 
            : undefined,
          isRecurring: true,
          promoter: g.added_by || "Unknown",
          addedAt: new Date(g.added_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          notes: g.notes || undefined,
          listId: g.recurring_list_id,
          listName: g.recurring_guest_lists?.name
        };
      });

      // Fetch one-day list guests with list info
      let oneDayQuery = supabase
        .from("one_day_list_guests")
        .select(`*, one_day_guest_lists(name, event_date)`)
        .order("added_at", { ascending: false });

      if (venueId) {
        oneDayQuery = oneDayQuery.eq("one_day_guest_lists.venue_id", venueId);
      }

      const { data: oneDayData, error: oneDayError } = await oneDayQuery;

      if (oneDayError) throw oneDayError;

      const formattedOneDay: GuestEntry[] = (oneDayData || []).map(g => {
        const totalParty = 1 + (g.plus_guests || 0);
        return {
          id: g.id,
          name: g.guest_name,
          plusGuests: g.plus_guests || 0,
          payingGuests: g.paying_guests || 0,
          checkedInCount: g.checked_in_count || (g.checked_in ? totalParty : 0),
          listType: normalizeListType(g.guest_type),
          checkedIn: g.checked_in || false,
          checkInTime: g.check_in_time 
            ? new Date(g.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) 
            : undefined,
          isOneDay: true,
          promoter: g.added_by || "Unknown",
          addedAt: new Date(g.added_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          notes: g.notes || undefined,
          listId: g.list_id,
          listName: g.one_day_guest_lists?.name
        };
      });

      // Fetch today's guest list entries
      const today = new Date().toISOString().split("T")[0];
      let guestListQuery = supabase
        .from("guest_list_entries")
        .select("*")
        .eq("event_date", today)
        .order("added_at", { ascending: false });

      if (venueId) {
        guestListQuery = guestListQuery.eq("venue_id", venueId);
      }

      const { data: guestListData, error: guestListError } = await guestListQuery;

      if (guestListError) throw guestListError;

      const formattedGuestList: GuestEntry[] = (guestListData || []).map(g => ({
        id: g.id,
        name: g.guest_name,
        plusGuests: g.plus_guests || 0,
        payingGuests: 0,
        checkedInCount: g.checked_in ? 1 + (g.plus_guests || 0) : 0,
        listType: normalizeListType(g.list_type),
        checkedIn: g.checked_in || false,
        checkInTime: g.check_in_time 
          ? new Date(g.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) 
          : undefined,
        promoter: g.promoter || g.added_by || "Unknown",
        addedAt: new Date(g.added_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        notes: g.notes || undefined
      }));

      // Fetch today's table bookings
      let bookingsQuery = supabase
        .from("table_bookings")
        .select("*")
        .eq("booking_date", today)
        .order("created_at", { ascending: false });

      if (venueId) {
        bookingsQuery = bookingsQuery.eq("venue_id", venueId);
      }

      const { data: bookingsData, error: bookingsError } = await bookingsQuery;

      if (bookingsError) throw bookingsError;

      const formattedBookings: GuestEntry[] = (bookingsData || []).map(b => ({
        id: b.id,
        name: b.guest_name,
        plusGuests: Math.max(0, b.party_size - 1),
        payingGuests: 0,
        checkedInCount: b.status === "checked_in" ? b.party_size : 0,
        listType: "vip" as const,
        checkedIn: b.status === "checked_in",
        checkInTime: b.status === "checked_in" 
          ? new Date(b.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) 
          : undefined,
        table: b.table_number,
        notes: b.notes || undefined,
        addedAt: new Date(b.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
      }));

      // Get unique lists from guests
      const uniqueRecurringLists = new Map<string, ListInfo>();
      formattedRecurring.forEach(g => {
        if (g.listId && g.listName) {
          uniqueRecurringLists.set(g.listId, { id: g.listId, name: g.listName });
        }
      });

      const uniqueOneDayLists = new Map<string, ListInfo>();
      formattedOneDay.forEach(g => {
        if (g.listId && g.listName) {
          uniqueOneDayLists.set(g.listId, { id: g.listId, name: g.listName });
        }
      });

      setRecurringGuests(formattedRecurring);
      setOneDayGuests(formattedOneDay);
      setGuestListEntries(formattedGuestList);
      setTableBookings(formattedBookings);
      setRecurringLists(Array.from(uniqueRecurringLists.values()));
      setOneDayLists(Array.from(uniqueOneDayLists.values()));
    } catch (error) {
      console.error("Error fetching check-in data:", error);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  // Check in a recurring guest (incremental)
  const checkInRecurringGuest = useCallback(async (guestId: string) => {
    try {
      const guest = recurringGuests.find(g => g.id === guestId);
      if (!guest) return false;

      const totalParty = 1 + guest.plusGuests;
      const newCount = guest.checkedInCount + 1;
      const isFullyCheckedIn = newCount >= totalParty;
      
      const { error } = await supabase
        .from("recurring_list_guests")
        .update({ 
          checked_in_count: newCount,
          checked_in: isFullyCheckedIn,
          check_in_time: new Date().toISOString()
        })
        .eq("id", guestId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error checking in guest:", error);
      return false;
    }
  }, [recurringGuests]);

  // Check in a one-day list guest (incremental)
  const checkInOneDayGuest = useCallback(async (guestId: string) => {
    try {
      const guest = oneDayGuests.find(g => g.id === guestId);
      if (!guest) return false;

      const totalParty = 1 + guest.plusGuests;
      const newCount = guest.checkedInCount + 1;
      const isFullyCheckedIn = newCount >= totalParty;
      
      const { error } = await supabase
        .from("one_day_list_guests")
        .update({ 
          checked_in_count: newCount,
          checked_in: isFullyCheckedIn,
          check_in_time: new Date().toISOString()
        })
        .eq("id", guestId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error checking in guest:", error);
      return false;
    }
  }, [oneDayGuests]);

  // Check in a guest list entry
  const checkInGuestListEntry = useCallback(async (guestId: string) => {
    try {
      const guest = guestListEntries.find(g => g.id === guestId);
      if (!guest) return false;

      const newCheckedIn = !guest.checkedIn;
      
      const { error } = await supabase
        .from("guest_list_entries")
        .update({ 
          checked_in: newCheckedIn,
          check_in_time: newCheckedIn ? new Date().toISOString() : null,
          status: newCheckedIn ? "checked_in" : "pending"
        })
        .eq("id", guestId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error checking in guest:", error);
      return false;
    }
  }, [guestListEntries]);

  // Check in a table booking
  const checkInTableBooking = useCallback(async (bookingId: string) => {
    try {
      const booking = tableBookings.find(b => b.id === bookingId);
      if (!booking) return false;

      const newStatus = booking.checkedIn ? "confirmed" : "checked_in";
      
      const { error } = await supabase
        .from("table_bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error checking in booking:", error);
      return false;
    }
  }, [tableBookings]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchData();

    const recurringChannel = supabase
      .channel("checkin-recurring-guests")
      .on("postgres_changes", { event: "*", schema: "public", table: "recurring_list_guests" }, () => fetchData())
      .subscribe();

    const oneDayChannel = supabase
      .channel("checkin-oneday-guests")
      .on("postgres_changes", { event: "*", schema: "public", table: "one_day_list_guests" }, () => fetchData())
      .subscribe();

    const guestListChannel = supabase
      .channel("checkin-guest-list-entries")
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_list_entries" }, () => fetchData())
      .subscribe();

    const bookingsChannel = supabase
      .channel("checkin-table-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_bookings" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(recurringChannel);
      supabase.removeChannel(oneDayChannel);
      supabase.removeChannel(guestListChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [fetchData]);

  return {
    guestListEntries,
    recurringGuests,
    oneDayGuests,
    tableBookings,
    recurringLists,
    oneDayLists,
    loading,
    checkInRecurringGuest,
    checkInOneDayGuest,
    checkInGuestListEntry,
    checkInTableBooking,
    refetch: fetchData
  };
}
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function jsDayToRecurringDbDay(d: Date): number {
  const n = d.getDay();
  return n === 0 ? 7 : n;
}

function glParty(plus: number | null | undefined): number {
  return 1 + (plus ?? 0);
}

function peakHourFromTimes(times: string[]): string {
  if (!times.length) return "—";
  const buckets = new Map<number, number>();
  for (const t of times) {
    const m = /^(\d{1,2}):(\d{2})/.exec(t?.trim() || "");
    if (!m) continue;
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    buckets.set(h, (buckets.get(h) || 0) + 1);
  }
  if (!buckets.size) return "—";
  let bestH = 0;
  let bestC = -1;
  buckets.forEach((c, h) => {
    if (c > bestC) {
      bestC = c;
      bestH = h;
    }
  });
  return `${String(bestH).padStart(2, "0")}:00`;
}

function incrementalCheckinHeads(row: {
  plus_guests: number;
  checked_in?: boolean | null;
  checked_in_count?: number | null;
}): number {
  const total = glParty(row.plus_guests);
  const cnt = row.checked_in_count;
  if (cnt != null && cnt > 0) return Math.min(total, cnt);
  if (row.checked_in) return total;
  return 0;
}

export interface VenueDashboardStats {
  loading: boolean;
  error: string | null;
  revenue: number;
  guestsCheckedIn: number;
  guestsExpected: number;
  tableBookingsTonight: number;
  pendingTableBookings: number;
  occupancyPct: number;
  peakBookingHour: string;
  refetch: () => Promise<void>;
}

export function useVenueDashboardStats(venueId: string, today: string): VenueDashboardStats {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [guestsCheckedIn, setGuestsCheckedIn] = useState(0);
  const [guestsExpected, setGuestsExpected] = useState(0);
  const [tableBookingsTonight, setTableBookingsTonight] = useState(0);
  const [pendingTableBookings, setPendingTableBookings] = useState(0);
  const [occupancyPct, setOccupancyPct] = useState(0);
  const [peakBookingHour, setPeakBookingHour] = useState("—");

  const load = useCallback(async () => {
    setError(null);
    const dow = jsDayToRecurringDbDay(new Date());

    try {
      const [
        ticketsRes,
        tablesTodayRes,
        glEntriesRes,
        glCheckedRes,
        tablesCheckedRes,
        venueTablesRes,
        tablesBookedRes,
        pendingBookingsRes,
        oneDayExpectedRes,
        recurringExpectedRes,
        recurringCheckedRes,
        oneDayCheckedRes,
      ] = await Promise.all([
        supabase
          .from("ticket_purchases")
          .select("price, quantity, status")
          .eq("venue_id", venueId)
          .eq("event_date", today),
        supabase
          .from("table_bookings")
          .select("price, party_size, status, booking_time")
          .eq("venue_id", venueId)
          .eq("booking_date", today),
        supabase
          .from("guest_list_entries")
          .select("plus_guests, status")
          .eq("venue_id", venueId)
          .eq("event_date", today),
        supabase
          .from("guest_list_entries")
          .select("plus_guests")
          .eq("venue_id", venueId)
          .eq("event_date", today)
          .eq("checked_in", true),
        supabase
          .from("table_bookings")
          .select("party_size")
          .eq("venue_id", venueId)
          .eq("booking_date", today)
          .eq("status", "checked_in"),
        supabase.from("venue_tables").select("id").eq("venue_id", venueId),
        supabase
          .from("table_bookings")
          .select("table_number, status")
          .eq("venue_id", venueId)
          .eq("booking_date", today)
          .in("status", ["confirmed", "checked_in", "vip", "completed"]),
        supabase
          .from("table_bookings")
          .select("id", { count: "exact", head: true })
          .eq("venue_id", venueId)
          .eq("booking_date", today)
          .eq("status", "pending"),
        supabase
          .from("one_day_list_guests")
          .select("plus_guests, one_day_guest_lists!inner(venue_id, event_date)")
          .eq("one_day_guest_lists.venue_id", venueId)
          .eq("one_day_guest_lists.event_date", today),
        supabase
          .from("recurring_list_guests")
          .select("plus_guests, recurring_guest_lists!inner(venue_id, day_of_week)")
          .eq("recurring_guest_lists.venue_id", venueId)
          .eq("recurring_guest_lists.day_of_week", dow),
        supabase
          .from("recurring_list_guests")
          .select(
            "checked_in_count, plus_guests, checked_in, recurring_guest_lists!inner(venue_id, day_of_week)"
          )
          .eq("recurring_guest_lists.venue_id", venueId)
          .eq("recurring_guest_lists.day_of_week", dow),
        supabase
          .from("one_day_list_guests")
          .select("checked_in_count, plus_guests, checked_in, one_day_guest_lists!inner(venue_id, event_date)")
          .eq("one_day_guest_lists.venue_id", venueId)
          .eq("one_day_guest_lists.event_date", today),
      ]);

      const err =
        ticketsRes.error ||
        tablesTodayRes.error ||
        glEntriesRes.error ||
        glCheckedRes.error ||
        tablesCheckedRes.error ||
        venueTablesRes.error ||
        tablesBookedRes.error ||
        pendingBookingsRes.error ||
        oneDayExpectedRes.error ||
        recurringExpectedRes.error ||
        recurringCheckedRes.error ||
        oneDayCheckedRes.error;

      if (err) {
        setError(err.message || "Failed to load dashboard stats");
        return;
      }

      const ticketRows = ticketsRes.data || [];
      const tableRowsToday = tablesTodayRes.data || [];
      const tableRowsNonCancelled = tableRowsToday.filter((b) => b.status !== "cancelled");

      let rev = 0;
      for (const row of ticketRows) {
        if (!["confirmed", "used"].includes(row.status)) continue;
        rev += Number(row.price || 0) * (row.quantity ?? 1);
      }
      for (const row of tableRowsToday) {
        if (["confirmed", "completed", "vip", "checked_in"].includes(row.status)) {
          rev += Number(row.price || 0);
        }
      }
      setRevenue(Math.round(rev));

      let expected =
        (glEntriesRes.data || [])
          .filter((e) => !["cancelled", "declined", "removed"].includes((e.status || "").toLowerCase()))
          .reduce((s, e) => s + glParty(e.plus_guests), 0) +
        (tablesExpectedRes.data || []).reduce((s, b) => s + (b.party_size || 0), 0) +
        (oneDayExpectedRes.data || []).reduce((s, g) => s + glParty(g.plus_guests), 0) +
        (recurringExpectedRes.data || []).reduce((s, g) => s + glParty(g.plus_guests), 0);

      const ticketHeadsExpected = ticketRows
        .filter((r) => ["confirmed", "pending", "used"].includes(r.status))
        .reduce((s, r) => s + (r.quantity ?? 1), 0);
      expected += ticketHeadsExpected;

      let checked =
        (glCheckedRes.data || []).reduce((s, e) => s + glParty(e.plus_guests), 0) +
        (tablesCheckedRes.data || []).reduce((s, b) => s + (b.party_size || 0), 0);

      const ticketHeadsUsed = ticketRows
        .filter((r) => r.status === "used")
        .reduce((s, r) => s + (r.quantity ?? 1), 0);
      checked += ticketHeadsUsed;

      for (const g of recurringCheckedRes.data || []) checked += incrementalCheckinHeads(g);
      for (const g of oneDayCheckedRes.data || []) checked += incrementalCheckinHeads(g);

      setGuestsCheckedIn(Math.round(checked));
      setGuestsExpected(Math.max(1, Math.round(expected)));

      setTableBookingsTonight(tableRowsNonCancelled.length);
      setPendingTableBookings(pendingBookingsRes.count ?? 0);

      const totalTables = (venueTablesRes.data || []).length;
      const bookedLabels = new Set(
        (tablesBookedRes.data || []).map((b) => (b.table_number || "").trim()).filter(Boolean)
      );
      setOccupancyPct(
        totalTables > 0 ? Math.min(100, Math.round((bookedLabels.size / totalTables) * 100)) : 0
      );

      const bookingTimes = (tableRowsToday || [])
        .filter((b) => !["cancelled"].includes(b.status))
        .map((b) => b.booking_time)
        .filter(Boolean) as string[];
      setPeakBookingHour(peakHourFromTimes(bookingTimes));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  }, [venueId, today]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`venue-dashboard-stats-${venueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_list_entries" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "table_bookings" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_purchases" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "one_day_list_guests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "recurring_list_guests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, venueId]);

  return {
    loading,
    error,
    revenue,
    guestsCheckedIn,
    guestsExpected,
    tableBookingsTonight,
    pendingTableBookings,
    occupancyPct,
    peakBookingHour,
    refetch: load,
  };
}

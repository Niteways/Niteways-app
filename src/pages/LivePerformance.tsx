import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { format } from "date-fns";
import {
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
} from "lucide-react";

const DEFAULT_VENUE_ID = "f5d0702a-6bd9-42e1-bf2d-87681c103d17";

type AlertItem = { type: "warning" | "info" | "success"; message: string };

type RecentRow = { id: string; name: string; time: string; type: string; sortKey: number };

function jsDayToRecurringDbDay(d: Date): number {
  const n = d.getDay();
  return n === 0 ? 7 : n;
}

function listTypeLabel(raw: string): string {
  const t = (raw || "").toLowerCase();
  if (t === "vip") return "VIP";
  if (t === "aa") return "AA";
  if (t === "promo") return "Promo";
  if (t === "standard") return "Guest List";
  return raw.replace(/\b\w/g, (c) => c.toUpperCase()) || "Guest List";
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

const LivePerformance = () => {
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = useMemo(
    () => (isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID),
    [isImpersonating, impersonatedVenueId]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenue, setRevenue] = useState(0);
  const [revenueTarget, setRevenueTarget] = useState(15_000);
  const [guestsIn, setGuestsIn] = useState(0);
  const [guestsExpected, setGuestsExpected] = useState(0);
  const [occupancyPct, setOccupancyPct] = useState(0);
  const [avgSpend, setAvgSpend] = useState(0);
  const [peakTime, setPeakTime] = useState("—");
  const [currentTime, setCurrentTime] = useState(() => format(new Date(), "HH:mm"));
  const [recentCheckins, setRecentCheckins] = useState<RecentRow[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const load = useCallback(async () => {
    setError(null);
    const today = new Date().toISOString().split("T")[0];
    const dow = jsDayToRecurringDbDay(new Date());

    try {
      const [
        ticketsRes,
        tablesTodayRes,
        glEntriesRes,
        glCheckedRes,
        tablesCheckedRes,
        tablesExpectedRes,
        venueTablesRes,
        tablesBookedRes,
        pendingBookingsRes,
        pendingTicketsRes,
        glRecentRes,
        tbRecentRes,
        odRecentRes,
        recRecentRes,
        oneDayExpectedRes,
        recurringExpectedRes,
        recurringCheckedRes,
        oneDayCheckedRes,
      ] = await Promise.all([
        supabase
          .from("ticket_purchases")
          .select("price, quantity, status")
          .eq("venue_id", activeVenueId)
          .eq("event_date", today),
        supabase
          .from("table_bookings")
          .select("price, party_size, status, booking_time")
          .eq("venue_id", activeVenueId)
          .eq("booking_date", today),
        supabase
          .from("guest_list_entries")
          .select("plus_guests, status")
          .eq("venue_id", activeVenueId)
          .eq("event_date", today),
        supabase
          .from("guest_list_entries")
          .select("plus_guests")
          .eq("venue_id", activeVenueId)
          .eq("event_date", today)
          .eq("checked_in", true),
        supabase
          .from("table_bookings")
          .select("party_size")
          .eq("venue_id", activeVenueId)
          .eq("booking_date", today)
          .eq("status", "checked_in"),
        supabase
          .from("table_bookings")
          .select("party_size, status")
          .eq("venue_id", activeVenueId)
          .eq("booking_date", today)
          .not("status", "eq", "cancelled"),
        supabase.from("venue_tables").select("id").eq("venue_id", activeVenueId),
        supabase
          .from("table_bookings")
          .select("table_number, status")
          .eq("venue_id", activeVenueId)
          .eq("booking_date", today)
          .in("status", ["confirmed", "checked_in", "vip", "completed"]),
        supabase
          .from("table_bookings")
          .select("id", { count: "exact", head: true })
          .eq("venue_id", activeVenueId)
          .eq("booking_date", today)
          .eq("status", "pending"),
        supabase
          .from("ticket_purchases")
          .select("id", { count: "exact", head: true })
          .eq("venue_id", activeVenueId)
          .eq("event_date", today)
          .eq("status", "pending"),
        supabase
          .from("guest_list_entries")
          .select("id, guest_name, list_type, check_in_time")
          .eq("venue_id", activeVenueId)
          .eq("event_date", today)
          .eq("checked_in", true)
          .not("check_in_time", "is", null)
          .order("check_in_time", { ascending: false })
          .limit(6),
        supabase
          .from("table_bookings")
          .select("id, guest_name, updated_at, status")
          .eq("venue_id", activeVenueId)
          .eq("booking_date", today)
          .eq("status", "checked_in")
          .order("updated_at", { ascending: false })
          .limit(6),
        supabase
          .from("one_day_list_guests")
          .select(
            "id, guest_name, guest_type, check_in_time, checked_in, one_day_guest_lists!inner(venue_id, event_date)"
          )
          .eq("one_day_guest_lists.venue_id", activeVenueId)
          .eq("one_day_guest_lists.event_date", today)
          .eq("checked_in", true)
          .not("check_in_time", "is", null)
          .order("check_in_time", { ascending: false })
          .limit(6),
        supabase
          .from("recurring_list_guests")
          .select(
            "id, guest_name, guest_type, check_in_time, checked_in, recurring_guest_lists!inner(venue_id, day_of_week)"
          )
          .eq("recurring_guest_lists.venue_id", activeVenueId)
          .eq("recurring_guest_lists.day_of_week", dow)
          .eq("checked_in", true)
          .not("check_in_time", "is", null)
          .order("check_in_time", { ascending: false })
          .limit(6),
        supabase
          .from("one_day_list_guests")
          .select("plus_guests, one_day_guest_lists!inner(venue_id, event_date)")
          .eq("one_day_guest_lists.venue_id", activeVenueId)
          .eq("one_day_guest_lists.event_date", today),
        supabase
          .from("recurring_list_guests")
          .select("plus_guests, recurring_guest_lists!inner(venue_id, day_of_week)")
          .eq("recurring_guest_lists.venue_id", activeVenueId)
          .eq("recurring_guest_lists.day_of_week", dow),
        supabase
          .from("recurring_list_guests")
          .select("checked_in_count, plus_guests, paying_guests")
          .eq("checked_in", true),
        supabase
          .from("one_day_list_guests")
          .select("checked_in_count, plus_guests, paying_guests, one_day_guest_lists!inner(venue_id, event_date)")
          .eq("one_day_guest_lists.venue_id", activeVenueId)
          .eq("one_day_guest_lists.event_date", today),
      ]);

      const err =
        ticketsRes.error ||
        tablesTodayRes.error ||
        glEntriesRes.error ||
        glCheckedRes.error ||
        tablesCheckedRes.error ||
        tablesExpectedRes.error ||
        venueTablesRes.error ||
        tablesBookedRes.error ||
        pendingBookingsRes.error ||
        pendingTicketsRes.error ||
        glRecentRes.error ||
        tbRecentRes.error ||
        odRecentRes.error ||
        recRecentRes.error ||
        oneDayExpectedRes.error ||
        recurringExpectedRes.error ||
        recurringCheckedRes.error ||
        oneDayCheckedRes.error;
      if (err) {
        setError(err.message || "Failed to load live data");
        return;
      }

      const ticketRows = ticketsRes.data || [];
      const tableRowsToday = tablesTodayRes.data || [];

      let rev = 0;
      for (const row of ticketRows) {
        if (!["confirmed", "used"].includes(row.status)) continue;
        const q = row.quantity ?? 1;
        rev += Number(row.price || 0) * q;
      }
      for (const row of tableRowsToday) {
        if (["confirmed", "completed", "vip", "checked_in"].includes(row.status)) {
          rev += Number(row.price || 0);
        }
      }
      const roundedRev = Math.round(rev);
      const stretchTarget = rev > 0 ? Math.max(500, Math.round(rev / 0.55)) : 15_000;
      setRevenue(roundedRev);
      setRevenueTarget(stretchTarget);

      const glParty = (plus: number | null) => 1 + (plus ?? 0);
      let expected =
        (glEntriesRes.data || [])
          .filter((e) => !["cancelled", "declined", "removed"].includes((e.status || "").toLowerCase()))
          .reduce((s, e) => s + glParty(e.plus_guests), 0) +
        (tablesExpectedRes.data || []).reduce((s, b) => s + (b.party_size || 0), 0) +
        (oneDayExpectedRes.data || []).reduce((s, g: { plus_guests: number }) => s + glParty(g.plus_guests), 0) +
        (recurringExpectedRes.data || []).reduce((s, g: { plus_guests: number }) => s + glParty(g.plus_guests), 0);

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

      const incrementalHeads = (
        row: { plus_guests: number; checked_in?: boolean | null; checked_in_count?: number | null }
      ) => {
        const total = glParty(row.plus_guests);
        const cnt = row.checked_in_count;
        if (cnt != null && cnt > 0) return Math.min(total, cnt);
        if (row.checked_in) return total;
        return 0;
      };

      for (const g of recurringCheckedRes.data || []) {
        checked += incrementalHeads(g);
      }
      for (const g of oneDayCheckedRes.data || []) {
        checked += incrementalHeads(g);
      }

      setGuestsIn(Math.round(checked));
      setGuestsExpected(Math.max(1, Math.round(expected)));

      const totalTables = (venueTablesRes.data || []).length;
      const bookedLabels = new Set(
        (tablesBookedRes.data || []).map((b) => (b.table_number || "").trim()).filter(Boolean)
      );
      const occ = totalTables > 0 ? Math.min(100, Math.round((bookedLabels.size / totalTables) * 100)) : 0;
      setOccupancyPct(occ);

      const headsIn = Math.max(1, checked);
      setAvgSpend(Math.round(rev / headsIn));

      const bookingTimes = (tablesTodayRes.data || [])
        .filter((b) => !["cancelled"].includes(b.status))
        .map((b) => b.booking_time)
        .filter(Boolean) as string[];
      setPeakTime(peakHourFromTimes(bookingTimes));

      const merged: RecentRow[] = [];

      for (const r of glRecentRes.data || []) {
        if (!r.check_in_time) continue;
        const ts = new Date(r.check_in_time).getTime();
        merged.push({
          id: `gl-${r.id}`,
          name: r.guest_name,
          time: format(new Date(r.check_in_time), "HH:mm"),
          type: listTypeLabel(r.list_type),
          sortKey: ts,
        });
      }
      for (const r of tbRecentRes.data || []) {
        const ts = new Date(r.updated_at).getTime();
        merged.push({
          id: `tb-${r.id}`,
          name: r.guest_name,
          time: format(new Date(r.updated_at), "HH:mm"),
          type: "Table",
          sortKey: ts,
        });
      }
      for (const r of odRecentRes.data || []) {
        if (!r.check_in_time) continue;
        const ts = new Date(r.check_in_time).getTime();
        merged.push({
          id: `od-${r.id}`,
          name: r.guest_name,
          time: format(new Date(r.check_in_time), "HH:mm"),
          type: listTypeLabel(r.guest_type),
          sortKey: ts,
        });
      }
      for (const r of recRecentRes.data || []) {
        if (!r.check_in_time) continue;
        const ts = new Date(r.check_in_time).getTime();
        merged.push({
          id: `rc-${r.id}`,
          name: r.guest_name,
          time: format(new Date(r.check_in_time), "HH:mm"),
          type: listTypeLabel(r.guest_type),
          sortKey: ts,
        });
      }

      merged.sort((a, b) => b.sortKey - a.sortKey);
      setRecentCheckins(merged.slice(0, 8));

      const nextAlerts: AlertItem[] = [];
      const pendB = pendingBookingsRes.count ?? 0;
      const pendT = pendingTicketsRes.count ?? 0;
      if (pendB > 0) {
        nextAlerts.push({
          type: "warning",
          message: `${pendB} table booking request${pendB === 1 ? "" : "s"} pending approval`,
        });
      }
      if (pendT > 0) {
        nextAlerts.push({
          type: "info",
          message: `${pendT} ticket order${pendT === 1 ? "" : "s"} pending for tonight`,
        });
      }
      if (rev > 0 && stretchTarget > 0 && rev >= stretchTarget * 0.5) {
        nextAlerts.push({ type: "success", message: "Tonight's revenue has reached at least 50% of the stretch target" });
      }
      if (!nextAlerts.length) {
        nextAlerts.push({ type: "info", message: "No operational alerts for tonight. Data updates from Supabase." });
      }
      setAlerts(nextAlerts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load live data");
    } finally {
      setLoading(false);
    }
  }, [activeVenueId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(format(new Date(), "HH:mm")), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("live-performance")
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_list_entries" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "table_bookings" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_purchases" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "one_day_list_guests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "recurring_list_guests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const revenueProgress = revenueTarget > 0 ? Math.min(100, (revenue / revenueTarget) * 100) : 0;
  const guestsProgress = guestsExpected > 0 ? Math.min(100, (guestsIn / guestsExpected) * 100) : 0;

  return (
    <AdminLayout title="Live Performance" subtitle="">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal"></span>
          </span>
          <span className="text-sm text-muted-foreground">
            {loading ? "Loading Supabase…" : error ? `Error: ${error}` : "Live · Supabase"}
          </span>
          {!loading && !error && (
            <span className="text-xs text-muted-foreground">
              Revenue {revenueProgress.toFixed(0)}% of target · Arrivals {guestsProgress.toFixed(0)}% of expected
            </span>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tonight's Revenue"
            value={loading ? "—" : `$${revenue.toLocaleString()}`}
            subtitle={`Target: $${revenueTarget.toLocaleString()}`}
            icon={DollarSign}
            variant="gold"
            delay={0}
          />
          <StatCard
            title="Check-ins"
            value={loading ? "—" : guestsIn.toString()}
            subtitle={`Expected: ${guestsExpected}`}
            icon={Users}
            variant="teal"
            delay={0.1}
          />
          <StatCard
            title="Occupancy"
            value={loading ? "—" : `${occupancyPct}%`}
            subtitle="Tables with an active booking tonight"
            icon={Target}
            variant="coral"
            delay={0.2}
          />
          <StatCard
            title="Avg Spend"
            value={loading ? "—" : `$${avgSpend}`}
            subtitle="Revenue ÷ check-ins (heads)"
            icon={Zap}
            variant="purple"
            delay={0.3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Check-ins</h3>
              <Button variant="ghost" size="sm" type="button" disabled>
                Supabase
              </Button>
            </div>
            <div className="space-y-3">
              {loading && (
                <p className="text-sm text-muted-foreground">Loading recent check-ins…</p>
              )}
              {!loading && !recentCheckins.length && (
                <p className="text-sm text-muted-foreground">No check-ins recorded for tonight yet.</p>
              )}
              {recentCheckins.map((checkin, index) => (
                <motion.div
                  key={checkin.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-teal" />
                    <span className="font-medium">{checkin.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {checkin.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{checkin.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Alerts & Notifications</h3>
              <Badge variant="outline" className="text-xs">
                {alerts.length} active
              </Badge>
            </div>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <motion.div
                  key={`${alert.type}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg",
                    alert.type === "warning" && "bg-gold/10",
                    alert.type === "info" && "bg-primary/10",
                    alert.type === "success" && "bg-teal/10"
                  )}
                >
                  <AlertCircle
                    className={cn(
                      "w-5 h-5 mt-0.5",
                      alert.type === "warning" && "text-gold",
                      alert.type === "info" && "text-primary",
                      alert.type === "success" && "text-teal"
                    )}
                  />
                  <span className="text-sm">{alert.message}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">Peak booking hour (tonight)</h3>
                <p className="text-sm text-muted-foreground">From tonight&apos;s table booking times in Supabase</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{peakTime}</p>
              <p className="text-sm text-muted-foreground">Current: {currentTime}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default LivePerformance;

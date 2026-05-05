import { useMemo } from "react";
import { motion } from "framer-motion";
import { MobileStatsCarousel } from "./MobileStatsCarousel";
import { MobileQuickActionsGrid } from "./MobileQuickActionsGrid";
import { MobileTableStatus } from "./MobileTableStatus";
import { RecentActivity } from "./RecentActivity";
import { UpcomingEvents } from "./UpcomingEvents";
import type { VenueDashboardStats } from "@/hooks/useVenueDashboardStats";
import { DollarSign, Users, CalendarCheck, TrendingUp } from "lucide-react";

type MobileDashboardProps = {
  venueId: string;
  dash: VenueDashboardStats;
};

export function MobileDashboard({ venueId, dash }: MobileDashboardProps) {

  const stats = useMemo(
    () => [
      {
        title: "Tonight's Revenue",
        value: dash.loading ? "—" : `$${dash.revenue.toLocaleString()}`,
        subtitle: "Tickets + table bookings (today)",
        icon: DollarSign,
        variant: "gold" as const,
      },
      {
        title: "Guests Checked In",
        value: dash.loading ? "—" : dash.guestsCheckedIn.toString(),
        subtitle: `of ${dash.guestsExpected} expected`,
        icon: Users,
        variant: "teal" as const,
      },
      {
        title: "Table Bookings",
        value: dash.loading ? "—" : dash.tableBookingsTonight.toString(),
        subtitle: `${dash.pendingTableBookings} pending approval`,
        icon: CalendarCheck,
        variant: "coral" as const,
      },
      {
        title: "Occupancy Rate",
        value: dash.loading ? "—" : `${dash.occupancyPct}%`,
        subtitle:
          dash.peakBookingHour !== "—"
            ? `Busiest booking slot ~${dash.peakBookingHour}`
            : "Tables with an active booking tonight",
        icon: TrendingUp,
        variant: "purple" as const,
      },
    ],
    [dash]
  );

  return <div className="space-y-4 pb-24">
      {/* Welcome header - simplified */}
      <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="mb-2">
        
      </motion.div>

      {/* Swipeable Stats */}
      <MobileStatsCarousel stats={stats} />

      {/* Quick Actions Grid */}
      <MobileQuickActionsGrid />

      {/* Table Status */}
      <MobileTableStatus venueId={venueId} />

      {/* Recent Activity */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4,
      delay: 0.4
    }}>
        <RecentActivity />
      </motion.div>

      {/* Upcoming Events */}
      <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4,
      delay: 0.5
    }}>
        <UpcomingEvents />
      </motion.div>
    </div>;
}
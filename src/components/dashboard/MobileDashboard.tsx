import { motion } from "framer-motion";
import { MobileStatsCarousel } from "./MobileStatsCarousel";
import { MobileQuickActionsGrid } from "./MobileQuickActionsGrid";
import { MobileTableStatus } from "./MobileTableStatus";
import { RecentActivity } from "./RecentActivity";
import { UpcomingEvents } from "./UpcomingEvents";
import { DollarSign, Users, CalendarCheck, TrendingUp } from "lucide-react";
const stats = [{
  title: "Tonight's Revenue",
  value: "$12,847",
  subtitle: "+18% from last Saturday",
  icon: DollarSign,
  variant: "gold" as const
}, {
  title: "Guests Checked In",
  value: "342",
  subtitle: "of 520 expected",
  icon: Users,
  variant: "teal" as const
}, {
  title: "Table Bookings",
  value: "28",
  subtitle: "6 pending approval",
  icon: CalendarCheck,
  variant: "coral" as const
}, {
  title: "Occupancy Rate",
  value: "87%",
  subtitle: "Peak expected 11PM",
  icon: TrendingUp,
  variant: "purple" as const
}];
export function MobileDashboard() {
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
      <MobileTableStatus />

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
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { TableOverview } from "@/components/dashboard/TableOverview";
import { TableAvailabilityWidget } from "@/components/dashboard/TableAvailabilityWidget";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";
import { VenueIndicatorPill } from "@/components/layout/VenueIndicatorPill";
import { VenueActivityTimeline } from "@/components/dashboard/VenueActivityTimeline";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePortal } from "@/contexts/PortalContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useVenueDashboardStats } from "@/hooks/useVenueDashboardStats";
import {
  DollarSign,
  Users,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";

import { getPortalScopeVenueId } from "@/config/venueScope";
import { useVenueProfile } from "@/hooks/useVenueProfile";

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { mode } = usePortal();
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const [searchParams] = useSearchParams();
  const isVenuePortal = mode === "venue";
  const { displayName } = useVenueProfile();

  const activeVenueId = useMemo(
    () =>
      isImpersonating && impersonatedVenueId
        ? impersonatedVenueId
        : getPortalScopeVenueId(),
    [isImpersonating, impersonatedVenueId, searchParams]
  );

  const welcomeSubtitle = displayName.trim()
    ? `Welcome back, ${displayName.trim()}`
    : "Venue dashboard";

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const dash = useVenueDashboardStats(activeVenueId, today);

  // Show mobile dashboard for venue portal on mobile
  if (isMobile && isVenuePortal) {
    return (
      <AdminLayout title="Dashboard" subtitle={welcomeSubtitle}>
        <MobileDashboard venueId={activeVenueId} dash={dash} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard" subtitle={welcomeSubtitle}>
      <div className="space-y-6">
        {/* Venue Indicator */}
        <VenueIndicatorPill />
        {dash.error && (
          <p className="text-sm text-destructive">{dash.error}</p>
        )}
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tonight's Revenue"
            value={dash.loading ? "—" : `$${dash.revenue.toLocaleString()}`}
            subtitle="Tickets + table bookings (today)"
            icon={DollarSign}
            variant="gold"
            delay={0}
          />
          <StatCard
            title="Guests Checked In"
            value={dash.loading ? "—" : dash.guestsCheckedIn.toString()}
            subtitle={`of ${dash.guestsExpected} expected`}
            icon={Users}
            variant="teal"
            delay={0.1}
          />
          <StatCard
            title="Table Bookings"
            value={dash.loading ? "—" : dash.tableBookingsTonight.toString()}
            subtitle={`${dash.pendingTableBookings} pending approval`}
            icon={CalendarCheck}
            variant="coral"
            delay={0.2}
          />
          <StatCard
            title="Occupancy Rate"
            value={dash.loading ? "—" : `${dash.occupancyPct}%`}
            subtitle={
              dash.peakBookingHour !== "—"
                ? `Busiest booking slot ~${dash.peakBookingHour}`
                : "Tables with an active booking tonight"
            }
            icon={TrendingUp}
            variant="purple"
            delay={0.3}
          />
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TableOverview />
            <RecentActivity />
          </div>
          <div className="space-y-6">
            {/* Show venue activity timeline when impersonating */}
            {isImpersonating && activeVenueId && (
              <VenueActivityTimeline venueId={activeVenueId} />
            )}
            <TableAvailabilityWidget />
            <UpcomingEvents />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;

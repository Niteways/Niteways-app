import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CheckCircle2 } from "lucide-react";
import { useRealtimeTableStatus, TableStatus } from "@/hooks/useRealtimeTableStatus";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { DEFAULT_VENUE_ID } from "@/config/venueScope";

const statusConfig: Record<TableStatus, { label: string; color: string; dotColor: string }> = {
  available: {
    label: "Available",
    color: "bg-teal/20 text-teal border-teal/30",
    dotColor: "bg-teal",
  },
  confirmed: {
    label: "Booked",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    dotColor: "bg-blue-500",
  },
  pending: {
    label: "Pending",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    dotColor: "bg-amber-500",
  },
  blocked: {
    label: "Blocked",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    dotColor: "bg-red-500",
  },
  vip: {
    label: "VIP",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    dotColor: "bg-purple-500",
  },
};

export function TableAvailabilityWidget() {
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  const today = format(new Date(), "yyyy-MM-dd");
  const { tables: tableStatuses = [], loading } = useRealtimeTableStatus(today, { venueId: activeVenueId });

  // Calculate summary stats
  const available = tableStatuses.filter(t => t.status === "available").length;
  const booked = tableStatuses.filter(t => t.status === "confirmed").length;
  const pending = tableStatuses.filter(t => t.status === "pending").length;
  const blocked = tableStatuses.filter(t => t.status === "blocked").length;

  const displayTables = tableStatuses;
  const showEmptyHint = !loading && displayTables.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Table Availability
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              Real-time
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-teal/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-teal">{available}</p>
              <p className="text-[10px] text-teal/80">Available</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-blue-400">{booked}</p>
              <p className="text-[10px] text-blue-400/80">Booked</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-amber-400">{pending}</p>
              <p className="text-[10px] text-amber-400/80">Pending</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-red-400">{blocked}</p>
              <p className="text-[10px] text-red-400/80">Blocked</p>
            </div>
          </div>

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-2">Loading tables…</p>
          )}
          {showEmptyHint && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No tables in Supabase for this venue. Counts above stay at 0 until tables exist.
            </p>
          )}
          {displayTables.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {displayTables.slice(0, 9).map((table) => {
              const status = statusConfig[table.status] || statusConfig.available;

              return (
                <div
                  key={table.id}
                  className={cn(
                    "relative p-3 rounded-lg border transition-all",
                    status.color
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{table.label}</span>
                    <div className={cn("w-2 h-2 rounded-full", status.dotColor)} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="opacity-70">{table.capacity} seats</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
              <span className="text-[10px] text-muted-foreground">Direct Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-muted-foreground">Requires Approval</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

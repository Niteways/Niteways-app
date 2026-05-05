import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/StatCard";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Target,
} from "lucide-react";

const liveStats = {
  revenue: 8420,
  revenueTarget: 15000,
  guestsIn: 245,
  guestsExpected: 520,
  tableOccupancy: 78,
  avgSpend: 156,
  peakTime: "23:00",
  currentTime: "22:15",
};

const recentCheckins = [
  { name: "Sophie A.", time: "22:14", type: "VIP" },
  { name: "Michael C.", time: "22:12", type: "Guest List" },
  { name: "Emma W.", time: "22:10", type: "Table" },
  { name: "James W.", time: "22:08", type: "Guest List" },
  { name: "Lisa P.", time: "22:05", type: "Walk-in" },
];

const alerts = [
  { type: "warning", message: "Table 8 payment pending 15+ minutes" },
  { type: "info", message: "VIP guest Marcus T. arriving in 30 min" },
  { type: "success", message: "Revenue target 50% reached" },
];

const LivePerformance = () => {
  const revenueProgress = (liveStats.revenue / liveStats.revenueTarget) * 100;
  const guestsProgress = (liveStats.guestsIn / liveStats.guestsExpected) * 100;

  return (
    <AdminLayout title="Live Performance" subtitle="">
      <div className="space-y-6">
        {/* Live Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal"></span>
          </span>
          <span className="text-sm text-muted-foreground">Live · Updated just now</span>
        </motion.div>

        {/* Main Stats - Using StatCard like Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tonight's Revenue"
            value={`$${liveStats.revenue.toLocaleString()}`}
            subtitle={`Target: $${liveStats.revenueTarget.toLocaleString()}`}
            icon={DollarSign}
            variant="gold"
            delay={0}
          />
          <StatCard
            title="Check-ins"
            value={liveStats.guestsIn.toString()}
            subtitle={`Expected: ${liveStats.guestsExpected}`}
            icon={Users}
            variant="teal"
            delay={0.1}
          />
          <StatCard
            title="Occupancy"
            value={`${liveStats.tableOccupancy}%`}
            subtitle="Tables occupied"
            icon={Target}
            variant="coral"
            delay={0.2}
          />
          <StatCard
            title="Avg Spend"
            value={`$${liveStats.avgSpend}`}
            subtitle="Per person"
            icon={Zap}
            variant="purple"
            delay={0.3}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Check-ins */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Check-ins</h3>
              <Button variant="ghost" size="sm">View all</Button>
            </div>
            <div className="space-y-3">
              {recentCheckins.map((checkin, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-teal" />
                    <span className="font-medium">{checkin.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{checkin.type}</Badge>
                    <span className="text-sm text-muted-foreground">{checkin.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Alerts & Notifications</h3>
              <Badge variant="outline" className="text-xs">{alerts.length} active</Badge>
            </div>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg",
                    alert.type === "warning" && "bg-gold/10",
                    alert.type === "info" && "bg-primary/10",
                    alert.type === "success" && "bg-teal/10"
                  )}
                >
                  <AlertCircle className={cn(
                    "w-5 h-5 mt-0.5",
                    alert.type === "warning" && "text-gold",
                    alert.type === "info" && "text-primary",
                    alert.type === "success" && "text-teal"
                  )} />
                  <span className="text-sm">{alert.message}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Peak Time Indicator */}
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
                <h3 className="font-semibold">Peak Time Expected</h3>
                <p className="text-sm text-muted-foreground">Based on historical data</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{liveStats.peakTime}</p>
              <p className="text-sm text-muted-foreground">Current: {liveStats.currentTime}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default LivePerformance;

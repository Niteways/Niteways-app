import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Clock, Check, AlertCircle, UserPlus } from "lucide-react";

interface Activity {
  id: string;
  type: "booking" | "checkin" | "alert" | "guest";
  message: string;
  time: string;
  status?: "success" | "pending" | "warning";
}

const activities: Activity[] = [
  {
    id: "1",
    type: "booking",
    message: "VIP Table 12 booked by Marcus T.",
    time: "2 min ago",
    status: "success",
  },
  {
    id: "2",
    type: "checkin",
    message: "Sarah M. checked in (Guest List)",
    time: "5 min ago",
    status: "success",
  },
  {
    id: "3",
    type: "alert",
    message: "Table 8 payment pending",
    time: "12 min ago",
    status: "pending",
  },
  {
    id: "4",
    type: "guest",
    message: "Alex added 4 guests to VIP list",
    time: "18 min ago",
    status: "success",
  },
  {
    id: "5",
    type: "alert",
    message: "High-risk guest flagged at entrance",
    time: "25 min ago",
    status: "warning",
  },
];

const iconMap = {
  booking: Check,
  checkin: Check,
  alert: AlertCircle,
  guest: UserPlus,
};

const statusColors = {
  success: "bg-teal/20 text-teal",
  pending: "bg-gold/20 text-gold",
  warning: "bg-coral/20 text-coral",
};

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.type];
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
              className="flex items-start gap-3"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  statusColors[activity.status || "success"]
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.message}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

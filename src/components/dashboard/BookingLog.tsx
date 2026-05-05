import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User, Check, X, Edit, Plus, AlertCircle } from "lucide-react";

interface LogEntry {
  id: string;
  action: "created" | "confirmed" | "cancelled" | "modified" | "checked_in";
  user: string;
  target: string;
  details: string;
  timestamp: string;
}

const logEntries: LogEntry[] = [
  { id: "1", action: "confirmed", user: "Sarah W.", target: "T12 - Marcus Thompson", details: "VIP booking confirmed", timestamp: "22:15" },
  { id: "2", action: "created", user: "Marcus T.", target: "T5 - New Booking", details: "4 guests, $1,500", timestamp: "21:45" },
  { id: "3", action: "modified", user: "John D.", target: "T3 - James Rodriguez", details: "Changed time to 23:00", timestamp: "21:30" },
  { id: "4", action: "cancelled", user: "Sarah W.", target: "T7 - Emily Park", details: "Guest request", timestamp: "21:15" },
  { id: "5", action: "checked_in", user: "Mike J.", target: "T8 - Emily Chen", details: "Party of 4 arrived", timestamp: "21:00" },
  { id: "6", action: "created", user: "Alex M.", target: "VIP 1 - Corporate Group", details: "10 guests, $5,000", timestamp: "20:45" },
  { id: "7", action: "confirmed", user: "John D.", target: "T2 - Lisa Park", details: "Standard booking", timestamp: "20:30" },
];

const actionStyles = {
  created: { icon: Plus, color: "text-teal", bg: "bg-teal/10" },
  confirmed: { icon: Check, color: "text-primary", bg: "bg-primary/10" },
  cancelled: { icon: X, color: "text-coral", bg: "bg-coral/10" },
  modified: { icon: Edit, color: "text-gold", bg: "bg-gold/10" },
  checked_in: { icon: AlertCircle, color: "text-purple", bg: "bg-purple/10" },
};

interface BookingLogProps {
  className?: string;
  maxHeight?: string;
}

export function BookingLog({ className, maxHeight = "300px" }: BookingLogProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Booking Activity Log</h3>
        <Badge variant="outline" className="text-xs">{logEntries.length} entries</Badge>
      </div>
      <ScrollArea className="pr-4" style={{ height: maxHeight }}>
        <div className="space-y-3">
          {logEntries.map((entry, index) => {
            const { icon: Icon, color, bg } = actionStyles[entry.action];
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className={`p-1.5 rounded-lg ${bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{entry.target}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.details}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span>{entry.user}</span>
                    <Clock className="w-3 h-3 ml-2" />
                    <span>{entry.timestamp}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

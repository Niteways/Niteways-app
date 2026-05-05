import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, LogIn, LogOut, Edit, UserPlus, Shield, Eye } from "lucide-react";

interface ActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: "login" | "logout" | "edit" | "create" | "permission" | "view";
  details: string;
  timestamp: string;
  date: string;
}

const activityEntries: ActivityEntry[] = [
  { id: "1", userId: "1", userName: "John Doe", action: "login", details: "Logged in from Chrome/Mac", timestamp: "22:30", date: "Today" },
  { id: "2", userId: "2", userName: "Marcus Thompson", action: "create", details: "Added 3 guests to list", timestamp: "22:15", date: "Today" },
  { id: "3", userId: "3", userName: "Sarah Wilson", action: "edit", details: "Modified table T5 booking", timestamp: "21:45", date: "Today" },
  { id: "4", userId: "5", userName: "Mike Johnson", action: "view", details: "Viewed check-in dashboard", timestamp: "21:30", date: "Today" },
  { id: "5", userId: "1", userName: "John Doe", action: "permission", details: "Updated Alex's role permissions", timestamp: "20:00", date: "Today" },
  { id: "6", userId: "4", userName: "Alex Martinez", action: "create", details: "Added 5 guests to promo list", timestamp: "19:30", date: "Today" },
  { id: "7", userId: "3", userName: "Sarah Wilson", action: "logout", details: "Session ended", timestamp: "18:00", date: "Today" },
  { id: "8", userId: "7", userName: "David Brown", action: "login", details: "Logged in from Safari/iOS", timestamp: "17:30", date: "Today" },
];

const actionStyles = {
  login: { icon: LogIn, color: "text-teal", bg: "bg-teal/10", label: "Login" },
  logout: { icon: LogOut, color: "text-muted-foreground", bg: "bg-muted", label: "Logout" },
  edit: { icon: Edit, color: "text-gold", bg: "bg-gold/10", label: "Edit" },
  create: { icon: UserPlus, color: "text-primary", bg: "bg-primary/10", label: "Create" },
  permission: { icon: Shield, color: "text-coral", bg: "bg-coral/10", label: "Permission" },
  view: { icon: Eye, color: "text-purple", bg: "bg-purple/10", label: "View" },
};

interface UserActivityLogProps {
  className?: string;
  maxHeight?: string;
}

export function UserActivityLog({ className, maxHeight = "400px" }: UserActivityLogProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">User Activity Log</h3>
        <Badge variant="outline" className="text-xs">{activityEntries.length} activities</Badge>
      </div>
      <ScrollArea className="pr-4" style={{ height: maxHeight }}>
        <div className="space-y-3">
          {activityEntries.map((entry, index) => {
            const { icon: Icon, color, bg, label } = actionStyles[entry.action];
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border border-border/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {entry.userName.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{entry.userName}</span>
                    <Badge variant="outline" className={`text-xs gap-1 ${bg} ${color} border-transparent`}>
                      <Icon className="w-3 h-3" />
                      {label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{entry.date} at {entry.timestamp}</span>
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

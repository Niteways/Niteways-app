import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  UserCheck, 
  Users, 
  TrendingUp,
  Star,
  Trophy,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMemberStats {
  id: string;
  name: string;
  role: "manager" | "host" | "promoter" | "security" | "marketing";
  checkInsToday: number;
  checkInsTotal: number;
  guestListAdds: number;
  guestListAddsTodal: number;
  conversionRate: number;
  avgRating: number;
}

const teamStats: TeamMemberStats[] = [
  { id: "1", name: "John Doe", role: "manager", checkInsToday: 45, checkInsTotal: 1250, guestListAdds: 28, guestListAddsTodal: 890, conversionRate: 85, avgRating: 4.8 },
  { id: "2", name: "Marcus Thompson", role: "promoter", checkInsToday: 12, checkInsTotal: 340, guestListAdds: 45, guestListAddsTodal: 1240, conversionRate: 72, avgRating: 4.5 },
  { id: "3", name: "Sarah Wilson", role: "host", checkInsToday: 28, checkInsTotal: 890, guestListAdds: 15, guestListAddsTodal: 420, conversionRate: 90, avgRating: 4.9 },
  { id: "4", name: "Alex Martinez", role: "promoter", checkInsToday: 8, checkInsTotal: 210, guestListAdds: 62, guestListAddsTodal: 1580, conversionRate: 68, avgRating: 4.2 },
  { id: "5", name: "Mike Johnson", role: "security", checkInsToday: 67, checkInsTotal: 2100, guestListAdds: 0, guestListAddsTodal: 0, conversionRate: 95, avgRating: 4.7 },
  { id: "6", name: "Emily Chen", role: "marketing", checkInsToday: 0, checkInsTotal: 50, guestListAdds: 120, guestListAddsTodal: 2800, conversionRate: 78, avgRating: 4.4 },
  { id: "7", name: "David Brown", role: "host", checkInsToday: 15, checkInsTotal: 420, guestListAdds: 22, guestListAddsTodal: 580, conversionRate: 82, avgRating: 4.6 },
];

const roleStyles = {
  manager: { bg: "bg-coral/20", text: "text-coral", border: "border-coral/30" },
  host: { bg: "bg-teal/20", text: "text-teal", border: "border-teal/30" },
  promoter: { bg: "bg-gold/20", text: "text-gold", border: "border-gold/30" },
  security: { bg: "bg-purple/20", text: "text-purple", border: "border-purple/30" },
  marketing: { bg: "bg-primary/20", text: "text-primary", border: "border-primary/30" },
};

const TeamStatistics = () => {
  const totalCheckInsToday = teamStats.reduce((sum, m) => sum + m.checkInsToday, 0);
  const totalGuestListAdds = teamStats.reduce((sum, m) => sum + m.guestListAdds, 0);
  const avgConversion = Math.round(teamStats.reduce((sum, m) => sum + m.conversionRate, 0) / teamStats.length);

  // Sort by check-ins for top performers
  const topCheckIns = [...teamStats].sort((a, b) => b.checkInsToday - a.checkInsToday).slice(0, 3);
  const topPromoters = [...teamStats].filter(m => m.role === "promoter" || m.role === "marketing").sort((a, b) => b.guestListAdds - a.guestListAdds).slice(0, 3);

  return (
    <AdminLayout title="Team Statistics" subtitle="">
      <div className="space-y-4 pb-24">
        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-2"
        >
          <div className="p-3 text-center bg-muted/30 rounded-lg">
            <UserCheck className="w-5 h-5 mx-auto mb-1 text-teal" />
            <p className="text-xl font-bold text-foreground">{totalCheckInsToday}</p>
            <p className="text-[10px] text-muted-foreground">Check-ins Today</p>
          </div>
          <div className="p-3 text-center bg-muted/30 rounded-lg">
            <Users className="w-5 h-5 mx-auto mb-1 text-gold" />
            <p className="text-xl font-bold text-foreground">{totalGuestListAdds}</p>
            <p className="text-[10px] text-muted-foreground">Lists Adds Today</p>
          </div>
          <div className="p-3 text-center bg-muted/30 rounded-lg">
            <Target className="w-5 h-5 mx-auto mb-1 text-coral" />
            <p className="text-xl font-bold text-foreground">{avgConversion}%</p>
            <p className="text-[10px] text-muted-foreground">Avg Conversion</p>
          </div>
        </motion.div>

        {/* Top Performers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-semibold">Top Check-ins Today</h3>
          </div>
          {topCheckIns.map((member, index) => (
            <div key={member.id} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-bold">
                {index + 1}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-foreground text-xs">
                  {member.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0",
                    roleStyles[member.role].bg,
                    roleStyles[member.role].text,
                    roleStyles[member.role].border,
                    "capitalize"
                  )}
                >
                  {member.role}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-teal">{member.checkInsToday}</p>
                <p className="text-[9px] text-muted-foreground">check-ins</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Top Promoters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-coral" />
            <h3 className="text-sm font-semibold">Top Guest List Adds</h3>
          </div>
          {topPromoters.map((member, index) => (
            <div key={member.id} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-coral/20 text-coral text-xs font-bold">
                {index + 1}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-foreground text-xs">
                  {member.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-coral">{member.guestListAdds}</p>
                <p className="text-[9px] text-muted-foreground">today</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* All Team Members */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">All Staff Performance</h3>
          </div>
          {teamStats.map((member) => (
            <div key={member.id} className="p-3 bg-muted/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-foreground text-xs">
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1.5 py-0",
                        roleStyles[member.role].bg,
                        roleStyles[member.role].text,
                        roleStyles[member.role].border,
                        "capitalize"
                      )}
                    >
                      {member.role}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-gold fill-gold" />
                  <span className="text-sm font-medium">{member.avgRating}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Check-ins</p>
                  <p className="font-semibold">{member.checkInsToday} / {member.checkInsTotal}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">List Adds</p>
                  <p className="font-semibold">{member.guestListAdds} / {member.guestListAddsTodal}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Conversion</p>
                  <p className="font-semibold">{member.conversionRate}%</p>
                </div>
              </div>
              <Progress value={member.conversionRate} className="h-1" />
            </div>
          ))}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default TeamStatistics;
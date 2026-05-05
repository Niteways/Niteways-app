import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  CalendarCheck,
  UserCheck,
  DollarSign,
  Users,
  Edit,
  Plus,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  action: string;
  entity_type: string;
  details: string | null;
  created_at: string;
  performed_by: string | null;
}

interface VenueActivityTimelineProps {
  venueId: string;
}

const getActivityIcon = (entityType: string, action: string) => {
  if (entityType.includes("booking")) return CalendarCheck;
  if (entityType.includes("guest") || action.includes("check")) return UserCheck;
  if (entityType.includes("payment") || entityType.includes("revenue")) return DollarSign;
  if (entityType.includes("team")) return Users;
  if (action.includes("edit") || action.includes("update")) return Edit;
  if (action.includes("create") || action.includes("add")) return Plus;
  return Activity;
};

const getActivityColor = (action: string) => {
  if (action.includes("create") || action.includes("add") || action.includes("confirm")) return "teal";
  if (action.includes("cancel") || action.includes("delete")) return "coral";
  if (action.includes("update") || action.includes("edit")) return "gold";
  if (action.includes("check")) return "purple";
  return "blue";
};

export function VenueActivityTimeline({ venueId }: VenueActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setActivities(data);
      }
      setIsLoading(false);
    };

    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`venue-activity-${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          setActivities((prev) => [payload.new as ActivityItem, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Venue Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Venue Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Venue Activity
        </CardTitle>
        <Badge variant="outline" className="text-xs">Live</Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.entity_type, activity.action);
            const color = getActivityColor(activity.action);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full bg-${color}/20 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 text-${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.action}
                  </p>
                  {activity.details && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.details}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
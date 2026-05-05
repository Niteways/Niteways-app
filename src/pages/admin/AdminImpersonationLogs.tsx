import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Search, UserCheck, Calendar, Clock, Building2, 
  Shield, RefreshCw, Filter, ChevronDown, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, formatDistanceToNow } from "date-fns";

interface ImpersonationLog {
  id: string;
  action: string;
  category: string;
  entity_type: string;
  entity_id: string | null;
  user_name: string | null;
  user_email: string | null;
  venue_id: string | null;
  venue_name: string | null;
  metadata: {
    session_id?: string;
    impersonated_member_id?: string;
    impersonated_member_name?: string;
    impersonated_member_role?: string;
    impersonated_member_permissions?: Record<string, boolean>;
    session_started_at?: string;
    session_duration_seconds?: number;
  } | null;
  status: string | null;
  created_at: string;
  user_agent: string | null;
}

const AdminImpersonationLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ImpersonationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7");
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const fromDate = subDays(new Date(), parseInt(dateRange));
      
      let query = supabase
        .from("platform_activity_logs")
        .select("*")
        .eq("category", "security")
        .in("action", ["impersonation_started", "impersonation_ended"])
        .gte("created_at", fromDate.toISOString())
        .order("created_at", { ascending: false });

      if (venueFilter !== "all") {
        query = query.eq("venue_id", venueFilter);
      }

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setLogs((data || []) as ImpersonationLog[]);
    } catch (error) {
      console.error("Error fetching impersonation logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name")
        .order("name");
      
      if (error) throw error;
      setVenues(data || []);
    } catch (error) {
      console.error("Error fetching venues:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchVenues();
    
    // Real-time subscription for impersonation logs
    const channel = supabase
      .channel('impersonation-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_activity_logs',
        },
        (payload) => {
          // Only refetch if it's an impersonation action
          const newRecord = payload.new as any;
          if (newRecord?.action?.includes('impersonation')) {
            fetchLogs();
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueFilter, actionFilter, dateRange]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(query) ||
      log.user_email?.toLowerCase().includes(query) ||
      log.venue_name?.toLowerCase().includes(query) ||
      log.metadata?.impersonated_member_name?.toLowerCase().includes(query) ||
      log.metadata?.impersonated_member_role?.toLowerCase().includes(query)
    );
  });

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "impersonation_started":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "impersonation_ended":
        return "bg-teal/20 text-teal border-teal/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Group logs by session to show session pairs
  const sessions = filteredLogs.reduce((acc, log) => {
    const sessionId = log.metadata?.session_id || log.id;
    if (!acc[sessionId]) {
      acc[sessionId] = [];
    }
    acc[sessionId].push(log);
    return acc;
  }, {} as Record<string, ImpersonationLog[]>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Impersonation Audit Logs</h1>
                <p className="text-sm text-muted-foreground">
                  Track admin impersonation sessions for security compliance
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchLogs} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{Object.keys(sessions).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-teal/10 border-teal/20">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal/20">
                  <Shield className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Started Sessions</p>
                  <p className="text-2xl font-bold">
                    {logs.filter(l => l.action === "impersonation_started").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ended Sessions</p>
                  <p className="text-2xl font-bold">
                    {logs.filter(l => l.action === "impersonation_ended").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-purple/10 border-purple/20">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple/20">
                  <Building2 className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Venues Affected</p>
                  <p className="text-2xl font-bold">
                    {new Set(logs.map(l => l.venue_id).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-lg">Filters</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search admin, venue, or member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={venueFilter} onValueChange={setVenueFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="impersonation_started">Session Started</SelectItem>
                  <SelectItem value="impersonation_ended">Session Ended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              {filteredLogs.length} records found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Impersonated Member</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No impersonation logs found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {format(new Date(log.created_at), "MMM d, yyyy")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), "HH:mm:ss")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{log.user_name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{log.user_email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getActionBadgeColor(log.action))}
                          >
                            {log.action === "impersonation_started" ? "Started" : "Ended"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {log.metadata?.impersonated_member_name || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{log.venue_name || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {log.action === "impersonation_ended" 
                              ? formatDuration(log.metadata?.session_duration_seconds)
                              : "—"
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.metadata?.impersonated_member_role || "N/A"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminImpersonationLogs;

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, Filter, Download, RefreshCw, Activity, Users, CreditCard, 
  Building2, Calendar, AlertTriangle, CheckCircle, XCircle, Clock,
  ArrowUpDown, Eye, FileText, Settings, Shield, DollarSign, UserCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  action: string;
  category: string;
  entity_type: string;
  entity_id: string | null;
  user_name: string | null;
  user_email: string | null;
  venue_name: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  booking: Calendar,
  payment: CreditCard,
  user: Users,
  venue: Building2,
  checkin: UserCheck,
  security: Shield,
  settings: Settings,
  finance: DollarSign,
  default: Activity,
};

const statusColors: Record<string, string> = {
  success: "bg-teal/20 text-teal",
  error: "bg-coral/20 text-coral",
  pending: "bg-gold/20 text-gold",
  warning: "bg-orange-500/20 text-orange-500",
};

const AdminAllReports = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("7");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Stats
  const [stats, setStats] = useState({
    totalActions: 0,
    successRate: 0,
    activeUsers: 0,
    criticalErrors: 0,
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch from platform_activity_logs
      const startDate = subDays(new Date(), parseInt(dateFilter));
      
      const { data: platformLogs, error: platformError } = await supabase
        .from("platform_activity_logs")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: sortOrder === "asc" })
        .limit(500);

      if (platformError) {
        console.error("Error fetching platform logs:", platformError);
      }

      // Also fetch from activity_logs for backwards compatibility
      const { data: activityLogs, error: activityError } = await supabase
        .from("activity_logs")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: sortOrder === "asc" })
        .limit(500);

      if (activityError) {
        console.error("Error fetching activity logs:", activityError);
      }

      // Merge and normalize logs
      const normalizedPlatform = (platformLogs || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        category: log.category || "default",
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        user_name: log.user_name,
        user_email: log.user_email,
        venue_name: log.venue_name,
        status: log.status || "success",
        error_message: log.error_message,
        metadata: log.metadata || {},
        created_at: log.created_at,
      }));

      const normalizedActivity = (activityLogs || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        category: log.entity_type?.toLowerCase() || "default",
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        user_name: log.performed_by,
        user_email: null,
        venue_name: null,
        status: "success",
        error_message: null,
        metadata: { details: log.details, portal: log.portal },
        created_at: log.created_at,
      }));

      const allLogs = [...normalizedPlatform, ...normalizedActivity].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });

      setLogs(allLogs);

      // Calculate stats
      const successCount = allLogs.filter(l => l.status === "success").length;
      const errorCount = allLogs.filter(l => l.status === "error").length;
      const uniqueUsers = new Set(allLogs.map(l => l.user_email || l.user_name).filter(Boolean));

      setStats({
        totalActions: allLogs.length,
        successRate: allLogs.length > 0 ? Math.round((successCount / allLogs.length) * 100) : 100,
        activeUsers: uniqueUsers.size,
        criticalErrors: errorCount,
      });
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("platform-logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_activity_logs" }, () => {
        fetchLogs();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFilter, sortOrder]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Action", "Category", "User", "Venue", "Status", "Details"].join(","),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
          log.action,
          log.category,
          log.user_name || log.user_email || "System",
          log.venue_name || "-",
          log.status,
          JSON.stringify(log.metadata).replace(/,/g, ";"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <AdminLayout title="All Reports" subtitle="Complete platform activity monitoring and audit trail">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-teal/5 border-teal/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-teal" />
                <div>
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gold/5 border-gold/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-gold" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-coral/5 border-coral/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-coral" />
                <div>
                  <p className="text-2xl font-bold">{stats.criticalErrors}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, user, venue, transaction ID..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="booking">Bookings</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="venue">Venues</SelectItem>
                <SelectItem value="checkin">Check-ins</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}>
              <ArrowUpDown className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={fetchLogs} className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportLogs} className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No activity logs found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                filteredLogs.map((log, index) => {
                  const Icon = categoryIcons[log.category] || categoryIcons.default;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        log.status === "error" ? "bg-coral/20" : "bg-primary/10"
                      )}>
                        <Icon className={cn(
                          "w-4 h-4",
                          log.status === "error" ? "text-coral" : "text-primary"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline" className={statusColors[log.status] || statusColors.success}>
                            {log.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {log.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {log.user_name && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {log.user_name}
                            </span>
                          )}
                          {log.venue_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {log.venue_name}
                            </span>
                          )}
                          {log.entity_id && (
                            <span className="font-mono text-xs opacity-70">
                              ID: {log.entity_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        {log.error_message && (
                          <p className="text-sm text-coral mt-1">{log.error_message}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.created_at), "HH:mm")}
                        </div>
                        <div className="text-xs opacity-70">
                          {format(new Date(log.created_at), "MMM d")}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminAllReports;

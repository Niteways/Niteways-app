import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, AlertCircle, Info, Search, RefreshCw, 
  Calendar, ChevronRight, Database, Server, Globe, Shield,
  ExternalLink, Copy, Filter
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ErrorLog {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  category: "database" | "api" | "auth" | "payment" | "system" | "integration";
  message: string;
  details: string;
  stackTrace?: string;
  userId?: string;
  venueId?: string;
  requestId?: string;
  resolved: boolean;
}

const mockErrorLogs: ErrorLog[] = [
  {
    id: "err-001",
    timestamp: "2024-01-19T14:32:15Z",
    level: "error",
    category: "database",
    message: "Failed to update table booking status",
    details: "Database connection timeout after 30000ms. The operation was attempting to update booking BK-2024-0456 status from 'pending' to 'confirmed'.",
    stackTrace: "Error: Connection timeout\n  at DatabaseClient.query (database.ts:145)\n  at BookingService.updateStatus (booking.service.ts:89)\n  at BookingController.confirm (booking.controller.ts:45)",
    userId: "USR-001",
    venueId: "VEN-STOCKHOLM-001",
    requestId: "req-abc123",
    resolved: false
  },
  {
    id: "err-002",
    timestamp: "2024-01-19T13:15:42Z",
    level: "warning",
    category: "payment",
    message: "Payment gateway response delayed",
    details: "Stripe webhook response took 5.2 seconds, exceeding the 3 second threshold. Payment eventually processed successfully.",
    venueId: "VEN-OSLO-002",
    requestId: "req-def456",
    resolved: true
  },
  {
    id: "err-003",
    timestamp: "2024-01-19T12:45:00Z",
    level: "error",
    category: "auth",
    message: "Authentication failed - Invalid token",
    details: "JWT token validation failed. Token expired at 2024-01-19T10:00:00Z. User attempted to access protected resource /api/bookings.",
    userId: "USR-042",
    requestId: "req-ghi789",
    resolved: false
  },
  {
    id: "err-004",
    timestamp: "2024-01-19T11:22:33Z",
    level: "info",
    category: "system",
    message: "Scheduled maintenance completed",
    details: "Database optimization and index rebuild completed successfully. Duration: 4 minutes 32 seconds.",
    resolved: true
  },
  {
    id: "err-005",
    timestamp: "2024-01-19T10:05:18Z",
    level: "error",
    category: "api",
    message: "External API rate limit exceeded",
    details: "Instagram Graph API returned 429 Too Many Requests. Rate limit will reset in 15 minutes. Affected operation: fetching user photos for profile enrichment.",
    requestId: "req-jkl012",
    resolved: false
  },
  {
    id: "err-006",
    timestamp: "2024-01-19T09:30:00Z",
    level: "warning",
    category: "integration",
    message: "Webhook delivery failed - Retrying",
    details: "Failed to deliver webhook to venue endpoint. Attempt 2 of 5. Target: https://venue-api.example.com/webhooks/booking",
    venueId: "VEN-COPENHAGEN-001",
    requestId: "req-mno345",
    resolved: true
  },
  {
    id: "err-007",
    timestamp: "2024-01-18T22:15:00Z",
    level: "error",
    category: "database",
    message: "Duplicate entry constraint violation",
    details: "Attempted to insert duplicate guest entry with email guest@example.com. Unique constraint 'guests_email_unique' violated.",
    stackTrace: "Error: Duplicate entry\n  at DatabaseClient.insert (database.ts:98)\n  at GuestService.create (guest.service.ts:34)",
    requestId: "req-pqr678",
    resolved: true
  },
  {
    id: "err-008",
    timestamp: "2024-01-18T20:45:12Z",
    level: "warning",
    category: "system",
    message: "High memory usage detected",
    details: "Server memory usage reached 85% threshold. Auto-scaling triggered to add additional instance.",
    resolved: true
  },
];

const levelConfig = {
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
};

const categoryConfig = {
  database: { icon: Database, label: "Database" },
  api: { icon: Globe, label: "API" },
  auth: { icon: Shield, label: "Authentication" },
  payment: { icon: ExternalLink, label: "Payment" },
  system: { icon: Server, label: "System" },
  integration: { icon: ExternalLink, label: "Integration" },
};

const AdminErrorLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredLogs = mockErrorLogs.filter(log => {
    const matchesSearch = 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === "all" || log.level === selectedLevel;
    const matchesCategory = selectedCategory === "all" || log.category === selectedCategory;
    return matchesSearch && matchesLevel && matchesCategory;
  });

  const handleViewDetails = (log: ErrorLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const handleCopyDetails = (log: ErrorLog) => {
    const text = `Error ID: ${log.id}\nTimestamp: ${log.timestamp}\nMessage: ${log.message}\nDetails: ${log.details}${log.stackTrace ? `\nStack Trace:\n${log.stackTrace}` : ''}`;
    navigator.clipboard.writeText(text);
    toast.success("Error details copied to clipboard");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const errorCount = mockErrorLogs.filter(l => l.level === 'error').length;
  const warningCount = mockErrorLogs.filter(l => l.level === 'warning').length;
  const unresolvedCount = mockErrorLogs.filter(l => !l.resolved).length;

  return (
    <AdminLayout title="Error Logs" subtitle="Monitor and debug system errors and warnings">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{mockErrorLogs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" /> Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{errorCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">{warningCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Unresolved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-coral">{unresolvedCount}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs by message, details, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={selectedLevel} onValueChange={setSelectedLevel}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="error">Errors</TabsTrigger>
              <TabsTrigger value="warning">Warnings</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={() => toast.success("Logs refreshed")}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Logs List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          {filteredLogs.map((log, idx) => {
            const LevelIcon = levelConfig[log.level].icon;
            const CategoryIcon = categoryConfig[log.category].icon;
            
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * idx }}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors",
                  "bg-card hover:border-primary/50",
                  !log.resolved && "border-l-4 border-l-red-500"
                )}
                onClick={() => handleViewDetails(log)}
              >
                <div className={cn("p-2 rounded-lg", levelConfig[log.level].bg)}>
                  <LevelIcon className={cn("w-5 h-5", levelConfig[log.level].color)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{log.id}</span>
                    <Badge variant="outline" className="text-xs">
                      <CategoryIcon className="w-3 h-3 mr-1" />
                      {categoryConfig[log.category].label}
                    </Badge>
                    {!log.resolved && (
                      <Badge className="bg-coral/20 text-coral text-xs">Unresolved</Badge>
                    )}
                  </div>
                  <p className="font-medium truncate">{log.message}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{log.details}</p>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatTimestamp(log.timestamp)}
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No logs found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Error Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedLog && (
                <>
                  {(() => {
                    const LevelIcon = levelConfig[selectedLog.level].icon;
                    return <LevelIcon className={cn("w-5 h-5", levelConfig[selectedLog.level].color)} />;
                  })()}
                  Error Details
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedLog?.id} • {selectedLog && formatTimestamp(selectedLog.timestamp)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                {/* Message */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Message</h4>
                  <p className="font-medium">{selectedLog.message}</p>
                </div>

                {/* Details */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Details</h4>
                  <p className="text-sm">{selectedLog.details}</p>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Level</h4>
                    <Badge className={levelConfig[selectedLog.level].bg}>
                      {selectedLog.level.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Category</h4>
                    <Badge variant="outline">
                      {categoryConfig[selectedLog.category].label}
                    </Badge>
                  </div>
                  {selectedLog.userId && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">User ID</h4>
                      <p className="font-mono text-sm">{selectedLog.userId}</p>
                    </div>
                  )}
                  {selectedLog.venueId && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Venue ID</h4>
                      <p className="font-mono text-sm">{selectedLog.venueId}</p>
                    </div>
                  )}
                  {selectedLog.requestId && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Request ID</h4>
                      <p className="font-mono text-sm">{selectedLog.requestId}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Status</h4>
                    <Badge className={selectedLog.resolved ? "bg-teal/20 text-teal" : "bg-coral/20 text-coral"}>
                      {selectedLog.resolved ? "Resolved" : "Unresolved"}
                    </Badge>
                  </div>
                </div>

                {/* Stack Trace */}
                {selectedLog.stackTrace && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Stack Trace</h4>
                    <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto font-mono">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopyDetails(selectedLog)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Details
                  </Button>
                  {!selectedLog.resolved && (
                    <Button 
                      size="sm"
                      onClick={() => {
                        toast.success("Error marked as resolved");
                        setIsDetailOpen(false);
                      }}
                    >
                      Mark as Resolved
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminErrorLogs;

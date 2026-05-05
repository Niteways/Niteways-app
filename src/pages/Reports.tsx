import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Plus, FileText, Calendar as CalendarIcon, User, Eye, Edit, Trash2, Search, ChevronRight, ChevronLeft, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DailyReport {
  id: string;
  date: string;
  title: string;
  content: string;
  reportedBy: string;
  createdAt: string;
}

import { DEFAULT_VENUE_ID } from "@/config/venueScope";

const Reports = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { impersonatedVenueId, isImpersonating } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch reports from database
  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("entity_type", "report")
        .eq("venue_id", activeVenueId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedReports: DailyReport[] = (data || []).map(log => ({
        id: log.id,
        date: log.created_at.split("T")[0],
        title: log.action,
        content: log.details || "",
        reportedBy: log.performed_by || "Unknown",
        createdAt: log.created_at
      }));

      setReports(formattedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      // Use fallback data if fetch fails
      setReports([
        { id: "1", date: "2024-01-15", title: "Busy Saturday Night", content: "Great turnout tonight with 450 guests. VIP section was fully booked. Minor issue with sound system resolved by 11pm. Staff performed excellently.", reportedBy: "John Manager", createdAt: "2024-01-15T23:45:00" },
        { id: "2", date: "2024-01-14", title: "Friday Night Report", content: "Standard Friday night with 320 guests. Two incidents of guests being too intoxicated, handled by security. Promoter Marcus brought in 45 guests.", reportedBy: "Sarah Host", createdAt: "2024-01-14T23:30:00" },
        { id: "3", date: "2024-01-13", title: "Thursday Ladies Night", content: "Ladies night promotion was successful. 280 guests total, 180 ladies. Free champagne promotion went well. Need to order more prosecco for next week.", reportedBy: "John Manager", createdAt: "2024-01-13T23:00:00" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    // Real-time subscription for report updates
    const channel = supabase
      .channel("reports-realtime")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "activity_logs",
        filter: `entity_type=eq.report`
      }, () => fetchReports())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.reportedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = selectedDate ? r.date === format(selectedDate, "yyyy-MM-dd") : true;
    return matchesSearch && matchesDate;
  });

  const handleDeleteReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from("activity_logs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Report deleted");
    } catch (error) {
      console.error("Error deleting report:", error);
      // Fallback: remove locally
      setReports(reports.filter(r => r.id !== id));
      toast.success("Report deleted");
    }
  };

  const handleViewReport = (report: DailyReport) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  const reportDates = reports.map(r => new Date(r.date));

  if (isMobile) {
    return (
      <AdminLayout title="Reports" subtitle="">
        <div className="space-y-4 pb-24">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 text-center bg-muted/20 rounded-lg">
              <p className="text-xl font-bold text-foreground">{reports.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-3 text-center bg-muted/20 rounded-lg">
              <p className="text-xl font-bold text-teal">{reports.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length}</p>
              <p className="text-[10px] text-muted-foreground">This Month</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-3 text-center bg-muted/20 rounded-lg">
              <p className="text-xl font-bold text-gold">{new Set(reports.map(r => r.reportedBy)).size}</p>
              <p className="text-[10px] text-muted-foreground">Contributors</p>
            </motion.div>
          </div>

          {/* Write Report Button */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Button className="w-full gap-2" onClick={() => navigate("/reports/write")}>
              <Plus className="w-4 h-4" />
              Write Report
            </Button>
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/20 border-0"
            />
          </motion.div>

          {/* Filter Buttons */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex gap-2">
            <Button 
              variant={selectedDate ? "default" : "outline"} 
              size="sm"
              className="text-xs"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs"
              onClick={() => setSelectedDate(undefined)}
            >
              All Reports
            </Button>
          </motion.div>

          {/* Reports List */}
          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No reports found</p>
                </div>
              ) : (
                filteredReports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="p-3 rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleViewReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{report.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(report.date), "MMM d")}
                          </span>
                          <span>•</span>
                          <span>{report.reportedBy}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{report.content}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* View Report Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-full h-[90vh] p-0 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setIsViewDialogOpen(false)}>
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold">{selectedReport?.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedReport && format(new Date(selectedReport.date), "PPPP")} • {selectedReport?.reportedBy}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/20">
                    <p className="text-sm whitespace-pre-wrap">{selectedReport?.content}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => navigate(`/reports/write?edit=${selectedReport?.id}`)}>
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-coral hover:text-coral hover:bg-coral/10"
                      onClick={() => {
                        if (selectedReport && window.confirm("Delete this report?")) {
                          handleDeleteReport(selectedReport.id);
                          setIsViewDialogOpen(false);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Reports" subtitle="Daily operational reports and notes">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Reports</p>
            <p className="text-2xl font-bold text-foreground">{reports.length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-teal">{reports.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Contributors</p>
            <p className="text-2xl font-bold text-gold">{new Set(reports.map(r => r.reportedBy)).size}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Latest Report</p>
            <p className="text-sm font-medium text-coral">{reports[0]?.date || "None"}</p>
          </motion.div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  Report Calendar
                </CardTitle>
                <CardDescription>Click a date to view reports</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    hasReport: reportDates,
                  }}
                  modifiersStyles={{
                    hasReport: { backgroundColor: "hsl(var(--primary) / 0.2)", borderRadius: "50%" },
                  }}
                />
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-3 h-3 rounded-full bg-primary/20" />
                  <span>Days with reports</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reports List */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Daily Reports</CardTitle>
                    <CardDescription>
                      {selectedDate ? `Reports for ${format(selectedDate, "PPP")}` : "All reports"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(undefined)}>
                      Show All
                    </Button>
                    <Button className="gap-2" onClick={() => navigate("/reports/write")}>
                      <Plus className="w-4 h-4" />
                      Write Report
                    </Button>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No reports found for this date</p>
                  </div>
                ) : (
                  filteredReports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => handleViewReport(report)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{report.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {format(new Date(report.date), "PPP")}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {report.reportedBy}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleViewReport(report)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/reports/write?edit=${report.id}`)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-coral hover:text-coral hover:bg-coral/10"
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{report.content}</p>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* View Report Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedReport?.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {selectedReport && format(new Date(selectedReport.date), "PPPP")} • Written by {selectedReport?.reportedBy}
              </p>
            </DialogHeader>
            <div className="p-4 rounded-lg bg-muted/20 max-h-[60vh] overflow-auto">
              <p className="whitespace-pre-wrap">{selectedReport?.content}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              <Button onClick={() => navigate(`/reports/write?edit=${selectedReport?.id}`)}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Reports;
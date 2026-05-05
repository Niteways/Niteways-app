import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, CalendarIcon, ArrowLeft, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPortalScopeVenueId } from "@/config/venueScope";

const WriteReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = "Current User";

  // Load report if editing
  useEffect(() => {
    if (editId) {
      loadReport(editId);
    }
  }, [editId]);

  const loadReport = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.action);
        setContent(data.details || "");
        setSelectedDate(new Date(data.created_at));
      }
    } catch (error) {
      console.error("Error loading report:", error);
      toast.error("Failed to load report");
    }
  };

  // Auto-save draft with debounce
  useEffect(() => {
    if (!title && !content) return;
    
    const timer = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content]);

  const saveDraft = async () => {
    if (!title || !content) return;
    
    setIsSaving(true);
    try {
      // Save to localStorage as draft
      localStorage.setItem("report_draft", JSON.stringify({
        title,
        content,
        date: selectedDate.toISOString(),
        savedAt: new Date().toISOString()
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !content) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editId) {
        // Update existing report
        const { error } = await supabase
          .from("activity_logs")
          .update({
            action: title,
            details: content,
            performed_by: currentUser,
          })
          .eq("id", editId);

        if (error) throw error;
        toast.success("Report updated successfully");
      } else {
        // Create new report
        const { error } = await supabase
          .from("activity_logs")
          .insert({
            venue_id: getPortalScopeVenueId(),
            entity_type: "report",
            action: title,
            details: content,
            performed_by: currentUser,
            portal: "venue",
            created_at: selectedDate.toISOString()
          });

        if (error) throw error;
        toast.success("Report submitted successfully");
      }

      // Clear draft
      localStorage.removeItem("report_draft");
      navigate("/reports");
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("Failed to save report");
      setIsSubmitting(false);
    }
  };

  // Load draft on mount
  useEffect(() => {
    if (editId) return; // Don't load draft if editing existing
    
    const draft = localStorage.getItem("report_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (window.confirm("You have an unsaved draft. Would you like to restore it?")) {
          setTitle(parsed.title || "");
          setContent(parsed.content || "");
          setSelectedDate(new Date(parsed.date || new Date()));
        } else {
          localStorage.removeItem("report_draft");
        }
      } catch (e) {
        localStorage.removeItem("report_draft");
      }
    }
  }, [editId]);

  return (
    <AdminLayout title={editId ? "Edit Report" : "Write Report"} subtitle="Create a new daily operational report">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" onClick={() => navigate("/reports")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </Button>
        </motion.div>

        {/* Main Form Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <CardTitle>Daily Report</CardTitle>
                </div>
                {isSaving && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving draft...
                  </span>
                )}
              </div>
              <CardDescription>
                Document today's operations and any notable events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label>Report Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Report Title */}
              <div className="space-y-2">
                <Label>Report Title</Label>
                <Input
                  placeholder="e.g., Saturday Night Summary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg"
                />
              </div>

              {/* Report Author (Read-only) */}
              <div className="space-y-2">
                <Label>Written By</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {currentUser.split(" ").map(n => n[0]).join("")}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{currentUser}</span>
                  <span className="text-xs text-muted-foreground ml-auto">Account Holder</span>
                </div>
              </div>

              {/* Report Content */}
              <div className="space-y-2">
                <Label>Report Content</Label>
                <Textarea
                  placeholder="Write your daily report here... Include guest counts, incidents, notable events, staff performance, etc."
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Include details about guest attendance, notable incidents, promoter performance, and any operational issues.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => navigate("/reports")}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                  <Save className="w-4 h-4" />
                  {isSubmitting ? "Saving..." : editId ? "Update Report" : "Submit Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tips Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tips for a Good Report</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Include total guest count and VIP attendance
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Document any security incidents or guest issues
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Note promoter performance and guest referrals
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Report any equipment or operational problems
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Highlight exceptional staff performance
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default WriteReport;
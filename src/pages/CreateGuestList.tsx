import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRealtimeGuestLists } from "@/hooks/useRealtimeGuestLists";
import { useImpersonation } from "@/contexts/ImpersonationContext";

import { DEFAULT_VENUE_ID } from "@/config/venueScope";

const CreateGuestList = () => {
  const navigate = useNavigate();
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  const { createRecurringList, createOneDayList } = useRealtimeGuestLists({ venueId: activeVenueId });
  
  const [listType, setListType] = useState<"recurring" | "oneday">("recurring");
  const [listName, setListName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Wednesday");
  const [resetTime, setResetTime] = useState("03:00");
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleCreate = async () => {
    if (!listName) return;
    
    setIsSubmitting(true);
    try {
      if (listType === "recurring") {
        await createRecurringList(listName, dayOfWeek, resetTime);
      } else {
        await createOneDayList(listName, format(eventDate, "yyyy-MM-dd"));
      }
      navigate("/guest-list");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/guest-list")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Create Guest List</h2>
            <p className="text-xs text-muted-foreground">Create a new guest list - recurring weekly or for a specific date.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate("/guest-list")}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Form Content - Scrollable */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* List Type Toggle */}
          <div className="space-y-2">
            <Label>List Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={listType === "recurring" ? "default" : "outline"}
                className={cn(
                  "h-12",
                  listType === "recurring" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/30 border-border"
                )}
                onClick={() => setListType("recurring")}
              >
                Recurring
              </Button>
              <Button
                type="button"
                variant={listType === "oneday" ? "default" : "outline"}
                className={cn(
                  "h-12",
                  listType === "oneday" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/30 border-border"
                )}
                onClick={() => setListType("oneday")}
              >
                One Day
              </Button>
            </div>
          </div>

          {/* List Name */}
          <div className="space-y-2">
            <Label>List Name</Label>
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., NYE Special"
              className="h-12 bg-muted/30 border-border"
            />
          </div>

          {/* Conditional Fields based on type */}
          {listType === "recurring" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger className="h-12 bg-muted/30 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reset Time</Label>
                <Input
                  type="time"
                  value={resetTime}
                  onChange={(e) => setResetTime(e.target.value)}
                  className="h-12 bg-muted/30 border-border"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-12 justify-start text-left font-normal bg-muted/30 border-border"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(eventDate, "MMMM do, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={(d) => d && setEventDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="p-4 border-t border-border shrink-0 bg-background">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => navigate("/guest-list")}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={handleCreate}
            disabled={!listName || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create List"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateGuestList;
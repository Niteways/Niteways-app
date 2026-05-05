import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, Save } from "lucide-react";
import { toast } from "sonner";

interface OpeningHours {
  [day: string]: {
    open: string;
    close: string;
  };
}

interface OpeningHoursEditorProps {
  openingHours: string | null;
  openingDays: string | null;
  onSave: (hours: string, days: string) => Promise<void>;
  disabled?: boolean;
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function OpeningHoursEditor({ 
  openingHours, 
  openingDays, 
  onSave,
  disabled 
}: OpeningHoursEditorProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [hours, setHours] = useState<OpeningHours>({});
  const [isSaving, setIsSaving] = useState(false);

  // Parse initial state
  useEffect(() => {
    // Parse selected days
    if (openingDays) {
      const parsed = openingDays.split(",").map(d => d.trim());
      setSelectedDays(parsed);
    }

    // Parse opening hours JSON
    if (openingHours) {
      try {
        const parsed = JSON.parse(openingHours);
        setHours(parsed);
      } catch {
        // If not JSON, initialize empty hours for each selected day
        const newHours: OpeningHours = {};
        selectedDays.forEach(day => {
          newHours[day.toLowerCase()] = { open: "22:00", close: "04:00" };
        });
        setHours(newHours);
      }
    }
  }, [openingHours, openingDays]);

  const toggleDay = (day: string) => {
    if (disabled) return;
    
    setSelectedDays(prev => {
      const newDays = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      
      // Initialize hours for new day
      if (!prev.includes(day)) {
        setHours(prevHours => ({
          ...prevHours,
          [day.toLowerCase()]: { open: "22:00", close: "04:00" }
        }));
      }
      
      return newDays;
    });
  };

  const updateHours = (day: string, field: "open" | "close", value: string) => {
    if (disabled) return;
    
    setHours(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const hoursJson = JSON.stringify(hours);
      const daysString = selectedDays.join(", ");
      await onSave(hoursJson, daysString);
      toast.success("Opening hours updated - syncing to user app");
    } catch (error) {
      toast.error("Failed to save opening hours");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Day Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Opening Days
        </Label>
        <div className="flex flex-wrap gap-2">
          {days.map((day, idx) => (
            <Badge
              key={day}
              variant="outline"
              className={cn(
                "cursor-pointer transition-colors px-3 py-1",
                selectedDays.includes(day)
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "hover:bg-muted",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => toggleDay(day)}
            >
              {dayShort[idx]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Hours per Day */}
      {selectedDays.length > 0 && (
        <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
          <Label className="text-sm font-medium">Hours per Day</Label>
          <div className="space-y-2">
            {selectedDays.map(day => {
              const dayKey = day.toLowerCase();
              const dayHours = hours[dayKey] || { open: "22:00", close: "04:00" };
              
              return (
                <div key={day} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  <span className="w-24 text-sm font-medium">{day}</span>
                  <Input
                    type="time"
                    value={dayHours.open}
                    onChange={(e) => updateHours(day, "open", e.target.value)}
                    disabled={disabled}
                    className="w-32 h-9"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={dayHours.close}
                    onChange={(e) => updateHours(day, "close", e.target.value)}
                    disabled={disabled}
                    className="w-32 h-9"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!disabled && (
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Hours"}
        </Button>
      )}
    </div>
  );
}

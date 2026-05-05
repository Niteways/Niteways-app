import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface GuestListSignupProps {
  eventId: string;
  eventDate: string;
  venueId: string;
  venueName: string;
  onSuccess?: () => void;
}

export function GuestListSignup({ eventId, eventDate, venueId, venueName, onSuccess }: GuestListSignupProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [formData, setFormData] = useState({
    plusGuests: "0",
    notes: "",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Guest';
          setUserName(name);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userName) {
      toast.error("Please log in to join the guest list");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("guest_list_entries")
        .insert({
          venue_id: venueId,
          guest_name: userName,
          event_date: eventDate,
          list_type: "standard",
          plus_guests: parseInt(formData.plusGuests) || 0,
          notes: formData.notes || null,
          status: "pending",
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("You've been added to the guest list!");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to sign up:", error);
      toast.error("Failed to sign up for guest list");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12 px-6 bg-gradient-to-b from-primary/10 to-transparent rounded-xl border border-primary/20"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">You're on the list!</h3>
        <p className="text-muted-foreground text-sm">
          We'll see you at {venueName} on {format(new Date(eventDate), "MMM d, yyyy")}.
          {parseInt(formData.plusGuests) > 0 && (
            <span> You've reserved spots for {parseInt(formData.plusGuests)} additional guest{parseInt(formData.plusGuests) > 1 ? 's' : ''}.</span>
          )}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="text-center py-6 px-4 bg-gradient-to-b from-primary/5 to-transparent rounded-xl border border-border">
        <Users className="w-10 h-10 mx-auto mb-3 text-primary/60" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Join the Guest List</h3>
        <p className="text-sm text-muted-foreground">
          Skip the line and get priority entry on {format(new Date(eventDate), "MMM d")}
        </p>
      </div>

      {/* User info display */}
      <div className="p-4 bg-muted/30 rounded-xl border border-border">
        <p className="text-sm text-muted-foreground mb-1">Signing up as</p>
        <p className="font-semibold text-foreground">{userName || "Guest"}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="plusGuests" className="text-muted-foreground">Plus Guests</Label>
          <select
            id="plusGuests"
            value={formData.plusGuests}
            onChange={(e) => setFormData(prev => ({ ...prev, plusGuests: e.target.value }))}
            className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground"
          >
            <option value="0">Just me</option>
            <option value="1">+1 guest</option>
            <option value="2">+2 guests</option>
            <option value="3">+3 guests</option>
            <option value="4">+4 guests</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-muted-foreground">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any special requests..."
            className="bg-background border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !userName}
          className="w-full py-3 font-medium"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing up...
            </>
          ) : (
            <>
              <Users className="w-4 h-4 mr-2" />
              Sign Up for Guest List
            </>
          )}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        By signing up, you agree to arrive on time. Guest list closes at door.
      </p>
    </motion.div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  Users,
  Clock,
  CheckCircle,
  Tag,
  UserCheck,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const listTypeStyles = {
  aa: "bg-gold/20 text-gold border-gold/30",
  vip: "bg-coral/20 text-coral border-coral/30",
  standard: "bg-muted text-muted-foreground border-border",
  promo: "bg-teal/20 text-teal border-teal/30",
};

interface GuestData {
  id: string;
  name: string;
  plusGuests: number;
  payingGuests: number;
  checkedInCount: number;
  listType: "aa" | "vip" | "standard" | "promo";
  checkedIn: boolean;
  checkInTime?: string;
  isRecurring: boolean;
  isOneDay: boolean;
  isSticky: boolean;
  table?: string;
  promoter?: string;
  addedAt?: string;
  notes?: string;
}

const CheckInDetail = () => {
  const { guestId, listType } = useParams<{ guestId: string; listType: string }>();
  const navigate = useNavigate();
  const [guest, setGuest] = useState<GuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  // Fetch guest data
  useEffect(() => {
    const fetchGuest = async () => {
      if (!guestId || !listType) return;
      
      setLoading(true);
      try {
        if (listType === "recurring") {
          const { data, error } = await supabase
            .from("recurring_list_guests")
            .select("*")
            .eq("id", guestId)
            .single();
          
          if (error) throw error;
          
          if (data) {
            setGuest({
              id: data.id,
              name: data.guest_name,
              plusGuests: data.plus_guests || 0,
              payingGuests: data.paying_guests || 0,
              checkedInCount: data.checked_in_count || 0,
              listType: (data.guest_type?.toLowerCase() as GuestData["listType"]) || "standard",
              checkedIn: data.checked_in || false,
              checkInTime: data.check_in_time ? new Date(data.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : undefined,
              isRecurring: true,
              isOneDay: false,
              isSticky: data.is_sticky || false,
              promoter: data.added_by || "Unknown",
              addedAt: new Date(data.added_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
              notes: data.notes || undefined,
            });
          }
        } else if (listType === "oneday") {
          const { data, error } = await supabase
            .from("one_day_list_guests")
            .select("*")
            .eq("id", guestId)
            .single();
          
          if (error) throw error;
          
          if (data) {
            setGuest({
              id: data.id,
              name: data.guest_name,
              plusGuests: data.plus_guests || 0,
              payingGuests: data.paying_guests || 0,
              checkedInCount: data.checked_in_count || 0,
              listType: (data.guest_type?.toLowerCase() as GuestData["listType"]) || "standard",
              checkedIn: data.checked_in || false,
              checkInTime: data.check_in_time ? new Date(data.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : undefined,
              isRecurring: false,
              isOneDay: true,
              isSticky: false,
              promoter: data.added_by || "Unknown",
              addedAt: new Date(data.added_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
              notes: data.notes || undefined,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching guest:", error);
        toast.error("Failed to load guest data");
      } finally {
        setLoading(false);
      }
    };

    fetchGuest();

    // Set up real-time subscription
    const table = listType === "recurring" ? "recurring_list_guests" : "one_day_list_guests";
    const channel = supabase
      .channel(`guest-${guestId}`)
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table,
        filter: `id=eq.${guestId}`
      }, (payload) => {
        const data = payload.new as any;
        setGuest(prev => prev ? {
          ...prev,
          checkedInCount: data.checked_in_count || 0,
          checkedIn: data.checked_in || false,
          checkInTime: data.check_in_time ? new Date(data.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : undefined,
        } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [guestId, listType]);

  const handleCheckIn = async () => {
    if (!guest) return;
    
    setCheckingIn(true);
    try {
      const table = guest.isRecurring ? "recurring_list_guests" : "one_day_list_guests";
      const totalParty = 1 + guest.plusGuests;
      const newCount = guest.checkedInCount + 1;
      const isFullyCheckedIn = newCount >= totalParty;
      
      const { error } = await supabase
        .from(table)
        .update({ 
          checked_in_count: newCount,
          checked_in: isFullyCheckedIn,
          check_in_time: new Date().toISOString()
        })
        .eq("id", guest.id);

      if (error) throw error;
      
      // Update local state immediately for responsiveness (real-time will also update)
      setGuest(prev => prev ? {
        ...prev,
        checkedInCount: newCount,
        checkedIn: isFullyCheckedIn,
        checkInTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      } : null);
    } catch (error) {
      console.error("Error checking in:", error);
      toast.error("Failed to check in");
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Check In" subtitle="">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!guest) {
    return (
      <AdminLayout title="Guest Not Found" subtitle="">
        <div className="flex flex-col items-center justify-center py-12">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Guest not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </AdminLayout>
    );
  }

  const totalParty = 1 + guest.plusGuests;
  const isFullyCheckedIn = guest.checkedInCount >= totalParty;
  const isPartiallyCheckedIn = guest.checkedInCount > 0 && !isFullyCheckedIn;

  return (
    <AdminLayout title="Guest Check-In" subtitle="">
      <div className="space-y-6 pb-32">
        {/* Back Button + Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{guest.name}</h2>
              {guest.isSticky && (
                <Star className="w-4 h-4 text-gold fill-gold" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn("text-xs", listTypeStyles[guest.listType])}>
                {guest.listType.toUpperCase()}
              </Badge>
              {guest.isRecurring && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  Recurring
                </Badge>
              )}
              {guest.isOneDay && (
                <Badge variant="outline" className="text-xs bg-gold/10 text-gold border-gold/30">
                  One Day
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Check-in Progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="text-center space-y-4">
            <div className={cn(
              "w-24 h-24 rounded-full mx-auto flex items-center justify-center",
              isFullyCheckedIn ? "bg-teal/20" : isPartiallyCheckedIn ? "bg-gold/20" : "bg-muted/30"
            )}>
              {isFullyCheckedIn ? (
                <CheckCircle className="w-12 h-12 text-teal" />
              ) : (
                <UserCheck className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            
            <div>
              <p className="text-4xl font-bold">
                <span className={isFullyCheckedIn ? "text-teal" : isPartiallyCheckedIn ? "text-gold" : ""}>
                  {guest.checkedInCount}
                </span>
                <span className="text-muted-foreground">/{totalParty}</span>
              </p>
              <p className="text-muted-foreground">Guests Checked In</p>
            </div>

            {isFullyCheckedIn && guest.checkInTime && (
              <Badge className="bg-teal/20 text-teal border-0">
                <CheckCircle className="w-3 h-3 mr-1" />
                All guests checked in at {guest.checkInTime}
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Guest Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 space-y-4"
        >
          <h3 className="font-semibold">Guest Information</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Total Party</Label>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{totalParty} guests</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Paying Guests</Label>
              <div className="flex items-center gap-2">
                <span className="font-medium">{guest.payingGuests}/{totalParty}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Added By</Label>
              <p className="font-medium">{guest.promoter}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Added At</Label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{guest.addedAt}</span>
              </div>
            </div>
          </div>

          {guest.notes && (
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">Notes</Label>
              <div className="flex items-start gap-2 p-3 bg-muted/20 rounded-lg">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">{guest.notes}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Fixed Check-in Button - Shows real-time X/Y count */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border z-50">
          <div className="max-w-lg mx-auto">
            <Button 
              onClick={handleCheckIn}
              disabled={isFullyCheckedIn || checkingIn}
              className={cn(
                "w-full h-14 text-lg font-semibold transition-all",
                isFullyCheckedIn 
                  ? "bg-muted text-muted-foreground cursor-not-allowed" 
                  : "bg-gold text-black hover:bg-gold/90"
              )}
            >
              {checkingIn ? (
                "Checking in..."
              ) : isFullyCheckedIn ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {totalParty}/{totalParty}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Check In ({guest.checkedInCount}/{totalParty})
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CheckInDetail;

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Users, Clock, ChevronRight, ChevronLeft, Phone, Mail, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/useUserProfile";

interface Booking {
  id: string;
  venueName: string;
  venueImage: string;
  venueAddress: string;
  date: string;
  time: string;
  table: string;
  guests: number;
  status: "confirmed" | "pending" | "completed" | "cancelled" | "declined" | "no_show";
  price: number;
  depositPaid: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  bookingId: string;
  notes?: string;
}

const statusStyles = {
  confirmed: "bg-teal/20 text-teal border-teal/30",
  pending: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  completed: "bg-gray-800 text-gray-400 border-gray-700",
  cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
  declined: "bg-red-500/20 text-red-500 border-red-500/30",
  no_show: "bg-red-500/10 text-red-400 border-red-500/20",
};

interface UserAppBookingsProps {
  onBack: () => void;
}

export function UserAppBookings({ onBack }: UserAppBookingsProps) {
  const { profile } = useUserProfile();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"upcoming" | "requests" | "past" | "cancelled">("upcoming");
  const queryClient = useQueryClient();

  // Fetch bookings from database
  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      let query = supabase
        .from("table_bookings")
        .select(
          `
          *,
          venues:venue_id (
            name,
            address,
            gallery_images
          )
        `,
        )
        .neq("status", "blocked")
        .neq("guest_name", "BLOCKED")
        .order("booking_date", { ascending: false });

      // User app identity is currently the locally-stored profile email.
      // Filter so the user only sees their own bookings (and so realtime feels correct).
      const email = (profile.email || "").trim().toLowerCase();
      if (email) query = query.eq("guest_email", email);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        setIsLoading(false);
        return;
      }

      const mappedBookings: Booking[] = (data || []).map((booking: any) => ({
        id: booking.id,
        venueName: booking.venues?.name || 'Unknown Venue',
        venueImage: booking.venues?.gallery_images?.[0] || 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400',
        venueAddress: booking.venues?.address || '',
        date: booking.booking_date,
        time: booking.booking_time,
        table: booking.table_number,
        guests: booking.party_size,
        status: booking.status as Booking["status"],
        price: booking.price || 0,
        depositPaid: Math.round((booking.price || 0) * 0.2),
        guestName: booking.guest_name,
        guestEmail: booking.guest_email || '',
        guestPhone: booking.guest_phone || '',
        bookingId: booking.booking_id,
        notes: booking.notes,
      }));

      setBookings(mappedBookings);
      setIsLoading(false);
    };

    fetchBookings();

    // Set up real-time subscription
    const channel = supabase
      .channel('bookings-realtime-user')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_bookings',
        },
        () => {
          // Refetch on any change
          fetchBookings();
          queryClient.invalidateQueries({ queryKey: ['user-app-bookings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, profile.email]);
  
  const upcomingBookings = bookings.filter((b) => b.status === "confirmed");
  const requestBookings = bookings.filter((b) => b.status === "pending");
  const pastBookings = bookings.filter((b) => b.status === "completed");

  const handleCancelBooking = async (bookingId: string) => {
    setIsCancelling(true);
    
    const { error } = await supabase
      .from('table_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) {
      toast.error('Failed to cancel booking');
      console.error(error);
    } else {
      toast.success('Booking cancelled successfully');
      setSelectedBooking(null);
    }
    
    setIsCancelling(false);
  };

  // Full page booking details view
  if (selectedBooking) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-full bg-background px-4 py-4 pb-24"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedBooking(null)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex-1">Booking Details</h1>
          <Badge variant="outline" className={cn("text-xs", statusStyles[selectedBooking.status])}>
            {selectedBooking.status}
          </Badge>
        </div>

        {/* Venue Info */}
        <div className="flex gap-4 mb-6">
          <img
            src={selectedBooking.venueImage}
            alt={selectedBooking.venueName}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <div>
            <h3 className="font-semibold text-white text-lg">{selectedBooking.venueName}</h3>
            <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {selectedBooking.venueAddress}
            </p>
          </div>
        </div>

        {/* Booking Reference */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1">Booking Reference</p>
          <p className="font-mono text-base text-primary">{selectedBooking.bookingId}</p>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date
            </p>
            <p className="text-sm font-medium text-foreground">
              {new Date(selectedBooking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time
            </p>
            <p className="text-sm font-medium text-foreground">{selectedBooking.time}</p>
          </div>
        </div>

        {/* Table & Guests */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Table</p>
            <p className="text-sm font-medium text-foreground">{selectedBooking.table}</p>
          </div>
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Guests
            </p>
            <p className="text-sm font-medium text-foreground">{selectedBooking.guests} people</p>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4 space-y-2">
          <p className="text-xs text-muted-foreground">Contact Information</p>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{selectedBooking.guestEmail}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{selectedBooking.guestPhone}</span>
          </div>
        </div>

        {/* Notes */}
        {selectedBooking.notes && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
            <p className="text-xs text-amber-500 mb-1">Special Request</p>
            <p className="text-sm text-gray-300">{selectedBooking.notes}</p>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Table Price</span>
            <span className="text-foreground">€{selectedBooking.price}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> Deposit Paid
            </span>
            <span className="text-primary">-€{selectedBooking.depositPaid}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-border pt-3">
            <span className="text-foreground">Remaining Balance</span>
            <span className="text-foreground">€{selectedBooking.price - selectedBooking.depositPaid}</span>
          </div>
        </div>

        {/* Actions */}
        {(selectedBooking.status === "confirmed" || selectedBooking.status === "pending") && (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-border bg-muted/30 hover:bg-muted/50">
              Contact Venue
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => handleCancelBooking(selectedBooking.id)}
              disabled={isCancelling}
            >
              {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Booking'}
            </Button>
          </div>
        )}
      </motion.div>
    );
  }

  const filteredBookings = bookings.filter(b => {
    if (activeFilter === "upcoming") return b.status === "confirmed";
    if (activeFilter === "requests") return b.status === "pending";
    if (activeFilter === "past") return b.status === "completed";
    if (activeFilter === "cancelled") return b.status === "cancelled" || b.status === "declined" || b.status === "no_show";
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="px-4 py-4 pb-24 max-w-screen-lg mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <h1 className="text-xl font-bold text-white">My Bookings</h1>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {[
          { id: "upcoming" as const, label: "Upcoming" },
          { id: "requests" as const, label: "Requests" },
          { id: "past" as const, label: "Past" },
          { id: "cancelled" as const, label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              activeFilter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Bookings List */}
          {filteredBookings.length > 0 ? (
            <div className="space-y-3">
              {filteredBookings.map((booking) => {
                const isPast = booking.status === "completed";
                const isCancelled = booking.status === "cancelled";
                
                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        "bg-muted/30 border border-border rounded-xl overflow-hidden",
                        (isPast || isCancelled) && "opacity-70"
                      )}
                  >
                    <div className="flex">
                      <div className={cn("w-24 h-24 shrink-0", (isPast || isCancelled) && "grayscale")}>
                        <img
                          src={booking.venueImage}
                          alt={booking.venueName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                        <div className="flex-1 p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className={cn("font-semibold", isPast || isCancelled ? "text-muted-foreground" : "text-foreground")}>
                              {booking.venueName}
                          </h3>
                          <Badge variant="outline" className={cn("text-xs", statusStyles[booking.status])}>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            <Clock className="w-3 h-3 ml-2" />
                            <span>{booking.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span>Table {booking.table}</span>
                            <Users className="w-3 h-3 ml-2" />
                            <span>{booking.guests} guests</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-2 border-t border-border flex justify-between items-center">
                      <span className={cn("text-sm font-semibold", isPast || isCancelled ? "text-muted-foreground" : "text-foreground")}>
                        €{booking.price}
                      </span>
                      <button 
                        onClick={() => setSelectedBooking(booking)}
                        className={cn(
                          "text-xs hover:underline",
                          isPast ? "text-primary" : "text-primary"
                        )}
                      >
                        {isPast ? "Receipt Details" : "View Details"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {activeFilter === "upcoming" && "No upcoming bookings"}
                {activeFilter === "requests" && "No pending requests"}
                {activeFilter === "past" && "No past bookings"}
                {activeFilter === "cancelled" && "No cancelled bookings"}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {activeFilter === "upcoming" && "Book a table at your favorite venue"}
                {activeFilter === "requests" && "Your booking requests will appear here"}
              </p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

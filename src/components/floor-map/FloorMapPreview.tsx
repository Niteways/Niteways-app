import { useState, useEffect } from "react";
import { Circle, Sofa, Wine, Music, DoorOpen, Square, Check, X, Users, Clock, DollarSign, CreditCard, Calendar, MessageSquare, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTableSync } from "@/hooks/useTableSync";
import { useRealtimeTableBookings } from "@/hooks/useRealtimeTableBookings";
import { useTableBlocking } from "@/hooks/useTableBlocking";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { GuestProfileModal } from "@/components/guests/GuestProfileModal";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { setBookingStatus } from "@/lib/bookingStatus";
import { toast } from "sonner";

import { getPortalScopeVenueId } from "@/config/venueScope";

interface FloorElement {
  id: string;
  type: "table" | "bar" | "booth" | "dj" | "entrance" | "vip_area";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity?: number;
  price?: number;
  minSpend?: number;
  status: "available" | "reserved" | "occupied" | "vip" | "confirmed" | "pending" | "blocked";
  color?: string;
  guestName?: string;
  guestCount?: number;
  time?: string;
  notes?: string;
  guestId?: string;
  guestEmail?: string;
  guestPhone?: string;
  bookingId?: string;
  venueId?: string;
}

const STORAGE_KEY = "nightflow_floor_layouts";

// Default table positions for floor plan
const defaultTablePositions: Record<string, { x: number; y: number; width: number; height: number; type: "table" | "booth" }> = {
  "T1": { x: 50, y: 80, width: 70, height: 70, type: "table" },
  "T2": { x: 160, y: 80, width: 70, height: 70, type: "table" },
  "T3": { x: 270, y: 80, width: 70, height: 70, type: "table" },
  "T4": { x: 380, y: 80, width: 70, height: 70, type: "table" },
  "T5": { x: 490, y: 80, width: 70, height: 70, type: "table" },
  "T6": { x: 50, y: 180, width: 70, height: 70, type: "table" },
  "T7": { x: 160, y: 180, width: 70, height: 70, type: "table" },
  "T8": { x: 270, y: 180, width: 70, height: 70, type: "table" },
  "T9": { x: 380, y: 180, width: 70, height: 70, type: "table" },
  "VIP 1": { x: 50, y: 280, width: 120, height: 80, type: "booth" },
  "VIP 2": { x: 200, y: 280, width: 120, height: 80, type: "booth" },
  "VIP 3": { x: 350, y: 280, width: 120, height: 80, type: "booth" },
};

// Static elements (bar, DJ, entrance)
const staticElements: FloorElement[] = [
  { id: "bar1", type: "bar", label: "Main Bar", x: 50, y: 380, width: 180, height: 50, rotation: 0, status: "available" },
  { id: "dj1", type: "dj", label: "DJ Booth", x: 280, y: 380, width: 100, height: 55, rotation: 0, status: "available" },
  { id: "ent1", type: "entrance", label: "Entrance", x: 430, y: 380, width: 90, height: 50, rotation: 0, status: "available" },
];

const elementIcons = {
  table: Circle,
  bar: Wine,
  booth: Sofa,
  dj: Music,
  entrance: DoorOpen,
  vip_area: Square,
};

const TABLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  teal: { bg: "bg-teal/20", border: "border-teal", text: "text-teal" },
  gold: { bg: "bg-gold/20", border: "border-gold", text: "text-gold" },
  coral: { bg: "bg-coral/20", border: "border-coral", text: "text-coral" },
  purple: { bg: "bg-purple/20", border: "border-purple", text: "text-purple" },
  blue: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-500" },
  green: { bg: "bg-green-500/20", border: "border-green-500", text: "text-green-500" },
  red: { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-500" },
};

const getElementColors = (element: FloorElement) => {
  // Blocked tables should show red
  if (element.status === "blocked") {
    return "bg-red-500/20 border-red-500 text-red-500";
  }
  
  if (element.status === "pending") {
    return "bg-blue-500/20 border-blue-500 text-blue-500";
  }
  
  if (element.color && TABLE_COLORS[element.color]) {
    const colorConfig = TABLE_COLORS[element.color];
    return `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`;
  }
  
  const statusColors: Record<string, string> = {
    available: "bg-teal/20 border-teal text-teal",
    reserved: "bg-gold/20 border-gold text-gold",
    occupied: "bg-coral/20 border-coral text-coral",
    vip: "bg-coral/20 border-coral text-coral",
    confirmed: "bg-teal/20 border-teal text-teal",
    blocked: "bg-red-500/20 border-red-500 text-red-500",
  };
  return statusColors[element.status] || statusColors.available;
};

const statusLabels: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  vip: "VIP",
  confirmed: "Confirmed",
  pending: "Pending Request",
  blocked: "Blocked",
};

interface FloorMapPreviewProps {
  className?: string;
  onTableClick?: (tableId: string) => void;
  onAccept?: (tableId: string) => void;
  onDecline?: (tableId: string) => void;
  onGuestClick?: (guest: { id: string; name: string; email: string; phone: string }) => void;
  onBlockTable?: (tableId: string) => void;
  onCancelBooking?: (bookingId: string) => void;
  selectedDate?: string;
}

export function FloorMapPreview({ className, onTableClick, onAccept, onDecline, onGuestClick, onBlockTable, onCancelBooking, selectedDate }: FloorMapPreviewProps) {
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : getPortalScopeVenueId();
  
  const [selectedTable, setSelectedTable] = useState<FloorElement | null>(null);
  const [showGuestCard, setShowGuestCard] = useState(false);
  const [showGuestProfileModal, setShowGuestProfileModal] = useState(false);
  const [selectedGuestProfile, setSelectedGuestProfile] = useState<any>(null);
  const [elements, setElements] = useState<FloorElement[]>([]);
  const { tables: syncedTables } = useTableSync({ venueId: activeVenueId });
  
  // Use the provided date or default to today
  const dateToUse = selectedDate || format(new Date(), "yyyy-MM-dd");
  
  // Fetch bookings for the selected date with real-time sync
  const { bookings: todayBookings, cancelBooking, deleteBooking } = useRealtimeTableBookings({
    date: dateToUse,
    venueId: activeVenueId,
  });

  // Use the unified table blocking hook
  const { blockTable, unblockTable } = useTableBlocking({
    date: dateToUse,
    venueId: activeVenueId,
  });

  // Build floor elements from synced tables and bookings
  useEffect(() => {
    if (syncedTables.length === 0) return;

    const tableElements: FloorElement[] = syncedTables.map(table => {
      const pos = defaultTablePositions[table.label] || { x: 50, y: 50, width: 70, height: 70, type: "table" };
      
      // Find booking for this table
      const booking = todayBookings.find(b => b.table_number === table.label);
      
      // Determine status based on booking
      let status: FloorElement["status"] = "available";
      let guestName: string | undefined;
      let guestCount: number | undefined;
      let time: string | undefined;
      let notes: string | undefined;
      let guestEmail: string | undefined;
      let guestPhone: string | undefined;
      let bookingId: string | undefined;
      let color = table.color || "teal";

      if (booking) {
        bookingId = booking.id;
        if (booking.status === "blocked") {
          status = "blocked";
          color = "red";
          guestName = "BLOCKED";
        } else if (booking.status === "pending") {
          status = "pending";
          color = "blue";
        } else if (booking.status === "confirmed" || booking.status === "completed") {
          status = "reserved";
          color = "gold";
        } else if (booking.status === "vip") {
          status = "vip";
          color = "coral";
        } else if (booking.status === "cancelled") {
          // Cancelled bookings show as available
          status = "available";
          color = "teal";
          bookingId = undefined;
        }
        if (booking.status !== "blocked" && booking.status !== "cancelled") {
          guestName = booking.guest_name;
        }
        guestCount = booking.party_size;
        time = booking.booking_time;
        notes = booking.notes || undefined;
        guestEmail = booking.guest_email || undefined;
        guestPhone = booking.guest_phone || undefined;
      }

      return {
        id: table.id,
        type: pos.type,
        label: table.label,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: 0,
        capacity: table.capacity,
        price: table.basePrice,
        minSpend: table.minSpend,
        status,
        color,
        guestName,
        guestCount,
        time,
        notes,
        guestEmail,
        guestPhone,
        guestId: booking?.guest_id || undefined,
        bookingId,
        venueId: table.venueId,
      };
    });

    setElements([...tableElements, ...staticElements]);
  }, [syncedTables, todayBookings]);

  const handleTableClick = (element: FloorElement) => {
    if (element.type === "table" || element.type === "booth") {
      setSelectedTable(element);
      setShowGuestCard(false);
      onTableClick?.(element.id);
    }
  };

  const handleAccept = async () => {
    if (selectedTable && selectedTable.bookingId) {
      const { ok, error } = await setBookingStatus(selectedTable.bookingId, "confirmed");
      if (!ok) {
        console.error("Failed to accept:", error);
        toast.error("Failed to accept booking");
        return;
      }
      toast.success(`Accepted booking for ${selectedTable.label}`);
      onAccept?.(selectedTable.id);
      setSelectedTable(null);
    }
  };

  const handleDecline = async () => {
    if (selectedTable && selectedTable.bookingId) {
      const { ok, error } = await setBookingStatus(selectedTable.bookingId, "cancelled");
      if (!ok) {
        console.error("Failed to decline:", error);
        toast.error("Failed to decline booking");
        return;
      }
      toast.success(`Declined booking for ${selectedTable.label}`);
      onDecline?.(selectedTable.id);
      setSelectedTable(null);
    }
  };

  const handleCancelBooking = async () => {
    if (selectedTable && selectedTable.bookingId) {
      try {
        await cancelBooking(selectedTable.bookingId);
        toast.success(`Booking cancelled for ${selectedTable.label}`);
        onCancelBooking?.(selectedTable.bookingId);
        setSelectedTable(null);
      } catch (err) {
        console.error("Failed to cancel:", err);
        toast.error("Failed to cancel booking");
      }
    }
  };

  const handleUnblockTable = async () => {
    if (selectedTable) {
      const success = await unblockTable(selectedTable.label);
      if (success) {
        setSelectedTable(null);
      }
    }
  };

  const handleBlockTable = async () => {
    if (!selectedTable) return;
    const success = await blockTable(selectedTable.label, selectedTable.venueId);
    if (success) {
      onBlockTable?.(selectedTable.id);
      setSelectedTable(null);
    }
  };

  const handleGuestNameClick = () => {
    if (selectedTable?.guestName && selectedTable.guestName !== "BLOCKED") {
      // Create guest profile for the modal
      setSelectedGuestProfile({
        id: selectedTable.id,
        guestId: selectedTable.guestId || "USR-001",
        name: selectedTable.guestName,
        email: selectedTable.guestEmail || `${selectedTable.guestName.toLowerCase().replace(' ', '.')}@email.com`,
        phone: selectedTable.guestPhone || "+1 555-0100",
        loyaltyLevel: selectedTable.status === 'vip' ? 'platinum' : 'gold',
        automaticRating: 4.5,
        personnelRating: 0,
        totalVisits: 48,
        totalSpend: 25000,
        avgSpend: 980,
        nitewaysVisits: 48,
        nitewaysAvgTip: 4,
        nitewaysAvgBill: 980,
        about: selectedTable.notes || "Regular guest with excellent booking history.",
        instagramHandle: `@${selectedTable.guestName.toLowerCase().replace(' ', '_')}`,
        // Pass booking details for the modal
        bookingDetails: {
          table: selectedTable.label,
          partySize: selectedTable.guestCount,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: selectedTable.time,
        },
      });
      setShowGuestProfileModal(true);
      setSelectedTable(null);
    }
  };

  return (
    <>
      <div className={cn("relative w-full h-full", className)}>
        <div 
          className="relative w-full h-full rounded-lg border border-border bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:20px_20px] bg-muted/20"
        >
          {elements.map((element) => {
            const Icon = elementIcons[element.type];
            const isPending = element.status === "pending";
            return (
              <div
                key={element.id}
                className={cn(
                  "absolute rounded-lg border-2 flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105",
                  getElementColors(element),
                  isPending && "animate-pulse"
                )}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  transform: `rotate(${element.rotation || 0}deg)`,
                }}
                onClick={() => handleTableClick(element)}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-bold mt-1">{element.label}</span>
                {element.status === "blocked" ? (
                  <span className="text-[10px] opacity-70">BLOCKED</span>
                ) : (
                  <>
                    {element.capacity && (
                      <span className="text-[10px] opacity-70">{element.capacity} pax</span>
                    )}
                    {element.price && (
                      <span className="text-[10px] opacity-70">${element.price}</span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Dialog with Guest Card toggle */}
      <Dialog open={!!selectedTable && !showGuestCard} onOpenChange={(open) => !open && setSelectedTable(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTable?.label}
              {selectedTable && (
                <Badge variant="outline" className={cn("ml-2", getElementColors(selectedTable))}>
                  {statusLabels[selectedTable.status]}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTable?.status === "available" 
                ? "This table is currently available for booking"
                : selectedTable?.status === "blocked"
                  ? "This table is currently blocked"
                  : selectedTable?.guestName 
                    ? (
                      <span>
                        Reserved by{" "}
                        <button 
                          onClick={handleGuestNameClick}
                          className="text-primary hover:underline font-medium"
                        >
                          {selectedTable.guestName}
                        </button>
                      </span>
                    )
                    : "Table information"
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedTable && (
            <div className="space-y-4">
              {selectedTable.guestName && selectedTable.guestName !== "BLOCKED" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Party Size:</span>
                    <span className="font-medium">{selectedTable.guestCount} guests</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{selectedTable.time}</span>
                  </div>
                  {selectedTable.price && (
                    <div className="flex items-center gap-3 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">${selectedTable.price.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedTable.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="mt-1 text-foreground">{selectedTable.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Block Table Button for available tables */}
              {selectedTable.status === "available" && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4" />
                      <span>Capacity: {selectedTable.capacity} guests</span>
                    </div>
                    {selectedTable.price && (
                      <div className="flex items-center gap-3 mt-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Price: ${selectedTable.price.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full gap-2 text-coral border-coral/30 hover:bg-coral/10"
                    onClick={handleBlockTable}
                  >
                    <Ban className="w-4 h-4" />
                    Block Table
                  </Button>
                </div>
              )}

              {/* Unblock Button for blocked tables */}
              {selectedTable.status === "blocked" && (
                <Button 
                  variant="outline"
                  className="w-full gap-2 text-teal border-teal/30 hover:bg-teal/10"
                  onClick={handleUnblockTable}
                >
                  <Check className="w-4 h-4" />
                  Unblock Table
                </Button>
              )}

              {/* Accept/Decline for pending requests */}
              {selectedTable.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 gap-2 bg-teal hover:bg-teal/90"
                    onClick={handleAccept}
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 gap-2 text-coral border-coral/30 hover:bg-coral/10"
                    onClick={handleDecline}
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </Button>
                </div>
              )}

              {/* Cancel Booking for confirmed/reserved bookings */}
              {(selectedTable.status === "reserved" || selectedTable.status === "vip" || selectedTable.status === "confirmed") && selectedTable.bookingId && (
                <Button 
                  variant="outline"
                  className="w-full gap-2 text-coral border-coral/30 hover:bg-coral/10"
                  onClick={handleCancelBooking}
                >
                  <X className="w-4 h-4" />
                  Cancel Booking
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Guest Profile Modal */}
      <GuestProfileModal
        guest={selectedGuestProfile}
        open={showGuestProfileModal}
        onOpenChange={setShowGuestProfileModal}
        bookingDetails={selectedGuestProfile?.bookingDetails}
      />
    </>
  );
}
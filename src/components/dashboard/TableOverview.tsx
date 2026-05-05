import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRealtimeTableStatus, TableWithBooking, TableStatus } from "@/hooks/useRealtimeTableStatus";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { GuestProfileModal } from "@/components/guests/GuestProfileModal";
import { cn } from "@/lib/utils";
import { Users, Clock, Check, X, Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { getPortalScopeVenueId } from "@/config/venueScope";

// Color mapping based on status
const getTableStyles = (status: TableStatus) => {
  switch (status) {
    case "confirmed":
      return { bg: "bg-teal/20", border: "border-teal/40", text: "text-teal" };
    case "pending":
      return { bg: "bg-gold/20", border: "border-gold/40", text: "text-gold" };
    case "vip":
      return { bg: "bg-purple-500/20", border: "border-purple-500/40", text: "text-purple-500" };
    case "blocked":
      return { bg: "bg-coral/20", border: "border-coral/40", text: "text-coral" };
    case "available":
    default:
      return { bg: "bg-muted/40", border: "border-border", text: "text-muted-foreground" };
  }
};

const statusLabels = {
  confirmed: "Booked",
  pending: "Pending",
  vip: "VIP",
  blocked: "Blocked",
  available: "Available",
};

export function TableOverview() {
  const navigate = useNavigate();
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : getPortalScopeVenueId();
  
  const today = format(new Date(), "yyyy-MM-dd");
  const { tables, loading, blockTable, unblockTable, acceptBooking, declineBooking } = useRealtimeTableStatus(today, { venueId: activeVenueId });
  const [selectedTable, setSelectedTable] = useState<TableWithBooking | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isGuestProfileOpen, setIsGuestProfileOpen] = useState(false);

  // Calculate stats (real venue_tables + bookings — no demo fallback)
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === "available").length,
    booked: tables.filter(t => t.status === "confirmed").length,
    pending: tables.filter(t => t.status === "pending").length,
    vip: tables.filter(t => t.status === "vip").length,
    blocked: tables.filter(t => t.status === "blocked").length,
  };

  const handleTableClick = (table: TableWithBooking) => {
    setSelectedTable(table);
    setIsDialogOpen(true);
  };

  const handleGuestClick = () => {
    if (!selectedTable?.booking) return;
    
    setSelectedGuest({
      id: selectedTable.booking.id,
      guestId: `USR-${selectedTable.booking.id.substring(0, 3).toUpperCase()}`,
      name: selectedTable.booking.guestName,
      email: `${selectedTable.booking.guestName.toLowerCase().replace(' ', '.')}@email.com`,
      phone: selectedTable.booking.guestPhone || "+1 555-0100",
      loyaltyLevel: selectedTable.status === 'vip' ? 'platinum' : 'gold',
      automaticRating: 4.5,
      personnelRating: 4.2,
      totalVisits: 12,
      totalSpend: 15000,
      avgSpend: 1250,
      about: selectedTable.booking.notes || "Guest profile",
    });
    setIsGuestProfileOpen(true);
  };

  const handleAccept = async () => {
    if (!selectedTable?.booking) return;
    const success = await acceptBooking(selectedTable.booking.id);
    if (success) {
      toast.success(`Accepted booking for table ${selectedTable.label}`);
      setIsDialogOpen(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedTable?.booking) return;
    const success = await declineBooking(selectedTable.booking.id);
    if (success) {
      toast.error(`Declined booking for table ${selectedTable.label}`);
      setIsDialogOpen(false);
    }
  };

  const handleBlock = async () => {
    if (!selectedTable) return;
    const success = await blockTable(selectedTable.label);
    if (success) {
      toast.success(`Table ${selectedTable.label} blocked`);
      setIsDialogOpen(false);
    }
  };

  const handleUnblock = async () => {
    if (!selectedTable) return;
    const success = await unblockTable(selectedTable.label);
    if (success) {
      toast.success(`Table ${selectedTable.label} unblocked`);
      setIsDialogOpen(false);
    }
  };

  const displayTables: TableWithBooking[] = tables;
  const emptyTables = displayTables.length === 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Table Status</h3>
          <button 
            className="text-sm text-primary hover:underline"
            onClick={() => navigate("/floor-map")}
          >
            Open Floor Map
          </button>
        </div>

        {/* Legend with counts */}
        <div className="flex flex-wrap gap-3 mb-4">
          <Badge variant="outline" className="text-xs bg-teal/10 text-teal border-teal/30 gap-1 px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-teal" />
            Booked {stats.booked}
          </Badge>
          <Badge variant="outline" className="text-xs bg-gold/10 text-gold border-gold/30 gap-1 px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-gold" />
            Pending {stats.pending}
          </Badge>
          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/30 gap-1 px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            VIP {stats.vip}
          </Badge>
          <Badge variant="outline" className="text-xs bg-coral/10 text-coral border-coral/30 gap-1 px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-coral" />
            Blocked {stats.blocked}
          </Badge>
          <Badge variant="outline" className="text-xs bg-muted/40 text-muted-foreground border-border gap-1 px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            Available {stats.available}
          </Badge>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground py-2">Loading tables from Supabase…</p>
        )}
        {!loading && emptyTables && (
          <p className="text-sm text-muted-foreground py-4">
            No tables configured for this venue yet. Add them in Table Map / floor plan so status shows here.
          </p>
        )}
        {!emptyTables && (
        <div className="grid grid-cols-4 gap-3">
          {displayTables.map((table, index) => {
            const styles = getTableStyles(table.status);
            return (
              <motion.button
                key={table.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.8 + index * 0.03 }}
                onClick={() => handleTableClick(table)}
                className={cn(
                  "aspect-square rounded-xl border-2 p-2 transition-all hover:scale-105 flex flex-col items-center justify-center",
                  styles.bg,
                  styles.border
                )}
              >
                <span className={cn("text-sm font-semibold", styles.text)}>
                  {table.label}
                </span>
                <span className={cn("text-xs opacity-70", styles.text)}>
                  {table.capacity}p
                </span>
                {table.status === "blocked" && (
                  <Lock className={cn("w-3 h-3 mt-0.5", styles.text)} />
                )}
              </motion.button>
            );
          })}
        </div>
        )}
      </motion.div>

      {/* Table Info Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Table {selectedTable?.label}
              <Badge variant="outline" className={cn(
                "text-xs capitalize",
                selectedTable?.status === "available" ? "bg-muted/20 text-muted-foreground" :
                selectedTable?.status === "confirmed" ? "bg-teal/20 text-teal border-teal/30" :
                selectedTable?.status === "pending" ? "bg-gold/20 text-gold border-gold/30" :
                selectedTable?.status === "vip" ? "bg-purple-500/20 text-purple-500 border-purple-500/30" :
                "bg-coral/20 text-coral border-coral/30"
              )}>
                {selectedTable?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Capacity: {selectedTable?.capacity} people</span>
            </div>
            
            {/* Booked table */}
            {selectedTable?.status === "confirmed" && selectedTable?.booking && (
              <div className="p-3 rounded-lg bg-teal/10 space-y-2">
                <button 
                  onClick={handleGuestClick}
                  className="font-medium hover:text-primary transition-colors text-left"
                >
                  {selectedTable.booking.guestName}
                </button>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {selectedTable.booking.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {selectedTable.booking.partySize} guests
                  </span>
                </div>
                {selectedTable.booking.notes && (
                  <p className="text-xs text-muted-foreground">{selectedTable.booking.notes}</p>
                )}
              </div>
            )}

            {/* VIP table */}
            {selectedTable?.status === "vip" && selectedTable?.booking && (
              <div className="p-3 rounded-lg bg-purple-500/10 space-y-2">
                <button 
                  onClick={handleGuestClick}
                  className="font-medium hover:text-primary transition-colors text-left flex items-center gap-2"
                >
                  {selectedTable.booking.guestName}
                  <Badge className="bg-purple-500/20 text-purple-500 border-0 text-[10px]">VIP</Badge>
                </button>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {selectedTable.booking.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {selectedTable.booking.partySize} guests
                  </span>
                </div>
              </div>
            )}

            {/* Pending table */}
            {selectedTable?.status === "pending" && selectedTable?.booking && (
              <>
                <div className="p-3 rounded-lg bg-gold/10 space-y-2">
                  <button 
                    onClick={handleGuestClick}
                    className="font-medium hover:text-primary transition-colors text-left"
                  >
                    {selectedTable.booking.guestName}
                  </button>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {selectedTable.booking.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {selectedTable.booking.partySize} guests
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-teal hover:bg-teal/90 gap-2"
                    onClick={handleAccept}
                  >
                    <Check className="w-4 h-4" /> Accept
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 text-coral hover:text-coral gap-2"
                    onClick={handleDecline}
                  >
                    <X className="w-4 h-4" /> Decline
                  </Button>
                </div>
              </>
            )}
            
            {/* Blocked table */}
            {selectedTable?.status === "blocked" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-coral/10 text-center">
                  <Lock className="w-6 h-6 mx-auto mb-2 text-coral" />
                  <p className="text-sm text-muted-foreground">This table is currently blocked</p>
                </div>
                <Button 
                  className="w-full gap-2"
                  variant="outline"
                  onClick={handleUnblock}
                >
                  <LockOpen className="w-4 h-4" /> Unblock Table
                </Button>
              </div>
            )}
            
            {/* Available table */}
            {selectedTable?.status === "available" && (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => {
                  setIsDialogOpen(false);
                  navigate(`/tables?newBooking=${encodeURIComponent(selectedTable?.label || "")}`);
                }}>
                  Create Booking
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2 text-coral hover:text-coral"
                  onClick={handleBlock}
                >
                  <Lock className="w-4 h-4" /> Block
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Profile Modal */}
      <GuestProfileModal
        guest={selectedGuest}
        open={isGuestProfileOpen}
        onOpenChange={setIsGuestProfileOpen}
        currentVenueName="Skyline Lounge"
      />
    </>
  );
}

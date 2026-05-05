import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { UnifiedFloorMap } from "@/components/floor-map/UnifiedFloorMap";
import { BookingLog } from "@/components/dashboard/BookingLog";
import { StatCard } from "@/components/dashboard/StatCard";
import { MobileStatsCarousel } from "@/components/dashboard/MobileStatsCarousel";
import { GuestProfileModal } from "@/components/guests/GuestProfileModal";
import { useFloorMapData } from "@/hooks/useFloorMapData";
import { useTableSync } from "@/hooks/useTableSync";
import { useRealtimeTableBookings } from "@/hooks/useRealtimeTableBookings";
import { useRealtimeSpecialDatePricing } from "@/hooks/useRealtimeSpecialDatePricing";
import { useTableBlocking } from "@/hooks/useTableBlocking";
import { useIsMobile } from "@/hooks/use-mobile";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { DEFAULT_VENUE_ID } from "@/config/venueScope";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  CalendarIcon,
  Check,
  X,
  Edit,
  DollarSign,
  Users,
  Clock,
  CalendarCheck,
  Crown,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface Booking {
  id: string;
  guestName: string;
  table: string;
  guests: number;
  time: string;
  status: "confirmed" | "pending" | "vip" | "cancelled";
  price: number;
  notes?: string;
}

const statusStyles = {
  confirmed: "bg-teal/20 text-teal border-teal/30",
  pending: "bg-gold/20 text-gold border-gold/30",
  vip: "bg-coral/20 text-coral border-coral/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const TableBooking = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Import impersonation context for venue scoping
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : undefined;
  
  const { tables: syncedTables, rooms: syncedRooms, isLoaded } = useTableSync({ venueId: activeVenueId });
  const { getPricingForDate } = useRealtimeSpecialDatePricing({ venueId: activeVenueId });
  const [date, setDate] = useState<Date>(new Date());
  const bookingDateStr = format(date, "yyyy-MM-dd");
  const { blockTable } = useTableBlocking({ date: bookingDateStr, venueId: activeVenueId });
  
  // Use the unified floor map data hook for real-time sync
  const { elements: floorMapElements, bookings: floorMapBookings } = useFloorMapData({ 
    date: bookingDateStr,
    venueId: activeVenueId
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isBlockTableOpen, setIsBlockTableOpen] = useState(false);
  const [isPriceManuallySet, setIsPriceManuallySet] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedNewTable, setSelectedNewTable] = useState<string>("");
  const [blockTableData, setBlockTableData] = useState({ table: "", notes: "" });
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [datesWithBookings, setDatesWithBookings] = useState<Date[]>([]);
  const [newBookingData, setNewBookingData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    table: "",
    guests: 4,
    time: "22:00",
    notes: "",
    price: 1000,
  });

  // Handle ?newBooking=T1 URL param to auto-open new booking dialog with preselected table
  useEffect(() => {
    const tableFromUrl = searchParams.get("newBooking");
    if (tableFromUrl) {
      setIsPriceManuallySet(false);
      setNewBookingData((prev) => ({ ...prev, table: tableFromUrl }));
      setIsNewBookingOpen(true);
      // Clear the URL param
      searchParams.delete("newBooking");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Auto-calc price from special date pricing (unless user manually set it)
  useEffect(() => {
    if (!isNewBookingOpen) return;
    if (isPriceManuallySet) return;
    if (!newBookingData.table) return;

    const table = syncedTables.find((t) => t.label === newBookingData.table);
    if (!table) return;

    const computed = getPricingForDate(bookingDateStr, table.id, table.basePrice);
    setNewBookingData((prev) => (prev.price === computed ? prev : { ...prev, price: computed }));
  }, [isNewBookingOpen, isPriceManuallySet, newBookingData.table, syncedTables, getPricingForDate, bookingDateStr]);

  // Realtime bookings from database
  const { 
    bookings: realtimeBookings, 
    isLoading: isLoadingBookings,
    addBooking,
    updateBooking,
    cancelBooking: cancelBookingInDb,
  } = useRealtimeTableBookings({
    date: bookingDateStr,
    venueId: activeVenueId,
  });

  // Transform realtime bookings to local format
  const dbBookings: Booking[] = realtimeBookings
    .filter(b => b.status !== "blocked") // Don't show blocked entries as bookings
    .map(b => ({
      id: b.id,
      guestName: b.guest_name,
      table: b.table_number,
      guests: b.party_size,
      time: b.booking_time,
      status: (b.status === "completed" ? "confirmed" : b.status) as Booking["status"],
      price: b.price || 0,
      notes: b.notes || undefined,
    }));

  // Use database bookings
  const bookingsData: Booking[] = dbBookings;

  // Get available tables from synced data
  const availableTables = syncedTables.map(t => t.label);
  
  // Get tables that are NOT booked for the selected date (for new booking dialog)
  const bookedTableLabels = realtimeBookings
    .filter(b => b.status !== "cancelled")
    .map(b => b.table_number);
  const unbookedTables = availableTables.filter(table => !bookedTableLabels.includes(table));


  const handleGuestClick = (booking: Booking) => {
    setSelectedGuest({
      id: booking.id,
      guestId: `USR-${booking.id.substring(0, 3).toUpperCase()}`,
      name: booking.guestName,
      email: `${booking.guestName.toLowerCase().replace(' ', '.')}@email.com`,
      phone: "+1 555-0100",
      loyaltyLevel: booking.status === 'vip' ? 'platinum' : 'gold',
      automaticRating: 4.2 + Math.random() * 0.8,
      personnelRating: 4.0 + Math.random(),
      totalVisits: Math.floor(Math.random() * 50) + 5,
      totalSpend: Math.floor(Math.random() * 50000) + 5000,
      avgSpend: Math.floor(Math.random() * 2000) + 500,
      about: booking.notes || "Regular guest with excellent booking history.",
      instagramHandle: `@${booking.guestName.toLowerCase().replace(' ', '_')}`,
    });
    setSelectedBookingDetails({
      table: booking.table,
      partySize: booking.guests,
      date: format(date, "MMM d, yyyy"),
      time: booking.time,
      price: booking.price,
      notes: booking.notes,
    });
    setIsProfileOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setSelectedNewTable(booking.table);
    setIsEditDialogOpen(true);
  };

  const handleSaveBookingChanges = async () => {
    if (!editingBooking || !selectedNewTable) return;
    try {
      await updateBooking(editingBooking.id, { table_number: selectedNewTable });
      toast.success(`Booking moved to table ${selectedNewTable}`);
    } catch (error) {
      toast.error("Failed to update booking");
    }
    setIsEditDialogOpen(false);
    setEditingBooking(null);
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBookingInDb(bookingId);
      toast.success("Booking cancelled");
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  // Filter only confirmed bookings (not pending requests)
  const filteredBookings = bookingsData.filter((booking) => {
    const matchesSearch = booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.table.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    // Only show confirmed, vip, or cancelled bookings - not pending
    const isConfirmedBooking = booking.status !== "pending";
    return matchesSearch && matchesStatus && isConfirmedBooking;
  });

  const stats = {
    total: bookingsData.length,
    confirmed: bookingsData.filter(b => b.status === "confirmed").length,
    pending: bookingsData.filter(b => b.status === "pending").length,
    vip: bookingsData.filter(b => b.status === "vip").length,
    revenue: bookingsData.filter(b => b.status !== "cancelled").reduce((sum, b) => sum + b.price, 0),
  };

  const handleAccept = (tableId: string) => {
    toast.success(`Accepted booking for table ${tableId}`);
  };

  const handleDecline = (tableId: string) => {
    toast.error(`Declined booking for table ${tableId}`);
  };

  const handleCreateBooking = async () => {
    if (!newBookingData.guestName || !newBookingData.table) {
      toast.error("Please fill in guest name and table");
      return;
    }

    // Get the venue_id from the selected table or use impersonated venue
    const selectedTableData = syncedTables.find(t => t.label === newBookingData.table);
    const venueId = activeVenueId || selectedTableData?.venueId || DEFAULT_VENUE_ID;

    try {
      await addBooking({
        venue_id: venueId,
        booking_id: `BK-${Date.now()}`,
        table_number: newBookingData.table,
        guest_name: newBookingData.guestName,
        guest_email: newBookingData.guestEmail || null,
        guest_phone: newBookingData.guestPhone || null,
        guest_id: null,
        booking_date: format(date, "yyyy-MM-dd"),
        booking_time: newBookingData.time,
        party_size: newBookingData.guests,
        status: "confirmed",
        price: newBookingData.price,
        notes: newBookingData.notes || null,
      });

      toast.success(`Booking created for ${newBookingData.guestName} at ${newBookingData.table}`);
      setIsNewBookingOpen(false);
      setIsPriceManuallySet(false);
      setNewBookingData({
        guestName: "",
        guestEmail: "",
        guestPhone: "",
        table: "",
        guests: 4,
        time: "22:00",
        notes: "",
        price: 1000,
      });
    } catch (error) {
      console.error("Failed to create booking:", error);
      toast.error("Failed to create booking");
    }
  };

  const handleBlockTable = () => {
    setIsBlockTableOpen(true);
  };

  const handleConfirmBlockTable = async () => {
    if (!blockTableData.table) {
      toast.error("Please select a table to block");
      return;
    }

    try {
      const selectedTableData = syncedTables.find((t) => t.label === blockTableData.table);
      const venueId = selectedTableData?.venueId;

      const success = await blockTable(blockTableData.table, blockTableData.notes);
      if (!success) return;

      toast.success(`Table ${blockTableData.table} has been blocked`);
      setIsBlockTableOpen(false);
      setBlockTableData({ table: "", notes: "" });
    } catch (error) {
      console.error("Failed to block table:", error);
      toast.error("Failed to block table");
    }
  };

  const mobileStats = [
    {
      title: "Est. Revenue",
      value: `$${stats.revenue.toLocaleString()}`,
      subtitle: "Tonight's bookings",
      icon: DollarSign,
      variant: "gold" as const,
    },
    {
      title: "Total Bookings",
      value: stats.total.toString(),
      subtitle: `${stats.confirmed} confirmed`,
      icon: CalendarCheck,
      variant: "teal" as const,
    },
    {
      title: "Pending Requests",
      value: stats.pending.toString(),
      subtitle: "Awaiting approval",
      icon: Clock,
      variant: "coral" as const,
    },
    {
      title: "VIP Reservations",
      value: stats.vip.toString(),
      subtitle: "Premium tables",
      icon: Crown,
      variant: "purple" as const,
    },
  ];

  return (
    <AdminLayout title="Table Booking" subtitle="">
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Stats - Swipeable on mobile */}
        {isMobile ? (
          <MobileStatsCarousel stats={mobileStats} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Est. Revenue"
              value={`$${stats.revenue.toLocaleString()}`}
              subtitle="Tonight's bookings"
              icon={DollarSign}
              variant="gold"
              delay={0}
            />
            <StatCard
              title="Total Bookings"
              value={stats.total.toString()}
              subtitle={`${stats.confirmed} confirmed`}
              icon={CalendarCheck}
              variant="teal"
              delay={0.1}
            />
            <StatCard
              title="Pending Requests"
              value={stats.pending.toString()}
              subtitle="Awaiting approval"
              icon={Clock}
              variant="coral"
              delay={0.2}
            />
            <StatCard
              title="VIP Reservations"
              value={stats.vip.toString()}
              subtitle="Premium tables"
              icon={Crown}
              variant="purple"
              delay={0.3}
            />
          </div>
        )}

        {/* Floor Map - Scaled for mobile */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={isMobile ? "p-4 bg-muted/10 rounded-lg" : "glass-card p-4"}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-semibold">Floor Map</h3>
            <div className={cn(
              "flex items-center gap-2 text-xs",
              isMobile && "flex-wrap gap-1"
            )}>
              <Badge variant="outline" className="bg-teal/20 text-teal border-teal/30 gap-1 text-[10px] md:text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                Available
              </Badge>
              <Badge variant="outline" className="bg-gold/20 text-gold border-gold/30 gap-1 text-[10px] md:text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                Reserved
              </Badge>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30 gap-1 text-[10px] md:text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Pending
              </Badge>
              <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/30 gap-1 text-[10px] md:text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Blocked
              </Badge>
              <Badge variant="outline" className="bg-coral/20 text-coral border-coral/30 gap-1 text-[10px] md:text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-coral" />
                VIP
              </Badge>
            </div>
          </div>
          <div className={cn(
            "relative overflow-hidden rounded-lg",
            isMobile ? "h-[300px]" : "h-[550px]"
          )}>
            <div className={cn(
              "absolute inset-0 origin-top-left",
              isMobile && "scale-[0.55]"
            )} style={isMobile ? { width: '182%', height: '182%' } : undefined}>
              <UnifiedFloorMap 
                elements={floorMapElements}
                className="w-full h-full" 
                variant="admin"
                showActions={true}
                onAccept={(tableId, bookingId) => handleAccept(tableId)}
                onDecline={(tableId, bookingId) => handleDecline(tableId)}
                selectedTableId={null}
              />
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={isMobile ? "p-4" : "glass-card p-4"}
        >
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by guest name or table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {format(date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="pointer-events-auto"
                  modifiers={{ hasBooking: datesWithBookings }}
                  modifiersClassNames={{ hasBooking: "" }}
                  components={{
                    DayContent: ({ date: dayDate }) => {
                      const hasBooking = datesWithBookings.some(
                        (d) => d.toDateString() === dayDate.toDateString()
                      );
                      return (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {dayDate.getDate()}
                          {hasBooking && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                          )}
                        </div>
                      );
                    },
                  }}
                />
              </PopoverContent>
            </Popover>

            {!isMobile && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className={cn("flex gap-2", isMobile && "w-full")}>
              <Button 
                variant="outline" 
                className={cn(
                  "gap-2 text-coral border-coral/30 hover:bg-coral/10",
                  isMobile && "flex-1"
                )} 
                onClick={() => handleBlockTable()}
              >
                <X className="w-4 h-4" />
                Block Table
              </Button>
              <Button 
                className={cn("gap-2", isMobile && "flex-1")} 
                onClick={() => setIsNewBookingOpen(true)}
              >
                <Plus className="w-4 h-4" />
                New Booking
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Bookings Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={isMobile ? "overflow-x-auto" : "glass-card overflow-hidden"}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className={isMobile ? "text-xs py-2 px-2" : ""}>Guest</TableHead>
                <TableHead className={isMobile ? "text-xs py-2 px-2" : ""}>Table</TableHead>
                <TableHead className={isMobile ? "text-xs py-2 px-2" : ""}>Party Size</TableHead>
                <TableHead className={isMobile ? "text-xs py-2 px-2" : ""}>Time</TableHead>
                <TableHead className={isMobile ? "text-xs py-2 px-2" : ""}>Price</TableHead>
                <TableHead className={isMobile ? "text-xs py-2 px-2" : ""}>Status</TableHead>
                <TableHead className={cn("text-right", isMobile ? "text-xs py-2 px-2" : "")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingBookings ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading bookings...
                  </TableCell>
                </TableRow>
              ) : filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No bookings found for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking, index) => (
                  <motion.tr
                    key={booking.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="border-border/50 hover:bg-muted/30"
                  >
                    <TableCell className={isMobile ? "py-2 px-2" : ""}>
                      <button 
                        onClick={() => handleGuestClick(booking)}
                        className="font-medium hover:text-primary transition-colors cursor-pointer text-left"
                      >
                        {booking.guestName}
                      </button>
                    </TableCell>
                    <TableCell className={isMobile ? "py-2 px-2" : ""}>
                      <Badge variant="outline" className="font-mono text-xs">
                        {booking.table}
                      </Badge>
                    </TableCell>
                    <TableCell className={isMobile ? "py-2 px-2" : ""}>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {booking.guests}
                      </span>
                    </TableCell>
                    <TableCell className={isMobile ? "py-2 px-2" : ""}>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {booking.time.substring(0, 5)}
                      </div>
                    </TableCell>
                    <TableCell className={isMobile ? "py-2 px-2" : ""}>
                      <span className="font-medium">${booking.price.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className={isMobile ? "py-2 px-2" : ""}>
                      <Badge variant="outline" className={cn("text-xs", statusStyles[booking.status])}>
                        {booking.status === "confirmed" && <Check className="w-3 h-3 mr-1" />}
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-right", isMobile ? "py-2 px-2" : "")}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEditBooking(booking)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-coral hover:text-coral"
                          onClick={() => setBookingToCancel(booking.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>
      </div>

      {/* Guest Profile Modal */}
      <GuestProfileModal
        guest={selectedGuest}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        bookingDetails={selectedBookingDetails}
      />

      {/* Edit Booking Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Booking</DialogTitle>
            <DialogDescription>
              Change the table assignment for {editingBooking?.guestName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedNewTable} onValueChange={setSelectedNewTable}>
              <SelectTrigger>
                <SelectValue placeholder="Select new table" />
              </SelectTrigger>
              <SelectContent>
                {availableTables.map(table => (
                  <SelectItem key={table} value={table}>{table}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBookingChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Booking Dialog */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
              Add a new table booking for {format(date, "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Guest Name *</label>
                <Input
                  value={newBookingData.guestName}
                  onChange={(e) => setNewBookingData({ ...newBookingData, guestName: e.target.value })}
                  placeholder="Enter guest name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Table *</label>
                <Select 
                  value={newBookingData.table} 
                  onValueChange={(v) => {
                    setIsPriceManuallySet(false);
                    const table = syncedTables.find((t) => t.label === v);
                    const computedPrice = table
                      ? getPricingForDate(bookingDateStr, table.id, table.basePrice)
                      : newBookingData.price;

                    setNewBookingData((prev) => ({ ...prev, table: v, price: computedPrice }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    {unbookedTables.length === 0 ? (
                      <SelectItem value="" disabled>No tables available</SelectItem>
                    ) : (
                      unbookedTables.map(table => (
                        <SelectItem key={table} value={table}>{table}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newBookingData.guestEmail}
                  onChange={(e) => setNewBookingData({ ...newBookingData, guestEmail: e.target.value })}
                  placeholder="guest@email.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={newBookingData.guestPhone}
                  onChange={(e) => setNewBookingData({ ...newBookingData, guestPhone: e.target.value })}
                  placeholder="+46 70 123 4567"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Party Size</label>
                <Input
                  type="number"
                  min={1}
                  value={newBookingData.guests}
                  onChange={(e) => setNewBookingData({ ...newBookingData, guests: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={newBookingData.time}
                  onChange={(e) => setNewBookingData({ ...newBookingData, time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price ($)</label>
                <Input
                  type="number"
                  min={0}
                  value={newBookingData.price}
                  onChange={(e) => {
                    setIsPriceManuallySet(true);
                    setNewBookingData({ ...newBookingData, price: parseInt(e.target.value) || 0 });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={newBookingData.notes}
                onChange={(e) => setNewBookingData({ ...newBookingData, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewBookingOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBooking}>Create Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Table Dialog */}
      <Dialog open={isBlockTableOpen} onOpenChange={setIsBlockTableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Table</DialogTitle>
            <DialogDescription>
              Block a table for {format(date, "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Table</label>
              <Select 
                value={blockTableData.table} 
                onValueChange={(v) => setBlockTableData({ ...blockTableData, table: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select table to block" />
                </SelectTrigger>
                <SelectContent>
                  {unbookedTables.length === 0 ? (
                    <SelectItem value="" disabled>No tables available to block</SelectItem>
                  ) : (
                    unbookedTables.map(table => (
                      <SelectItem key={table} value={table}>{table}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                value={blockTableData.notes}
                onChange={(e) => setBlockTableData({ ...blockTableData, notes: e.target.value })}
                placeholder="Enter reason for blocking..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockTableOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmBlockTable}>Block Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation Dialog */}
      <Dialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingToCancel(null)}>
              No, Keep Booking
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (bookingToCancel) {
                  await handleCancelBooking(bookingToCancel);
                  setBookingToCancel(null);
                }
              }}
            >
              Yes, Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TableBooking;
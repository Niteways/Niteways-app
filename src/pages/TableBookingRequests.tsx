import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { GuestProfileModal } from "@/components/guests/GuestProfileModal";
import { useTableSync } from "@/hooks/useTableSync";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  CalendarIcon,
  Check,
  X,
  Users,
  Clock,
  DollarSign,
  Phone,
  LayoutGrid,
  List,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { usePortal } from "@/contexts/PortalContext";
import { cn } from "@/lib/utils";
import { DEFAULT_VENUE_ID } from "@/config/venueScope";

interface BookingRequest {
  id: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  table: string;
  guests: number;
  time: string;
  date: string;
  price: number;
  notes?: string;
  requestedAt: string;
}

interface GuestListRequest {
  id: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  listName: string;
  plusGuests: number;
  listType: string;
  eventDate: string;
  notes?: string;
  requestedAt: string;
}

const TableBookingRequests = () => {
  const navigate = useNavigate();
  const { mode } = usePortal();
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  const { tables: syncedTables, isLoaded } = useTableSync({ venueId: activeVenueId });
  const isMobile = useIsMobile();
  
  const [activeTab, setActiveTab] = useState<"tables" | "guestlists">("tables");
  const [tableRequests, setTableRequests] = useState<BookingRequest[]>([]);
  const [guestListRequests, setGuestListRequests] = useState<GuestListRequest[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [selectedGuestListRequest, setSelectedGuestListRequest] = useState<GuestListRequest | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [guestListFilter, setGuestListFilter] = useState<string>("all");
  const [requestDates, setRequestDates] = useState<Set<string>>(new Set());
  const [guestLists, setGuestLists] = useState<{id: string; name: string; type: string}[]>([]);

  // Fetch pending booking requests from database
  useEffect(() => {
    const fetchPendingRequests = async () => {
      const { data, error } = await supabase
        .from("table_bookings")
        .select("*")
        .eq("venue_id", activeVenueId)
        .eq("status", "pending")
        .order("booking_date", { ascending: true });

      if (error) {
        console.error("Error fetching pending requests:", error);
        return;
      }

      if (data) {
        const requests: BookingRequest[] = data.map(booking => ({
          id: booking.id,
          guestName: booking.guest_name,
          guestPhone: booking.guest_phone || "",
          guestEmail: booking.guest_email || "",
          table: booking.table_number,
          guests: booking.party_size,
          time: booking.booking_time,
          date: booking.booking_date,
          price: Number(booking.price) || 0,
          notes: booking.notes || undefined,
          requestedAt: format(new Date(booking.created_at), "yyyy-MM-dd HH:mm"),
        }));
        setTableRequests(requests);

        // Extract unique dates with requests
        const dates = new Set(data.map(b => b.booking_date));
        setRequestDates(dates);
      }
    };

    fetchPendingRequests();

    const fetchGuestListRequests = async () => {
      const { data, error } = await supabase
        .from("guest_list_entries")
        .select("*")
        .eq("venue_id", activeVenueId)
        .eq("status", "pending")
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Error fetching guest list requests:", error);
        return;
      }

      const requests: GuestListRequest[] = (data || []).map((entry: any) => ({
        id: entry.id,
        guestName: entry.guest_name,
        guestPhone: "",
        guestEmail: "",
        listName: "General Guest List",
        plusGuests: entry.plus_guests || 0,
        listType: String(entry.list_type || "standard").toUpperCase(),
        eventDate: entry.event_date,
        notes: entry.notes || undefined,
        requestedAt: format(new Date(entry.added_at), "yyyy-MM-dd HH:mm"),
      }));
      setGuestListRequests(requests);
    };

    // Fetch available guest lists (recurring + one-day) for syncing accepted requests
    const fetchGuestLists = async () => {
      const [{ data: recurring }, { data: oneDay }] = await Promise.all([
        supabase.from("recurring_guest_lists").select("id, name").eq("venue_id", activeVenueId).eq("is_active", true),
        supabase.from("one_day_guest_lists").select("id, name").eq("venue_id", activeVenueId).eq("is_active", true),
      ]);
      const lists: {id: string; name: string; type: string}[] = [];
      if (recurring) lists.push(...recurring.map(l => ({ ...l, type: "recurring" })));
      if (oneDay) lists.push(...oneDay.map(l => ({ ...l, type: "oneday" })));
      setGuestLists(lists);
    };
    fetchGuestListRequests();
    fetchGuestLists();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("pending-requests")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "table_bookings",
        filter: "status=eq.pending"
      }, () => fetchPendingRequests())
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "guest_list_entries",
        filter: `venue_id=eq.${activeVenueId}`
      }, () => fetchGuestListRequests())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeVenueId]);

  const [selectedTableRequest, setSelectedTableRequest] = useState<BookingRequest | null>(null);

  const handleGuestClick = (request: BookingRequest | GuestListRequest) => {
    if (mode === "admin") {
      navigate(`/admin/guest/${request.id}`);
    } else {
      const isGuestListRequest = 'listName' in request;
      
      // Store request for modal
      if (isGuestListRequest) {
        setSelectedGuestListRequest(request as GuestListRequest);
        setSelectedTableRequest(null);
      } else {
        setSelectedTableRequest(request as BookingRequest);
        setSelectedGuestListRequest(null);
      }
      
      setSelectedGuest({
        id: request.id,
        guestId: `USR-${request.id.slice(0, 3).toUpperCase()}`,
        name: request.guestName,
        email: request.guestEmail,
        phone: request.guestPhone,
        loyaltyLevel: 'gold',
        automaticRating: 4.5,
        personnelRating: 4.2,
        totalVisits: 12,
        totalSpend: 15000,
        avgSpend: 1250,
        avgTip: 5,
        about: (request as BookingRequest).notes || (request as GuestListRequest).notes || "Guest profile",
        instagramHandle: `@${request.guestName.toLowerCase().replace(' ', '_')}`,
        nitewaysVisits: 48,
        nitewaysAvgTip: 4,
        nitewaysAvgBill: 980,
      });
      setIsProfileOpen(true);
    }
  };

  const handleAcceptTable = async (id: string) => {
    try {
      // Get booking details first
      const { data: bookingData } = await supabase
        .from("table_bookings")
        .select("*, venues:venue_id(name)")
        .eq("id", id)
        .single();

      // Update booking status to confirmed
      const { error } = await supabase
        .from("table_bookings")
        .update({ status: "confirmed" })
        .eq("id", id);

      if (error) throw error;

      // Send notification to user
      if (bookingData) {
        try {
          await supabase.functions.invoke("booking-notification", {
            body: {
              bookingId: id,
              status: "confirmed",
              guestEmail: bookingData.guest_email,
              guestName: bookingData.guest_name,
              venueName: bookingData.venues?.name || "Venue",
              tableNumber: bookingData.table_number,
              bookingDate: bookingData.booking_date,
              bookingTime: bookingData.booking_time,
            },
          });
        } catch (notifError) {
          console.warn("Notification failed but booking was confirmed:", notifError);
        }
      }

      setTableRequests(prev => prev.filter(r => r.id !== id));
      toast.success("Table booking request accepted and moved to bookings");
    } catch (error) {
      console.error("Error accepting booking:", error);
      toast.error("Failed to accept booking request");
    }
  };

  const handleDeclineTable = async (id: string) => {
    try {
      // Get booking details first
      const { data: bookingData } = await supabase
        .from("table_bookings")
        .select("*, venues:venue_id(name)")
        .eq("id", id)
        .single();

      // Update to cancelled instead of deleting (so user sees it in their cancelled bookings)
      const { error } = await supabase
        .from("table_bookings")
        .update({ status: "declined" })
        .eq("id", id);

      if (error) throw error;

      // Send notification to user
      if (bookingData) {
        try {
          await supabase.functions.invoke("booking-notification", {
            body: {
              bookingId: id,
              status: "declined",
              guestEmail: bookingData.guest_email,
              guestName: bookingData.guest_name,
              venueName: bookingData.venues?.name || "Venue",
              tableNumber: bookingData.table_number,
              bookingDate: bookingData.booking_date,
              bookingTime: bookingData.booking_time,
            },
          });
        } catch (notifError) {
          console.warn("Notification failed but booking was declined:", notifError);
        }
      }

      setTableRequests(prev => prev.filter(r => r.id !== id));
      toast.error("Table booking request declined");
    } catch (error) {
      console.error("Error declining booking:", error);
      toast.error("Failed to decline booking request");
    }
  };

  const handleAcceptGuestList = async (id: string) => {
    try {
      // Find the request
      const request = guestListRequests.find(r => r.id === id);
      if (!request) return;

      // Find matching guest list by name
      const targetList = guestLists.find(l => l.name === request.listName);
      const guestType = request.listType.toLowerCase();
      
      if (targetList) {
        // Add guest to the appropriate list based on type
        if (targetList.type === "recurring") {
          const { error } = await supabase.from("recurring_list_guests").insert({
            recurring_list_id: targetList.id,
            guest_name: request.guestName,
            guest_type: guestType,
            plus_guests: request.plusGuests,
            paying_guests: 0,
            added_by: "Request",
            notes: request.notes || null,
            checked_in: false,
            checked_in_count: 0,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("one_day_list_guests").insert({
            list_id: targetList.id,
            guest_name: request.guestName,
            guest_type: guestType,
            plus_guests: request.plusGuests,
            paying_guests: 0,
            added_by: "Request",
            notes: request.notes || null,
            checked_in: false,
            checked_in_count: 0,
          });
          if (error) throw error;
        }
        toast.success(`Guest added to ${request.listName}`);
      } else {
        toast.success("Guest list request accepted");
      }

      const { error: statusError } = await supabase
        .from("guest_list_entries")
        .update({ status: "approved" })
        .eq("id", id);
      if (statusError) throw statusError;

      setGuestListRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Error accepting guest list request:", error);
      toast.error("Failed to accept request");
    }
  };

  const handleDeclineGuestList = async (id: string) => {
    const { error } = await supabase
      .from("guest_list_entries")
      .update({ status: "declined" })
      .eq("id", id);

    if (error) {
      console.error("Error declining guest list request:", error);
      toast.error("Failed to decline request");
      return;
    }

    setGuestListRequests(prev => prev.filter(r => r.id !== id));
    toast.error("Guest list request declined");
  };

  // Filter by selected date for table requests
  const filteredTableRequests = tableRequests.filter(request => {
    const matchesSearch = request.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.table.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = request.date === format(date, "yyyy-MM-dd");
    return matchesSearch && matchesDate;
  });

  const filteredGuestListRequests = guestListRequests.filter(request => {
    const matchesSearch = request.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.listName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesList = guestListFilter === "all" || request.listName === guestListFilter;
    return matchesSearch && matchesList;
  });

  // Custom day content for calendar to show dots on dates with requests
  const renderDayContent = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const hasRequests = requestDates.has(dateStr);
    
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {day.getDate()}
        {hasRequests && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gold rounded-full" />
        )}
      </div>
    );
  };

  return (
    <AdminLayout title="Booking Requests" subtitle="Review and manage pending requests">
      <div className="space-y-3 pb-20 md:pb-0">
        {/* Stats */}
        {!isMobile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Table Requests</p>
              <p className="text-2xl font-bold text-gold">{tableRequests.length}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Guest List Requests</p>
              <p className="text-2xl font-bold text-teal">{guestListRequests.length}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
              <p className="text-sm text-muted-foreground">Potential Revenue</p>
              <p className="text-2xl font-bold text-coral">${tableRequests.reduce((sum, r) => sum + r.price, 0).toLocaleString()}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
              <p className="text-sm text-muted-foreground">VIP Requests</p>
              <p className="text-2xl font-bold text-purple">{tableRequests.filter(r => r.table.includes('VIP')).length + guestListRequests.filter(r => r.listType === 'VIP').length}</p>
            </motion.div>
          </div>
        )}

        {/* Filters - Search, Filter, Date */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={isMobile ? "" : "glass-card p-3"}
        >
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === "tables" ? "Search by guest name or table..." : "Search by guest name or list..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              {activeTab === "tables" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 flex-1 md:flex-none" data-no-swipe>
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
                      components={{
                        DayContent: ({ date: dayDate }) => renderDayContent(dayDate)
                      }}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Select value={guestListFilter} onValueChange={setGuestListFilter}>
                  <SelectTrigger className={isMobile ? "flex-1" : "w-48"}>
                    <SelectValue placeholder="Filter by list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guest Lists</SelectItem>
                    {guestLists.map(list => (
                      <SelectItem key={list.id} value={list.name}>{list.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 -mt-1"
        >
          <Button
            variant={activeTab === "tables" ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2",
              activeTab === "tables" ? "bg-primary text-primary-foreground" : ""
            )}
            onClick={() => setActiveTab("tables")}
          >
            <LayoutGrid className="w-4 h-4" />
            Tables
            <Badge variant="secondary" className="ml-1">{tableRequests.length}</Badge>
          </Button>
          <Button
            variant={activeTab === "guestlists" ? "default" : "outline"}
            className={cn(
              "flex-1 gap-2",
              activeTab === "guestlists" ? "bg-primary text-primary-foreground" : ""
            )}
            onClick={() => setActiveTab("guestlists")}
          >
            <List className="w-4 h-4" />
            Guest Lists
            <Badge variant="secondary" className="ml-1">{guestListRequests.length}</Badge>
          </Button>
        </motion.div>

        {/* Table Requests Tab */}
        {activeTab === "tables" && (
          isMobile ? (
            <div className="space-y-3">
              {filteredTableRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No pending requests for {format(date, "MMMM d, yyyy")}</p>
                </div>
              ) : (
                filteredTableRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="p-4 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <button 
                        onClick={() => handleGuestClick(request)}
                        className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                      >
                        {request.guestName}
                      </button>
                      <Badge variant="outline" className="font-mono text-xs">
                        {request.table}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{request.guests} guests</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{request.time}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        <span>${request.price}</span>
                      </div>
                    </div>

                    {request.notes && (
                      <p className="text-xs text-muted-foreground mb-3 truncate">{request.notes}</p>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 gap-1 text-teal border-teal/30 hover:bg-teal/10"
                        onClick={() => handleAcceptTable(request.id)}
                        data-no-swipe
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1 gap-1 text-coral border-coral/30 hover:bg-coral/10"
                        onClick={() => handleDeclineTable(request.id)}
                        data-no-swipe
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card overflow-hidden"
            >
              {filteredTableRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No pending requests for {format(date, "MMMM d, yyyy")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead>Guest</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Party Size</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTableRequests.map((request, index) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="border-border/50 hover:bg-muted/30"
                      >
                        <TableCell>
                          <button 
                            onClick={() => handleGuestClick(request)}
                            className="font-medium hover:text-primary transition-colors cursor-pointer text-left"
                          >
                            {request.guestName}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm">{request.guestPhone}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {request.table}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            {request.guests}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            {request.time}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">${request.price.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <span className="truncate text-sm text-muted-foreground">{request.notes || "—"}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {request.requestedAt}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1 text-teal border-teal/30 hover:bg-teal/10"
                              onClick={() => handleAcceptTable(request.id)}
                            >
                              <Check className="w-4 h-4" />
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1 text-coral border-coral/30 hover:bg-coral/10"
                              onClick={() => handleDeclineTable(request.id)}
                            >
                              <X className="w-4 h-4" />
                              Decline
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </motion.div>
          )
        )}

        {/* Guest List Requests Tab */}
        {activeTab === "guestlists" && (
          isMobile ? (
            <div className="space-y-3">
              {filteredGuestListRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="p-4 bg-muted/20 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <button 
                      onClick={() => handleGuestClick(request)}
                      className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                    >
                      {request.guestName}
                    </button>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      request.listType === "VIP" ? "bg-coral/20 text-coral border-coral/30" 
                        : request.listType === "AA" ? "bg-gold/20 text-gold border-gold/30" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {request.listType}
                    </Badge>
                  </div>
                  
                  {/* Guest List Details - simplified without box */}
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Guest List:</span>
                      <span className="font-medium">{request.listName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Guests:</span>
                      <span className="font-medium">{1 + request.plusGuests} (+{request.plusGuests})</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{request.eventDate}</span>
                    </div>
                  </div>

                  {request.notes && (
                    <p className="text-xs text-muted-foreground mb-3 truncate">{request.notes}</p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 gap-1 text-teal border-teal/30 hover:bg-teal/10"
                      onClick={() => handleAcceptGuestList(request.id)}
                      data-no-swipe
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 gap-1 text-coral border-coral/30 hover:bg-coral/10"
                      onClick={() => handleDeclineGuestList(request.id)}
                      data-no-swipe
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Guest</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Guest List</TableHead>
                    <TableHead>Total Guests</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>List Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuestListRequests.map((request, index) => (
                    <motion.tr
                      key={request.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="border-border/50 hover:bg-muted/30"
                    >
                      <TableCell>
                        <button 
                          onClick={() => handleGuestClick(request)}
                          className="font-medium hover:text-primary transition-colors cursor-pointer text-left"
                        >
                          {request.guestName}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{request.guestPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium text-xs">
                          {request.listName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          {1 + request.plusGuests} (+{request.plusGuests})
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          {request.eventDate}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          request.listType === "VIP" ? "bg-coral/20 text-coral border-coral/30" 
                            : request.listType === "AA" ? "bg-gold/20 text-gold border-gold/30" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {request.listType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <span className="truncate text-sm text-muted-foreground">{request.notes || "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.requestedAt}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-1 text-teal border-teal/30 hover:bg-teal/10"
                            onClick={() => handleAcceptGuestList(request.id)}
                          >
                            <Check className="w-4 h-4" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="gap-1 text-coral border-coral/30 hover:bg-coral/10"
                            onClick={() => handleDeclineGuestList(request.id)}
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          )
        )}
      </div>

      {/* Guest Profile Modal */}
      <GuestProfileModal
        guest={selectedGuest}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        showRequestActions={true}
        bookingDetails={selectedTableRequest ? {
          table: selectedTableRequest.table,
          partySize: selectedTableRequest.guests,
          date: selectedTableRequest.date,
          time: selectedTableRequest.time,
          price: selectedTableRequest.price,
          notes: selectedTableRequest.notes,
        } : undefined}
        guestListDetails={selectedGuestListRequest ? {
          listName: selectedGuestListRequest.listName,
          plusGuests: selectedGuestListRequest.plusGuests,
          listType: selectedGuestListRequest.listType,
          eventDate: selectedGuestListRequest.eventDate,
          notes: selectedGuestListRequest.notes,
        } : undefined}
        onAccept={() => {
          if (selectedTableRequest) {
            handleAcceptTable(selectedTableRequest.id);
          } else if (selectedGuestListRequest) {
            handleAcceptGuestList(selectedGuestListRequest.id);
          }
          setIsProfileOpen(false);
        }}
        onDecline={() => {
          if (selectedTableRequest) {
            handleDeclineTable(selectedTableRequest.id);
          } else if (selectedGuestListRequest) {
            handleDeclineGuestList(selectedGuestListRequest.id);
          }
          setIsProfileOpen(false);
        }}
      />
    </AdminLayout>
  );
};

export default TableBookingRequests;

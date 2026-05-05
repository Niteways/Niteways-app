import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Users, Ticket, MapPin, Clock, DollarSign, Search, Filter, Download, Eye, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface DetailedVisit {
  id: string;
  guestName: string;
  guestId: string;
  venueName: string;
  venueId: string;
  visitDate: string;
  visitTime: string;
  checkInType: "table" | "guestlist" | "ticket" | "walk-in";
  spendAmount: number;
  tableNumber?: string;
  partySize?: number;
  status: string;
  notes?: string;
  promoter?: string;
}

interface DetailedBooking {
  id: string;
  bookingId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  venueName: string;
  venueId: string;
  date: string;
  time: string;
  type: "table" | "guestlist" | "ticket";
  status: "confirmed" | "completed" | "cancelled" | "no-show" | "pending";
  tableNumber?: string;
  partySize?: number;
  price?: number;
  ticketType?: string;
  eventName?: string;
  notes?: string;
  createdAt: string;
}

const typeIcons = {
  table: MapPin,
  guestlist: Users,
  ticket: Ticket,
  "walk-in": Users,
};

const typeLabels = {
  table: "Table Booking",
  guestlist: "Guest List",
  ticket: "Ticket",
  "walk-in": "Walk-in",
};

const statusColors = {
  confirmed: "bg-teal/20 text-teal",
  completed: "bg-green-500/20 text-green-500",
  cancelled: "bg-muted text-muted-foreground",
  "no-show": "bg-coral/20 text-coral",
  pending: "bg-gold/20 text-gold",
  active: "bg-teal/20 text-teal",
  checked_in: "bg-green-500/20 text-green-500",
};

export function AdminUserHistoryTabs() {
  const [visitSearch, setVisitSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [visits, setVisits] = useState<DetailedVisit[]>([]);
  const [bookings, setBookings] = useState<DetailedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real data from database
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch guest visits with venue info
        const { data: visitsData } = await supabase
          .from('guest_visits')
          .select('*, guests(name, guest_id), venues(name)')
          .order('visit_date', { ascending: false })
          .limit(100);

        if (visitsData) {
          setVisits(visitsData.map(v => ({
            id: v.id,
            guestName: v.guests?.name || "Unknown",
            guestId: v.guests?.guest_id || "",
            venueName: v.venues?.name || "Unknown Venue",
            venueId: v.venue_id,
            visitDate: new Date(v.visit_date).toLocaleDateString(),
            visitTime: new Date(v.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            checkInType: "walk-in" as const,
            spendAmount: v.spend_amount || 0,
            status: "completed",
            notes: v.notes,
          })));
        }

        // Fetch table bookings
        const { data: tableBookingsData } = await supabase
          .from('table_bookings')
          .select('*, guests(name, guest_id), venues(name)')
          .order('booking_date', { ascending: false })
          .limit(100);

        // Fetch guest list entries
        const { data: guestListData } = await supabase
          .from('guest_list_entries')
          .select('*, guests(name, guest_id), venues(name)')
          .order('event_date', { ascending: false })
          .limit(100);

        // Fetch ticket purchases
        const { data: ticketData } = await supabase
          .from('ticket_purchases')
          .select('*, guests(name, guest_id), venues(name)')
          .order('event_date', { ascending: false })
          .limit(100);

        // Combine all bookings
        const allBookings: DetailedBooking[] = [
          ...(tableBookingsData || []).map(b => ({
            id: b.id,
            bookingId: b.booking_id,
            guestName: b.guest_name || b.guests?.name || "Unknown",
            guestEmail: b.guest_email,
            guestPhone: b.guest_phone,
            venueName: b.venues?.name || "Unknown",
            venueId: b.venue_id,
            date: b.booking_date,
            time: b.booking_time,
            type: "table" as const,
            status: b.status as DetailedBooking["status"],
            tableNumber: b.table_number,
            partySize: b.party_size,
            price: b.price,
            notes: b.notes,
            createdAt: b.created_at,
          })),
          ...(guestListData || []).map(g => ({
            id: g.id,
            bookingId: `GL-${g.id.substring(0, 8)}`,
            guestName: g.guest_name || g.guests?.name || "Unknown",
            venueName: g.venues?.name || "Unknown",
            venueId: g.venue_id,
            date: g.event_date,
            time: "",
            type: "guestlist" as const,
            status: g.status as DetailedBooking["status"],
            partySize: (g.plus_guests || 0) + 1,
            notes: g.notes,
            createdAt: g.added_at,
          })),
          ...(ticketData || []).map(t => ({
            id: t.id,
            bookingId: t.ticket_id,
            guestName: t.guest_name || t.guests?.name || "Unknown",
            guestEmail: t.guest_email,
            venueName: t.venues?.name || "Unknown",
            venueId: t.venue_id,
            date: t.event_date,
            time: "",
            type: "ticket" as const,
            status: t.status as DetailedBooking["status"],
            price: t.price * (t.quantity || 1),
            eventName: t.event_name,
            ticketType: t.ticket_type,
            partySize: t.quantity,
            createdAt: t.created_at,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setBookings(allBookings);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime updates for table_bookings
    const channel = supabase
      .channel('admin-history-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_bookings',
        },
        () => {
          // Refetch data when any booking changes
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_visits',
        },
        () => {
          // Refetch data when any visit changes
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get unique venues for filter
  const uniqueVenues = [...new Set([...visits.map(v => v.venueName), ...bookings.map(b => b.venueName)])].filter(Boolean);

  const filteredVisits = visits.filter((visit) => {
    const matchesSearch = visit.guestName.toLowerCase().includes(visitSearch.toLowerCase()) ||
      visit.venueName.toLowerCase().includes(visitSearch.toLowerCase());
    const matchesType = visitTypeFilter === "all" || visit.checkInType === visitTypeFilter;
    const matchesVenue = venueFilter === "all" || visit.venueName === venueFilter;
    return matchesSearch && matchesType && matchesVenue;
  });

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = booking.guestName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      booking.venueName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      booking.bookingId.toLowerCase().includes(bookingSearch.toLowerCase());
    const matchesStatus = bookingStatusFilter === "all" || booking.status === bookingStatusFilter;
    const matchesVenue = venueFilter === "all" || booking.venueName === venueFilter;
    return matchesSearch && matchesStatus && matchesVenue;
  });

  const totalRevenue = filteredBookings
    .filter(b => (b.status === "completed" || b.status === "confirmed") && b.price)
    .reduce((sum, b) => sum + (b.price || 0), 0);

  const totalVisitSpend = filteredVisits.reduce((sum, v) => sum + v.spendAmount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="visits" className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="visits">Visit History ({filteredVisits.length})</TabsTrigger>
        <TabsTrigger value="bookings">Booking History ({filteredBookings.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="visits" className="mt-4 space-y-4">
        {/* Stats */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total Visits</p>
              <p className="text-xl font-bold">{filteredVisits.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spend</p>
              <p className="text-xl font-bold text-teal">${totalVisitSpend.toLocaleString()}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest or venue..."
              value={visitSearch}
              onChange={(e) => setVisitSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={visitTypeFilter} onValueChange={setVisitTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="guestlist">Guest List</SelectItem>
              <SelectItem value="ticket">Ticket</SelectItem>
              <SelectItem value="walk-in">Walk-in</SelectItem>
            </SelectContent>
          </Select>
          <Select value={venueFilter} onValueChange={setVenueFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {uniqueVenues.map(venue => (
                <SelectItem key={venue} value={venue}>{venue}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {filteredVisits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No visit history found
              </div>
            ) : (
              filteredVisits.map((visit) => {
                const TypeIcon = typeIcons[visit.checkInType];
                return (
                  <div 
                    key={visit.id}
                    className="flex items-start justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TypeIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{visit.guestName}</p>
                          <span className="text-xs font-mono text-muted-foreground">{visit.guestId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {visit.venueName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {visit.visitDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {visit.visitTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[visit.checkInType]}
                          </Badge>
                          {visit.tableNumber && (
                            <Badge variant="secondary" className="text-xs">
                              {visit.tableNumber}
                            </Badge>
                          )}
                          {visit.partySize && (
                            <span className="text-xs text-muted-foreground">
                              <Users className="w-3 h-3 inline mr-1" />
                              {visit.partySize} guests
                            </span>
                          )}
                        </div>
                        {visit.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{visit.notes}"</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-teal">${visit.spendAmount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">spend</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="bookings" className="mt-4 space-y-4">
        {/* Stats */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total Bookings</p>
              <p className="text-xl font-bold">{filteredBookings.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed Revenue</p>
              <p className="text-xl font-bold text-teal">${totalRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Confirmed</p>
              <p className="text-xl font-bold text-green-500">
                {filteredBookings.filter(b => b.status === "confirmed" || b.status === "completed").length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cancelled/No-show</p>
              <p className="text-xl font-bold text-coral">
                {filteredBookings.filter(b => b.status === "cancelled" || b.status === "no-show").length}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by guest, venue, or booking ID..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={bookingStatusFilter} onValueChange={setBookingStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no-show">No Show</SelectItem>
            </SelectContent>
          </Select>
          <Select value={venueFilter} onValueChange={setVenueFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {uniqueVenues.map(venue => (
                <SelectItem key={venue} value={venue}>{venue}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No booking history found
              </div>
            ) : (
              filteredBookings.map((booking) => {
                const TypeIcon = typeIcons[booking.type];
                return (
                  <div 
                    key={booking.id}
                    className="flex items-start justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TypeIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{booking.guestName}</p>
                          <Badge className={cn("text-xs", statusColors[booking.status] || statusColors.pending)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {booking.venueName}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{booking.bookingId}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {booking.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {booking.time}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[booking.type]}
                          </Badge>
                          {booking.tableNumber && (
                            <Badge variant="secondary" className="text-xs">
                              Table {booking.tableNumber}
                            </Badge>
                          )}
                          {booking.eventName && (
                            <Badge variant="secondary" className="text-xs">
                              {booking.eventName}
                            </Badge>
                          )}
                          {booking.ticketType && (
                            <Badge variant="secondary" className="text-xs">
                              {booking.ticketType}
                            </Badge>
                          )}
                          {booking.partySize && (
                            <span className="text-xs text-muted-foreground">
                              <Users className="w-3 h-3 inline mr-1" />
                              {booking.partySize} guests
                            </span>
                          )}
                        </div>
                        {(booking.guestEmail || booking.guestPhone) && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {booking.guestEmail && <span>{booking.guestEmail}</span>}
                            {booking.guestPhone && <span>{booking.guestPhone}</span>}
                          </div>
                        )}
                        {booking.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{booking.notes}"</p>
                        )}
                      </div>
                    </div>
                    {booking.price && (
                      <div className="text-right">
                        <p className="font-semibold">${booking.price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.type === 'ticket' ? 'ticket price' : 'min spend'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
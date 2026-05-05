import { useState } from "react";
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
import { Calendar, Users, Ticket, MapPin, Clock, DollarSign, Search, Filter, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisitHistoryItem {
  id: string;
  venueName: string;
  date: string;
  type: "table" | "guestlist" | "ticket";
  partySize?: number;
  tableNumber?: string;
  spendAmount?: number;
  checkInTime?: string;
  action: string;
}

interface BookingHistoryItem {
  id: string;
  bookingId: string;
  venueName: string;
  date: string;
  time: string;
  type: "table" | "guestlist" | "ticket";
  status: "confirmed" | "completed" | "cancelled" | "no-show" | "pending";
  tableNumber?: string;
  partySize?: number;
  price?: number;
  ticketType?: string;
  eventName?: string;
  guestName?: string;
}

// Extended mock data
const mockVisitHistory: VisitHistoryItem[] = [
  { id: "v1", venueName: "Skyline Lounge", date: "2024-12-18", type: "table", partySize: 4, tableNumber: "T12", spendAmount: 2500, checkInTime: "21:30", action: "Approved booking" },
  { id: "v2", venueName: "Skyline Lounge", date: "2024-12-17", type: "guestlist", partySize: 6, checkInTime: "22:00", action: "Added to guest list" },
  { id: "v3", venueName: "Brasserie Balzac", date: "2024-12-15", type: "table", partySize: 8, tableNumber: "VIP 3", spendAmount: 4800, checkInTime: "20:45", action: "Managed VIP booking" },
  { id: "v4", venueName: "Sky Lounge", date: "2024-12-12", type: "ticket", checkInTime: "23:15", action: "Scanned ticket" },
  { id: "v5", venueName: "Skyline Lounge", date: "2024-12-10", type: "table", partySize: 2, tableNumber: "T5", spendAmount: 1200, checkInTime: "21:00", action: "Check-in completed" },
  { id: "v6", venueName: "Bianchi Café", date: "2024-12-08", type: "guestlist", partySize: 4, checkInTime: "21:30", action: "VIP guest check-in" },
  { id: "v7", venueName: "Tako", date: "2024-12-05", type: "table", partySize: 6, tableNumber: "T8", spendAmount: 3200, checkInTime: "22:00", action: "Upgraded table" },
  { id: "v8", venueName: "Skyline Lounge", date: "2024-12-01", type: "table", partySize: 10, tableNumber: "VIP 1", spendAmount: 8500, checkInTime: "20:30", action: "Corporate event" },
];

const mockBookingHistory: BookingHistoryItem[] = [
  { id: "b1", bookingId: "BK-2024-1892", venueName: "Skyline Lounge", date: "2024-12-20", time: "21:00", type: "table", status: "confirmed", tableNumber: "VIP 2", partySize: 6, price: 5000, guestName: "Marcus Thompson" },
  { id: "b2", bookingId: "BK-2024-1756", venueName: "Skyline Lounge", date: "2024-12-18", time: "21:30", type: "table", status: "completed", tableNumber: "T12", partySize: 4, price: 2500, guestName: "Sarah Wilson" },
  { id: "b3", bookingId: "GL-2024-0812", venueName: "Brasserie Balzac", date: "2024-12-15", time: "22:00", type: "guestlist", status: "completed", partySize: 8, guestName: "Emily Chen" },
  { id: "b4", bookingId: "TK-2024-0389", venueName: "Tako", date: "2024-12-12", time: "23:00", type: "ticket", status: "completed", eventName: "Winter Party", ticketType: "VIP", price: 150, guestName: "James Rodriguez" },
  { id: "b5", bookingId: "BK-2024-1623", venueName: "Sky Lounge", date: "2024-12-10", time: "20:00", type: "table", status: "cancelled", tableNumber: "T5", partySize: 4, price: 3000, guestName: "Alex Martinez" },
  { id: "b6", bookingId: "BK-2024-1534", venueName: "Skyline Lounge", date: "2024-12-08", time: "21:00", type: "table", status: "no-show", tableNumber: "T10", partySize: 4, price: 2000, guestName: "Lisa Park" },
  { id: "b7", bookingId: "BK-2024-1445", venueName: "Bianchi Café", date: "2024-12-05", time: "20:30", type: "table", status: "completed", tableNumber: "T3", partySize: 6, price: 3500, guestName: "David Brown" },
  { id: "b8", bookingId: "BK-2024-1390", venueName: "Skyline Lounge", date: "2024-12-01", time: "19:30", type: "table", status: "pending", tableNumber: "VIP 1", partySize: 10, price: 8500, guestName: "Michelle Lee" },
];

const typeIcons = {
  table: MapPin,
  guestlist: Users,
  ticket: Ticket,
};

const typeLabels = {
  table: "Table",
  guestlist: "Guest List",
  ticket: "Ticket",
};

const statusColors = {
  confirmed: "bg-teal/20 text-teal",
  completed: "bg-green-500/20 text-green-500",
  cancelled: "bg-muted text-muted-foreground",
  "no-show": "bg-coral/20 text-coral",
  pending: "bg-gold/20 text-gold",
};

export function AdminHistoryTabs() {
  const [visitSearch, setVisitSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");

  const filteredVisits = mockVisitHistory.filter((visit) => {
    const matchesSearch = visit.venueName.toLowerCase().includes(visitSearch.toLowerCase()) ||
      visit.action.toLowerCase().includes(visitSearch.toLowerCase());
    const matchesType = visitTypeFilter === "all" || visit.type === visitTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredBookings = mockBookingHistory.filter((booking) => {
    const matchesSearch = booking.venueName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      booking.guestName?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      booking.bookingId.toLowerCase().includes(bookingSearch.toLowerCase());
    const matchesStatus = bookingStatusFilter === "all" || booking.status === bookingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = filteredBookings
    .filter(b => b.status === "completed" && b.price)
    .reduce((sum, b) => sum + (b.price || 0), 0);

  return (
    <Tabs defaultValue="visits" className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="visits">Activity History</TabsTrigger>
        <TabsTrigger value="bookings">Transaction History</TabsTrigger>
      </TabsList>
      
      <TabsContent value="visits" className="mt-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by venue or action..."
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
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-3">
            {filteredVisits.map((visit) => {
              const TypeIcon = typeIcons[visit.type];
              return (
                <div 
                  key={visit.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TypeIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{visit.venueName}</p>
                      <p className="text-sm text-muted-foreground">{visit.action}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(visit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {visit.checkInTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[visit.type]}
                        </Badge>
                        {visit.tableNumber && (
                          <Badge variant="secondary" className="text-xs">
                            {visit.tableNumber}
                          </Badge>
                        )}
                        {visit.partySize && (
                          <span className="text-xs text-muted-foreground">
                            <Users className="w-3 h-3 inline mr-1" />
                            {visit.partySize}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {visit.spendAmount && (
                    <div className="text-right">
                      <p className="font-semibold text-teal">{visit.spendAmount.toLocaleString()} kr</p>
                      <p className="text-xs text-muted-foreground">revenue</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="bookings" className="mt-4 space-y-4">
        {/* Stats */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
              <p className="text-xl font-bold">{filteredBookings.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed Revenue</p>
              <p className="text-xl font-bold text-teal">{totalRevenue.toLocaleString()} kr</p>
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
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {filteredBookings.map((booking) => {
              const TypeIcon = typeIcons[booking.type];
              return (
                <div 
                  key={booking.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TypeIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{booking.guestName || booking.venueName}</p>
                        <Badge className={cn("text-xs", statusColors[booking.status])}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{booking.venueName}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{booking.bookingId}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {booking.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {booking.tableNumber && (
                          <Badge variant="secondary" className="text-xs">
                            {booking.tableNumber}
                          </Badge>
                        )}
                        {booking.eventName && (
                          <Badge variant="secondary" className="text-xs">
                            {booking.eventName}
                          </Badge>
                        )}
                        {booking.partySize && (
                          <span className="text-xs text-muted-foreground">
                            <Users className="w-3 h-3 inline mr-1" />
                            {booking.partySize}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {booking.price && (
                    <div className="text-right">
                      <p className="font-semibold">{booking.price.toLocaleString()} kr</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.type === 'ticket' ? 'ticket price' : 'min spend'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}

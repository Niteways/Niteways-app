import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Users, Ticket, MapPin, Clock, DollarSign } from "lucide-react";
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
}

interface BookingHistoryItem {
  id: string;
  bookingId: string;
  venueName: string;
  date: string;
  time: string;
  type: "table" | "guestlist" | "ticket";
  status: "confirmed" | "completed" | "cancelled" | "no-show";
  tableNumber?: string;
  partySize?: number;
  price?: number;
  ticketType?: string;
  eventName?: string;
}

interface GuestHistoryTabsProps {
  guestId: string;
}

// Mock data for visit history
const mockVisitHistory: VisitHistoryItem[] = [
  { id: "v1", venueName: "Brasserie Balzac", date: "2024-01-15", type: "table", partySize: 4, tableNumber: "T12", spendAmount: 2500, checkInTime: "21:30" },
  { id: "v2", venueName: "Bianchi Café", date: "2024-01-10", type: "guestlist", partySize: 2, checkInTime: "22:00" },
  { id: "v3", venueName: "Tako", date: "2024-01-05", type: "ticket", checkInTime: "23:15" },
  { id: "v4", venueName: "Brasserie Balzac", date: "2024-01-02", type: "table", partySize: 6, tableNumber: "VIP 3", spendAmount: 4800, checkInTime: "20:45" },
  { id: "v5", venueName: "Sky Lounge", date: "2023-12-28", type: "guestlist", partySize: 3, checkInTime: "21:00" },
  { id: "v6", venueName: "Brasserie Balzac", date: "2023-12-22", type: "table", partySize: 4, tableNumber: "T8", spendAmount: 1950, checkInTime: "22:30" },
];

// Mock data for booking history
const mockBookingHistory: BookingHistoryItem[] = [
  { id: "b1", bookingId: "BK-2024-0892", venueName: "Brasserie Balzac", date: "2024-01-20", time: "21:00", type: "table", status: "confirmed", tableNumber: "VIP 2", partySize: 6, price: 5000 },
  { id: "b2", bookingId: "BK-2024-0756", venueName: "Brasserie Balzac", date: "2024-01-15", time: "21:30", type: "table", status: "completed", tableNumber: "T12", partySize: 4, price: 2500 },
  { id: "b3", bookingId: "GL-2024-0412", venueName: "Bianchi Café", date: "2024-01-10", time: "22:00", type: "guestlist", status: "completed", partySize: 2 },
  { id: "b4", bookingId: "TK-2024-0189", venueName: "Tako", date: "2024-01-05", time: "23:00", type: "ticket", status: "completed", eventName: "New Year Afterparty", ticketType: "VIP", price: 150 },
  { id: "b5", bookingId: "BK-2024-0623", venueName: "Sky Lounge", date: "2024-01-03", time: "20:00", type: "table", status: "cancelled", tableNumber: "T5", partySize: 4, price: 3000 },
  { id: "b6", bookingId: "BK-2023-8934", venueName: "Brasserie Balzac", date: "2023-12-30", time: "21:00", type: "table", status: "no-show", tableNumber: "T10", partySize: 4, price: 2000 },
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
};

export function GuestHistoryTabs({ guestId }: GuestHistoryTabsProps) {
  return (
    <Tabs defaultValue="visits" className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="visits">Visit History</TabsTrigger>
        <TabsTrigger value="bookings">Booking History</TabsTrigger>
      </TabsList>
      
      <TabsContent value="visits" className="mt-4">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {mockVisitHistory.map((visit) => {
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
                      <p className="text-xs text-muted-foreground">spent</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </TabsContent>
      
      <TabsContent value="bookings" className="mt-4">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {mockBookingHistory.map((booking) => {
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
                        <p className="font-medium">{booking.venueName}</p>
                        <Badge className={cn("text-xs", statusColors[booking.status])}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </div>
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

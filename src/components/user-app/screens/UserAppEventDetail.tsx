import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, MapPin, Music, Calendar as CalendarIcon, Users, Instagram, 
  Clock, Ticket, Loader2, Circle, Sofa, BookOpen, X, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Event } from "@/hooks/useEvents";
import { useVenueTables, VenueTable } from "@/hooks/useUserAppData";
import { useRealtimeSpecialDatePricing } from "@/hooks/useRealtimeSpecialDatePricing";
import { useFloorMapData } from "@/hooks/useFloorMapData";
import { UnifiedFloorMap, FloorMapTable } from "@/components/floor-map/UnifiedFloorMap";
import { format, addDays, isSameDay } from "date-fns";
import { VenueGalleryCarousel } from "../components/VenueGalleryCarousel";
import { TableBookingFlow } from "../components/TableBookingFlow";
import { TicketPurchaseFlow } from "../components/TicketPurchaseFlow";
import { TicketStubCard } from "../components/TicketStubCard";
import { GuestListSignup } from "../components/GuestListSignup";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";


interface UserAppEventDetailProps {
  event: Event;
  onBack: () => void;
}

type TabType = "tables" | "tickets" | "guestlist";

// Generate price level indicator
const getPriceLevel = (price?: number | null): string => {
  if (!price) return "$$";
  if (price < 50) return "$$";
  if (price < 100) return "$$$";
  if (price < 200) return "$$$$";
  return "$$$$$";
};

// Get event image
const getEventImage = (event: Event): string => {
  if (event.image_url) return event.image_url;
  if (event.venue?.gallery_images?.[0]) return event.venue.gallery_images[0];
  return "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&h=400&fit=crop";
};

export function UserAppEventDetail({ event, onBack }: UserAppEventDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tables");
  const [selectedDate, setSelectedDate] = useState(new Date(event.event_date));
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showTicketFlow, setShowTicketFlow] = useState(false);
  const [eventTicketTypes, setEventTicketTypes] = useState<any[]>([]);
  
  const { data: tables = [], isLoading: tablesLoading } = useVenueTables(event.venue_id);
  const { getPricingForDate } = useRealtimeSpecialDatePricing({ venueId: event.venue_id });
  const { elements: floorMapElements } = useFloorMapData({ 
    venueId: event.venue_id,
    date: format(selectedDate, "yyyy-MM-dd")
  });

  // Fetch event ticket types
  useEffect(() => {
    const fetchTicketTypes = async () => {
      const { data } = await supabase
        .from("events")
        .select("ticket_types")
        .eq("id", event.id)
        .single();
      
      if (data?.ticket_types && Array.isArray(data.ticket_types)) {
        setEventTicketTypes(data.ticket_types.map((t: any, idx: number) => ({
          id: t.id || `ticket-${idx}`,
          name: t.name || "General Admission",
          price: t.price || 0,
          available: t.available || 100,
          sold: t.sold || 0,
          description: t.description,
        })));
      }
    };
    fetchTicketTypes();
  }, [event.id]);

  const eventDate = new Date(event.event_date);
  const priceLevel = getPriceLevel(event.ticket_price);

  // Get event images - use event image or venue gallery
  const eventImages = event.image_url 
    ? [event.image_url, ...(event.venue?.gallery_images || [])]
    : event.venue?.gallery_images || [];

  const handleBookingSuccess = () => {
    toast.success("Table booked successfully!");
    setSelectedTable(null);
  };

  const handleTableSelect = (table: VenueTable) => {
    if (selectedTable?.id === table.id) {
      setSelectedTable(null);
    } else {
      setSelectedTable(table);
    }
  };

  // Get price for a table on the event date
  const getTablePrice = (table: VenueTable) => {
    const dateStr = format(eventDate, "yyyy-MM-dd");
    return getPricingForDate(dateStr, table.id, table.base_price);
  };

  const handleBookTable = () => {
    if (selectedTable) {
      setShowBookingFlow(true);
    }
  };

  // Separate VIP and regular tables for floor plan
  const vipTables = tables.filter(t => t.table_type === "vip" || t.label.toLowerCase().includes("vip"));
  const regularTables = tables.filter(t => t.table_type !== "vip" && !t.label.toLowerCase().includes("vip"));

  // Create a venue-like object for the booking flow
  const venueForBooking = {
    id: event.venue_id,
    name: event.venue?.name || "Venue",
    category: event.venue?.category || "Nightclub",
    status: "active",
    address: event.venue?.address || null,
    description: null,
    music_genre: null,
    opening_hours: null,
    city_id: null,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pb-8"
    >
      {/* Hero Image Gallery Carousel */}
      <div className="relative">
        <VenueGalleryCarousel 
          images={eventImages.length > 0 ? eventImages : [getEventImage(event)]}
          venueName={event.event_name}
          category={event.venue?.name || "Event"}
        />
        
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Event Info - Same layout as venue detail */}
      <div className="px-4 md:px-6 lg:px-8 pt-4 max-w-screen-lg mx-auto">
        {/* Venue Name (small) and Age Limit - Same row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{event.venue?.name || "Venue"}</span>
          </div>
          <div className="px-3 py-1 rounded-full border border-border text-muted-foreground text-xs font-medium">
            {(event as any).age_limit || 21}+
          </div>
        </div>
        
        {/* Event Name (large) */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{event.event_name}</h1>
        
        {/* Info Row - Price, Time */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-1">
          <span>{priceLevel}</span>
          {event.event_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {event.event_time}{(event as any).end_time ? ` - ${(event as any).end_time}` : ""}
            </span>
          )}
          {event.ticket_price && (
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5" />
              From €{event.ticket_price}
            </span>
          )}
        </div>

        {/* Music Genre Row */}
        {(event as any).music_genre && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Music className="w-3.5 h-3.5" />
            <span>{(event as any).music_genre}</span>
          </div>
        )}

        {/* Event Date Row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            {format(eventDate, "EEEE, MMMM d, yyyy")}
          </span>
        </div>

        {/* Custom Tags */}
        {(event as any).custom_tags && (event as any).custom_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {((event as any).custom_tags as string[]).map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium"
              >
                <Tag className="w-3 h-3" />
                <span>{tag}</span>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border my-4" />

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {event.description}
          </p>
        )}

        {/* Quick Action Buttons - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {event.venue?.address && (
            <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white transition-colors bg-black">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Location</span>
            </button>
          )}
          {event.venue && (
            <a 
              href={`https://instagram.com/${event.venue.name?.toLowerCase().replace(/\s+/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white transition-colors bg-black"
            >
              <Instagram className="w-4 h-4" />
              <span className="text-sm">Instagram</span>
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-5">
          {[
            { id: "tables" as const, label: "Tables", icon: Users },
            { id: "tickets" as const, label: "Tickets", icon: Ticket },
            { id: "guestlist" as const, label: "Guest List", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "text-white border-primary"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "tables" && (
          <div>
            {tablesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : tables.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-black rounded-xl border border-gray-700">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="font-medium">No tables available</p>
                <p className="text-sm mt-1">This event doesn't offer table reservations.</p>
              </div>
            ) : (
              <>
                {/* Floor Plan Visualization - Using UnifiedFloorMap */}
                <div className="mb-5">
                  <h3 className="text-white font-medium text-sm mb-3">Select a Table</h3>
                  <UnifiedFloorMap
                    elements={floorMapElements}
                    selectedTableId={selectedTable?.id}
                    onTableSelect={(table) => {
                      const venueTable = tables.find(t => t.id === table.id || t.label === table.label);
                      if (venueTable) {
                        handleTableSelect(venueTable);
                      }
                    }}
                    variant="user-app"
                    showActions={false}
                    getTablePrice={(table) => {
                      const venueTable = tables.find(t => t.id === table.id || t.label === table.label);
                      if (venueTable) {
                        return getTablePrice(venueTable);
                      }
                      return table.basePrice || 0;
                    }}
                  />
                </div>

                {/* Selected Table Info & Book Button - Now appears BELOW the floor map */}
                <AnimatePresence>
                  {selectedTable && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-4 bg-background border border-border rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-foreground font-semibold">{selectedTable.label}</h4>
                          <p className="text-sm text-muted-foreground">Capacity: {selectedTable.capacity} guests</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">€{getTablePrice(selectedTable)}</p>
                          <p className="text-xs text-muted-foreground">Min. spend</p>
                        </div>
                      </div>
                      <button
                        onClick={handleBookTable}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Book Table
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        )}

        {activeTab === "tickets" && (
          <div>
            {eventTicketTypes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-xl border border-border">
                <Ticket className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No tickets available</p>
                <p className="text-sm mt-1">This event doesn't offer ticket sales.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {eventTicketTypes.map((ticket) => {
                  const remaining = ticket.available - ticket.sold;
                  const isSoldOut = remaining <= 0;
                  
                  return (
                    <TicketStubCard
                      key={ticket.id}
                      ticket={{
                        id: ticket.id,
                        name: ticket.name,
                        price: ticket.price,
                        description: ticket.description || null,
                        type: "regular",
                        available: remaining,
                        soldOut: isSoldOut,
                      }}
                      selectedDate={eventDate}
                      onPurchase={(qty) => {
                        setShowTicketFlow(true);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "guestlist" && (
          <GuestListSignup
            eventId={event.id}
            eventDate={event.event_date}
            venueId={event.venue_id}
            venueName={event.venue?.name || "Venue"}
          />
        )}
      </div>

      {/* Booking Flow Modal */}
      <AnimatePresence>
        {showBookingFlow && selectedTable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-black border-t border-gray-700 rounded-t-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-black z-10">
                <h2 className="text-lg font-semibold text-white">Complete Booking</h2>
                <button
                  onClick={() => setShowBookingFlow(false)}
                  className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-4">
                <TableBookingFlow
                  venue={venueForBooking}
                  tables={tables}
                  preSelectedTable={selectedTable}
                  preSelectedDate={eventDate}
                  onSuccess={handleBookingSuccess}
                  onClose={() => setShowBookingFlow(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Purchase Flow */}
      <AnimatePresence>
        {showTicketFlow && eventTicketTypes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <TicketPurchaseFlow
              eventId={event.id}
              eventName={event.event_name}
              eventDate={event.event_date}
              venueId={event.venue_id}
              ticketTypes={eventTicketTypes}
              onClose={() => setShowTicketFlow(false)}
              onSuccess={() => {
                setShowTicketFlow(false);
                toast.success("Tickets purchased!");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

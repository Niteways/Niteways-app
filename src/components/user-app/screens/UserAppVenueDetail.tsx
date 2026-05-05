import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, MapPin, Music, Calendar as CalendarIcon, Users, Instagram, 
  Clock, Ticket, Loader2, Circle, Sofa, BookOpen, X, Shield, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Venue, useVenueTables, VenueTable } from "@/hooks/useUserAppData";
import { useRealtimeSpecialDatePricing } from "@/hooks/useRealtimeSpecialDatePricing";
import { useFloorMapData } from "@/hooks/useFloorMapData";
import { useVenueTicketTypes } from "@/hooks/useVenueTicketTypes";
import { UnifiedFloorMap, FloorMapTable } from "@/components/floor-map/UnifiedFloorMap";
import { format, addDays, isSameDay, getDay } from "date-fns";
import { VenueGalleryCarousel } from "../components/VenueGalleryCarousel";
import { TableBookingFlow } from "../components/TableBookingFlow";
import { TicketPurchaseFlow } from "../components/TicketPurchaseFlow";
import { TicketStubCard } from "../components/TicketStubCard";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
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

interface UserAppVenueDetailProps {
  venue: Venue;
  onBack: () => void;
}

type TabType = "tables" | "tickets" | "guestlist";

// Generate price level indicator
const getPriceLevel = (minSpend?: number | null): string => {
  if (!minSpend) return "$$";
  if (minSpend < 5000) return "$$";
  if (minSpend < 10000) return "$$$";
  if (minSpend < 20000) return "$$$$";
  return "$$$$$";
};

// Parse opening hours JSON to get hours for a specific day
const getOpeningHoursForDay = (openingHours: string | null, dayOfWeek: number): string | null => {
  if (!openingHours) return null;
  
  try {
    // Try to parse as JSON object with day-specific hours
    const parsed = JSON.parse(openingHours);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    if (parsed[dayName]) {
      return `${parsed[dayName].open} - ${parsed[dayName].close}`;
    }
    return null;
  } catch {
    // If not JSON, return as-is
    return openingHours;
  }
};

export function UserAppVenueDetail({ venue: initialVenue, onBack }: UserAppVenueDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tables");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [selectedTable, setSelectedTable] = useState<VenueTable | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showTicketPurchase, setShowTicketPurchase] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [venue, setVenue] = useState(initialVenue);
  
  const { data: tables = [], isLoading: tablesLoading } = useVenueTables(venue.id);
  const { getPricingForDate } = useRealtimeSpecialDatePricing({ venueId: venue.id });
  
  // Use the unified floor map data hook for consistent rendering
  const { elements: floorMapElements, isLoading: floorMapLoading, userAppZoom } = useFloorMapData({ 
    venueId: venue.id,
    date: format(selectedDate, "yyyy-MM-dd")
  });

  // Venue tickets with real-time sync (from venue_tickets table, not events)
  const { tickets, isLoading: ticketsLoading, hasTicketsForDate } = useVenueTicketTypes({
    venueId: venue.id,
    selectedDate,
  });

  // Real-time sync for venue data (age requirements, opening hours, etc.)
  useEffect(() => {
    const channel = supabase
      .channel(`venue-detail-${venue.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "venues",
        filter: `id=eq.${venue.id}`,
      }, async () => {
        const { data } = await supabase
          .from("venues")
          .select("*")
          .eq("id", venue.id)
          .single();
        if (data) {
          setVenue(data as Venue);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venue.id]);

  // Generate next 14 days for date selector dropdown
  const dateOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  }, []);

  const priceLevel = getPriceLevel(venue.min_spend_tables);

  // Get opening hours for selected date
  const selectedDayOfWeek = getDay(selectedDate);
  const openingHoursForDay = getOpeningHoursForDay(venue.opening_hours, selectedDayOfWeek);

  // Get age limit for selected date
  const getAgeForDay = (dayOfWeek: number): number => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    if (venue.age_requirements && venue.age_requirements[dayName]) {
      return venue.age_requirements[dayName];
    }
    return venue.age_limit || 21;
  };
  const ageForSelectedDay = getAgeForDay(selectedDayOfWeek);

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

  // Get price for a table on the selected date
  const getTablePrice = (table: VenueTable) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
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
          images={venue.gallery_images || []}
          venueName={venue.name}
          category={venue.category}
        />
        
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
      </div>

      {/* Venue Info - Matching reference design */}
      <div className="px-4 md:px-6 lg:px-8 pt-4 max-w-screen-lg mx-auto">
        {/* Category Badge and Age Limit - Same row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-teal flex items-center justify-center">
              <span className="text-[8px]">🌐</span>
            </div>
            <span className="text-sm text-gray-400">{venue.category}</span>
          </div>
          {(venue.age_limit || ageForSelectedDay) && (
            <div className="px-3 py-1 rounded-full border border-gray-700 text-gray-300 text-xs font-medium flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {ageForSelectedDay}+
            </div>
          )}
        </div>
        
        {/* Venue Name */}
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{venue.name}</h1>
        
        {/* Info Row - Price, Music, Hours */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-1">
          <span>{priceLevel}</span>
          {venue.music_genre && (
            <>
              <span className="flex items-center gap-1">
                <Music className="w-3.5 h-3.5" />
                {venue.music_genre}
              </span>
            </>
          )}
          {openingHoursForDay && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {openingHoursForDay}
            </span>
          )}
        </div>

        {/* Additional Info Row - Days & Dress Code */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
          {venue.opening_days && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              {venue.opening_days}
            </span>
          )}
          {(venue as any).dress_code && (
            <span className="flex items-center gap-1 text-amber-400">
              👔 {(venue as any).dress_code}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-4" />

        {/* Description */}
        {venue.description && (
          <p className="text-sm text-gray-300 leading-relaxed mb-5">
            {venue.description}
          </p>
        )}

        {/* Quick Action Buttons - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {venue.address && (
            <button className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white transition-colors bg-black">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Location</span>
            </button>
          )}
          <button 
            onClick={() => setShowMenuModal(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white transition-colors bg-black"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">Menu</span>
          </button>
          {venue.spotify_link && (
            <a 
              href={venue.spotify_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#1DB954] text-white hover:bg-[#1ed760] transition-colors"
            >
              <span className="text-sm font-medium">Listen on Spotify</span>
            </a>
          )}
          {venue.instagram_handle && (
            <a 
              href={`https://instagram.com/${venue.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white transition-colors bg-black"
            >
              <Instagram className="w-4 h-4" />
              <span className="text-sm">Instagram</span>
            </a>
          )}
        </div>

        {/* Date Selector - Calendar Popover */}
        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center justify-between w-full py-3 px-4 rounded-lg border border-gray-700 text-white hover:border-gray-600 transition-colors bg-black">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {isSameDay(selectedDate, new Date()) 
                      ? `Today, ${format(selectedDate, "d MMM")}` 
                      : format(selectedDate, "EEE, d MMM yyyy")}
                  </span>
                </div>
                <CalendarIcon className="w-4 h-4 text-gray-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 bg-gray-900 border-gray-700" 
              align="start"
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
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
              <div className="text-center py-12 text-gray-400 bg-gray-900/50 rounded-xl border border-gray-700">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="font-medium">No tables available</p>
                <p className="text-sm mt-1">This venue doesn't offer table reservations.</p>
              </div>
            ) : (
              <>
                {/* Floor Plan Visualization - Using UnifiedFloorMap for consistency */}
                <div className="mb-5">
                  <h3 className="text-white font-medium text-sm mb-3">Select a Table</h3>
                  <UnifiedFloorMap
                    elements={floorMapElements}
                    variant="user-app"
                    selectedTableId={selectedTable?.id || null}
                    onTableSelect={(table) => {
                      const venueTable = tables.find(t => t.id === table.id);
                      if (venueTable) {
                        handleTableSelect(venueTable);
                      }
                    }}
                    showActions={false}
                    userAppZoom={userAppZoom}
                    getTablePrice={(table) => {
                      const vt = tables.find(t => t.id === table.id);
                      return vt ? getTablePrice(vt) : table.basePrice || 0;
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
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : !hasTicketsForDate ? (
              <div className="text-center py-12 text-muted-foreground bg-background rounded-xl border border-border">
                <Ticket className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No tickets for this date</p>
                <p className="text-sm mt-1">
                  {isSameDay(selectedDate, new Date()) 
                    ? "Try selecting a future date to see events."
                    : "No events scheduled for this day."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <TicketStubCard
                    key={ticket.id}
                    ticket={ticket}
                    selectedDate={selectedDate}
                    onPurchase={(qty) => {
                      setSelectedTicket({ ...ticket, purchaseQuantity: qty });
                      setShowTicketPurchase(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "guestlist" && (
          <div className="text-center py-12 text-gray-400 bg-black rounded-xl border border-gray-700">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="font-medium">Guest list not available</p>
            <p className="text-sm mt-1">This venue doesn't offer guest list sign-ups.</p>
          </div>
        )}
      </div>

      {/* Menu Modal */}
      <Dialog open={showMenuModal} onOpenChange={setShowMenuModal}>
        <DialogContent className="max-w-lg bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Menu</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {venue.menu_url ? (
              <a
                href={venue.menu_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span className="font-medium">View Full Menu</span>
              </a>
            ) : (
              <div className="text-center text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p>Menu not available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                  venue={venue}
                  tables={tables}
                  preSelectedTable={selectedTable}
                  preSelectedDate={selectedDate}
                  onSuccess={handleBookingSuccess}
                  onClose={() => setShowBookingFlow(false)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket Purchase Modal */}
      <AnimatePresence>
        {showTicketPurchase && selectedTicket && (
          <TicketPurchaseFlow
            eventId={selectedTicket.eventId}
            eventName={selectedTicket.eventName}
            eventDate={selectedTicket.eventDate}
            venueId={venue.id}
            ticketTypes={[{
              id: selectedTicket.id,
              name: selectedTicket.ticketName,
              price: selectedTicket.price,
              available: selectedTicket.totalQuantity,
              sold: selectedTicket.totalQuantity - selectedTicket.available,
              description: selectedTicket.description,
            }]}
            onClose={() => {
              setShowTicketPurchase(false);
              setSelectedTicket(null);
            }}
            onSuccess={() => {
              setShowTicketPurchase(false);
              setSelectedTicket(null);
              toast.success("Ticket purchased successfully!");
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

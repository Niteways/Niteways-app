import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronDown, Loader2, Music2, Mic, Headphones, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { City } from "@/hooks/useUserAppData";
import { useEvents, useRealtimeEvents, Event } from "@/hooks/useEvents";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserNotificationUnreadCount } from "@/hooks/useUserNotificationUnreadCount";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LiquidGlassSearchBar } from "../components/LiquidGlassSearchBar";

interface UserAppEventsProps {
  cities: City[];
  selectedCity?: City;
  onCityChange: (cityId: string | undefined) => void;
  onEventClick?: (event: Event) => void;
  isLoading?: boolean;
}

// Default city images - fallback if no image_url in database
const getCityDefaultImage = (cityName: string): string => {
  const cityImages: Record<string, string> = {
    "Stockholm": "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=1200&h=400&fit=crop",
    "London": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&h=400&fit=crop",
    "Miami": "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=1200&h=400&fit=crop",
    "Barcelona": "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=1200&h=400&fit=crop",
    "Los Angeles": "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200&h=400&fit=crop",
  };
  return cityImages[cityName] || "https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=1200&h=400&fit=crop";
};

// Get event image - prioritize flyer/event image
const getEventImage = (event: Event): string => {
  // First priority: event's own image (flyer)
  if (event.image_url) return event.image_url;
  
  // Second priority: venue gallery
  if (event.venue?.gallery_images?.[0]) return event.venue.gallery_images[0];
  
  // Fallback: category-based default
  const categoryImages: Record<string, string> = {
    "Nightclub": "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&h=400&fit=crop",
    "Lounge": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop",
    "Beach Club": "https://images.unsplash.com/photo-1545128485-c400e7702746?w=800&h=400&fit=crop",
  };
  return categoryImages[event.venue?.category || "Nightclub"] || categoryImages["Nightclub"];
};

interface EventCardProps {
  event: Event;
  onClick?: () => void;
}

// Event card - compact full width single column style with half height
function EventCard({ event, onClick }: EventCardProps) {
  const eventDate = new Date(event.event_date);
  const eventImage = getEventImage(event);
  const genre = (event.music_genre || "").trim();
  const customTags = (event as any).custom_tags || [];

  const GenreIcon = (() => {
    const g = genre.toLowerCase();
    if (g.includes("hip") || g.includes("r&b") || g.includes("rap")) return Mic;
    if (g.includes("house") || g.includes("tech") || g.includes("edm")) return Headphones;
    return Music2;
  })();
  
  return (
    <button
      onClick={onClick}
      className="group w-full bg-muted/30 border border-border rounded-xl overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-primary/50 hover:border-primary/50 transition-colors"
    >
      {/* Half-height event image with full width */}
      {/* ~30% shorter than 2/1 */}
      <div className="relative aspect-[3/1] w-full">
        <img 
          src={eventImage}
          alt={event.event_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Date badge */}
        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
          <p className="text-[10px] font-semibold text-white">{format(eventDate, "EEE, MMM d")}</p>
        </div>

        {/* Genre tag (icon + text) aligned with date */}
        {genre ? (
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
            <GenreIcon className="w-3.5 h-3.5 text-white/80" />
            <p className="text-[10px] font-semibold text-white line-clamp-1">{genre}</p>
          </div>
        ) : null}
        
        {/* Price badge */}
        {event.ticket_price && (
          <div className="absolute top-10 right-2 px-2.5 py-1 rounded-lg bg-primary/90 backdrop-blur-sm">
            <p className="text-[10px] font-bold text-primary-foreground">€{event.ticket_price}</p>
          </div>
        )}

        {/* Custom Tags Row - below date badge */}
        {customTags.length > 0 && (
          <div className="absolute top-10 left-2 flex flex-wrap gap-1 max-w-[60%]">
            {customTags.slice(0, 2).map((tag: string) => (
              <div
                key={tag}
                className="px-2 py-0.5 rounded-md bg-primary/80 backdrop-blur-sm"
              >
                <p className="text-[9px] font-semibold text-primary-foreground">{tag}</p>
              </div>
            ))}
            {customTags.length > 2 && (
              <div className="px-2 py-0.5 rounded-md bg-muted/80 backdrop-blur-sm">
                <p className="text-[9px] font-medium text-white">+{customTags.length - 2}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h3 className="text-white font-bold text-base leading-tight line-clamp-1 mb-0.5">
            {event.event_name}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-gray-300">
            <span>{event.venue?.name}</span>
            <span>•</span>
            <span>{event.event_time || "22:00"}{(event as any).end_time ? ` - ${(event as any).end_time}` : ""}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function UserAppEvents({
  cities,
  selectedCity,
  onCityChange,
  onEventClick,
}: UserAppEventsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");

  const { profile } = useUserProfile();
  const { unreadCount } = useUserNotificationUnreadCount(profile.email);
  
  const { data: events = [], isLoading } = useEvents(selectedCity?.id);
  
  // Enable realtime sync for events
  useRealtimeEvents();

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.event_name.toLowerCase().includes(query) ||
      event.venue?.name.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      (event.music_genre || "").toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  // Collect both genres and custom tags as filter options
  const filterOptions = useMemo(() => {
    const genreSet = new Set<string>();
    const tagSet = new Set<string>();
    for (const e of events) {
      const g = (e.music_genre || "").trim();
      if (g) genreSet.add(g);
      const tags = (e as any).custom_tags || [];
      for (const t of tags) {
        if (t && typeof t === "string") tagSet.add(t.trim());
      }
    }
    const genres = Array.from(genreSet).sort((a, b) => a.localeCompare(b));
    const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    return { genres, tags, all: [...genres, ...tags.filter(t => !genreSet.has(t))] };
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (selectedGenre === "all") return filteredEvents;
    return filteredEvents.filter((e) => {
      const genre = (e.music_genre || "").trim();
      const tags: string[] = (e as any).custom_tags || [];
      return genre === selectedGenre || tags.includes(selectedGenre);
    });
  }, [filteredEvents, selectedGenre]);

  // All events - no grouping needed
  const upcomingEvents = visibleEvents;

  // Get city header image
  const cityHeaderImage = selectedCity?.image_url || getCityDefaultImage(selectedCity?.name || "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative"
    >
      {/* City Header Image - Extended to top */}
      {selectedCity && (
        <div className="absolute top-0 left-0 right-0 h-48 md:h-64 overflow-hidden z-0 -mt-14 md:-mt-16">
          <img 
            src={cityHeaderImage}
            alt={selectedCity.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black" />
        </div>
      )}

      <div className={cn(
        "relative z-10 px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-screen-2xl mx-auto",
        selectedCity && "pt-8"
      )}>
        {/* Header Section */}
        <div className="flex items-center justify-between mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                <span className="text-xl md:text-2xl font-bold">
                  {selectedCity?.name || "All Cities"}
                </span>
                <ChevronDown className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border-gray-700 min-w-[200px]">
              <DropdownMenuItem
                onClick={() => onCityChange(undefined)}
                className="text-gray-300 hover:text-white focus:text-white hover:bg-gray-800 focus:bg-gray-800"
              >
                All Cities
              </DropdownMenuItem>
              {cities.map((city) => (
                <DropdownMenuItem
                  key={city.id}
                  onClick={() => onCityChange(city.id)}
                  className="text-gray-300 hover:text-white focus:text-white hover:bg-gray-800 focus:bg-gray-800"
                >
                  {city.name}, {city.country}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button 
            className="relative p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => (window as any).__showNotifications?.()}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 ? (
              <Badge className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1.5 flex items-center justify-center text-[10px] bg-primary text-primary-foreground border-0">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            ) : null}
          </button>
        </div>

        {/* Search Bar - Liquid Glass Effect */}
        <div className="mb-6">
          <LiquidGlassSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search events..."
          />
        </div>

        {/* Genre & Tag filter chips */}
        {filterOptions.all.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <button
              onClick={() => setSelectedGenre("all")}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors",
                selectedGenre === "all"
                  ? "bg-primary text-primary-foreground border-primary/40"
                  : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40",
              )}
            >
              All
            </button>
            {filterOptions.all.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedGenre(opt)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors",
                  selectedGenre === opt
                    ? "bg-primary text-primary-foreground border-primary/40"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : null}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredEvents.length === 0 && (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchQuery ? `No events found for "${searchQuery}"` : "No upcoming events in this city."}
            </p>
          </div>
        )}

        {/* Events List - single column full width cards */}
        {!isLoading && filteredEvents.length > 0 && (
          <div className="space-y-6">
            {/* All Upcoming Events */}
            <section>
              <h2 className="text-base md:text-lg font-semibold text-white mb-3">
                All Upcoming Events 🎉
              </h2>
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onClick={() => onEventClick?.(event)} 
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </motion.div>
  );
}

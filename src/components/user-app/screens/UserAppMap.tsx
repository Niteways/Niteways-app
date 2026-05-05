import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Loader2, X, Clock, Music, ChevronRight, Calendar } from "lucide-react";
import { Venue } from "@/hooks/useUserAppData";
import { Event, useEvents } from "@/hooks/useEvents";
import { LiquidGlassSearchBar } from "../components/LiquidGlassSearchBar";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface UserAppMapProps {
  venues: Venue[];
  onVenueClick: (venue: Venue) => void;
  onEventClick?: (event: Event) => void;
}

// Cache for geocoded addresses to avoid re-fetching
const geocodeCache = new Map<string, [number, number]>();

// Geocode an address to get lat/lng with caching
async function geocodeAddress(address: string, token: string): Promise<[number, number] | null> {
  // Check cache first
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address)!;
  }
  
  try {
    // Clean address for better geocoding results
    const cleanAddress = address.trim();
    if (!cleanAddress) return null;
    
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanAddress)}.json?access_token=${token}&limit=1`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      const coords: [number, number] = [lng, lat];
      // Cache the result
      geocodeCache.set(address, coords);
      return coords;
    }
    return null;
  } catch (err) {
    console.error("Geocoding error for address:", address, err);
    return null;
  }
}

// Apply small offset to avoid marker overlap when venues share identical coordinates
function applyCollisionOffset(
  coords: [number, number],
  venueIndex: number,
  totalAtSameCoord: number
): [number, number] {
  if (totalAtSameCoord <= 1) return coords;
  
  // Spread markers in a circle around the original point
  const angle = (venueIndex / totalAtSameCoord) * 2 * Math.PI;
  const offsetDistance = 0.0003; // ~30 meters offset
  const offsetLng = Math.cos(angle) * offsetDistance;
  const offsetLat = Math.sin(angle) * offsetDistance;
  
  return [coords[0] + offsetLng, coords[1] + offsetLat];
}

// Get venue image
const getVenueImage = (venue: Venue): string => {
  if (venue.gallery_images?.[0]) return venue.gallery_images[0];
  return "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=200&fit=crop";
};

// Parse opening hours and get today's hours
const getTodayHours = (openingHours: string | null | undefined): string => {
  if (!openingHours) return "Hours not available";
  
  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(openingHours);
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = days[new Date().getDay()];
    
    if (parsed[today]) {
      const dayHours = parsed[today];
      if (dayHours.open && dayHours.close) {
        return `${dayHours.open} - ${dayHours.close}`;
      }
    }
    
    // Find next open day if today is closed
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (new Date().getDay() + i) % 7;
      const nextDay = days[nextDayIndex];
      if (parsed[nextDay]?.open && parsed[nextDay]?.close) {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return `${dayNames[nextDayIndex]}: ${parsed[nextDay].open} - ${parsed[nextDay].close}`;
      }
    }
    
    return "Closed today";
  } catch {
    // If not JSON, return as-is but truncate if too long
    if (openingHours.length > 25) {
      return openingHours.substring(0, 22) + "...";
    }
    return openingHours;
  }
};

// Category filter options
const categoryFilters = [
  { id: "all", label: "All" },
  { id: "Nightclub", label: "Nightclub" },
  { id: "event", label: "Events" },
];

// Full-width venue card component
function VenuePreviewCard({ venue, onSelect, onClose }: { venue: Venue; onSelect: () => void; onClose: () => void }) {
  const todayHours = getTodayHours(venue.opening_hours);
  const musicGenre = venue.music_genre || "";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute bottom-20 left-4 right-4 z-20 bg-background border border-border rounded-xl overflow-hidden shadow-2xl"
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
      >
        <X className="w-4 h-4 text-white" />
      </button>
      
      <div className="relative h-32">
        <img 
          src={getVenueImage(venue)}
          alt={venue.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>
      
      <div className="p-4 -mt-8 relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">{venue.category}</span>
          {venue.age_limit && (
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 border border-border rounded">
              {venue.age_limit}+
            </span>
          )}
        </div>
        
        <h3 className="text-foreground font-bold text-lg mb-2">{venue.name}</h3>
        
        {/* Music genre on separate line if present */}
        {musicGenre && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Music className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{musicGenre}</span>
          </div>
        )}
        
        {/* Hours on separate line */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{todayHours}</span>
        </div>
        
        <button
          onClick={onSelect}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-lg transition-colors font-medium"
        >
          View Venue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// Event preview card component
function EventPreviewCard({ event, onSelect, onClose }: { event: Event; onSelect: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute bottom-20 left-4 right-4 z-20 bg-background border border-yellow-500/30 rounded-xl overflow-hidden shadow-2xl"
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
      >
        <X className="w-4 h-4 text-white" />
      </button>
      
      <div className="relative h-32">
        <img 
          src={event.image_url || "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=200&fit=crop"}
          alt={event.event_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 rounded-full text-[10px] font-bold text-black">
          EVENT
        </div>
      </div>
      
      <div className="p-4 -mt-8 relative">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-3 h-3 text-yellow-500" />
          <span className="text-xs text-yellow-500">{new Date(event.event_date).toLocaleDateString()}</span>
          {event.event_time && (
            <span className="text-xs text-muted-foreground">• {event.event_time}</span>
          )}
        </div>
        
        <h3 className="text-foreground font-bold text-lg mb-2">{event.event_name}</h3>
        
        {event.venue && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.venue.name}</span>
          </div>
        )}
        
        {event.music_genre && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Music className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.music_genre}</span>
          </div>
        )}
        
        <button
          onClick={onSelect}
          className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black py-2.5 px-4 rounded-lg transition-colors font-medium"
        >
          View Event
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function UserAppMap({ venues, onVenueClick, onEventClick }: UserAppMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const eventMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [venueCoords, setVenueCoords] = useState<Map<string, [number, number]>>(new Map());
  const [eventCoords, setEventCoords] = useState<Map<string, [number, number]>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(Venue | Event)[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Fetch events
  const { data: events = [] } = useEvents();
  
  // Mapbox public token from env (set VITE_MAPBOX_ACCESS_TOKEN in Railway / .env — never commit real keys)
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? "";

  // Filter venues and events based on category
  const filteredVenues = useMemo(() => {
    // When "Events" is selected, don't show venues
    if (selectedCategory === "event") return [];
    if (selectedCategory === "all") return venues;
    return venues.filter(v => v.category === selectedCategory);
  }, [venues, selectedCategory]);

  const showEvents = selectedCategory === "all" || selectedCategory === "event";

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    
    // Search venues
    const matchedVenues = venues.filter(v => 
      v.name.toLowerCase().includes(query) ||
      v.category?.toLowerCase().includes(query) ||
      v.music_genre?.toLowerCase().includes(query)
    );
    
    // Search events
    const matchedEvents = events.filter(e => 
      e.event_name.toLowerCase().includes(query) ||
      e.venue?.name.toLowerCase().includes(query) ||
      e.music_genre?.toLowerCase().includes(query)
    );
    
    setSearchResults([...matchedVenues, ...matchedEvents].slice(0, 5));
  }, [searchQuery, venues, events]);

  // Handle search result selection
  const handleSearchResultSelect = (result: Venue | Event) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchFocused(false);
    
    // Check if it's an event
    if ('event_name' in result) {
      const event = result as Event;
      const coords = eventCoords.get(event.id);
      if (coords && map.current) {
        map.current.flyTo({
          center: coords,
          zoom: 16,
          duration: 1500,
        });
        setSelectedEvent(event);
        setSelectedVenue(null);
      }
    } else {
      // It's a venue
      const venue = result as Venue;
      const coords = venueCoords.get(venue.id);
      if (coords && map.current) {
        map.current.flyTo({
          center: coords,
          zoom: 16,
          duration: 1500,
        });
        setSelectedVenue(venue);
        setSelectedEvent(null);
      }
    }
  };

  // Get user's current location with watchPosition for real-time tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      // Default to Stockholm if geolocation not available
      setUserLocation([18.0686, 59.3293]);
      return;
    }

    // Initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.longitude, position.coords.latitude]);
      },
      (error) => {
        console.log("Geolocation error:", error.message);
        // Default to Stockholm if geolocation fails
        setUserLocation([18.0686, 59.3293]);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );

    // Watch position for real-time updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.longitude, position.coords.latitude]);
      },
      (error) => {
        console.log("Geolocation watch error:", error.message);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 30000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Geocode all venues once and persist coordinates
  useEffect(() => {
    if (!mapboxToken || venues.length === 0) return;

    const geocodeAllVenues = async () => {
      const newCoords = new Map<string, [number, number]>();
      
      for (const venue of venues) {
        if (!venue.address) continue;
        
        // Check cache first
        if (geocodeCache.has(venue.address)) {
          newCoords.set(venue.id, geocodeCache.get(venue.address)!);
          continue;
        }
        
        const coords = await geocodeAddress(venue.address, mapboxToken);
        if (coords) {
          newCoords.set(venue.id, coords);
        }
      }
      
      setVenueCoords(newCoords);
    };

    geocodeAllVenues();
  }, [venues, mapboxToken]);

  // Geocode events using venue addresses
  useEffect(() => {
    if (!mapboxToken || events.length === 0 || venues.length === 0) return;

    const geocodeEvents = async () => {
      const newCoords = new Map<string, [number, number]>();
      
      for (const event of events) {
        // Find the venue for this event
        const venue = venues.find(v => v.id === event.venue_id);
        if (!venue?.address) continue;
        
        // Use venue address for event location
        if (geocodeCache.has(venue.address)) {
          newCoords.set(event.id, geocodeCache.get(venue.address)!);
          continue;
        }
        
        const coords = await geocodeAddress(venue.address, mapboxToken);
        if (coords) {
          newCoords.set(event.id, coords);
        }
      }
      
      setEventCoords(newCoords);
    };

    geocodeEvents();
  }, [events, venues, mapboxToken]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    // Default center - Stockholm
    const defaultCenter: [number, number] = [18.0686, 59.3293];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      zoom: 12,
      center: userLocation || defaultCenter,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    map.current.on("load", () => {
      setIsLoading(false);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      eventMarkersRef.current.forEach((marker) => marker.remove());
      userMarkerRef.current?.remove();
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !userLocation || isLoading) return;

    // Remove existing user marker
    userMarkerRef.current?.remove();

    // Create user location marker with blue pulsing dot
    const userEl = document.createElement("div");
    userEl.innerHTML = `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="
          position: absolute;
          width: 24px;
          height: 24px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: #3B82F6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      </style>
    `;

    userMarkerRef.current = new mapboxgl.Marker({ element: userEl })
      .setLngLat(userLocation)
      .addTo(map.current);
  }, [userLocation, isLoading]);

  // Add venue markers using persisted geocoded coordinates with collision detection
  useEffect(() => {
    if (!map.current || !mapboxToken || isLoading || venueCoords.size === 0) return;

    // Clear existing venue markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoords = false;

    // Build collision groups: venues at identical coordinates
    const coordKey = (c: [number, number]) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;
    const collisionGroups = new Map<string, string[]>(); // key -> venue IDs
    filteredVenues.forEach((venue) => {
      const coords = venueCoords.get(venue.id);
      if (!coords) return;
      const key = coordKey(coords);
      if (!collisionGroups.has(key)) collisionGroups.set(key, []);
      collisionGroups.get(key)!.push(venue.id);
    });

    // Add markers for each venue at their geocoded position (with offset if colliding)
    for (const venue of filteredVenues) {
      const baseCoords = venueCoords.get(venue.id);
      if (!baseCoords) continue;

      const key = coordKey(baseCoords);
      const group = collisionGroups.get(key) || [venue.id];
      const indexInGroup = group.indexOf(venue.id);
      const coords = applyCollisionOffset(baseCoords, indexInGroup, group.length);

      const [lng, lat] = coords;
      hasValidCoords = true;
      bounds.extend(coords);

      // Create custom marker element - simple dot style
      const markerEl = document.createElement("div");
      markerEl.className = "venue-marker";
      markerEl.style.cssText = "position: absolute; z-index: 1; pointer-events: auto;";
      
      // Create inner container - simple dot
      const innerEl = document.createElement("div");
      innerEl.style.cssText = `
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #FF6B35, #FF8C61);
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      `;
      markerEl.appendChild(innerEl);

      markerEl.addEventListener("mouseenter", () => {
        innerEl.style.transform = "scale(1.3)";
        innerEl.style.boxShadow = "0 4px 12px rgba(255, 107, 53, 0.6)";
      });
      markerEl.addEventListener("mouseleave", () => {
        innerEl.style.transform = "scale(1)";
        innerEl.style.boxShadow = "0 2px 8px rgba(255, 107, 53, 0.4)";
      });
      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedVenue(venue);
        setSelectedEvent(null);
      });

      // Use "center" anchor for stable dot positioning during zoom
      const marker = new mapboxgl.Marker({ element: markerEl, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    }

    // Include user location in bounds if available
    if (userLocation) {
      bounds.extend(userLocation);
    }

    // Fit map to show all markers
    if (hasValidCoords && markersRef.current.length > 0) {
      map.current?.fitBounds(bounds, {
        padding: 60,
        maxZoom: 14,
      });
    }
  }, [filteredVenues, venueCoords, mapboxToken, isLoading, userLocation]);

  // Add event markers with yellow color
  useEffect(() => {
    if (!map.current || !mapboxToken || isLoading || eventCoords.size === 0 || !showEvents) {
      // Clear event markers if events should not be shown
      eventMarkersRef.current.forEach((marker) => marker.remove());
      eventMarkersRef.current = [];
      return;
    }

    // Clear existing event markers
    eventMarkersRef.current.forEach((marker) => marker.remove());
    eventMarkersRef.current = [];

    for (const event of events) {
      const coords = eventCoords.get(event.id);
      if (!coords) continue;

      const [lng, lat] = coords;
      
      // Apply small offset so event markers don't overlap venue markers
      const offsetLat = lat + 0.0002;

      // Create event marker with yellow dot styling
      const markerEl = document.createElement("div");
      markerEl.className = "event-marker";
      markerEl.style.cssText = "position: absolute; z-index: 2; pointer-events: auto;";
      
      const innerEl = document.createElement("div");
      innerEl.style.cssText = `
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #EAB308, #FDE047);
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(234, 179, 8, 0.4);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      `;
      markerEl.appendChild(innerEl);

      markerEl.addEventListener("mouseenter", () => {
        innerEl.style.transform = "scale(1.3)";
        innerEl.style.boxShadow = "0 4px 12px rgba(234, 179, 8, 0.6)";
      });
      markerEl.addEventListener("mouseleave", () => {
        innerEl.style.transform = "scale(1)";
        innerEl.style.boxShadow = "0 2px 8px rgba(234, 179, 8, 0.4)";
      });
      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setSelectedVenue(null);
      });

      const marker = new mapboxgl.Marker({ element: markerEl, anchor: "center" })
        .setLngLat([lng, offsetLat])
        .addTo(map.current!);

      eventMarkersRef.current.push(marker);
    }
  }, [events, eventCoords, mapboxToken, isLoading, showEvents]);

  const handleVenueSelect = () => {
    if (selectedVenue) {
      onVenueClick(selectedVenue);
      setSelectedVenue(null);
    }
  };

  const handleEventSelect = () => {
    if (selectedEvent && onEventClick) {
      onEventClick(selectedEvent);
      setSelectedEvent(null);
    }
  };

  if (!mapboxToken) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 flex flex-col items-center justify-center bg-background min-h-[400px]"
      >
        <Navigation className="w-12 h-12 text-primary mb-4" />
        <p className="text-muted-foreground mb-2">Map configuration needed</p>
        <p className="text-xs text-muted-foreground">Please configure Mapbox token</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col"
      style={{ top: 0, bottom: 0 }}
    >
      {/* Header area with NITEWAYS logo space */}
      <div className="absolute top-14 left-4 right-4 z-30 space-y-3">
        {/* Floating Search Bar with Liquid Glass Effect - positioned under header */}
        <LiquidGlassSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search venues, clubs, events..."
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          onClear={() => setSearchResults([])}
        />
        
        {/* Search Results Dropdown */}
        <AnimatePresence>
          {(isSearchFocused || searchResults.length > 0) && searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="overflow-hidden"
              style={{
                background: 'rgba(26, 26, 26, 0.95)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No results found
                </div>
              ) : (
                <div className="py-2">
                  {searchResults.map((result, index) => {
                    const isEvent = 'event_name' in result;
                    return (
                      <button
                        key={`${isEvent ? 'event' : 'venue'}-${result.id}`}
                        onClick={() => handleSearchResultSelect(result)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left"
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            background: isEvent 
                              ? 'linear-gradient(135deg, #EAB308, #FDE047)' 
                              : 'linear-gradient(135deg, #FF6B35, #FF8C61)',
                          }}
                        >
                          {isEvent ? (
                            <Calendar className="w-4 h-4 text-black" />
                          ) : (
                            <MapPin className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm font-medium truncate">
                            {isEvent ? (result as Event).event_name : (result as Venue).name}
                          </p>
                          <p className="text-muted-foreground text-xs truncate">
                            {isEvent 
                              ? `${(result as Event).venue?.name} • ${new Date((result as Event).event_date).toLocaleDateString()}`
                              : (result as Venue).category
                            }
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Filter Chips */}
        {!isSearchFocused && !searchQuery && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categoryFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedCategory(filter.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === filter.id
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "bg-background/80 backdrop-blur-lg text-foreground border border-border/50"
                }`}
                style={{
                  backdropFilter: selectedCategory === filter.id ? 'none' : 'blur(10px)',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Container - Full height */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Venue Preview Card */}
        <AnimatePresence>
          {selectedVenue && (
            <VenuePreviewCard
              venue={selectedVenue}
              onSelect={handleVenueSelect}
              onClose={() => setSelectedVenue(null)}
            />
          )}
        </AnimatePresence>

        {/* Event Preview Card */}
        <AnimatePresence>
          {selectedEvent && (
            <EventPreviewCard
              event={selectedEvent}
              onSelect={handleEventSelect}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

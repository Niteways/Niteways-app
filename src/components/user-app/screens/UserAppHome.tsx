import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Venue, City } from "@/hooks/useUserAppData";
import { VenueCard } from "../components/VenueCard";
import { VenueSectionSkeleton } from "../components/VenueCardSkeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useCitySections } from "@/hooks/useCitySections";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserNotificationUnreadCount } from "@/hooks/useUserNotificationUnreadCount";
import { Badge } from "@/components/ui/badge";
import { LiquidGlassSearchBar } from "../components/LiquidGlassSearchBar";
import { CitySelectorModal } from "../components/CitySelectorModal";

interface UserAppHomeProps {
  venues: Venue[];
  cities: City[];
  selectedCity?: City;
  onCityChange: (cityId: string | undefined) => void;
  onVenueClick: (venue: Venue) => void;
  isLoading: boolean;
}

interface AdvertisingCard {
  id: string;
  city_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  background_color: string;
  text_color: string;
  sort_order: number;
  is_active: boolean;
  position_after_section: string | null;
  card_size: string | null;
  card_mode: string | null;
  start_date: string | null;
  end_date: string | null;
}

// Check if an ad card should be shown based on date range
const isAdCardActive = (card: AdvertisingCard): boolean => {
  if (!card.is_active) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (card.start_date) {
    const startDate = new Date(card.start_date);
    if (today < startDate) return false;
  }
  
  if (card.end_date) {
    const endDate = new Date(card.end_date);
    endDate.setHours(23, 59, 59, 999);
    if (today > endDate) return false;
  }
  
  return true;
};

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

// Advertising Card Component with vertical size support (always full width)
function AdvertisingBanner({ card }: { card: AdvertisingCard }) {
  const handleClick = () => {
    if (card.link_url) {
      window.open(card.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Get height based on card_size (vertical sizing, always full width)
  const getHeight = () => {
    switch (card.card_size) {
      case 'small': return '80px';
      case 'medium': return '120px';
      case 'large': return '160px';
      case 'full': return '200px';
      default: return '120px';
    }
  };

  const isPhotoOnly = card.card_mode === 'photo';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-xl overflow-hidden transition-transform hover:scale-[1.02] w-full",
        card.link_url ? "cursor-pointer" : "cursor-default"
      )}
      onClick={handleClick}
      style={{
        backgroundColor: isPhotoOnly ? 'transparent' : card.background_color,
        color: card.text_color,
        height: getHeight(),
      }}
    >
      {card.image_url && (
        <img 
          src={card.image_url} 
          alt="" 
          className={cn(
            "w-full h-full object-cover",
            isPhotoOnly ? "rounded-xl" : "absolute inset-0 opacity-40"
          )}
        />
      )}
      {!isPhotoOnly && (
        <div className="relative z-10 p-4 h-full flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{card.title}</h3>
            {card.subtitle && <p className="text-sm opacity-90">{card.subtitle}</p>}
          </div>
          {card.link_url && (
            <ExternalLink className="w-5 h-5 opacity-70" />
          )}
        </div>
      )}
    </motion.div>
  );
}

// Horizontal scrolling venue section component
function VenueScrollSection({ 
  title, 
  venues, 
  onVenueClick 
}: { 
  title: string; 
  venues: Venue[]; 
  onVenueClick: (venue: Venue) => void;
}) {
  if (venues.length === 0) return null;
  
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base md:text-lg font-semibold text-white">
          {title}
        </h2>
        <span className="text-xs text-gray-500">{venues.length}</span>
      </div>
      {/* Horizontal scrolling container */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {venues.map((venue) => (
          <div key={venue.id} className="flex-shrink-0 w-44">
            <VenueCard
              venue={venue}
              onClick={() => onVenueClick(venue)}
              horizontal={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function UserAppHome({
  venues,
  cities,
  selectedCity,
  onCityChange,
  onVenueClick,
  isLoading,
}: UserAppHomeProps) {
  const isMobile = useIsMobile();
  const { profile } = useUserProfile();
  const { unreadCount } = useUserNotificationUnreadCount(profile.email);
  const [searchQuery, setSearchQuery] = useState("");
  const [advertisingCards, setAdvertisingCards] = useState<AdvertisingCard[]>([]);
  const [showCitySelector, setShowCitySelector] = useState(false);
  
  // Fetch custom sections for the selected city
  const { data: citySections = [], isLoading: sectionsLoading } = useCitySections(selectedCity?.id);

  // Fetch advertising cards for the selected city
  useEffect(() => {
    if (!selectedCity?.id) {
      setAdvertisingCards([]);
      return;
    }

    const fetchAdvertisingCards = async () => {
      const { data, error } = await supabase
        .from('city_advertising_cards')
        .select('*')
        .eq('city_id', selectedCity.id)
        .eq('is_active', true)
        .order('sort_order');

      if (!error && data) {
        setAdvertisingCards(data);
      }
    };

    fetchAdvertisingCards();
  }, [selectedCity?.id]);

  // Filter venues based on search query
  const filteredVenues = useMemo(() => {
    if (!searchQuery.trim()) return venues;
    const query = searchQuery.toLowerCase();
    return venues.filter(venue => 
      venue.name.toLowerCase().includes(query) ||
      venue.category.toLowerCase().includes(query) ||
      venue.music_genre?.toLowerCase().includes(query) ||
      venue.city_name?.toLowerCase().includes(query)
    );
  }, [venues, searchQuery]);

  // Group venues by category for fallback sections
  const nightclubs = filteredVenues.filter(v => v.category === "Nightclub");
  const lounges = filteredVenues.filter(v => v.category === "Lounge");
  const beachClubs = filteredVenues.filter(v => v.category === "Beach Club");

  // Get city header image - prefer database value, fallback to default
  const cityHeaderImage = selectedCity?.image_url || getCityDefaultImage(selectedCity?.name || "");
  
  // Get image position from city settings
  const imagePositionX = (selectedCity as any)?.image_position_x ?? 50;
  const imagePositionY = (selectedCity as any)?.image_position_y ?? 50;
  const imageZoom = (selectedCity as any)?.image_zoom ?? 100;

  // Build sections from custom city sections or use defaults
  const sections = useMemo(() => {
    if (citySections && citySections.length > 0) {
      return citySections
        .filter((s: any) => s.is_active)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((section: any) => ({
          id: section.id,
          title: section.title,
          venues: section.venues?.map((sv: any) => 
            filteredVenues.find(v => v.id === sv.venue_id)
          ).filter(Boolean) || []
        }));
    }
    
    // Default sections
    const defaultSections = [];
    if (filteredVenues.length > 0) {
      defaultSections.push({
        id: 'popular',
        title: selectedCity ? `Popular in ${selectedCity.name} 🔥` : "Popular Venues 🔥",
        venues: filteredVenues.slice(0, 10)
      });
    }
    if (nightclubs.length > 0) {
      defaultSections.push({ id: 'nightclubs', title: "Nightclubs 🎭", venues: nightclubs });
    }
    if (lounges.length > 0) {
      defaultSections.push({ id: 'lounges', title: "Lounges 🍸", venues: lounges });
    }
    if (beachClubs.length > 0) {
      defaultSections.push({ id: 'beachclubs', title: "Beach Clubs 🏖️", venues: beachClubs });
    }
    return defaultSections;
  }, [citySections, filteredVenues, selectedCity, nightclubs, lounges, beachClubs]);

  // Filter active advertising cards by date range
  const activeAds = useMemo(() => {
    return advertisingCards.filter(isAdCardActive);
  }, [advertisingCards]);

  // Get advertising cards to show at top (no position_after_section)
  const topAds = activeAds.filter(card => !card.position_after_section);
  
  // Get advertising card for a specific section
  const getAdsAfterSection = (sectionId: string) => {
    return activeAds.filter(card => card.position_after_section === sectionId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative"
    >
      {/* City Header Image - Extended to top over header bar */}
      {selectedCity && (
        <div className="absolute top-0 left-0 right-0 h-48 md:h-64 overflow-hidden z-0 -mt-14 md:-mt-16">
          <img 
            src={cityHeaderImage}
            alt={selectedCity.name}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `${imagePositionX}% ${imagePositionY}%`,
              transform: `scale(${imageZoom / 100})`,
            }}
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
          <button 
            onClick={() => setShowCitySelector(true)}
            className="flex items-center gap-1.5 text-foreground hover:text-muted-foreground transition-colors"
          >
            <span className="text-xl md:text-2xl font-bold">
              {selectedCity?.name || "Select City"}
            </span>
            <ChevronDown className="w-5 h-5 text-muted-foreground mt-0.5" />
          </button>

          <button 
            onClick={() => (window as any).__showNotifications?.()}
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
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
            placeholder="What club are you looking for?"
          />
        </div>

        {/* Loading State - Skeleton Animation */}
        {(isLoading || sectionsLoading) && (
          <div className="space-y-5">
            <VenueSectionSkeleton count={4} />
            <VenueSectionSkeleton count={4} />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !sectionsLoading && filteredVenues.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400">
              {searchQuery ? `No venues found for "${searchQuery}"` : "No venues found in this city."}
            </p>
          </div>
        )}

        {/* Venues List - Horizontal Scroll Sections with Advertising Cards */}
        {!isLoading && !sectionsLoading && filteredVenues.length > 0 && (
          <div className="space-y-5">
            {/* Top advertising cards (no position specified) */}
            {topAds.map(card => (
              <AdvertisingBanner key={card.id} card={card} />
            ))}
            
            {sections.map((section, index) => (
              <div key={section.id || index}>
                <VenueScrollSection
                  title={section.title}
                  venues={section.venues as Venue[]}
                  onVenueClick={onVenueClick}
                />
                
                {/* Advertising cards after this section */}
                {section.id && getAdsAfterSection(section.id).map(card => (
                  <div key={card.id} className="mt-4">
                    <AdvertisingBanner card={card} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* City Selector Modal */}
      <CitySelectorModal
        isOpen={showCitySelector}
        onClose={() => setShowCitySelector(false)}
        cities={cities}
        selectedCity={selectedCity}
        onCitySelect={onCityChange}
      />
    </motion.div>
  );
}

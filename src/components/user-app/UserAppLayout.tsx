import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCities, useVenues, Venue, City } from "@/hooks/useUserAppData";
import { UserAppHome } from "./screens/UserAppHome";
import { UserAppVenueDetail } from "./screens/UserAppVenueDetail";
import { UserAppProfile } from "./screens/UserAppProfile";
import { UserAppMap } from "./screens/UserAppMap";
import { UserAppEvents } from "./screens/UserAppEvents";
import { UserAppEventDetail } from "./screens/UserAppEventDetail";
import { UserAppBookings } from "./screens/UserAppBookings";
import { UserAppFavorites } from "./screens/UserAppFavorites";
import { UserAppEditProfile } from "./screens/UserAppEditProfile";
import { UserAppNotifications } from "./screens/UserAppNotifications";
import { UserAppBottomNav } from "./UserAppBottomNav";
import { Event } from "@/hooks/useEvents";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserNotificationPush } from "@/hooks/useUserNotificationPush";

export type UserAppScreen = "home" | "events" | "venue" | "event-detail" | "profile" | "map" | "favorites" | "bookings" | "notifications";
type SubScreen = "edit-profile" | null;

const USER_APP_SCREEN_KEY = "user_app_screen";
const USER_APP_CITY_KEY = "user_app_city";

interface UserAppLayoutProps {
  onClose: () => void;
}

export function UserAppLayout({ onClose }: UserAppLayoutProps) {
  const isMobile = useIsMobile();
  const { profile } = useUserProfile();

  // Web push notifications (only if permission already granted)
  useUserNotificationPush(profile.email);
  
  // Expose notifications navigation globally for Bell icon
  useEffect(() => {
    (window as any).__showNotifications = () => setCurrentScreen("notifications");
    return () => {
      delete (window as any).__showNotifications;
    };
  }, []);
  
  // Persist screen state in localStorage - but exclude "venue" and "event-detail" since we don't persist selected items
  const [currentScreen, setCurrentScreen] = useState<UserAppScreen>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(USER_APP_SCREEN_KEY);
      if (saved && ["home", "events", "profile", "map", "favorites", "bookings"].includes(saved)) {
        return saved as UserAppScreen;
      }
    }
    return "home";
  });
  
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Persist city selection
  const [selectedCityId, setSelectedCityId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(USER_APP_CITY_KEY) || undefined;
    }
    return undefined;
  });
  
  const { data: cities = [], isLoading: citiesLoading } = useCities();
  const { data: venues = [], isLoading: venuesLoading } = useVenues(selectedCityId);

  // Save screen state to localStorage - but never save detail screens
  useEffect(() => {
    if (currentScreen !== "venue" && currentScreen !== "event-detail") {
      localStorage.setItem(USER_APP_SCREEN_KEY, currentScreen);
    }
  }, [currentScreen]);

  // Save city selection to localStorage
  useEffect(() => {
    if (selectedCityId) {
      localStorage.setItem(USER_APP_CITY_KEY, selectedCityId);
    } else {
      localStorage.removeItem(USER_APP_CITY_KEY);
    }
  }, [selectedCityId]);

  const handleVenueClick = (venue: Venue) => {
    setSelectedVenue(venue);
    setCurrentScreen("venue");
  };

  // Handle event click - navigate to event detail page
  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setCurrentScreen("event-detail");
  };

  const handleBack = () => {
    if (currentScreen === "venue") {
      setCurrentScreen("home");
      setSelectedVenue(null);
    } else if (currentScreen === "event-detail") {
      setCurrentScreen("events");
      setSelectedEvent(null);
    } else {
      setCurrentScreen("home");
    }
  };

  const handleCityChange = (cityId: string | undefined) => {
    setSelectedCityId(cityId);
  };

  const handleSubScreenBack = () => {
    setSubScreen(null);
  };

  const selectedCity = cities.find(c => c.id === selectedCityId);

  return (
    <div className={cn(
      "flex-1 flex flex-col bg-black overflow-hidden relative",
      isMobile ? "h-screen" : "min-h-screen"
    )}>
      {/* Header - Semi-transparent to show city image behind */}
      <header className={cn(
        "shrink-0 flex items-center justify-between px-4 md:px-6 bg-transparent z-20 absolute top-0 left-0 right-0",
        isMobile ? "h-14" : "h-16"
      )}>
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg md:text-xl drop-shadow-lg">NITEWAYS</span>
          <span className="text-xs text-gray-300 bg-black/30 px-2 py-0.5 rounded hidden md:inline backdrop-blur-sm">
            User App
          </span>
        </div>
        {/* Exit button now visible on both mobile and desktop in header */}
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white transition-colors px-3 py-1.5 text-sm bg-black/40 hover:bg-black/60 rounded-lg flex items-center gap-2 backdrop-blur-sm"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </header>

      {/* Main Content - with top padding for header */}
      <main className={cn(
        "flex-1 overflow-y-auto pt-14 md:pt-16",
        currentScreen !== "venue" && currentScreen !== "event-detail" && currentScreen !== "map" ? "pb-24 md:pb-28" : ""
      )}>
        <AnimatePresence mode="wait">
          {/* Sub-screens */}
          {subScreen === "edit-profile" && (
            <UserAppEditProfile
              key="edit-profile"
              onBack={handleSubScreenBack}
            />
          )}
          
          {/* Main screens - only show when no sub-screen is active */}
          {!subScreen && currentScreen === "home" && (
            <UserAppHome
              key="home"
              venues={venues}
              cities={cities}
              selectedCity={selectedCity}
              onCityChange={handleCityChange}
              onVenueClick={handleVenueClick}
              isLoading={venuesLoading || citiesLoading}
            />
          )}
          {!subScreen && currentScreen === "events" && (
            <UserAppEvents
              key="events"
              cities={cities}
              selectedCity={selectedCity}
              onCityChange={handleCityChange}
              onEventClick={handleEventClick}
            />
          )}
          {!subScreen && currentScreen === "event-detail" && selectedEvent && (
            <UserAppEventDetail
              key="event-detail"
              event={selectedEvent}
              onBack={handleBack}
            />
          )}
          {!subScreen && currentScreen === "venue" && selectedVenue && (
            <UserAppVenueDetail
              key="venue"
              venue={selectedVenue}
              onBack={handleBack}
            />
          )}
          {!subScreen && currentScreen === "profile" && (
            <UserAppProfile
              key="profile"
              onNavigate={setCurrentScreen}
              onSubScreen={setSubScreen}
            />
          )}
          {!subScreen && currentScreen === "map" && (
            <UserAppMap
              key="map"
              venues={venues}
              onVenueClick={handleVenueClick}
              onEventClick={handleEventClick}
            />
          )}
          {!subScreen && currentScreen === "favorites" && (
            <UserAppFavorites
              key="favorites"
              venues={venues}
              onBack={() => setCurrentScreen("home")}
              onVenueClick={handleVenueClick}
            />
          )}
          {!subScreen && currentScreen === "notifications" && (
            <UserAppNotifications
              key="notifications"
              onBack={() => setCurrentScreen("home")}
              userEmail={profile.email}
            />
          )}
          {!subScreen && currentScreen === "bookings" && (
            <UserAppBookings
              key="bookings"
              onBack={() => setCurrentScreen("home")}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      {!["venue", "event-detail"].includes(currentScreen) && !subScreen && (
        <UserAppBottomNav
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          onClose={onClose}
        />
      )}
    </div>
  );
}

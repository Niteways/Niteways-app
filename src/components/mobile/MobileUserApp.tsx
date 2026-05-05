import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Search, Bell, MapPin, ChevronLeft, Calendar, Users, 
  Heart, Clock, Music, Instagram, Ticket, Settings,
  User, QrCode, History, Star, LogOut, HelpCircle,
  Phone, ChevronRight, Map, Home, Menu as MenuIcon, X
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Mobile App Screens
type MobileScreen = "home" | "venue" | "profile" | "map" | "favorites" | "bookings" | "login" | "signup" | "editProfile";

interface MobileUserAppProps {
  isOpen: boolean;
  onClose: () => void;
  isFullView?: boolean;
}

// Mock data
const mockVenues = [
  { id: 1, name: "The Spy Bar", image: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400", distance: "0 km", priceLevel: "$$$$", genres: ["Hip Hop", "Schlager"], rating: 4.8 },
  { id: 2, name: "V*****", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400", distance: "8 km", priceLevel: "$$$$$", genres: ["Hip Hop", "House"], rating: 4.9 },
  { id: 3, name: "Atrium", image: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=400", distance: "8 km", priceLevel: "$$$$", genres: ["Hip Hop", "House"], rating: 4.7 },
  { id: 4, name: "Södra Teatern", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400", distance: "8 km", priceLevel: "$$$$", genres: ["Hip Hop", "Schlager", "House"], rating: 4.6 },
  { id: 5, name: "Hell's Kitchen", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400", distance: "8 km", priceLevel: "$$$$", genres: ["Hip Hop", "House"], rating: 4.5 },
];

const mockEvents = [
  { id: 1, name: "Rebüke at NUET", venue: "Berns", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400", date: "Fri 30 Jan" },
  { id: 2, name: "Indra Paganotto at NUET", venue: "Berns", image: "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=400", date: "Sat 31 Jan" },
  { id: 3, name: "Halloween", venue: "Hell's Kitchen", image: "https://images.unsplash.com/photo-1509248961725-aec71c47a5f3?w=400", date: "Thu 31 Oct" },
];

const mockTables = [
  { id: 1, capacity: 6, price: 500, color: "bg-teal" },
  { id: 2, capacity: 10, price: 3000, color: "bg-coral", deposit: "10%" },
  { id: 3, capacity: 8, price: 1000, color: "bg-teal" },
  { id: 4, capacity: 8, price: 2000, color: "bg-coral" },
  { id: 5, capacity: 12, price: 5000, color: "bg-gold", deposit: "10%" },
  { id: 6, capacity: 20, price: null, color: "bg-primary", priceOnRequest: true },
];

export const MobileUserApp = ({ isOpen, onClose, isFullView = false }: MobileUserAppProps) => {
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>("home");
  const [selectedVenue, setSelectedVenue] = useState<typeof mockVenues[0] | null>(null);
  const [activeTab, setActiveTab] = useState<"tables" | "tickets" | "guestlist">("tables");
  const [selectedCity, setSelectedCity] = useState("Stockholm");
  const [filterType, setFilterType] = useState<"clubs" | "events">("clubs");
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const handleVenueClick = (venue: typeof mockVenues[0]) => {
    setSelectedVenue(venue);
    setCurrentScreen("venue");
  };

  const handleBack = () => {
    if (currentScreen === "venue") {
      setCurrentScreen("home");
      setSelectedVenue(null);
    } else if (["favorites", "bookings", "editProfile"].includes(currentScreen)) {
      setCurrentScreen("profile");
    } else if (["login", "signup"].includes(currentScreen)) {
      setCurrentScreen("home");
    } else {
      setCurrentScreen("home");
    }
  };

  // Shared content renderer
  const renderContent = () => (
    <>
      {/* Status Bar - only show in modal view */}
      {!isFullView && (
        <div className="h-12 flex items-center justify-between px-8 pt-2 relative z-20">
          <span className="text-sm font-semibold text-white">9:41</span>
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={cn("w-1 h-1 rounded-full", i < 4 ? "bg-white" : "bg-white/50")} />
              ))}
            </div>
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.01 21.49L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7l11.63 14.49.01.01.01-.01z"/>
            </svg>
            <div className="w-6 h-3 border border-white rounded-sm">
              <div className="w-4 h-full bg-white rounded-sm" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={cn(
        "overflow-y-auto",
        isFullView ? "h-[calc(100%-70px)]" : "h-[calc(100%-48px-70px)]"
      )}>
        <AnimatePresence mode="wait">
          {currentScreen === "home" && (
            <HomeScreen 
              venues={mockVenues}
              events={mockEvents}
              onVenueClick={handleVenueClick}
              selectedCity={selectedCity}
              filterType={filterType}
              setFilterType={setFilterType}
            />
          )}
          {currentScreen === "venue" && selectedVenue && (
            <VenueDetailScreen 
              venue={selectedVenue}
              tables={mockTables}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onBack={handleBack}
            />
          )}
          {currentScreen === "profile" && (
            <ProfileScreen 
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === "map" && (
            <MapScreen 
              venues={mockVenues}
              onVenueClick={handleVenueClick}
            />
          )}
          {currentScreen === "favorites" && (
            <FavoritesScreen 
              venues={mockVenues}
              onBack={handleBack}
              onVenueClick={handleVenueClick}
            />
          )}
          {currentScreen === "login" && (
            <LoginScreen onBack={handleBack} onSignup={() => setCurrentScreen("signup")} />
          )}
          {currentScreen === "signup" && (
            <SignupScreen onBack={handleBack} />
          )}
          {currentScreen === "editProfile" && (
            <EditProfileScreen onBack={handleBack} />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      {!["login", "signup", "venue"].includes(currentScreen) && (
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-[70px] bg-[#0a0a0a] border-t border-gray-800",
          isFullView && "bg-background border-border"
        )}>
          <div className="flex justify-around items-center h-full px-4 pb-2">
            {[
              { id: "home", icon: Home, label: "Home" },
              { id: "map", icon: Map, label: "Map" },
              { id: "profile", icon: User, label: "Profile" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id as MobileScreen)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                  currentScreen === item.id ? "text-white" : "text-gray-500"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </button>
            ))}
          </div>
          {/* Home Indicator - only show in modal view */}
          {!isFullView && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full" />
          )}
        </div>
      )}
    </>
  );

  // Shared screen content renderer for reuse
  const renderScreens = () => (
    <AnimatePresence mode="wait">
      {currentScreen === "home" && (
        <HomeScreen 
          venues={mockVenues}
          events={mockEvents}
          onVenueClick={handleVenueClick}
          selectedCity={selectedCity}
          filterType={filterType}
          setFilterType={setFilterType}
        />
      )}
      {currentScreen === "venue" && selectedVenue && (
        <VenueDetailScreen 
          venue={selectedVenue}
          tables={mockTables}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onBack={handleBack}
        />
      )}
      {currentScreen === "profile" && (
        <ProfileScreen 
          onNavigate={setCurrentScreen}
        />
      )}
      {currentScreen === "map" && (
        <MapScreen 
          venues={mockVenues}
          onVenueClick={handleVenueClick}
        />
      )}
      {currentScreen === "favorites" && (
        <FavoritesScreen 
          venues={mockVenues}
          onBack={handleBack}
          onVenueClick={handleVenueClick}
        />
      )}
      {currentScreen === "login" && (
        <LoginScreen onBack={handleBack} onSignup={() => setCurrentScreen("signup")} />
      )}
      {currentScreen === "signup" && (
        <SignupScreen onBack={handleBack} />
      )}
      {currentScreen === "editProfile" && (
        <EditProfileScreen onBack={handleBack} />
      )}
    </AnimatePresence>
  );

  // Bottom navigation component for reuse
  const BottomNavigation = ({ showHomeIndicator = true }: { showHomeIndicator?: boolean }) => (
    !["login", "signup", "venue"].includes(currentScreen) ? (
      <div className="absolute bottom-0 left-0 right-0 h-[70px] bg-[#0a0a0a] border-t border-gray-800 safe-area-bottom">
        <div className="flex justify-around items-center h-full px-4 pb-2">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "map", icon: Map, label: "Map" },
            { id: "profile", icon: User, label: "Profile" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id as MobileScreen)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                currentScreen === item.id ? "text-white" : "text-gray-500"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </div>
        {showHomeIndicator && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full" />
        )}
      </div>
    ) : null
  );

  // Full view mode - renders as a full-screen native experience
  if (isFullView) {
    // Mobile: Full-width native experience without phone frame
    if (isMobile) {
      return (
        <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden relative h-screen">
          {/* Minimal header with exit */}
          <div className="h-12 flex items-center justify-between px-4 bg-[#0a0a0a] border-b border-gray-800 shrink-0">
            <span className="text-white font-semibold text-sm">User App</span>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Main Content - Full width */}
          <div className="flex-1 overflow-y-auto pb-[70px]">
            {renderScreens()}
          </div>

          {/* Bottom Navigation */}
          <BottomNavigation showHomeIndicator={false} />
        </div>
      );
    }

    // Desktop: Phone frame preview
    return (
      <div className="flex-1 bg-[#0a0a0a] overflow-hidden relative">
        {/* Header with exit button */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">User App Preview</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Live View</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Exit Preview
          </button>
        </div>
        
        {/* Main content area with centered phone frame */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto" style={{ height: "calc(100vh - 56px)" }}>
          <div className="relative bg-black rounded-[2.8rem] p-2.5 shadow-2xl border border-gray-800" style={{ width: "380px" }}>
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30" />
            
            {/* Screen */}
            <div className="relative bg-[#0a0a0a] rounded-[2.4rem] overflow-hidden" style={{ height: "780px" }}>
              {/* Status Bar */}
              <div className="h-12 flex items-center justify-between px-8 pt-2 relative z-20">
                <span className="text-sm font-semibold text-white">9:41</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={cn("w-1 h-1 rounded-full", i < 4 ? "bg-white" : "bg-white/50")} />
                    ))}
                  </div>
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.01 21.49L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7l11.63 14.49.01.01.01-.01z"/>
                  </svg>
                  <div className="w-6 h-3 border border-white rounded-sm">
                    <div className="w-4 h-full bg-white rounded-sm" />
                  </div>
                </div>
              </div>
              
              {/* Main Content */}
              <div className="h-[calc(100%-48px-70px)] overflow-y-auto">
                {renderScreens()}
              </div>

              {/* Bottom Navigation */}
              <BottomNavigation />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Modal view mode - original popup behavior
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative"
          style={{ width: "320px" }}
        >
          {/* iPhone Frame */}
          <div className="relative bg-black rounded-[2.8rem] p-2.5 shadow-2xl border border-gray-800">
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30" />
            
            {/* Screen */}
            <div className="relative bg-[#0a0a0a] rounded-[2.4rem] overflow-hidden" style={{ height: "680px" }}>
              {renderContent()}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 transition-colors z-40"
            >
              ×
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Home/Discover Screen
const HomeScreen = ({ venues, events, onVenueClick, selectedCity, filterType, setFilterType }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="px-4"
  >
    {/* City Header */}
    <div className="flex items-center justify-between mb-4">
      <button className="flex items-center gap-1 text-white">
        <span className="text-lg font-semibold">{selectedCity}</span>
        <ChevronRight className="w-4 h-4 rotate-90" />
      </button>
      <button className="relative">
        <Bell className="w-5 h-5 text-gray-400" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-coral rounded-full" />
      </button>
    </div>

    {/* Search Bar */}
    <div className="relative mb-4">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
      <input
        type="text"
        placeholder="What club are you looking for..."
        className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-gray-500"
      />
      <button className="absolute right-3 top-1/2 -translate-y-1/2">
        <MenuIcon className="w-4 h-4 text-gray-500" />
      </button>
    </div>

    {/* Filter Chips */}
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => setFilterType("clubs")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
          filterType === "clubs" 
            ? "bg-white text-black" 
            : "bg-gray-800 text-gray-400"
        )}
      >
        🎭 Clubs {filterType === "clubs" && "×"}
      </button>
      <button
        onClick={() => setFilterType("events")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
          filterType === "events" 
            ? "bg-coral text-white" 
            : "bg-gray-800 text-gray-400"
        )}
      >
        🎉 Events
      </button>
    </div>

    {/* Recommendations */}
    <h3 className="text-sm text-gray-400 mb-3">What we think you would like...</h3>
    <div className="grid grid-cols-2 gap-3 mb-4">
      {venues.slice(0, 2).map((venue: any) => (
        <VenueCard key={venue.id} venue={venue} onClick={() => onVenueClick(venue)} />
      ))}
    </div>

    {/* Klarna Banner */}
    <div className="bg-[#FFB3C7] rounded-xl p-4 mb-4">
      <p className="text-black font-bold text-center text-sm">Book now.</p>
      <p className="text-black font-bold text-center text-sm">Pay later with <span className="font-black">Klarna.</span></p>
    </div>

    {/* Popular Section */}
    <h3 className="text-sm text-white mb-3">Popular in {selectedCity} 🔥</h3>
    <div className="grid grid-cols-2 gap-3 mb-4">
      {venues.slice(0, 4).map((venue: any) => (
        <VenueCard key={venue.id} venue={venue} onClick={() => onVenueClick(venue)} />
      ))}
    </div>

    {/* Guestlist Only */}
    <h3 className="text-sm text-gray-400 mb-3">Guestlist only</h3>
    <div className="grid grid-cols-2 gap-3 mb-4">
      {venues.slice(0, 2).map((venue: any) => (
        <VenueCard key={venue.id} venue={venue} onClick={() => onVenueClick(venue)} />
      ))}
    </div>

    {/* Priceless Banner */}
    <div className="bg-gray-900 rounded-xl p-4 mb-4 flex items-center gap-3">
      <div className="flex -space-x-1">
        <div className="w-6 h-6 rounded-full bg-coral" />
        <div className="w-6 h-6 rounded-full bg-gold" />
      </div>
      <p className="text-white text-sm">
        Your <span className="text-coral">true</span> <span className="text-gold">self</span> is <span className="font-bold">Priceless</span>®
      </p>
    </div>

    {/* Upcoming Events */}
    <h3 className="text-sm text-white mb-3">Upcoming events</h3>
    <div className="space-y-3 pb-6">
      {events.map((event: any) => (
        <div key={event.id} className="relative rounded-xl overflow-hidden">
          <img 
            src={event.image} 
            alt={event.name}
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-coral/80 rounded text-[10px] text-white font-medium">
            {event.date}
          </div>
          <button className="absolute top-2 right-2">
            <Heart className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-2 left-3 right-3">
            <p className="text-white font-semibold text-sm">{event.name}</p>
            <p className="text-gray-400 text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal" />
              {event.venue}
            </p>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

// Venue Card Component
const VenueCard = ({ venue, onClick }: any) => (
  <button 
    onClick={onClick}
    className="relative rounded-xl overflow-hidden aspect-[4/3] text-left"
  >
    <img 
      src={venue.image} 
      alt={venue.name}
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
    <button className="absolute top-2 right-2" onClick={(e) => { e.stopPropagation(); }}>
      <Heart className="w-4 h-4 text-white/80" />
    </button>
    <div className="absolute bottom-2 left-2 right-2">
      <p className="text-white font-semibold text-xs">{venue.name}</p>
      <div className="flex items-center gap-1 text-[10px] text-gray-300">
        <span className="text-white">{venue.priceLevel}</span>
        <span>•</span>
        <span>{venue.genres.join(" & ")}</span>
      </div>
    </div>
    {venue.distance && (
      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white">
        {venue.distance}
      </span>
    )}
  </button>
);

// Venue Detail Screen
const VenueDetailScreen = ({ venue, tables, activeTab, setActiveTab, onBack }: any) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
  >
    {/* Hero Image */}
    <div className="relative h-52">
      <img 
        src={venue.image} 
        alt={venue.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-medium">
        23+
      </div>
    </div>

    {/* Venue Info */}
    <div className="px-4 -mt-6 relative z-10">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-teal" />
        <span className="text-[10px] text-gray-400">Club</span>
      </div>
      <h1 className="text-xl font-bold text-white mb-2">{venue.name}</h1>
      
      <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2 flex-wrap">
        <span className="text-white">{venue.priceLevel}</span>
        <span className="flex items-center gap-0.5">
          <Music className="w-3 h-3" />
          {venue.genres.join(" & ")}
        </span>
        <span className="flex items-center gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-teal" />
          23:00 - 03:00
        </span>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-3">
        <span className="flex items-center gap-1 px-2 py-0.5 bg-teal/20 text-teal rounded">
          <Users className="w-3 h-3" />
          Guestlist & table reservation only
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Wed - Sat
        </span>
      </div>

      <p className="text-[11px] text-gray-300 leading-relaxed mb-4">
        The legendary and intimate V***** Club is nestled on the second floor of the iconic Sturecompagniet. 
        Whether you're looking to mingle with elites or enjoy a more secluded night out, V***** Club offers the perfect setting.
      </p>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-700 text-gray-300 text-[11px]">
          <MapPin className="w-3.5 h-3.5" />
          Location
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-700 text-gray-300 text-[11px]">
          📖 Menu
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1DB954] text-white text-[11px] font-medium">
          🎵 Listen on Spotify
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-700 text-gray-300 text-[11px]">
          <Instagram className="w-3.5 h-3.5" />
          Instagram
        </button>
      </div>

      {/* Date Selector */}
      <div className="border border-gray-700 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500">Select date</p>
            <p className="text-sm text-white font-medium">01/11/2025</p>
          </div>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-4">
        {["Tables", "Tickets", "Guest List"].map((tab) => {
          const tabKey = tab.toLowerCase().replace(" ", "") as "tables" | "tickets" | "guestlist";
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tabKey)}
              className={cn(
                "flex-1 py-2 text-[11px] font-medium border-b-2 -mb-[1px] transition-colors",
                activeTab === tabKey
                  ? "text-white border-coral"
                  : "text-gray-500 border-transparent"
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "tables" && (
        <>
          {/* Floor Map Preview */}
          <div className="bg-[#1a1a1a] rounded-lg p-3 mb-4 aspect-video relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[8px] text-gray-500 text-center">
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-4 h-4 rounded bg-gray-700" />
                  ))}
                </div>
                <div className="w-12 h-6 rounded bg-teal/30 mx-auto mb-2" />
                <div className="grid grid-cols-6 gap-0.5">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-3 h-3 rounded-full bg-gold/50" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tables List */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white">Tables</p>
            <button className="text-gray-400">⇅</button>
          </div>
          <div className="space-y-2 pb-4">
            {tables.map((table: any) => (
              <div key={table.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1a1a1a]">
                <div className={cn("w-2 h-2 rounded-full", table.color)} />
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-[11px] text-gray-300">{table.capacity} max</span>
                <span className="ml-auto text-[11px] text-white font-medium">
                  {table.priceOnRequest ? "Price Upon Request" : `€${table.price.toLocaleString()}`}
                </span>
                {table.deposit && (
                  <span className="text-[9px] text-coral">DEPOSIT {table.deposit}</span>
                )}
                <div className="w-4 h-4 border border-gray-600 rounded" />
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "tickets" && (
        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-coral mb-1">
            <span className="text-sm">⚠️</span>
            <span className="text-[11px] font-medium">Tickets available only at the door!</span>
          </div>
          <p className="text-[10px] text-gray-400">
            You can only purchase tickets for V***** at the door.
          </p>
        </div>
      )}

      {activeTab === "guestlist" && (
        <div className="bg-[#1a1a1a] rounded-lg p-4 mb-4">
          <h4 className="text-white text-sm font-medium mb-2">Apply for Guest List</h4>
          <p className="text-[11px] text-gray-400 mb-3">
            Enter the club for by applying for the guest list.
          </p>
          <button className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm font-medium transition-colors">
            Apply
          </button>
        </div>
      )}
    </div>
  </motion.div>
);

// Profile Screen
const ProfileScreen = ({ onNavigate }: { onNavigate: (screen: MobileScreen) => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="px-4"
  >
    {/* Membership Card */}
    <div className="bg-gradient-to-br from-gold/30 via-gold/20 to-gold/10 rounded-2xl p-4 border border-gold/30 mb-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" 
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-[10px] text-gray-400">MEMBER STATUS</p>
            <p className="text-lg font-bold text-gold">Gold</p>
          </div>
        </div>
        <QrCode className="w-10 h-10 text-white/80" />
      </div>
      <p className="text-white font-semibold">Michael Chen</p>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">USR-084</p>
        <p className="text-[10px] text-gold font-medium">NITEWAYS</p>
      </div>
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { icon: History, label: "Booking History" },
        { icon: User, label: "Edit Profile", action: () => onNavigate("editProfile") },
        { icon: Heart, label: "Favorites", action: () => onNavigate("favorites") },
      ].map((item, idx) => (
        <button 
          key={idx}
          onClick={item.action}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
        >
          <item.icon className="w-5 h-5 text-gray-400" />
          <span className="text-[10px] text-gray-400">{item.label}</span>
        </button>
      ))}
    </div>

    {/* Upcoming Bookings */}
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Upcoming Bookings</h3>
        <ChevronRight className="w-4 h-4 text-gray-500 rotate-90" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-teal" />
              <span className="text-[10px] text-teal">V*****</span>
            </div>
            <p className="text-[10px] text-gray-400 flex-1">
              You have been granted access for the guest list to the club V*****
            </p>
            <button className="px-2 py-1 bg-gray-800 rounded text-[9px] text-white">
              View QR
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* Settings */}
    <div className="mb-6">
      <h3 className="text-sm font-medium text-white mb-3">Settings</h3>
      <div className="space-y-1">
        {[
          { icon: HelpCircle, label: "About" },
          { icon: Phone, label: "Contact Us" },
          { icon: Settings, label: "Account Settings" },
          { icon: HelpCircle, label: "Help Center" },
          { icon: Star, label: "Rate Us" },
        ].map((item, idx) => (
          <button key={idx} className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-300">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        ))}
      </div>
    </div>

    {/* Logout */}
    <button className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-coral/30 text-coral hover:bg-coral/10 transition-colors mb-6">
      <LogOut className="w-4 h-4" />
      <span className="text-sm">Log Out</span>
    </button>
  </motion.div>
);

// Map Screen
const MapScreen = ({ venues, onVenueClick }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="h-full"
  >
    {/* Search Bar */}
    <div className="absolute top-14 left-4 right-4 z-10">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="What club or event are you looking for..."
          className="w-full bg-gray-900/90 backdrop-blur border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-500"
        />
      </div>
      {/* Filter Chips */}
      <div className="flex gap-2 mt-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-xs font-medium">
          🎭 Clubs ×
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 text-xs font-medium">
          🎉 Events
        </button>
      </div>
    </div>

    {/* Map Background */}
    <div className="h-full bg-[#1a1a1a] relative overflow-hidden">
      {/* Grid lines to simulate map */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute border-l border-gray-700" style={{ left: `${i * 5}%`, height: '100%' }} />
        ))}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute border-t border-gray-700" style={{ top: `${i * 5}%`, width: '100%' }} />
        ))}
      </div>

      {/* Venue Pins */}
      <div className="absolute top-1/3 left-1/3">
        <div className="relative w-12 h-14">
          <div className="w-10 h-10 rounded-full border-2 border-coral overflow-hidden">
            <img src={venues[0].image} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-coral" />
        </div>
      </div>
      <div className="absolute top-1/2 left-1/2">
        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white animate-pulse" />
      </div>
      <div className="absolute top-1/4 right-1/3">
        <div className="relative w-12 h-14">
          <div className="w-10 h-10 rounded-full border-2 border-coral overflow-hidden">
            <img src={venues[1].image} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-coral" />
        </div>
      </div>

      {/* Location Label */}
      <div className="absolute top-32 left-1/3 text-gray-500 text-xs">
        Vaillancourt<br />Fountain
      </div>
    </div>

    {/* Bottom Card */}
    <div className="absolute bottom-20 left-4 right-4">
      <button 
        onClick={() => onVenueClick(venues[0])}
        className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/95 backdrop-blur border border-gray-800"
      >
        <img 
          src={venues[0].image} 
          alt={venues[0].name}
          className="w-20 h-16 rounded-lg object-cover"
        />
        <div className="flex-1 text-left">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-teal" />
            <span className="text-[10px] text-gray-400">Clubs</span>
          </div>
          <p className="text-white font-semibold text-sm">{venues[0].name}</p>
          <p className="text-white text-xs mt-1">{venues[0].priceLevel}</p>
          <p className="text-gray-400 text-[10px]">{venues[0].genres.join(" & ")}</p>
        </div>
        <Heart className="w-5 h-5 text-gray-500" />
      </button>
    </div>
  </motion.div>
);

// Favorites Screen
const FavoritesScreen = ({ venues, onBack, onVenueClick }: any) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="px-4"
  >
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="p-1">
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <h1 className="text-lg font-semibold text-white">Favorites</h1>
    </div>

    <div className="space-y-3">
      {venues.slice(0, 3).map((venue: any) => (
        <button 
          key={venue.id}
          onClick={() => onVenueClick(venue)}
          className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1a1a] w-full text-left"
        >
          <img 
            src={venue.image} 
            alt={venue.name}
            className="w-20 h-16 rounded-lg object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-teal" />
              <span className="text-[10px] text-gray-400">Clubs</span>
            </div>
            <p className="text-white font-semibold text-sm">{venue.name}</p>
            <p className="text-white text-xs mt-1">{venue.priceLevel}</p>
            <p className="text-gray-400 text-[10px]">{venue.genres.join(" & ")}</p>
          </div>
          <Heart className="w-5 h-5 text-coral fill-coral" />
        </button>
      ))}
    </div>
  </motion.div>
);

// Login Screen
const LoginScreen = ({ onBack, onSignup }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="px-6 pt-8"
  >
    <h1 className="text-3xl font-black text-white text-center italic mb-2">NITEWAYS</h1>
    <p className="text-gray-400 text-center text-sm mb-8">
      Log in to discover, book and share<br />your nights. All in one place.
    </p>

    <div className="space-y-4 mb-4">
      <input
        type="text"
        placeholder="E-post eller mobilnummer"
        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-3.5 px-4 text-white placeholder:text-gray-500"
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-3.5 px-4 text-white placeholder:text-gray-500"
      />
    </div>

    <p className="text-right text-xs text-gray-400 mb-6">Forgot your password?</p>

    <button className="w-full py-3.5 bg-white text-black font-semibold rounded-xl mb-3">
      Log In
    </button>
    <button 
      onClick={onSignup}
      className="w-full py-3.5 border border-gray-700 text-gray-300 rounded-xl mb-6"
    >
      No account? Sign up here
    </button>

    {/* Social Login */}
    <div className="flex justify-center gap-4">
      {[
        { bg: "bg-[#1877F2]", icon: "f" },
        { bg: "bg-white", icon: "G" },
        { bg: "bg-black border border-gray-700", icon: "" },
      ].map((social, idx) => (
        <button key={idx} className={cn("w-14 h-14 rounded-full flex items-center justify-center", social.bg)}>
          {idx === 0 && <span className="text-white text-xl font-bold">f</span>}
          {idx === 1 && (
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {idx === 2 && <span className="text-white text-xl"></span>}
        </button>
      ))}
    </div>
  </motion.div>
);

// Signup Screen
const SignupScreen = ({ onBack }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="px-6 pt-8"
  >
    <h1 className="text-3xl font-black text-white text-center italic mb-2">NITEWAYS</h1>
    <p className="text-gray-400 text-center text-sm mb-6">
      Sign up to discover, book and<br />share your nights. All in one place.
    </p>

    <div className="space-y-3 mb-4">
      <input type="text" placeholder="Email or Phone Number" className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-3 px-4 text-white placeholder:text-gray-500" />
      <input type="password" placeholder="Password" className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-3 px-4 text-white placeholder:text-gray-500" />
      <input type="text" placeholder="First name" className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-3 px-4 text-white placeholder:text-gray-500" />
      <input type="text" placeholder="Last name" className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-3 px-4 text-white placeholder:text-gray-500" />
    </div>

    {/* Social Login */}
    <div className="flex justify-center gap-4 mb-4">
      {[
        { bg: "bg-[#1877F2]" },
        { bg: "bg-white" },
        { bg: "bg-black border border-gray-700" },
      ].map((social, idx) => (
        <button key={idx} className={cn("w-14 h-14 rounded-full flex items-center justify-center", social.bg)}>
          {idx === 0 && <span className="text-white text-xl font-bold">f</span>}
          {idx === 1 && (
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {idx === 2 && <span className="text-white text-xl"></span>}
        </button>
      ))}
    </div>

    <p className="text-[10px] text-gray-400 text-center mb-4">
      By signing up, you agree to our <span className="text-coral">Terms</span>. You can learn how we collect, use, and share your data in our <span className="text-coral">Privacy Policy</span>, and how we use cookies in our <span className="text-coral">Cookie Policy</span>.
    </p>

    <button className="w-full py-3.5 bg-gray-800 text-gray-400 font-semibold rounded-xl">
      Next
    </button>

    <button onClick={onBack} className="w-full py-3 mt-3 text-gray-500 text-sm">
      Back to Login
    </button>
  </motion.div>
);

// Edit Profile Screen
const EditProfileScreen = ({ onBack }: any) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="px-4"
  >
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="p-1">
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <h1 className="text-lg font-semibold text-white">Edit Profile</h1>
    </div>

    {/* Avatar */}
    <div className="flex justify-center mb-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" 
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
          ✏️
        </button>
      </div>
    </div>

    {/* Form */}
    <div className="space-y-3 mb-6">
      {[
        { label: "First Name", value: "Tsegai Kewin" },
        { label: "Last Name", value: "Gebremeskel" },
        { label: "Phone", value: "+46 70-956 37 64" },
        { label: "Country", value: "Sweden", select: true },
        { label: "Email", value: "tsegai@niteways.com" },
        { label: "Gender", value: "Male", select: true },
        { label: "Birthday", value: "February 21 2004" },
      ].map((field, idx) => (
        <div key={idx} className="relative">
          <input
            type="text"
            defaultValue={field.value}
            className="w-full bg-[#1a1a1a] border border-gray-800 rounded-xl py-3.5 px-4 text-white"
          />
          {field.select && (
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 rotate-90" />
          )}
        </div>
      ))}
    </div>

    {/* Social Interactions */}
    <div className="mb-6">
      <h3 className="text-sm text-gray-400 mb-3">Social Interactions</h3>
      <div className="bg-[#1a1a1a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4 text-coral" />
            <span className="text-white text-sm">@tsegaigebremeskel</span>
          </div>
          <button className="text-gray-500">🔗</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-800 overflow-hidden">
              <img 
                src={`https://images.unsplash.com/photo-150700321116${i}-0a1dd7228f2d?w=100`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>

    <button className="w-full py-3.5 bg-gray-800 text-gray-400 font-semibold rounded-xl">
      Create
    </button>
  </motion.div>
);

export default MobileUserApp;

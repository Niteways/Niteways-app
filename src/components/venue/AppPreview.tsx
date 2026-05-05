import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Music, Instagram, ChevronLeft, Calendar, Users, DollarSign, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface VenueData {
  name: string;
  description: string;
  musicGenres: string[];
  openingDays: string[];
  entranceRules: string;
  location: {
    address: string;
  };
  instagram: string;
  galleryImages: string[];
  spotifyPlaylist?: string;
  ageLimit?: number;
  openingHours?: {
    [key: string]: { open: string; close: string };
  };
}

interface AppPreviewProps {
  venueData: VenueData;
}

// Mock table data for preview
const mockTables = [
  { id: 1, color: "bg-teal", capacity: 6, price: 500 },
  { id: 2, color: "bg-coral", capacity: 10, price: 3000, deposit: true },
  { id: 3, color: "bg-teal", capacity: 8, price: 1000 },
  { id: 4, color: "bg-coral", capacity: 8, price: 2000 },
  { id: 5, color: "bg-gold", capacity: 12, price: 5000, deposit: true },
  { id: 6, color: "bg-primary", capacity: 20, priceOnRequest: true },
];

export const AppPreview = ({ venueData }: AppPreviewProps) => {
  const [activeTab, setActiveTab] = useState("tables");

  // Get opening hours display
  const getOpeningHours = () => {
    if (venueData.openingHours) {
      const firstDay = venueData.openingDays[0]?.toLowerCase();
      const hours = venueData.openingHours[firstDay];
      if (hours) return `${hours.open} - ${hours.close}`;
    }
    return "23:00 - 03:00";
  };

  // Get opening days short format
  const getOpeningDaysShort = () => {
    if (venueData.openingDays.length > 0) {
      const first = venueData.openingDays[0].slice(0, 3);
      const last = venueData.openingDays[venueData.openingDays.length - 1].slice(0, 3);
      return `${first} - ${last}`;
    }
    return "Wed - Sat";
  };

  return (
    <div className="relative mx-auto" style={{ width: "280px" }}>
      {/* iPhone Frame */}
      <div className="relative bg-black rounded-[2.5rem] p-2 shadow-2xl">
        {/* Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
        
        {/* Screen */}
        <div className="relative bg-[#1a1a1a] rounded-[2.2rem] overflow-hidden" style={{ height: "580px" }}>
          {/* Status Bar */}
          <div className="h-10 bg-transparent flex items-center justify-between px-6 pt-1 relative z-10">
            <span className="text-xs font-semibold text-white">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-white" />
                <div className="w-1 h-1 rounded-full bg-white/50" />
              </div>
              <div className="w-5 h-2.5 border border-white rounded-sm ml-1">
                <div className="w-3/4 h-full bg-white rounded-sm" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="h-full overflow-y-auto pb-16">
            {/* Hero Image */}
            <div className="relative h-44">
              {venueData.galleryImages[0] ? (
                <img 
                  src={venueData.galleryImages[0]} 
                  alt={venueData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-coral/30 to-primary/30 flex items-center justify-center">
                  <Music className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
              
              {/* Back button */}
              <button className="absolute top-2 left-3 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>

              {/* Age badge */}
              <div className="absolute top-2 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                {venueData.ageLimit || 21}+
              </div>
            </div>

            {/* Venue Info */}
            <div className="px-4 -mt-4 relative z-10">
              {/* Category label */}
              <div className="flex items-center gap-1 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-teal" />
                <span className="text-[10px] text-gray-400">Club</span>
              </div>

              {/* Venue name */}
              <h2 className="text-lg font-bold text-white mb-2">{venueData.name || "Venue Name"}</h2>

              {/* Quick info row */}
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-3 flex-wrap">
                <span className="text-white">$$$$</span>
                <span className="flex items-center gap-0.5">
                  <Music className="w-3 h-3" />
                  {venueData.musicGenres.slice(0, 2).join(" & ") || "House"}
                </span>
                <span className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal" />
                  {getOpeningHours()}
                </span>
              </div>

              {/* Tags row */}
              <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-3">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-teal/20 text-teal rounded">
                  <Users className="w-3 h-3" />
                  Guestlist & table reservation only
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {getOpeningDaysShort()}
                </span>
              </div>

              {/* Description */}
              <p className="text-[11px] text-gray-300 leading-relaxed mb-4 line-clamp-4">
                {venueData.description || "The legendary and intimate club is nestled on the second floor of the iconic building. Whether you're looking to mingle with elites or enjoy a more secluded night out, this club offers the perfect setting with its plush interiors and top-tier service."}
              </p>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-700 text-gray-300 text-[11px]">
                  <MapPin className="w-3.5 h-3.5" />
                  Location
                </button>
                <button className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-700 text-gray-300 text-[11px]">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  Menu
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <button className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1DB954] text-white text-[11px] font-medium">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Listen on Spotify
                </button>
                <button className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-gray-700 text-gray-300 text-[11px]">
                  <Instagram className="w-3.5 h-3.5" />
                  Instagram
                </button>
              </div>

              {/* Date selector */}
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
                {["Tables", "Tickets", "Guest List"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase().replace(" ", "-"))}
                    className={cn(
                      "flex-1 py-2 text-[11px] font-medium border-b-2 -mb-[1px] transition-colors",
                      activeTab === tab.toLowerCase().replace(" ", "-")
                        ? "text-white border-coral"
                        : "text-gray-500 border-transparent"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Floor Map Preview */}
              <div className="bg-[#252525] rounded-lg p-3 mb-4 aspect-video relative overflow-hidden">
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

              {/* Tables Section Label */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">Tables</p>
                <button className="text-gray-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
                  </svg>
                </button>
              </div>

              {/* Tables List */}
              <div className="space-y-2 pb-4">
                {mockTables.map((table) => (
                  <div 
                    key={table.id} 
                    className="flex items-center gap-3 p-2 rounded-lg bg-[#252525]"
                  >
                    <div className={cn("w-2 h-2 rounded-full", table.color)} />
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-[11px] text-gray-300">{table.capacity} max</span>
                    <span className="ml-auto text-[11px] text-white font-medium">
                      {table.priceOnRequest ? "Price Upon Request" : `€${table.price.toLocaleString()}`}
                    </span>
                    {table.deposit && (
                      <span className="text-[9px] text-coral">DEPOSIT 10%</span>
                    )}
                    <div className="w-4 h-4 border border-gray-600 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  );
};

import { motion } from "framer-motion";
import { Heart, ChevronRight, MapPin, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { Venue } from "@/hooks/useUserAppData";
import { useFavoriteManager } from "@/hooks/useFavorites";

interface UserAppFavoritesProps {
  venues: Venue[];
  onBack: () => void;
  onVenueClick: (venue: Venue) => void;
}

export function UserAppFavorites({ venues, onBack, onVenueClick }: UserAppFavoritesProps) {
  const { favorites, toggleFavorite } = useFavoriteManager();
  
  const favoriteVenues = venues.filter(v => favorites.includes(v.id));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="px-4 py-4 pb-24 max-w-screen-lg mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <h1 className="text-xl font-bold text-white">Favorites</h1>
      </div>

      {favoriteVenues.length > 0 ? (
        <div className="space-y-3">
          {favoriteVenues.map((venue) => (
            <button
              key={venue.id}
              onClick={() => onVenueClick(venue)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden flex hover:border-gray-700 transition-colors text-left"
            >
              <div className="w-24 h-24 shrink-0">
                <img
                  src={venue.gallery_images?.[0] || "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400"}
                  alt={venue.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-white">{venue.name}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(venue.id);
                      }}
                      className="p-1"
                    >
                      <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{venue.category}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{venue.city_name || "Unknown"}</span>
                  </div>
                  {venue.music_genre && (
                    <div className="flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      <span>{venue.music_genre}</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No favorites yet</p>
          <p className="text-sm text-gray-500 mt-1">Tap the heart icon on venues you love</p>
        </div>
      )}
    </motion.div>
  );
}

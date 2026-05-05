import { Heart, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Venue } from "@/hooks/useUserAppData";
import { useFavoriteManager } from "@/hooks/useFavorites";

interface VenueCardProps {
  venue: Venue;
  onClick: () => void;
  horizontal?: boolean;
}

// Default venue images based on category
const getCategoryImage = (category: string) => {
  const images: Record<string, string> = {
    "Nightclub": "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=300&fit=crop",
    "Lounge": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop",
    "Beach Club": "https://images.unsplash.com/photo-1545128485-c400e7702796?w=400&h=300&fit=crop",
  };
  return images[category] || "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=300&fit=crop";
};

// Generate price level indicator
const getPriceLevel = (minSpend?: number | null): string => {
  if (!minSpend) return "$$";
  if (minSpend < 5000) return "$$";
  if (minSpend < 10000) return "$$$";
  if (minSpend < 20000) return "$$$$";
  return "$$$$$";
};

export function VenueCard({ venue, onClick, horizontal = false }: VenueCardProps) {
  const imageUrl = venue.gallery_images?.[0] || getCategoryImage(venue.category);
  const priceLevel = getPriceLevel(venue.min_spend_tables);
  const { isFavorite, toggleFavorite } = useFavoriteManager();
  const isFav = isFavorite(venue.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(venue.id);
  };

  // Horizontal layout for mobile - smaller cards
  if (horizontal) {
    return (
      <button 
        onClick={onClick}
        className="group relative rounded-xl overflow-hidden text-left w-full focus:outline-none focus:ring-2 focus:ring-primary/50 bg-gray-900/50"
      >
        <div className="flex h-20">
          {/* Image */}
          <div className="relative w-20 shrink-0 overflow-hidden">
            <img 
              src={imageUrl}
              alt={venue.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Favorite Button */}
            <button 
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
              onClick={handleFavoriteClick}
            >
              <Heart 
                className={cn(
                  "w-3 h-3 transition-colors",
                  isFav ? "text-pink-500 fill-pink-500" : "text-white/80 hover:text-pink-500"
                )} 
              />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-2.5 flex flex-col justify-between">
            <div>
              <h3 className="text-white font-semibold text-xs truncate mb-0.5">
                {venue.name}
              </h3>
              <p className="text-[10px] text-gray-400 line-clamp-1">
                {priceLevel} • {venue.music_genre || venue.category}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <MapPin className="w-2.5 h-2.5 text-primary shrink-0" />
                <span className="truncate">{venue.city_name || "Unknown"}</span>
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  }

  // Default grid layout for desktop - compact cards
  return (
    <button 
      onClick={onClick}
      className="group relative rounded-lg overflow-hidden aspect-[4/3] text-left w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      <img 
        src={imageUrl}
        alt={venue.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      
      {/* Favorite Button */}
      <button 
        className="absolute top-1 right-1 p-1 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        onClick={handleFavoriteClick}
      >
        <Heart 
          className={cn(
            "w-3 h-3 transition-colors",
            isFav ? "text-pink-500 fill-pink-500" : "text-white/80 hover:text-pink-500"
          )} 
        />
      </button>

      {/* Venue Info */}
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <h3 className="text-white font-semibold text-[11px] truncate mb-0.5">
          {venue.name}
        </h3>
        <div className="flex items-center gap-1 text-[9px] text-gray-400">
          <span>{priceLevel}</span>
          <span className="text-gray-600">•</span>
          <span className="truncate">{venue.music_genre || venue.category}</span>
        </div>
      </div>
    </button>
  );
}

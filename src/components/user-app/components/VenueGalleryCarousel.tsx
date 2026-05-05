import { useState, useRef, TouchEvent } from "react";
import { cn } from "@/lib/utils";

interface VenueGalleryCarouselProps {
  images: string[];
  venueName: string;
  category: string;
}

const getCategoryImage = (category: string) => {
  const images: Record<string, string> = {
    "Nightclub": "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&h=400&fit=crop",
    "Lounge": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop",
    "Beach Club": "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=400&fit=crop",
  };
  return images[category] || "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&h=400&fit=crop";
};

export function VenueGalleryCarousel({ images, venueName, category }: VenueGalleryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  
  // Use gallery images if available, otherwise fallback to category image
  const galleryImages = images && images.length > 0 
    ? images 
    : [getCategoryImage(category)];

  const minSwipeDistance = 50;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleTouchStart = (e: TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && galleryImages.length > 1) {
      goToNext();
    }
    if (isRightSwipe && galleryImages.length > 1) {
      goToPrevious();
    }
  };

  return (
    <div 
      className="relative h-64 md:h-80 lg:h-[420px] group"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Image */}
      <img 
        src={galleryImages[currentIndex]}
        alt={`${venueName} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
        draggable={false}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/30 to-transparent" />

      {/* Dot Indicators */}
      {galleryImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {galleryImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex 
                  ? "bg-white w-6" 
                  : "bg-white/40 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      )}

      {/* Image Counter */}
      {galleryImages.length > 1 && (
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
          {currentIndex + 1} / {galleryImages.length}
        </div>
      )}
    </div>
  );
}
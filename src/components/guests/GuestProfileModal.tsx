import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  X, Star, Phone, Mail, Instagram, Heart, Check, X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MemberIdCard } from "./MemberIdCard";
import { useIsMobile } from "@/hooks/use-mobile";

interface GuestVisit {
  venueName: string;
  visitCount: number;
}

interface BookingDetails {
  table?: string;
  partySize?: number;
  date?: string;
  time?: string;
  price?: number;
  notes?: string;
}

interface GuestListDetails {
  listName?: string;
  plusGuests?: number;
  listType?: string;
  eventDate?: string;
  notes?: string;
}

interface GuestProfile {
  id: string;
  guestId: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  loyaltyLevel: "bronze" | "silver" | "gold" | "platinum";
  automaticRating: number;
  personnelRating?: number;
  totalVisits: number;
  totalSpend: number;
  avgSpend: number;
  avgTip?: number;
  about?: string;
  instagramHandle?: string;
  instagramPhotos?: string[];
  instagramPhotoCount?: number;
  topVenues?: GuestVisit[];
  nitewaysVisits?: number;
  nitewaysAvgTip?: number;
  nitewaysAvgBill?: number;
  notes?: string;
}

interface GuestProfileModalProps {
  guest: GuestProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVenueName?: string;
  onCheckIn?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  showRequestActions?: boolean;
  onAvatarUpdate?: (url: string) => void;
  bookingDetails?: BookingDetails;
  guestListDetails?: GuestListDetails;
}

// Interactive Star Rating component
const InteractiveStarRating = ({ 
  rating, 
  onRate, 
  icon = "star",
  editable = false 
}: { 
  rating: number; 
  onRate?: (rating: number) => void;
  icon?: "star" | "heart";
  editable?: boolean;
}) => {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const Icon = icon === "heart" ? Heart : Star;
        const displayRating = hoveredRating ?? rating;
        const isActive = star <= Math.floor(displayRating);
        const isHalf = star - 0.5 <= displayRating && star > displayRating;
        
        return (
          <Icon
            key={star}
            className={cn(
              "w-5 h-5 transition-colors",
              editable && "cursor-pointer",
              isActive
                ? icon === "heart" ? "text-teal fill-teal" : "text-gold fill-gold"
                : isHalf
                ? icon === "heart" ? "text-teal fill-teal/50" : "text-gold fill-gold/50"
                : "text-muted-foreground/30"
            )}
            onMouseEnter={() => editable && setHoveredRating(star)}
            onMouseLeave={() => editable && setHoveredRating(null)}
            onClick={() => editable && onRate?.(star)}
          />
        );
      })}
      <span className="ml-2 text-lg font-semibold">{rating.toFixed(1)}</span>
    </div>
  );
};

export function GuestProfileModal({
  guest,
  open,
  onOpenChange,
  currentVenueName = "This Venue",
  onAccept,
  onDecline,
  showRequestActions = false,
  onAvatarUpdate,
  bookingDetails,
  guestListDetails,
}: GuestProfileModalProps) {
  const [personnelRating, setPersonnelRating] = useState(guest?.personnelRating || 0);
  const [avatarUrl, setAvatarUrl] = useState(guest?.avatarUrl || "");
  const isMobile = useIsMobile();
  
  if (!guest) return null;

  const topVenues = guest.topVenues || [
    { venueName: "Brasserie Balzac", visitCount: 32 },
    { venueName: "Bianchi Café", visitCount: 19 },
    { venueName: "Tako", visitCount: 11 },
  ];

  const handleRateGuest = (rating: number) => {
    setPersonnelRating(rating);
    toast.success(`Rated ${guest.name} ${rating} stars`);
  };

  const handleAvatarUpload = (url: string) => {
    setAvatarUrl(url);
    onAvatarUpdate?.(url);
    toast.success("Profile picture updated");
  };

  // Mobile-optimized layout
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full h-[90vh] p-0 overflow-hidden bg-background border-border m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Close Button */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Member ID Card - View only */}
              <div className="flex justify-center">
                <div className="scale-90 origin-center">
                  <MemberIdCard
                    name={guest.name}
                    guestId={guest.guestId}
                    loyaltyLevel={guest.loyaltyLevel}
                    avatarUrl={avatarUrl || guest.avatarUrl}
                  />
                </div>
              </div>

              {/* Ratings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Auto rating</p>
                  <InteractiveStarRating rating={guest.automaticRating} icon="star" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Personnel rating</p>
                  <InteractiveStarRating 
                    rating={personnelRating} 
                    icon="heart" 
                    editable 
                    onRate={handleRateGuest}
                  />
                </div>
              </div>

              {showRequestActions && (
                <div className="flex gap-2">
                  <Button className="flex-1 bg-teal hover:bg-teal/90 gap-2" onClick={onAccept}>
                    <Check className="w-4 h-4" /> Accept
                  </Button>
                  <Button variant="outline" className="flex-1 text-coral hover:text-coral gap-2" onClick={onDecline}>
                    <XIcon className="w-4 h-4" /> Decline
                  </Button>
                </div>
              )}

              {/* Guest List Details - shown when guestListDetails provided */}
              {guestListDetails && (
                <div className="p-4 rounded-lg bg-muted/20">
                  <h4 className="font-semibold text-base mb-3">Guest List Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Guest List</p>
                      <p className="font-medium text-sm">{guestListDetails.listName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Guests</p>
                      <p className="font-medium text-sm">{1 + (guestListDetails.plusGuests || 0)} (+{guestListDetails.plusGuests || 0})</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium text-sm">{guestListDetails.listType || "Standard"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium text-sm">{guestListDetails.eventDate}</p>
                    </div>
                    {guestListDetails.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm text-foreground">{guestListDetails.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Booking Details - shown for bookingDetails provided */}
              {bookingDetails && !guestListDetails && (
                <div className="p-4 rounded-lg bg-muted/20">
                  <h4 className="font-semibold text-base mb-3">Booking Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Table</p>
                      <p className="font-medium text-sm">{bookingDetails?.table || "VIP 1"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Party Size</p>
                      <p className="font-medium text-sm">{bookingDetails?.partySize || 8} guests</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium text-sm">{bookingDetails?.date || "Jan 25, 2024"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-medium text-sm">{bookingDetails?.time || "22:00"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-bold text-lg text-gold">${bookingDetails?.price?.toLocaleString() || "1,500"}</p>
                    </div>
                    {bookingDetails?.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm text-foreground">{bookingDetails.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Stats - Niteways only */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Niteways Stats</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 text-center bg-muted/20 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Visits</p>
                    <p className="text-lg font-bold text-teal">{guest.nitewaysVisits || 248}</p>
                  </div>
                  <div className="p-2 text-center bg-muted/20 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Avg. tip</p>
                    <p className="text-lg font-bold">{guest.nitewaysAvgTip || 3}%</p>
                  </div>
                  <div className="p-2 text-center bg-muted/20 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Avg. bill</p>
                    <p className="text-lg font-bold">{guest.nitewaysAvgBill || 528} kr</p>
                  </div>
                </div>
              </div>

              {/* Instagram - 3x2 grid */}
              {guest.instagramHandle && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    <span className="font-semibold text-sm">Instagram</span>
                    <span className="text-xs text-muted-foreground">{guest.instagramHandle}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(guest.instagramPhotos || [
                      "https://images.unsplash.com/photo-1534308143481-c55f00be8bd7?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1574391884720-bba3740c59d1?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1506485338023-6ce5f36692df?w=200&h=200&fit=crop",
                    ]).slice(0, 6).map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-md overflow-hidden bg-muted">
                        <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Contact</h4>
                <div className="space-y-2">
                  {guest.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{guest.phone}</span>
                    </div>
                  )}
                  {guest.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{guest.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop layout - Member card with booking details underneath
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-6 top-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <span className="text-sm">Close</span>
              <X className="w-5 h-5" />
            </button>

            {/* Member ID Card - Centered, view only */}
            <div className="flex justify-center mb-6">
              <MemberIdCard
                name={guest.name}
                guestId={guest.guestId}
                loyaltyLevel={guest.loyaltyLevel}
                avatarUrl={avatarUrl || guest.avatarUrl}
                size="large"
              />
            </div>

            {/* Ratings Row - Below card */}
            <div className="flex justify-center gap-12 mb-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Auto rating</p>
                <InteractiveStarRating rating={guest.automaticRating} icon="star" />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Personnel rating</p>
                <InteractiveStarRating 
                  rating={personnelRating} 
                  icon="heart" 
                  editable 
                  onRate={handleRateGuest}
                />
              </div>
            </div>

            {/* Guest List Details - shown when guestListDetails provided - horizontal layout */}
            {guestListDetails && (
              <div className="p-5 rounded-lg bg-muted/20 mb-6">
                <h4 className="font-semibold text-lg mb-4">Guest List Details</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Guest List</p>
                    <p className="font-medium">{guestListDetails.listName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Guests</p>
                    <p className="font-medium">{1 + (guestListDetails.plusGuests || 0)} (+{guestListDetails.plusGuests || 0})</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium">{guestListDetails.listType || "Standard"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{guestListDetails.eventDate}</p>
                  </div>
                  {guestListDetails.notes && (
                    <div className="col-span-4">
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm text-foreground mt-1 p-2 rounded bg-muted/30">{guestListDetails.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Booking Details - shown for request actions or when bookingDetails provided - horizontal layout below member card */}
            {(showRequestActions || bookingDetails) && !guestListDetails && (
              <div className="p-5 rounded-lg bg-muted/20 mb-6">
                <h4 className="font-semibold text-lg mb-4">Booking Details</h4>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Table</p>
                    <p className="font-medium text-lg">{bookingDetails?.table || "VIP 1"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Party Size</p>
                    <p className="font-medium text-lg">{bookingDetails?.partySize || 8} guests</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium text-lg">{bookingDetails?.date || "Jan 25, 2024"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium text-lg">{bookingDetails?.time || "22:00"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-bold text-2xl text-gold">${bookingDetails?.price?.toLocaleString() || "1,500"}</p>
                  </div>
                  {bookingDetails?.notes && (
                    <div className="col-span-5">
                      <p className="text-xs text-muted-foreground">Notes from Guest</p>
                      <p className="text-sm text-foreground mt-1 p-3 rounded bg-muted/30 border border-border">{bookingDetails.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Accept/Decline Actions - below booking details */}
            {showRequestActions && (
              <div className="flex gap-3 mb-6">
                <Button 
                  className="flex-1 bg-teal hover:bg-teal/90 gap-2 h-12"
                  onClick={onAccept}
                >
                  <Check className="w-5 h-5" />
                  Accept Request
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 text-coral hover:text-coral border-coral/30 hover:bg-coral/10 gap-2 h-12"
                  onClick={onDecline}
                >
                  <XIcon className="w-5 h-5" />
                  Decline
                </Button>
              </div>
            )}

            <Separator className="my-4" />

            {/* Stats Section - Niteways only */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Niteways Stats</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">No. visits</p>
                  <p className="text-3xl font-bold text-teal">{guest.nitewaysVisits || 248}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. tip</p>
                  <p className="text-3xl font-bold">{guest.nitewaysAvgTip || 3}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg. bill</p>
                  <p className="text-3xl font-bold">{guest.nitewaysAvgBill || 528} kr</p>
                </div>
              </div>
            </div>

            {/* Instagram Section */}
            {guest.instagramHandle && (
              <>
                <Separator className="my-4" />
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    <span className="font-semibold text-sm">Instagram</span>
                    <a 
                      href={`https://instagram.com/${guest.instagramHandle.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-pink-500 transition-colors"
                    >
                      {guest.instagramHandle}
                    </a>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 max-w-md">
                    {(guest.instagramPhotos || [
                      "https://images.unsplash.com/photo-1534308143481-c55f00be8bd7?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1574391884720-bba3740c59d1?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1506485338023-6ce5f36692df?w=200&h=200&fit=crop",
                    ]).slice(0, 6).map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={photo} 
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Contact Info */}
            <Separator className="my-4" />
            <div>
              <h4 className="font-semibold mb-3">Contact Information</h4>
              <div className="flex gap-6">
                {guest.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{guest.phone}</span>
                  </div>
                )}
                {guest.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{guest.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
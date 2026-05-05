import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GuestProfilePictureUpload } from "@/components/guests/GuestProfilePictureUpload";
import { MemberIdCard } from "@/components/guests/MemberIdCard";
import { 
  ArrowLeft, Star, Phone, Mail, Calendar, 
  Award, Building2, Instagram, Activity, MapPin,
  Ticket, Users, Clock, ChevronRight, Eye, Edit, Save,
  Music, TrendingUp, Heart, ExternalLink, Plus, Trash2,
  TableProperties, UserCheck, CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GuestVisit {
  id: string;
  venueName: string;
  venueId: string;
  visitDate: string;
  visitTime: string;
  checkInType: "table" | "guestlist" | "ticket" | "walk-in";
  spendAmount: number;
  tipAmount?: number;
  tableNumber?: string;
  guests?: number;
  notes?: string;
}

interface BookingHistory {
  id: string;
  type: "table" | "guestlist" | "ticket";
  venueName: string;
  date: string;
  time: string;
  details: string;
  status: string;
  guests: number;
  amount?: number;
  tableNumber?: string;
  ticketType?: string;
  promoter?: string;
  notes?: string;
}

interface AppActivity {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
  category: "navigation" | "booking" | "profile" | "payment" | "social";
}

interface SocialMedia {
  platform: string;
  handle: string;
  url: string;
  photos?: string[];
}

interface UserInsights {
  favoriteGenres: string[];
  preferredVenueTypes: string[];
  averagePartySize: number;
  preferredDays: string[];
  spendingTrend: "increasing" | "stable" | "decreasing";
  loyaltyPoints: number;
  redemptions: number;
}

// Loyalty ring colors for profile picture border
const loyaltyRingColors = {
  bronze: "ring-amber-700",
  silver: "ring-zinc-400",
  gold: "ring-gold",
  platinum: "ring-purple",
};

const loyaltyBgColors = {
  bronze: "from-amber-900/30 to-amber-700/10",
  silver: "from-zinc-500/30 to-zinc-400/10",
  gold: "from-gold/30 to-gold/10",
  platinum: "from-purple/30 to-purple/10",
};

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={cn(
          "w-5 h-5",
          star <= Math.floor(rating)
            ? "text-gold fill-gold"
            : star - 0.5 <= rating
            ? "text-gold fill-gold/50"
            : "text-muted-foreground/30"
        )}
      />
    ))}
    <span className="ml-2 text-lg font-semibold">{rating.toFixed(1)}</span>
  </div>
);

const getCategoryColor = (category: AppActivity["category"]) => {
  switch (category) {
    case "booking": return "bg-purple/20 text-purple";
    case "payment": return "bg-teal/20 text-teal";
    case "profile": return "bg-gold/20 text-gold";
    case "social": return "bg-coral/20 text-coral";
    default: return "bg-muted text-muted-foreground";
  }
};

const getCheckInTypeColor = (type: GuestVisit["checkInType"]) => {
  switch (type) {
    case "table": return "bg-purple/10 text-purple border-purple/30";
    case "guestlist": return "bg-teal/10 text-teal border-teal/30";
    case "ticket": return "bg-gold/10 text-gold border-gold/30";
    default: return "bg-muted/10 text-muted-foreground";
  }
};

const AdminGuestProfile = () => {
  const navigate = useNavigate();
  const { guestId } = useParams();
  const [selectedActivity, setSelectedActivity] = useState<AppActivity | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<GuestVisit | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingHistory | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Guest state synced from database
  const [guest, setGuest] = useState({
    id: "",
    guestId: "",
    name: "",
    email: "",
    phone: "",
    avatarUrl: "",
    loyaltyLevel: "bronze" as "bronze" | "silver" | "gold" | "platinum",
    automaticRating: 5.0,
    totalVisits: 0,
    totalSpend: 0,
    avgSpend: 0,
    about: "",
    dateOfBirth: "",
    gender: "",
    preferredGenres: "",
    dietaryRestrictions: "",
  });

  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([
    { platform: "Instagram", handle: "@alex_lindberg", url: "https://instagram.com/alex_lindberg", photos: [] }
  ]);

  const [insights, setInsights] = useState<UserInsights>({
    favoriteGenres: ["House", "Tech House", "Deep House"],
    preferredVenueTypes: ["Nightclub", "Rooftop Bar"],
    averagePartySize: 4,
    preferredDays: ["Friday", "Saturday"],
    spendingTrend: "increasing",
    loyaltyPoints: 2450,
    redemptions: 8
  });

  const [venueVisits, setVenueVisits] = useState<GuestVisit[]>([]);
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [appActivity, setAppActivity] = useState<AppActivity[]>([]);

  // Fetch guest data from database
  useEffect(() => {
    const fetchGuestData = async () => {
      if (!guestId) return;
      
      setIsLoading(true);
      try {
        const { data: guestData, error } = await supabase
          .from('guests')
          .select('*')
          .eq('guest_id', guestId)
          .single();

        if (error) throw error;

        if (guestData) {
          setGuest({
            id: guestData.id,
            guestId: guestData.guest_id,
            name: guestData.name,
            email: guestData.email || "",
            phone: guestData.phone || "",
            avatarUrl: guestData.avatar_url || "",
            loyaltyLevel: (guestData.loyalty_level || "bronze") as "bronze" | "silver" | "gold" | "platinum",
            automaticRating: guestData.automatic_rating || 5.0,
            totalVisits: guestData.total_visits || 0,
            totalSpend: guestData.total_spend || 0,
            avgSpend: guestData.avg_spend || 0,
            about: guestData.about || "",
            dateOfBirth: guestData.date_of_birth || "",
            gender: "",
            preferredGenres: "",
            dietaryRestrictions: "",
          });

          // Set social media from instagram
          if (guestData.instagram_handle) {
            setSocialMedia([{
              platform: "Instagram",
              handle: guestData.instagram_handle,
              url: `https://instagram.com/${guestData.instagram_handle.replace('@', '')}`,
              photos: guestData.instagram_photos || []
            }]);
          }
        }

        // Fetch visits
        const { data: visits } = await supabase
          .from('guest_visits')
          .select('*, venues(name)')
          .eq('guest_id', guestData?.id)
          .order('visit_date', { ascending: false });

        if (visits) {
          setVenueVisits(visits.map(v => ({
            id: v.id,
            venueName: v.venues?.name || "Unknown Venue",
            venueId: v.venue_id,
            visitDate: new Date(v.visit_date).toLocaleDateString(),
            visitTime: new Date(v.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            checkInType: "walk-in" as const,
            spendAmount: v.spend_amount || 0,
            notes: v.notes
          })));
        }

        // Fetch bookings
        const { data: tableBookings } = await supabase
          .from('table_bookings')
          .select('*, venues(name)')
          .eq('guest_id', guestData?.id)
          .order('booking_date', { ascending: false });

        const { data: guestListEntries } = await supabase
          .from('guest_list_entries')
          .select('*, venues(name)')
          .eq('guest_id', guestData?.id)
          .order('event_date', { ascending: false });

        const { data: ticketPurchases } = await supabase
          .from('ticket_purchases')
          .select('*, venues(name)')
          .eq('guest_id', guestData?.id)
          .order('event_date', { ascending: false });

        const allBookings: BookingHistory[] = [
          ...(tableBookings || []).map(b => ({
            id: b.id,
            type: "table" as const,
            venueName: b.venues?.name || "Unknown",
            date: b.booking_date,
            time: b.booking_time,
            details: `Table ${b.table_number}`,
            status: b.status,
            guests: b.party_size,
            amount: b.price,
            tableNumber: b.table_number,
            notes: b.notes
          })),
          ...(guestListEntries || []).map(g => ({
            id: g.id,
            type: "guestlist" as const,
            venueName: g.venues?.name || "Unknown",
            date: g.event_date,
            time: "",
            details: `${g.list_type} Guest List`,
            status: g.status,
            guests: (g.plus_guests || 0) + 1,
            promoter: g.promoter,
            notes: g.notes
          })),
          ...(ticketPurchases || []).map(t => ({
            id: t.id,
            type: "ticket" as const,
            venueName: t.venues?.name || "Unknown",
            date: t.event_date,
            time: "",
            details: `${t.event_name} - ${t.ticket_type}`,
            status: t.status,
            guests: t.quantity || 1,
            amount: t.price * (t.quantity || 1),
            ticketType: t.ticket_type
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setBookingHistory(allBookings);

      } catch (error) {
        console.error('Error fetching guest:', error);
        // Use mock data as fallback
        setGuest({
          id: "guest-1",
          guestId: guestId || "NW-001234",
          name: "Alexander Lindberg",
          email: "alex.lindberg@email.com",
          phone: "+46 70 123 4567",
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
          loyaltyLevel: "gold",
          automaticRating: 4.7,
          totalVisits: 47,
          totalSpend: 285000,
          avgSpend: 6063,
          about: "Tech entrepreneur and nightlife enthusiast.",
          dateOfBirth: "1992-05-15",
          gender: "Male",
          preferredGenres: "House, Tech House",
          dietaryRestrictions: "None",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuestData();
  }, [guestId]);

  // Mock app activity
  useEffect(() => {
    setAppActivity([
      { id: "a1", action: "Opened app", timestamp: "2024-12-15 22:45", details: "iOS Device, Stockholm", category: "navigation" },
      { id: "a2", action: "Viewed venue profile", timestamp: "2024-12-15 22:46", details: "Club Nova", category: "navigation" },
      { id: "a3", action: "Made table booking request", timestamp: "2024-12-15 22:48", details: "VIP Table for 6 guests", category: "booking" },
      { id: "a4", action: "Payment processed", timestamp: "2024-12-15 22:50", details: "Deposit paid - 3000 kr", category: "payment" },
      { id: "a5", action: "Connected Instagram", timestamp: "2024-12-05 18:30", details: "@alex_lindberg", category: "social" },
    ]);
  }, []);

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('guests')
        .update({
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          about: guest.about,
          date_of_birth: guest.dateOfBirth || null,
          instagram_handle: socialMedia[0]?.handle,
        })
        .eq('id', guest.id);

      if (error) throw error;
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    }
  };

  const addSocialMedia = () => {
    setSocialMedia([...socialMedia, { platform: "TikTok", handle: "", url: "" }]);
  };

  const removeSocialMedia = (index: number) => {
    setSocialMedia(socialMedia.filter((_, i) => i !== index));
  };

  const updateSocialMedia = (index: number, field: keyof SocialMedia, value: string) => {
    const updated = [...socialMedia];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'handle' && updated[index].platform === 'Instagram') {
      updated[index].url = `https://instagram.com/${value.replace('@', '')}`;
    }
    setSocialMedia(updated);
  };

  if (isLoading) {
    return (
      <AdminLayout title="User Profile" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Profile" subtitle="Detailed view of user information and activity">
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button 
            variant={isEditing ? "default" : "outline"} 
            className="gap-2"
            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Edit Profile
              </>
            )}
          </Button>
        </div>

        {/* Profile Card - Using MemberIdCard component */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-6"
        >
          <MemberIdCard
            name={guest.name}
            guestId={guest.guestId}
            loyaltyLevel={guest.loyaltyLevel}
            avatarUrl={guest.avatarUrl}
          />
          
          {/* Profile Picture Upload when editing */}
          {isEditing && (
            <div className="glass-card p-4 rounded-xl">
              <Label className="mb-3 block">Profile Picture</Label>
              <GuestProfilePictureUpload
                currentUrl={guest.avatarUrl}
                name={guest.name}
                onUpload={(url) => setGuest({ ...guest, avatarUrl: url })}
                size="lg"
              />
            </div>
          )}
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="profile">Profile Info</TabsTrigger>
              <TabsTrigger value="insights">Insights & Stats</TabsTrigger>
              <TabsTrigger value="visits">Visit History</TabsTrigger>
              <TabsTrigger value="bookings">Booking History</TabsTrigger>
              <TabsTrigger value="activity">App Activity</TabsTrigger>
            </TabsList>

            {/* Profile Info Tab - with Social Media */}
            <TabsContent value="profile">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        {isEditing ? (
                          <Input 
                            value={guest.name} 
                            onChange={(e) => setGuest({...guest, name: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm p-2 bg-muted/30 rounded-md">{guest.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        {isEditing ? (
                          <Input 
                            type="email"
                            value={guest.email} 
                            onChange={(e) => setGuest({...guest, email: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm p-2 bg-muted/30 rounded-md flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {guest.email || "Not provided"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        {isEditing ? (
                          <Input 
                            value={guest.phone} 
                            onChange={(e) => setGuest({...guest, phone: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm p-2 bg-muted/30 rounded-md flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {guest.phone || "Not provided"}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Member ID</Label>
                        <p className="text-sm p-2 bg-muted/30 rounded-md font-mono">{guest.guestId}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        {isEditing ? (
                          <Input 
                            type="date"
                            value={guest.dateOfBirth} 
                            onChange={(e) => setGuest({...guest, dateOfBirth: e.target.value})}
                          />
                        ) : (
                          <p className="text-sm p-2 bg-muted/30 rounded-md flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {guest.dateOfBirth ? new Date(guest.dateOfBirth).toLocaleDateString() : "Not provided"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>About</Label>
                      {isEditing ? (
                        <Textarea 
                          value={guest.about} 
                          onChange={(e) => setGuest({...guest, about: e.target.value})}
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm p-2 bg-muted/30 rounded-md">{guest.about || "No bio provided"}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Social Media Section */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Instagram className="w-5 h-5" />
                        Social Media
                      </span>
                      {isEditing && (
                        <Button variant="ghost" size="sm" onClick={addSocialMedia}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {socialMedia.map((social, idx) => (
                      <div key={idx} className="space-y-3">
                        <div className="flex items-center justify-between">
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input 
                                value={social.platform}
                                onChange={(e) => updateSocialMedia(idx, 'platform', e.target.value)}
                                className="w-28"
                              />
                              <Input 
                                value={social.handle}
                                onChange={(e) => updateSocialMedia(idx, 'handle', e.target.value)}
                                placeholder="@username"
                                className="flex-1"
                              />
                              <Button variant="ghost" size="icon" onClick={() => removeSocialMedia(idx)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <a 
                              href={social.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-pink-500 transition-colors"
                            >
                              <Instagram className="w-4 h-4" />
                              {social.handle}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        
                        {/* Social Photos Grid */}
                        {social.photos && social.photos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {social.photos.slice(0, 6).map((photo, photoIdx) => (
                              <div key={photoIdx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                                <img 
                                  src={photo} 
                                  alt={`${social.platform} photo ${photoIdx + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {(!social.photos || social.photos.length === 0) && (
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              "https://images.unsplash.com/photo-1534308143481-c55f00be8bd7?w=100&h=100&fit=crop",
                              "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop",
                              "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=100&h=100&fit=crop",
                              "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=100&h=100&fit=crop",
                              "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop",
                              "https://images.unsplash.com/photo-1506485338023-6ce5f36692df?w=100&h=100&fit=crop",
                            ].map((photo, photoIdx) => (
                              <div key={photoIdx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                                <img 
                                  src={photo} 
                                  alt={`${social.platform} photo ${photoIdx + 1}`}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Insights & Statistics Tab */}
            <TabsContent value="insights">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Music Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {insights.favoriteGenres.map((genre, idx) => (
                        <Badge key={idx} variant="outline" className="bg-purple/10 text-purple border-purple/30">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Venue Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {insights.preferredVenueTypes.map((type, idx) => (
                        <Badge key={idx} variant="outline" className="bg-teal/10 text-teal border-teal/30">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Preferred Days
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {insights.preferredDays.map((day, idx) => (
                        <Badge key={idx} variant="outline" className="bg-gold/10 text-gold border-gold/30">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      User Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <p className="text-3xl font-bold text-teal">{guest.totalVisits}</p>
                        <p className="text-sm text-muted-foreground">Total Visits</p>
                      </div>
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <p className="text-3xl font-bold">{guest.avgSpend.toLocaleString()} kr</p>
                        <p className="text-sm text-muted-foreground">Avg. Spend</p>
                      </div>
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <p className="text-3xl font-bold">{guest.totalSpend.toLocaleString()} kr</p>
                        <p className="text-sm text-muted-foreground">Total Spend</p>
                      </div>
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <p className="text-3xl font-bold text-gold">{insights.loyaltyPoints}</p>
                        <p className="text-sm text-muted-foreground">Loyalty Points</p>
                      </div>
                      <div className="text-center p-4 bg-muted/20 rounded-lg">
                        <p className="text-3xl font-bold">{insights.averagePartySize}</p>
                        <p className="text-sm text-muted-foreground">Avg. Party Size</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Visit History Tab - Enhanced */}
            <TabsContent value="visits">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="glass-card lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Complete Visit History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {venueVisits.length === 0 && bookingHistory.map((booking) => (
                          <div 
                            key={booking.id}
                            onClick={() => setSelectedBooking(booking)}
                            className={cn(
                              "p-4 rounded-lg cursor-pointer transition-colors",
                              selectedBooking?.id === booking.id 
                                ? "bg-primary/10 border border-primary/30" 
                                : "bg-muted/20 hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className={getCheckInTypeColor(booking.type)}>
                                {booking.type === "table" ? "Table Booking" : booking.type === "guestlist" ? "Guest List" : "Ticket"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{booking.date}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{booking.venueName}</p>
                                <p className="text-sm text-muted-foreground">{booking.details}</p>
                              </div>
                              {booking.amount && (
                                <p className="font-semibold">{booking.amount.toLocaleString()} kr</p>
                              )}
                            </div>
                          </div>
                        ))}
                        {venueVisits.map((visit) => (
                          <div 
                            key={visit.id}
                            onClick={() => setSelectedVisit(visit)}
                            className={cn(
                              "p-4 rounded-lg cursor-pointer transition-colors",
                              selectedVisit?.id === visit.id 
                                ? "bg-primary/10 border border-primary/30" 
                                : "bg-muted/20 hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className={getCheckInTypeColor(visit.checkInType)}>
                                {visit.checkInType === "table" ? "Table" : 
                                 visit.checkInType === "guestlist" ? "Guest List" : 
                                 visit.checkInType === "ticket" ? "Ticket" : "Walk-in"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{visit.visitDate} • {visit.visitTime}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{visit.venueName}</p>
                                {visit.tableNumber && (
                                  <p className="text-sm text-muted-foreground">Table {visit.tableNumber}</p>
                                )}
                              </div>
                              <p className="font-semibold">{visit.spendAmount.toLocaleString()} kr</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Visit Details Panel */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Visit Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedVisit || selectedBooking ? (
                      <div className="space-y-4">
                        {selectedBooking && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Venue</p>
                              <p className="font-medium">{selectedBooking.venueName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Type</p>
                              <Badge className={getCheckInTypeColor(selectedBooking.type)}>
                                {selectedBooking.type}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Date & Time</p>
                              <p className="text-sm">{selectedBooking.date} {selectedBooking.time && `at ${selectedBooking.time}`}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Details</p>
                              <p className="text-sm">{selectedBooking.details}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Party Size</p>
                              <p className="text-sm">{selectedBooking.guests} guests</p>
                            </div>
                            {selectedBooking.tableNumber && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase">Table</p>
                                <p className="text-sm">{selectedBooking.tableNumber}</p>
                              </div>
                            )}
                            {selectedBooking.amount && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase">Amount</p>
                                <p className="text-lg font-bold text-teal">{selectedBooking.amount.toLocaleString()} kr</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Status</p>
                              <Badge variant="outline">{selectedBooking.status}</Badge>
                            </div>
                            {selectedBooking.promoter && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase">Promoter</p>
                                <p className="text-sm">{selectedBooking.promoter}</p>
                              </div>
                            )}
                            {selectedBooking.notes && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase">Notes</p>
                                <p className="text-sm">{selectedBooking.notes}</p>
                              </div>
                            )}
                          </>
                        )}
                        {selectedVisit && (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Venue</p>
                              <p className="font-medium">{selectedVisit.venueName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Check-in Type</p>
                              <Badge className={getCheckInTypeColor(selectedVisit.checkInType)}>
                                {selectedVisit.checkInType}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Date & Time</p>
                              <p className="text-sm">{selectedVisit.visitDate} at {selectedVisit.visitTime}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase">Spend Amount</p>
                              <p className="text-lg font-bold text-teal">{selectedVisit.spendAmount.toLocaleString()} kr</p>
                            </div>
                            {selectedVisit.tipAmount && (
                              <div>
                                <p className="text-xs text-muted-foreground uppercase">Tip</p>
                                <p className="text-sm">{selectedVisit.tipAmount.toLocaleString()} kr</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Click on a visit to view details</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Booking History Tab */}
            <TabsContent value="bookings">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Complete Booking History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {bookingHistory.map((booking) => (
                        <div 
                          key={booking.id} 
                          className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <div className="flex items-center gap-4">
                            <Badge variant="outline" className={cn(
                              "text-xs w-24 justify-center",
                              booking.type === "table" && "bg-purple/10 text-purple border-purple/30",
                              booking.type === "guestlist" && "bg-teal/10 text-teal border-teal/30",
                              booking.type === "ticket" && "bg-gold/10 text-gold border-gold/30"
                            )}>
                              {booking.type === "table" ? "Table" : booking.type === "guestlist" ? "Guest List" : "Ticket"}
                            </Badge>
                            <div>
                              <p className="font-medium">{booking.details}</p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {booking.venueName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {booking.date}
                                </span>
                                {booking.time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {booking.time}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {booking.guests} guests
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {booking.amount && (
                              <p className="font-semibold">{booking.amount.toLocaleString()} kr</p>
                            )}
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              booking.status === "Completed" && "bg-teal/10 text-teal",
                              booking.status === "confirmed" && "bg-teal/10 text-teal",
                              booking.status === "Checked In" && "bg-gold/10 text-gold",
                              booking.status === "Used" && "bg-muted text-muted-foreground"
                            )}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* App Activity Tab */}
            <TabsContent value="activity">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    App Activity Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <ScrollArea className="h-[500px] lg:col-span-2">
                      <div className="space-y-2">
                        {appActivity.map((activity) => (
                          <div 
                            key={activity.id} 
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                              selectedActivity?.id === activity.id 
                                ? "bg-primary/10 border border-primary/30" 
                                : "bg-muted/20 hover:bg-muted/30"
                            )}
                            onClick={() => setSelectedActivity(activity)}
                          >
                            <div className="flex items-center gap-3">
                              <Badge className={cn("text-xs", getCategoryColor(activity.category))}>
                                {activity.category}
                              </Badge>
                              <div>
                                <p className="font-medium text-sm">{activity.action}</p>
                                <p className="text-xs text-muted-foreground">{activity.details}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <div className="bg-muted/20 rounded-lg p-4">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Activity Details
                      </h4>
                      {selectedActivity ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Action</p>
                            <p className="font-medium">{selectedActivity.action}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Category</p>
                            <Badge className={cn("mt-1", getCategoryColor(selectedActivity.category))}>
                              {selectedActivity.category}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Details</p>
                            <p className="text-sm">{selectedActivity.details}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase">Timestamp</p>
                            <p className="text-sm">{selectedActivity.timestamp}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Click on an activity to view details</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminGuestProfile;

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Search,
  TrendingUp,
  Music,
  DollarSign,
  CalendarCheck,
  Tag,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { GuestProfileModal } from "@/components/guests/GuestProfileModal";
import { toast } from "sonner";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { VenueIndicatorPill } from "@/components/layout/VenueIndicatorPill";

const DEFAULT_VENUE_ID = "f5d0702a-6bd9-42e1-bf2d-87681c103d17";

interface Guest {
  id: string;
  guest_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_visits: number | null;
  total_spend: number | null;
  avg_spend: number | null;
  loyalty_level: string | null;
  automatic_rating: number | null;
  personnel_rating: number | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  instagram_photos: string[] | null;
  about: string | null;
  date_of_birth: string | null;
  status: string | null;
  venue_id: string | null;
  created_at: string;
  updated_at: string;
}

const loyaltyStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  diamond: { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30", label: "Diamond" },
  platinum: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", label: "Platinum" },
  gold: { bg: "bg-gold/20", text: "text-gold", border: "border-gold/30", label: "Gold" },
  silver: { bg: "bg-slate-400/20", text: "text-slate-300", border: "border-slate-400/30", label: "Silver" },
  bronze: { bg: "bg-amber-600/20", text: "text-amber-500", border: "border-amber-600/30", label: "Bronze" },
};

const SmartCRM = () => {
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId 
    ? impersonatedVenueId 
    : DEFAULT_VENUE_ID;
    
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLoyalty, setSelectedLoyalty] = useState<string>("all");
  const [visitCountFilter, setVisitCountFilter] = useState<string>("all");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch guests from database - filtered by venue_id
  const fetchGuests = async () => {
    try {
      let query = supabase
        .from('guests')
        .select('*')
        .order('total_visits', { ascending: false });
      
      // Filter by venue_id for venue-specific CRM
      query = query.eq('venue_id', activeVenueId);

      const { data, error } = await query;

      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast.error('Failed to load guests');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription - scoped to venue
  useEffect(() => {
    fetchGuests();

    const channel = supabase
      .channel(`guests-realtime-${activeVenueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
          filter: `venue_id=eq.${activeVenueId}`
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setGuests(prev => [payload.new as Guest, ...prev]);
            toast.success('New guest added');
          } else if (payload.eventType === 'UPDATE') {
            setGuests(prev => prev.map(g => 
              g.id === payload.new.id ? payload.new as Guest : g
            ));
            // Update selected guest if it's the one being updated
            setSelectedGuest(prev => 
              prev?.id === payload.new.id ? payload.new as Guest : prev
            );
          } else if (payload.eventType === 'DELETE') {
            setGuests(prev => prev.filter(g => g.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeVenueId]);

  // Filter guests
  const filteredGuests = guests.filter((guest) => {
    const matchesSearch = 
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (guest.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (guest.phone?.includes(searchQuery) ?? false);
    
    const matchesLoyalty = selectedLoyalty === "all" || guest.loyalty_level === selectedLoyalty;
    
    let matchesVisitCount = true;
    if (visitCountFilter !== "all") {
      const visits = guest.total_visits || 0;
      switch (visitCountFilter) {
        case "0":
          matchesVisitCount = visits === 0;
          break;
        case "1-5":
          matchesVisitCount = visits >= 1 && visits <= 5;
          break;
        case "6-10":
          matchesVisitCount = visits >= 6 && visits <= 10;
          break;
        case "11-20":
          matchesVisitCount = visits >= 11 && visits <= 20;
          break;
        case "20+":
          matchesVisitCount = visits > 20;
          break;
      }
    }
    
    return matchesSearch && matchesLoyalty && matchesVisitCount;
  });

  const stats = {
    totalGuests: guests.length,
    diamond: guests.filter(g => g.loyalty_level === "diamond").length,
    platinum: guests.filter(g => g.loyalty_level === "platinum").length,
    gold: guests.filter(g => g.loyalty_level === "gold").length,
    avgSpend: guests.length > 0 
      ? Math.round(guests.reduce((sum, g) => sum + (g.avg_spend || 0), 0) / guests.length) 
      : 0,
    totalRevenue: guests.reduce((sum, g) => sum + (g.total_spend || 0), 0),
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLoyalty("all");
    setVisitCountFilter("all");
  };

  const hasActiveFilters = searchQuery || selectedLoyalty !== "all" || visitCountFilter !== "all";

  // Transform guest data for modal
  const transformGuestForModal = (guest: Guest) => ({
    id: guest.id,
    guestId: guest.guest_id,
    name: guest.name,
    email: guest.email || "",
    phone: guest.phone || "",
    avatarUrl: guest.avatar_url || "",
    loyaltyLevel: (guest.loyalty_level || "bronze") as "bronze" | "silver" | "gold" | "platinum",
    automaticRating: guest.automatic_rating || 5,
    personnelRating: guest.personnel_rating || 5,
    totalVisits: guest.total_visits || 0,
    totalSpend: guest.total_spend || 0,
    avgSpend: guest.avg_spend || 0,
    avgTip: Math.round((guest.avg_spend || 0) * 0.18),
    about: guest.about || "",
    instagramHandle: guest.instagram_handle || "",
    instagramPhotos: guest.instagram_photos || [],
    topVenues: [],
    bookingHistory: [],
    appActivity: [],
    nitewaysVisits: guest.total_visits || 0,
    nitewaysAvgTip: Math.round((guest.avg_spend || 0) * 0.18),
    nitewaysAvgBill: guest.avg_spend || 0,
    notes: guest.about || "",
  });

  return (
    <AdminLayout title="Smart CRM" subtitle="Customer insights and relationship management">
      <div className="space-y-6">
        {/* Venue Indicator (impersonation) */}
        <VenueIndicatorPill />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Guests</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalGuests}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Diamond Members</p>
            <p className="text-2xl font-bold text-cyan-400">{stats.diamond}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Avg Spend</p>
            <p className="text-2xl font-bold text-gold">${stats.avgSpend.toLocaleString()}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Lifetime Revenue</p>
            <p className="text-2xl font-bold text-teal">${stats.totalRevenue.toLocaleString()}</p>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="glass-card p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-primary/10")}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                    !
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchGuests}
                disabled={loading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-4 pt-4 border-t border-border/50"
            >
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Loyalty Level</Label>
                <Select value={selectedLoyalty} onValueChange={setSelectedLoyalty}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Visit Count</Label>
                <Select value={visitCountFilter} onValueChange={setVisitCountFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All visits" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Visits</SelectItem>
                    <SelectItem value="0">No visits</SelectItem>
                    <SelectItem value="1-5">1-5 visits</SelectItem>
                    <SelectItem value="6-10">6-10 visits</SelectItem>
                    <SelectItem value="11-20">11-20 visits</SelectItem>
                    <SelectItem value="20+">20+ visits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Clear filters
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Loyalty Tabs */}
        <Tabs defaultValue="all" className="space-y-4" onValueChange={setSelectedLoyalty}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">All ({guests.length})</TabsTrigger>
            <TabsTrigger value="diamond" className="data-[state=active]:text-cyan-400">
              Diamond ({stats.diamond})
            </TabsTrigger>
            <TabsTrigger value="platinum" className="data-[state=active]:text-purple-400">
              Platinum ({stats.platinum})
            </TabsTrigger>
            <TabsTrigger value="gold" className="data-[state=active]:text-gold">
              Gold ({stats.gold})
            </TabsTrigger>
            <TabsTrigger value="silver" className="data-[state=active]:text-slate-300">
              Silver
            </TabsTrigger>
            <TabsTrigger value="bronze" className="data-[state=active]:text-amber-500">
              Bronze
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedLoyalty} className="m-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No guests found matching your criteria</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGuests.map((guest, index) => {
                  const loyaltyStyle = loyaltyStyles[guest.loyalty_level || "bronze"] || loyaltyStyles.bronze;
                  
                  return (
                    <motion.div
                      key={guest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="glass-card hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedGuest(guest)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={guest.avatar_url || ""} />
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {guest.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <CardTitle className="text-base">{guest.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{guest.email || "No email"}</p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                loyaltyStyle.bg,
                                loyaltyStyle.text,
                                loyaltyStyle.border
                              )}
                            >
                              {loyaltyStyle.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded-lg bg-muted/50">
                              <CalendarCheck className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-lg font-semibold">{guest.total_visits || 0}</p>
                              <p className="text-xs text-muted-foreground">Visits</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50">
                              <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-lg font-semibold">${guest.avg_spend || 0}</p>
                              <p className="text-xs text-muted-foreground">Avg</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/50">
                              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-lg font-semibold">
                                ${((guest.total_spend || 0) / 1000).toFixed(1)}k
                              </p>
                              <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                          </div>

                          {guest.about && (
                            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                              <Tag className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                              <p className="text-sm text-muted-foreground line-clamp-2">{guest.about}</p>
                            </div>
                          )}

                          <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              ID: <span className="text-foreground font-mono">{guest.guest_id}</span>
                            </p>
                            {guest.instagram_handle && (
                              <p className="text-xs text-muted-foreground">
                                @{guest.instagram_handle}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Guest Profile Modal */}
      {selectedGuest && (
        <GuestProfileModal
          guest={transformGuestForModal(selectedGuest)}
          open={!!selectedGuest}
          onOpenChange={(open) => !open && setSelectedGuest(null)}
        />
      )}
    </AdminLayout>
  );
};

export default SmartCRM;

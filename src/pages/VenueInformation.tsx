import { useState, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { VenueIndicatorPill } from "@/components/layout/VenueIndicatorPill";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Building2,
  MapPin,
  Clock,
  Music,
  FileText,
  Instagram,
  ExternalLink,
  Upload,
  Save,
  Shield,
  Headphones,
  X,
  Plus,
  GripVertical,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AppPreview } from "@/components/venue/AppPreview";

import { getPortalScopeVenueId } from "@/config/venueScope";

interface DaySpecificHours {
  open: string;
  close: string;
}

interface AgeRequirements {
  [day: string]: number;
}

const VenueInformation = () => {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Impersonation context for venue scoping
  const { impersonatedVenueId, isImpersonating } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : getPortalScopeVenueId();
  
  const [openSections, setOpenSections] = useState({
    basic: true,
    location: false,
    hours: false,
    music: false,
    entrance: false,
    links: false,
  });
  // Initialize with empty/default values - data will be fetched from the database
  const getEmptyVenueData = () => ({
    name: "",
    description: "",
    musicGenres: [] as string[],
    openingHours: {} as Record<string, DaySpecificHours>,
    entranceRules: "",
    openingDays: [] as string[],
    location: {
      address: "",
      googleMapsUrl: "",
    },
    spotifyPlaylist: "",
    instagram: "",
    menuPdf: null as File | null,
    ageLimit: 21,
    ageRequirements: {} as AgeRequirements,
    dressCode: "",
    galleryImages: [] as string[],
  });

  const [venueData, setVenueData] = useState(getEmptyVenueData());
  const [isLoading, setIsLoading] = useState(true);

  // Reset state when venue changes
  useEffect(() => {
    setVenueData(getEmptyVenueData());
    setIsLoading(true);
  }, [activeVenueId]);

  // Fetch venue data from Supabase on mount
  useEffect(() => {
    const fetchVenue = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", activeVenueId)
        .single();

      if (error) {
        console.error("Error fetching venue:", error);
        setIsLoading(false);
        return;
      }

      if (data) {
        // Parse opening hours JSON if stored as JSON
        let parsedHours: Record<string, DaySpecificHours> = {};
        if (data.opening_hours) {
          try {
            parsedHours = JSON.parse(data.opening_hours);
          } catch {
            // Fallback to empty if not JSON
          }
        }

        // Parse age requirements JSON
        let ageReqs: AgeRequirements = {};
        if (data.age_requirements) {
          ageReqs = data.age_requirements as AgeRequirements;
        }

        // Directly set venue data from database - don't fall back to previous values
        setVenueData({
          name: data.name || "",
          description: data.description || "",
          musicGenres: data.music_genre ? data.music_genre.split(", ").filter(Boolean) : [],
          openingHours: parsedHours,
          openingDays: data.opening_days ? data.opening_days.split(", ").filter(Boolean) : [],
          entranceRules: data.entrance_rules || "",
          location: {
            address: data.address || "",
            googleMapsUrl: data.address ? `https://maps.google.com/?q=${encodeURIComponent(data.address)}` : "",
          },
          spotifyPlaylist: data.spotify_link || "",
          instagram: data.instagram_handle || "",
          menuPdf: null,
          ageLimit: data.age_limit || 21,
          ageRequirements: ageReqs,
          dressCode: (data as any).dress_code || "",
          galleryImages: data.gallery_images || [],
        });
      }
      setIsLoading(false);
    };

    fetchVenue();

    // Set up real-time subscription
    const channel = supabase
      .channel(`venue-info-updates-${activeVenueId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "venues",
        filter: `id=eq.${activeVenueId}`,
      }, () => {
        fetchVenue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeVenueId]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const genres = ["House", "Tech House", "Deep House", "Hip Hop", "R&B", "EDM", "Latin", "Pop", "Reggaeton", "Afrobeats"];

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: string[] = [];
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
            if (newImages.length === files.length) {
              setVenueData({
                ...venueData,
                galleryImages: [...venueData.galleryImages, ...newImages],
              });
              toast.success(`${files.length} image(s) uploaded`);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setVenueData({
      ...venueData,
      galleryImages: venueData.galleryImages.filter((_, i) => i !== index),
    });
    toast.success("Image removed");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("venues")
        .update({
          name: venueData.name,
          description: venueData.description,
          music_genre: venueData.musicGenres.join(", "),
          opening_hours: JSON.stringify(venueData.openingHours),
          opening_days: venueData.openingDays.join(", "),
          entrance_rules: venueData.entranceRules,
          address: venueData.location.address,
          spotify_link: venueData.spotifyPlaylist,
          instagram_handle: venueData.instagram,
          age_limit: venueData.ageLimit,
          age_requirements: venueData.ageRequirements,
          dress_code: venueData.dressCode,
          gallery_images: venueData.galleryImages,
        })
        .eq("id", activeVenueId);

      if (error) throw error;
      toast.success("Venue information saved successfully");
    } catch (error) {
      console.error("Error saving venue:", error);
      toast.error("Failed to save venue information");
    } finally {
      setIsSaving(false);
    }
  };

  // Update opening hours for a specific day
  const updateOpeningHours = (day: string, field: 'open' | 'close', value: string) => {
    setVenueData(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day.toLowerCase()]: {
          ...prev.openingHours[day.toLowerCase()] || { open: "22:00", close: "04:00" },
          [field]: value,
        },
      },
    }));
  };

  // Update age requirement for a specific day
  const updateAgeRequirement = (day: string, age: number) => {
    setVenueData(prev => ({
      ...prev,
      ageRequirements: {
        ...prev.ageRequirements,
        [day.toLowerCase()]: age,
      },
    }));
  };

  // Get age requirement for a day (fallback to default)
  const getAgeForDay = (day: string): number => {
    return venueData.ageRequirements[day.toLowerCase()] || venueData.ageLimit;
  };

  // Mobile collapsible section component
  const CollapsibleSection = ({ 
    id, 
    title, 
    icon: Icon, 
    children,
    description 
  }: { 
    id: keyof typeof openSections;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    description?: string;
  }) => (
    <Collapsible open={openSections[id]} onOpenChange={() => toggleSection(id)}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{title}</p>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {openSections[id] ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 pt-3 space-y-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  if (isMobile) {
    return (
      <AdminLayout title="Venue Info" subtitle="Manage venue profile">
        <div className="space-y-3 pb-24">
          {/* Venue Indicator Pill for Impersonation */}
          <VenueIndicatorPill />
          
          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
          {/* App Preview Button */}
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 w-full">
                <Smartphone className="w-4 h-4" />
                App Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm bg-transparent border-none shadow-none p-0">
              <DialogHeader className="sr-only">
                <DialogTitle>App Preview</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <AppPreview venueData={venueData} />
              </div>
            </DialogContent>
          </Dialog>

          {/* Basic Information */}
          <CollapsibleSection id="basic" title="Basic Information" icon={Building2} description="Venue name & photos">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Venue Name</Label>
                <Input 
                  value={venueData.name}
                  onChange={(e) => setVenueData({ ...venueData, name: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">About</Label>
                <Textarea 
                  value={venueData.description}
                  onChange={(e) => setVenueData({ ...venueData, description: e.target.value })}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Photos</Label>
                <div className="grid grid-cols-3 gap-2">
                  {venueData.galleryImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border">
                      <img src={img} alt={`Venue ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Location */}
          <CollapsibleSection id="location" title="Location" icon={MapPin} description="Address & map">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Address</Label>
                <Input 
                  value={venueData.location.address}
                  onChange={(e) => setVenueData({ 
                    ...venueData, 
                    location: { ...venueData.location, address: e.target.value }
                  })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Google Maps Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={venueData.location.googleMapsUrl}
                    onChange={(e) => setVenueData({ 
                      ...venueData, 
                      location: { ...venueData.location, googleMapsUrl: e.target.value }
                    })}
                    className="h-9 text-sm flex-1"
                  />
                  <Button variant="outline" size="icon" className="h-9 w-9" asChild>
                    <a href={venueData.location.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Opening Hours */}
          <CollapsibleSection id="hours" title="Opening Hours" icon={Clock} description="Schedule & days">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Opening Days</Label>
                <div className="flex flex-wrap gap-1.5">
                  {days.map((day) => (
                    <Badge 
                      key={day}
                      variant="outline"
                      className={cn(
                        "cursor-pointer text-[10px] px-2 py-0.5",
                        venueData.openingDays.includes(day) 
                          ? "bg-primary/20 text-primary border-primary/30" 
                          : ""
                      )}
                      onClick={() => {
                        if (venueData.openingDays.includes(day)) {
                          setVenueData({ 
                            ...venueData, 
                            openingDays: venueData.openingDays.filter(d => d !== day) 
                          });
                        } else {
                          setVenueData({ 
                            ...venueData, 
                            openingDays: [...venueData.openingDays, day] 
                          });
                        }
                      }}
                    >
                      {day.slice(0, 3)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {venueData.openingDays.map((day) => (
                  <div key={day} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                    <span className="w-14 text-xs font-medium">{day.slice(0, 3)}</span>
                    <Input type="time" defaultValue="22:00" className="flex-1 h-8 text-xs" />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input type="time" defaultValue="04:00" className="flex-1 h-8 text-xs" />
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          {/* Music */}
          <CollapsibleSection id="music" title="Music" icon={Music} description="Genres & vibe">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Music Genres</Label>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((genre) => (
                    <Badge 
                      key={genre}
                      variant="outline"
                      className={cn(
                        "cursor-pointer text-[10px] px-2 py-0.5",
                        venueData.musicGenres.includes(genre) 
                          ? "bg-coral/20 text-coral border-coral/30" 
                          : ""
                      )}
                      onClick={() => {
                        if (venueData.musicGenres.includes(genre)) {
                          setVenueData({ 
                            ...venueData, 
                            musicGenres: venueData.musicGenres.filter(g => g !== genre) 
                          });
                        } else {
                          setVenueData({ 
                            ...venueData, 
                            musicGenres: [...venueData.musicGenres, genre] 
                          });
                        }
                      }}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Entrance Rules - Contains age limits, dress code, entrance policies */}
          <CollapsibleSection id="entrance" title="Entrance Rules" icon={Shield} description="Age, dress code & policies">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Default Age Limit
                </Label>
                <Input 
                  type="number"
                  min="18"
                  max="30"
                  value={venueData.ageLimit}
                  onChange={(e) => setVenueData({ ...venueData, ageLimit: parseInt(e.target.value) || 18 })}
                  className="h-9 w-20"
                />
              </div>
              
              {/* Day-specific age requirements */}
              {venueData.openingDays.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Day-Specific Ages</Label>
                  <div className="space-y-2">
                    {venueData.openingDays.map((day) => (
                      <div key={day} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <span className="w-12 text-xs font-medium">{day.slice(0, 3)}</span>
                        <Input 
                          type="number"
                          min="18"
                          max="30"
                          value={getAgeForDay(day)}
                          onChange={(e) => updateAgeRequirement(day, parseInt(e.target.value) || venueData.ageLimit)}
                          className="w-16 h-7 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">+</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Shirt className="w-3 h-3" /> Dress Code
                </Label>
                <Input 
                  value={venueData.dressCode}
                  onChange={(e) => setVenueData({ ...venueData, dressCode: e.target.value })}
                  placeholder="e.g., Smart Casual"
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Entrance Requirements</Label>
                <Textarea 
                  value={venueData.entranceRules}
                  onChange={(e) => setVenueData({ ...venueData, entranceRules: e.target.value })}
                  rows={3}
                  placeholder="e.g., Guest list only, ID required, dress code strictly enforced..."
                  className="text-sm"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Links & Media */}
          <CollapsibleSection id="links" title="Links & Media" icon={ExternalLink} description="Social & menu">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Instagram className="w-3 h-3" /> Instagram
                </Label>
                <Input 
                  value={venueData.instagram}
                  onChange={(e) => setVenueData({ ...venueData, instagram: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Headphones className="w-3 h-3" /> Spotify Playlist
                </Label>
                <Input 
                  value={venueData.spotifyPlaylist}
                  onChange={(e) => setVenueData({ ...venueData, spotifyPlaylist: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Menu PDF
                </Label>
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Upload className="w-4 h-4" /> Upload Menu
                </Button>
              </div>
            </div>
          </CollapsibleSection>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          </>
          )}
        </div>
      </AdminLayout>
    );
  }

  // Desktop layout - keep existing
  return (
    <AdminLayout title="Venue Information" subtitle="Manage your venue's public profile">
      <div className="space-y-6">
        {/* Venue Indicator Pill for Impersonation */}
        <VenueIndicatorPill />
        
        {/* Loading State */}
        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="glass-card h-full">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
            <Card className="glass-card h-full">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
        <>
        {/* App Preview Button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Smartphone className="w-4 h-4" />
                App Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm bg-transparent border-none shadow-none p-0">
              <DialogHeader className="sr-only">
                <DialogTitle>App Preview</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <AppPreview venueData={venueData} />
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Basic Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Basic Information
                </CardTitle>
                <CardDescription>Your venue's core details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Venue Name</Label>
                  <Input 
                    value={venueData.name}
                    onChange={(e) => setVenueData({ ...venueData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>About the Club</Label>
                  <Textarea 
                    value={venueData.description}
                    onChange={(e) => setVenueData({ ...venueData, description: e.target.value })}
                    rows={4}
                    placeholder="Describe your venue..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Venue Photos</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {venueData.galleryImages.map((img, idx) => (
                      <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-border">
                        <img src={img} alt={`Venue ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-4 h-4 text-white mx-auto" />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add Photo</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">Upload multiple images for your venue gallery. These will be shown in the app.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Location */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location
                </CardTitle>
                <CardDescription>Help guests find you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input 
                    value={venueData.location.address}
                    onChange={(e) => setVenueData({ 
                      ...venueData, 
                      location: { ...venueData.location, address: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Google Maps Link</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={venueData.location.googleMapsUrl}
                      onChange={(e) => setVenueData({ 
                        ...venueData, 
                        location: { ...venueData.location, googleMapsUrl: e.target.value }
                      })}
                      placeholder="https://maps.google.com/..."
                    />
                    <Button variant="outline" size="icon" asChild>
                      <a href={venueData.location.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="aspect-video bg-muted/50 rounded-lg border border-border flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Map preview</p>
                    <Button size="sm" variant="outline" className="mt-2 gap-1" asChild>
                      <a href={venueData.location.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" /> Open in Maps
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Opening Hours */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Opening Hours
                </CardTitle>
                <CardDescription>Set your operating schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Opening Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {days.map((day) => (
                      <Badge 
                        key={day}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-colors",
                          venueData.openingDays.includes(day) 
                            ? "bg-primary/20 text-primary border-primary/30" 
                            : "hover:bg-muted"
                        )}
                        onClick={() => {
                          if (venueData.openingDays.includes(day)) {
                            setVenueData({ 
                              ...venueData, 
                              openingDays: venueData.openingDays.filter(d => d !== day) 
                            });
                          } else {
                            setVenueData({ 
                              ...venueData, 
                              openingDays: [...venueData.openingDays, day] 
                            });
                          }
                        }}
                      >
                        {day.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {venueData.openingDays.map((day) => {
                    const dayLower = day.toLowerCase();
                    const hours = venueData.openingHours[dayLower] || { open: "22:00", close: "04:00" };
                    return (
                      <div key={day} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                        <span className="w-24 font-medium text-sm">{day}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <Input 
                            type="time" 
                            value={hours.open}
                            onChange={(e) => updateOpeningHours(day, 'open', e.target.value)}
                            className="w-28" 
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input 
                            type="time" 
                            value={hours.close}
                            onChange={(e) => updateOpeningHours(day, 'close', e.target.value)}
                            className="w-28" 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Music */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  Music
                </CardTitle>
                <CardDescription>Define your vibe and sound</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Music Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => (
                      <Badge 
                        key={genre}
                        variant="outline"
                        className={cn(
                          "cursor-pointer transition-colors",
                          venueData.musicGenres.includes(genre) 
                            ? "bg-coral/20 text-coral border-coral/30" 
                            : "hover:bg-muted"
                        )}
                        onClick={() => {
                          if (venueData.musicGenres.includes(genre)) {
                            setVenueData({ 
                              ...venueData, 
                              musicGenres: venueData.musicGenres.filter(g => g !== genre) 
                            });
                          } else {
                            setVenueData({ 
                              ...venueData, 
                              musicGenres: [...venueData.musicGenres, genre] 
                            });
                          }
                        }}
                      >
                        <Headphones className="w-3 h-3 mr-1" />
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Entrance Rules - Contains age limits, dress code, entrance policies */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Entrance Rules
                </CardTitle>
                <CardDescription>Age limits, dress code & entry policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Default Age Limit
                    </Label>
                    <Input 
                      type="number"
                      min="18"
                      max="30"
                      value={venueData.ageLimit}
                      onChange={(e) => setVenueData({ ...venueData, ageLimit: parseInt(e.target.value) || 18 })}
                      placeholder="21"
                      className="w-24"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Shirt className="w-4 h-4" />
                      Dress Code
                    </Label>
                    <Input 
                      value={venueData.dressCode}
                      onChange={(e) => setVenueData({ ...venueData, dressCode: e.target.value })}
                      placeholder="e.g., Smart Casual, No sportswear..."
                    />
                  </div>
                </div>
                
                {/* Day-specific age requirements */}
                {venueData.openingDays.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Day-Specific Age Limits</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {venueData.openingDays.map((day) => (
                        <div key={day} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                          <span className="w-12 text-sm font-medium">{day.slice(0, 3)}</span>
                          <Input 
                            type="number"
                            min="18"
                            max="30"
                            value={getAgeForDay(day)}
                            onChange={(e) => updateAgeRequirement(day, parseInt(e.target.value) || venueData.ageLimit)}
                            className="w-20 h-8"
                          />
                          <span className="text-xs text-muted-foreground">+</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Entrance Requirements
                  </Label>
                  <Textarea 
                    value={venueData.entranceRules}
                    onChange={(e) => setVenueData({ ...venueData, entranceRules: e.target.value })}
                    rows={4}
                    placeholder="e.g., Guest list only, ID required, dress code strictly enforced..."
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Social & Menu - Full width */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-primary" />
                  Links & Media
                </CardTitle>
                <CardDescription>Connect your social and upload menu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </Label>
                    <Input 
                      value={venueData.instagram}
                      onChange={(e) => setVenueData({ ...venueData, instagram: e.target.value })}
                      placeholder="@yourclub"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Headphones className="w-4 h-4" />
                      Spotify Playlist
                    </Label>
                    <Input 
                      value={venueData.spotifyPlaylist}
                      onChange={(e) => setVenueData({ ...venueData, spotifyPlaylist: e.target.value })}
                      placeholder="https://open.spotify.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Menu PDF
                    </Label>
                    <Button variant="outline" className="w-full gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Menu
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
        </>
        )}
      </div>
    </AdminLayout>
  );
};

export default VenueInformation;

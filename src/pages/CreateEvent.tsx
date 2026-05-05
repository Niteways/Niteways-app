import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Image,
  Users,
  Ticket,
  Mail,
  MessageSquare,
  Bell,
  CheckCircle,
  Clock,
  Music,
  Shield,
  Plus,
  X,
  Upload,
  Loader2,
  Table2,
  ClipboardList,
  Target,
  DollarSign,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const venueIdFromQuery = searchParams.get("venueId");
  const isAdminCreating = !!venueIdFromQuery; // Admin passed venueId in URL
  const flyerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  // Step 1 - Event Details
  const [eventData, setEventData] = useState({
    name: "",
    date: null as Date | null,
    time: "22:00",
    endTime: "04:00",
    description: "",
    ageLimit: 21,
    musicGenre: "",
    flyerUrl: "",
    galleryImages: [] as string[],
    customTags: [] as string[],
  });
  
  // Custom tag input state
  const [newTag, setNewTag] = useState("");

  // Flyer image adjustments
  const [flyerAdjustments, setFlyerAdjustments] = useState({
    positionX: 50,
    positionY: 50,
    zoom: 100,
  });

  // Step 2 - Booking Options
  const [bookingOptions, setBookingOptions] = useState({
    tablesEnabled: false,
    ticketsEnabled: false,
    guestListEnabled: false,
    useVenueFloorMap: true,
    ticketTypes: [] as { name: string; price: number; quantity: number }[],
  });

  // Table pricing for event (if using custom)
  const [eventTables, setEventTables] = useState<{ id: string; label: string; price: number }[]>([]);

  // Ticket types
  const [newTicketType, setNewTicketType] = useState({ name: "", price: 0, quantity: 100 });

  // Step 3 - Notifications
  const [notifications, setNotifications] = useState({
    email: false,
    sms: false,
    push: false,
  });

  // Step 4 - Target Audience
  const [audienceType, setAudienceType] = useState<"existing" | "app-users">("existing");
  const [audienceFilters, setAudienceFilters] = useState({
    gender: [] as string[],
    ageMin: "",
    ageMax: "",
    musicPreferences: [] as string[],
    city: "",
    loyaltyLevel: [] as string[],
  });

  // Fetch venues for linking
  const { data: venues = [] } = useQuery({
    queryKey: ["venues-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, venue_id")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const [selectedVenueId, setSelectedVenueId] = useState(venueIdFromQuery || "");

  // Fetch venue tables when venue selected
  const { data: venueTables = [] } = useQuery({
    queryKey: ["venue-tables", selectedVenueId],
    queryFn: async () => {
      if (!selectedVenueId) return [];
      const { data, error } = await supabase
        .from("venue_tables")
        .select("*")
        .eq("venue_id", selectedVenueId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedVenueId,
  });

  // Initialize event tables from venue tables
  useEffect(() => {
    if (venueTables.length > 0 && bookingOptions.useVenueFloorMap) {
      setEventTables(venueTables.map(t => ({
        id: t.id,
        label: t.label,
        price: t.base_price,
      })));
    }
  }, [venueTables, bookingOptions.useVenueFloorMap]);

  const genderOptions = ["Male", "Female", "Other"];
  const musicGenres = ["House", "Tech House", "Deep House", "Hip Hop", "R&B", "EDM", "Latin", "Pop", "Reggaeton", "Afrobeats"];
  
  const PRESET_TAGS = [
    "Special Guest",
    "Dress Code: Smart",
    "Dress Code: Casual",
    "VIP Only",
    "Ladies Night",
    "Open Bar",
    "Live Performance",
    "Album Release",
    "Rooftop",
    "After Party",
  ];
  
  const addTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    if (eventData.customTags.includes(tag)) {
      toast.error("Tag already exists");
      return;
    }
    setEventData(prev => ({ ...prev, customTags: [...prev.customTags, tag] }));
    setNewTag("");
  };
  
  const removeTag = (tagToRemove: string) => {
    setEventData(prev => ({
      ...prev,
      customTags: prev.customTags.filter(t => t !== tagToRemove),
    }));
  };
  const loyaltyLevels = ["Bronze", "Silver", "Gold", "Platinum", "VIP"];
  const cities = ["Miami", "New York", "Los Angeles", "London", "Paris", "Dubai", "Ibiza"];

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `flyer-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);
      
      setEventData(prev => ({ ...prev, flyerUrl: urlData.publicUrl }));
      toast.success('Flyer uploaded!');
    } catch (error: any) {
      toast.error('Failed to upload flyer');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    const newImages: string[] = [];
    
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `gallery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);
        
        newImages.push(urlData.publicUrl);
      }
      
      setEventData(prev => ({ ...prev, galleryImages: [...prev.galleryImages, ...newImages] }));
      toast.success(`${newImages.length} image(s) uploaded!`);
    } catch (error) {
      toast.error('Failed to upload some images');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setEventData(prev => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index),
    }));
  };

  const addTicketType = () => {
    if (!newTicketType.name) {
      toast.error("Please enter a ticket name");
      return;
    }
    setBookingOptions(prev => ({
      ...prev,
      ticketTypes: [...prev.ticketTypes, { ...newTicketType }],
    }));
    setNewTicketType({ name: "", price: 0, quantity: 100 });
  };

  const removeTicketType = (index: number) => {
    setBookingOptions(prev => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter((_, i) => i !== index),
    }));
  };

  const handleCreate = async () => {
    if (!eventData.name || !eventData.date || !selectedVenueId) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const { error } = await supabase.from("events").insert({
        venue_id: selectedVenueId,
        event_name: eventData.name,
        event_date: format(eventData.date, "yyyy-MM-dd"),
        event_time: eventData.time,
        end_time: eventData.endTime,
        description: eventData.description,
        image_url: eventData.flyerUrl,
        gallery_images: eventData.galleryImages,
        music_genre: eventData.musicGenre,
        age_limit: eventData.ageLimit,
        custom_tags: eventData.customTags.length > 0 ? eventData.customTags : null,
        ticket_types: bookingOptions.ticketTypes.length > 0 ? bookingOptions.ticketTypes : null,
        status: "active",
      });

      if (error) throw error;

      toast.success("Event created successfully!");
      navigate("/events");
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    }
  };

  const steps = [
    { num: 1, label: "Event Details", icon: CalendarIcon },
    { num: 2, label: "Booking Options", icon: Ticket },
    { num: 3, label: "Notifications", icon: Bell },
    { num: 4, label: "Target Audience", icon: Target },
    { num: 5, label: "Review & Create", icon: CheckCircle },
  ];

  return (
    <AdminLayout title="Create Event" subtitle="Set up a new event for your venue">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/events")}>
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Button>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors",
                  s.num === step
                    ? "bg-primary text-primary-foreground"
                    : s.num < step
                      ? "bg-teal text-teal-foreground"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {s.num < step ? <CheckCircle className="w-5 h-5" /> : s.num}
              </div>
              {idx < steps.length - 1 && (
                <div className={cn("w-12 h-0.5", s.num < step ? "bg-teal" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Event Details */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Event Details</CardTitle>
                    <CardDescription>Basic information about your event</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Name *</Label>
                    <Input
                      placeholder="e.g., Saturday Night Fever"
                      value={eventData.name}
                      onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !eventData.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {eventData.date ? format(eventData.date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={eventData.date || undefined}
                          onSelect={(date) => setEventData({ ...eventData, date: date || null })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Start Time
                    </Label>
                    <Input
                      type="time"
                      value={eventData.time}
                      onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> End Time
                    </Label>
                    <Input
                      type="time"
                      value={eventData.endTime}
                      onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Age Limit
                    </Label>
                    <Input
                      type="number"
                      min={18}
                      max={30}
                      value={eventData.ageLimit}
                      onChange={(e) => setEventData({ ...eventData, ageLimit: parseInt(e.target.value) || 18 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Music className="w-4 h-4" /> Music Genre
                    </Label>
                    <Select value={eventData.musicGenre} onValueChange={(v) => setEventData({ ...eventData, musicGenre: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {musicGenres.map(genre => (
                          <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Event Description</Label>
                  <Textarea
                    placeholder="Describe your event..."
                    rows={3}
                    value={eventData.description}
                    onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                  />
                </div>

                {/* Custom Tags Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Event Tags
                    <span className="text-xs text-muted-foreground ml-2">(e.g., Special Guest, Dress Code)</span>
                  </Label>

                  {/* Preset Tag Suggestions */}
                  <div className="flex flex-wrap gap-2">
                    {PRESET_TAGS.filter(tag => !eventData.customTags.includes(tag)).slice(0, 6).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setEventData(prev => ({ ...prev, customTags: [...prev.customTags, tag] }))}
                        className="px-2.5 py-1 text-xs border border-dashed border-border rounded-full text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  
                  {/* Active Tags */}
                  {eventData.customTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {eventData.customTags.map((tag) => (
                        <div
                          key={tag}
                          className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Custom Tag Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a custom tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Event Flyer */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" /> Event Flyer
                  </Label>
                  {eventData.flyerUrl ? (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden border border-border aspect-[3/4] max-w-xs">
                        <img
                          src={eventData.flyerUrl}
                          alt="Event flyer"
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${flyerAdjustments.positionX}% ${flyerAdjustments.positionY}%`,
                            transform: `scale(${flyerAdjustments.zoom / 100})`,
                          }}
                        />
                        <button
                          onClick={() => setEventData({ ...eventData, flyerUrl: "" })}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Image Adjustments */}
                      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                        <Label className="text-sm">Adjust Image Position</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="w-20 text-sm text-muted-foreground">Horizontal</span>
                            <Slider
                              value={[flyerAdjustments.positionX]}
                              onValueChange={([v]) => setFlyerAdjustments(prev => ({ ...prev, positionX: v }))}
                              min={0}
                              max={100}
                              step={1}
                              className="flex-1"
                            />
                            <span className="w-12 text-sm text-right">{flyerAdjustments.positionX}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-20 text-sm text-muted-foreground">Vertical</span>
                            <Slider
                              value={[flyerAdjustments.positionY]}
                              onValueChange={([v]) => setFlyerAdjustments(prev => ({ ...prev, positionY: v }))}
                              min={0}
                              max={100}
                              step={1}
                              className="flex-1"
                            />
                            <span className="w-12 text-sm text-right">{flyerAdjustments.positionY}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-20 text-sm text-muted-foreground">Zoom</span>
                            <Slider
                              value={[flyerAdjustments.zoom]}
                              onValueChange={([v]) => setFlyerAdjustments(prev => ({ ...prev, zoom: v }))}
                              min={100}
                              max={200}
                              step={5}
                              className="flex-1"
                            />
                            <span className="w-12 text-sm text-right">{flyerAdjustments.zoom}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => flyerInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      {isUploading ? (
                        <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-3" />
                      ) : (
                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                      )}
                      <p className="text-sm text-muted-foreground">Click to upload event flyer</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                  <input
                    ref={flyerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFlyerUpload}
                    className="hidden"
                  />
                </div>

                {/* Event Gallery */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" /> Event Gallery Images
                  </Label>
                  <div className="grid grid-cols-4 gap-3">
                    {eventData.galleryImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-border group">
                        <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeGalleryImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={isUploading}
                      className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Add</span>
                    </button>
                  </div>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">Gallery images shown on event detail page</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Booking Options */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Booking Options</CardTitle>
                    <CardDescription>Configure what guests can book for this event</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Table Reservations */}
                <div className="p-4 rounded-lg border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
                        <Table2 className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <p className="font-medium">Table Reservations</p>
                        <p className="text-sm text-muted-foreground">Allow table bookings for this event</p>
                      </div>
                    </div>
                    <Switch
                      checked={bookingOptions.tablesEnabled}
                      onCheckedChange={(checked) => setBookingOptions({ ...bookingOptions, tablesEnabled: checked })}
                    />
                  </div>

                  {bookingOptions.tablesEnabled && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={bookingOptions.useVenueFloorMap}
                          onCheckedChange={(checked) => setBookingOptions({ ...bookingOptions, useVenueFloorMap: checked })}
                        />
                        <Label>Use venue's floor map and tables</Label>
                      </div>

                      {bookingOptions.useVenueFloorMap && eventTables.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm">Event Table Pricing (Override venue prices)</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {eventTables.map((table, idx) => (
                              <div key={table.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                                <span className="flex-1 text-sm font-medium">{table.label}</span>
                                <span className="text-muted-foreground">€</span>
                                <Input
                                  type="number"
                                  className="w-24 h-8"
                                  value={table.price}
                                  onChange={(e) => {
                                    const newTables = [...eventTables];
                                    newTables[idx].price = parseFloat(e.target.value) || 0;
                                    setEventTables(newTables);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!bookingOptions.useVenueFloorMap && (
                        <p className="text-sm text-muted-foreground">Custom floor map coming soon...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Tickets */}
                <div className="p-4 rounded-lg border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-coral/20 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-coral" />
                      </div>
                      <div>
                        <p className="font-medium">Tickets</p>
                        <p className="text-sm text-muted-foreground">Sell tickets for entry</p>
                      </div>
                    </div>
                    <Switch
                      checked={bookingOptions.ticketsEnabled}
                      onCheckedChange={(checked) => setBookingOptions({ ...bookingOptions, ticketsEnabled: checked })}
                    />
                  </div>

                  {bookingOptions.ticketsEnabled && (
                    <div className="space-y-4 pt-4 border-t border-border">
                      {/* Existing Ticket Types */}
                      {bookingOptions.ticketTypes.length > 0 && (
                        <div className="space-y-2">
                          {bookingOptions.ticketTypes.map((ticket, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded bg-muted/30">
                              <Ticket className="w-4 h-4 text-coral" />
                              <span className="flex-1 font-medium">{ticket.name}</span>
                              <span className="text-muted-foreground">€{ticket.price}</span>
                              <span className="text-sm text-muted-foreground">({ticket.quantity} available)</span>
                              <Button variant="ghost" size="icon" onClick={() => removeTicketType(idx)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Ticket Type */}
                      <div className="grid grid-cols-4 gap-2">
                        <Input
                          placeholder="Ticket name"
                          value={newTicketType.name}
                          onChange={(e) => setNewTicketType({ ...newTicketType, name: e.target.value })}
                          className="col-span-2"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">€</span>
                          <Input
                            type="number"
                            placeholder="Price"
                            value={newTicketType.price || ""}
                            onChange={(e) => setNewTicketType({ ...newTicketType, price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <Button onClick={addTicketType} className="gap-2">
                          <Plus className="w-4 h-4" /> Add
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Guest List */}
                <div className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal/20 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-teal" />
                      </div>
                      <div>
                        <p className="font-medium">Guest List</p>
                        <p className="text-sm text-muted-foreground">Allow guest list sign-ups</p>
                      </div>
                    </div>
                    <Switch
                      checked={bookingOptions.guestListEnabled}
                      onCheckedChange={(checked) => setBookingOptions({ ...bookingOptions, guestListEnabled: checked })}
                    />
                  </div>

                  {!bookingOptions.guestListEnabled && (
                    <p className="text-sm text-muted-foreground mt-3 p-3 rounded bg-muted/30">
                      This event doesn't offer any guest list.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Notifications */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Bell className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Notification Channels</CardTitle>
                    <CardDescription>How to notify guests about this event</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { id: "email" as const, icon: Mail, label: "Email", color: "primary" },
                    { id: "sms" as const, icon: MessageSquare, label: "SMS", color: "coral" },
                    { id: "push" as const, icon: Bell, label: "Push", color: "teal" },
                  ].map(channel => (
                    <div
                      key={channel.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all",
                        notifications[channel.id]
                          ? `border-${channel.color} bg-${channel.color}/10`
                          : "border-border hover:border-muted-foreground"
                      )}
                      onClick={() => setNotifications({ ...notifications, [channel.id]: !notifications[channel.id] })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          notifications[channel.id] ? `bg-${channel.color}/20` : "bg-muted"
                        )}>
                          <channel.icon className={cn("w-5 h-5", notifications[channel.id] ? `text-${channel.color}` : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="font-medium">{channel.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {channel.id === "email" ? "Email blast" : channel.id === "sms" ? "Text message" : "App notification"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Target Audience */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Target Audience</CardTitle>
                    <CardDescription>Define who should see this event</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Audience Source</Label>
                  <Select value={audienceType} onValueChange={(v) => setAudienceType(v as "existing" | "app-users")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="existing">Existing Customers</SelectItem>
                      <SelectItem value="app-users">All App Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <div className="flex flex-wrap gap-2">
                        {genderOptions.map(gender => (
                          <Badge
                            key={gender}
                            variant="outline"
                            className={cn(
                              "cursor-pointer transition-colors",
                              audienceFilters.gender.includes(gender)
                                ? "bg-primary/20 text-primary border-primary/30"
                                : "hover:bg-muted"
                            )}
                            onClick={() => setAudienceFilters({
                              ...audienceFilters,
                              gender: toggleArrayValue(audienceFilters.gender, gender)
                            })}
                          >
                            {gender}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Age Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={audienceFilters.ageMin}
                          onChange={(e) => setAudienceFilters({ ...audienceFilters, ageMin: e.target.value })}
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={audienceFilters.ageMax}
                          onChange={(e) => setAudienceFilters({ ...audienceFilters, ageMax: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Music Preferences</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {musicGenres.map(genre => (
                          <Badge
                            key={genre}
                            variant="outline"
                            className={cn(
                              "cursor-pointer transition-colors text-xs",
                              audienceFilters.musicPreferences.includes(genre)
                                ? "bg-coral/20 text-coral border-coral/30"
                                : "hover:bg-muted"
                            )}
                            onClick={() => setAudienceFilters({
                              ...audienceFilters,
                              musicPreferences: toggleArrayValue(audienceFilters.musicPreferences, genre)
                            })}
                          >
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Loyalty Level</Label>
                      <div className="flex flex-wrap gap-2">
                        {loyaltyLevels.map(level => (
                          <Badge
                            key={level}
                            variant="outline"
                            className={cn(
                              "cursor-pointer transition-colors text-xs",
                              audienceFilters.loyaltyLevel.includes(level)
                                ? "bg-gold/20 text-gold border-gold/30"
                                : "hover:bg-muted"
                            )}
                            onClick={() => setAudienceFilters({
                              ...audienceFilters,
                              loyaltyLevel: toggleArrayValue(audienceFilters.loyaltyLevel, level)
                            })}
                          >
                            {level}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 5: Review & Create */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-teal/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-teal" />
                  </div>
                  <div>
                    <CardTitle>Review & Create</CardTitle>
                    <CardDescription>Confirm event details before creating</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Summary */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Event Name</Label>
                      <p className="font-medium">{eventData.name || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Date & Time</Label>
                      <p className="font-medium">
                        {eventData.date ? format(eventData.date, "PPP") : "Not set"} at {eventData.time}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Age Limit</Label>
                      <p className="font-medium">{eventData.ageLimit}+</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Music Genre</Label>
                      <p className="font-medium">{eventData.musicGenre || "Not set"}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Booking Options</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {bookingOptions.tablesEnabled && <Badge className="bg-gold/20 text-gold">Tables</Badge>}
                        {bookingOptions.ticketsEnabled && <Badge className="bg-coral/20 text-coral">Tickets ({bookingOptions.ticketTypes.length})</Badge>}
                        {bookingOptions.guestListEnabled && <Badge className="bg-teal/20 text-teal">Guest List</Badge>}
                        {!bookingOptions.tablesEnabled && !bookingOptions.ticketsEnabled && !bookingOptions.guestListEnabled && (
                          <span className="text-muted-foreground text-sm">None selected</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Notifications</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {notifications.email && <Badge variant="outline">Email</Badge>}
                        {notifications.sms && <Badge variant="outline">SMS</Badge>}
                        {notifications.push && <Badge variant="outline">Push</Badge>}
                        {!notifications.email && !notifications.sms && !notifications.push && (
                          <span className="text-muted-foreground text-sm">None selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flyer Preview */}
                {eventData.flyerUrl && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Event Flyer</Label>
                    <img src={eventData.flyerUrl} alt="Event flyer" className="mt-2 rounded-lg max-w-xs" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(s => s + 1)} className="gap-2">
              Next Step <CheckCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleCreate} className="gap-2 bg-teal hover:bg-teal/90">
              <CheckCircle className="w-4 h-4" /> Create Event
            </Button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default CreateEvent;

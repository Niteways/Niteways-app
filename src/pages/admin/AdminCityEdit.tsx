import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft, Edit, Image, LayoutGrid, Megaphone, Loader2,
  Plus, Trash2, GripVertical, Save, ExternalLink, Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";
import { CityImageEditor } from "@/components/admin/CityImageEditor";
import { CitySectionsManager } from "@/components/admin/CitySectionsManager";
import { SortableAdvertisingCard } from "@/components/admin/SortableAdvertisingCard";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface City {
  id: string;
  name: string;
  country: string;
  timezone: string;
  currency: string;
  tax_rate: number;
  venue_count: number;
  status: string;
  image_url?: string | null;
  image_position_x?: number;
  image_position_y?: number;
  image_zoom?: number;
}

interface Venue {
  id: string;
  name: string;
}

interface AdvertisingCard {
  id: string;
  city_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  background_color: string;
  text_color: string;
  sort_order: number;
  is_active: boolean;
  position_after_section: string | null;
  card_size?: string;
  card_mode?: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface CitySection {
  id: string;
  title: string;
}

const currencies = ["USD", "EUR", "GBP", "AED", "CHF", "SEK", "NOK", "DKK"];

const timezones = [
  "America/New_York", "America/Los_Angeles", "America/Chicago", "America/Denver",
  "Europe/London", "Europe/Stockholm", "Europe/Oslo", "Europe/Copenhagen",
  "Europe/Madrid", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Asia/Bangkok",
  "Australia/Sydney", "Australia/Melbourne"
];

const AdminCityEdit = () => {
  const navigate = useNavigate();
  const { cityId } = useParams();
  const [city, setCity] = useState<City | null>(null);
  const [cityVenues, setCityVenues] = useState<Venue[]>([]);
  const [citySections, setCitySections] = useState<CitySection[]>([]);
  const [advertisingCards, setAdvertisingCards] = useState<AdvertisingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  
  // Advertising card form state
  const [editingCard, setEditingCard] = useState<AdvertisingCard | null>(null);
  const [newCard, setNewCard] = useState({
    title: "",
    subtitle: "",
    image_url: "",
    link_url: "",
    background_color: "#1a1a1a",
    text_color: "#ffffff",
    position_after_section: "",
    card_size: "medium",
    card_mode: "custom",
    start_date: null as Date | null,
    end_date: null as Date | null,
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = advertisingCards.findIndex(c => c.id === active.id);
    const newIndex = advertisingCards.findIndex(c => c.id === over.id);
    
    const reordered = arrayMove(advertisingCards, oldIndex, newIndex);
    setAdvertisingCards(reordered);

    // Update sort_order in database
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('city_advertising_cards')
        .update({ sort_order: i })
        .eq('id', reordered[i].id);
    }
    toast.success('Cards reordered');
  };

  useEffect(() => {
    if (cityId) {
      fetchCity();
      fetchCityVenues();
      fetchCitySections();
      fetchAdvertisingCards();
    }
  }, [cityId]);

  const fetchCity = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('id', cityId)
      .single();

    if (error) {
      toast.error("Failed to load city");
      console.error(error);
      navigate('/admin/cities');
    } else {
      setCity(data);
    }
    setLoading(false);
  };

  const fetchCityVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name')
      .eq('city_id', cityId)
      .eq('status', 'active');

    if (error) {
      console.error(error);
    } else {
      setCityVenues(data || []);
    }
  };

  const fetchCitySections = async () => {
    const { data, error } = await supabase
      .from('city_venue_sections')
      .select('id, title')
      .eq('city_id', cityId)
      .order('sort_order');

    if (error) {
      console.error(error);
    } else {
      setCitySections(data || []);
    }
  };

  const fetchAdvertisingCards = async () => {
    const { data, error } = await supabase
      .from('city_advertising_cards')
      .select('*')
      .eq('city_id', cityId)
      .order('sort_order');

    if (error) {
      console.error(error);
    } else {
      setAdvertisingCards(data || []);
    }
  };

  const handleSaveSettings = async () => {
    if (!city) return;
    setSaving(true);

    const { error } = await supabase
      .from('cities')
      .update({
        name: city.name,
        country: city.country,
        timezone: city.timezone,
        currency: city.currency,
        tax_rate: city.tax_rate,
      })
      .eq('id', city.id);

    if (error) {
      toast.error("Failed to update city");
      console.error(error);
    } else {
      await logActivity({
        action: "Updated city",
        entityType: "city",
        entityId: city.id,
        details: `Updated city: ${city.name}`,
        portal: "admin",
      });
      toast.success("City settings saved!");
    }
    setSaving(false);
  };

  const handleAddAdvertisingCard = async () => {
    // Title is required only for custom mode
    if (newCard.card_mode !== "photo" && !newCard.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const { error } = await supabase
      .from('city_advertising_cards')
      .insert({
        city_id: cityId,
        title: newCard.card_mode === "photo" ? (newCard.title.trim() || "Photo Ad") : newCard.title,
        subtitle: newCard.card_mode === "photo" ? null : (newCard.subtitle || null),
        image_url: newCard.image_url || null,
        link_url: newCard.link_url || null,
        background_color: newCard.background_color,
        text_color: newCard.text_color,
        position_after_section: newCard.position_after_section || null,
        sort_order: advertisingCards.length,
        card_size: newCard.card_size,
        card_mode: newCard.card_mode,
        start_date: newCard.start_date ? format(newCard.start_date, "yyyy-MM-dd") : null,
        end_date: newCard.end_date ? format(newCard.end_date, "yyyy-MM-dd") : null,
      });

    if (error) {
      toast.error("Failed to add advertising card");
      console.error(error);
    } else {
      toast.success("Advertising card added!");
      setNewCard({
        title: "",
        subtitle: "",
        image_url: "",
        link_url: "",
        background_color: "#1a1a1a",
        text_color: "#ffffff",
        position_after_section: "",
        card_size: "medium",
        card_mode: "custom",
        start_date: null,
        end_date: null,
      });
      fetchAdvertisingCards();
    }
  };

  const handleUpdateAdvertisingCard = async (card: AdvertisingCard) => {
    const { error } = await supabase
      .from('city_advertising_cards')
      .update({
        title: card.title,
        subtitle: card.subtitle,
        image_url: card.image_url,
        link_url: card.link_url,
        background_color: card.background_color,
        text_color: card.text_color,
        is_active: card.is_active,
        position_after_section: card.position_after_section,
        card_size: card.card_size,
        card_mode: card.card_mode,
        start_date: card.start_date,
        end_date: card.end_date,
      })
      .eq('id', card.id);

    if (error) {
      toast.error("Failed to update advertising card");
      console.error(error);
    } else {
      toast.success("Advertising card updated!");
      setEditingCard(null);
      fetchAdvertisingCards();
    }
  };

  const handleDeleteAdvertisingCard = async (cardId: string) => {
    const { error } = await supabase
      .from('city_advertising_cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      toast.error("Failed to delete advertising card");
      console.error(error);
    } else {
      toast.success("Advertising card deleted!");
      fetchAdvertisingCards();
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Edit City" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!city) {
    return (
      <AdminLayout title="Edit City" subtitle="City not found">
        <div className="text-center py-12">
          <p className="text-muted-foreground">City not found</p>
          <Button onClick={() => navigate('/admin/cities')} className="mt-4">
            Back to Cities
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title={`Edit ${city.name}`} 
      subtitle="Manage city settings, image, sections, and advertising"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/cities')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cities
          </Button>
        </motion.div>

        {/* Main Content with Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="glass-card p-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="settings" className="gap-2">
                <Edit className="w-4 h-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="image" className="gap-2">
                <Image className="w-4 h-4" />
                Image
              </TabsTrigger>
              <TabsTrigger value="sections" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Sections
              </TabsTrigger>
              <TabsTrigger value="advertising" className="gap-2">
                <Megaphone className="w-4 h-4" />
                Advertising
              </TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City Name</Label>
                  <Input 
                    value={city.name} 
                    onChange={(e) => setCity({ ...city, name: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input 
                    value={city.country} 
                    onChange={(e) => setCity({ ...city, country: e.target.value })} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={city.timezone} 
                    onValueChange={(v) => setCity({ ...city, timezone: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select 
                    value={city.currency} 
                    onValueChange={(v) => setCity({ ...city, currency: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input 
                  type="number" 
                  value={city.tax_rate} 
                  onChange={(e) => setCity({ ...city, tax_rate: Number(e.target.value) })} 
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </TabsContent>

            {/* Image Tab */}
            <TabsContent value="image">
              <CityImageEditor
                cityId={city.id}
                currentImageUrl={city.image_url}
                positionX={city.image_position_x ?? 50}
                positionY={city.image_position_y ?? 50}
                zoom={city.image_zoom ?? 100}
                onSave={() => fetchCity()}
                onCancel={() => setActiveTab("settings")}
              />
            </TabsContent>

            {/* Sections Tab */}
            <TabsContent value="sections">
              <CitySectionsManager
                cityId={city.id}
                cityName={city.name}
                venues={cityVenues}
              />
            </TabsContent>

            {/* Advertising Tab */}
            <TabsContent value="advertising" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Advertising Cards</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create advertising banners that appear between venue sections in the user app.
                </p>
              </div>

              {/* Add New Advertising Card */}
              <Card className="p-4 space-y-4">
                <Label className="text-base font-medium">Add New Advertising Card</Label>
                
                {/* Card Size & Mode Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Card Height</Label>
                    <Select value={newCard.card_size} onValueChange={(v) => setNewCard({ ...newCard, card_size: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (Short height)</SelectItem>
                        <SelectItem value="medium">Medium (Standard height)</SelectItem>
                        <SelectItem value="large">Large (Tall height)</SelectItem>
                        <SelectItem value="full">Full (Extra tall)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Card Mode</Label>
                    <Select value={newCard.card_mode} onValueChange={(v) => setNewCard({ ...newCard, card_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="photo">Photo/Banner Only</SelectItem>
                        <SelectItem value="custom">Custom (Title/Subtitle)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Title & Subtitle - only show for custom mode */}
                {newCard.card_mode === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={newCard.title}
                        onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                        placeholder="e.g., Special Offer!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input
                        value={newCard.subtitle}
                        onChange={(e) => setNewCard({ ...newCard, subtitle: e.target.value })}
                        placeholder="e.g., Get 20% off your first booking"
                      />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{newCard.card_mode === "photo" ? "Photo/Banner Image *" : "Background Image"}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${cityId}-ad-${Date.now()}.${fileExt}`;
                          
                          const { error: uploadError, data } = await supabase.storage
                            .from('advertising-images')
                            .upload(fileName, file);
                          
                          if (uploadError) {
                            toast.error('Failed to upload image');
                            console.error(uploadError);
                            return;
                          }
                          
                          const { data: urlData } = supabase.storage
                            .from('advertising-images')
                            .getPublicUrl(fileName);
                          
                          setNewCard({ ...newCard, image_url: urlData.publicUrl });
                          toast.success('Image uploaded!');
                        }}
                        className="flex-1"
                      />
                    </div>
                    {newCard.image_url && (
                      <img src={newCard.image_url} alt="Preview" className="h-16 w-auto rounded object-cover mt-2" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Link URL (click destination)</Label>
                    <Input
                      value={newCard.link_url}
                      onChange={(e) => setNewCard({ ...newCard, link_url: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                {/* Colors - only show for custom mode */}
                {newCard.card_mode === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={newCard.background_color}
                          onChange={(e) => setNewCard({ ...newCard, background_color: e.target.value })}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={newCard.background_color}
                          onChange={(e) => setNewCard({ ...newCard, background_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={newCard.text_color}
                          onChange={(e) => setNewCard({ ...newCard, text_color: e.target.value })}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={newCard.text_color}
                          onChange={(e) => setNewCard({ ...newCard, text_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Date Range for Scheduling */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newCard.start_date ? format(newCard.start_date, "PPP") : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newCard.start_date || undefined}
                          onSelect={(date) => setNewCard({ ...newCard, start_date: date || null })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newCard.end_date ? format(newCard.end_date, "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newCard.end_date || undefined}
                          onSelect={(date) => setNewCard({ ...newCard, end_date: date || null })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Show After Section</Label>
                  <Select 
                    value={newCard.position_after_section || "top"} 
                    onValueChange={(v) => setNewCard({ ...newCard, position_after_section: v === "top" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">At the top</SelectItem>
                      {citySections.map(section => (
                        <SelectItem key={section.id} value={section.id}>
                          After: {section.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preview with size */}
                <div className="space-y-2">
                  <Label>Preview (Full width, variable height)</Label>
                  <div 
                    className="rounded-xl overflow-hidden relative"
                    style={{ 
                      backgroundColor: newCard.card_mode === "photo" ? 'transparent' : newCard.background_color,
                      color: newCard.text_color,
                      height: newCard.card_size === 'small' ? '80px' : 
                              newCard.card_size === 'medium' ? '120px' : 
                              newCard.card_size === 'large' ? '160px' : '200px',
                    }}
                  >
                    {newCard.image_url && (
                      <img 
                        src={newCard.image_url} 
                        alt="Preview" 
                        className={cn(
                          "w-full object-cover",
                          newCard.card_mode === "photo" 
                            ? "h-full rounded-xl" 
                            : "absolute inset-0 h-full opacity-40"
                        )}
                      />
                    )}
                    {newCard.card_mode !== "photo" && (
                      <div className="relative z-10 p-4 h-full flex flex-col justify-center">
                        <h4 className="font-bold text-lg">{newCard.title || "Title"}</h4>
                        {newCard.subtitle && <p className="text-sm opacity-80">{newCard.subtitle}</p>}
                      </div>
                    )}
                  </div>
                </div>

                <Button onClick={handleAddAdvertisingCard} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Card
                </Button>
              </Card>

              {/* Existing Cards with Drag & Drop */}
              {advertisingCards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No advertising cards yet. Create one above to get started.
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={advertisingCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {advertisingCards.map((card) => (
                        editingCard?.id === card.id ? (
                          <Card key={card.id} className="overflow-hidden p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Card Size</Label>
                                <Select value={editingCard.card_size || "medium"} onValueChange={(v) => setEditingCard({ ...editingCard, card_size: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="small">Small</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="large">Large</SelectItem>
                                    <SelectItem value="full">Full</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Card Mode</Label>
                                <Select value={editingCard.card_mode || "custom"} onValueChange={(v) => setEditingCard({ ...editingCard, card_mode: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="photo">Photo Only</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            {/* Date Range for Scheduling */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {editingCard.start_date ? format(new Date(editingCard.start_date), "PPP") : "Pick date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={editingCard.start_date ? new Date(editingCard.start_date) : undefined}
                                      onSelect={(date) => setEditingCard({ ...editingCard, start_date: date ? format(date, "yyyy-MM-dd") : null })}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="space-y-2">
                                <Label>End Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {editingCard.end_date ? format(new Date(editingCard.end_date), "PPP") : "Pick date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={editingCard.end_date ? new Date(editingCard.end_date) : undefined}
                                      onSelect={(date) => setEditingCard({ ...editingCard, end_date: date ? format(date, "yyyy-MM-dd") : null })}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={() => setEditingCard(null)}>Cancel</Button>
                              <Button onClick={() => handleUpdateAdvertisingCard(editingCard)}>Save</Button>
                            </div>
                          </Card>
                        ) : (
                          <SortableAdvertisingCard
                            key={card.id}
                            card={card}
                            onEdit={setEditingCard}
                            onDelete={handleDeleteAdvertisingCard}
                            onToggleActive={(c, active) => handleUpdateAdvertisingCard({ ...c, is_active: active })}
                          />
                        )
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminCityEdit;

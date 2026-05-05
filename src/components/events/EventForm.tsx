import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  Calendar as CalendarIcon,
  Image,
  Clock,
  Music,
  Shield,
  Plus,
  X,
  Upload,
  Loader2,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EventGalleryDragDrop } from "./EventGalleryDragDrop";

const MUSIC_GENRES = ["House", "Tech House", "Deep House", "Hip Hop", "R&B", "EDM", "Latin", "Pop", "Reggaeton", "Afrobeats"];

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

export interface EventFormData {
  name: string;
  date: Date | null;
  time: string;
  endTime: string;
  description: string;
  ageLimit: number;
  musicGenre: string;
  flyerUrl: string;
  galleryImages: string[];
  customTags: string[];
}

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function EventForm({ initialData, onSubmit, submitLabel = "Save", isLoading = false }: EventFormProps) {
  const flyerInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newTag, setNewTag] = useState("");

  const [eventData, setEventData] = useState<EventFormData>({
    name: initialData?.name || "",
    date: initialData?.date || null,
    time: initialData?.time || "22:00",
    endTime: initialData?.endTime || "04:00",
    description: initialData?.description || "",
    ageLimit: initialData?.ageLimit || 21,
    musicGenre: initialData?.musicGenre || "",
    flyerUrl: initialData?.flyerUrl || "",
    galleryImages: initialData?.galleryImages || [],
    customTags: initialData?.customTags || [],
  });

  const [flyerAdjustments, setFlyerAdjustments] = useState({
    positionX: 50,
    positionY: 50,
    zoom: 100,
  });

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
      console.error('Upload error:', error);
      toast.error(`Failed to upload flyer: ${error.message || 'Unknown error'}`);
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

  const handleReorderGallery = (newOrder: string[]) => {
    setEventData(prev => ({ ...prev, galleryImages: newOrder }));
  };

  const handleSetHeroImage = (url: string) => {
    // Set this gallery image as the flyer (hero image)
    setEventData(prev => ({ ...prev, flyerUrl: url }));
    toast.success('Hero image set!');
  };

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

  const handleSubmit = async () => {
    if (!eventData.name || !eventData.date) {
      toast.error("Please fill in required fields");
      return;
    }
    await onSubmit(eventData);
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
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
                {MUSIC_GENRES.map(genre => (
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

        {/* Custom Tags */}
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

        {/* Event Flyer (Hero Image) */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Image className="w-4 h-4" /> Event Flyer (Hero Image)
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

        {/* Event Gallery with Drag-and-Drop */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Image className="w-4 h-4" /> Event Gallery Images
            <span className="text-xs text-muted-foreground ml-2">(Drag to reorder, click star to set as hero)</span>
          </Label>
          
          {eventData.galleryImages.length > 0 ? (
            <EventGalleryDragDrop
              images={eventData.galleryImages}
              heroImage={eventData.flyerUrl}
              onReorder={handleReorderGallery}
              onRemove={removeGalleryImage}
              onSetHero={handleSetHeroImage}
            />
          ) : null}
          
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={isUploading}
            className="w-full aspect-video max-w-[200px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Add Gallery Images</span>
          </button>
          
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryUpload}
            className="hidden"
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSubmit} disabled={isLoading || isUploading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, ZoomIn, ZoomOut, Move, Check, X, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CityImageEditorProps {
  cityId: string;
  currentImageUrl?: string | null;
  positionX: number;
  positionY: number;
  zoom: number;
  onSave: () => void;
  onCancel: () => void;
}

export function CityImageEditor({
  cityId,
  currentImageUrl,
  positionX: initialX,
  positionY: initialY,
  zoom: initialZoom,
  onSave,
  onCancel,
}: CityImageEditorProps) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || "");
  const [positionX, setPositionX] = useState(initialX);
  const [positionY, setPositionY] = useState(initialY);
  const [zoom, setZoom] = useState(initialZoom);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `city-${cityId}-${Date.now()}.${fileExt}`;
      const filePath = `city-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("city-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("city-images")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl.publicUrl);
      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("cities")
        .update({
          image_url: imageUrl || null,
          image_position_x: positionX,
          image_position_y: positionY,
          image_zoom: zoom,
        })
        .eq("id", cityId);

      if (error) throw error;
      toast.success("City image settings saved!");
      onSave();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPositionX(50);
    setPositionY(50);
    setZoom(100);
  };

  // Quick position adjustments
  const adjustPosition = (direction: 'up' | 'down' | 'left' | 'right', amount: number = 5) => {
    switch (direction) {
      case 'up':
        setPositionY(Math.max(0, positionY - amount));
        break;
      case 'down':
        setPositionY(Math.min(100, positionY + amount));
        break;
      case 'left':
        setPositionX(Math.max(0, positionX - amount));
        break;
      case 'right':
        setPositionX(Math.min(100, positionX + amount));
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview Area - Larger and more prominent */}
      <div className="relative w-full aspect-[21/9] bg-muted rounded-xl overflow-hidden border-2 border-border">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="City preview"
            className="w-full h-full object-cover transition-all duration-200"
            style={{
              objectPosition: `${positionX}% ${positionY}%`,
              transform: `scale(${zoom / 100})`,
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No image selected</p>
              <p className="text-sm">Upload or paste an image URL below</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
        <div className="absolute bottom-3 left-3 text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
          Preview as seen in app
        </div>
      </div>

      {/* Image URL or Upload */}
      <div className="space-y-2">
        <Label>Image URL or Upload</Label>
        <div className="flex gap-2">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {/* Quick Position Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Position Controls</Label>
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </div>
        
        {/* D-Pad style position control */}
        <div className="flex items-center justify-center gap-2">
          <div className="grid grid-cols-3 gap-1 w-fit">
            <div />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => adjustPosition('up')}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <div />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => adjustPosition('left')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="h-10 w-10 flex items-center justify-center text-xs text-muted-foreground">
              {positionX},{positionY}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => adjustPosition('right')}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
            <div />
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => adjustPosition('down')}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            <div />
          </div>
        </div>
      </div>

      {/* Fine-tune Sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Move className="w-4 h-4" />
            Horizontal ({positionX}%)
          </Label>
          <Slider
            value={[positionX]}
            onValueChange={(v) => setPositionX(v[0])}
            min={0}
            max={100}
            step={1}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Move className="w-4 h-4 rotate-90" />
            Vertical ({positionY}%)
          </Label>
          <Slider
            value={[positionY]}
            onValueChange={(v) => setPositionY(v[0])}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </div>

      {/* Zoom Control */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ZoomIn className="w-4 h-4" />
          Zoom ({zoom}%)
        </Label>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setZoom(Math.max(100, zoom - 10))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Slider
            value={[zoom]}
            onValueChange={(v) => setZoom(v[0])}
            min={100}
            max={200}
            step={5}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Check className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, Image, Loader2, X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VenueGalleryManagerProps {
  venueId: string;
  galleryImages: string[];
  onImagesUpdated: () => void;
}

export function VenueGalleryManager({ venueId, galleryImages, onImagesUpdated }: VenueGalleryManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const images = galleryImages || [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${venueId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }

      if (newImages.length > 0) {
        // Update venue with new images
        const updatedImages = [...images, ...newImages];
        
        const { error: updateError } = await supabase
          .from('venues')
          .update({ gallery_images: updatedImages })
          .eq('id', venueId);

        if (updateError) {
          toast.error('Failed to save images to venue');
          console.error(updateError);
        } else {
          toast.success(`${newImages.length} image(s) uploaded successfully`);
          onImagesUpdated();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred while uploading');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (index: number) => {
    const imageUrl = images[index];
    
    try {
      // Remove from array
      const updatedImages = images.filter((_, i) => i !== index);
      
      const { error } = await supabase
        .from('venues')
        .update({ gallery_images: updatedImages })
        .eq('id', venueId);

      if (error) {
        toast.error('Failed to remove image');
        console.error(error);
      } else {
        toast.success('Image removed');
        onImagesUpdated();
        
        // Optionally delete from storage (extract path from URL)
        try {
          const url = new URL(imageUrl);
          const path = url.pathname.split('/storage/v1/object/public/avatars/')[1];
          if (path) {
            await supabase.storage.from('avatars').remove([decodeURIComponent(path)]);
          }
        } catch (e) {
          // Ignore storage delete errors
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred while removing the image');
    }
  };

  const handleSetHeroImage = async (index: number) => {
    if (index === 0) return; // Already the hero
    
    const updatedImages = [...images];
    const [heroImage] = updatedImages.splice(index, 1);
    updatedImages.unshift(heroImage);
    
    const { error } = await supabase
      .from('venues')
      .update({ gallery_images: updatedImages })
      .eq('id', venueId);

    if (error) {
      toast.error('Failed to set hero image');
    } else {
      toast.success('Hero image updated');
      onImagesUpdated();
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const updatedImages = [...images];
    const [draggedImage] = updatedImages.splice(draggedIndex, 1);
    updatedImages.splice(targetIndex, 0, draggedImage);

    const { error } = await supabase
      .from('venues')
      .update({ gallery_images: updatedImages })
      .eq('id', venueId);

    if (error) {
      toast.error('Failed to reorder images');
    } else {
      onImagesUpdated();
    }
    
    setDraggedIndex(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Gallery Images
            </CardTitle>
            <CardDescription>
              Manage venue photos. First image is the hero image.
            </CardDescription>
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload Images</>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No images yet. Click to upload.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Supports JPG, PNG, WebP (max 5MB each)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div
                  key={image}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={cn(
                    "relative group aspect-square rounded-lg overflow-hidden border border-border",
                    index === 0 && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    draggedIndex === index && "opacity-50"
                  )}
                >
                  <img
                    src={image}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setPreviewImage(image)}
                  />
                  
                  {/* Hero badge */}
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Hero
                    </div>
                  )}
                  
                  {/* Drag handle */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                    <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
                  </div>
                  
                  {/* Action overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {index !== 0 && (
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetHeroImage(index);
                        }}
                      >
                        Set as Hero
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(index);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Add more button */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground mt-4">
            Drag images to reorder. Changes sync to user app in real-time.
          </p>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>Full size image preview</DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

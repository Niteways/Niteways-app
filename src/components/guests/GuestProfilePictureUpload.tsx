import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GuestProfilePictureUploadProps {
  currentUrl?: string;
  name: string;
  onUpload: (url: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  overlayOnly?: boolean; // When true, hides the avatar and only shows camera hover overlay
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-28 h-28",
};

export function GuestProfilePictureUpload({
  currentUrl,
  name,
  onUpload,
  size = "lg",
  className,
  overlayOnly = false,
}: GuestProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `guest-${Date.now()}.${fileExt}`;
      const filePath = `guests/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast.success("Profile picture uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onUpload("");
    toast.success("Profile picture removed");
  };

  return (
    <div className={cn("relative group", className)}>
      {!overlayOnly && (
        <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
          <AvatarImage src={currentUrl} alt={name} />
          <AvatarFallback className="text-lg font-semibold bg-muted">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      )}

      {overlayOnly && (
        <div className={cn(sizeClasses[size], "rounded-full")} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-white" />
        ) : (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-white hover:bg-white/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4" />
            </Button>
            {currentUrl && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white hover:bg-white/20"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

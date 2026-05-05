import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Camera,
  Save,
  Building,
  ChevronLeft,
} from "lucide-react";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePicture, setProfilePicture] = useState<string>("");
  
  const [userData, setUserData] = useState({
    id: "USR-001",
    name: "John Doe",
    email: "john@nightflow.com",
    phone: "+1 555-0123",
    role: "Manager",
    venueName: "NightFlow Club",
    memberSince: "2023",
  });

  // Load user data from localStorage on mount
  useEffect(() => {
    const savedPicture = localStorage.getItem("userProfilePicture");
    if (savedPicture) {
      setProfilePicture(savedPicture);
    }
    
    const savedUserData = localStorage.getItem("userProfileData");
    if (savedUserData) {
      try {
        const parsed = JSON.parse(savedUserData);
        setUserData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, []);

  const handleSaveProfile = () => {
    // Save to localStorage
    localStorage.setItem("userProfileData", JSON.stringify(userData));
    localStorage.setItem("userProfilePicture", profilePicture);
    
    // Dispatch storage event to sync across all components in real-time
    window.dispatchEvent(new StorageEvent("storage", {
      key: "userProfileData",
      newValue: JSON.stringify(userData),
    }));
    window.dispatchEvent(new CustomEvent("profileUpdated", { detail: userData }));
    
    toast.success("Profile saved successfully! Header initials updated.");
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfilePicture(base64);
        localStorage.setItem("userProfilePicture", base64);
        window.dispatchEvent(new StorageEvent("storage", {
          key: "userProfilePicture",
          newValue: base64,
        }));
        toast.success("Profile picture updated!");
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <AdminLayout title="Profile Settings" subtitle="Update your personal information">
      <div className="space-y-6 pb-20 md:pb-0 max-w-2xl mx-auto">
        {/* Back button on mobile */}
        {isMobile && (
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}

        {/* Profile Picture Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-28 h-28 border-4 border-primary/20">
                    <AvatarImage src={profilePicture} />
                    <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                      {getInitials(userData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-lg"
                    onClick={handleProfilePictureClick}
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Click the camera icon to change your photo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your initials will show as: <span className="font-semibold text-foreground">{getInitials(userData.name)}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your name and it will sync with the header initials in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name"
                  value={userData.name} 
                  onChange={e => setUserData({...userData, name: e.target.value})}
                  placeholder="Enter your full name"
                />
                <p className="text-xs text-muted-foreground">
                  This name will be displayed in the header and throughout the app
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email Address
                </Label>
                <Input 
                  id="email"
                  type="email" 
                  value={userData.email}
                  onChange={e => setUserData({...userData, email: e.target.value})}
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone Number
                </Label>
                <Input 
                  id="phone"
                  value={userData.phone}
                  onChange={e => setUserData({...userData, phone: e.target.value})}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue" className="flex items-center gap-2">
                  <Building className="w-4 h-4" /> Venue Name
                </Label>
                <Input 
                  id="venue"
                  value={userData.venueName}
                  onChange={e => setUserData({...userData, venueName: e.target.value})}
                  placeholder="Enter your venue name"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button 
            onClick={handleSaveProfile} 
            className="w-full h-12 gap-2 text-base"
            size="lg"
          >
            <Save className="w-5 h-5" />
            Save Profile Settings
          </Button>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default ProfileSettings;

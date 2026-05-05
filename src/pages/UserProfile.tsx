import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MemberIdCard } from "@/components/guests/MemberIdCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMenuSettings } from "@/hooks/useMenuSettings";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  Lock,
  Camera,
  Save,
  GripVertical,
  LayoutDashboard,
  CalendarDays,
  Users,
  QrCode,
  FileText,
  Settings,
  BarChart3,
  Shield,
  Ticket,
  MessageSquare,
} from "lucide-react";

// All available menu options
const allMenuOptions = [
  { id: "home", label: "Home", icon: LayoutDashboard, href: "/" },
  { id: "tables", label: "Tables", icon: CalendarDays, href: "/tables" },
  { id: "guests", label: "Guests", icon: Users, href: "/guests" },
  { id: "checkin", label: "Check In", icon: QrCode, href: "/checkin" },
  { id: "requests", label: "Requests", icon: FileText, href: "/booking-requests" },
  { id: "team", label: "Team", icon: Users, href: "/team" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
  { id: "security", label: "Security", icon: Shield, href: "/mobile-security" },
  { id: "tickets", label: "Ticketing", icon: Ticket, href: "/tickets" },
  { id: "chat", label: "Chat", icon: MessageSquare, href: "/chat" },
];

const UserProfile = () => {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMenuItems, setSelectedMenuItems] = useState(["home", "tables", "guests", "checkin"]);
  const [activeTab, setActiveTab] = useState("profile");
  const [profilePicture, setProfilePicture] = useState<string>("");
  
  // Editable user data state
  const [userData, setUserData] = useState({
    id: "USR-001",
    name: "John Doe",
    email: "john@nightflow.com",
    phone: "+1 555-0123",
    role: "Manager",
    venueName: "NightFlow Club",
    memberSince: "2023",
    totalCheckIns: 1250,
    totalGuestsAdded: 3450,
    loyaltyLevel: "gold",
    rating: 4.8,
  });

  // Load user data and menu items from storage
  useEffect(() => {
    const saved = localStorage.getItem("mobileMenuConfig");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setSelectedMenuItems(parsed);
        }
      } catch (e) {
        console.error("Failed to parse menu config", e);
      }
    }
    
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
    localStorage.setItem("userProfileData", JSON.stringify(userData));
    localStorage.setItem("userProfilePicture", profilePicture);
    // Dispatch storage event to sync across components
    window.dispatchEvent(new StorageEvent("storage", {
      key: "userProfileData",
      newValue: JSON.stringify(userData),
    }));
    toast.success("Profile saved successfully!");
  };

  const handleMenuItemChange = (index: number, value: string) => {
    const newItems = [...selectedMenuItems];
    newItems[index] = value;
    setSelectedMenuItems(newItems);
  };

  const handleSaveMenu = () => {
    localStorage.setItem("mobileMenuConfig", JSON.stringify(selectedMenuItems));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "mobileMenuConfig",
      newValue: JSON.stringify(selectedMenuItems),
    }));
    toast.success("Menu saved successfully!");
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
        toast.success("Profile picture updated!");
      };
      reader.readAsDataURL(file);
    }
  };

  if (isMobile) {
    return (
      <AdminLayout title="Profile" subtitle="Manage your account settings">
        <div className="space-y-4 pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto">
              <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
              <TabsTrigger value="card" className="text-xs">My Card</TabsTrigger>
              <TabsTrigger value="menu" className="text-xs">Menu</TabsTrigger>
              <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <Avatar className="w-24 h-24">
                          <AvatarImage src={profilePicture} />
                          <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                            {userData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                          onClick={handleProfilePictureClick}
                        >
                          <Camera className="w-4 h-4" />
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
                        <h2 className="text-lg font-semibold">{userData.name}</h2>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-0">
                          {userData.role}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Personal Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Full Name</Label>
                      <Input 
                        value={userData.name} 
                        onChange={e => setUserData({...userData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </Label>
                      <Input 
                        type="email" 
                        value={userData.email}
                        onChange={e => setUserData({...userData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Phone
                      </Label>
                      <Input 
                        value={userData.phone}
                        onChange={e => setUserData({...userData, phone: e.target.value})}
                      />
                    </div>
                    <Button className="w-full gap-2" onClick={handleSaveProfile}>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* My Card Tab */}
            <TabsContent value="card" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="p-4 flex justify-center">
                  <MemberIdCard 
                    name={userData.name}
                    guestId={userData.id}
                    loyaltyLevel={userData.loyaltyLevel as "bronze" | "silver" | "gold" | "platinum"}
                    avatarUrl={profilePicture}
                  />
                </div>
                <Card className="bg-muted/20 mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Your Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <p className="text-xl font-bold text-primary">{userData.totalCheckIns}</p>
                        <p className="text-xs text-muted-foreground">Total Check-ins</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <p className="text-xl font-bold text-teal">{userData.totalGuestsAdded}</p>
                        <p className="text-xs text-muted-foreground">Guests Added</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Menu Tab */}
            <TabsContent value="menu" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Customize Main Menu</CardTitle>
                    <p className="text-xs text-muted-foreground">Choose which items appear in your bottom navigation</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Position {index + 1}</Label>
                          <Select 
                            value={selectedMenuItems[index]} 
                            onValueChange={(v) => handleMenuItemChange(index, v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allMenuOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  <div className="flex items-center gap-2">
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    <Button className="w-full mt-4 gap-2" onClick={handleSaveMenu}>
                      <Save className="w-4 h-4" />
                      Save Menu
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Current Password</Label>
                      <Input type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">New Password</Label>
                      <Input type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Confirm New Password</Label>
                      <Input type="password" />
                    </div>
                    <Button className="w-full">Update Password</Button>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Enable 2FA</Label>
                        <p className="text-xs text-muted-foreground">Add extra security</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Access & Permissions - View Only */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Your Access & Permissions
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">View-only - contact admin to change</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-teal/10 rounded-lg border border-teal/20">
                        <p className="text-xs font-medium text-teal">✓ Dashboard</p>
                      </div>
                      <div className="p-2 bg-teal/10 rounded-lg border border-teal/20">
                        <p className="text-xs font-medium text-teal">✓ Guest Lists</p>
                      </div>
                      <div className="p-2 bg-teal/10 rounded-lg border border-teal/20">
                        <p className="text-xs font-medium text-teal">✓ Check-In</p>
                      </div>
                      <div className="p-2 bg-teal/10 rounded-lg border border-teal/20">
                        <p className="text-xs font-medium text-teal">✓ Table Bookings</p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded-lg border border-border">
                        <p className="text-xs font-medium text-muted-foreground">✗ Analytics</p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded-lg border border-border">
                        <p className="text-xs font-medium text-muted-foreground">✗ Settings</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Role: <span className="font-medium text-foreground">{userData.role}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    );
  }

  // Desktop layout
  return (
    <AdminLayout title="Profile" subtitle="Manage your account settings">
      <div className="max-w-4xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-6 glass-card p-6"
        >
          <div className="relative">
            <Avatar className="w-24 h-24">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                JD
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{userData.name}</h2>
            <p className="text-muted-foreground">{userData.email}</p>
            <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-0">
              {userData.role} at {userData.venueName}
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input defaultValue={userData.name} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" defaultValue={userData.email} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue={userData.phone} />
                </div>
                <Button className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input type="password" />
                </div>
                <Button className="w-full">Update Password</Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserProfile;

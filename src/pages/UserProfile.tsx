import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MemberIdCard } from "@/components/guests/MemberIdCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatRoleLabel } from "@/hooks/useVenueProfile";
import { uploadVenuePortalProfileAvatarFile } from "@/lib/venuePortalProfileAvatar";
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

type UserDataState = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  venueName: string;
  memberSince: string;
  totalCheckIns: number;
  totalGuestsAdded: number;
  loyaltyLevel: string;
  rating: number;
};

const emptyUser: UserDataState = {
  id: "",
  name: "",
  email: "",
  phone: "",
  role: "guest",
  venueName: "",
  memberSince: "",
  totalCheckIns: 0,
  totalGuestsAdded: 0,
  loyaltyLevel: "gold",
  rating: 0,
};

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "U";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

const UserProfile = () => {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const desktopFileRef = useRef<HTMLInputElement>(null);
  const [selectedMenuItems, setSelectedMenuItems] = useState(["home", "tables", "guests", "checkin"]);
  const [activeTab, setActiveTab] = useState("profile");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [userData, setUserData] = useState<UserDataState>(emptyUser);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);

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

    const load = async () => {
      const savedPicture = localStorage.getItem("userProfilePicture");

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.user) {
        setUserData(emptyUser);
        setProfileLoaded(true);
        return;
      }

      const u = session.user;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const phone =
        (typeof meta.mobile === "string" && meta.mobile) ||
        (typeof meta.phone === "string" && meta.phone) ||
        "";
      const fn = typeof meta.first_name === "string" ? meta.first_name : "";
      const ln = typeof meta.last_name === "string" ? meta.last_name : "";
      const fromMeta = [fn, ln].filter(Boolean).join(" ").trim();

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email, role, venue_id, created_at, avatar_url")
        .eq("id", u.id)
        .maybeSingle();

      const fromDbAvatar = (prof?.avatar_url || "").trim();
      if (fromDbAvatar) {
        setProfilePicture(fromDbAvatar);
        localStorage.setItem("userProfilePicture", fromDbAvatar);
      } else if (savedPicture) {
        setProfilePicture(savedPicture);
      }

      let venueName = "";
      if (prof?.venue_id) {
        const { data: vn } = await supabase.from("venues").select("name").eq("id", prof.venue_id).maybeSingle();
        venueName = vn?.name ?? "";
      }

      setUserData({
        id: u.id,
        name: (prof?.full_name || fromMeta || u.email?.split("@")[0] || "").trim(),
        email: u.email ?? prof?.email ?? "",
        phone,
        role: prof?.role ?? (typeof meta.role === "string" ? meta.role : "guest"),
        venueName,
        memberSince: prof?.created_at ? String(new Date(prof.created_at).getFullYear()) : "",
        totalCheckIns: 0,
        totalGuestsAdded: 0,
        loyaltyLevel: "gold",
        rating: 0,
      });
      setProfileLoaded(true);
    };

    void load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSaveProfile = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.user) {
      toast.error("Sign in to save your profile.");
      return;
    }
    const u = session.user;
    const nameTrim = userData.name.trim();
    const emailTrim = userData.email.trim();
    const phoneTrim = userData.phone.trim();

    setSavingProfile(true);
    try {
      if (emailTrim && emailTrim !== (u.email ?? "")) {
        const { error: emErr } = await supabase.auth.updateUser({ email: emailTrim });
        if (emErr) {
          toast.error(emErr.message);
          return;
        }
        toast.info("If required, confirm your new email from the inbox.");
      }

      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          mobile: phoneTrim,
          full_name: nameTrim,
        },
      });
      if (metaErr) console.warn("user_metadata update", metaErr);

      const { error: pErr } = await supabase.from("profiles").upsert(
        {
          id: u.id,
          full_name: nameTrim,
          email: emailTrim || u.email || null,
          role: userData.role || "guest",
          updated_at: new Date().toISOString(),
          ...(profilePicture.startsWith("http") ? { avatar_url: profilePicture } : {}),
        },
        { onConflict: "id" }
      );
      if (pErr) {
        toast.error(pErr.message);
        return;
      }

      if (profilePicture.startsWith("http") || profilePicture.startsWith("data:")) {
        localStorage.setItem("userProfilePicture", profilePicture);
      }
      const first = nameTrim.split(/\s+/)[0] ?? "";
      const last = nameTrim.split(/\s+/).slice(1).join(" ");
      localStorage.setItem(
        "userProfileData",
        JSON.stringify({
          name: nameTrim,
          firstName: first,
          lastName: last,
          role: formatRoleLabel(userData.role) || userData.role,
        })
      );
      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: {
            name: nameTrim,
            firstName: first,
            lastName: last,
            role: formatRoleLabel(userData.role),
          },
        })
      );
      setUserData((prev) => ({
        ...prev,
        name: nameTrim,
        email: emailTrim || prev.email,
        phone: phoneTrim,
      }));
      toast.success("Profile saved to Supabase.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (pwNew.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (pwNew !== pwConfirm) {
      toast.error("New passwords do not match.");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email;
    if (!email) {
      toast.error("No active session.");
      return;
    }
    setSavingPw(true);
    try {
      const { error: reErr } = await supabase.auth.signInWithPassword({
        email,
        password: pwCurrent,
      });
      if (reErr) {
        toast.error("Current password is incorrect.");
        return;
      }
      const { error: upErr } = await supabase.auth.updateUser({ password: pwNew });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      toast.success("Password updated.");
    } finally {
      setSavingPw(false);
    }
  };

  const handleMenuItemChange = (index: number, value: string) => {
    const newItems = [...selectedMenuItems];
    newItems[index] = value;
    setSelectedMenuItems(newItems);
  };

  const handleSaveMenu = () => {
    localStorage.setItem("mobileMenuConfig", JSON.stringify(selectedMenuItems));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "mobileMenuConfig",
        newValue: JSON.stringify(selectedMenuItems),
      })
    );
    toast.success("Menu saved successfully!");
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleDesktopAvatarClick = () => {
    desktopFileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) {
      toast.error("Sign in to update your photo.");
      return;
    }

    const { url, error } = await uploadVenuePortalProfileAvatarFile(supabase, uid, file);
    if (error || !url) {
      toast.error(error || "Upload failed.");
      return;
    }

    setProfilePicture(url);
    localStorage.setItem("userProfilePicture", url);

    const { error: pErr } = await supabase.from("profiles").upsert(
      {
        id: uid,
        avatar_url: url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (pErr) {
      toast.error(pErr.message);
      return;
    }

    toast.success("Profile photo saved — it will show on your venue app.");
    window.dispatchEvent(new CustomEvent("profileUpdated"));
  };

  if (isMobile) {
    if (!profileLoaded) {
      return (
        <AdminLayout title="Profile" subtitle="Manage your account settings">
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        </AdminLayout>
      );
    }
    if (!userData.id) {
      return (
        <AdminLayout title="Profile" subtitle="Manage your account settings">
          <div className="p-6 text-center space-y-4">
            <p className="text-muted-foreground text-sm">Sign in to load your profile.</p>
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </AdminLayout>
      );
    }
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
                            {initialsFromName(userData.name)}
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
                          {formatRoleLabel(userData.role) || userData.role}
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
                    <Button className="w-full gap-2" onClick={() => void handleSaveProfile()} disabled={savingProfile}>
                      <Save className="w-4 h-4" />
                      {savingProfile ? "Saving…" : "Save Changes"}
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
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">New Password</Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={pwNew}
                        onChange={(e) => setPwNew(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Confirm New Password</Label>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" disabled={savingPw} onClick={() => void handleUpdatePassword()}>
                      {savingPw ? "Updating…" : "Update Password"}
                    </Button>
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
                        Role:{" "}
                        <span className="font-medium text-foreground">
                          {formatRoleLabel(userData.role) || userData.role}
                        </span>
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
  if (!profileLoaded) {
    return (
      <AdminLayout title="Profile" subtitle="Manage your account settings">
        <div className="max-w-4xl flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!userData.id) {
    return (
      <AdminLayout title="Profile" subtitle="Manage your account settings">
        <div className="max-w-md mx-auto glass-card p-8 text-center space-y-4">
          <p className="text-muted-foreground">Sign in to load your venue profile from Supabase.</p>
          <Button asChild>
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const roleBadge = formatRoleLabel(userData.role) || userData.role;
  const venueLine = userData.venueName ? `${roleBadge} at ${userData.venueName}` : roleBadge;

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
              <AvatarImage src={profilePicture} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {initialsFromName(userData.name)}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
              type="button"
              onClick={handleDesktopAvatarClick}
            >
              <Camera className="w-4 h-4" />
            </Button>
            <input
              ref={desktopFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{userData.name || "Your profile"}</h2>
            <p className="text-muted-foreground">{userData.email}</p>
            <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-0">
              {venueLine}
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Input
                    value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored in Supabase Auth user metadata as <code className="text-xs">mobile</code> (same as the
                    venue app).
                  </p>
                </div>
                <Button className="w-full gap-2" disabled={savingProfile} onClick={() => void handleSaveProfile()}>
                  <Save className="w-4 h-4" />
                  {savingProfile ? "Saving…" : "Save Changes"}
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
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                  />
                </div>
                <Button className="w-full" disabled={savingPw} onClick={() => void handleUpdatePassword()}>
                  {savingPw ? "Updating…" : "Update Password"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Forgot your password? Use <Link className="text-primary underline" to="/login">Forgot password?</Link>{" "}
                  on the sign-in page.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserProfile;

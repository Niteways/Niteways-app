import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, ChevronDown, Eye, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

// Function to get initials from a name
const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { isImpersonating, impersonatedMember, impersonatedVenueId, stopImpersonation } = useImpersonation();
  
  // Sync profile name from localStorage or use default
  const [profileName, setProfileName] = useState("Guest User");
  const [profileRole, setProfileRole] = useState("Manager");
  const [profilePicture, setProfilePicture] = useState<string>("");
  const [venueName, setVenueName] = useState<string>("");
  const [venueShortId, setVenueShortId] = useState<string>("");
  
  // Fetch venue name when impersonating
  useEffect(() => {
    if (isImpersonating && impersonatedVenueId) {
      supabase
        .from('venues')
        .select('name, venue_id')
        .eq('id', impersonatedVenueId)
        .single()
        .then(({ data }) => {
          if (data) {
            setVenueName(data.name);
            setVenueShortId(data.venue_id);
          }
        });
    } else {
      setVenueName("");
      setVenueShortId("");
    }
  }, [isImpersonating, impersonatedVenueId]);

  useEffect(() => {
    const loadProfileFromLocal = () => {
      const savedProfileData = localStorage.getItem("userProfileData");
      if (savedProfileData) {
        try {
          const profile = JSON.parse(savedProfileData);
          const fullName = (profile.name || `${profile.firstName || ""} ${profile.lastName || ""}`)
            .trim()
            .replace(/\s+/g, " ");
          if (fullName) setProfileName(fullName);
          if (profile.role) setProfileRole(profile.role);
        } catch (e) {
          console.error("Failed to parse profile:", e);
        }
      }

      const savedPicture = localStorage.getItem("userProfilePicture");
      if (savedPicture) setProfilePicture(savedPicture);
    };

    const applyAuthUser = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) {
        setProfileName("Guest User");
        setProfileRole("Manager");
        loadProfileFromLocal();
        return;
      }
      const m = user.user_metadata ?? {};
      const fromMeta = [m.full_name, m.name, m.display_name].find(
        (v) => typeof v === "string" && String(v).trim()
      ) as string | undefined;
      const n = (fromMeta?.trim() || user.email?.split("@")[0] || "").trim();
      if (n) setProfileName(n);
      if (typeof m.role === "string" && m.role.trim()) setProfileRole(m.role.trim());
      const savedPicture = localStorage.getItem("userProfilePicture");
      if (savedPicture) setProfilePicture(savedPicture);
    };

    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      applyAuthUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      applyAuthUser(session?.user ?? null);
    });

    // Listen for profile updates via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userProfileData" && e.newValue) {
        try {
          const profile = JSON.parse(e.newValue);
          const fullName = (profile.name || `${profile.firstName || ""} ${profile.lastName || ""}`)
            .trim()
            .replace(/\s+/g, " ");
          if (fullName) setProfileName(fullName);
          if (profile.role) setProfileRole(profile.role);
        } catch (e) {
          console.error("Failed to parse profile:", e);
        }
      }

      if (e.key === "userProfilePicture" && e.newValue) {
        setProfilePicture(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom event for same-tab updates
    const handleProfileUpdate = (e: CustomEvent) => {
      if (e.detail?.name || e.detail?.firstName || e.detail?.lastName) {
        const fullName = (e.detail?.name || `${e.detail?.firstName || ""} ${e.detail?.lastName || ""}`)
          .trim()
          .replace(/\s+/g, " ");
        if (fullName) setProfileName(fullName);
      }
      if (e.detail?.role) setProfileRole(e.detail.role);
    };
    window.addEventListener("profileUpdated", handleProfileUpdate as EventListener);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profileUpdated", handleProfileUpdate as EventListener);
    };
  }, []);

  const handleStopImpersonation = () => {
    const shortId = venueShortId;
    stopImpersonation();
    navigate(shortId ? `/admin/venue/${shortId}` : "/admin/venues");
  };

  const initials = getInitials(profileName);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      {/* Impersonation Indicator Banner */}
      {isImpersonating && venueName && (
        <div className="bg-primary/20 border-b border-primary/30 px-4 py-1.5 flex items-center justify-center gap-3">
          <Eye className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary font-medium">
            Viewing as: {impersonatedMember?.name} @ {venueName}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStopImpersonation}
            className="h-7 px-2 text-xs gap-1.5 border-primary/30 bg-background/40 hover:bg-background/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            Stop
          </Button>
        </div>
      )}
      
      {/* Top row - Search and actions */}
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side - Title on desktop */}
        <div className="hidden md:block">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-64 pl-9 bg-muted/50 border-border/50"
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-coral border-0">
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profilePicture} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">{profileName}</p>
                  <p className="text-xs text-muted-foreground">{profileRole}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom row - Page title for mobile only */}
      <div className="md:hidden px-6 py-3 border-t border-border/50">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
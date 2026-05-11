import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { REQUIRE_VENUE_PORTAL_AUTH } from "@/config/deployMode";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
}

type UserProfileData = {
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

const getInitials = (profile: UserProfileData): string => {
  const fullName = (profile.name || `${profile.firstName || ""} ${profile.lastName || ""}`)
    .trim()
    .replace(/\s+/g, " ");

  if (!fullName) return "U";
  const parts = fullName.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function MobileHeader({ title, subtitle }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const isHomePage = title === "Dashboard" || title === "";

  const [profile, setProfile] = useState<UserProfileData>({
    name: "Guest User",
    role: "Manager",
  });
  const [profilePicture, setProfilePicture] = useState<string>("");

  useEffect(() => {
    const load = () => {
      const savedUserData = localStorage.getItem("userProfileData");
      if (savedUserData) {
        try {
          setProfile((prev) => ({ ...prev, ...JSON.parse(savedUserData) }));
        } catch {
          // ignore
        }
      }
      const savedPicture = localStorage.getItem("userProfilePicture");
      if (savedPicture) setProfilePicture(savedPicture);
    };

    load();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "userProfileData" && e.newValue) {
        try {
          setProfile((prev) => ({ ...prev, ...JSON.parse(e.newValue!) }));
        } catch {
          // ignore
        }
      }
      if (e.key === "userProfilePicture" && e.newValue) {
        setProfilePicture(e.newValue);
      }
    };

    const handleProfileUpdate = (e: CustomEvent) => {
      if (e.detail) setProfile((prev) => ({ ...prev, ...e.detail }));
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("profileUpdated", handleProfileUpdate as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("profileUpdated", handleProfileUpdate as EventListener);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (REQUIRE_VENUE_PORTAL_AUTH) {
      navigate("/login", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const initials = getInitials(profile);
  const fullName = (profile.name || `${profile.firstName || ""} ${profile.lastName || ""}`)
    .trim()
    .replace(/\s+/g, " ");

  return (
    <header className="border-b border-border bg-background sticky top-0 z-40 safe-area-top">
      {/* Top row - Niteways branding and actions */}
      <div className="flex items-center justify-between h-14 px-4">
        {/* Niteways branding */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-bold text-foreground text-2xl">Niteways</span>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <Badge className="absolute -top-0.5 -right-0.5 w-4 h-4 p-0 flex items-center justify-center text-[10px] bg-coral border-0">
              {unreadCount > 0 ? unreadCount : 0}
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={profilePicture} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[200] w-48">
              <DropdownMenuLabel>
                <div>
                  <p className="text-sm font-medium">{fullName || "Guest User"}</p>
                  <p className="text-xs text-muted-foreground">{profile.role || "Manager"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile/settings" className="cursor-pointer">
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onSelect={() => void handleSignOut()}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Page Title - show on all pages except home */}
      {!isHomePage && title && (
        <div className="px-4 pb-3">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}

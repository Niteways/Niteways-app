import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useVenueProfile } from "@/hooks/useVenueProfile";
import { REQUIRE_VENUE_PORTAL_AUTH } from "@/config/deployMode";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

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
  const { displayName, roleLabel } = useVenueProfile();

  const [profilePicture, setProfilePicture] = useState<string>("");
  const [venueName, setVenueName] = useState<string>("");
  const [venueShortId, setVenueShortId] = useState<string>("");

  const profileName = displayName.trim() || "Guest User";
  const profileRole = roleLabel;

  useEffect(() => {
    if (isImpersonating && impersonatedVenueId) {
      supabase
        .from("venues")
        .select("name, venue_id")
        .eq("id", impersonatedVenueId)
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
    const syncPicture = () => {
      const savedPicture = localStorage.getItem("userProfilePicture");
      setProfilePicture(savedPicture || "");
    };
    syncPicture();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "userProfilePicture" && e.newValue !== null) {
        setProfilePicture(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const handleProfileUpdate = () => syncPicture();
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
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

  const handleStopImpersonation = () => {
    const shortId = venueShortId;
    stopImpersonation();
    navigate(shortId ? `/admin/venue/${shortId}` : "/admin/venues");
  };

  const initials = getInitials(profileName);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
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

      <div className="flex items-center justify-between h-16 px-6">
        <div className="hidden md:block">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-64 pl-9 bg-muted/50 border-border/50"
            />
          </div>

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-coral border-0">
              3
            </Badge>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profilePicture} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground">{profileName}</p>
                  <p className="text-xs text-muted-foreground">{profileRole}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[200] w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  Profile
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

      <div className="md:hidden px-6 py-3 border-t border-border/50">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </header>
  );
}

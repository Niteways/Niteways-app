import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  QrCode, 
  Menu,
  FileText,
  Users2,
  Settings,
  BarChart3,
  Shield,
  Ticket,
  MessageSquare,
} from "lucide-react";
import { useMenuSettings } from "@/hooks/useMenuSettings";
import { useMemo, useEffect, useState } from "react";

// All available menu options
const allMenuOptions: Record<string, { label: string; href: string; icon: any }> = {
  home: { label: "Home", href: "/", icon: LayoutDashboard },
  tables: { label: "Tables", href: "/tables", icon: CalendarDays },
  guests: { label: "Guests", href: "/guests", icon: Users },
  checkin: { label: "Check In", href: "/checkin", icon: QrCode },
  requests: { label: "Requests", href: "/booking-requests", icon: FileText },
  team: { label: "Team", href: "/team", icon: Users2 },
  settings: { label: "Settings", href: "/settings", icon: Settings },
  analytics: { label: "Analytics", href: "/analytics", icon: BarChart3 },
  security: { label: "Security", href: "/mobile-security", icon: Shield },
  tickets: { label: "Tickets", href: "/tickets", icon: Ticket },
  chat: { label: "Chat", href: "/chat", icon: MessageSquare },
};

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { menuItems, isLoaded } = useMenuSettings();
  const [localMenuItems, setLocalMenuItems] = useState(["home", "tables", "guests", "checkin"]);

  // Sync with localStorage changes
  useEffect(() => {
    if (isLoaded) {
      setLocalMenuItems(menuItems);
    }
  }, [menuItems, isLoaded]);

  // Also listen for storage events directly
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mobileMenuConfig" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length === 4) {
            setLocalMenuItems(parsed);
          }
        } catch (err) {
          console.error("Failed to parse menu config", err);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const mainNavItems = useMemo(() => {
    return localMenuItems.map((id) => {
      const option = allMenuOptions[id];
      return option ? { title: option.label, href: option.href, icon: option.icon } : null;
    }).filter(Boolean) as { title: string; href: string; icon: any }[];
  }, [localMenuItems]);

  const mobileMainRoutes = mainNavItems.map(item => item.href);
  const currentIndex = mobileMainRoutes.indexOf(location.pathname);
  const isMorePage = location.pathname === "/more";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      {/* Page indicators */}
      <div className="flex justify-center gap-1.5 pt-2">
        {mainNavItems.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              index === currentIndex 
                ? "bg-primary w-4" 
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-around h-14 px-2">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </NavLink>
          );
        })}
        <button
          onClick={() => navigate("/more")}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
            isMorePage ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Menu className={cn("w-5 h-5", isMorePage && "text-primary")} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}

// Export for other components that need the routes
export const mobileMainRoutes = ["/", "/tables", "/guests", "/checkin"];
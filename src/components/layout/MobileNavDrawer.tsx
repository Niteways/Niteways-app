import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Building2,
  Shield,
  ClipboardList,
  Users2,
  QrCode,
  Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePortal } from "@/contexts/PortalContext";

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Only the pages needed for mobile venue layout
const mobileVenueNavGroups = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Booking Management",
    items: [
      { title: "Table Booking", href: "/tables", icon: CalendarDays },
      { title: "Booking Requests", href: "/booking-requests", icon: ClipboardList },
      { title: "Guest List", href: "/guests", icon: Users },
      { title: "Ticketing", href: "/tickets", icon: Sparkles },
    ],
  },
  {
    title: "Team & Security",
    items: [
      { title: "Team", href: "/team", icon: Users2 },
      { title: "Check In", href: "/checkin", icon: QrCode },
      { title: "Security", href: "/mobile-security", icon: Shield },
    ],
  },
];

export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, setMode, isVenuePortalOnly } = usePortal();
  const isAdminMode = mode === "admin";

  const handlePortalSwitch = (checked: boolean) => {
    if (isVenuePortalOnly) return;
    const currentKey = isAdminMode ? "admin_last_route" : "venue_last_route";
    localStorage.setItem(currentKey, location.pathname);
    const targetMode = checked ? "admin" : "venue";
    const targetKey = checked ? "admin_last_route" : "venue_last_route";
    const lastRoute = localStorage.getItem(targetKey);
    setMode(targetMode);
    navigate(lastRoute || (checked ? "/admin" : "/"));
    onOpenChange(false);
  };

  const handleNavClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] max-w-sm p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold">Niteways</SheetTitle>
          </div>
        </SheetHeader>

        {!isVenuePortalOnly && (
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              {isAdminMode ? (
                <Shield className="w-4 h-4 text-coral" />
              ) : (
                <Building2 className="w-4 h-4 text-teal" />
              )}
              <Label className="text-sm font-medium">
                {isAdminMode ? "Admin Portal" : "Venue Portal"}
              </Label>
            </div>
            <Switch
              checked={isAdminMode}
              onCheckedChange={handlePortalSwitch}
              className="data-[state=checked]:bg-coral"
            />
          </div>
        </div>
        )}

        <ScrollArea className="h-[calc(100vh-140px)]">
          <nav className="p-4 space-y-6">
            {mobileVenueNavGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.href}>
                        <NavLink
                          to={item.href}
                          onClick={handleNavClick}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "w-5 h-5 flex-shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          <span className="text-sm font-medium">{item.title}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

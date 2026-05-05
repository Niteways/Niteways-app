import { NavLink } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
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
  Settings,
  BarChart3,
  MessageSquare,
  FileText,
  Wallet,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePortal } from "@/contexts/PortalContext";
import { useNavigate, useLocation } from "react-router-dom";

const mobileNavGroups = [
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
      { title: "Team Statistics", href: "/team-stats", icon: BarChart3 },
      { title: "Check In", href: "/checkin", icon: QrCode },
      { title: "Security", href: "/mobile-security", icon: Shield },
    ],
  },
  {
    title: "Reports & Analytics",
    items: [
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
      { title: "Reports", href: "/reports", icon: FileText },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Venue Info", href: "/venue-info", icon: Building2 },
    ],
  },
];

const MorePage = () => {
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
  };

  return (
    <AdminLayout title="More" subtitle="All features and settings">
      <div className="space-y-6 pb-24">
        {!isVenuePortalOnly && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-muted/20"
        >
          <div className="flex items-center justify-between gap-2">
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
        </motion.div>
        )}

        {/* Navigation Groups */}
        {mobileNavGroups.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.05 }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {group.title}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg transition-all duration-200 bg-muted/20",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted/30"
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
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default MorePage;

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import {
  CalendarPlus,
  UserPlus,
  QrCode,
  ClipboardList,
  Sparkles,
  Users2,
  Settings,
  BarChart3,
  Shield,
  Ticket,
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";

// All available quick action options
const allQuickActions: Record<string, { label: string; href: string; icon: any; variant: "default" | "secondary" | "outline" }> = {
  "new-booking": { label: "New Booking", href: "/tables", icon: CalendarPlus, variant: "default" },
  "add-guest": { label: "Add Guest", href: "/guests", icon: UserPlus, variant: "secondary" },
  "scan-qr": { label: "Scan QR", href: "/checkin", icon: QrCode, variant: "outline" },
  "requests": { label: "Requests", href: "/booking-requests", icon: ClipboardList, variant: "outline" },
  "tickets": { label: "Tickets", href: "/tickets", icon: Sparkles, variant: "outline" },
  "team": { label: "Team", href: "/team", icon: Users2, variant: "outline" },
  "settings": { label: "Settings", href: "/settings", icon: Settings, variant: "outline" },
  "analytics": { label: "Analytics", href: "/analytics", icon: BarChart3, variant: "outline" },
  "security": { label: "Security", href: "/mobile-security", icon: Shield, variant: "outline" },
  "dashboard": { label: "Dashboard", href: "/", icon: LayoutDashboard, variant: "outline" },
};

const defaultQuickActions = ["new-booking", "add-guest", "scan-qr", "requests", "tickets", "team"];

export function MobileQuickActionsGrid() {
  const navigate = useNavigate();
  const [quickActionIds, setQuickActionIds] = useState<string[]>(defaultQuickActions);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("quickActionsConfig");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          setQuickActionIds(parsed);
        }
      } catch (e) {
        console.error("Failed to parse quick actions config", e);
      }
    }
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "quickActionsConfig" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length === 6) {
            setQuickActionIds(parsed);
          }
        } catch (err) {
          console.error("Failed to parse quick actions config", err);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const mobileActions = useMemo(() => {
    return quickActionIds.map((id) => {
      const action = allQuickActions[id];
      return action ? { ...action, id } : null;
    }).filter(Boolean) as (typeof allQuickActions[string] & { id: string })[];
  }, [quickActionIds]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass-card p-4"
    >
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {mobileActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            size="sm"
            onClick={() => navigate(action.href)}
            className="flex flex-col items-center justify-center h-20 gap-2 text-xs"
          >
            <action.icon className="w-5 h-5" />
            <span className="text-[11px] font-medium text-center leading-tight">
              {action.label}
            </span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
}

// Export available actions for settings
export { allQuickActions };

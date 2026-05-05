import { useState, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CalendarDays, Users, UserCircle, BarChart3, Megaphone, Building2, Shield, Bell, Settings, ChevronLeft, ChevronRight, ClipboardList, TrendingUp, Users2, QrCode, MessageSquare, CreditCard, Receipt, FileText, DollarSign, MapPin, Sliders, Sparkles, Percent, Wallet, AlertCircle, Lock, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePortal } from "@/contexts/PortalContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { hasPermission } from "@/components/admin/RoleBasedUI";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const venueNavGroups: NavGroup[] = [{
  title: "Overview",
  items: [{
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard
  }, {
    title: "Live Performance",
    href: "/live",
    icon: TrendingUp
  }]
}, {
  title: "Booking Management",
  items: [{
    title: "Table Booking",
    href: "/tables",
    icon: CalendarDays
  }, {
    title: "Booking Requests",
    href: "/booking-requests",
    icon: ClipboardList
  }, {
    title: "Guest List",
    href: "/guests",
    icon: Users
  }, {
    title: "Ticketing",
    href: "/tickets",
    icon: Sparkles
  }]
}, {
  title: "Booking Settings",
  items: [{
    title: "Table Map",
    href: "/floor-map",
    icon: Building2
  }, {
    title: "Table Settings",
    href: "/table-settings",
    icon: Sliders
  }, {
    title: "Booking Settings",
    href: "/booking-settings",
    icon: Settings
  }]
}, {
  title: "Customer Management",
  items: [{
    title: "Smart CRM",
    href: "/crm",
    icon: UserCircle
  }]
}, {
  title: "Marketing",
  items: [{
    title: "Campaigns",
    href: "/campaigns",
    icon: Megaphone
  }, {
    title: "Events",
    href: "/events",
    icon: CalendarDays
  }]
}, {
  title: "Reports & Analytics",
  items: [{
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3
  }, {
    title: "Reports",
    href: "/reports",
    icon: FileText
  }]
}, {
  title: "Venue",
  items: [{
    title: "Venue Information",
    href: "/venue-info",
    icon: Building2
  }, {
    title: "Multi-Venue Control",
    href: "/venues",
    icon: Building2
  }]
}, {
  title: "Team Management",
  items: [{
    title: "Team",
    href: "/team",
    icon: Users2
  }, {
    title: "Security & Check-in",
    href: "/security",
    icon: QrCode
  }]
}, {
  title: "Communication",
  items: [{
    title: "Notifications",
    href: "/notifications",
    icon: Bell
  }, {
    title: "Team Chat",
    href: "/chat",
    icon: MessageSquare
  }]
}, {
  title: "Billing",
  items: [{
    title: "Subscription Plan",
    href: "/subscription",
    icon: CreditCard
  }, {
    title: "Commission",
    href: "/commission",
    icon: Percent
  }, {
    title: "Invoices",
    href: "/invoices",
    icon: FileText
  }, {
    title: "Documents",
    href: "/documents",
    icon: FileText
  }]
}, {
  title: "System",
  items: [{
    title: "Settings",
    href: "/settings",
    icon: Settings
  }]
}];

const adminNavGroups: NavGroup[] = [{
  title: "Overview",
  items: [{
    title: "Admin Dashboard",
    href: "/admin",
    icon: LayoutDashboard
  }, {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3
  }]
}, {
  title: "Management",
  items: [{
    title: "Cities",
    href: "/admin/cities",
    icon: MapPin
  }, {
    title: "Categories",
    href: "/admin/categories",
    icon: ClipboardList
  }, {
    title: "Venues",
    href: "/admin/venues",
    icon: Building2
  }, {
    title: "Users",
    href: "/admin/users",
    icon: Users
  }, {
    title: "Events",
    href: "/admin/events",
    icon: CalendarDays
  }]
}, {
  title: "Engagement",
  items: [{
    title: "Loyalty & Rewards",
    href: "/admin/loyalty",
    icon: Sparkles
  }, {
    title: "Support",
    href: "/admin/support",
    icon: MessageSquare
  }]
}, {
  title: "Finance",
  items: [{
    title: "Invoices",
    href: "/admin/invoices",
    icon: FileText
  }, {
    title: "Pricing Tiers",
    href: "/admin/pricing-tiers",
    icon: CreditCard
  }, {
    title: "Commission Rates",
    href: "/admin/commission-rates",
    icon: Percent
  }, {
    title: "Venue Payouts",
    href: "/admin/payouts",
    icon: Wallet
  }]
}, {
  title: "Team Management",
  items: [{
    title: "Admin Team",
    href: "/admin/team",
    icon: Users
  }, {
    title: "Access",
    href: "/admin/access",
    icon: Shield
  }, {
    title: "Permissions",
    href: "/admin/permissions",
    icon: Lock
  }]
}, {
  title: "Platform",
  items: [{
    title: "Content & Comms",
    href: "/admin/content",
    icon: Megaphone
  }, {
    title: "Agreements",
    href: "/admin/agreements",
    icon: FileText
  }, {
    title: "Legal & Compliance",
    href: "/admin/legal",
    icon: FileText
  }, {
    title: "Impersonation Logs",
    href: "/admin/impersonation-logs",
    icon: Shield
  }, {
    title: "Error Logs",
    href: "/admin/error-logs",
    icon: AlertCircle
  }, {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings
  }]
}, {
  title: "Account",
  items: [{
    title: "My Profile",
    href: "/admin/profile",
    icon: UserCircle
  }]
}];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { mode, setMode, isUserAppMode, setUserAppMode, isVenuePortalOnly } = usePortal();
  const { isImpersonating, impersonatedMember } = useImpersonation();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminMode = mode === "admin";
  
  // Filter nav groups based on impersonation permissions
  const navGroups = useMemo(() => {
    // When impersonating, always show full venue portal (not filtered)
    if (isImpersonating) {
      return venueNavGroups;
    }
    
    const baseGroups = isAdminMode ? adminNavGroups : venueNavGroups;
    return baseGroups;
  }, [isAdminMode, isImpersonating]);

  const handlePortalSwitch = (checked: boolean) => {
    const currentKey = isAdminMode ? "admin_last_route" : "venue_last_route";
    localStorage.setItem(currentKey, location.pathname);
    const targetMode = checked ? "admin" : "venue";
    const targetKey = checked ? "admin_last_route" : "venue_last_route";
    const lastRoute = localStorage.getItem(targetKey);
    setMode(targetMode);
    navigate(lastRoute || (checked ? "/admin" : "/"));
  };

  const handleUserAppToggle = (checked: boolean) => {
    setUserAppMode(checked);
  };

  return (
    <aside className={cn("relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {!collapsed && <span className="text-foreground font-sans text-xl font-bold">Niteways</span>}
        </div>
      </div>

      {/* Portal Toggles */}
      <div className={cn("px-3 py-3 border-b border-sidebar-border space-y-2", collapsed && "px-2")}>
        {!isVenuePortalOnly && !isImpersonating && (
          !collapsed ? (
            <div className={cn(
              "flex items-center justify-between gap-2 p-2 rounded-lg transition-colors",
              isUserAppMode ? "bg-muted/20 opacity-50" : "bg-muted/30"
            )}>
              <div className="flex items-center gap-2">
                {isAdminMode ? <Shield className="w-4 h-4 text-coral" /> : <Building2 className="w-4 h-4 text-teal" />}
                <Label className="text-xs font-medium">
                  {isAdminMode ? "Admin Portal" : "Venue Portal"}
                </Label>
              </div>
              <Switch 
                checked={isAdminMode} 
                onCheckedChange={handlePortalSwitch} 
                className="data-[state=checked]:bg-coral"
                disabled={isUserAppMode}
              />
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => !isUserAppMode && handlePortalSwitch(!isAdminMode)} 
              className={cn("w-full h-10", isAdminMode ? "text-coral" : "text-teal", isUserAppMode && "opacity-50")}
              disabled={isUserAppMode}
            >
              {isAdminMode ? <Shield className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </Button>
          )
        )}

        {!isVenuePortalOnly && !isImpersonating && (
          !collapsed ? (
            <div className={cn(
              "flex items-center justify-between gap-2 p-2 rounded-lg transition-colors",
              isUserAppMode ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
            )}>
              <div className="flex items-center gap-2">
                <Smartphone className={cn("w-4 h-4", isUserAppMode ? "text-primary" : "text-muted-foreground")} />
                <Label className="text-xs font-medium">User App</Label>
              </div>
              <Switch 
                checked={isUserAppMode} 
                onCheckedChange={handleUserAppToggle} 
                className="data-[state=checked]:bg-primary"
              />
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleUserAppToggle(!isUserAppMode)} 
              className={cn("w-full h-10", isUserAppMode ? "text-primary" : "text-muted-foreground")}
            >
              <Smartphone className="w-5 h-5" />
            </Button>
          )
        )}
        
        {/* Show impersonation indicator in sidebar when impersonating */}
        {isImpersonating && impersonatedMember && !collapsed && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gold/10 border border-gold/30">
            <Shield className="w-4 h-4 text-gold" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{impersonatedMember.name}</p>
              <p className="text-[10px] text-muted-foreground">{impersonatedMember.role}</p>
            </div>
          </div>
        )}
        {isImpersonating && collapsed && (
          <div className="flex items-center justify-center p-2 rounded-lg bg-gold/10 border border-gold/30">
            <Shield className="w-4 h-4 text-gold" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-2 space-y-6">
          {navGroups.map(group => (
            <div key={group.title}>
              {!collapsed && <h3 className="nav-section-title">{group.title}</h3>}
              <ul className="space-y-1">
                {group.items.map(item => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.href}>
                      <NavLink to={item.href} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group", isActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                        <item.icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                        {!collapsed && (
                          <span className="text-sm font-medium truncate">
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse Button */}
      <div className="p-2 border-t border-sidebar-border">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="w-full justify-center text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
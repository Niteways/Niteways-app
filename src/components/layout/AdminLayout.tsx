import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePortal } from "@/contexts/PortalContext";
import { IS_VENUE_PORTAL_ONLY } from "@/config/deployMode";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { UserAppLayout } from "@/components/user-app/UserAppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, UserCheck } from "lucide-react";
import { getRoleBadgeClass } from "@/components/admin/RoleBasedUI";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { mode, isUserAppMode, setUserAppMode } = usePortal();
  const { isImpersonating, impersonatedMember, impersonatedVenueId, stopImpersonation } = useImpersonation();
  const isVenuePortal = mode === "venue";

  const handleExitImpersonation = () => {
    stopImpersonation();
    if (IS_VENUE_PORTAL_ONLY) {
      navigate("/");
      return;
    }
    if (impersonatedVenueId) {
      navigate(`/admin/venue/${impersonatedVenueId}`);
    } else {
      navigate("/admin/venues");
    }
  };

  // User App mode - full native view without any admin sidebar
  if (isUserAppMode) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <UserAppLayout onClose={() => setUserAppMode(false)} />
      </div>
    );
  }

  // Impersonation banner component
  const ImpersonationBanner = () => {
    if (!isImpersonating || !impersonatedMember) return null;
    
    return (
      <div className="bg-gold/20 border-b border-gold/30 px-4 py-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCheck className="w-4 h-4 text-gold" />
            <div className="flex items-center gap-2">
              <Badge className={getRoleBadgeClass(impersonatedMember.role)}>
                {impersonatedMember.role}
              </Badge>
              <span className="text-sm">
                Viewing as <strong>{impersonatedMember.name}</strong>
              </span>
              <span className="text-xs text-muted-foreground">
                (Limited permissions active)
              </span>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleExitImpersonation}
            className="gap-2 border-gold/50 hover:bg-gold/20"
          >
            <LogOut className="w-3 h-3" />
            Exit Impersonation
          </Button>
        </div>
      </div>
    );
  };

  // Mobile layout for venue portal only
  if (isMobile && isVenuePortal) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-background">
        <ImpersonationBanner />
        <MobileHeader title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-auto p-4 pb-20">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop layout (or admin portal on mobile)
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ImpersonationBanner />
        <AdminHeader title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

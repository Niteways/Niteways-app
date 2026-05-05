import { ReactNode } from "react";
import { VenueTeamMember } from "@/hooks/useVenueTeamMembers";

// Define what each role can see/do
export const rolePermissions = {
  Manager: {
    canViewDashboard: true,
    canManageTeam: true,
    canManageBookings: true,
    canManageGuestList: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canViewFinances: true,
    canManageEvents: true,
    canApproveBookings: true,
    visibleTabs: ["overview", "bookings", "guests", "events", "team", "analytics", "settings"],
  },
  Host: {
    canViewDashboard: true,
    canManageTeam: false,
    canManageBookings: true,
    canManageGuestList: true,
    canViewAnalytics: false,
    canManageSettings: false,
    canViewFinances: false,
    canManageEvents: false,
    canApproveBookings: true,
    visibleTabs: ["overview", "bookings", "guests"],
  },
  Security: {
    canViewDashboard: true,
    canManageTeam: false,
    canManageBookings: false,
    canManageGuestList: true,
    canViewAnalytics: false,
    canManageSettings: false,
    canViewFinances: false,
    canManageEvents: false,
    canApproveBookings: false,
    visibleTabs: ["checkin", "guests"],
  },
  Staff: {
    canViewDashboard: true,
    canManageTeam: false,
    canManageBookings: false,
    canManageGuestList: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canViewFinances: false,
    canManageEvents: false,
    canApproveBookings: false,
    visibleTabs: ["overview"],
  },
};

export type TeamRole = keyof typeof rolePermissions;

export const getRoleColor = (role: string): string => {
  switch (role) {
    case "Manager":
      return "bg-gold/20 text-gold border-gold/30";
    case "Host":
      return "bg-teal/20 text-teal border-teal/30";
    case "Security":
      return "bg-coral/20 text-coral border-coral/30";
    case "Staff":
      return "bg-purple/20 text-purple border-purple/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const hasPermission = (
  member: VenueTeamMember | null,
  permission: keyof Omit<typeof rolePermissions.Manager, 'visibleTabs'>
): boolean => {
  if (!member) return true; // Admin has all permissions
  const role = member.role as TeamRole;
  const perms = rolePermissions[role];
  if (!perms) return false;
  const value = perms[permission as keyof typeof perms];
  return typeof value === 'boolean' ? value : false;
};

export const getVisibleTabs = (member: VenueTeamMember | null): string[] => {
  if (!member) return ["all"]; // Admin sees everything
  const role = member.role as TeamRole;
  return rolePermissions[role]?.visibleTabs ?? [];
};

type BooleanPermissions = Omit<typeof rolePermissions.Manager, 'visibleTabs'>;

interface RoleBasedProps {
  member: VenueTeamMember | null;
  requiredPermission: keyof BooleanPermissions;
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleBasedComponent = ({
  member,
  requiredPermission,
  children,
  fallback = null,
}: RoleBasedProps) => {
  if (hasPermission(member, requiredPermission)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};

// Get role badge styling
export const getRoleBadgeClass = (role: string): string => {
  const roleColors: Record<string, string> = {
    Manager: "bg-gradient-to-r from-gold/30 to-gold/10 text-gold border border-gold/30",
    Host: "bg-gradient-to-r from-teal/30 to-teal/10 text-teal border border-teal/30",
    Security: "bg-gradient-to-r from-coral/30 to-coral/10 text-coral border border-coral/30",
    Staff: "bg-gradient-to-r from-purple/30 to-purple/10 text-purple border border-purple/30",
    Admin: "bg-gradient-to-r from-primary/30 to-primary/10 text-primary border border-primary/30",
  };
  return roleColors[role] || "bg-muted text-muted-foreground";
};

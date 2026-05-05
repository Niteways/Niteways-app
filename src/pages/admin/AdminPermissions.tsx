import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Users, Settings, CreditCard, BarChart3, Building2, Megaphone, FileText, 
  Plus, Edit, Trash2, Eye, Pencil, Trash, Lock, MapPin, CalendarDays, MessageSquare,
  Sparkles, Percent, Wallet, AlertCircle, UserCircle, ClipboardList, TrendingUp, QrCode,
  CheckCircle, Download, Calendar, Ticket, Grid3X3, Bell
} from "lucide-react";
import { toast } from "sonner";

type AppRole = 'super_admin' | 'admin' | 'moderator' | 'support' | 'finance' | 'operations' | 'viewer';

interface PermissionActions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  portal: 'admin' | 'venue' | 'both';
  icon: React.ComponentType<{ className?: string }>;
  availableActions: (keyof PermissionActions)[];
}

interface AdminRole {
  id: AppRole;
  name: string;
  description: string;
  color: string;
  permissions: Record<string, PermissionActions>;
}

// All pages/features that can have permissions
const allPermissions: Omit<Permission, 'actions'>[] = [
  // Admin Portal - Overview
  { id: "admin_dashboard", name: "Admin Dashboard", description: "Main admin dashboard overview", category: "Admin Overview", portal: 'admin', icon: BarChart3, availableActions: ['view', 'export'] },
  { id: "admin_analytics", name: "Platform Analytics", description: "Platform-wide analytics and reports", category: "Admin Overview", portal: 'admin', icon: TrendingUp, availableActions: ['view', 'export'] },
  
  // Admin Portal - Management
  { id: "cities", name: "Cities", description: "Manage cities and regions", category: "Admin Management", portal: 'admin', icon: MapPin, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "venues", name: "Venues", description: "Venue management and details", category: "Admin Management", portal: 'admin', icon: Building2, availableActions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { id: "categories", name: "Categories", description: "Venue categories management", category: "Admin Management", portal: 'admin', icon: ClipboardList, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "admin_users", name: "Users", description: "User accounts and profiles", category: "Admin Management", portal: 'admin', icon: Users, availableActions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: "admin_events", name: "Platform Events", description: "Platform events management", category: "Admin Management", portal: 'admin', icon: CalendarDays, availableActions: ['view', 'create', 'edit', 'delete', 'approve'] },
  
  // Admin Portal - Engagement
  { id: "loyalty", name: "Loyalty & Rewards", description: "Loyalty program management", category: "Admin Engagement", portal: 'admin', icon: Sparkles, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "support", name: "Support Tickets", description: "Customer support management", category: "Admin Engagement", portal: 'admin', icon: MessageSquare, availableActions: ['view', 'create', 'edit', 'delete', 'approve'] },
  
  // Admin Portal - Finance
  { id: "invoices", name: "Invoices", description: "Invoice management", category: "Admin Finance", portal: 'admin', icon: FileText, availableActions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { id: "pricing_tiers", name: "Pricing Tiers", description: "Subscription pricing management", category: "Admin Finance", portal: 'admin', icon: CreditCard, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "commission_rates", name: "Commission Rates", description: "Commission configuration", category: "Admin Finance", portal: 'admin', icon: Percent, availableActions: ['view', 'edit'] },
  { id: "payouts", name: "Venue Payouts", description: "Payout processing", category: "Admin Finance", portal: 'admin', icon: Wallet, availableActions: ['view', 'create', 'approve', 'export'] },
  { id: "subscriptions", name: "Subscriptions", description: "Venue subscriptions", category: "Admin Finance", portal: 'admin', icon: CreditCard, availableActions: ['view', 'edit', 'approve'] },
  
  // Admin Portal - Platform
  { id: "admin_team", name: "Admin Team", description: "Admin user management", category: "Admin Platform", portal: 'admin', icon: Users, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "access", name: "Access Management", description: "Access logs and control", category: "Admin Platform", portal: 'admin', icon: Shield, availableActions: ['view', 'export'] },
  { id: "permissions", name: "Permissions", description: "Role-based permissions", category: "Admin Platform", portal: 'admin', icon: Lock, availableActions: ['view', 'edit'] },
  { id: "content", name: "Content & Communications", description: "Announcements and content", category: "Admin Platform", portal: 'admin', icon: Megaphone, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "legal", name: "Legal & Compliance", description: "Legal documents management", category: "Admin Platform", portal: 'admin', icon: FileText, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "error_logs", name: "Error Logs", description: "System error logs", category: "Admin Platform", portal: 'admin', icon: AlertCircle, availableActions: ['view', 'delete', 'export'] },
  { id: "admin_settings", name: "Platform Settings", description: "Global platform settings", category: "Admin Platform", portal: 'admin', icon: Settings, availableActions: ['view', 'edit'] },
  
  // Venue Portal - Overview
  { id: "venue_dashboard", name: "Dashboard", description: "Venue dashboard overview", category: "Venue Overview", portal: 'venue', icon: BarChart3, availableActions: ['view'] },
  { id: "live_performance", name: "Live Performance", description: "Real-time performance metrics", category: "Venue Overview", portal: 'venue', icon: TrendingUp, availableActions: ['view'] },
  
  // Venue Portal - Booking Management
  { id: "table_booking", name: "Table Booking", description: "Table reservations management", category: "Venue Booking", portal: 'venue', icon: Calendar, availableActions: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
  { id: "booking_requests", name: "Booking Requests", description: "Pending booking approvals", category: "Venue Booking", portal: 'venue', icon: ClipboardList, availableActions: ['view', 'approve', 'delete'] },
  { id: "guest_list", name: "Guest List", description: "Guest list management", category: "Venue Booking", portal: 'venue', icon: Users, availableActions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: "ticketing", name: "Ticketing", description: "Event ticketing", category: "Venue Booking", portal: 'venue', icon: Ticket, availableActions: ['view', 'create', 'edit', 'delete', 'export'] },
  
  // Venue Portal - Booking Settings
  { id: "table_map", name: "Table Map", description: "Floor plan and table layout", category: "Venue Settings", portal: 'venue', icon: Grid3X3, availableActions: ['view', 'edit'] },
  { id: "table_settings", name: "Table Settings", description: "Table configuration", category: "Venue Settings", portal: 'venue', icon: Settings, availableActions: ['view', 'edit'] },
  { id: "booking_settings", name: "Booking Settings", description: "Booking rules and policies", category: "Venue Settings", portal: 'venue', icon: Settings, availableActions: ['view', 'edit'] },
  
  // Venue Portal - CRM & Marketing
  { id: "smart_crm", name: "Smart CRM", description: "Customer relationship management", category: "Venue CRM", portal: 'venue', icon: UserCircle, availableActions: ['view', 'edit', 'export'] },
  { id: "campaigns", name: "Campaigns", description: "Marketing campaigns", category: "Venue CRM", portal: 'venue', icon: Megaphone, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "events", name: "Events", description: "Venue events", category: "Venue CRM", portal: 'venue', icon: CalendarDays, availableActions: ['view', 'create', 'edit', 'delete'] },
  
  // Venue Portal - Analytics
  { id: "venue_analytics", name: "Analytics", description: "Venue analytics and reports", category: "Venue Reports", portal: 'venue', icon: BarChart3, availableActions: ['view', 'export'] },
  { id: "reports", name: "Reports", description: "Custom reports", category: "Venue Reports", portal: 'venue', icon: FileText, availableActions: ['view', 'create', 'export'] },
  
  // Venue Portal - Operations
  { id: "venue_info", name: "Venue Information", description: "Venue details and settings", category: "Venue Operations", portal: 'venue', icon: Building2, availableActions: ['view', 'edit'] },
  { id: "team_management", name: "Team Management", description: "Staff and access control", category: "Venue Operations", portal: 'venue', icon: Users, availableActions: ['view', 'create', 'edit', 'delete'] },
  { id: "security_checkin", name: "Security & Check-in", description: "Guest check-in and security", category: "Venue Operations", portal: 'venue', icon: QrCode, availableActions: ['view', 'edit'] },
  { id: "notifications", name: "Notifications", description: "Notification settings", category: "Venue Operations", portal: 'venue', icon: Bell, availableActions: ['view', 'edit'] },
  
  // Venue Portal - Billing
  { id: "subscription_plan", name: "Subscription Plan", description: "Current subscription", category: "Venue Billing", portal: 'venue', icon: CreditCard, availableActions: ['view', 'edit'] },
  { id: "price_plan", name: "Price Plan", description: "Pricing configuration", category: "Venue Billing", portal: 'venue', icon: CreditCard, availableActions: ['view', 'edit'] },
  { id: "commission", name: "Commission", description: "Commission tracking", category: "Venue Billing", portal: 'venue', icon: Percent, availableActions: ['view', 'export'] },
  { id: "venue_invoices", name: "Invoices", description: "Invoice history", category: "Venue Billing", portal: 'venue', icon: FileText, availableActions: ['view', 'export'] },
];

const defaultActions: PermissionActions = { view: false, create: false, edit: false, delete: false, approve: false, export: false };

const createDefaultRolePermissions = (role: AppRole): Record<string, PermissionActions> => {
  return Object.fromEntries(allPermissions.map(p => {
    const actions: PermissionActions = { ...defaultActions };
    
    if (role === 'super_admin') {
      p.availableActions.forEach(a => actions[a] = true);
    } else if (role === 'admin') {
      p.availableActions.forEach(a => {
        actions[a] = a !== 'delete' || p.id !== 'permissions';
      });
    } else if (role === 'moderator') {
      if (['admin_dashboard', 'admin_analytics', 'venues', 'admin_users', 'admin_events', 'content', 'venue_dashboard'].includes(p.id)) {
        actions.view = p.availableActions.includes('view');
        if (['admin_events', 'content'].includes(p.id)) {
          actions.create = p.availableActions.includes('create');
          actions.edit = p.availableActions.includes('edit');
        }
      }
    } else if (role === 'support') {
      if (['admin_dashboard', 'venues', 'admin_users', 'support'].includes(p.id)) {
        actions.view = p.availableActions.includes('view');
        if (p.id === 'support') {
          actions.create = p.availableActions.includes('create');
          actions.edit = p.availableActions.includes('edit');
          actions.approve = p.availableActions.includes('approve');
        }
      }
    } else if (role === 'finance') {
      if (['admin_dashboard', 'admin_analytics', 'invoices', 'pricing_tiers', 'commission_rates', 'payouts', 'subscriptions'].includes(p.id)) {
        actions.view = p.availableActions.includes('view');
        actions.export = p.availableActions.includes('export');
        if (['invoices', 'payouts'].includes(p.id)) {
          actions.create = p.availableActions.includes('create');
          actions.approve = p.availableActions.includes('approve');
        }
        if (['invoices', 'pricing_tiers', 'commission_rates', 'payouts'].includes(p.id)) {
          actions.edit = p.availableActions.includes('edit');
        }
      }
    } else if (role === 'operations') {
      if (['admin_dashboard', 'admin_analytics', 'cities', 'venues', 'categories', 'admin_events'].includes(p.id)) {
        actions.view = p.availableActions.includes('view');
        actions.create = p.availableActions.includes('create');
        actions.edit = p.availableActions.includes('edit');
      }
    } else if (role === 'viewer') {
      actions.view = p.availableActions.includes('view');
    }
    
    return [p.id, actions];
  }));
};

const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
  support: "Support",
  finance: "Finance",
  operations: "Operations",
  viewer: "Viewer",
};

const roleColors: Record<AppRole, string> = {
  super_admin: "bg-coral/20 text-coral",
  admin: "bg-gold/20 text-gold",
  moderator: "bg-primary/20 text-primary",
  support: "bg-teal/20 text-teal",
  finance: "bg-purple-500/20 text-purple-400",
  operations: "bg-blue-500/20 text-blue-400",
  viewer: "bg-muted text-muted-foreground",
};

const initialRoles: AdminRole[] = (Object.keys(roleLabels) as AppRole[]).map(roleId => ({
  id: roleId,
  name: roleLabels[roleId],
  description: roleId === 'super_admin' ? 'Full platform access' : 
               roleId === 'admin' ? 'Administrative access' :
               roleId === 'moderator' ? 'Content moderation' :
               roleId === 'support' ? 'Customer support' :
               roleId === 'finance' ? 'Financial operations' :
               roleId === 'operations' ? 'Day-to-day operations' : 'View-only access',
  color: roleId === 'super_admin' ? 'coral' : 
         roleId === 'admin' ? 'gold' :
         roleId === 'moderator' ? 'primary' :
         roleId === 'support' ? 'teal' :
         roleId === 'finance' ? 'purple' :
         roleId === 'operations' ? 'blue' : 'muted',
  permissions: createDefaultRolePermissions(roleId),
}));

const actionIcons: Record<keyof PermissionActions, React.ComponentType<{ className?: string }>> = {
  view: Eye,
  create: Plus,
  edit: Pencil,
  delete: Trash,
  approve: CheckCircle,
  export: Download,
};

const actionLabels: Record<keyof PermissionActions, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
};

const AdminPermissions = () => {
  const [roles, setRoles] = useState<AdminRole[]>(initialRoles);
  const [selectedRole, setSelectedRole] = useState<AppRole>('admin');
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const categories = [...new Set(allPermissions.map(p => p.category))];
  const currentRole = roles.find(r => r.id === selectedRole);

  const handleTogglePermission = (permissionId: string, action: keyof PermissionActions) => {
    if (selectedRole === 'super_admin') {
      toast.error("Cannot modify super admin permissions");
      return;
    }
    
    const permission = allPermissions.find(p => p.id === permissionId);
    if (!permission?.availableActions.includes(action)) return;
    
    setRoles(prev => prev.map(role => {
      if (role.id === selectedRole) {
        const currentPerms = role.permissions[permissionId] || { ...defaultActions };
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [permissionId]: {
              ...currentPerms,
              [action]: !currentPerms[action],
            },
          },
        };
      }
      return role;
    }));
    toast.success("Permission updated");
  };

  const handleToggleAllForPermission = (permissionId: string, enabled: boolean) => {
    if (selectedRole === 'super_admin') {
      toast.error("Cannot modify super admin permissions");
      return;
    }
    
    const permission = allPermissions.find(p => p.id === permissionId);
    if (!permission) return;
    
    const newActions: PermissionActions = { ...defaultActions };
    permission.availableActions.forEach(a => newActions[a] = enabled);
    
    setRoles(prev => prev.map(role => {
      if (role.id === selectedRole) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [permissionId]: newActions,
          },
        };
      }
      return role;
    }));
  };

  const handleAddRole = () => {
    if (!newRoleName) {
      toast.error("Please enter a role name");
      return;
    }
    toast.success("Custom roles require database changes. Contact developer.");
    setIsAddRoleOpen(false);
    setNewRoleName("");
    setNewRoleDescription("");
  };

  const getPermissionCount = (role: AdminRole) => {
    let count = 0;
    Object.entries(role.permissions).forEach(([permId, perms]) => {
      const permission = allPermissions.find(p => p.id === permId);
      if (permission) {
        permission.availableActions.forEach(action => {
          if (perms[action]) count++;
        });
      }
    });
    return count;
  };

  return (
    <AdminLayout title="Permissions" subtitle="Configure detailed role-based access control for admin and venue portals">
      <div className="space-y-6">
        {/* Role Selection Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h3 className="text-lg font-medium">Select Role to Configure</h3>
          <Button className="gap-2" onClick={() => setIsAddRoleOpen(true)}>
            <Plus className="w-4 h-4" /> Add Custom Role
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-7 gap-3"
        >
          {roles.map(role => (
            <Card 
              key={role.id} 
              className={`cursor-pointer transition-all ${selectedRole === role.id ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
              onClick={() => setSelectedRole(role.id)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <Badge className={roleColors[role.id]}>{role.name}</Badge>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{role.description}</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xl font-bold">{getPermissionCount(role)}</p>
                <p className="text-xs text-muted-foreground">permissions</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Detailed Permissions Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Permissions for {currentRole?.name}
                  </CardTitle>
                  <CardDescription>Set detailed access levels for each feature (Admin & Venue Portals)</CardDescription>
                </div>
                {selectedRole === 'super_admin' && (
                  <Badge className="bg-coral/20 text-coral">
                    <Lock className="w-3 h-3 mr-1" /> Read-only
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={categories[0]} className="space-y-4">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                  {categories.map(cat => (
                    <TabsTrigger key={cat} value={cat} className="text-xs">
                      {cat}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {categories.map(category => (
                  <TabsContent key={category} value={category}>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {allPermissions
                          .filter(p => p.category === category)
                          .map(permission => {
                            const perms = currentRole?.permissions[permission.id] || { ...defaultActions };
                            const allEnabled = permission.availableActions.every(a => perms[a]);
                            
                            return (
                              <div 
                                key={permission.id} 
                                className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    <permission.icon className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium">{permission.name}</h4>
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {permission.portal === 'admin' ? 'Admin' : permission.portal === 'venue' ? 'Venue' : 'Both'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{permission.description}</p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                  {/* Individual action toggles */}
                                  <div className="flex items-center gap-3">
                                    {permission.availableActions.map(action => {
                                      const Icon = actionIcons[action];
                                      return (
                                        <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                                          <Checkbox 
                                            checked={perms[action]}
                                            onCheckedChange={() => handleTogglePermission(permission.id, action)}
                                            disabled={selectedRole === 'super_admin'}
                                          />
                                          <span className="text-xs flex items-center gap-1">
                                            <Icon className="w-3 h-3" /> {actionLabels[action]}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  
                                  {/* Toggle all */}
                                  <div className="flex items-center gap-2 pl-4 border-l border-border">
                                    <Switch 
                                      checked={allEnabled}
                                      onCheckedChange={(checked) => handleToggleAllForPermission(permission.id, checked)}
                                      disabled={selectedRole === 'super_admin'}
                                    />
                                    <span className="text-xs text-muted-foreground">All</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>Define a new admin role with custom permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input 
                value={newRoleName} 
                onChange={(e) => setNewRoleName(e.target.value)} 
                placeholder="e.g., Account Manager" 
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={newRoleDescription} 
                onChange={(e) => setNewRoleDescription(e.target.value)} 
                placeholder="Brief description of role responsibilities" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRole}>Create Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPermissions;

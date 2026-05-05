import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserActivityLog } from "@/components/dashboard/UserActivityLog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Shield,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Settings2,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const allPermissions = [
  { id: "dashboard", label: "Dashboard", category: "Overview" },
  { id: "live_performance", label: "Live Performance", category: "Overview" },
  { id: "bookings", label: "Table Bookings", category: "Booking" },
  { id: "guests", label: "Guest List", category: "Booking" },
  { id: "tickets", label: "Ticketing", category: "Booking" },
  { id: "floor_map", label: "Floor Map Editor", category: "Booking" },
  { id: "crm", label: "Smart CRM", category: "Customer" },
  { id: "campaigns", label: "Campaigns & Events", category: "Marketing" },
  { id: "analytics", label: "Analytics & Reports", category: "Marketing" },
  { id: "team", label: "Team Management", category: "Operations" },
  { id: "checkin", label: "Security & Check-in", category: "Operations" },
  { id: "venues", label: "Multi-Venue Control", category: "Venue" },
  { id: "settings", label: "Settings", category: "System" },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "manager" | "host" | "promoter" | "security" | "marketing";
  status: "active" | "inactive";
  lastActive: string;
  permissions: string[];
  checkInsToday?: number;
  checkInsTotal?: number;
}

const teamMembers: TeamMember[] = [
  { id: "1", name: "John Doe", email: "john@nightflow.com", role: "manager", status: "active", lastActive: "Online now", permissions: ["all"], checkInsToday: 45, checkInsTotal: 1250 },
  { id: "2", name: "Marcus Thompson", email: "marcus@nightflow.com", role: "promoter", status: "active", lastActive: "2 hours ago", permissions: ["guests", "bookings"], checkInsToday: 12, checkInsTotal: 340 },
  { id: "3", name: "Sarah Wilson", email: "sarah@nightflow.com", role: "host", status: "active", lastActive: "Online now", permissions: ["guests", "tables", "checkin"], checkInsToday: 28, checkInsTotal: 890 },
  { id: "4", name: "Alex Martinez", email: "alex@nightflow.com", role: "promoter", status: "active", lastActive: "5 hours ago", permissions: ["guests"], checkInsToday: 8, checkInsTotal: 210 },
  { id: "5", name: "Mike Johnson", email: "mike@nightflow.com", role: "security", status: "active", lastActive: "Online now", permissions: ["checkin", "guests"], checkInsToday: 67, checkInsTotal: 2100 },
  { id: "6", name: "Emily Chen", email: "emily@nightflow.com", role: "marketing", status: "inactive", lastActive: "3 days ago", permissions: ["campaigns", "analytics"], checkInsToday: 0, checkInsTotal: 50 },
  { id: "7", name: "David Brown", email: "david@nightflow.com", role: "host", status: "active", lastActive: "1 hour ago", permissions: ["guests", "tables"], checkInsToday: 15, checkInsTotal: 420 },
];

const roleStyles = {
  manager: { bg: "bg-coral/20", text: "text-coral", border: "border-coral/30" },
  host: { bg: "bg-teal/20", text: "text-teal", border: "border-teal/30" },
  promoter: { bg: "bg-gold/20", text: "text-gold", border: "border-gold/30" },
  security: { bg: "bg-purple/20", text: "text-purple", border: "border-purple/30" },
  marketing: { bg: "bg-primary/20", text: "text-primary", border: "border-primary/30" },
};

const rolePermissions: Record<string, string[]> = {
  manager: ["dashboard", "live_performance", "bookings", "guests", "tickets", "floor_map", "crm", "campaigns", "analytics", "team", "checkin", "venues", "settings"],
  host: ["dashboard", "bookings", "guests", "checkin"],
  promoter: ["dashboard", "guests", "analytics"],
  security: ["checkin", "guests"],
  marketing: ["dashboard", "campaigns", "analytics"],
};

// Validate if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const TeamManagement = () => {
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  
  // Only use impersonatedVenueId if it's a valid UUID
  const activeVenueId = isImpersonating && impersonatedVenueId && isValidUUID(impersonatedVenueId)
    ? impersonatedVenueId 
    : null;
    
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [manualPermissions, setManualPermissions] = useState(false);
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberPermissions, setNewMemberPermissions] = useState<string[]>([]);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [dbTeamMembers, setDbTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Fetch team members from database based on activeVenueId
  useEffect(() => {
    const fetchTeamMembers = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      // If no valid venue ID, show demo data instead of error
      if (!activeVenueId) {
        console.log("No valid venue ID, using demo data");
        setDbTeamMembers([]);
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('venue_team_members')
          .select('*')
          .eq('venue_id', activeVenueId)
          .order('name');

        if (error) {
          console.error("Failed to load team members:", error);
          setLoadError("Failed to load team members");
          setDbTeamMembers([]);
          setIsLoading(false);
          return;
        }

        if (data) {
          // Map database records to TeamMember interface
          setDbTeamMembers(data.map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role as any,
            status: m.status as any,
            lastActive: "Recently",
            permissions: [],
            checkInsToday: 0,
            checkInsTotal: 0,
          })));
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching team members:", err);
        setLoadError("An error occurred while loading team members");
        setDbTeamMembers([]);
        setIsLoading(false);
      }
    };
    fetchTeamMembers();
  }, [activeVenueId]);

  // Use database team members if available, otherwise fallback to demo data
  const teamMembersToUse = dbTeamMembers.length > 0 ? dbTeamMembers : teamMembers;

  const filteredMembers = teamMembersToUse.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openPermissionsDialog = (role: string) => {
    setSelectedRole(role);
    setEditingPermissions([...rolePermissions[role]]);
    setIsPermissionsDialogOpen(true);
  };

  const togglePermission = (permId: string) => {
    setEditingPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const savePermissions = () => {
    if (selectedRole) {
      rolePermissions[selectedRole] = [...editingPermissions];
    }
    setIsPermissionsDialogOpen(false);
  };

  const stats = {
    total: teamMembersToUse.length,
    active: teamMembersToUse.filter(m => m.status === "active").length,
    managers: teamMembersToUse.filter(m => m.role === "manager").length,
    hosts: teamMembersToUse.filter(m => m.role === "host").length,
    promoters: teamMembersToUse.filter(m => m.role === "promoter").length,
    totalCheckInsToday: teamMembersToUse.reduce((sum, m) => sum + (m.checkInsToday || 0), 0),
  };

  // Mobile Layout
  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setNewMemberRole(member.role);
    setEditingPermissions([...member.permissions]);
    setIsEditMemberDialogOpen(true);
  };

  if (isMobile) {
    return (
      <AdminLayout title="Team" subtitle="">
        <div className="space-y-4 pb-24">
          {/* Check-in Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-2"
          >
            <div className="p-3 text-center bg-muted/30 rounded-lg">
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total Staff</p>
            </div>
            <div className="p-3 text-center bg-muted/30 rounded-lg">
              <p className="text-xl font-bold text-teal">{stats.active}</p>
              <p className="text-[10px] text-muted-foreground">Active Now</p>
            </div>
            <div className="p-3 text-center bg-muted/30 rounded-lg">
              <p className="text-xl font-bold text-coral">{stats.totalCheckInsToday}</p>
              <p className="text-[10px] text-muted-foreground">Check-ins Today</p>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <a href="/team-stats" className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">View Team Statistics</span>
              <span className="text-xs text-muted-foreground">→</span>
            </a>
          </motion.div>

          {/* Search + Add */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw]">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input placeholder="Enter name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="Enter email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Permission Mode</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={!manualPermissions ? "default" : "outline"}
                        size="sm"
                        onClick={() => setManualPermissions(false)}
                      >
                        Select Role
                      </Button>
                      <Button
                        type="button"
                        variant={manualPermissions ? "default" : "outline"}
                        size="sm"
                        onClick={() => setManualPermissions(true)}
                      >
                        Set Manually
                      </Button>
                    </div>
                  </div>
                  {!manualPermissions ? (
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="host">Host</SelectItem>
                          <SelectItem value="promoter">Promoter</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Custom Permissions</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {allPermissions.map(perm => (
                          <label key={perm.id} className="flex items-center gap-2 text-xs">
                            <Checkbox 
                              checked={newMemberPermissions.includes(perm.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewMemberPermissions([...newMemberPermissions, perm.id]);
                                } else {
                                  setNewMemberPermissions(newMemberPermissions.filter(p => p !== perm.id));
                                }
                              }}
                            />
                            {perm.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => setIsAddDialogOpen(false)}>Send Invite</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Team Members Cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            {filteredMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="p-3 bg-muted/20 rounded-lg"
                onClick={() => handleEditMember(member)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-muted text-foreground text-xs">
                      {member.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0",
                          roleStyles[member.role].bg,
                          roleStyles[member.role].text,
                          roleStyles[member.role].border,
                          "capitalize"
                        )}
                      >
                        {member.role}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {member.email}
                    </span>
                  </div>
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Edit Member Dialog */}
          <Dialog open={isEditMemberDialogOpen} onOpenChange={setIsEditMemberDialogOpen}>
            <DialogContent className="max-w-[90vw]">
              <DialogHeader>
                <DialogTitle>Edit Team Member</DialogTitle>
              </DialogHeader>
              {selectedMember && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-muted text-foreground">
                        {selectedMember.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedMember.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedMember.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="host">Host</SelectItem>
                        <SelectItem value="promoter">Promoter</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select defaultValue={selectedMember.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Permissions</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-muted/20 rounded-lg">
                      {allPermissions.map(perm => (
                        <label key={perm.id} className="flex items-center gap-2 text-xs">
                          <Checkbox 
                            checked={editingPermissions.includes(perm.id) || editingPermissions.includes("all")}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditingPermissions([...editingPermissions, perm.id]);
                              } else {
                                setEditingPermissions(editingPermissions.filter(p => p !== perm.id));
                              }
                            }}
                          />
                          {perm.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="text-coral hover:text-coral"
                  onClick={() => setIsEditMemberDialogOpen(false)}
                >
                  Remove Member
                </Button>
                <Button onClick={() => setIsEditMemberDialogOpen(false)}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    );
  }

  // Desktop Layout (unchanged)
  return (
    <AdminLayout title="Team Management" subtitle="Manage staff roles and permissions">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Staff</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Active Now</p>
            <p className="text-2xl font-bold text-teal">{stats.active}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Managers</p>
            <p className="text-2xl font-bold text-coral">{stats.managers}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Hosts</p>
            <p className="text-2xl font-bold text-gold">{stats.hosts}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Promoters</p>
            <p className="text-2xl font-bold text-primary">{stats.promoters}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <a href="/team-stats" className="flex items-center justify-between p-4 glass-card hover:bg-muted/30 transition-colors">
              <span className="text-sm font-medium">View Team Statistics</span>
              <span className="text-xs text-muted-foreground">→</span>
            </a>
          </motion.div>
        </div>

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList>
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="roles">Role Permissions</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6">

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Team Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>
                    Invite a new team member and assign their role or set permissions manually.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="Enter name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="Enter email" />
                    </div>
                  </div>

                  {/* Permission Mode Toggle */}
                  <div className="space-y-3">
                    <Label>Permission Assignment</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={!manualPermissions ? "default" : "outline"}
                        size="sm"
                        onClick={() => setManualPermissions(false)}
                      >
                        Select Role
                      </Button>
                      <Button
                        type="button"
                        variant={manualPermissions ? "default" : "outline"}
                        size="sm"
                        onClick={() => setManualPermissions(true)}
                      >
                        Set Manually
                      </Button>
                    </div>
                  </div>

                  {!manualPermissions ? (
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="host">Host</SelectItem>
                          <SelectItem value="promoter">Promoter</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                      {newMemberRole && (
                        <p className="text-xs text-muted-foreground mt-2">
                          This role includes: {rolePermissions[newMemberRole]?.slice(0, 4).map(p =>
                            allPermissions.find(ap => ap.id === p)?.label
                          ).join(", ")}
                          {(rolePermissions[newMemberRole]?.length || 0) > 4 && ` +${rolePermissions[newMemberRole].length - 4} more`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label>Select Permissions</Label>
                      <div className="border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
                        {Object.entries(
                          allPermissions.reduce((acc, perm) => {
                            if (!acc[perm.category]) acc[perm.category] = [];
                            acc[perm.category].push(perm);
                            return acc;
                          }, {} as Record<string, typeof allPermissions>)
                        ).map(([category, perms]) => (
                          <div key={category} className="mb-4 last:mb-0">
                            <p className="text-xs font-medium text-muted-foreground mb-2">{category}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {perms.map((perm) => (
                                <div key={perm.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`new-${perm.id}`}
                                    checked={newMemberPermissions.includes(perm.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setNewMemberPermissions([...newMemberPermissions, perm.id]);
                                      } else {
                                        setNewMemberPermissions(newMemberPermissions.filter(p => p !== perm.id));
                                      }
                                    }}
                                  />
                                  <label htmlFor={`new-${perm.id}`} className="text-sm cursor-pointer">
                                    {perm.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {newMemberPermissions.length} permission(s) selected
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setManualPermissions(false); setNewMemberPermissions([]); setNewMemberRole(""); }}>Cancel</Button>
                  <Button onClick={() => { setIsAddDialogOpen(false); setManualPermissions(false); setNewMemberPermissions([]); setNewMemberRole(""); }}>Send Invite</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

            {/* Team Table */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="border-border/50 hover:bg-muted/30"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-muted text-foreground text-sm">
                              {member.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            roleStyles[member.role].bg,
                            roleStyles[member.role].text,
                            roleStyles[member.role].border,
                            "capitalize"
                          )}
                        >
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {rolePermissions[member.role].slice(0, 3).map((perm) => {
                            const permLabel = allPermissions.find(p => p.id === perm)?.label || perm;
                            return (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {permLabel}
                              </Badge>
                            );
                          })}
                          {rolePermissions[member.role].length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{rolePermissions[member.role].length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            member.status === "active" ? "bg-teal" : "bg-muted-foreground"
                          )} />
                          <span className="capitalize text-sm">{member.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {member.lastActive}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-coral hover:text-coral hover:bg-coral/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold mb-4">Role Permission Templates</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure default permissions for each role. Changes will apply to new team members assigned to these roles.
              </p>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(rolePermissions).map(([role, perms]) => (
                  <div
                    key={role}
                    className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          roleStyles[role as keyof typeof roleStyles].bg,
                          roleStyles[role as keyof typeof roleStyles].text,
                          roleStyles[role as keyof typeof roleStyles].border,
                          "capitalize text-sm"
                        )}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        {role}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPermissionsDialog(role)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {perms.slice(0, 4).map((perm) => {
                        const permLabel = allPermissions.find(p => p.id === perm)?.label || perm;
                        return (
                          <div key={perm} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-3 h-3 text-teal" />
                            {permLabel}
                          </div>
                        );
                      })}
                      {perms.length > 4 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{perms.length - 4} more permissions
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <UserActivityLog />
          </TabsContent>
        </Tabs>

        {/* Edit Permissions Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="capitalize">Edit {selectedRole} Permissions</DialogTitle>
              <DialogDescription>
                Configure what team members with this role can access.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="border border-border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                {Object.entries(
                  allPermissions.reduce((acc, perm) => {
                    if (!acc[perm.category]) acc[perm.category] = [];
                    acc[perm.category].push(perm);
                    return acc;
                  }, {} as Record<string, typeof allPermissions>)
                ).map(([category, perms]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <p className="text-sm font-medium text-foreground mb-3">{category}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center gap-2">
                          <Checkbox
                            id={perm.id}
                            checked={editingPermissions.includes(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <label htmlFor={perm.id} className="text-sm cursor-pointer">
                            {perm.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={savePermissions}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default TeamManagement;

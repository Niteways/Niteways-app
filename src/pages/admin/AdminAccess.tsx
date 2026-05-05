import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, Shield, Users, Search, Eye, Clock, Activity, UserPlus, Ban, Settings, Trash2, 
  MoreHorizontal, Edit, Calendar, Mail 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type AppRole = 'super_admin' | 'admin' | 'moderator' | 'support' | 'finance' | 'operations' | 'viewer';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: AppRole;
  created_at: string;
  last_sign_in?: string;
  status: "Active" | "Inactive";
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  details?: string;
}

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
  super_admin: "bg-coral/20 text-coral border-coral/30",
  admin: "bg-gold/20 text-gold border-gold/30",
  moderator: "bg-primary/20 text-primary border-primary/30",
  support: "bg-teal/20 text-teal border-teal/30",
  finance: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  operations: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

const mockAdminUsers: AdminUser[] = [
  { id: "1", email: "john@niteways.com", name: "John Smith", role: "super_admin", created_at: "2024-01-01", last_sign_in: "2024-01-20T10:30:00", status: "Active" },
  { id: "2", email: "sarah@niteways.com", name: "Sarah Johnson", role: "admin", created_at: "2024-01-05", last_sign_in: "2024-01-20T09:15:00", status: "Active" },
  { id: "3", email: "mike@niteways.com", name: "Mike Davis", role: "support", created_at: "2024-01-10", last_sign_in: "2024-01-19T18:45:00", status: "Active" },
  { id: "4", email: "emily@niteways.com", name: "Emily Chen", role: "finance", created_at: "2024-01-12", last_sign_in: "2024-01-20T08:00:00", status: "Active" },
  { id: "5", email: "alex@niteways.com", name: "Alex Rodriguez", role: "moderator", created_at: "2024-01-15", last_sign_in: "2024-01-19T22:30:00", status: "Active" },
  { id: "6", email: "lisa@niteways.com", name: "Lisa Park", role: "operations", created_at: "2024-01-18", last_sign_in: "2024-01-20T07:30:00", status: "Inactive" },
];

const AdminAccess = () => {
  const [users, setUsers] = useState<AdminUser[]>(mockAdminUsers);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("viewer");
  const [logSearchQuery, setLogSearchQuery] = useState("");

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('portal', 'admin')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setActivityLogs(data.map(log => ({
        id: log.id,
        user: log.performed_by || "System",
        action: log.action,
        target: log.entity_type + (log.entity_id ? `: ${log.entity_id}` : ""),
        timestamp: new Date(log.created_at).toLocaleString(),
        details: log.details || undefined
      })));
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredLogs = activityLogs.filter(log =>
    log.user.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
    log.target.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    if (!newUserEmail || !newUserName) {
      toast.error("Please fill in all fields");
      return;
    }
    const newUser: AdminUser = {
      id: `user-${Date.now()}`,
      email: newUserEmail,
      name: newUserName,
      role: newUserRole,
      created_at: new Date().toISOString(),
      status: "Active",
    };
    setUsers([newUser, ...users]);
    logActivity("Added admin user", newUserName);
    setIsAddUserOpen(false);
    setNewUserEmail("");
    setNewUserName("");
    setNewUserRole("viewer");
    toast.success("Admin user added successfully");
  };

  const handleUpdateRole = (userId: string, newRole: AppRole) => {
    const user = users.find(u => u.id === userId);
    if (user?.role === "super_admin") {
      toast.error("Cannot modify super admin");
      return;
    }
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    toast.success("Role updated successfully");
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user?.role === "super_admin") {
      toast.error("Cannot delete super admin");
      return;
    }
    setUsers(users.filter((u) => u.id !== userId));
    toast.success("User removed");
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };

  const handleSaveEditUser = () => {
    if (!selectedUser) return;
    setUsers(users.map((u) => (u.id === selectedUser.id ? selectedUser : u)));
    setIsEditUserOpen(false);
    setSelectedUser(null);
    toast.success("User updated successfully");
  };

  const logActivity = async (action: string, target: string) => {
    await supabase.from('activity_logs').insert({
      action,
      entity_type: target,
      portal: 'admin',
      performed_by: 'Current Admin'
    });
    fetchActivityLogs();
  };

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('add') || action.toLowerCase().includes('create')) return <UserPlus className="w-4 h-4 text-teal" />;
    if (action.toLowerCase().includes('ban') || action.toLowerCase().includes('suspend')) return <Ban className="w-4 h-4 text-coral" />;
    if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) return <Settings className="w-4 h-4 text-gold" />;
    if (action.toLowerCase().includes('delete') || action.toLowerCase().includes('remove')) return <Trash2 className="w-4 h-4 text-coral" />;
    return <Activity className="w-4 h-4 text-muted-foreground" />;
  };

  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout title="Access Management" subtitle="Manage admin users and view activity logs">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {(Object.keys(roleLabels) as AppRole[]).map((role) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4"
            >
              <p className="text-sm text-muted-foreground">{roleLabels[role]}</p>
              <p className="text-2xl font-bold text-foreground">
                {roleCounts[role] || 0}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Admin Users Table - Same as AdminTeamManagement */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Admin Users
                  </CardTitle>
                  <CardDescription>
                    {filteredUsers.length} administrators
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search admins..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setIsAddUserOpen(true)} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Admin
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-border/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {user.name.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-muted-foreground">
                          {user.last_sign_in ? new Date(user.last_sign_in).toLocaleString() : "Never"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={user.status === "Active" ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                              <DropdownMenuItem
                                key={role}
                                onClick={() => handleUpdateRole(user.id, role)}
                                disabled={user.role === "super_admin"}
                              >
                                Set as {roleLabels[role]}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-coral"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.role === "super_admin"}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Logs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Admin Activity Logs
                </CardTitle>
                <CardDescription>Track all admin actions for transparency and auditing</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="pl-9 w-60"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredLogs.length > 0 ? filteredLogs.map(log => (
                    <div key={log.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="p-2 rounded-lg bg-background">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{log.user}</span>
                          <span className="text-muted-foreground"> {log.action} </span>
                          <span className="font-medium text-primary">{log.target}</span>
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No activity logs yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>Invite a new administrator to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={selectedUser.name}
                  onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(v) => setSelectedUser({ ...selectedUser, role: v as AppRole })}
                  disabled={selectedUser.role === "super_admin"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAccess;

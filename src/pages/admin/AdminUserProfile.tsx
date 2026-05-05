import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfilePictureUpload } from "@/components/admin/ProfilePictureUpload";
import { AdminUserHistoryTabs } from "@/components/admin/AdminUserHistoryTabs";
import { MemberIdCard } from "@/components/guests/MemberIdCard";
import { 
  User, Mail, Phone, Shield, Key, Save, Building2, 
  Calendar, Activity, Clock, Users, Settings, Lock, Eye, Edit, Trash2
} from "lucide-react";
import { toast } from "sonner";

// Permission categories for admin users
const permissionCategories = [
  {
    name: "Venues",
    permissions: [
      { id: "venues.view", label: "View Venues", description: "View venue list and details" },
      { id: "venues.create", label: "Create Venues", description: "Add new venues" },
      { id: "venues.edit", label: "Edit Venues", description: "Modify venue settings" },
      { id: "venues.delete", label: "Delete Venues", description: "Remove venues" },
    ],
  },
  {
    name: "Users & Guests",
    permissions: [
      { id: "users.view", label: "View Users", description: "View user profiles" },
      { id: "users.edit", label: "Edit Users", description: "Modify user information" },
      { id: "guests.view", label: "View Guests", description: "View guest profiles" },
      { id: "guests.edit", label: "Edit Guests", description: "Modify guest information" },
    ],
  },
  {
    name: "Bookings",
    permissions: [
      { id: "bookings.view", label: "View Bookings", description: "View all bookings" },
      { id: "bookings.manage", label: "Manage Bookings", description: "Create, edit, cancel bookings" },
      { id: "bookings.approve", label: "Approve Requests", description: "Approve pending booking requests" },
    ],
  },
  {
    name: "Finance",
    permissions: [
      { id: "finance.view", label: "View Finance", description: "View financial reports" },
      { id: "finance.manage", label: "Manage Payouts", description: "Process payouts and invoices" },
      { id: "finance.rates", label: "Set Commission Rates", description: "Modify commission rates" },
    ],
  },
  {
    name: "System",
    permissions: [
      { id: "system.settings", label: "System Settings", description: "Modify system configuration" },
      { id: "system.logs", label: "View Logs", description: "Access activity and error logs" },
      { id: "system.permissions", label: "Manage Permissions", description: "Edit user roles and permissions" },
    ],
  },
];

const AdminUserProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@niteways.com",
    phone: "+46 70 123 4567",
    avatarUrl: "",
    role: "Super Admin",
    department: "Operations",
    joinedAt: "2024-01-15",
    lastLogin: "2024-12-19 09:45",
    loyaltyLevel: "platinum" as const,
    memberId: "ADM-001",
  });
  
  // Permission state - Super Admins have all permissions by default
  const [userPermissions, setUserPermissions] = useState<string[]>([
    "venues.view", "venues.create", "venues.edit", "venues.delete",
    "users.view", "users.edit", "guests.view", "guests.edit",
    "bookings.view", "bookings.manage", "bookings.approve",
    "finance.view", "finance.manage", "finance.rates",
    "system.settings", "system.logs", "system.permissions",
  ]);
  const [selectedRole, setSelectedRole] = useState("super_admin");

  const handleSave = () => {
    setIsEditing(false);
    toast.success("Profile updated successfully");
  };

  const handleAvatarUpload = (url: string) => {
    setProfile(prev => ({ ...prev, avatarUrl: url }));
  };

  return (
    <AdminLayout title="My Profile" subtitle="Manage your personal information and settings">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with ID Card and Profile Info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-6 flex-wrap">
                  {/* Member ID Card */}
                  <MemberIdCard
                    name={profile.name}
                    guestId={profile.memberId}
                    loyaltyLevel={profile.loyaltyLevel}
                    avatarUrl={profile.avatarUrl}
                  />
                  
                  {/* Profile Picture Upload (shown when editing) */}
                  {isEditing && (
                    <div className="space-y-3">
                      <Label>Update Profile Picture</Label>
                      <ProfilePictureUpload
                        currentUrl={profile.avatarUrl}
                        name={profile.name}
                        onUpload={handleAvatarUpload}
                        size="lg"
                      />
                    </div>
                  )}
                  
                  {/* Quick Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/20 text-primary">{profile.role}</Badge>
                      <Badge variant="outline">{profile.department}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Joined {new Date(profile.joinedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Last login: {profile.lastLogin}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className="gap-2"
                >
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  ) : (
                    "Edit Profile"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs defaultValue="personal" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="personal" className="gap-2">
                <User className="w-4 h-4" />
                Personal Info
              </TabsTrigger>
              <TabsTrigger value="permissions" className="gap-2">
                <Lock className="w-4 h-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Activity className="w-4 h-4" />
                Activity History
              </TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      {isEditing ? (
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm py-2">{profile.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm py-2 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {profile.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      {isEditing ? (
                        <Input
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm py-2 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {profile.phone}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      {isEditing ? (
                        <Input
                          value={profile.department}
                          onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                        />
                      ) : (
                        <p className="text-sm py-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {profile.department}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Role & Permissions</CardTitle>
                  <CardDescription>Manage admin role and access permissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label>Admin Role</Label>
                    <Select value={selectedRole} onValueChange={(value) => {
                      setSelectedRole(value);
                      // Set default permissions based on role
                      if (value === "super_admin") {
                        setUserPermissions(permissionCategories.flatMap(c => c.permissions.map(p => p.id)));
                      } else if (value === "admin") {
                        setUserPermissions([
                          "venues.view", "venues.edit",
                          "users.view", "guests.view", "guests.edit",
                          "bookings.view", "bookings.manage", "bookings.approve",
                          "finance.view",
                          "system.logs",
                        ]);
                      } else if (value === "moderator") {
                        setUserPermissions([
                          "venues.view",
                          "users.view", "guests.view",
                          "bookings.view", "bookings.manage",
                        ]);
                      } else {
                        setUserPermissions(["venues.view", "users.view", "guests.view", "bookings.view"]);
                      }
                    }}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedRole === "super_admin" && "Full access to all features and settings"}
                      {selectedRole === "admin" && "Full access except system settings and user permissions"}
                      {selectedRole === "moderator" && "Can view and manage bookings, limited access to other areas"}
                      {selectedRole === "viewer" && "Read-only access to view data"}
                    </p>
                  </div>

                  {/* Permission Grid */}
                  <div className="space-y-6">
                    {permissionCategories.map((category) => (
                      <div key={category.name} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{category.name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const categoryPermissionIds = category.permissions.map(p => p.id);
                              const allSelected = categoryPermissionIds.every(id => userPermissions.includes(id));
                              if (allSelected) {
                                setUserPermissions(prev => prev.filter(id => !categoryPermissionIds.includes(id)));
                              } else {
                                setUserPermissions(prev => [...new Set([...prev, ...categoryPermissionIds])]);
                              }
                            }}
                          >
                            {category.permissions.every(p => userPermissions.includes(p.id)) ? "Deselect All" : "Select All"}
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {category.permissions.map((permission) => (
                            <label
                              key={permission.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                userPermissions.includes(permission.id)
                                  ? "bg-primary/5 border-primary/30"
                                  : "bg-muted/20 border-border hover:bg-muted/40"
                              }`}
                            >
                              <Checkbox
                                checked={userPermissions.includes(permission.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setUserPermissions(prev => [...prev, permission.id]);
                                  } else {
                                    setUserPermissions(prev => prev.filter(id => id !== permission.id));
                                  }
                                }}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{permission.label}</p>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button 
                      onClick={() => toast.success("Permissions updated successfully")}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Permissions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your password and security preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Password</p>
                          <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Change Password</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">Enable 2FA</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity History Tab with detailed data */}
            <TabsContent value="history">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Activity & Transaction History</CardTitle>
                  <CardDescription>All user visit and booking history across venues with detailed transaction data</CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminUserHistoryTabs />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminUserProfile;

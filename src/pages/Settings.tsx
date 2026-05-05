import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMenuSettings } from "@/hooks/useMenuSettings";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Save,
  LayoutDashboard,
  CalendarDays,
  Users,
  QrCode,
  FileText,
  GripVertical,
  Users2,
  Settings as SettingsIcon,
  BarChart3,
  Ticket,
  MessageSquare,
  CalendarPlus,
  UserPlus,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// All available menu options for bottom nav
const allMenuOptions = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "tables", label: "Tables", icon: CalendarDays },
  { id: "guests", label: "Guests", icon: Users },
  { id: "checkin", label: "Check In", icon: QrCode },
  { id: "requests", label: "Requests", icon: FileText },
  { id: "team", label: "Team", icon: Users2 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "security", label: "Security", icon: Shield },
  { id: "tickets", label: "Tickets", icon: Ticket },
];

// All available quick action options
const allQuickActionOptions = [
  { id: "new-booking", label: "New Booking", icon: CalendarPlus },
  { id: "add-guest", label: "Add Guest", icon: UserPlus },
  { id: "scan-qr", label: "Scan QR", icon: QrCode },
  { id: "requests", label: "Requests", icon: ClipboardList },
  { id: "tickets", label: "Tickets", icon: Sparkles },
  { id: "team", label: "Team", icon: Users2 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "security", label: "Security", icon: Shield },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const Settings = () => {
  const isMobile = useIsMobile();
  const { menuItems, saveMenuItems } = useMenuSettings();
  const [selectedMenuItems, setSelectedMenuItems] = useState(["home", "tables", "guests", "checkin"]);
  const [selectedQuickActions, setSelectedQuickActions] = useState(["new-booking", "add-guest", "scan-qr", "requests", "tickets", "team"]);

  // Load menu items from storage
  useEffect(() => {
    const savedMenu = localStorage.getItem("mobileMenuConfig");
    if (savedMenu) {
      try {
        const parsed = JSON.parse(savedMenu);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setSelectedMenuItems(parsed);
        }
      } catch (e) {
        console.error("Failed to parse menu config", e);
      }
    }
    
    const savedQuickActions = localStorage.getItem("quickActionsConfig");
    if (savedQuickActions) {
      try {
        const parsed = JSON.parse(savedQuickActions);
        if (Array.isArray(parsed) && parsed.length === 6) {
          setSelectedQuickActions(parsed);
        }
      } catch (e) {
        console.error("Failed to parse quick actions config", e);
      }
    }
  }, []);

  const handleMenuItemChange = (index: number, value: string) => {
    const newItems = [...selectedMenuItems];
    newItems[index] = value;
    setSelectedMenuItems(newItems);
  };

  const handleQuickActionChange = (index: number, value: string) => {
    const newItems = [...selectedQuickActions];
    newItems[index] = value;
    setSelectedQuickActions(newItems);
  };

  const handleSaveMenu = () => {
    localStorage.setItem("mobileMenuConfig", JSON.stringify(selectedMenuItems));
    // Dispatch storage event to sync across components
    window.dispatchEvent(new StorageEvent("storage", {
      key: "mobileMenuConfig",
      newValue: JSON.stringify(selectedMenuItems),
    }));
    toast.success("Menu saved successfully!");
  };

  const handleSaveQuickActions = () => {
    localStorage.setItem("quickActionsConfig", JSON.stringify(selectedQuickActions));
    window.dispatchEvent(new StorageEvent("storage", {
      key: "quickActionsConfig",
      newValue: JSON.stringify(selectedQuickActions),
    }));
    toast.success("Quick actions saved successfully!");
  };

  // Mobile Settings Layout
  if (isMobile) {
    return (
      <AdminLayout title="Settings" subtitle="Configure your preferences">
        <div className="space-y-4 pb-24">
          <Tabs defaultValue="menu" className="space-y-4">
            <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto">
              <TabsTrigger value="menu" className="text-xs">Menu</TabsTrigger>
              <TabsTrigger value="quick" className="text-xs">Quick Actions</TabsTrigger>
              <TabsTrigger value="venue" className="text-xs">Venue</TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="menu" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Customize Main Menu</CardTitle>
                    <p className="text-xs text-muted-foreground">Choose which items appear in your bottom navigation</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[0, 1, 2, 3].map((index) => (
                      <div key={index} className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Position {index + 1}</Label>
                          <Select 
                            value={selectedMenuItems[index]} 
                            onValueChange={(v) => handleMenuItemChange(index, v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allMenuOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  <div className="flex items-center gap-2">
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    <Button className="w-full mt-4 gap-2" onClick={handleSaveMenu}>
                      <Save className="w-4 h-4" />
                      Save Menu
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="quick" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Customize Quick Actions</CardTitle>
                    <p className="text-xs text-muted-foreground">Choose which actions appear on your dashboard</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <div key={index} className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">Action {index + 1}</Label>
                          <Select 
                            value={selectedQuickActions[index]} 
                            onValueChange={(v) => handleQuickActionChange(index, v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allQuickActionOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  <div className="flex items-center gap-2">
                                    <option.icon className="w-4 h-4" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    <Button className="w-full mt-4 gap-2" onClick={handleSaveQuickActions}>
                      <Save className="w-4 h-4" />
                      Save Quick Actions
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="venue" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Venue Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Venue Name</Label>
                      <Input defaultValue="NightFlow Club" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Contact Email</Label>
                      <Input type="email" defaultValue="info@nightflow.com" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input defaultValue="+1 (555) 123-4567" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">New Booking Alerts</Label>
                        <p className="text-xs text-muted-foreground">Get notified on new bookings</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">VIP Guest Arrivals</Label>
                        <p className="text-xs text-muted-foreground">Alert on VIP check-ins</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Security Alerts</Label>
                        <p className="text-xs text-muted-foreground">High-priority alerts</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="display" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Display</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Compact Mode</Label>
                        <p className="text-xs text-muted-foreground">Reduce spacing</p>
                      </div>
                      <Switch />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Animations</Label>
                        <p className="text-xs text-muted-foreground">Smooth transitions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Sound Effects</Label>
                        <p className="text-xs text-muted-foreground">Notification sounds</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    );
  }

  // Desktop layout
  return (
    <AdminLayout title="Settings" subtitle="Configure your venue preferences">
      <div className="max-w-4xl">
        <Tabs defaultValue="venue" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="venue" className="gap-2">
              <Building2 className="w-4 h-4" />
              Venue
            </TabsTrigger>
            <TabsTrigger value="booking" className="gap-2">
              <Globe className="w-4 h-4" />
              Booking
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="venue" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Venue Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="venueName">Venue Name</Label>
                      <Input id="venueName" defaultValue="NightFlow Club" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Contact Email</Label>
                      <Input id="email" type="email" defaultValue="info@nightflow.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" defaultValue="+1 (555) 123-4567" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Max Capacity</Label>
                      <Input id="capacity" type="number" defaultValue="800" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" defaultValue="123 Club Street, Miami, FL 33101" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Operating Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Friday Open</Label>
                      <Input type="time" defaultValue="22:00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Friday Close</Label>
                      <Input type="time" defaultValue="04:00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Saturday Open</Label>
                      <Input type="time" defaultValue="22:00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Saturday Close</Label>
                      <Input type="time" defaultValue="05:00" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="booking" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Booking Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cutoffHours">Booking Cutoff (hours before)</Label>
                      <Input id="cutoffHours" type="number" defaultValue="2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxAdvanceDays">Max Days in Advance</Label>
                      <Input id="maxAdvanceDays" type="number" defaultValue="30" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                    <Textarea
                      id="cancellationPolicy"
                      rows={4}
                      defaultValue="Free cancellation up to 24 hours before the booking. Late cancellations or no-shows may be charged in full."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depositPercent">Deposit Percentage</Label>
                      <Input id="depositPercent" type="number" defaultValue="20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minSpendTables">Min Spend - Tables</Label>
                      <Input id="minSpendTables" type="number" defaultValue="500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minSpendVip">Min Spend - VIP</Label>
                      <Input id="minSpendVip" type="number" defaultValue="1500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>New Booking Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when a new booking is made</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>VIP Guest Arrivals</Label>
                      <p className="text-sm text-muted-foreground">Alert when VIP guests check in</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Payment Reminders</Label>
                      <p className="text-sm text-muted-foreground">Notify about pending payments</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">High-priority security notifications</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Daily Summary Reports</Label>
                      <p className="text-sm text-muted-foreground">Receive end-of-night summary emails</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for all admin logins</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Logout</Label>
                      <p className="text-sm text-muted-foreground">Automatically log out after 30 min of inactivity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Activity Logging</Label>
                      <p className="text-sm text-muted-foreground">Log all user actions for audit</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>IP Restriction</Label>
                      <p className="text-sm text-muted-foreground">Limit access to specific IP addresses</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Display Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Animations</Label>
                      <p className="text-sm text-muted-foreground">Enable smooth transitions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sound Effects</Label>
                      <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end mt-6"
        >
          <Button className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
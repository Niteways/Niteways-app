import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Plus,
  Search,
  Users,
  BarChart3,
  Settings,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowRightLeft,
  Shield,
  CheckCircle,
  Edit,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Venue {
  id: string;
  name: string;
  location: string;
  status: "active" | "inactive";
  todayRevenue: number;
  todayGuests: number;
  capacity: number;
  currentOccupancy: number;
  lastSync: string;
}

interface SharedData {
  id: string;
  type: "crm" | "analytics" | "campaigns";
  sharedWith: string[];
  enabled: boolean;
}

const venues: Venue[] = [
  { id: "1", name: "Skyline Lounge", location: "Downtown Miami", status: "active", todayRevenue: 28500, todayGuests: 420, capacity: 500, currentOccupancy: 84, lastSync: "2 min ago" },
  { id: "2", name: "Neon Club", location: "South Beach", status: "active", todayRevenue: 35200, todayGuests: 580, capacity: 800, currentOccupancy: 72, lastSync: "5 min ago" },
  { id: "3", name: "Velvet Room", location: "Brickell", status: "active", todayRevenue: 19800, todayGuests: 280, capacity: 350, currentOccupancy: 80, lastSync: "1 min ago" },
  { id: "4", name: "The Basement", location: "Wynwood", status: "inactive", todayRevenue: 0, todayGuests: 0, capacity: 400, currentOccupancy: 0, lastSync: "Closed" },
];

const sharedData: SharedData[] = [
  { id: "1", type: "crm", sharedWith: ["Skyline Lounge", "Neon Club", "Velvet Room"], enabled: true },
  { id: "2", type: "analytics", sharedWith: ["Skyline Lounge", "Neon Club"], enabled: true },
  { id: "3", type: "campaigns", sharedWith: ["All venues"], enabled: false },
];

const MultiVenueControl = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<string | null>("all");

  const totalStats = {
    totalRevenue: venues.filter(v => v.status === "active").reduce((sum, v) => sum + v.todayRevenue, 0),
    totalGuests: venues.filter(v => v.status === "active").reduce((sum, v) => sum + v.todayGuests, 0),
    activeVenues: venues.filter(v => v.status === "active").length,
    avgOccupancy: Math.round(venues.filter(v => v.status === "active").reduce((sum, v) => sum + v.currentOccupancy, 0) / venues.filter(v => v.status === "active").length),
  };

  return (
    <AdminLayout title="Multi-Venue Control" subtitle="Manage all venues from one dashboard">
      <div className="space-y-6">
        {/* Venue Selector */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="w-6 h-6 text-primary" />
              <Select value={selectedVenue || "all"} onValueChange={setSelectedVenue}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  {venues.map(venue => (
                    <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="bg-teal/20 text-teal border-teal/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                {totalStats.activeVenues} Active
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                Switch Venue
              </Button>
              <Dialog open={isAddVenueOpen} onOpenChange={setIsAddVenueOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Venue
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Venue</DialogTitle>
                    <DialogDescription>Add a new venue to your group.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Venue Name</Label>
                      <Input placeholder="e.g., Rooftop Lounge" />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input placeholder="e.g., Downtown Miami" />
                    </div>
                    <div className="space-y-2">
                      <Label>Capacity</Label>
                      <Input type="number" placeholder="500" />
                    </div>
                    <div className="space-y-2">
                      <Label>Share CRM Data</Label>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <span className="text-sm">Enable cross-venue guest data</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddVenueOpen(false)}>Cancel</Button>
                    <Button onClick={() => setIsAddVenueOpen(false)}>Add Venue</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        {/* Combined Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">${totalStats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Guests</p>
                <p className="text-2xl font-bold text-teal">{totalStats.totalGuests.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Venues</p>
                <p className="text-2xl font-bold text-gold">{totalStats.activeVenues}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-coral" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Occupancy</p>
                <p className="text-2xl font-bold text-coral">{totalStats.avgOccupancy}%</p>
              </div>
            </div>
          </motion.div>
        </div>

        <Tabs defaultValue="venues" className="space-y-4">
          <TabsList className="glass-card p-1">
            <TabsTrigger value="venues" className="gap-2">
              <Building2 className="w-4 h-4" />
              Venues
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="w-4 h-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="sharing" className="gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Data Sharing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="venues" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {venues.map((venue, index) => (
                <motion.div
                  key={venue.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card className={cn("glass-card hover:border-primary/30 transition-colors", venue.status === "inactive" && "opacity-60")}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {venue.name}
                            {venue.status === "active" && (
                              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {venue.location}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={venue.status === "active" ? "bg-teal/20 text-teal border-teal/30" : "bg-muted text-muted-foreground"}>
                          {venue.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Today's Revenue</p>
                          <p className="text-lg font-semibold">${venue.todayRevenue.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Guests Tonight</p>
                          <p className="text-lg font-semibold">{venue.todayGuests}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Occupancy</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted">
                              <div 
                                className={cn(
                                  "h-full rounded-full",
                                  venue.currentOccupancy > 80 ? "bg-coral" : venue.currentOccupancy > 50 ? "bg-gold" : "bg-teal"
                                )}
                                style={{ width: `${venue.currentOccupancy}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{venue.currentOccupancy}%</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Last Sync</p>
                          <p className="text-sm flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {venue.lastSync}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t border-border">
                        <Button size="sm" variant="outline" className="flex-1 gap-1">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1">
                          <BarChart3 className="w-3.5 h-3.5" /> Analytics
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Venue Permissions</h3>
              <p className="text-sm text-muted-foreground mb-6">Set which team members can access each venue.</p>
              <div className="space-y-4">
                {venues.filter(v => v.status === "active").map((venue) => (
                  <div key={venue.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{venue.name}</p>
                        <p className="text-sm text-muted-foreground">{venue.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">4 team members</Badge>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Edit className="w-3.5 h-3.5" /> Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="sharing" className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Cross-Venue Data Sharing</h3>
              <p className="text-sm text-muted-foreground mb-6">Share CRM, analytics, and campaign data across your venues.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-teal" />
                    <div>
                      <p className="font-medium">CRM Data</p>
                      <p className="text-sm text-muted-foreground">Share guest profiles across venues</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-gold" />
                    <div>
                      <p className="font-medium">Analytics Reports</p>
                      <p className="text-sm text-muted-foreground">Combine analytics from all venues</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-coral" />
                    <div>
                      <p className="font-medium">Performance Comparison</p>
                      <p className="text-sm text-muted-foreground">Compare KPIs between venues</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default MultiVenueControl;

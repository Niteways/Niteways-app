import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Send, Bell, Mail, Star, Calendar, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "promo";
  target: "all" | "venues" | "guests";
  createdAt: string;
  status: "Active" | "Scheduled" | "Expired";
}

interface FeaturedEvent {
  id: string;
  name: string;
  venue: string;
  date: string;
  featured: boolean;
}

const initialAnnouncements: Announcement[] = [
  { id: "1", title: "Platform Maintenance", message: "Scheduled maintenance on Jan 20th", type: "warning", target: "all", createdAt: "2024-01-15", status: "Active" },
  { id: "2", title: "New Feature: Smart CRM", message: "Check out our new AI-powered CRM", type: "info", target: "venues", createdAt: "2024-01-10", status: "Active" },
  { id: "3", title: "Holiday Promo", message: "Get 20% off on all upgrades", type: "promo", target: "venues", createdAt: "2024-01-05", status: "Expired" },
];

const initialFeaturedEvents: FeaturedEvent[] = [
  { id: "1", name: "NYE Spectacular 2024", venue: "NightFlow Club", date: "2024-12-31", featured: true },
  { id: "2", name: "Summer Beach Party", venue: "NightFlow Beach Club", date: "2024-07-15", featured: true },
  { id: "3", name: "Jazz Night Live", venue: "Sunset Rooftop", date: "2024-02-14", featured: false },
  { id: "4", name: "Electronic Music Festival", venue: "Metro Club Central", date: "2024-03-22", featured: true },
];

const AdminContent = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>(initialFeaturedEvents);
  const [isAddAnnouncementOpen, setIsAddAnnouncementOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newType, setNewType] = useState<"info" | "warning" | "promo">("info");
  const [newTarget, setNewTarget] = useState<"all" | "venues" | "guests">("all");

  const handleAddAnnouncement = () => {
    if (!newTitle || !newMessage) {
      toast.error("Please fill all fields");
      return;
    }
    const newAnnouncement: Announcement = {
      id: `ann-${Date.now()}`,
      title: newTitle,
      message: newMessage,
      type: newType,
      target: newTarget,
      createdAt: new Date().toISOString().split("T")[0],
      status: "Active",
    };
    setAnnouncements(prev => [newAnnouncement, ...prev]);
    setIsAddAnnouncementOpen(false);
    setNewTitle("");
    setNewMessage("");
    toast.success("Announcement created");
  };

  const handleToggleFeatured = (eventId: string) => {
    setFeaturedEvents(prev => prev.map(e => 
      e.id === eventId ? { ...e, featured: !e.featured } : e
    ));
    toast.success("Featured status updated");
  };

  const handleSendBlast = (type: "email" | "push") => {
    toast.success(`${type === "email" ? "Email" : "Push notification"} blast sent!`);
  };

  const typeStyles = {
    info: "bg-primary/20 text-primary",
    warning: "bg-gold/20 text-gold",
    promo: "bg-teal/20 text-teal",
  };

  const targetStyles = {
    all: "All Users",
    venues: "Venues Only",
    guests: "Guests Only",
  };

  return (
    <AdminLayout title="Content & Communication" subtitle="Manage announcements, notifications, and featured content">
      <div className="space-y-6">
        <Tabs defaultValue="announcements">
          <TabsList>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="featured">Featured Events</TabsTrigger>
            <TabsTrigger value="blast">Send Blast</TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="space-y-6 mt-6">
            {/* Add Announcement */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center"
            >
              <p className="text-muted-foreground">Platform-wide announcements</p>
              <Dialog open={isAddAnnouncementOpen} onOpenChange={setIsAddAnnouncementOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" /> New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Announcement</DialogTitle>
                    <DialogDescription>Send a message to your platform users</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Announcement title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Your message..." rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="promo">Promotion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Audience</Label>
                        <Select value={newTarget} onValueChange={(v) => setNewTarget(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="venues">Venues Only</SelectItem>
                            <SelectItem value="guests">Guests Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddAnnouncementOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddAnnouncement}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </motion.div>

            {/* Announcements List */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              {announcements.map((ann) => (
                <Card key={ann.id} className="glass-card">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{ann.title}</h4>
                        <Badge className={typeStyles[ann.type]}>{ann.type}</Badge>
                        <Badge variant="outline">{targetStyles[ann.target]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{ann.message}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={ann.status === "Active" ? "bg-teal/20 text-teal" : ann.status === "Scheduled" ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"}>
                        {ann.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">{ann.createdAt}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="featured" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="w-5 h-5 text-gold" /> Featured Events
                  </CardTitle>
                  <CardDescription>Curate events highlighted on the Discover feed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {featuredEvents.map((event) => (
                      <div key={event.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{event.name}</h4>
                            {event.featured && (
                              <Star className="w-4 h-4 text-gold fill-gold" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{event.venue}</p>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">{event.date}</span>
                        </div>
                        <Switch
                          checked={event.featured}
                          onCheckedChange={() => handleToggleFeatured(event.id)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="blast" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-6 md:grid-cols-2"
            >
              {/* Email Blast */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" /> Email Blast
                  </CardTitle>
                  <CardDescription>Send email to all users or a specific segment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input placeholder="Email subject line" />
                  </div>
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="venues">Venues Only</SelectItem>
                        <SelectItem value="guests">Guests Only</SelectItem>
                        <SelectItem value="inactive">Inactive Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea placeholder="Your email message..." rows={4} />
                  </div>
                  <Button className="w-full gap-2" onClick={() => handleSendBlast("email")}>
                    <Send className="w-4 h-4" /> Send Email Blast
                  </Button>
                </CardContent>
              </Card>

              {/* Push Notification */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="w-5 h-5" /> Push Notification
                  </CardTitle>
                  <CardDescription>Send in-app notification to users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input placeholder="Notification title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="venues">Venues Only</SelectItem>
                        <SelectItem value="guests">Guests Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea placeholder="Notification message..." rows={4} />
                  </div>
                  <Button className="w-full gap-2" onClick={() => handleSendBlast("push")}>
                    <Send className="w-4 h-4" /> Send Push Notification
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminContent;

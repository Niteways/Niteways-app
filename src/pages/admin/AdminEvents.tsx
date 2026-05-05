import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Calendar, MapPin, Music, Shirt, Users, Star, MoreVertical, Check, X, Eye, Flag, AlertTriangle, Sparkles, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Event {
  id: string;
  name: string;
  venue: string;
  venue_id: string;
  city: string;
  date: string;
  status: "Pending" | "Approved" | "Rejected" | "Flagged" | "Featured" | "upcoming";
  ticketsSold: number;
  capacity: number;
  genre: string;
  dressCode: string;
  vibe: string;
  hasLicense: boolean;
}

const AdminEvents = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [venueFilter, setVenueFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState("");

  // Realtime subscription for events
  useEffect(() => {
    const channel = supabase
      .channel('admin-events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-events"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Fetch venues for creation dialog
  const { data: venues = [] } = useQuery({
    queryKey: ["admin-venues-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, venue_id, city:cities(name)")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch real events from database
  const { data: dbEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, venue:venues(name, city:cities(name))")
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data.map((e: any) => ({
        id: e.id,
        name: e.event_name,
        venue: e.venue?.name || "Unknown",
        venue_id: e.venue_id,
        city: e.venue?.city?.name || "Unknown",
        date: e.event_date,
        status: e.status === "upcoming" ? "Approved" : (e.status || "Pending"),
        ticketsSold: e.tickets_sold || 0,
        capacity: e.capacity || 500,
        genre: "House",
        dressCode: "Smart Casual",
        vibe: "Elegant",
        hasLicense: true,
      }));
    },
  });

  const filteredEvents = dbEvents.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase()) ||
                          event.venue.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const matchesCity = cityFilter === "all" || event.city === cityFilter;
    const matchesVenue = venueFilter === "all" || event.venue_id === venueFilter;
    return matchesSearch && matchesStatus && matchesCity && matchesVenue;
  });

  const handleAction = async (eventId: string, action: "approve" | "reject" | "flag" | "feature" | "unflag" | "delete") => {
    if (action === "delete") {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) {
        toast.error("Failed to delete event");
      } else {
        toast.success("Event deleted successfully");
        refetchEvents();
      }
      return;
    }

    const statusMap = {
      approve: "upcoming",
      reject: "cancelled",
      flag: "flagged",
      feature: "featured",
      unflag: "upcoming",
    };
    
    const { error } = await supabase
      .from("events")
      .update({ status: statusMap[action] })
      .eq("id", eventId);

    if (error) {
      toast.error("Failed to update event");
    } else {
      toast.success(`Event ${action}ed successfully`);
      refetchEvents();
    }
  };

  const handleEditEvent = (eventId: string, venueId: string) => {
    navigate(`/events/${eventId}/edit?venueId=${venueId}`);
  };

  const handleCreateForVenue = () => {
    if (!selectedVenueId) {
      toast.error("Please select a venue");
      return;
    }
    navigate(`/events/create?venueId=${selectedVenueId}`);
    setIsCreateDialogOpen(false);
  };

  const statusStyles = {
    Pending: "bg-gold/20 text-gold",
    Approved: "bg-teal/20 text-teal",
    Rejected: "bg-coral/20 text-coral",
    Flagged: "bg-orange-500/20 text-orange-400",
    Featured: "bg-purple/20 text-purple",
    upcoming: "bg-teal/20 text-teal",
  };

  const cities = [...new Set(dbEvents.map(e => e.city))];

  return (
    <AdminLayout title="Event Moderation" subtitle="Review, approve, and moderate venue events">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-5 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Events</CardDescription>
              <CardTitle className="text-2xl">{dbEvents.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-2xl text-gold">{dbEvents.filter(e => e.status === "Pending").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-2xl text-teal">{dbEvents.filter(e => e.status === "Approved" || e.status === "upcoming").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Featured</CardDescription>
              <CardTitle className="text-2xl text-purple">{dbEvents.filter(e => e.status === "Featured").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Flagged</CardDescription>
              <CardTitle className="text-2xl text-orange-400">{dbEvents.filter(e => e.status === "Flagged").length}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Filters with Create Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-4 items-center justify-between"
        >
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events or venues..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Featured">Featured</SelectItem>
                <SelectItem value="Flagged">Flagged</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={venueFilter} onValueChange={setVenueFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Venue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                {venues.map((venue: any) => (
                  <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        </motion.div>

        {/* Events Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Event</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <TableRow key={event.id} className="border-border/50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{event.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {event.venue}, {event.city}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {event.date}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs gap-1">
                        <Music className="w-2.5 h-2.5" /> {event.genre}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Shirt className="w-2.5 h-2.5" /> {event.dressCode}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      {event.ticketsSold}/{event.capacity}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.hasLicense ? (
                      <Badge className="bg-teal/20 text-teal gap-1">
                        <Check className="w-3 h-3" /> Valid
                      </Badge>
                    ) : (
                      <Badge className="bg-coral/20 text-coral gap-1">
                        <AlertTriangle className="w-3 h-3" /> Missing
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusStyles[event.status]}>
                      {event.status === "Featured" && <Star className="w-3 h-3 mr-1" />}
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => handleEditEvent(event.id, event.venue_id)}>
                          <Edit className="w-4 h-4" /> Edit Event
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {event.status === "Pending" && (
                          <>
                            <DropdownMenuItem className="gap-2 text-teal" onClick={() => handleAction(event.id, "approve")}>
                              <Check className="w-4 h-4" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-coral" onClick={() => handleAction(event.id, "reject")}>
                              <X className="w-4 h-4" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {event.status !== "Featured" && event.status !== "Pending" && (
                          <DropdownMenuItem className="gap-2 text-purple" onClick={() => handleAction(event.id, "feature")}>
                            <Sparkles className="w-4 h-4" /> Feature on Explore
                          </DropdownMenuItem>
                        )}
                        {event.status === "Flagged" ? (
                          <DropdownMenuItem className="gap-2 text-teal" onClick={() => handleAction(event.id, "unflag")}>
                            <Check className="w-4 h-4" /> Remove Flag
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="gap-2 text-amber-500" onClick={() => handleAction(event.id, "flag")}>
                            <Flag className="w-4 h-4" /> Flag Event
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleAction(event.id, "delete")}>
                          <Trash2 className="w-4 h-4" /> Delete Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>

        {/* Create Event Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event for Venue</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Venue</Label>
                <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.map((venue: any) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name} - {venue.city?.name || "Unknown City"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateForVenue}>
                Continue to Create Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
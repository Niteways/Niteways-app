import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Users,
  Ticket,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, isToday } from "date-fns";

interface Event {
  id: string;
  event_name: string;
  event_date: string;
  status: "upcoming" | "live" | "past";
  guestListEnabled: boolean;
  tablesEnabled: boolean;
  ticketsEnabled: boolean;
  image_url?: string;
  capacity?: number;
  tickets_sold?: number;
}

const Events = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch events from database
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;

      const mappedEvents: Event[] = (data || []).map(e => {
        const eventDate = new Date(e.event_date);
        const today = new Date();
        let status: "upcoming" | "live" | "past" = "upcoming";
        
        if (isToday(eventDate)) {
          status = "live";
        } else if (isBefore(eventDate, today)) {
          status = "past";
        }

        const ticketTypes = e.ticket_types as any[];
        
        return {
          id: e.id,
          event_name: e.event_name,
          event_date: e.event_date,
          status,
          guestListEnabled: true,
          tablesEnabled: true,
          ticketsEnabled: ticketTypes && ticketTypes.length > 0,
          image_url: e.image_url || undefined,
          capacity: e.capacity || 0,
          tickets_sold: e.tickets_sold || 0,
        };
      });

      setEvents(mappedEvents);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statusStyles = {
    upcoming: "bg-primary/20 text-primary border-primary/30",
    live: "bg-teal/20 text-teal border-teal/30",
    past: "bg-muted text-muted-foreground border-border",
  };

  const filteredEvents = events.filter(e => 
    e.event_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Event deleted");
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event");
    }
  };

  const stats = {
    upcoming: events.filter(e => e.status === "upcoming").length,
    live: events.filter(e => e.status === "live").length,
    total: events.length,
    expectedGuests: events.reduce((sum, e) => sum + (e.capacity || 0), 0),
  };

  return (
    <AdminLayout title="Events" subtitle="Create and manage venue events">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Upcoming Events</p>
            <p className="text-2xl font-bold text-foreground">{stats.upcoming}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Live Now</p>
            <p className="text-2xl font-bold text-teal">{stats.live}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold text-gold">{stats.total}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Capacity</p>
            <p className="text-2xl font-bold text-coral">{stats.expectedGuests.toLocaleString()}</p>
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button className="gap-2" onClick={() => navigate("/events/create")}>
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 glass-card">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground mb-4">Create your first event to get started</p>
            <Button onClick={() => navigate("/events/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>
        ) : (
          /* Events Grid */
          <div className="grid gap-4 md:grid-cols-2">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="glass-card hover:border-primary/30 transition-colors overflow-hidden">
                  {event.image_url && (
                    <div className="h-32 overflow-hidden">
                      <img 
                        src={event.image_url} 
                        alt={event.event_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{event.event_name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(event.event_date), "EEEE, MMM d, yyyy")}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={statusStyles[event.status]}>
                        {event.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {event.guestListEnabled && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" /> Guest List
                        </Badge>
                      )}
                      {event.tablesEnabled && (
                        <Badge variant="outline" className="text-xs">Tables</Badge>
                      )}
                      {event.ticketsEnabled && (
                        <Badge variant="outline" className="text-xs">
                          <Ticket className="w-3 h-3 mr-1" /> Tickets
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                      <Users className="w-4 h-4 mr-1" />
                      {event.capacity || 0} capacity • {event.tickets_sold || 0} sold
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button size="sm" variant="outline" className="flex-1 gap-1">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => navigate("/events/create")}>
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Button>
                      {event.ticketsEnabled && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
                          onClick={() => navigate(`/events/${event.id}/tickets`)}
                        >
                          <Ticket className="w-3.5 h-3.5" /> Tickets
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-coral hover:text-coral hover:bg-coral/10"
                        onClick={() => handleDelete(event.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Events;

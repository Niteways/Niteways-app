import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import {
  Plus,
  Search,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Users,
  Ticket,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { useVenueEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, useRealtimeEvents, Event } from "@/hooks/useEvents";

const DEFAULT_VENUE_ID = "d8e6dca6-7f45-4dc0-8fa7-fdb553e0b33c";

const VenueEvents = () => {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const { impersonatedVenueId, isImpersonating } = useImpersonation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Form state
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("22:00");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [featured, setFeatured] = useState(false);
  
  // Use impersonated venue first, then URL param, then default
  const effectiveVenueId = (isImpersonating && impersonatedVenueId) 
    ? impersonatedVenueId 
    : (venueId || DEFAULT_VENUE_ID);
  
  const { data: events = [], isLoading } = useVenueEvents(effectiveVenueId);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  useRealtimeEvents();

  const statusStyles = {
    active: "bg-teal/20 text-teal border-teal/30",
    draft: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-coral/20 text-coral border-coral/30",
  };

  const filteredEvents = events.filter(e => 
    e.event_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingEvents = filteredEvents.filter(e => new Date(e.event_date) >= new Date());
  const pastEvents = filteredEvents.filter(e => new Date(e.event_date) < new Date());

  const resetForm = () => {
    setEventName("");
    setEventDate("");
    setEventTime("22:00");
    setDescription("");
    setImageUrl("");
    setTicketPrice("");
    setCapacity("");
    setFeatured(false);
  };

  const handleCreate = async () => {
    if (!eventName || !eventDate) {
      toast.error("Please fill in event name and date");
      return;
    }

    try {
      await createEvent.mutateAsync({
        venue_id: effectiveVenueId,
        event_name: eventName,
        event_date: eventDate,
        event_time: eventTime || null,
        description: description || null,
        image_url: imageUrl || null,
        ticket_price: ticketPrice ? parseFloat(ticketPrice) : null,
        capacity: capacity ? parseInt(capacity) : null,
        featured,
        status: "active",
        ticket_types: null,
      });
      toast.success("Event created successfully!");
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create event");
    }
  };

  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setEventName(event.event_name);
    setEventDate(event.event_date);
    setEventTime(event.event_time || "22:00");
    setDescription(event.description || "");
    setImageUrl(event.image_url || "");
    setTicketPrice(event.ticket_price?.toString() || "");
    setCapacity(event.capacity?.toString() || "");
    setFeatured(event.featured);
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedEvent || !eventName || !eventDate) {
      toast.error("Please fill in event name and date");
      return;
    }

    try {
      await updateEvent.mutateAsync({
        id: selectedEvent.id,
        event_name: eventName,
        event_date: eventDate,
        event_time: eventTime || null,
        description: description || null,
        image_url: imageUrl || null,
        ticket_price: ticketPrice ? parseFloat(ticketPrice) : null,
        capacity: capacity ? parseInt(capacity) : null,
        featured,
      });
      toast.success("Event updated successfully!");
      setShowEditDialog(false);
      setSelectedEvent(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to update event");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent.mutateAsync(id);
      toast.success("Event deleted");
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const EventForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Event Name *</Label>
          <Input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Saturday Night Fever"
          />
        </div>
        <div>
          <Label>Date *</Label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Time</Label>
          <Input
            type="time"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your event..."
          rows={3}
        />
      </div>

      <div>
        <Label>Event Image URL</Label>
        <div className="flex gap-2">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1"
          />
          <Button variant="outline" size="icon">
            <Upload className="w-4 h-4" />
          </Button>
        </div>
        {imageUrl && (
          <div className="relative mt-2 rounded-lg overflow-hidden h-32 bg-muted">
            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setImageUrl("")}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Ticket Price (€)</Label>
          <Input
            type="number"
            value={ticketPrice}
            onChange={(e) => setTicketPrice(e.target.value)}
            placeholder="25"
          />
        </div>
        <div>
          <Label>Capacity</Label>
          <Input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Featured Event</p>
          <p className="text-sm text-muted-foreground">Show this event prominently</p>
        </div>
        <Switch checked={featured} onCheckedChange={setFeatured} />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          resetForm();
        }}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={createEvent.isPending || updateEvent.isPending}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <AdminLayout title="Events" subtitle="Create and manage your venue events">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Upcoming Events</p>
            <p className="text-2xl font-bold text-foreground">{upcomingEvents.length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Featured</p>
            <p className="text-2xl font-bold text-teal">{events.filter(e => e.featured).length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold text-gold">{events.length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Tickets Sold</p>
            <p className="text-2xl font-bold text-coral">{events.reduce((sum, e) => sum + (e.tickets_sold || 0), 0).toLocaleString()}</p>
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
            <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </div>
        </motion.div>

        {/* Events Grid */}
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
                  <div className="relative h-32 w-full overflow-hidden">
                    <img 
                      src={event.image_url} 
                      alt={event.event_name}
                      className="w-full h-full object-cover"
                    />
                    {event.featured && (
                      <Badge className="absolute top-2 right-2 bg-amber-500">Featured</Badge>
                    )}
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{event.event_name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(event.event_date), "EEEE, MMM d, yyyy")} at {event.event_time || "22:00"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={statusStyles[event.status as keyof typeof statusStyles] || statusStyles.active}>
                      {event.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {event.ticket_price && (
                      <Badge variant="outline" className="text-xs">
                        <Ticket className="w-3 h-3 mr-1" /> €{event.ticket_price}
                      </Badge>
                    )}
                    {event.capacity && (
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" /> {event.capacity} capacity
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <Ticket className="w-4 h-4 mr-1" />
                    {event.tickets_sold || 0} tickets sold
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button size="sm" variant="outline" className="flex-1 gap-1">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleEdit(event)}>
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </Button>
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

        {filteredEvents.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No events found. Create your first event!</p>
          </div>
        )}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Add a new event for your venue</DialogDescription>
          </DialogHeader>
          <EventForm onSubmit={handleCreate} submitLabel="Create Event" />
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Update event details</DialogDescription>
          </DialogHeader>
          <EventForm onSubmit={handleUpdate} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default VenueEvents;

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Ticket,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  QrCode,
  Clock,
  Copy,
  ExternalLink,
  CheckCircle,
  Calendar as CalendarIcon,
  Save,
  Users,
  Sparkles,
  ChevronLeft,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeTicketPurchases } from "@/hooks/useRealtimeTicketPurchases";
import { supabase } from "@/integrations/supabase/client";

interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  sold: number;
  status: "active" | "soldout" | "hidden";
  description?: string;
}

interface TicketOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  ticketType: string;
  quantity: number;
  total: number;
  status: "confirmed" | "pending" | "used" | "refunded";
  purchaseDate: string;
}

interface EventData {
  id: string;
  event_name: string;
  event_date: string;
  venue_id: string;
  ticket_types?: Record<string, any>[];
}

const EventTicketing = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [activeTab, setActiveTab] = useState("tickets");
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  
  // Manual order form state
  const [orderGuestName, setOrderGuestName] = useState("");
  const [orderGuestEmail, setOrderGuestEmail] = useState("");
  const [orderTicketType, setOrderTicketType] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");

  // Form state for new tickets
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newAvailable, setNewAvailable] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();
      
      if (error || !data) {
        console.error("Error fetching event:", error);
        toast.error("Failed to load event");
        return;
      }
      
      // Safely extract ticket_types as array
      let ticketTypesArray: Record<string, any>[] = [];
      if (Array.isArray(data.ticket_types)) {
        ticketTypesArray = data.ticket_types as Record<string, any>[];
      }
      
      // Map to our EventData type
      const eventData: EventData = {
        id: data.id,
        event_name: data.event_name,
        event_date: data.event_date,
        venue_id: data.venue_id,
        ticket_types: ticketTypesArray,
      };
      
      setEvent(eventData);
      
      // Parse ticket types from event data
      if (eventData.ticket_types && eventData.ticket_types.length > 0) {
        const parsedTickets: TicketType[] = eventData.ticket_types.map((t: any, idx: number) => ({
          id: t.id || `ticket-${idx}`,
          name: t.name || "General Admission",
          price: t.price || 0,
          available: t.available || 100,
          sold: t.sold || 0,
          status: t.status || "active",
          description: t.description,
        }));
        setTicketTypes(parsedTickets);
      }
    };
    
    fetchEvent();
    
    // Real-time subscription for event updates
    const channel = supabase
      .channel(`event-ticketing-${eventId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "events",
        filter: `id=eq.${eventId}`,
      }, () => {
        fetchEvent();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Realtime ticket purchases for this event
  const { 
    purchases, 
    isLoading: isLoadingPurchases, 
    addPurchase 
  } = useRealtimeTicketPurchases({
    eventDate: event?.event_date,
    venueId: event?.venue_id,
  });

  // Transform purchases to orders format
  const ticketOrders: TicketOrder[] = purchases
    .filter(p => p.event_name === event?.event_name)
    .map(p => ({
      id: p.id,
      orderNumber: p.ticket_id,
      customerName: p.guest_name,
      email: p.guest_email || "",
      ticketType: p.ticket_type,
      quantity: p.quantity || 1,
      total: Number(p.price) * (p.quantity || 1),
      status: p.status as TicketOrder["status"],
      purchaseDate: p.event_date,
    }));

  const stats = {
    totalRevenue: ticketOrders.filter(o => o.status !== "refunded").reduce((sum, o) => sum + o.total, 0),
    totalSold: ticketTypes.reduce((sum, t) => sum + t.sold, 0),
    activeTypes: ticketTypes.filter(t => t.status === "active").length,
    pendingOrders: ticketOrders.filter(o => o.status === "pending").length,
  };

  const statusStyles = {
    active: "bg-teal/20 text-teal border-teal/30",
    soldout: "bg-coral/20 text-coral border-coral/30",
    hidden: "bg-muted text-muted-foreground border-border",
    confirmed: "bg-teal/20 text-teal border-teal/30",
    pending: "bg-gold/20 text-gold border-gold/30",
    used: "bg-primary/20 text-primary border-primary/30",
    refunded: "bg-muted text-muted-foreground border-border",
  };

  const filteredOrders = ticketOrders.filter(order => 
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const saveTicketTypes = async (updatedTypes: TicketType[]) => {
    if (!eventId) return;
    
    // Convert to JSON-compatible format
    const jsonTypes = updatedTypes.map(t => ({
      id: t.id,
      name: t.name,
      price: t.price,
      available: t.available,
      sold: t.sold,
      status: t.status,
      description: t.description || null,
    }));
    
    const { error } = await supabase
      .from("events")
      .update({ ticket_types: jsonTypes })
      .eq("id", eventId);
    
    if (error) {
      console.error("Error saving ticket types:", error);
      toast.error("Failed to save ticket types");
      return;
    }
    
    setTicketTypes(updatedTypes);
  };

  const handleCreateManualOrder = async () => {
    if (!orderGuestName || !orderTicketType || !event) {
      toast.error("Please fill in required fields");
      return;
    }

    const selectedTicket = ticketTypes.find(t => t.name === orderTicketType);
    const price = selectedTicket?.price || 0;
    const quantity = parseInt(orderQuantity) || 1;

    try {
      await addPurchase({
        venue_id: event.venue_id,
        ticket_id: `TKT-${Date.now()}`,
        guest_name: orderGuestName,
        guest_email: orderGuestEmail || null,
        guest_id: null,
        ticket_type: orderTicketType,
        event_name: event.event_name,
        event_date: event.event_date,
        quantity: quantity,
        price: price,
        status: "confirmed",
      });

      // Update sold count
      const updatedTypes = ticketTypes.map(t => 
        t.name === orderTicketType 
          ? { ...t, sold: t.sold + quantity }
          : t
      );
      await saveTicketTypes(updatedTypes);

      toast.success(`Order created for ${orderGuestName}`);
      setIsManualOrderOpen(false);
      setOrderGuestName("");
      setOrderGuestEmail("");
      setOrderTicketType("");
      setOrderQuantity("1");
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error("Failed to create order");
    }
  };

  const handleCreateTicket = async () => {
    if (!newName || !newAvailable) {
      toast.error("Please fill in required fields");
      return;
    }

    const newTicket: TicketType = {
      id: `ticket-${Date.now()}`,
      name: newName,
      price: parseFloat(newPrice) || 0,
      available: parseInt(newAvailable),
      sold: 0,
      status: "active",
      description: newDescription,
    };

    await saveTicketTypes([...ticketTypes, newTicket]);
    resetForm();
    setIsCreateOpen(false);
    toast.success("Ticket type created!");
  };

  const handleEditTicket = async () => {
    if (!editingTicket) return;

    const updatedTypes = ticketTypes.map(t => 
      t.id === editingTicket.id ? editingTicket : t
    );
    await saveTicketTypes(updatedTypes);
    setIsEditOpen(false);
    setEditingTicket(null);
    toast.success("Ticket updated!");
  };

  const handleDeleteTicket = async (id: string) => {
    const updatedTypes = ticketTypes.filter(t => t.id !== id);
    await saveTicketTypes(updatedTypes);
    toast.success("Ticket deleted");
  };

  const resetForm = () => {
    setNewName("");
    setNewPrice("");
    setNewAvailable("");
    setNewDescription("");
  };

  const openEditFullPage = (ticket: TicketType) => {
    setEditingTicket({ ...ticket });
    setIsEditOpen(true);
  };

  // Ticket Card Component
  const TicketCard = ({ ticket, index }: { ticket: TicketType; index: number }) => {
    const progress = (ticket.sold / ticket.available) * 100;
    const isSoldOut = ticket.sold >= ticket.available;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          "rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg cursor-pointer",
          isSoldOut ? "border-coral/30 bg-coral/5" : "border-border bg-card"
        )}
      >
        <div className="p-4 relative bg-gradient-to-r from-primary/10 to-teal/10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] bg-primary/20 text-primary border-primary/30">
                  Event Ticket
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">{ticket.name}</h3>
            </div>
            <Badge variant="outline" className={cn("text-xs", statusStyles[ticket.status])}>
              {ticket.status === "soldout" ? "Sold Out" : ticket.status === "hidden" ? "Hidden" : "Active"}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">${ticket.price}</span>
            <span className="text-sm text-muted-foreground">/ ticket</span>
          </div>

          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Sold
              </span>
              <span className="font-medium">{ticket.sold} / {ticket.available}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={cn(
                  "h-full rounded-full",
                  isSoldOut ? "bg-coral" : progress > 80 ? "bg-gold" : "bg-teal"
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {ticket.available - ticket.sold} remaining
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEditFullPage(ticket)}>
              <Edit className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              size="sm" 
              variant="ghost" 
              className="px-2 text-coral hover:text-coral hover:bg-coral/10"
              onClick={() => handleDeleteTicket(ticket.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Order Card for Mobile
  const OrderCard = ({ order, index }: { order: TicketOrder; index: number }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-lg bg-muted/20 border border-border space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{order.customerName}</p>
          <p className="text-xs text-muted-foreground">{order.email}</p>
        </div>
        <Badge variant="outline" className={cn("text-[10px]", statusStyles[order.status])}>
          {order.status === "confirmed" && <CheckCircle className="w-2.5 h-2.5 mr-1" />}
          {order.status}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">{order.orderNumber}</Badge>
          <span className="text-muted-foreground">{order.ticketType}</span>
        </div>
        <span className="font-semibold">${order.total}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Qty: {order.quantity}</span>
        <span>{order.purchaseDate}</span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" className="flex-1 gap-1">
          <QrCode className="w-3.5 h-3.5" /> View QR
        </Button>
        <Button size="sm" variant="ghost" className="px-2">
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );

  if (!event) {
    return (
      <AdminLayout title="Event Ticketing" subtitle="">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Full-page create ticket form
  if (isCreateOpen) {
    return (
      <AdminLayout title="Event Ticketing" subtitle="">
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
            <Button variant="ghost" size="icon" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">Create Ticket Type</h2>
              <p className="text-xs text-muted-foreground">Add a new ticket for {event.event_name}</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 pb-32">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="space-y-2">
                <Label>Ticket Name *</Label>
                <Input 
                  placeholder="e.g., VIP Entry" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input 
                    type="number" 
                    placeholder="75" 
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="h-11 bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Available Quantity *</Label>
                  <Input 
                    type="number" 
                    placeholder="100" 
                    value={newAvailable}
                    onChange={(e) => setNewAvailable(e.target.value)}
                    className="h-11 bg-muted/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Describe what's included..." 
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="bg-muted/30"
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-50">
            <div className="max-w-lg mx-auto flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button className="flex-1 h-11" onClick={handleCreateTicket}>
                Create Ticket
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Full-page edit ticket form
  if (isEditOpen && editingTicket) {
    return (
      <AdminLayout title="Event Ticketing" subtitle="">
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
            <Button variant="ghost" size="icon" onClick={() => { setIsEditOpen(false); setEditingTicket(null); }}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">Edit Ticket Type</h2>
              <p className="text-xs text-muted-foreground">Update ticket details</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 pb-32">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="space-y-2">
                <Label>Ticket Name *</Label>
                <Input 
                  value={editingTicket.name}
                  onChange={(e) => setEditingTicket({ ...editingTicket, name: e.target.value })}
                  className="h-11 bg-muted/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input 
                    type="number" 
                    value={editingTicket.price}
                    onChange={(e) => setEditingTicket({ ...editingTicket, price: parseFloat(e.target.value) || 0 })}
                    className="h-11 bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Available Quantity</Label>
                  <Input 
                    type="number" 
                    value={editingTicket.available}
                    onChange={(e) => setEditingTicket({ ...editingTicket, available: parseInt(e.target.value) || 0 })}
                    className="h-11 bg-muted/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={editingTicket.status} 
                  onValueChange={(v) => setEditingTicket({ ...editingTicket, status: v as TicketType["status"] })}
                >
                  <SelectTrigger className="h-11 bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                    <SelectItem value="soldout">Sold Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={editingTicket.description || ""}
                  onChange={(e) => setEditingTicket({ ...editingTicket, description: e.target.value })}
                  rows={3}
                  className="bg-muted/30"
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-50">
            <div className="max-w-lg mx-auto flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => { setIsEditOpen(false); setEditingTicket(null); }}>
                Cancel
              </Button>
              <Button className="flex-1 h-11 gap-2" onClick={handleEditTicket}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Event Ticketing" subtitle={event.event_name}>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4" />
          Back to Events
        </Button>

        {/* Event Info Banner */}
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-teal/20 flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{event.event_name}</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold text-foreground">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal/20 to-teal/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-teal" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sold</p>
                <p className="text-xl font-bold text-teal">{stats.totalSold}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-gold">{stats.activeTypes}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral/20 to-coral/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-coral" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-coral">{stats.pendingOrders}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="tickets" className="gap-2">
                <Ticket className="w-4 h-4" />
                Ticket Types
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <Users className="w-4 h-4" />
                Orders
              </TabsTrigger>
            </TabsList>

            {activeTab === "tickets" && (
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Ticket
              </Button>
            )}
            
            {activeTab === "orders" && (
              <Button onClick={() => setIsManualOrderOpen(true)} className="gap-2">
                <ShoppingCart className="w-4 h-4" />
                Manual Order
              </Button>
            )}
          </div>

          <TabsContent value="tickets" className="mt-6">
            {ticketTypes.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No ticket types yet</h3>
                <p className="text-muted-foreground mb-4">Create your first ticket type for this event</p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Ticket Type
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ticketTypes.map((ticket, index) => (
                  <TicketCard key={ticket.id} ticket={ticket} index={index} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No orders yet</h3>
                <p className="text-muted-foreground">Orders will appear here when customers purchase tickets</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order, index) => (
                  <OrderCard key={order.id} order={order} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Manual Order Dialog */}
        <Dialog open={isManualOrderOpen} onOpenChange={setIsManualOrderOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Manual Order</DialogTitle>
              <DialogDescription>
                Manually add a ticket order for a guest
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input
                  value={orderGuestName}
                  onChange={(e) => setOrderGuestName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={orderGuestEmail}
                  onChange={(e) => setOrderGuestEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Ticket Type *</Label>
                <Select value={orderTicketType} onValueChange={setOrderTicketType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ticket type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketTypes.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name} - ${t.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsManualOrderOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreateManualOrder}>
                  Create Order
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default EventTicketing;

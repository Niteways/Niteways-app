import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { VenueIndicatorPill } from "@/components/layout/VenueIndicatorPill";
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
  DialogFooter,
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
  Eye,
  EyeOff,
  Sparkles,
  ChevronLeft,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeTicketPurchases } from "@/hooks/useRealtimeTicketPurchases";
import { useVenueTicketTypes } from "@/hooks/useVenueTicketTypes";

interface TicketType {
  id: string;
  name: string;
  price: number;
  available: number;
  sold: number;
  status: "active" | "soldout" | "hidden";
  type: "regular" | "special";
  specificDates?: string[];
  activeDays?: string[]; // For regular tickets: which days are active
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

// Ticket types are now fetched from the database via useVenueTicketTypes

import { DEFAULT_VENUE_ID } from "@/config/venueScope";

const Ticketing = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { impersonatedVenueId, isImpersonating } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  // Use database-backed venue tickets
  const { 
    allTickets: dbTickets, 
    isLoading: ticketsLoading,
    addTicket,
    updateTicket,
    deleteTicket: removeTicket,
  } = useVenueTicketTypes({ venueId: activeVenueId });

  // Transform DB tickets to local format
  const ticketTypes: TicketType[] = dbTickets.map(t => ({
    id: t.id,
    name: t.name,
    price: t.price,
    available: t.quantity,
    sold: t.sold,
    status: t.status as "active" | "soldout" | "hidden",
    type: t.type as "regular" | "special",
    activeDays: t.active_days || undefined,
    specificDates: t.specific_dates || undefined,
    description: t.description || undefined,
  }));

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState("tickets");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("all");
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  
  // Manual order form state
  const [orderGuestName, setOrderGuestName] = useState("");
  const [orderGuestEmail, setOrderGuestEmail] = useState("");
  const [orderTicketType, setOrderTicketType] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [orderEventDate, setOrderEventDate] = useState<Date | undefined>(new Date());
  const [orderEventName, setOrderEventName] = useState("");

  // Realtime ticket purchases - scoped to active venue
  const { 
    purchases, 
    isLoading: isLoadingPurchases, 
    addPurchase 
  } = useRealtimeTicketPurchases({ venueId: activeVenueId });

  // Transform purchases to orders format
  const ticketOrders: TicketOrder[] = purchases.map(p => ({
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

  // Form state
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newAvailable, setNewAvailable] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<"regular" | "special">("regular");
  const [newSpecificDates, setNewSpecificDates] = useState<Date[]>([]);
  const [newActiveDays, setNewActiveDays] = useState<string[]>(["friday", "saturday"]);

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

  const regularTickets = ticketTypes.filter(t => t.type === "regular");
  const specialTickets = ticketTypes.filter(t => t.type === "special");
  
  const filteredTickets = ticketTypeFilter === "all" 
    ? ticketTypes 
    : ticketTypeFilter === "regular" 
      ? regularTickets 
      : specialTickets;

  const filteredOrders = ticketOrders.filter(order => 
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateManualOrder = async () => {
    if (!orderGuestName || !orderTicketType || !orderEventDate) {
      toast.error("Please fill in required fields");
      return;
    }

    const selectedTicket = ticketTypes.find(t => t.name === orderTicketType);
    const price = selectedTicket?.price || 0;
    const quantity = parseInt(orderQuantity) || 1;

    try {
      await addPurchase({
        venue_id: activeVenueId,
        ticket_id: `TKT-${Date.now()}`,
        guest_name: orderGuestName,
        guest_email: orderGuestEmail || null,
        guest_id: null,
        ticket_type: orderTicketType,
        event_name: orderEventName || orderTicketType,
        event_date: format(orderEventDate, "yyyy-MM-dd"),
        quantity: quantity,
        price: price,
        status: "confirmed",
      });

      toast.success(`Order created for ${orderGuestName}`);
      setIsManualOrderOpen(false);
      setOrderGuestName("");
      setOrderGuestEmail("");
      setOrderTicketType("");
      setOrderQuantity("1");
      setOrderEventName("");
      setOrderEventDate(new Date());
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

    try {
      await addTicket({
        venue_id: activeVenueId,
        name: newName,
        price: parseFloat(newPrice) || 0,
        quantity: parseInt(newAvailable),
        sold: 0,
        status: "active",
        type: newType,
        active_days: newType === "regular" ? newActiveDays : null,
        specific_dates: newType === "special" ? newSpecificDates.map(d => format(d, "yyyy-MM-dd")) : null,
        description: newDescription || null,
        sort_order: ticketTypes.length,
      });
      resetForm();
      setIsCreateOpen(false);
      toast.success("Ticket type created!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create ticket");
    }
  };

  const handleEditTicket = async () => {
    if (!editingTicket) return;

    try {
      await updateTicket(editingTicket.id, {
        name: editingTicket.name,
        price: editingTicket.price,
        quantity: editingTicket.available,
        sold: editingTicket.sold,
        status: editingTicket.status,
        type: editingTicket.type,
        active_days: editingTicket.activeDays || null,
        specific_dates: editingTicket.specificDates || null,
        description: editingTicket.description || null,
      });
      setIsEditOpen(false);
      setEditingTicket(null);
      toast.success("Ticket updated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update ticket");
    }
  };

  const handleDeleteTicket = async (id: string) => {
    try {
      await removeTicket(id);
      toast.success("Ticket deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete ticket");
    }
  };

  const resetForm = () => {
    setNewName("");
    setNewPrice("");
    setNewAvailable("");
    setNewDescription("");
    setNewType("regular");
    setNewSpecificDates([]);
    setNewActiveDays(["friday", "saturday"]);
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
        onClick={() => navigate(`/tickets/${ticket.id}`)}
        className={cn(
          "rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg cursor-pointer",
          isSoldOut ? "border-coral/30 bg-coral/5" : "border-border bg-card"
        )}
      >
        {/* Header with gradient */}
        <div className={cn(
          "p-4 relative",
          ticket.type === "special" 
            ? "bg-gradient-to-r from-coral/20 to-gold/20" 
            : "bg-gradient-to-r from-primary/10 to-teal/10"
        )}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {ticket.type === "special" && <Sparkles className="w-4 h-4 text-gold" />}
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  ticket.type === "special" ? "bg-gold/20 text-gold border-gold/30" : "bg-primary/20 text-primary border-primary/30"
                )}>
                  {ticket.type === "special" ? "Special Event" : "Regular"}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg">{ticket.name}</h3>
            </div>
            <Badge variant="outline" className={cn("text-xs", statusStyles[ticket.status])}>
              {ticket.status === "soldout" ? "Sold Out" : ticket.status === "hidden" ? "Hidden" : "Active"}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">${ticket.price}</span>
            <span className="text-sm text-muted-foreground">/ ticket</span>
          </div>

          {/* Description */}
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          )}

          {/* Specific Dates for Special Tickets */}
          {ticket.type === "special" && ticket.specificDates && ticket.specificDates.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Special Date(s):</p>
              <div className="flex flex-wrap gap-1">
                {ticket.specificDates.map(date => (
                  <Badge key={date} variant="outline" className="text-[10px] bg-gold/10 border-gold/30">
                    <CalendarIcon className="w-2.5 h-2.5 mr-1" />
                    {format(new Date(date), "MMM d, yyyy")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Active Days for Regular Tickets */}
          {ticket.type === "regular" && ticket.activeDays && ticket.activeDays.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Active Days:</p>
              <div className="flex flex-wrap gap-1">
                {ticket.activeDays.map(day => (
                  <Badge key={day} variant="outline" className="text-[10px] bg-primary/10 border-primary/30 capitalize">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sales Progress */}
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

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); openEditFullPage(ticket); }}>
              <Edit className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button size="sm" variant="ghost" className="px-2" onClick={(e) => e.stopPropagation()}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm" 
              variant="ghost" 
              className="px-2 text-coral hover:text-coral hover:bg-coral/10"
              onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id); }}
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

  // Full-page create ticket form
  if (isCreateOpen) {
    return (
      <AdminLayout title="Ticketing" subtitle="">
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
            <Button variant="ghost" size="icon" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">Create Ticket Type</h2>
              <p className="text-xs text-muted-foreground">Add a new ticket for your venue</p>
            </div>
          </div>

          {/* Form Content */}
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
                <Label>Ticket Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as "regular" | "special")}>
                  <SelectTrigger className="h-11 bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular (Every Open Day)</SelectItem>
                    <SelectItem value="special">Special Date (Specific Days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newType === "regular" && (
                <div className="space-y-2">
                  <Label>Active Days (which days this ticket is valid)</Label>
                  <div className="flex flex-wrap gap-2">
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                      <Button
                        key={day}
                        type="button"
                        variant={newActiveDays.includes(day) ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "capitalize text-xs",
                          newActiveDays.includes(day) && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => {
                          if (newActiveDays.includes(day)) {
                            setNewActiveDays(newActiveDays.filter(d => d !== day));
                          } else {
                            setNewActiveDays([...newActiveDays, day]);
                          }
                        }}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select which days of the week this ticket type is available
                  </p>
                </div>
              )}

              {newType === "special" && (
                <div className="space-y-2">
                  <Label>Select Date(s)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal bg-muted/30",
                          newSpecificDates.length === 0 && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newSpecificDates.length > 0 
                          ? `${newSpecificDates.length} date(s) selected`
                          : "Pick date(s)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={newSpecificDates}
                        onSelect={(dates) => setNewSpecificDates(dates || [])}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {newSpecificDates.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {newSpecificDates.map((date, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {format(date, "MMM d, yyyy")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

          {/* Action Buttons */}
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
      <AdminLayout title="Ticketing" subtitle="">
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
            <Button variant="ghost" size="icon" onClick={() => { setIsEditOpen(false); setEditingTicket(null); }}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">Edit Ticket Type</h2>
              <p className="text-xs text-muted-foreground">Update ticket details</p>
            </div>
          </div>

          {/* Form Content */}
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
                <Label>Ticket Type</Label>
                <Select 
                  value={editingTicket.type} 
                  onValueChange={(v) => setEditingTicket({ ...editingTicket, type: v as "regular" | "special" })}
                >
                  <SelectTrigger className="h-11 bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular (Every Open Day)</SelectItem>
                    <SelectItem value="special">Special Date (Specific Days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingTicket.type === "regular" && (
                <div className="space-y-2">
                  <Label>Active Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                      <Button
                        key={day}
                        type="button"
                        variant={(editingTicket.activeDays || []).includes(day) ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "capitalize text-xs",
                          (editingTicket.activeDays || []).includes(day) && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => {
                          const currentDays = editingTicket.activeDays || [];
                          if (currentDays.includes(day)) {
                            setEditingTicket({ ...editingTicket, activeDays: currentDays.filter(d => d !== day) });
                          } else {
                            setEditingTicket({ ...editingTicket, activeDays: [...currentDays, day] });
                          }
                        }}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {editingTicket.type === "special" && (
                <div className="space-y-2">
                  <Label>Select Date(s)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal bg-muted/30",
                          !(editingTicket.specificDates || []).length && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {(editingTicket.specificDates || []).length > 0 
                          ? `${(editingTicket.specificDates || []).length} date(s) selected`
                          : "Pick date(s)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={(editingTicket.specificDates || []).map(d => new Date(d))}
                        onSelect={(dates) => setEditingTicket({ 
                          ...editingTicket, 
                          specificDates: (dates || []).map(d => format(d, "yyyy-MM-dd")) 
                        })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {(editingTicket.specificDates || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(editingTicket.specificDates || []).map((date, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {format(new Date(date), "MMM d, yyyy")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

          {/* Action Buttons */}
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
    <AdminLayout title="Ticketing" subtitle="Manage ticket types and orders">
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Venue Indicator */}
        <VenueIndicatorPill />
        
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
              <div className="flex items-center gap-2">
                <Select value={ticketTypeFilter} onValueChange={setTicketTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="special">Special</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  {!isMobile && "Create Ticket"}
                </Button>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button className="gap-2 shrink-0" onClick={() => setIsManualOrderOpen(true)}>
                  <ShoppingCart className="w-4 h-4" />
                  {!isMobile && "Add Order"}
                </Button>
              </div>
            )}
          </div>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="mt-6">
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"
            )}>
              {filteredTickets.map((ticket, index) => (
                <TicketCard key={ticket.id} ticket={ticket} index={index} />
              ))}
            </div>
            
            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No tickets found</p>
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            {isMobile ? (
              <div className="space-y-3">
                {filteredOrders.map((order, index) => (
                  <OrderCard key={order.id} order={order} index={index} />
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest ticket purchases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Order</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Customer</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Ticket Type</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Qty</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Total</th>
                          <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">Status</th>
                          <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order, index) => (
                          <motion.tr
                            key={order.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-border/30 hover:bg-muted/30"
                          >
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="font-mono text-xs">{order.orderNumber}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-sm">{order.customerName}</p>
                                <p className="text-xs text-muted-foreground">{order.email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm">{order.ticketType}</td>
                            <td className="py-3 px-4 text-sm">{order.quantity}</td>
                            <td className="py-3 px-4 text-sm font-medium">${order.total}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className={cn("text-xs", statusStyles[order.status])}>
                                {order.status === "confirmed" && <CheckCircle className="w-3 h-3 mr-1" />}
                                {order.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <QrCode className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Manual Order Dialog */}
        <Dialog open={isManualOrderOpen} onOpenChange={setIsManualOrderOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Manual Order</DialogTitle>
              <DialogDescription>Add a ticket order manually with real-time sync</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Guest Name *</Label>
                <Input 
                  placeholder="Enter guest name"
                  value={orderGuestName}
                  onChange={(e) => setOrderGuestName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Guest Email</Label>
                <Input 
                  type="email"
                  placeholder="guest@email.com"
                  value={orderGuestEmail}
                  onChange={(e) => setOrderGuestEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ticket Type *</Label>
                <Select value={orderTicketType} onValueChange={setOrderTicketType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ticket type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketTypes.filter(t => t.status === "active").map(t => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name} - ${t.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number"
                    min="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Event Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !orderEventDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {orderEventDate ? format(orderEventDate, "MMM d") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={orderEventDate}
                        onSelect={setOrderEventDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input 
                  placeholder="e.g., Friday Night Party"
                  value={orderEventName}
                  onChange={(e) => setOrderEventName(e.target.value)}
                />
              </div>
              {orderTicketType && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">
                      ${(ticketTypes.find(t => t.name === orderTicketType)?.price || 0) * (parseInt(orderQuantity) || 1)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManualOrderOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateManualOrder} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Ticketing;
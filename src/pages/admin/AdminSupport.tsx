import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Search, MessageSquare, AlertTriangle, Star, Clock, User, Building2, CheckCircle, XCircle, ArrowRight, Send, ArrowLeft, Eye, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Ticket {
  id: string;
  subject: string;
  user: string;
  userEmail: string;
  userType: "Guest" | "Venue";
  venue?: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  category: "Booking Issue" | "Payment" | "Technical" | "Complaint" | "Dispute" | "General";
  createdAt: string;
  lastUpdate: string;
  assignedTo?: string;
  openedBy?: string;
  openedAt?: string;
  closedBy?: string;
  closedAt?: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  sender: string;
  senderType: "user" | "admin";
  message: string;
  timestamp: string;
}

interface Rating {
  id: string;
  guest: string;
  venue: string;
  booking: string;
  rating: number;
  comment: string;
  date: string;
  responded: boolean;
}

const initialTickets: Ticket[] = [
  { 
    id: "T-001", 
    subject: "Payment not processed", 
    user: "Alex Johnson", 
    userEmail: "alex@email.com",
    userType: "Guest", 
    priority: "High", 
    status: "Open", 
    category: "Payment", 
    createdAt: "2024-01-20 14:30",
    lastUpdate: "2024-01-20 14:30",
    messages: [
      { id: "m1", sender: "Alex Johnson", senderType: "user", message: "I made a booking but my payment wasn't processed. The money was deducted from my account but I didn't receive a confirmation.", timestamp: "2024-01-20 14:30" }
    ]
  },
  { 
    id: "T-002", 
    subject: "Table was double booked", 
    user: "NightFlow Club", 
    userEmail: "contact@nightflow.com",
    userType: "Venue", 
    venue: "NightFlow Club", 
    priority: "Urgent", 
    status: "In Progress", 
    category: "Dispute", 
    createdAt: "2024-01-19 10:00",
    lastUpdate: "2024-01-20 09:15", 
    assignedTo: "Sarah Support",
    openedBy: "Sarah Support",
    openedAt: "2024-01-19 11:30",
    messages: [
      { id: "m1", sender: "NightFlow Club", senderType: "user", message: "We had two guests show up for the same table at the same time. This caused a major scene.", timestamp: "2024-01-19 10:00" },
      { id: "m2", sender: "Sarah Support", senderType: "admin", message: "I'm looking into this right now. Can you provide the booking IDs for both reservations?", timestamp: "2024-01-19 11:32" },
      { id: "m3", sender: "NightFlow Club", senderType: "user", message: "Yes, the booking IDs are BK-4521 and BK-4523.", timestamp: "2024-01-19 12:45" },
    ]
  },
  { 
    id: "T-003", 
    subject: "Cannot access analytics dashboard", 
    user: "Sunset Rooftop", 
    userEmail: "admin@sunsetrooftop.com",
    userType: "Venue", 
    venue: "Sunset Rooftop", 
    priority: "Medium", 
    status: "Open", 
    category: "Technical", 
    createdAt: "2024-01-20 08:00",
    lastUpdate: "2024-01-20 08:00",
    messages: [
      { id: "m1", sender: "Sunset Rooftop", senderType: "user", message: "Getting a 500 error when trying to access the analytics page. Started happening this morning.", timestamp: "2024-01-20 08:00" }
    ]
  },
  { 
    id: "T-004", 
    subject: "Refund request for cancelled event", 
    user: "Maria Garcia", 
    userEmail: "maria@email.com",
    userType: "Guest", 
    priority: "Medium", 
    status: "Resolved", 
    category: "Payment", 
    createdAt: "2024-01-18 16:00",
    lastUpdate: "2024-01-19 14:00", 
    assignedTo: "Mike Finance",
    openedBy: "Mike Finance",
    openedAt: "2024-01-18 17:00",
    closedBy: "Mike Finance",
    closedAt: "2024-01-19 14:00",
    messages: [
      { id: "m1", sender: "Maria Garcia", senderType: "user", message: "The event I had tickets for was cancelled. I need a refund.", timestamp: "2024-01-18 16:00" },
      { id: "m2", sender: "Mike Finance", senderType: "admin", message: "I've processed your refund. You should see it in 3-5 business days.", timestamp: "2024-01-19 14:00" },
    ]
  },
];

const initialRatings: Rating[] = [
  { id: "R-001", guest: "Alex Johnson", venue: "NightFlow Club", booking: "Table #12", rating: 5, comment: "Amazing experience! Will definitely come back.", date: "2024-01-20", responded: true },
  { id: "R-002", guest: "Maria Garcia", venue: "Metro Club Central", booking: "VIP Section", rating: 3, comment: "Good music but service was slow.", date: "2024-01-19", responded: false },
  { id: "R-003", guest: "Emma Davis", venue: "Sunset Rooftop", booking: "Table #5", rating: 4, comment: "Beautiful view, great cocktails.", date: "2024-01-18", responded: true },
  { id: "R-004", guest: "Lucas Martinez", venue: "Beach Paradise", booking: "Daybed", rating: 1, comment: "Terrible experience. Wrong reservation.", date: "2024-01-17", responded: false },
];

const AdminSupport = () => {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [ratings] = useState<Rating[]>(initialRatings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
                          ticket.user.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleAssign = (ticketId: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { 
        ...t, 
        status: "In Progress" as const, 
        assignedTo: "Current User",
        openedBy: "Current User",
        openedAt: format(new Date(), "yyyy-MM-dd HH:mm")
      } : t
    ));
    toast.success("Ticket assigned to you");
  };

  const handleResolve = (ticketId: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { 
        ...t, 
        status: "Resolved" as const,
        closedBy: "Current User",
        closedAt: format(new Date(), "yyyy-MM-dd HH:mm")
      } : t
    ));
    toast.success("Ticket resolved");
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;
    
    const message: TicketMessage = {
      id: `msg-${Date.now()}`,
      sender: "Support Agent",
      senderType: "admin",
      message: newMessage,
      timestamp: format(new Date(), "yyyy-MM-dd HH:mm")
    };

    setTickets(prev => prev.map(t =>
      t.id === selectedTicket.id ? {
        ...t,
        messages: [...t.messages, message],
        lastUpdate: format(new Date(), "yyyy-MM-dd HH:mm")
      } : t
    ));

    setSelectedTicket(prev => prev ? {
      ...prev,
      messages: [...prev.messages, message]
    } : null);

    setNewMessage("");
    toast.success("Message sent");
  };

  const priorityStyles = {
    Low: "bg-muted text-muted-foreground",
    Medium: "bg-blue-500/20 text-blue-400",
    High: "bg-gold/20 text-gold",
    Urgent: "bg-coral/20 text-coral",
  };

  const statusStyles = {
    Open: "bg-blue-500/20 text-blue-400",
    "In Progress": "bg-gold/20 text-gold",
    Resolved: "bg-teal/20 text-teal",
    Closed: "bg-muted text-muted-foreground",
  };

  // Mail Chat View
  if (selectedTicket) {
    return (
      <AdminLayout title="Support Ticket" subtitle={selectedTicket.subject}>
        <div className="space-y-6">
          {/* Back Button */}
          <Button variant="ghost" className="gap-2" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </Button>

          <div className="grid grid-cols-3 gap-6">
            {/* Chat Area */}
            <div className="col-span-2">
              <Card className="glass-card h-[600px] flex flex-col">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedTicket.subject}</CardTitle>
                      <CardDescription>Ticket {selectedTicket.id}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={priorityStyles[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                      <Badge className={statusStyles[selectedTicket.status]}>{selectedTicket.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedTicket.messages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${msg.senderType === 'admin' ? 'order-2' : ''}`}>
                            <div className={`rounded-lg p-3 ${
                              msg.senderType === 'admin' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              <p className="text-sm">{msg.message}</p>
                            </div>
                            <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                              msg.senderType === 'admin' ? 'justify-end' : ''
                            }`}>
                              <span>{msg.sender}</span>
                              <span>•</span>
                              <span>{msg.timestamp}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Textarea 
                        placeholder="Type your message..." 
                        className="min-h-[60px]"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button className="self-end" onClick={handleSendMessage}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ticket Details Sidebar */}
            <div className="space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm">Ticket Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">User</p>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedTicket.userType === "Guest" ? (
                        <User className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{selectedTicket.user}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedTicket.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <Badge variant="outline" className="mt-1">{selectedTicket.category}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">{selectedTicket.createdAt}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-sm">Ticket Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTicket.openedBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-teal" />
                      <div>
                        <p><span className="font-medium">{selectedTicket.openedBy}</span> opened</p>
                        <p className="text-xs text-muted-foreground">{selectedTicket.openedAt}</p>
                      </div>
                    </div>
                  )}
                  {selectedTicket.assignedTo && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="w-4 h-4 text-gold" />
                      <div>
                        <p>Assigned to <span className="font-medium">{selectedTicket.assignedTo}</span></p>
                      </div>
                    </div>
                  )}
                  {selectedTicket.closedBy && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-teal" />
                      <div>
                        <p><span className="font-medium">{selectedTicket.closedBy}</span> closed</p>
                        <p className="text-xs text-muted-foreground">{selectedTicket.closedAt}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                {!selectedTicket.assignedTo && (
                  <Button className="w-full" onClick={() => handleAssign(selectedTicket.id)}>
                    Assign to me
                  </Button>
                )}
                {selectedTicket.status !== "Resolved" && selectedTicket.status !== "Closed" && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => handleResolve(selectedTicket.id)}>
                    <CheckCircle className="w-4 h-4" />
                    Mark as Resolved
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Support System" subtitle="Manage tickets, ratings, and user feedback">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-5 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" /> Total Tickets
              </CardDescription>
              <CardTitle className="text-2xl">{tickets.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> Open
              </CardDescription>
              <CardTitle className="text-2xl text-blue-400">{tickets.filter(t => t.status === "Open").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Urgent
              </CardDescription>
              <CardTitle className="text-2xl text-coral">{tickets.filter(t => t.priority === "Urgent").length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Star className="w-4 h-4" /> Avg Rating
              </CardDescription>
              <CardTitle className="text-2xl text-gold">
                {(ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unresponded Reviews</CardDescription>
              <CardTitle className="text-2xl text-orange-400">{ratings.filter(r => !r.responded).length}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="ratings">Guest Ratings</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-4">
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-4"
            >
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
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
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Tickets Table */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTicket(ticket)}>
                      <TableCell className="font-mono text-xs">{ticket.id}</TableCell>
                      <TableCell className="font-medium">{ticket.subject}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ticket.userType === "Guest" ? (
                            <User className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span>{ticket.user}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ticket.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityStyles[ticket.priority]}>{ticket.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusStyles[ticket.status]}>{ticket.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {ticket.assignedTo || <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {ticket.messages.length}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="ratings" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Responded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ratings.map((rating) => (
                    <TableRow key={rating.id}>
                      <TableCell className="font-medium">{rating.guest}</TableCell>
                      <TableCell>{rating.venue}</TableCell>
                      <TableCell className="text-muted-foreground">{rating.booking}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < rating.rating ? "text-gold fill-gold" : "text-muted-foreground"}`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{rating.comment}</TableCell>
                      <TableCell className="text-muted-foreground">{rating.date}</TableCell>
                      <TableCell>
                        {rating.responded ? (
                          <Badge className="bg-teal/20 text-teal gap-1">
                            <CheckCircle className="w-3 h-3" /> Yes
                          </Badge>
                        ) : (
                          <Badge className="bg-coral/20 text-coral gap-1">
                            <XCircle className="w-3 h-3" /> No
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-medium mb-4">Active Disputes</h3>
              <p className="text-muted-foreground">
                Disputes are escalated tickets involving venue-guest conflicts, chargebacks, or policy violations.
              </p>
              <div className="mt-4">
                {tickets.filter(t => t.category === "Dispute").map(dispute => (
                  <div 
                    key={dispute.id} 
                    className="p-4 rounded-lg bg-muted/30 mb-2 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedTicket(dispute)}
                  >
                    <div>
                      <p className="font-medium">{dispute.subject}</p>
                      <p className="text-sm text-muted-foreground">{dispute.user}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1">
                      Review <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;
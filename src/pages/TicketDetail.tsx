import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  Ticket,
  DollarSign,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  quantity: number;
  total: number;
  status: "confirmed" | "pending" | "used" | "refunded";
  purchaseDate: string;
}

const statusStyles = {
  active: "bg-teal/20 text-teal border-teal/30",
  soldout: "bg-coral/20 text-coral border-coral/30",
  hidden: "bg-muted text-muted-foreground border-border",
  confirmed: "bg-teal/20 text-teal border-teal/30",
  pending: "bg-gold/20 text-gold border-gold/30",
  used: "bg-primary/20 text-primary border-primary/30",
  refunded: "bg-muted text-muted-foreground border-border",
};

// Mock ticket data - in real app would fetch from Supabase
const getTicketById = (id: string) => {
  const tickets = {
    "1": { id: "1", name: "General Admission", price: 25, available: 500, sold: 320, status: "active", type: "regular", activeDays: ["friday", "saturday"], description: "Standard entry to the venue" },
    "2": { id: "2", name: "VIP Entry", price: 75, available: 100, sold: 85, status: "active", type: "regular", activeDays: ["friday", "saturday", "sunday"], description: "Priority entry with VIP wristband" },
    "3": { id: "3", name: "Early Bird", price: 15, available: 200, sold: 200, status: "soldout", type: "regular", activeDays: ["thursday", "friday", "saturday"], description: "Limited early bird pricing" },
    "4": { id: "4", name: "NYE Special", price: 150, available: 300, sold: 120, status: "active", type: "special", specificDates: ["2024-12-31"], description: "New Year's Eve exclusive ticket" },
    "5": { id: "5", name: "Ladies Night Free", price: 0, available: 150, sold: 98, status: "active", type: "special", specificDates: ["2024-01-18", "2024-01-25"], description: "Free entry for ladies on selected nights" },
  };
  return tickets[id as keyof typeof tickets] || null;
};

const getOrdersByTicketId = (ticketId: string): TicketOrder[] => {
  const allOrders: TicketOrder[] = [
    { id: "1", orderNumber: "TKT-2024-001", customerName: "Marcus Thompson", email: "marcus@email.com", quantity: 2, total: 150, status: "confirmed", purchaseDate: "2024-01-15" },
    { id: "2", orderNumber: "TKT-2024-002", customerName: "Sarah Wilson", email: "sarah@email.com", quantity: 4, total: 100, status: "used", purchaseDate: "2024-01-14" },
    { id: "3", orderNumber: "TKT-2024-003", customerName: "James Rodriguez", email: "james@email.com", quantity: 1, total: 150, status: "confirmed", purchaseDate: "2024-01-15" },
    { id: "4", orderNumber: "TKT-2024-004", customerName: "Emily Chen", email: "emily@email.com", quantity: 2, total: 50, status: "pending", purchaseDate: "2024-01-15" },
    { id: "5", orderNumber: "TKT-2024-005", customerName: "Alex Johnson", email: "alex@email.com", quantity: 3, total: 75, status: "confirmed", purchaseDate: "2024-01-16" },
    { id: "6", orderNumber: "TKT-2024-006", customerName: "Lisa Park", email: "lisa@email.com", quantity: 1, total: 25, status: "refunded", purchaseDate: "2024-01-13" },
  ];
  
  // Filter orders based on ticket type (simplified mock)
  if (ticketId === "2") return allOrders.filter(o => o.id === "1" || o.id === "3");
  if (ticketId === "4") return allOrders.filter(o => o.id === "3");
  return allOrders.slice(0, 4);
};

const TicketDetail = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  
  const ticket = getTicketById(ticketId || "");
  const orders = getOrdersByTicketId(ticketId || "");
  
  if (!ticket) {
    return (
      <AdminLayout title="Ticket Not Found" subtitle="">
        <div className="flex flex-col items-center justify-center py-12">
          <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Ticket not found</p>
          <Button onClick={() => navigate("/tickets")}>Back to Tickets</Button>
        </div>
      </AdminLayout>
    );
  }
  
  const progress = (ticket.sold / ticket.available) * 100;
  const revenue = orders.filter(o => o.status !== "refunded").reduce((sum, o) => sum + o.total, 0);
  const totalQuantity = orders.filter(o => o.status !== "refunded").reduce((sum, o) => sum + o.quantity, 0);
  
  const salesBreakdown = {
    confirmed: orders.filter(o => o.status === "confirmed").length,
    used: orders.filter(o => o.status === "used").length,
    pending: orders.filter(o => o.status === "pending").length,
    refunded: orders.filter(o => o.status === "refunded").length,
  };

  return (
    <AdminLayout title="Ticket Details" subtitle="">
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Back Button + Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{ticket.name}</h2>
              <Badge variant="outline" className={cn(
                "text-xs",
                ticket.status === "active" ? statusStyles.active 
                  : ticket.status === "soldout" ? statusStyles.soldout 
                  : statusStyles.hidden
              )}>
                {ticket.status === "soldout" ? "Sold Out" : ticket.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{ticket.description}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-gold">${revenue.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tickets Sold</p>
                <p className="text-2xl font-bold text-teal">{ticket.sold}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sell Rate</p>
                <p className="text-2xl font-bold text-primary">{Math.round(progress)}%</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-coral" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-coral">{ticket.available - ticket.sold}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sales Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sales Breakdown</CardTitle>
              <CardDescription>Order status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-teal/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-teal" />
                    <span className="text-sm font-medium">Confirmed</span>
                  </div>
                  <p className="text-2xl font-bold">{salesBreakdown.confirmed}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Used</span>
                  </div>
                  <p className="text-2xl font-bold">{salesBreakdown.used}</p>
                </div>
                <div className="p-4 rounded-lg bg-gold/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gold" />
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                  <p className="text-2xl font-bold">{salesBreakdown.pending}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Refunded</span>
                  </div>
                  <p className="text-2xl font-bold">{salesBreakdown.refunded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold">Orders</h3>
            <p className="text-sm text-muted-foreground">{orders.length} orders for this ticket type</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="border-border/50 hover:bg-muted/30"
                >
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {order.orderNumber}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{order.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{order.email}</TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell className="font-medium">${order.total}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", statusStyles[order.status])}>
                      {order.status === "confirmed" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.purchaseDate}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default TicketDetail;

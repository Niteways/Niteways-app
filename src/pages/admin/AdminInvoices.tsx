import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Download, FileText, Clock, CheckCircle, Search, Eye, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  venue: string;
  venueId: string;
  company: string;
  amount: number;
  status: "Paid" | "Pending" | "Overdue";
  dueDate: string;
  paidDate?: string;
  type: "SaaS" | "Commission" | "Ad";
  period: string;
}

const mockInvoices: Invoice[] = [
  { id: "INV-001", venue: "NightFlow Club", venueId: "VNU-001", company: "NightFlow Entertainment", amount: 299, status: "Paid", dueDate: "2024-01-15", paidDate: "2024-01-14", type: "SaaS", period: "Jan 2024" },
  { id: "INV-002", venue: "Metro Club Central", venueId: "VNU-002", company: "Metro Nightlife Group", amount: 499, status: "Pending", dueDate: "2024-01-25", type: "SaaS", period: "Jan 2024" },
  { id: "INV-003", venue: "Beach Paradise", venueId: "VNU-003", company: "Island Vibes Ltd", amount: 1250, status: "Paid", dueDate: "2024-01-10", paidDate: "2024-01-09", type: "Commission", period: "Dec 2023" },
  { id: "INV-004", venue: "Sunset Rooftop", venueId: "VNU-004", company: "Sunset Venues", amount: 199, status: "Overdue", dueDate: "2024-01-05", type: "SaaS", period: "Jan 2024" },
  { id: "INV-005", venue: "Urban Beats Main", venueId: "VNU-005", company: "Urban Beats", amount: 500, status: "Pending", dueDate: "2024-01-28", type: "Ad", period: "Jan 2024" },
  { id: "INV-006", venue: "NightFlow Club", venueId: "VNU-001", company: "NightFlow Entertainment", amount: 850, status: "Paid", dueDate: "2023-12-15", paidDate: "2023-12-14", type: "Commission", period: "Nov 2023" },
  { id: "INV-007", venue: "Metro Club Central", venueId: "VNU-002", company: "Metro Nightlife Group", amount: 499, status: "Paid", dueDate: "2023-12-25", paidDate: "2023-12-24", type: "SaaS", period: "Dec 2023" },
  { id: "INV-008", venue: "Beach Paradise", venueId: "VNU-003", company: "Island Vibes Ltd", amount: 2100, status: "Paid", dueDate: "2023-12-10", paidDate: "2023-12-08", type: "Commission", period: "Nov 2023" },
];

const AdminInvoices = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredInvoices = mockInvoices.filter(inv => {
    const matchesSearch = searchQuery === "" || 
      inv.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesType = typeFilter === "all" || inv.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalRevenue = mockInvoices.filter(i => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0);
  const pendingAmount = mockInvoices.filter(i => i.status === "Pending").reduce((sum, i) => sum + i.amount, 0);
  const overdueAmount = mockInvoices.filter(i => i.status === "Overdue").reduce((sum, i) => sum + i.amount, 0);

  const handleExport = () => {
    toast.success("Exporting invoices to CSV...");
  };

  const handleSendReminder = (invoiceId: string) => {
    toast.success(`Payment reminder sent for ${invoiceId}`);
  };

  const statusStyles = {
    Paid: "bg-teal/20 text-teal",
    Pending: "bg-gold/20 text-gold",
    Overdue: "bg-coral/20 text-coral",
  };

  return (
    <AdminLayout title="Invoices" subtitle="View and manage all platform invoices">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-4"
        >
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" /> Total Collected
              </CardDescription>
              <CardTitle className="text-3xl text-teal">${totalRevenue.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> Pending
              </CardDescription>
              <CardTitle className="text-3xl text-gold">${pendingAmount.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Overdue
              </CardDescription>
              <CardTitle className="text-3xl text-coral">${overdueAmount.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> Total Invoices
              </CardDescription>
              <CardTitle className="text-3xl">{mockInvoices.length}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-between items-center gap-4"
        >
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by venue, company, or invoice ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SaaS">SaaS</SelectItem>
                <SelectItem value="Commission">Commission</SelectItem>
                <SelectItem value="Ad">Advertising</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </motion.div>

        {/* Invoice Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Venue / Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No invoices found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">{invoice.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.venue}</p>
                        <p className="text-xs text-muted-foreground">{invoice.company}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invoice.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{invoice.period}</TableCell>
                    <TableCell className="font-medium">${invoice.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{invoice.dueDate}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[invoice.status]}>
                        {invoice.status === "Paid" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View Invoice">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {invoice.status !== "Paid" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Send Reminder"
                            onClick={() => handleSendReminder(invoice.id)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Download">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminInvoices;

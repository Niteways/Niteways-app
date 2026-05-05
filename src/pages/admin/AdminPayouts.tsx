import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Building2, DollarSign, Clock, CheckCircle, Send, Eye, Download, Wallet, ArrowUpRight, Calendar } from "lucide-react";
import { toast } from "sonner";

interface VenuePayout {
  id: string;
  venueId: string;
  venueName: string;
  company: string;
  grossRevenue: number;
  commission: number;
  netPayout: number;
  status: "Scheduled" | "Processing" | "Paid" | "On Hold";
  payoutDate: string;
  periodStart: string;
  periodEnd: string;
  bankAccount: string;
}

const mockPayouts: VenuePayout[] = [
  { id: "PAY-001", venueId: "VNU-001", venueName: "NightFlow Club", company: "NightFlow Entertainment", grossRevenue: 45000, commission: 2250, netPayout: 42750, status: "Scheduled", payoutDate: "2024-01-25", periodStart: "2024-01-01", periodEnd: "2024-01-15", bankAccount: "****4521" },
  { id: "PAY-002", venueId: "VNU-003", venueName: "Beach Paradise", company: "Island Vibes Ltd", grossRevenue: 95000, commission: 7600, netPayout: 87400, status: "Processing", payoutDate: "2024-01-22", periodStart: "2024-01-01", periodEnd: "2024-01-15", bankAccount: "****8834" },
  { id: "PAY-003", venueId: "VNU-002", venueName: "Metro Club Central", company: "Metro Nightlife Group", grossRevenue: 68000, commission: 3400, netPayout: 64600, status: "Paid", payoutDate: "2024-01-18", periodStart: "2024-01-01", periodEnd: "2024-01-15", bankAccount: "****2291" },
  { id: "PAY-004", venueId: "VNU-004", venueName: "Sunset Rooftop", company: "Sunset Venues", grossRevenue: 32000, commission: 1920, netPayout: 30080, status: "On Hold", payoutDate: "2024-01-25", periodStart: "2024-01-01", periodEnd: "2024-01-15", bankAccount: "****7762" },
  { id: "PAY-005", venueId: "VNU-005", venueName: "Urban Beats Main", company: "Urban Beats", grossRevenue: 78000, commission: 5460, netPayout: 72540, status: "Paid", payoutDate: "2024-01-18", periodStart: "2024-01-01", periodEnd: "2024-01-15", bankAccount: "****3345" },
  { id: "PAY-006", venueId: "VNU-006", venueName: "Club Elysium", company: "Elysium Group", grossRevenue: 156000, commission: 7800, netPayout: 148200, status: "Scheduled", payoutDate: "2024-01-25", periodStart: "2024-01-01", periodEnd: "2024-01-15", bankAccount: "****9918" },
];

const AdminPayouts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payouts, setPayouts] = useState<VenuePayout[]>(mockPayouts);
  const [selectedPayout, setSelectedPayout] = useState<VenuePayout | null>(null);
  const [payoutDelay, setPayoutDelay] = useState(7);

  const filteredPayouts = payouts.filter(p => {
    const matchesSearch = searchQuery === "" ||
      p.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.venueId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalScheduled = payouts.filter(p => p.status === "Scheduled").reduce((sum, p) => sum + p.netPayout, 0);
  const totalProcessing = payouts.filter(p => p.status === "Processing").reduce((sum, p) => sum + p.netPayout, 0);
  const totalPaid = payouts.filter(p => p.status === "Paid").reduce((sum, p) => sum + p.netPayout, 0);
  const totalOnHold = payouts.filter(p => p.status === "On Hold").reduce((sum, p) => sum + p.netPayout, 0);

  const handleProcessPayout = (payoutId: string) => {
    setPayouts(payouts.map(p => 
      p.id === payoutId ? { ...p, status: "Processing" as const } : p
    ));
    toast.success("Payout processing initiated");
  };

  const handleReleasePayout = (payoutId: string) => {
    setPayouts(payouts.map(p => 
      p.id === payoutId ? { ...p, status: "Scheduled" as const } : p
    ));
    toast.success("Payout released from hold");
  };

  const handleHoldPayout = (payoutId: string) => {
    setPayouts(payouts.map(p => 
      p.id === payoutId ? { ...p, status: "On Hold" as const } : p
    ));
    toast.success("Payout placed on hold");
  };

  const handleSavePayoutSettings = () => {
    toast.success("Payout settings saved");
  };

  const statusStyles = {
    Scheduled: "bg-teal/20 text-teal",
    Processing: "bg-gold/20 text-gold",
    Paid: "bg-primary/20 text-primary",
    "On Hold": "bg-coral/20 text-coral",
  };

  return (
    <AdminLayout title="Venue Payouts" subtitle="Track and manage venue payouts">
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
                <Calendar className="w-4 h-4" /> Scheduled
              </CardDescription>
              <CardTitle className="text-2xl text-teal">${totalScheduled.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> Processing
              </CardDescription>
              <CardTitle className="text-2xl text-gold">${totalProcessing.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Paid This Period
              </CardDescription>
              <CardTitle className="text-2xl text-primary">${totalPaid.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Wallet className="w-4 h-4" /> On Hold
              </CardDescription>
              <CardTitle className="text-2xl text-coral">${totalOnHold.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Payout Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Payout Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-6">
                <div className="space-y-2">
                  <Label>Payout Delay (Days)</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={payoutDelay}
                    onChange={(e) => setPayoutDelay(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Days after period end before payout</p>
                </div>
                <Button onClick={handleSavePayoutSettings}>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by venue, company, or ID..."
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
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </motion.div>

        {/* Payouts Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payout ID</TableHead>
                <TableHead>Venue / Company</TableHead>
                <TableHead>Gross Revenue</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Net Payout</TableHead>
                <TableHead>Payout Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No payouts found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono text-sm">{payout.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{payout.venueName}</p>
                          <p className="text-xs text-muted-foreground">{payout.company}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>${payout.grossRevenue.toLocaleString()}</TableCell>
                    <TableCell className="text-coral">-${payout.commission.toLocaleString()}</TableCell>
                    <TableCell className="text-teal font-medium">${payout.netPayout.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{payout.payoutDate}</TableCell>
                    <TableCell>
                      <Badge className={statusStyles[payout.status]}>
                        {payout.status === "Paid" && <CheckCircle className="w-3 h-3 mr-1" />}
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedPayout(payout)}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {payout.status === "Scheduled" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleProcessPayout(payout.id)}
                              title="Process Now"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleHoldPayout(payout.id)}
                              title="Put On Hold"
                            >
                              <Clock className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {payout.status === "On Hold" && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleReleasePayout(payout.id)}
                            title="Release"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>

        {/* Payout Details Dialog */}
        <Dialog open={!!selectedPayout} onOpenChange={(open) => !open && setSelectedPayout(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payout Details</DialogTitle>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-lg">{selectedPayout.venueName}</p>
                    <p className="text-sm text-muted-foreground">{selectedPayout.company}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payout ID</p>
                    <p className="font-mono">{selectedPayout.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Venue ID</p>
                    <p className="font-mono">{selectedPayout.venueId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p>{selectedPayout.periodStart} - {selectedPayout.periodEnd}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payout Date</p>
                    <p>{selectedPayout.payoutDate}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Revenue</span>
                    <span className="font-medium">${selectedPayout.grossRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-coral">
                    <span>Platform Commission</span>
                    <span>-${selectedPayout.commission.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold text-teal pt-2 border-t border-border">
                    <span>Net Payout</span>
                    <span>${selectedPayout.netPayout.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">Bank Account</p>
                  <p className="font-mono">{selectedPayout.bankAccount}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayout(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPayouts;

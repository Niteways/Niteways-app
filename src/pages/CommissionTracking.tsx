import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Percent, DollarSign, TrendingUp, Calendar, ChevronRight, Receipt, ArrowLeft } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  guestName: string;
  type: string;
  amount: number;
  commission: number;
}

interface MonthData {
  month: string;
  bookings: number;
  revenue: number;
  commission: number;
  rate: number;
  transactions: Transaction[];
}

const commissionData: MonthData[] = [
  { 
    month: "Dec 2024", 
    bookings: 156, 
    revenue: 458000, 
    commission: 22900, 
    rate: 5,
    transactions: [
      { id: "TRX-001", date: "2024-12-15", guestName: "Sophie Anderson", type: "Table Booking", amount: 15000, commission: 750 },
      { id: "TRX-002", date: "2024-12-14", guestName: "Michael Chen", type: "VIP Booth", amount: 45000, commission: 2250 },
      { id: "TRX-003", date: "2024-12-14", guestName: "Emma Watson", type: "Table Booking", amount: 8500, commission: 425 },
      { id: "TRX-004", date: "2024-12-13", guestName: "James Wilson", type: "Ticket Purchase", amount: 2500, commission: 125 },
      { id: "TRX-005", date: "2024-12-12", guestName: "Lisa Park", type: "Table Booking", amount: 12000, commission: 600 },
      { id: "TRX-006", date: "2024-12-11", guestName: "Robert Taylor", type: "VIP Booth", amount: 55000, commission: 2750 },
      { id: "TRX-007", date: "2024-12-10", guestName: "Anna Maria", type: "Table Booking", amount: 9800, commission: 490 },
      { id: "TRX-008", date: "2024-12-09", guestName: "David Kim", type: "VIP Booth", amount: 38000, commission: 1900 },
      { id: "TRX-009", date: "2024-12-08", guestName: "Sarah Jones", type: "Ticket Purchase", amount: 4200, commission: 210 },
      { id: "TRX-010", date: "2024-12-07", guestName: "Chris Evans", type: "Table Booking", amount: 11500, commission: 575 },
    ]
  },
  { 
    month: "Nov 2024", 
    bookings: 142, 
    revenue: 412000, 
    commission: 20600, 
    rate: 5,
    transactions: [
      { id: "TRX-101", date: "2024-11-30", guestName: "Jennifer Lopez", type: "VIP Booth", amount: 65000, commission: 3250 },
      { id: "TRX-102", date: "2024-11-28", guestName: "Chris Evans", type: "Table Booking", amount: 18000, commission: 900 },
      { id: "TRX-103", date: "2024-11-25", guestName: "Maria Garcia", type: "Table Booking", amount: 14000, commission: 700 },
      { id: "TRX-104", date: "2024-11-22", guestName: "John Smith", type: "Ticket Purchase", amount: 3500, commission: 175 },
    ]
  },
  { 
    month: "Oct 2024", 
    bookings: 128, 
    revenue: 378000, 
    commission: 18900, 
    rate: 5,
    transactions: [
      { id: "TRX-201", date: "2024-10-28", guestName: "Alex Johnson", type: "VIP Booth", amount: 52000, commission: 2600 },
      { id: "TRX-202", date: "2024-10-25", guestName: "Emily Brown", type: "Table Booking", amount: 16500, commission: 825 },
    ]
  },
  { 
    month: "Sep 2024", 
    bookings: 134, 
    revenue: 395000, 
    commission: 19750, 
    rate: 5,
    transactions: []
  },
];

const CommissionTracking = () => {
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [yearFilter, setYearFilter] = useState("2024");

  const totalCommission = commissionData.reduce((sum, d) => sum + d.commission, 0);
  const totalRevenue = commissionData.reduce((sum, d) => sum + d.revenue, 0);
  const totalBookings = commissionData.reduce((sum, d) => sum + d.bookings, 0);

  // If a month is selected, show full page detail view
  if (selectedMonth) {
    return (
      <AdminLayout title={`${selectedMonth.month} Commission Details`} subtitle="Detailed transaction breakdown">
        <div className="space-y-6">
          {/* Back Button */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button variant="ghost" onClick={() => setSelectedMonth(null)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </Button>
          </motion.div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple/20">
                      <TrendingUp className="w-5 h-5 text-purple" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{selectedMonth.revenue.toLocaleString()} kr</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-coral/20">
                      <DollarSign className="w-5 h-5 text-coral" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Commission</p>
                      <p className="text-2xl font-bold text-coral">{selectedMonth.commission.toLocaleString()} kr</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gold/20">
                      <Calendar className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Bookings</p>
                      <p className="text-2xl font-bold">{selectedMonth.bookings}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Transactions List */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  All Transactions
                </CardTitle>
                <CardDescription>
                  {selectedMonth.transactions.length} transaction{selectedMonth.transactions.length !== 1 ? 's' : ''} in {selectedMonth.month}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedMonth.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedMonth.transactions.map((trx, idx) => (
                      <motion.div
                        key={trx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.03 }}
                        className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-teal/20">
                            <Receipt className="w-4 h-4 text-teal" />
                          </div>
                          <div>
                            <p className="font-medium">{trx.guestName}</p>
                            <p className="text-sm text-muted-foreground">{trx.type} • {trx.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Amount</p>
                            <p className="font-medium">{trx.amount.toLocaleString()} kr</p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-xs text-muted-foreground">Commission ({selectedMonth.rate}%)</p>
                            <p className="font-semibold text-coral">{trx.commission.toLocaleString()} kr</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No detailed transaction data available</p>
                    <p className="text-sm">Detailed transactions for this month are not recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Commission Tracking" subtitle="View detailed commission history and transactions">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal/20">
                  <Percent className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission Rate</p>
                  <p className="text-2xl font-bold">5%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-coral/20">
                  <DollarSign className="w-5 h-5 text-coral" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Commission (YTD)</p>
                  <p className="text-2xl font-bold text-coral">{totalCommission.toLocaleString()} kr</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple/20">
                  <TrendingUp className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue (YTD)</p>
                  <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} kr</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold/20">
                  <Calendar className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Bookings (YTD)</p>
                  <p className="text-2xl font-bold">{totalBookings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-6">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Monthly Commission List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Monthly Commission Breakdown
            </CardTitle>
            <CardDescription>
              Click on a month to view detailed transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commissionData.map((data, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  className="flex items-center justify-between p-4 bg-muted/20 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedMonth(data)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{data.month}</p>
                      <p className="text-sm text-muted-foreground">{data.bookings} bookings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-medium">{data.revenue.toLocaleString()} kr</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Rate</p>
                      <p className="font-medium">{data.rate}%</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="font-semibold text-coral">{data.commission.toLocaleString()} kr</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AdminLayout>
  );
};

export default CommissionTracking;
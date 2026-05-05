import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/StatCard";
import { DollarSign, TrendingUp, CreditCard, Building2, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const platformEarnings = [
  { type: "Commission Fees", amount: 45200, percentage: 55 },
  { type: "SaaS Subscriptions", amount: 28500, percentage: 35 },
  { type: "Advertising", amount: 8200, percentage: 10 },
];

const venuePayouts = [
  { venue: "NightFlow Club - Downtown", earnings: 28500, payout: 25650, commission: 2850, status: "Paid" },
  { venue: "Metro Club Central", earnings: 22400, payout: 20160, commission: 2240, status: "Pending" },
  { venue: "Sunset Rooftop", earnings: 18200, payout: 16380, commission: 1820, status: "Paid" },
  { venue: "NightFlow Lounge - Uptown", earnings: 15800, payout: 14220, commission: 1580, status: "Processing" },
  { venue: "Urban Beats Main", earnings: 12600, payout: 11340, commission: 1260, status: "Paid" },
];

const paymentGateways = [
  { name: "Stripe", status: "Active", volume: 125000, transactions: 3420 },
  { name: "PayPal", status: "Active", volume: 45000, transactions: 1280 },
  { name: "Apple Pay", status: "Active", volume: 32000, transactions: 890 },
];

const AdminFinance = () => {
  const [period, setPeriod] = useState("month");

  const handleExport = (type: string) => {
    toast.success(`Exporting ${type} report...`);
  };

  return (
    <AdminLayout title="Financial Tools" subtitle="Track earnings, payouts, and manage payment systems">
      <div className="space-y-6">
        {/* Period Filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => handleExport("revenue")}>
              <Download className="w-4 h-4" /> Revenue Report
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => handleExport("payout")}>
              <Download className="w-4 h-4" /> Payout Report
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Platform Revenue"
            value="$81,900"
            icon={DollarSign}
            trend={{ value: 18, label: "vs last month" }}
            variant="gold"
          />
          <StatCard
            title="Total Payouts"
            value="$87,750"
            icon={TrendingUp}
            trend={{ value: 15, label: "vs last month" }}
            variant="teal"
          />
          <StatCard
            title="Processing"
            value="$14,220"
            icon={CreditCard}
            trend={{ value: 3, label: "pending payouts" }}
            variant="coral"
          />
          <StatCard
            title="Active Venues"
            value="67"
            icon={Building2}
            trend={{ value: 5, label: "new this month" }}
            variant="gold"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Platform Earnings Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Platform Earnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {platformEarnings.map((earning) => (
                  <div key={earning.type} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{earning.type}</span>
                      <span className="font-medium">${earning.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${earning.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-border flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary">${platformEarnings.reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payment Gateways */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Payment Gateways</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentGateways.map((gateway) => (
                    <div key={gateway.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-primary" />
                        <div>
                          <p className="font-medium">{gateway.name}</p>
                          <p className="text-xs text-muted-foreground">{gateway.transactions.toLocaleString()} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${gateway.volume.toLocaleString()}</p>
                        <Badge className="bg-teal/20 text-teal">{gateway.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Venue Payouts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Venue Payouts</CardTitle>
              <Button variant="outline" size="sm">View All</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Venue</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venuePayouts.map((payout) => (
                    <TableRow key={payout.venue} className="border-border/50">
                      <TableCell className="font-medium">{payout.venue}</TableCell>
                      <TableCell className="text-right">${payout.earnings.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-coral">${payout.commission.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium text-teal">${payout.payout.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={
                          payout.status === "Paid" ? "bg-teal/20 text-teal" :
                          payout.status === "Processing" ? "bg-gold/20 text-gold" :
                          "bg-coral/20 text-coral"
                        }>
                          {payout.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminFinance;

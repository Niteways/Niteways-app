import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/StatCard";
import { Building2, Users, CreditCard, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const recentCompanies = [
  { id: "1", name: "NightFlow Entertainment", venues: 3, plan: "Enterprise", status: "Active", contact: "John Smith" },
  { id: "2", name: "Sunset Venues", venues: 1, plan: "Professional", status: "Active", contact: "Sarah Johnson" },
  { id: "3", name: "Metro Nightlife Group", venues: 5, plan: "Enterprise", status: "Active", contact: "Mike Wilson" },
  { id: "4", name: "Urban Beats", venues: 2, plan: "Starter", status: "Pending", contact: "Emma Davis" },
];

const unpaidInvoices = [
  { id: "INV-001", company: "NightFlow Entertainment", amount: 2500, dueDate: "2024-01-15" },
  { id: "INV-002", company: "Sunset Venues", amount: 500, dueDate: "2024-01-20" },
  { id: "INV-003", company: "Urban Beats", amount: 800, dueDate: "2024-01-25" },
];

const AdminDashboard = () => {
  return (
    <AdminLayout title="Admin Dashboard" subtitle="Platform overview and management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Companies"
            value="24"
            icon={Building2}
            trend={{ value: 12, label: "vs last month" }}
            variant="gold"
          />
          <StatCard
            title="Total Venues"
            value="67"
            icon={Building2}
            trend={{ value: 8, label: "vs last month" }}
            variant="teal"
          />
          <StatCard
            title="Active Users"
            value="342"
            icon={Users}
            trend={{ value: 15, label: "vs last month" }}
            variant="coral"
          />
          <StatCard
            title="Monthly Revenue"
            value="$48,250"
            icon={CreditCard}
            trend={{ value: 22, label: "vs last month" }}
            variant="gold"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Companies */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Companies</h3>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Company</TableHead>
                  <TableHead>Venues</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCompanies.map((company) => (
                  <TableRow key={company.id} className="border-border/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.contact}</p>
                      </div>
                    </TableCell>
                    <TableCell>{company.venues}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{company.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={company.status === "Active" ? "bg-teal/20 text-teal" : "bg-gold/20 text-gold"}>
                        {company.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>

          {/* Unpaid Invoices */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Unpaid Invoices</h3>
                <Badge className="bg-coral/20 text-coral">{unpaidInvoices.length}</Badge>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-border/50">
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.company}</TableCell>
                    <TableCell className="text-coral">${invoice.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{invoice.dueDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        </div>

        {/* Subscription Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Subscription Plans Overview</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground">Starter Plans</p>
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-muted-foreground mt-1">$2,400/month</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground">Professional Plans</p>
              <p className="text-2xl font-bold text-teal">12</p>
              <p className="text-xs text-muted-foreground mt-1">$9,600/month</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground">Enterprise Plans</p>
              <p className="text-2xl font-bold text-gold">4</p>
              <p className="text-xs text-muted-foreground mt-1">$36,000/month</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

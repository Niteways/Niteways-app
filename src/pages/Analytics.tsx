import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  MapPin,
} from "lucide-react";

const revenueData = [
  { day: "Mon", revenue: 12500 },
  { day: "Tue", revenue: 8200 },
  { day: "Wed", revenue: 15800 },
  { day: "Thu", revenue: 18500 },
  { day: "Fri", revenue: 32000 },
  { day: "Sat", revenue: 45000 },
  { day: "Sun", revenue: 22000 },
];

const bookingsData = [
  { week: "W1", bookings: 45, guests: 320 },
  { week: "W2", bookings: 52, guests: 380 },
  { week: "W3", bookings: 48, guests: 350 },
  { week: "W4", bookings: 65, guests: 480 },
];

const guestTypeData = [
  { name: "VIP", value: 35, color: "hsl(350, 80%, 65%)" },
  { name: "Regular", value: 45, color: "hsl(174, 62%, 47%)" },
  { name: "First Timer", value: 20, color: "hsl(45, 93%, 58%)" },
];

const promoterData = [
  { name: "Marcus T.", guests: 156, revenue: 28000 },
  { name: "Sarah W.", guests: 132, revenue: 24500 },
  { name: "Alex M.", guests: 98, revenue: 18200 },
  { name: "David B.", guests: 87, revenue: 15800 },
  { name: "Lisa P.", guests: 65, revenue: 12000 },
];

const tableZones = [
  { zone: "VIP Booth", bookings: 45, revenue: 85000 },
  { zone: "Main Floor", bookings: 78, revenue: 52000 },
  { zone: "Rooftop", bookings: 32, revenue: 48000 },
  { zone: "Private Room", bookings: 12, revenue: 36000 },
];

const Analytics = () => {
  return (
    <AdminLayout title="Analytics & Reports" subtitle="Performance insights and data exports">
      <div className="space-y-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <Select defaultValue="week">
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <MapPin className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  <SelectItem value="main">Main Club</SelectItem>
                  <SelectItem value="rooftop">Rooftop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="stat-card-gold">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-black/60" />
              <span className="text-sm text-black/70">Total Revenue</span>
            </div>
            <p className="text-3xl font-bold text-black">$154,000</p>
            <p className="text-sm text-black/60 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12% vs last week
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card-teal">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-black/60" />
              <span className="text-sm text-black/70">Total Guests</span>
            </div>
            <p className="text-3xl font-bold text-black">2,847</p>
            <p className="text-sm text-black/60 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +8% vs last week
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card-coral">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-black/60" />
              <span className="text-sm text-black/70">Bookings</span>
            </div>
            <p className="text-3xl font-bold text-black">210</p>
            <p className="text-sm text-black/60 mt-1">Avg: 30/night</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Spend</span>
            </div>
            <p className="text-3xl font-bold text-foreground">$734</p>
            <p className="text-sm text-muted-foreground mt-1">Per booking</p>
          </motion.div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Weekly Revenue</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Guest Types Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Guest Demographics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={guestTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {guestTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Promoter Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Promoter Performance</h3>
            <div className="space-y-4">
              {promoterData.map((promoter, index) => (
                <div key={promoter.name} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-24 truncate">{promoter.name}</span>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(promoter.guests / 156) * 100}%` }}
                        transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{promoter.guests} guests</p>
                    <p className="text-xs text-muted-foreground">${promoter.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Table Zones */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Popular Table Zones</h3>
            <div className="space-y-4">
              {tableZones.map((zone, index) => (
                <div key={zone.zone} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">#{index + 1}</Badge>
                    <span className="font-medium">{zone.zone}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{zone.bookings} bookings</p>
                    <p className="text-xs text-muted-foreground">${zone.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Analytics;

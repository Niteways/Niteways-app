import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendingUp, Users, DollarSign, Calendar, MapPin, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const bookingTrends = [
  { month: "Jan", bookings: 2400, revenue: 48000, users: 320 },
  { month: "Feb", bookings: 2800, revenue: 56000, users: 380 },
  { month: "Mar", bookings: 3200, revenue: 64000, users: 450 },
  { month: "Apr", bookings: 3800, revenue: 76000, users: 520 },
  { month: "May", bookings: 4200, revenue: 84000, users: 610 },
  { month: "Jun", bookings: 4800, revenue: 96000, users: 720 },
];

const topCities = [
  { name: "New York", venues: 12, bookings: 4500, revenue: 125000 },
  { name: "Los Angeles", venues: 8, bookings: 3200, revenue: 89000 },
  { name: "Miami", venues: 6, bookings: 2800, revenue: 78000 },
  { name: "Chicago", venues: 5, bookings: 2100, revenue: 58000 },
  { name: "Las Vegas", venues: 7, bookings: 3500, revenue: 98000 },
];

const venueSegments = [
  { name: "Nightclubs", value: 45, color: "hsl(var(--primary))" },
  { name: "Lounges", value: 25, color: "hsl(var(--secondary))" },
  { name: "Rooftops", value: 15, color: "hsl(var(--accent))" },
  { name: "Beach Clubs", value: 15, color: "hsl(var(--purple))" },
];

const userGrowth = [
  { week: "W1", guests: 120, hosts: 15 },
  { week: "W2", guests: 180, hosts: 22 },
  { week: "W3", guests: 250, hosts: 28 },
  { week: "W4", guests: 320, hosts: 35 },
];

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState("30d");
  const [drillDown, setDrillDown] = useState("all");

  return (
    <AdminLayout title="Analytics Dashboard" subtitle="Platform-wide performance metrics and insights">
      <div className="space-y-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4"
        >
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={drillDown} onValueChange={setDrillDown}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Drill Down" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              <SelectItem value="city">By City</SelectItem>
              <SelectItem value="type">By Event Type</SelectItem>
              <SelectItem value="segment">By Segment</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Macro Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Total Bookings"
            value="24,580"
            icon={Calendar}
            trend={{ value: 18, label: "vs last period" }}
            variant="gold"
          />
          <StatCard
            title="Daily Active Users"
            value="1,842"
            icon={Users}
            trend={{ value: 12, label: "vs last period" }}
            variant="teal"
          />
          <StatCard
            title="Gross Merchandise Value"
            value="$1.2M"
            icon={DollarSign}
            trend={{ value: 24, label: "vs last period" }}
            variant="coral"
          />
          <StatCard
            title="Top Performing"
            value="NightFlow Club"
            icon={TrendingUp}
            trend={{ value: 340, label: "bookings this month" }}
            variant="gold"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Booking & Revenue Trends */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Booking & Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bookingTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary) / 0.2)"
                        name="Revenue ($)"
                      />
                      <Area
                        type="monotone"
                        dataKey="bookings"
                        stroke="hsl(var(--secondary))"
                        fill="hsl(var(--secondary) / 0.2)"
                        name="Bookings"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User Growth */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line type="monotone" dataKey="guests" stroke="hsl(var(--primary))" strokeWidth={2} name="Guests" />
                      <Line type="monotone" dataKey="hosts" stroke="hsl(var(--accent))" strokeWidth={2} name="Hosts" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Second Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Top Cities */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Top Cities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCities} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={80} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="bookings" fill="hsl(var(--secondary))" radius={4} name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Venue Segments */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Venue Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={venueSegments}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {venueSegments.map((entry, index) => (
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
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {venueSegments.map((seg) => (
                    <div key={seg.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                      {seg.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from "recharts";
import { cn } from "@/lib/utils";

interface Table {
  id: string;
  label: string;
  basePrice: number;
  capacity: number;
}

interface RecurringPattern {
  dayOfWeek: number;
  price: number;
}

interface SpecialDatePricing {
  id: string;
  date: string;
  multiplier: number;
  tables: string[];
  individualPrices?: Record<string, number>;
}

interface PricingForecastChartProps {
  tables: Table[];
  recurringPatterns: RecurringPattern[];
  specialDates: SpecialDatePricing[];
  getPricingForDate: (date: string, tableId: string, basePrice: number) => number;
}

export const PricingForecastChart = ({
  tables,
  recurringPatterns,
  specialDates,
  getPricingForDate,
}: PricingForecastChartProps) => {
  const [viewDays, setViewDays] = useState(30);
  const [selectedTable, setSelectedTable] = useState<string>("all");

  const forecastData = useMemo(() => {
    const dates = eachDayOfInterval({
      start: new Date(),
      end: addDays(new Date(), viewDays),
    });

    return dates.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayOfWeek = date.getDay();
      
      let totalRevenue = 0;
      let tableCount = 0;

      const tablesToUse = selectedTable === "all" 
        ? tables 
        : tables.filter(t => t.id === selectedTable);

      tablesToUse.forEach((table) => {
        // Check special date pricing
        const specialDate = specialDates.find(
          (sd) => sd.date === dateStr && sd.tables.includes(table.id)
        );
        
        let price = table.basePrice;
        
        if (specialDate) {
          if (specialDate.individualPrices?.[table.id]) {
            price = specialDate.individualPrices[table.id];
          } else {
            price = table.basePrice * specialDate.multiplier;
          }
        } else {
          // Check recurring patterns
          const recurringPattern = recurringPatterns.find(
            (p) => p.dayOfWeek === dayOfWeek
          );
          if (recurringPattern) {
            price = recurringPattern.price;
          }
        }
        
        totalRevenue += price;
        tableCount++;
      });

      // Calculate booking probability based on day of week (weekend = higher)
      const bookingProbability = [0.3, 0.4, 0.5, 0.6, 0.8, 0.95, 0.85][dayOfWeek];
      const projectedRevenue = Math.round(totalRevenue * bookingProbability);

      return {
        date: dateStr,
        dateShort: format(date, "MMM dd"),
        day: format(date, "EEE"),
        potentialRevenue: totalRevenue,
        projectedRevenue,
        bookingProbability: Math.round(bookingProbability * 100),
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
        isSpecialDate: specialDates.some((sd) => sd.date === dateStr),
      };
    });
  }, [tables, recurringPatterns, specialDates, viewDays, selectedTable]);

  const totalStats = useMemo(() => {
    const total = forecastData.reduce(
      (acc, day) => ({
        potential: acc.potential + day.potentialRevenue,
        projected: acc.projected + day.projectedRevenue,
      }),
      { potential: 0, projected: 0 }
    );

    const weekendRevenue = forecastData
      .filter((d) => d.isWeekend)
      .reduce((acc, d) => acc + d.projectedRevenue, 0);
    
    const weekdayRevenue = forecastData
      .filter((d) => !d.isWeekend)
      .reduce((acc, d) => acc + d.projectedRevenue, 0);

    const specialDateRevenue = forecastData
      .filter((d) => d.isSpecialDate)
      .reduce((acc, d) => acc + d.projectedRevenue, 0);

    return { ...total, weekendRevenue, weekdayRevenue, specialDateRevenue };
  }, [forecastData]);

  const avgDailyRevenue = Math.round(totalStats.projected / forecastData.length);

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal" />
            Revenue Forecast
          </CardTitle>
          <CardDescription>
            Projected revenue based on pricing rules and historical patterns
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTable} onValueChange={setSelectedTable}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button 
              variant={viewDays === 30 ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewDays(30)}
            >
              30 Days
            </Button>
            <Button 
              variant={viewDays === 90 ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewDays(90)}
            >
              90 Days
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-teal/10 border border-teal/20">
            <p className="text-xs text-muted-foreground mb-1">Projected Revenue</p>
            <p className="text-2xl font-bold text-teal">
              ${totalStats.projected.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-teal" />
              Next {viewDays} days
            </p>
          </div>
          <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
            <p className="text-xs text-muted-foreground mb-1">Maximum Potential</p>
            <p className="text-2xl font-bold text-gold">
              ${totalStats.potential.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              100% occupancy
            </p>
          </div>
          <div className="p-4 rounded-lg bg-coral/10 border border-coral/20">
            <p className="text-xs text-muted-foreground mb-1">Weekend Revenue</p>
            <p className="text-2xl font-bold text-coral">
              ${totalStats.weekendRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((totalStats.weekendRevenue / totalStats.projected) * 100)}% of total
            </p>
          </div>
          <div className="p-4 rounded-lg bg-purple/10 border border-purple/20">
            <p className="text-xs text-muted-foreground mb-1">Avg Daily Revenue</p>
            <p className="text-2xl font-bold text-purple">
              ${avgDailyRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Per day average
            </p>
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(174, 62%, 47%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(174, 62%, 47%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="potentialGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(45, 93%, 58%)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(45, 93%, 58%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
              <XAxis 
                dataKey="dateShort" 
                stroke="hsl(0, 0%, 60%)"
                tick={{ fill: "hsl(0, 0%, 60%)", fontSize: 10 }}
                interval={viewDays === 30 ? 4 : 13}
              />
              <YAxis 
                stroke="hsl(0, 0%, 60%)"
                tick={{ fill: "hsl(0, 0%, 60%)", fontSize: 10 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 10%)",
                  border: "1px solid hsl(0, 0%, 20%)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(0, 0%, 95%)" }}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`,
                  name === "potentialRevenue" ? "Maximum" : "Projected",
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="potentialRevenue"
                stroke="hsl(45, 93%, 58%)"
                strokeWidth={1}
                fill="url(#potentialGradient)"
                name="Maximum Potential"
              />
              <Area
                type="monotone"
                dataKey="projectedRevenue"
                stroke="hsl(174, 62%, 47%)"
                strokeWidth={2}
                fill="url(#projectedGradient)"
                name="Projected Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Special Dates Highlight */}
        {specialDates.length > 0 && (
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-coral" />
              Special Date Pricing Applied
            </h4>
            <div className="flex flex-wrap gap-2">
              {specialDates.slice(0, 5).map((sd) => (
                <Badge 
                  key={sd.id} 
                  variant="outline" 
                  className="bg-coral/10 text-coral border-coral/30"
                >
                  {format(new Date(sd.date), "MMM dd")} - {sd.multiplier}x
                </Badge>
              ))}
              {specialDates.length > 5 && (
                <Badge variant="outline" className="text-muted-foreground">
                  +{specialDates.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

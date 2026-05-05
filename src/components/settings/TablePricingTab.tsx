import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, DollarSign, TrendingUp, History, Plus, Edit, Trash2, Save, X, Users, Percent, Check } from "lucide-react";
import { format, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTableSync } from "@/hooks/useTableSync";
import { useRealtimeSpecialDatePricing } from "@/hooks/useRealtimeSpecialDatePricing";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { PricingForecastChart } from "./PricingForecastChart";

import { DEFAULT_VENUE_ID } from "@/config/venueScope";

interface TablePricingEntry {
  id: string;
  table_id: string;
  date: string;
  price: number;
  pricing_type: string;
  notes: string | null;
}

interface RecurringPattern {
  dayOfWeek: number;
  price: number;
  capacity?: number;
  depositPercent?: number;
}

interface SpecialDatePricing {
  id: string;
  date: string;
  multiplier: number;
  tables: string[];
  individualPrices?: Record<string, number>;
}

const TablePricingTab = () => {
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  const { tables, updateTable } = useTableSync({ venueId: activeVenueId });
  const { 
    specialDates: realtimeSpecialDates, 
    getPricingForDate,
    addSpecialDate: addSpecialDateToDb,
    updateSpecialDate: updateSpecialDateInDb,
    deleteSpecialDate: deleteSpecialDateFromDb,
  } = useRealtimeSpecialDatePricing({ venueId: activeVenueId });
  
  // Transform realtime data to local format
  const specialDates: SpecialDatePricing[] = realtimeSpecialDates.map(sd => ({
    id: sd.id,
    date: sd.date,
    multiplier: sd.multiplier,
    tables: sd.tables,
    individualPrices: sd.individual_prices,
  }));
  
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [viewDays, setViewDays] = useState(30);
  const [pricingHistory, setPricingHistory] = useState<TablePricingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");
  
  // Recurring pattern dialog
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(6); // Saturday
  const [recurringPrice, setRecurringPrice] = useState("");
  const [recurringCapacity, setRecurringCapacity] = useState("");
  const [recurringDeposit, setRecurringDeposit] = useState("");
  const [recurringPatterns, setRecurringPatterns] = useState<RecurringPattern[]>([]);

  // Table detail edit dialog
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [editTableCapacity, setEditTableCapacity] = useState("");
  const [editTableDeposit, setEditTableDeposit] = useState("");
  const [editTableBasePrice, setEditTableBasePrice] = useState("");
  const [editTableMinSpend, setEditTableMinSpend] = useState("");
  
  // Special date pricing dialog
  const [isSpecialDateOpen, setIsSpecialDateOpen] = useState(false);
  const [editingSpecialDate, setEditingSpecialDate] = useState<SpecialDatePricing | null>(null);
  const [newSpecialDate, setNewSpecialDate] = useState("");
  const [newSpecialMultiplier, setNewSpecialMultiplier] = useState("1.5");
  const [selectedTablesForDate, setSelectedTablesForDate] = useState<string[]>([]);
  const [individualTablePrices, setIndividualTablePrices] = useState<Record<string, string>>({});

  const selectedTableData = tables.find(t => t.id === selectedTable);

  const fetchPricingHistory = async () => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("table_pricing_history")
        .select("*")
        .eq("table_id", selectedTable)
        .order("date", { ascending: true });

      if (error) throw error;
      setPricingHistory(data || []);
    } catch (error) {
      console.error("Error fetching pricing history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchPricingHistory();
      // Pre-fill edit form
      const table = tables.find(t => t.id === selectedTable);
      if (table) {
        setEditTableCapacity(table.capacity.toString());
        setEditTableDeposit(table.depositPercent.toString());
        setEditTableBasePrice(table.basePrice.toString());
        setEditTableMinSpend(table.minSpend.toString());
      }
    }
  }, [selectedTable, tables]);

  // Generate calendar dates
  const calendarDates = eachDayOfInterval({
    start: new Date(),
    end: addDays(new Date(), viewDays),
  });

  const getDatePrice = (date: Date): number => {
    if (!selectedTableData) return 0;
    
    // Check pricing history first
    const historyEntry = pricingHistory.find(p => 
      isSameDay(new Date(p.date), date)
    );
    if (historyEntry) return historyEntry.price;
    
    // Check special date pricing
    const specialPrice = getPricingForDate(format(date, "yyyy-MM-dd"), selectedTableData.id, selectedTableData.basePrice);
    if (specialPrice !== selectedTableData.basePrice) return specialPrice;
    
    // Check recurring patterns
    const dayOfWeek = date.getDay();
    const recurringPattern = recurringPatterns.find(p => p.dayOfWeek === dayOfWeek);
    if (recurringPattern) return recurringPattern.price;
    
    // Return base price
    return selectedTableData.basePrice;
  };

  const handleSetPrice = async () => {
    if (!selectedTable || !selectedDate || !newPrice) return;

    try {
      const tableData = tables.find(t => t.id === selectedTable);
      if (!tableData?.venueId) {
        toast.error("Venue ID not found for this table");
        return;
      }

      const { error } = await supabase
        .from("table_pricing_history")
        .upsert({
          table_id: selectedTable,
          venue_id: tableData.venueId,
          date: format(selectedDate, "yyyy-MM-dd"),
          price: parseFloat(newPrice),
          pricing_type: "manual",
          notes: pricingNotes || null,
        }, {
          onConflict: "table_id,date",
        });

      if (error) throw error;

      toast.success("Price updated");
      setIsPricingDialogOpen(false);
      setNewPrice("");
      setPricingNotes("");
      fetchPricingHistory();
    } catch (error) {
      console.error("Error setting price:", error);
      toast.error("Failed to set price");
    }
  };

  const handleAddRecurringPattern = () => {
    if (!recurringPrice) return;
    
    setRecurringPatterns(prev => [
      ...prev.filter(p => p.dayOfWeek !== selectedDayOfWeek),
      { 
        dayOfWeek: selectedDayOfWeek, 
        price: parseFloat(recurringPrice),
        capacity: recurringCapacity ? parseInt(recurringCapacity) : undefined,
        depositPercent: recurringDeposit ? parseInt(recurringDeposit) : undefined,
      }
    ]);
    toast.success("Recurring pattern added");
    setIsRecurringOpen(false);
    setRecurringPrice("");
    setRecurringCapacity("");
    setRecurringDeposit("");
  };

  const removeRecurringPattern = (dayOfWeek: number) => {
    setRecurringPatterns(prev => prev.filter(p => p.dayOfWeek !== dayOfWeek));
    toast.success("Recurring pattern removed");
  };

  const handleSaveTableDetails = () => {
    if (!selectedTable) return;
    
    updateTable(selectedTable, {
      capacity: parseInt(editTableCapacity) || 4,
      depositPercent: parseInt(editTableDeposit) || 20,
      basePrice: parseInt(editTableBasePrice) || 1000,
      minSpend: parseInt(editTableMinSpend) || 500,
    });
    
    setIsEditingTable(false);
    toast.success("Table details updated");
  };

  // Special date pricing handlers
  const toggleTableForSpecialDate = (tableId: string) => {
    setSelectedTablesForDate(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const resetSpecialDateForm = () => {
    setNewSpecialDate("");
    setNewSpecialMultiplier("1.5");
    setSelectedTablesForDate([]);
    setIndividualTablePrices({});
    setEditingSpecialDate(null);
  };

  const handleAddSpecialDate = async () => {
    if (!newSpecialDate || selectedTablesForDate.length === 0) {
      toast.error("Please select a date and at least one table");
      return;
    }

    const individualPrices: Record<string, number> = {};
    Object.entries(individualTablePrices).forEach(([tableId, price]) => {
      if (price && selectedTablesForDate.includes(tableId)) {
        individualPrices[tableId] = parseFloat(price);
      }
    });

    try {
      await addSpecialDateToDb({
        date: newSpecialDate,
        multiplier: parseFloat(newSpecialMultiplier),
        tables: selectedTablesForDate,
        individual_prices: Object.keys(individualPrices).length > 0 ? individualPrices : null,
      });
      
      toast.success("Special date pricing added");
      setIsSpecialDateOpen(false);
      resetSpecialDateForm();
    } catch (error) {
      toast.error("Failed to add special date pricing");
    }
  };

  const handleUpdateSpecialDate = async () => {
    if (!editingSpecialDate) return;

    const individualPrices: Record<string, number> = {};
    Object.entries(individualTablePrices).forEach(([tableId, price]) => {
      if (price && selectedTablesForDate.includes(tableId)) {
        individualPrices[tableId] = parseFloat(price);
      }
    });

    try {
      await updateSpecialDateInDb(editingSpecialDate.id, {
        date: newSpecialDate,
        multiplier: parseFloat(newSpecialMultiplier),
        tables: selectedTablesForDate,
        individual_prices: Object.keys(individualPrices).length > 0 ? individualPrices : null,
      });
      
      toast.success("Special date pricing updated");
      setIsSpecialDateOpen(false);
      resetSpecialDateForm();
    } catch (error) {
      toast.error("Failed to update special date pricing");
    }
  };

  const handleEditSpecialDate = (sd: SpecialDatePricing) => {
    setEditingSpecialDate(sd);
    setNewSpecialDate(sd.date);
    setNewSpecialMultiplier(sd.multiplier.toString());
    setSelectedTablesForDate(sd.tables);
    const prices: Record<string, string> = {};
    if (sd.individualPrices) {
      Object.entries(sd.individualPrices).forEach(([tableId, price]) => {
        prices[tableId] = price.toString();
      });
    }
    setIndividualTablePrices(prices);
    setIsSpecialDateOpen(true);
  };

  const handleDeleteSpecialDate = async (id: string) => {
    try {
      await deleteSpecialDateFromDb(id);
      toast.success("Special date pricing deleted");
    } catch (error) {
      toast.error("Failed to delete special date pricing");
    }
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="forecast">Revenue Forecast</TabsTrigger>
          <TabsTrigger value="individual">Individual Table Pricing</TabsTrigger>
          <TabsTrigger value="special">Special Date Pricing</TabsTrigger>
        </TabsList>

        {/* Revenue Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <PricingForecastChart
            tables={tables.map(t => ({ id: t.id, label: t.label, basePrice: t.basePrice, capacity: t.capacity }))}
            recurringPatterns={recurringPatterns}
            specialDates={specialDates}
            getPricingForDate={getPricingForDate}
          />
        </TabsContent>

        {/* Individual Table Pricing Tab */}
        <TabsContent value="individual" className="space-y-6">
          {/* Table Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Select a Table
              </CardTitle>
              <CardDescription>
                Choose a table to manage its pricing, capacity, and deposit settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {tables.map((table) => (
                  <motion.button
                    key={table.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTable(table.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      selectedTable === table.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <p className="font-bold">{table.label}</p>
                    <p className="text-sm text-muted-foreground">${table.basePrice}</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />{table.capacity}
                      </Badge>
                    </div>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedTable && selectedTableData && (
            <>
              {/* Table Details Card */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedTableData.label} - Details
                    </CardTitle>
                    <CardDescription>
                      Configure capacity, deposit, and base pricing for this table
                    </CardDescription>
                  </div>
                  <Button 
                    variant={isEditingTable ? "default" : "outline"} 
                    size="sm"
                    onClick={() => isEditingTable ? handleSaveTableDetails() : setIsEditingTable(true)}
                    className="gap-2"
                  >
                    {isEditingTable ? <><Save className="w-4 h-4" /> Save</> : <><Edit className="w-4 h-4" /> Edit</>}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        Max Capacity
                      </Label>
                      <Input
                        type="number"
                        value={editTableCapacity}
                        onChange={(e) => setEditTableCapacity(e.target.value)}
                        disabled={!isEditingTable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-muted-foreground" />
                        Deposit %
                      </Label>
                      <Input
                        type="number"
                        value={editTableDeposit}
                        onChange={(e) => setEditTableDeposit(e.target.value)}
                        disabled={!isEditingTable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Base Price
                      </Label>
                      <Input
                        type="number"
                        value={editTableBasePrice}
                        onChange={(e) => setEditTableBasePrice(e.target.value)}
                        disabled={!isEditingTable}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Min Spend
                      </Label>
                      <Input
                        type="number"
                        value={editTableMinSpend}
                        onChange={(e) => setEditTableMinSpend(e.target.value)}
                        disabled={!isEditingTable}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Calendar */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Pricing Calendar - {selectedTableData.label}
                    </CardTitle>
                    <CardDescription>
                      Click on a date to set or modify the price
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewDays(30)}>
                      30 Days
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setViewDays(90)}>
                      90 Days
                    </Button>
                    <Button size="sm" onClick={() => setIsRecurringOpen(true)} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Recurring
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[350px]">
                    <div className="grid grid-cols-7 gap-2">
                      {/* Day headers */}
                      {dayNames.map(day => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                      
                      {/* Calendar dates */}
                      {calendarDates.map((date) => {
                        const price = getDatePrice(date);
                        const hasCustomPrice = pricingHistory.some(p => isSameDay(new Date(p.date), date));
                        const hasSpecialPrice = specialDates.some(sd => isSameDay(new Date(sd.date), date));
                        const isRecurring = recurringPatterns.some(p => p.dayOfWeek === date.getDay());
                        const isToday = isSameDay(date, new Date());
                        
                        return (
                          <motion.button
                            key={date.toISOString()}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => {
                              setSelectedDate(date);
                              setNewPrice(price.toString());
                              setIsPricingDialogOpen(true);
                            }}
                            className={cn(
                              "p-2 rounded-lg border text-center transition-all",
                              isToday && "ring-2 ring-primary",
                              hasCustomPrice && "bg-teal/20 border-teal",
                              hasSpecialPrice && "bg-gold/20 border-gold",
                              isRecurring && !hasCustomPrice && !hasSpecialPrice && "bg-purple/20 border-purple",
                              !hasCustomPrice && !hasSpecialPrice && !isRecurring && "border-border hover:border-primary/50"
                            )}
                          >
                            <p className="text-xs text-muted-foreground">{format(date, "MMM d")}</p>
                            <p className="font-bold text-sm">${price}</p>
                            {hasSpecialPrice && (
                              <Badge variant="outline" className="text-[10px] mt-1 bg-gold/20">Special</Badge>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  {/* Legend */}
                  <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-teal/50"></span> Manual Price
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-gold/50"></span> Special Date
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-purple/50"></span> Recurring
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Recurring Patterns */}
              {recurringPatterns.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Recurring Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {recurringPatterns.map(pattern => (
                        <div key={pattern.dayOfWeek} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                          <div>
                            <p className="font-medium">{dayNames[pattern.dayOfWeek]}</p>
                            <p className="text-lg font-bold">${pattern.price}</p>
                            {pattern.capacity && (
                              <p className="text-xs text-muted-foreground">Capacity: {pattern.capacity}</p>
                            )}
                            {pattern.depositPercent && (
                              <p className="text-xs text-muted-foreground">Deposit: {pattern.depositPercent}%</p>
                            )}
                          </div>
                          <button 
                            onClick={() => removeRecurringPattern(pattern.dayOfWeek)}
                            className="p-1 hover:bg-coral/20 rounded"
                          >
                            <X className="w-4 h-4 text-coral" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pricing History */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Pricing History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pricingHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No custom pricing set yet. Click on calendar dates to set prices.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pricingHistory.slice(-10).reverse().map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div>
                            <p className="font-medium">{format(new Date(entry.date), "MMMM d, yyyy")}</p>
                            {entry.notes && <p className="text-sm text-muted-foreground">{entry.notes}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">${entry.price}</p>
                            <Badge variant="outline" className="text-xs capitalize">{entry.pricing_type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Special Date Pricing Tab */}
        <TabsContent value="special" className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Special Date Pricing</CardTitle>
                <CardDescription>Set custom prices for specific dates like holidays or events</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => { resetSpecialDateForm(); setIsSpecialDateOpen(true); }}>
                <Plus className="w-4 h-4" />
                Add Date
              </Button>
            </CardHeader>
            <CardContent>
              {specialDates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No special date pricing rules yet. Add one to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {specialDates.map((sd) => (
                    <div key={sd.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{sd.date}</p>
                            <p className="text-xs text-muted-foreground">
                              Default: {sd.multiplier}x • {sd.tables.length} tables
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleEditSpecialDate(sd)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-coral" onClick={() => handleDeleteSpecialDate(sd.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {sd.individualPrices && Object.keys(sd.individualPrices).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(sd.individualPrices).map(([tableId, price]) => {
                            const table = tables.find(t => t.id === tableId);
                            return (
                              <Badge key={tableId} variant="outline" className="text-xs">
                                {table?.label || tableId}: ${price}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Set Price Dialog */}
      <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price for {selectedDate && format(selectedDate, "MMMM d, yyyy")}</DialogTitle>
            <DialogDescription>
              Set a custom price for {selectedTableData?.label} on this date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="pl-9"
                  placeholder="Enter price"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={pricingNotes}
                onChange={(e) => setPricingNotes(e.target.value)}
                placeholder="e.g., New Year's Eve, Special Event"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSetPrice}>
              <Save className="w-4 h-4 mr-2" />
              Save Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring Pattern Dialog */}
      <Dialog open={isRecurringOpen} onOpenChange={setIsRecurringOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Recurring Pattern</DialogTitle>
            <DialogDescription>
              Set recurring pricing, capacity, and deposit for a specific day of the week
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <Button
                    key={day}
                    variant={selectedDayOfWeek === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDayOfWeek(index)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={recurringPrice}
                  onChange={(e) => setRecurringPrice(e.target.value)}
                  className="pl-9"
                  placeholder="Enter recurring price"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Max Capacity (optional)
                </Label>
                <Input
                  type="number"
                  value={recurringCapacity}
                  onChange={(e) => setRecurringCapacity(e.target.value)}
                  placeholder="e.g., 10"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-muted-foreground" />
                  Deposit % (optional)
                </Label>
                <Input
                  type="number"
                  value={recurringDeposit}
                  onChange={(e) => setRecurringDeposit(e.target.value)}
                  placeholder="e.g., 20"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecurringOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRecurringPattern}>
              <Plus className="w-4 h-4 mr-2" />
              Add Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Special Date Pricing Dialog */}
      <Dialog open={isSpecialDateOpen} onOpenChange={(open) => { setIsSpecialDateOpen(open); if (!open) resetSpecialDateForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSpecialDate ? "Edit" : "Add"} Special Date Pricing</DialogTitle>
            <DialogDescription>Set custom pricing for a specific date with individual table prices</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={newSpecialDate}
                  onChange={(e) => setNewSpecialDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Multiplier</Label>
                <Input 
                  type="number" 
                  step="0.1" 
                  value={newSpecialMultiplier}
                  onChange={(e) => setNewSpecialMultiplier(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Applied to tables without individual pricing</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Select Tables & Set Individual Prices</Label>
              <p className="text-xs text-muted-foreground">Click to select tables, then set individual prices for each</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                {tables.map((table) => {
                  const isSelected = selectedTablesForDate.includes(table.id);
                  return (
                    <div 
                      key={table.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleTableForSpecialDate(table.id)}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="font-medium text-sm">{table.label}</span>
                        <span className="text-xs text-muted-foreground ml-auto">Base: ${table.basePrice}</span>
                      </div>
                      {isSelected && (
                        <div className="mt-2">
                          <Input 
                            type="number"
                            placeholder="Custom price"
                            className="h-8 text-sm"
                            value={individualTablePrices[table.id] || ""}
                            onChange={(e) => setIndividualTablePrices(prev => ({
                              ...prev,
                              [table.id]: e.target.value
                            }))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {individualTablePrices[table.id] 
                              ? `$${individualTablePrices[table.id]}` 
                              : `${newSpecialMultiplier}x = $${Math.round(table.basePrice * parseFloat(newSpecialMultiplier || "1"))}`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsSpecialDateOpen(false); resetSpecialDateForm(); }}>Cancel</Button>
            <Button onClick={editingSpecialDate ? handleUpdateSpecialDate : handleAddSpecialDate}>
              {editingSpecialDate ? "Update" : "Add"} Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablePricingTab;

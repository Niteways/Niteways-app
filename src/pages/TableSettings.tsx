import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Save,
  Edit,
  DollarSign,
  Users,
  Palette,
  Calendar,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTableSync, SyncedTable, SyncedRoom } from "@/hooks/useTableSync";
import { useRealtimeSpecialDatePricing, SpecialDatePricing as RealtimeSpecialDatePricing } from "@/hooks/useRealtimeSpecialDatePricing";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import TablePricingTab from "@/components/settings/TablePricingTab";

interface TableConfig {
  id: string;
  label: string;
  type: "table" | "booth" | "vip_area";
  capacity: number;
  basePrice: number;
  minSpend: number;
  color: string;
  zone: string;
  depositPercent: number;
  status: "active" | "inactive" | "blocked";
  requiresApproval: boolean;
}

interface SpecialDatePricing {
  id: string;
  date: string;
  multiplier: number;
  tables: string[];
  individualPrices?: Record<string, number>;
}

const TABLE_COLORS = [
  { name: "Teal", value: "teal" },
  { name: "Gold", value: "gold" },
  { name: "Coral", value: "coral" },
  { name: "Purple", value: "purple" },
  { name: "Blue", value: "blue" },
  { name: "Green", value: "green" },
];

const TableSettings = () => {
  const { impersonatedVenueId, isImpersonating } = useImpersonation();
  
  // Use impersonated venue when in impersonation mode
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : undefined;
  
  const { tables: syncedTables, rooms: syncedRooms, isLoaded, setTables: setSyncedTables, addTable, updateTable, deleteTable, addRoom, deleteRoom } = useTableSync({ venueId: activeVenueId });
  
  // Realtime special date pricing
  const { 
    specialDates: realtimeSpecialDates, 
    isLoading: isLoadingPricing,
    addSpecialDate: addSpecialDateToDb,
    updateSpecialDate: updateSpecialDateInDb,
    deleteSpecialDate: deleteSpecialDateFromDb,
  } = useRealtimeSpecialDatePricing({});

  // Transform realtime data to local format
  const specialDates: SpecialDatePricing[] = realtimeSpecialDates.map(sd => ({
    id: sd.id,
    date: sd.date,
    multiplier: sd.multiplier,
    tables: sd.tables,
    individualPrices: sd.individual_prices,
  }));

  // Convert synced tables to local format
  const tables: TableConfig[] = syncedTables.map(t => ({
    id: t.id,
    label: t.label,
    type: t.type,
    capacity: t.capacity,
    basePrice: t.basePrice,
    minSpend: t.minSpend,
    color: t.color,
    zone: t.zone,
    depositPercent: t.depositPercent,
    status: t.status,
    requiresApproval: (t as any).requiresApproval || false,
  }));

  const [selectedTable, setSelectedTable] = useState<TableConfig | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTable, setNewTable] = useState<Partial<TableConfig>>({
    label: "",
    type: "table",
    capacity: 4,
    basePrice: 1000,
    minSpend: 500,
    color: "teal",
    zone: "main",
    depositPercent: 20,
    status: "active",
  });
  const [isSpecialDateOpen, setIsSpecialDateOpen] = useState(false);
  const [editingSpecialDate, setEditingSpecialDate] = useState<SpecialDatePricing | null>(null);
  const [newSpecialDate, setNewSpecialDate] = useState("");
  const [newSpecialMultiplier, setNewSpecialMultiplier] = useState("1.5");
  const [selectedTablesForDate, setSelectedTablesForDate] = useState<string[]>([]);
  const [individualTablePrices, setIndividualTablePrices] = useState<Record<string, string>>({});
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  
  // Global settings
  const [defaultDeposit, setDefaultDeposit] = useState("20");
  const [cancellationPolicy, setCancellationPolicy] = useState("Cancellations must be made 24 hours in advance for a full refund.");

  const handleEditTable = (table: TableConfig) => {
    setSelectedTable({ ...table });
    setIsEditOpen(true);
  };

  const handleSaveTable = () => {
    if (!selectedTable) return;
    updateTable(selectedTable.id, {
      label: selectedTable.label,
      type: selectedTable.type,
      capacity: selectedTable.capacity,
      basePrice: selectedTable.basePrice,
      minSpend: selectedTable.minSpend,
      color: selectedTable.color,
      zone: selectedTable.zone,
      depositPercent: selectedTable.depositPercent,
      status: selectedTable.status,
      requiresApproval: selectedTable.requiresApproval,
    });
    setIsEditOpen(false);
    toast.success("Table settings saved and synced across all views");
  };

  const handleToggleBookingMode = async (tableId: string, currentMode: boolean) => {
    try {
      await updateTable(tableId, { requiresApproval: !currentMode });
      toast.success(`Booking mode updated to ${!currentMode ? 'Request' : 'Direct'}`);
    } catch (error) {
      toast.error("Failed to update booking mode");
    }
  };

  const handleAddTable = () => {
    if (!newTable.label) {
      toast.error("Please enter a table label");
      return;
    }
    const roomId = selectedRoom === "all" ? syncedRooms[0]?.id : selectedRoom;
    addTable({
      label: newTable.label || "",
      type: newTable.type || "table",
      capacity: newTable.capacity || 4,
      basePrice: newTable.basePrice || 1000,
      minSpend: newTable.minSpend || 500,
      color: newTable.color || "teal",
      zone: newTable.zone || "main",
      depositPercent: newTable.depositPercent || 20,
      status: newTable.status || "active",
      roomId,
      requiresApproval: false,
    });
    setIsAddTableOpen(false);
    setNewTable({
      label: "",
      type: "table",
      capacity: 4,
      basePrice: 1000,
      minSpend: 500,
      color: "teal",
      zone: "main",
      depositPercent: 20,
      status: "active",
    });
    toast.success("Table added and synced across all views");
  };

  const handleDeleteTable = (tableId: string) => {
    deleteTable(tableId);
    toast.success("Table deleted and synced across all views");
  };

  const handleAddRoom = () => {
    if (!newRoomName) return;
    addRoom(newRoomName);
    setIsAddRoomOpen(false);
    setNewRoomName("");
    toast.success("Room added");
  };

  const handleDeleteRoom = (roomId: string) => {
    deleteRoom(roomId);
    toast.success("Room deleted");
  };

  const handleSaveGlobalSettings = () => {
    toast.success("Global settings saved");
  };

  // Filter tables by room
  const filteredTables = selectedRoom === "all" 
    ? tables 
    : tables.filter(t => syncedTables.find(st => st.id === t.id)?.roomId === selectedRoom);

  const handleAddSpecialDate = async () => {
    if (!newSpecialDate) return;
    
    const prices: Record<string, number> = {};
    Object.entries(individualTablePrices).forEach(([tableId, price]) => {
      if (price && selectedTablesForDate.includes(tableId)) {
        prices[tableId] = parseInt(price);
      }
    });

    try {
      await addSpecialDateToDb({
        date: newSpecialDate,
        multiplier: parseFloat(newSpecialMultiplier),
        tables: selectedTablesForDate.length > 0 ? selectedTablesForDate : tables.map(t => t.id),
        individual_prices: Object.keys(prices).length > 0 ? prices : {},
      });
      setIsSpecialDateOpen(false);
      resetSpecialDateForm();
      toast.success("Special date pricing added and synced");
    } catch (error) {
      console.error("Failed to add special date:", error);
      toast.error("Failed to add special date pricing");
    }
  };

  const resetSpecialDateForm = () => {
    setNewSpecialDate("");
    setNewSpecialMultiplier("1.5");
    setSelectedTablesForDate([]);
    setIndividualTablePrices({});
    setEditingSpecialDate(null);
  };

  const handleEditSpecialDate = (sd: SpecialDatePricing) => {
    setEditingSpecialDate(sd);
    setNewSpecialDate(sd.date);
    setNewSpecialMultiplier(sd.multiplier.toString());
    setSelectedTablesForDate(sd.tables);
    const prices: Record<string, string> = {};
    if (sd.individualPrices) {
      Object.entries(sd.individualPrices).forEach(([k, v]) => {
        prices[k] = v.toString();
      });
    }
    setIndividualTablePrices(prices);
    setIsSpecialDateOpen(true);
  };

  const handleUpdateSpecialDate = async () => {
    if (!editingSpecialDate) return;
    
    const prices: Record<string, number> = {};
    Object.entries(individualTablePrices).forEach(([tableId, price]) => {
      if (price && selectedTablesForDate.includes(tableId)) {
        prices[tableId] = parseInt(price);
      }
    });

    try {
      await updateSpecialDateInDb(editingSpecialDate.id, {
        date: newSpecialDate,
        multiplier: parseFloat(newSpecialMultiplier),
        tables: selectedTablesForDate,
        individual_prices: Object.keys(prices).length > 0 ? prices : {},
      });
      setIsSpecialDateOpen(false);
      resetSpecialDateForm();
      toast.success("Special date pricing updated and synced");
    } catch (error) {
      console.error("Failed to update special date:", error);
      toast.error("Failed to update special date pricing");
    }
  };

  const toggleTableForSpecialDate = (tableId: string) => {
    setSelectedTablesForDate(prev => 
      prev.includes(tableId) 
        ? prev.filter(t => t !== tableId)
        : [...prev, tableId]
    )
  };

  const handleDeleteSpecialDate = async (id: string) => {
    try {
      await deleteSpecialDateFromDb(id);
      toast.success("Special date removed and synced");
    } catch (error) {
      console.error("Failed to delete special date:", error);
      toast.error("Failed to remove special date");
    }
  };

  return (
    <AdminLayout title="Table Settings" subtitle="Configure table properties, pricing, and policies">
      <Tabs defaultValue="tables" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="tables">Table Configuration</TabsTrigger>
          <TabsTrigger value="table-pricing">Pricing & Rules</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        {/* Table Configuration Tab */}
        <TabsContent value="tables" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>Table</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Min Spend</TableHead>
                  <TableHead>Deposit %</TableHead>
                  <TableHead>Booking Mode</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table, index) => (
                  <motion.tr
                    key={table.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="border-border/50 hover:bg-muted/30"
                  >
                    <TableCell className="font-medium">{table.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{table.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {table.capacity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        {table.basePrice.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>${table.minSpend.toLocaleString()}</TableCell>
                    <TableCell>{table.depositPercent}%</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={table.requiresApproval}
                          onCheckedChange={() => handleToggleBookingMode(table.id, table.requiresApproval)}
                        />
                        <Badge variant="outline" className={table.requiresApproval ? "bg-gold/20 text-gold" : "bg-teal/20 text-teal"}>
                          {table.requiresApproval ? "Request" : "Direct"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2",
                        `bg-${table.color}/30 border-${table.color}`
                      )} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={table.status === "active" ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"}>
                        {table.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleEditTable(table)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        </TabsContent>

        {/* Table Pricing Tab */}
        <TabsContent value="table-pricing" className="space-y-6">
          <TablePricingTab />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-1">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Special Date Pricing</CardTitle>
                    <CardDescription>Set custom prices for specific dates</CardDescription>
                  </div>
                <Dialog open={isSpecialDateOpen} onOpenChange={(open) => {
                    setIsSpecialDateOpen(open);
                    if (!open) resetSpecialDateForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Date
                      </Button>
                    </DialogTrigger>
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
                        <Button variant="outline" onClick={() => {
                          setIsSpecialDateOpen(false);
                          resetSpecialDateForm();
                        }}>Cancel</Button>
                        <Button onClick={editingSpecialDate ? handleUpdateSpecialDate : handleAddSpecialDate}>
                          {editingSpecialDate ? "Update" : "Add"} Pricing
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies" className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Booking Policies</CardTitle>
                <CardDescription>Configure deposit and cancellation policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Deposit (%)</Label>
                    <Input 
                      type="number" 
                      value={defaultDeposit} 
                      onChange={(e) => setDefaultDeposit(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cancellation Policy</Label>
                  <Textarea 
                    rows={4}
                    value={cancellationPolicy}
                    onChange={(e) => setCancellationPolicy(e.target.value)}
                  />
                </div>

                <Button onClick={handleSaveGlobalSettings} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Policies
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Edit Table Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Table: {selectedTable?.label}</DialogTitle>
            <DialogDescription>Update table properties and pricing</DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Table Name</Label>
                  <Input 
                    value={selectedTable.label}
                    onChange={(e) => setSelectedTable({ ...selectedTable, label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input 
                    type="number"
                    value={selectedTable.capacity}
                    onChange={(e) => setSelectedTable({ ...selectedTable, capacity: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Price ($)</Label>
                  <Input 
                    type="number"
                    value={selectedTable.basePrice}
                    onChange={(e) => setSelectedTable({ ...selectedTable, basePrice: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Spend ($)</Label>
                  <Input 
                    type="number"
                    value={selectedTable.minSpend}
                    onChange={(e) => setSelectedTable({ ...selectedTable, minSpend: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deposit %</Label>
                  <Input 
                    type="number"
                    value={selectedTable.depositPercent}
                    onChange={(e) => setSelectedTable({ ...selectedTable, depositPercent: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={selectedTable.color} onValueChange={(v) => setSelectedTable({ ...selectedTable, color: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Booking Mode Toggle */}
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Booking Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedTable.requiresApproval 
                        ? "Guests must request approval before booking" 
                        : "Guests can book directly without approval"}
                    </p>
                  </div>
                  <Switch 
                    checked={selectedTable.requiresApproval}
                    onCheckedChange={(checked) => setSelectedTable({ ...selectedTable, requiresApproval: checked })}
                  />
                </div>
                <Badge variant="outline" className={selectedTable.requiresApproval ? "bg-gold/20 text-gold" : "bg-teal/20 text-teal"}>
                  {selectedTable.requiresApproval ? "Request Mode" : "Direct Booking"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch 
                  checked={selectedTable.status === "active"}
                  onCheckedChange={(checked) => setSelectedTable({ ...selectedTable, status: checked ? "active" : "inactive" })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTable}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default TableSettings;

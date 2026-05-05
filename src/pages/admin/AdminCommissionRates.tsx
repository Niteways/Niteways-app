import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Percent, Search, Edit2, Save, Building2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface VenueCommission {
  id: string;
  venueId: string;
  venueName: string;
  company: string;
  tableRate: number;
  ticketRate: number;
  guestlistRate: number;
  customRate: boolean;
  totalRevenue: number;
  totalCommission: number;
}

const mockVenueCommissions: VenueCommission[] = [
  { id: "1", venueId: "VNU-001", venueName: "NightFlow Club", company: "NightFlow Entertainment", tableRate: 5, ticketRate: 8, guestlistRate: 3, customRate: false, totalRevenue: 125000, totalCommission: 8750 },
  { id: "2", venueId: "VNU-002", venueName: "Metro Club Central", company: "Metro Nightlife Group", tableRate: 4, ticketRate: 7, guestlistRate: 2, customRate: true, totalRevenue: 89000, totalCommission: 5340 },
  { id: "3", venueId: "VNU-003", venueName: "Beach Paradise", company: "Island Vibes Ltd", tableRate: 5, ticketRate: 8, guestlistRate: 3, customRate: false, totalRevenue: 245000, totalCommission: 17150 },
  { id: "4", venueId: "VNU-004", venueName: "Sunset Rooftop", company: "Sunset Venues", tableRate: 6, ticketRate: 10, guestlistRate: 4, customRate: true, totalRevenue: 67000, totalCommission: 5360 },
  { id: "5", venueId: "VNU-005", venueName: "Urban Beats Main", company: "Urban Beats", tableRate: 5, ticketRate: 8, guestlistRate: 3, customRate: false, totalRevenue: 156000, totalCommission: 10920 },
  { id: "6", venueId: "VNU-006", venueName: "Club Elysium", company: "Elysium Group", tableRate: 3, ticketRate: 6, guestlistRate: 2, customRate: true, totalRevenue: 312000, totalCommission: 15600 },
];

const AdminCommissionRates = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [commissions, setCommissions] = useState<VenueCommission[]>(mockVenueCommissions);
  const [editingVenue, setEditingVenue] = useState<VenueCommission | null>(null);
  
  // Default platform rates
  const [defaultRates, setDefaultRates] = useState({
    tables: 5,
    tickets: 8,
    guestlists: 3,
  });

  const filteredCommissions = commissions.filter(c => 
    searchQuery === "" ||
    c.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.venueId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPlatformRevenue = commissions.reduce((sum, c) => sum + c.totalCommission, 0);

  const handleSaveDefaultRates = () => {
    // Update all venues that don't have custom rates
    setCommissions(commissions.map(c => 
      c.customRate ? c : { 
        ...c, 
        tableRate: defaultRates.tables, 
        ticketRate: defaultRates.tickets, 
        guestlistRate: defaultRates.guestlists 
      }
    ));
    toast.success("Default commission rates updated");
  };

  const handleUpdateVenueRates = () => {
    if (!editingVenue) return;
    setCommissions(commissions.map(c => 
      c.id === editingVenue.id ? { ...editingVenue, customRate: true } : c
    ));
    setEditingVenue(null);
    toast.success("Venue commission rates updated");
  };

  const handleResetToDefault = (venueId: string) => {
    setCommissions(commissions.map(c => 
      c.id === venueId ? { 
        ...c, 
        tableRate: defaultRates.tables, 
        ticketRate: defaultRates.tickets, 
        guestlistRate: defaultRates.guestlists,
        customRate: false 
      } : c
    ));
    toast.success("Reset to default rates");
  };

  return (
    <AdminLayout title="Commission Rates" subtitle="Manage platform commission rates for all venues">
      <div className="space-y-6">
        {/* Stats & Default Rates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> Total Platform Commission
                </CardDescription>
                <CardTitle className="text-3xl text-teal">${totalPlatformRevenue.toLocaleString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  From {commissions.length} active venues
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Default Platform Rates</CardTitle>
                <CardDescription>These rates apply to all venues without custom rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 items-end">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Table Bookings
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={defaultRates.tables}
                        onChange={(e) => setDefaultRates({ ...defaultRates, tables: Number(e.target.value) })}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Ticket Sales
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={defaultRates.tickets}
                        onChange={(e) => setDefaultRates({ ...defaultRates, tickets: Number(e.target.value) })}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Guest Lists
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-20"
                        value={defaultRates.guestlists}
                        onChange={(e) => setDefaultRates({ ...defaultRates, guestlists: Number(e.target.value) })}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Button onClick={handleSaveDefaultRates} className="gap-2">
                    <Save className="w-4 h-4" /> Save Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by venue, company, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Venue Commission Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue ID</TableHead>
                <TableHead>Venue / Company</TableHead>
                <TableHead className="text-center">Tables %</TableHead>
                <TableHead className="text-center">Tickets %</TableHead>
                <TableHead className="text-center">Guestlist %</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No venues found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCommissions.map((venue) => (
                  <TableRow key={venue.id}>
                    <TableCell className="font-mono text-sm">{venue.venueId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{venue.venueName}</p>
                          <p className="text-xs text-muted-foreground">{venue.company}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={venue.customRate ? "border-gold text-gold" : ""}>
                        {venue.tableRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={venue.customRate ? "border-gold text-gold" : ""}>
                        {venue.ticketRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={venue.customRate ? "border-gold text-gold" : ""}>
                        {venue.guestlistRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">${venue.totalRevenue.toLocaleString()}</TableCell>
                    <TableCell className="text-teal font-medium">${venue.totalCommission.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setEditingVenue(venue)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        {venue.customRate && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleResetToDefault(venue.id)}
                          >
                            Reset
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

        {/* Edit Dialog */}
        <Dialog open={!!editingVenue} onOpenChange={(open) => !open && setEditingVenue(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Commission Rates</DialogTitle>
            </DialogHeader>
            {editingVenue && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{editingVenue.venueName}</p>
                    <p className="text-sm text-muted-foreground">{editingVenue.company}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Table Bookings %</Label>
                    <Input 
                      type="number" 
                      value={editingVenue.tableRate}
                      onChange={(e) => setEditingVenue({ ...editingVenue, tableRate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ticket Sales %</Label>
                    <Input 
                      type="number" 
                      value={editingVenue.ticketRate}
                      onChange={(e) => setEditingVenue({ ...editingVenue, ticketRate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Guest Lists %</Label>
                    <Input 
                      type="number" 
                      value={editingVenue.guestlistRate}
                      onChange={(e) => setEditingVenue({ ...editingVenue, guestlistRate: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Custom rates will override the default platform rates for this venue.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingVenue(null)}>Cancel</Button>
              <Button onClick={handleUpdateVenueRates}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCommissionRates;

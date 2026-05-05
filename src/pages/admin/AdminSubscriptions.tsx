import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, CreditCard, TrendingUp, AlertCircle, Search, Edit, CheckCircle } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { toast } from "sonner";

interface Subscription {
  id: string;
  venueId: string;
  venueName: string;
  companyName: string;
  basePackage: "Starter" | "Standard" | "Pro";
  addOns: string[];
  monthlyTotal: number;
  status: "Active" | "Past Due" | "Cancelled" | "Trial";
  nextBilling: string;
}

const addOnPrices: Record<string, number> = {
  "Ticketing": 99,
  "Loyalty System": 79,
  "Advanced Analytics": 49,
  "Custom Branding": 149,
  "API Access": 199,
};

const packagePrices = { Starter: 99, Standard: 299, Pro: 599 };

const initialSubscriptions: Subscription[] = [
  { id: "SUB-001", venueId: "VNU-001", venueName: "NightFlow Club - Downtown", companyName: "NightFlow Entertainment", basePackage: "Pro", addOns: ["Ticketing", "Loyalty System", "Advanced Analytics"], monthlyTotal: 826, status: "Active", nextBilling: "2024-02-01" },
  { id: "SUB-002", venueId: "VNU-002", venueName: "NightFlow Lounge - Uptown", companyName: "NightFlow Entertainment", basePackage: "Standard", addOns: ["Ticketing"], monthlyTotal: 398, status: "Active", nextBilling: "2024-02-01" },
  { id: "SUB-003", venueId: "VNU-003", venueName: "Sunset Rooftop", companyName: "Sunset Venues", basePackage: "Pro", addOns: ["Loyalty System", "Custom Branding"], monthlyTotal: 827, status: "Active", nextBilling: "2024-02-15" },
  { id: "SUB-004", venueId: "VNU-004", venueName: "Metro Club Central", companyName: "Metro Nightlife Group", basePackage: "Pro", addOns: ["Ticketing", "Loyalty System", "Advanced Analytics", "API Access"], monthlyTotal: 1025, status: "Active", nextBilling: "2024-02-10" },
  { id: "SUB-005", venueId: "VNU-005", venueName: "Metro Lounge East", companyName: "Metro Nightlife Group", basePackage: "Standard", addOns: [], monthlyTotal: 299, status: "Past Due", nextBilling: "2024-01-05" },
  { id: "SUB-006", venueId: "VNU-006", venueName: "Beach Paradise", companyName: "Island Vibes Ltd", basePackage: "Pro", addOns: ["Ticketing", "Loyalty System", "Custom Branding"], monthlyTotal: 926, status: "Active", nextBilling: "2024-02-20" },
  { id: "SUB-007", venueId: "VNU-007", venueName: "Urban Beats Main", companyName: "Urban Beats", basePackage: "Starter", addOns: [], monthlyTotal: 99, status: "Trial", nextBilling: "2024-01-25" },
];

const AdminSubscriptions = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions);
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [editPackage, setEditPackage] = useState<"Starter" | "Standard" | "Pro">("Standard");
  const [editAddOns, setEditAddOns] = useState<string[]>([]);

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesPackage = filterPackage === "all" || sub.basePackage === filterPackage;
    const matchesStatus = filterStatus === "all" || sub.status === filterStatus;
    const matchesSearch = sub.venueName.toLowerCase().includes(search.toLowerCase()) ||
                          sub.companyName.toLowerCase().includes(search.toLowerCase());
    return matchesPackage && matchesStatus && matchesSearch;
  });

  const totalMRR = subscriptions.filter(s => s.status === "Active").reduce((sum, s) => sum + s.monthlyTotal, 0);
  const activeCount = subscriptions.filter(s => s.status === "Active").length;
  const pastDueCount = subscriptions.filter(s => s.status === "Past Due").length;

  const handleEditClick = (sub: Subscription) => {
    setSelectedSub(sub);
    setEditPackage(sub.basePackage);
    setEditAddOns([...sub.addOns]);
    setIsEditOpen(true);
  };

  const handleSaveSubscription = () => {
    if (!selectedSub) return;
    const newTotal = packagePrices[editPackage] + editAddOns.reduce((sum, a) => sum + (addOnPrices[a] || 0), 0);
    setSubscriptions(prev => prev.map(s => 
      s.id === selectedSub.id 
        ? { ...s, basePackage: editPackage, addOns: editAddOns, monthlyTotal: newTotal }
        : s
    ));
    setIsEditOpen(false);
    toast.success("Subscription updated successfully");
  };

  const toggleAddOn = (addon: string) => {
    setEditAddOns(prev => prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]);
  };

  const statusStyles = {
    Active: "bg-teal/20 text-teal",
    "Past Due": "bg-coral/20 text-coral",
    Cancelled: "bg-muted text-muted-foreground",
    Trial: "bg-gold/20 text-gold",
  };

  const packageStyles = {
    Starter: "border-muted-foreground/30",
    Standard: "border-teal/50 bg-teal/10 text-teal",
    Pro: "border-gold/50 bg-gold/10 text-gold",
  };

  return (
    <AdminLayout title="Subscriptions" subtitle="Manage venue packages and add-ons">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Monthly Revenue" value={`$${totalMRR.toLocaleString()}`} icon={CreditCard} trend={{ value: 12, label: "vs last month" }} variant="gold" />
          <StatCard title="Active Subscriptions" value={activeCount.toString()} icon={TrendingUp} trend={{ value: 8, label: "vs last month" }} variant="teal" />
          <StatCard title="Past Due" value={pastDueCount.toString()} icon={AlertCircle} variant="coral" />
          <StatCard title="Total Venues" value={subscriptions.length.toString()} icon={Building2} variant="gold" />
        </div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search venues..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterPackage} onValueChange={setFilterPackage}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Packages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Packages</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="Standard">Standard</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Past Due">Past Due</SelectItem>
              <SelectItem value="Trial">Trial</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Subscriptions Table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Venue</TableHead>
                <TableHead>Base Package</TableHead>
                <TableHead>Add-Ons</TableHead>
                <TableHead>Monthly Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map(sub => (
                <TableRow key={sub.id} className="border-border/50 cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/admin/venue/${sub.venueId}`)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{sub.venueName}</p>
                      <p className="text-xs text-muted-foreground">{sub.companyName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={packageStyles[sub.basePackage]}>
                      {sub.basePackage} - ${packagePrices[sub.basePackage]}/mo
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sub.addOns.length > 0 ? sub.addOns.map(a => (
                        <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                      )) : <span className="text-muted-foreground text-xs">None</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">${sub.monthlyTotal}/mo</TableCell>
                  <TableCell><Badge className={statusStyles[sub.status]}>{sub.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{sub.nextBilling}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditClick(sub); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      </div>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-6 py-4">
              <div className="text-sm text-muted-foreground">{selectedSub.venueName}</div>
              
              <div>
                <Label className="mb-3 block">Base Package</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Starter", "Standard", "Pro"] as const).map(pkg => (
                    <div
                      key={pkg}
                      onClick={() => setEditPackage(pkg)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${editPackage === pkg ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                    >
                      <span className="font-semibold">{pkg}</span>
                      <p className="text-lg font-bold">${packagePrices[pkg]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Add-Ons</Label>
                <div className="space-y-2">
                  {Object.entries(addOnPrices).map(([addon, price]) => (
                    <div key={addon} className={`p-3 rounded-lg border flex items-center justify-between ${editAddOns.includes(addon) ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex items-center gap-3">
                        <Checkbox checked={editAddOns.includes(addon)} onCheckedChange={() => toggleAddOn(addon)} />
                        <span>{addon}</span>
                      </div>
                      <span className="font-medium">+${price}/mo</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">New Monthly Total</span>
                  <span className="text-2xl font-bold">
                    ${packagePrices[editPackage] + editAddOns.reduce((sum, a) => sum + (addOnPrices[a] || 0), 0)}/mo
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubscription}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSubscriptions;

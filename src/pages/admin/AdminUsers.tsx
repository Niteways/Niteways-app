import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, UserX, AlertTriangle, Shield, Mail, Crown, Star, Download, History, MapPin, DollarSign, Flag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Guest {
  id: string;
  guestId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  status: "Active" | "Warned" | "Banned";
  joinedAt: string;
  totalBookings: number;
  totalSpend: number;
  loyaltyLevel: "Bronze" | "Silver" | "Gold" | "Platinum";
  favoriteCities: string[];
  flags: string[];
  lastBooking: string;
}

const mockGuests: Guest[] = [
  { 
    id: "mock-1", 
    guestId: "USR-001", 
    name: "Alex Johnson", 
    email: "alex@email.com", 
    phone: "+1 555-0101",
    instagram: "@alexj",
    status: "Active", 
    joinedAt: "2024-01-15", 
    totalBookings: 24,
    totalSpend: 4500,
    loyaltyLevel: "Gold",
    favoriteCities: ["Miami", "New York"],
    flags: ["High Spender"],
    lastBooking: "2024-01-20"
  },
  { 
    id: "mock-2", 
    guestId: "USR-002", 
    name: "Maria Garcia", 
    email: "maria@email.com", 
    phone: "+1 555-0102",
    linkedin: "mariag",
    status: "Active", 
    joinedAt: "2024-01-10", 
    totalBookings: 8,
    totalSpend: 1200,
    loyaltyLevel: "Silver",
    favoriteCities: ["Los Angeles"],
    flags: [],
    lastBooking: "2024-01-18"
  },
];

// Loyalty ring colors
const loyaltyRingColors = {
  Bronze: "ring-amber-700",
  Silver: "ring-zinc-400",
  Gold: "ring-gold",
  Platinum: "ring-purple",
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loyaltyFilter, setLoyaltyFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch guests from database
  useEffect(() => {
    const fetchGuests = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('guests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          const mappedGuests: Guest[] = data.map(g => ({
            id: g.id,
            guestId: g.guest_id,
            name: g.name,
            email: g.email || "",
            phone: g.phone || "",
            avatarUrl: g.avatar_url || "",
            instagram: g.instagram_handle || "",
            status: (g.status === "banned" ? "Banned" : g.status === "warned" ? "Warned" : "Active") as Guest["status"],
            joinedAt: new Date(g.created_at).toISOString().split('T')[0],
            totalBookings: g.total_visits || 0,
            totalSpend: g.total_spend || 0,
            loyaltyLevel: (g.loyalty_level?.charAt(0).toUpperCase() + g.loyalty_level?.slice(1) || "Bronze") as Guest["loyaltyLevel"],
            favoriteCities: [],
            flags: g.total_spend && g.total_spend > 5000 ? ["High Spender"] : [],
            lastBooking: new Date(g.updated_at).toISOString().split('T')[0]
          }));
          setGuests(mappedGuests);
        } else {
          setGuests(mockGuests);
        }
      } catch (error) {
        console.error('Error fetching guests:', error);
        setGuests(mockGuests);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuests();
  }, []);

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(search.toLowerCase()) || 
                          guest.email.toLowerCase().includes(search.toLowerCase()) ||
                          guest.phone.includes(search);
    const matchesStatus = statusFilter === "all" || guest.status === statusFilter;
    const matchesLoyalty = loyaltyFilter === "all" || guest.loyaltyLevel === loyaltyFilter;
    return matchesSearch && matchesStatus && matchesLoyalty;
  });

  const handleAction = (guestId: string, action: "warn" | "ban" | "unban" | "email" | "flag") => {
    if (action === "warn") {
      setGuests(prev => prev.map(u => u.id === guestId ? { ...u, status: "Warned" as const } : u));
      toast.success("User has been warned");
    } else if (action === "ban") {
      setGuests(prev => prev.map(u => u.id === guestId ? { ...u, status: "Banned" as const } : u));
      toast.success("User has been banned");
    } else if (action === "unban") {
      setGuests(prev => prev.map(u => u.id === guestId ? { ...u, status: "Active" as const } : u));
      toast.success("User has been unbanned");
    } else if (action === "email") {
      toast.success("Email dialog opened");
    } else if (action === "flag") {
      toast.success("User flagged for review");
    }
  };

  const handleViewProfile = (guest: Guest) => {
    // Navigate using guest_id for database-synced guests
    navigate(`/admin/guest/${guest.guestId}`);
  };

  const handleExportGDPR = (guestId: string) => {
    toast.success("GDPR data export started - download will begin shortly");
  };

  const statusStyles = {
    Active: "bg-teal/20 text-teal",
    Warned: "bg-gold/20 text-gold",
    Banned: "bg-coral/20 text-coral",
  };

  const loyaltyStyles = {
    Bronze: "bg-amber-900/20 text-amber-600",
    Silver: "bg-gray-400/20 text-gray-400",
    Gold: "bg-gold/20 text-gold",
    Platinum: "bg-purple/20 text-purple",
  };

  return (
    <AdminLayout title="User Management" subtitle="Manage app users, profiles, and moderation">
      <div className="space-y-6">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4"
        >
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Warned">Warned</SelectItem>
              <SelectItem value="Banned">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={loyaltyFilter} onValueChange={setLoyaltyFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Loyalty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Bronze">Bronze</SelectItem>
              <SelectItem value="Silver">Silver</SelectItem>
              <SelectItem value="Gold">Gold</SelectItem>
              <SelectItem value="Platinum">Platinum</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-5 gap-4"
        >
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{guests.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-teal">{guests.filter(u => u.status === "Active").length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">VIP Members</p>
            <p className="text-2xl font-bold text-gold">{guests.filter(u => u.flags.includes("VIP")).length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">High Spenders</p>
            <p className="text-2xl font-bold text-purple">{guests.filter(u => u.totalSpend > 5000).length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Banned</p>
            <p className="text-2xl font-bold text-coral">{guests.filter(u => u.status === "Banned").length}</p>
          </div>
        </motion.div>

        {/* Guests Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>User</TableHead>
                <TableHead>Loyalty</TableHead>
                <TableHead>Total Spend</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Cities</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.map((guest) => (
                <TableRow key={guest.id} className="border-border/50">
                  <TableCell>
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleViewProfile(guest)}
                    >
                      <Avatar className={cn("w-9 h-9 ring-2", loyaltyRingColors[guest.loyaltyLevel])}>
                        {guest.avatarUrl && <AvatarImage src={guest.avatarUrl} alt={guest.name} />}
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {guest.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium hover:underline">{guest.name}</p>
                        <p className="text-xs text-muted-foreground">{guest.email}</p>
                        <p className="text-xs text-muted-foreground font-mono">{guest.guestId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={loyaltyStyles[guest.loyaltyLevel]}>
                      <Crown className="w-3 h-3 mr-1" />
                      {guest.loyaltyLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">${guest.totalSpend.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>{guest.totalBookings}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{guest.favoriteCities.slice(0, 2).join(", ")}</span>
                      {guest.favoriteCities.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{guest.favoriteCities.length - 2}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {guest.flags.map(flag => (
                        <Badge key={flag} variant="outline" className="text-xs">
                          {flag === "VIP" && <Star className="w-2.5 h-2.5 mr-0.5" />}
                          {flag === "High Spender" && <DollarSign className="w-2.5 h-2.5 mr-0.5" />}
                          {flag === "Fake ID" && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusStyles[guest.status]}>{guest.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <History className="w-4 h-4" /> Booking History
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => handleAction(guest.id, "email")}>
                          <Mail className="w-4 h-4" /> Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2" onClick={() => handleExportGDPR(guest.id)}>
                          <Download className="w-4 h-4" /> Export GDPR Data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 text-gold" onClick={() => handleAction(guest.id, "flag")}>
                          <Flag className="w-4 h-4" /> Flag User
                        </DropdownMenuItem>
                        {guest.status !== "Warned" && guest.status !== "Banned" && (
                          <DropdownMenuItem className="gap-2 text-gold" onClick={() => handleAction(guest.id, "warn")}>
                            <AlertTriangle className="w-4 h-4" /> Warn User
                          </DropdownMenuItem>
                        )}
                        {guest.status !== "Banned" ? (
                          <DropdownMenuItem className="gap-2 text-coral" onClick={() => handleAction(guest.id, "ban")}>
                            <UserX className="w-4 h-4" /> Suspend Access
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="gap-2 text-teal" onClick={() => handleAction(guest.id, "unban")}>
                            <Shield className="w-4 h-4" /> Restore Access
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
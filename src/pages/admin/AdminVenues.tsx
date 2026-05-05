import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Building2, MapPin, Search, Loader2, Settings, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Venue {
  id: string;
  venue_id: string;
  name: string;
  category: string;
  address: string;
  status: string;
  base_package: string;
  addons: string[];
  city: { name: string } | null;
  deleted_at: string | null;
}

const AdminVenues = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [deletedVenues, setDeletedVenues] = useState<Venue[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("active");
  
  // Delete confirmation state
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Permanent delete state
  const [venueToPermanentlyDelete, setVenueToPermanentlyDelete] = useState<Venue | null>(null);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

  useEffect(() => {
    fetchVenues();
    fetchCities();

    const channel = supabase
      .channel('venues-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () => {
        fetchVenues();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchVenues = async () => {
    const { data, error } = await supabase
      .from('venues')
      .select('id, venue_id, name, category, address, status, base_package, addons, city_id, deleted_at, cities(name)')
      .order('name');

    if (error) {
      toast.error(error.message || "Failed to load venues");
      console.error("Failed to load venues:", error);
    } else {
      const allVenues = (data as any[] || []).map((v) => ({
        ...v,
        city: (v as any).cities || null,
      })) as Venue[];
      
      // Separate active and deleted venues
      setVenues(allVenues.filter(v => !v.deleted_at));
      setDeletedVenues(allVenues.filter(v => v.deleted_at));
    }
    setLoading(false);
  };

  const fetchCities = async () => {
    const { data } = await supabase.from('cities').select('name').order('name');
    if (data) {
      setCities(data.map(c => c.name));
    }
  };

  const handleDeleteVenue = async () => {
    if (!venueToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('venues')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', venueToDelete.id);

      if (error) throw error;
      
      toast.success(`${venueToDelete.name} has been deleted`);
      setVenueToDelete(null);
      fetchVenues();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete venue");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreVenue = async (venue: Venue) => {
    try {
      const { error } = await supabase
        .from('venues')
        .update({ deleted_at: null })
        .eq('id', venue.id);

      if (error) throw error;
      
      toast.success(`${venue.name} has been restored`);
      fetchVenues();
    } catch (error: any) {
      toast.error(error.message || "Failed to restore venue");
    }
  };

  const handlePermanentDelete = async () => {
    if (!venueToPermanentlyDelete) return;
    
    setIsPermanentlyDeleting(true);
    try {
      // Delete related venue_documents first
      await supabase
        .from('venue_documents')
        .delete()
        .eq('venue_id', venueToPermanentlyDelete.id);
      
      // Delete related venue_tables
      await supabase
        .from('venue_tables')
        .delete()
        .eq('venue_id', venueToPermanentlyDelete.id);
      
      // Delete the venue permanently
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueToPermanentlyDelete.id);

      if (error) throw error;
      
      toast.success(`${venueToPermanentlyDelete.name} has been permanently deleted`);
      setVenueToPermanentlyDelete(null);
      fetchVenues();
    } catch (error: any) {
      toast.error(error.message || "Failed to permanently delete venue");
    } finally {
      setIsPermanentlyDeleting(false);
    }
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(search.toLowerCase()) ||
                          venue.venue_id.toLowerCase().includes(search.toLowerCase());
    const matchesCity = cityFilter === "all" || venue.city?.name === cityFilter;
    const matchesStatus = statusFilter === "all" || venue.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || venue.category === categoryFilter;
    return matchesSearch && matchesCity && matchesStatus && matchesCategory;
  });

  const filteredDeletedVenues = deletedVenues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(search.toLowerCase()) ||
                          venue.venue_id.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const statusStyles: Record<string, string> = {
    active: "bg-teal/20 text-teal",
    inactive: "bg-muted text-muted-foreground",
    pending: "bg-gold/20 text-gold",
  };

  const categoryStyles: Record<string, string> = {
    Nightclub: "bg-purple/20 text-purple",
    "Beach Club": "bg-cyan-500/20 text-cyan-400",
    Bar: "bg-amber-500/20 text-amber-400",
    Lounge: "bg-pink-500/20 text-pink-400",
    Restaurant: "bg-emerald-500/20 text-emerald-400",
  };

  const packageStyles: Record<string, string> = {
    starter: "border-muted-foreground/30",
    growth: "border-teal/50 bg-teal/10 text-teal",
    enterprise: "border-gold/50 bg-gold/10 text-gold",
  };

  if (loading) {
    return (
      <AdminLayout title="All Venues" subtitle="Manage all venues on the platform">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="All Venues" subtitle="Manage all venues on the platform">
      <div className="space-y-6">
        {/* Tabs for Active/Deleted */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="active">Active Venues ({venues.length})</TabsTrigger>
              <TabsTrigger value="deleted">Deleted Venues ({deletedVenues.length})</TabsTrigger>
            </TabsList>
            <Button onClick={() => navigate("/admin/venues/onboard")} className="gap-2">
              <Plus className="w-4 h-4" /> Onboard Venue
            </Button>
          </div>

          <TabsContent value="active" className="space-y-6 mt-4">
            {/* Filters */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-3 flex-1 flex-wrap">
                <div className="relative flex-1 min-w-64 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="City" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Nightclub">Nightclub</SelectItem>
                    <SelectItem value="Beach Club">Beach Club</SelectItem>
                    <SelectItem value="Bar">Bar</SelectItem>
                    <SelectItem value="Lounge">Lounge</SelectItem>
                    <SelectItem value="Restaurant">Restaurant</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground">Total Venues</p>
                <p className="text-2xl font-bold">{venues.length}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-teal">{venues.filter(v => v.status === "active").length}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground">Cities</p>
                <p className="text-2xl font-bold text-primary">{new Set(venues.map(v => v.city?.name).filter(Boolean)).size}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-gold">{venues.filter(v => v.status === "pending").length}</p>
              </div>
            </motion.div>

            {/* Venues Table */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>ID</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Add-ons</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenues.map((venue) => (
                    <TableRow
                      key={venue.id}
                      className="border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => navigate(`/admin/venue/${venue.venue_id}`)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{venue.venue_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{venue.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-48">{venue.address}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {venue.city?.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={categoryStyles[venue.category] || "bg-muted text-muted-foreground"}>{venue.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={packageStyles[venue.base_package] || ""}>
                          {venue.base_package.charAt(0).toUpperCase() + venue.base_package.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{venue.addons?.length || 0} add-ons</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusStyles[venue.status] || ""}>{venue.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/venue/${venue.venue_id}/manage`);
                            }}
                          >
                            <Settings className="w-3 h-3" />
                            Manage
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVenueToDelete(venue);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="deleted" className="space-y-6 mt-4">
            {/* Search for deleted venues */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search deleted venues..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </motion.div>

            {/* Deleted Venues Table */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card overflow-hidden">
              {filteredDeletedVenues.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No deleted venues</p>
                  <p className="text-sm">Deleted venues will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>ID</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Deleted On</TableHead>
                      <TableHead className="w-48">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeletedVenues.map((venue) => (
                      <TableRow key={venue.id} className="border-border/50 opacity-75">
                        <TableCell className="font-mono text-xs text-muted-foreground">{venue.venue_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{venue.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-48">{venue.address}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {venue.city?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={categoryStyles[venue.category] || "bg-muted text-muted-foreground"}>{venue.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {venue.deleted_at ? format(new Date(venue.deleted_at), "MMM d, yyyy 'at' h:mm a") : "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleRestoreVenue(venue)}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setVenueToPermanentlyDelete(venue)}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete Forever
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!venueToDelete} onOpenChange={(open) => !open && setVenueToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Venue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{venueToDelete?.name}</span>? 
              This venue will be moved to the deleted venues list and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVenue}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Venue"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!venueToPermanentlyDelete} onOpenChange={(open) => !open && setVenueToPermanentlyDelete(null)}>
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Permanently Delete Venue
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-destructive font-semibold">This action cannot be undone!</span>
              <br /><br />
              Are you absolutely sure you want to permanently delete <span className="font-semibold text-foreground">{venueToPermanentlyDelete?.name}</span>? 
              This will remove the venue and all associated data (documents, tables, etc.) forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPermanentlyDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isPermanentlyDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPermanentlyDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting Forever...
                </>
              ) : (
                "Delete Forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminVenues;
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  Folder, 
  Edit, 
  Trash2,
  MapPin,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Venue {
  id: string;
  name: string;
  city_name: string;
  status: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  venues: Venue[];
}

const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const navigate = useNavigate();

  // Fetch data
  const fetchData = async () => {
    try {
      const [categoriesRes, venuesRes, citiesRes] = await Promise.all([
        supabase.from("venue_categories").select("*").order("name"),
        supabase.from("venues").select("*").is("deleted_at", null),
        supabase.from("cities").select("*")
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (venuesRes.error) throw venuesRes.error;
      if (citiesRes.error) throw citiesRes.error;

      setCities(citiesRes.data || []);
      setVenues(venuesRes.data || []);

      // Group venues by category
      const venuesByCategory = (venuesRes.data || []).reduce((acc: Record<string, Venue[]>, venue: any) => {
        const category = venue.category || "Uncategorized";
        if (!acc[category]) acc[category] = [];
        const city = (citiesRes.data || []).find((c: any) => c.id === venue.city_id);
        acc[category].push({
          id: venue.id,
          name: venue.name,
          city_name: city?.name || "Unknown",
          status: venue.status
        });
        return acc;
      }, {});

      // Merge with categories from DB
      const categoriesWithVenues: Category[] = (categoriesRes.data || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        venues: venuesByCategory[cat.name] || []
      }));

      // Add any categories from venues that don't exist in venue_categories table
      const existingCategoryNames = new Set(categoriesWithVenues.map(c => c.name));
      Object.keys(venuesByCategory).forEach(categoryName => {
        if (!existingCategoryNames.has(categoryName)) {
          categoriesWithVenues.push({
            id: `temp-${categoryName}`,
            name: categoryName,
            description: null,
            venues: venuesByCategory[categoryName]
          });
        }
      });

      setCategories(categoriesWithVenues);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const categoriesChannel = supabase
      .channel("admin-categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_categories" },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venues" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { error } = await supabase.from("venue_categories").insert({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || null
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Category already exists");
        } else {
          throw error;
        }
        return;
      }

      setIsAddDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
      toast.success("Category created successfully");
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { error } = await supabase
        .from("venue_categories")
        .update({
          name: editingCategory.name.trim(),
          description: editingCategory.description?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      setIsEditDialogOpen(false);
      setEditingCategory(null);
      toast.success("Category updated");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category && category.venues.length > 0) {
      toast.error("Cannot delete category with venues. Move venues first.");
      return;
    }

    try {
      const { error } = await supabase
        .from("venue_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
      toast.success("Category deleted");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const openEditDialog = (category: Category) => {
    if (category.id.startsWith("temp-")) {
      toast.error("Cannot edit auto-generated category. Create it first.");
      return;
    }
    setEditingCategory({ ...category });
    setIsEditDialogOpen(true);
  };

  const statusColors: Record<string, string> = {
    active: "bg-teal/20 text-teal",
    inactive: "bg-muted text-muted-foreground",
    pending: "bg-gold/20 text-gold",
  };

  const totalVenues = venues.length;

  if (loading) {
    return (
      <AdminLayout title="Venue Categories" subtitle="Manage venue categories and see venues under each">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Venue Categories" subtitle="Manage venue categories and see venues under each">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Folder className="w-4 h-4" /> Total Categories
              </CardDescription>
              <CardTitle className="text-2xl">{categories.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Building2 className="w-4 h-4" /> Total Venues
              </CardDescription>
              <CardTitle className="text-2xl text-teal">{totalVenues}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Most Popular</CardDescription>
              <CardTitle className="text-2xl text-gold">
                {[...categories].sort((a, b) => b.venues.length - a.venues.length)[0]?.name || "-"}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Categories List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-primary" />
                    Categories
                  </CardTitle>
                  <CardDescription>
                    Click on a category to see venues
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Category
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No categories found</p>
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const isExpanded = expandedCategories.includes(category.id);
                  return (
                    <Collapsible
                      key={category.id}
                      open={isExpanded}
                      onOpenChange={() => toggleCategory(category.id)}
                    >
                      <div className="border border-border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-primary/10">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-primary" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{category.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {category.description || "No description"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="bg-muted">
                                <Building2 className="w-3 h-3 mr-1" />
                                {category.venues.length} venues
                              </Badge>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(category);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategory(category.id, category.name);
                                  }}
                                  disabled={category.id.startsWith("temp-")}
                                >
                                  <Trash2 className="w-4 h-4 text-coral" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-border bg-muted/20 p-4">
                            {category.venues.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-border/50">
                                    <TableHead>Venue Name</TableHead>
                                    <TableHead>City</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {category.venues.map((venue) => (
                                    <TableRow key={venue.id} className="border-border/50">
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                          <Building2 className="w-4 h-4 text-muted-foreground" />
                                          {venue.name}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          <MapPin className="w-3 h-3" />
                                          {venue.city_name}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={statusColors[venue.status] || statusColors.inactive}>
                                          {venue.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => navigate(`/admin/venue/${venue.id}`)}
                                        >
                                          View Details
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="text-center py-6 text-muted-foreground">
                                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No venues in this category</p>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new venue category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Rooftop Bar"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Brief description of this category"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category details
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingCategory.description || ""}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, description: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCategories;

import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, CheckCircle, Edit2, Trash2, Star, Sparkles, Building2, ChevronRight, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  venueCount: number;
}

interface Venue {
  id: string;
  venue_id: string;
  name: string;
  category: string;
  status: string;
  base_package: string;
}

const initialTiers: PricingTier[] = [
  { 
    id: "tier-1",
    name: "Starter", 
    monthlyPrice: 0, 
    yearlyPrice: 0,
    features: ["Basic booking", "Up to 50 reservations/mo", "Email support", "1 staff account"],
    isPopular: false,
    isActive: true,
    venueCount: 12
  },
  { 
    id: "tier-2",
    name: "Standard", 
    monthlyPrice: 199, 
    yearlyPrice: 1990,
    features: ["Unlimited bookings", "Guest list management", "Basic analytics", "Email + Chat support", "5 staff accounts", "Custom branding"],
    isPopular: false,
    isActive: true,
    venueCount: 45
  },
  { 
    id: "tier-3",
    name: "Pro", 
    monthlyPrice: 499, 
    yearlyPrice: 4990,
    features: ["All Standard features", "Ticketing system", "Advanced analytics", "Loyalty system", "Priority support", "Unlimited staff", "API access", "White-label options"],
    isPopular: true,
    isActive: true,
    venueCount: 28
  },
  { 
    id: "tier-4",
    name: "Enterprise", 
    monthlyPrice: 999, 
    yearlyPrice: 9990,
    features: ["All Pro features", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Multi-venue dashboard", "Advanced security", "Custom reporting"],
    isPopular: false,
    isActive: true,
    venueCount: 8
  },
];

const AdminPricingTiers = () => {
  const [tiers, setTiers] = useState<PricingTier[]>(initialTiers);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [tierVenues, setTierVenues] = useState<Venue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [draggedVenue, setDraggedVenue] = useState<Venue | null>(null);
  const [dragOverTier, setDragOverTier] = useState<string | null>(null);
  const [newTier, setNewTier] = useState({
    name: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: "",
    isPopular: false,
  });

  // Fetch venues when a tier is selected
  useEffect(() => {
    const fetchVenuesForTier = async () => {
      if (!selectedTier) {
        setTierVenues([]);
        return;
      }
      
      setLoadingVenues(true);
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('*')
          .eq('base_package', selectedTier.name.toLowerCase());
        
        if (error) throw error;
        setTierVenues(data || []);
      } catch (error) {
        console.error('Error fetching venues:', error);
        // Mock data fallback
        setTierVenues([
          { id: '1', venue_id: 'VNU-001', name: 'Club Nova', category: 'Nightclub', status: 'active', base_package: selectedTier.name.toLowerCase() },
          { id: '2', venue_id: 'VNU-002', name: 'Sky Lounge', category: 'Rooftop Bar', status: 'active', base_package: selectedTier.name.toLowerCase() },
          { id: '3', venue_id: 'VNU-003', name: 'Underground', category: 'Nightclub', status: 'active', base_package: selectedTier.name.toLowerCase() },
        ]);
      } finally {
        setLoadingVenues(false);
      }
    };

    fetchVenuesForTier();
  }, [selectedTier]);

  const handleAddTier = () => {
    const tier: PricingTier = {
      id: `tier-${Date.now()}`,
      name: newTier.name,
      monthlyPrice: newTier.monthlyPrice,
      yearlyPrice: newTier.yearlyPrice,
      features: newTier.features.split("\n").filter(f => f.trim()),
      isPopular: newTier.isPopular,
      isActive: true,
      venueCount: 0,
    };
    setTiers([...tiers, tier]);
    setIsAddDialogOpen(false);
    setNewTier({ name: "", monthlyPrice: 0, yearlyPrice: 0, features: "", isPopular: false });
    toast.success("Pricing tier created");
  };

  const handleUpdateTier = () => {
    if (!editingTier) return;
    setTiers(tiers.map(t => t.id === editingTier.id ? editingTier : t));
    setEditingTier(null);
    toast.success("Pricing tier updated");
  };

  const handleDeleteTier = (tierId: string) => {
    const tier = tiers.find(t => t.id === tierId);
    if (tier && tier.venueCount > 0) {
      toast.error("Cannot delete tier with active venues");
      return;
    }
    setTiers(tiers.filter(t => t.id !== tierId));
    toast.success("Pricing tier deleted");
  };

  const handleToggleActive = (tierId: string) => {
    setTiers(tiers.map(t => t.id === tierId ? { ...t, isActive: !t.isActive } : t));
    toast.success("Tier status updated");
  };

  const handleSetPopular = (tierId: string) => {
    setTiers(tiers.map(t => ({ ...t, isPopular: t.id === tierId })));
    toast.success("Popular tier updated");
  };

  const handleTierClick = (tier: PricingTier) => {
    setSelectedTier(selectedTier?.id === tier.id ? null : tier);
  };

  // Drag and Drop handlers
  const handleVenueDragStart = (e: React.DragEvent, venue: Venue) => {
    setDraggedVenue(venue);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleVenueDragEnd = () => {
    setDraggedVenue(null);
    setDragOverTier(null);
  };

  const handleTierDragOver = (e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTier(tierId);
  };

  const handleTierDragLeave = () => {
    setDragOverTier(null);
  };

  const handleTierDrop = async (e: React.DragEvent, targetTier: PricingTier) => {
    e.preventDefault();
    setDragOverTier(null);
    
    if (!draggedVenue || draggedVenue.base_package === targetTier.name.toLowerCase()) {
      setDraggedVenue(null);
      return;
    }

    try {
      // Update in database
      const { error } = await supabase
        .from('venues')
        .update({ base_package: targetTier.name.toLowerCase() })
        .eq('id', draggedVenue.id);

      if (error) throw error;

      // Update local state
      const sourceTier = tiers.find(t => t.name.toLowerCase() === draggedVenue.base_package);
      setTiers(prev => prev.map(t => {
        if (t.id === targetTier.id) {
          return { ...t, venueCount: t.venueCount + 1 };
        }
        if (sourceTier && t.id === sourceTier.id) {
          return { ...t, venueCount: Math.max(0, t.venueCount - 1) };
        }
        return t;
      }));

      // Update venue list if viewing affected tier
      if (selectedTier?.id === targetTier.id) {
        setTierVenues(prev => [...prev, { ...draggedVenue, base_package: targetTier.name.toLowerCase() }]);
      } else if (selectedTier && sourceTier?.id === selectedTier.id) {
        setTierVenues(prev => prev.filter(v => v.id !== draggedVenue.id));
      }

      toast.success(`Moved ${draggedVenue.name} to ${targetTier.name}`);
    } catch (error) {
      console.error('Error moving venue:', error);
      toast.error("Failed to move venue");
    }

    setDraggedVenue(null);
  };

  return (
    <AdminLayout title="Pricing Tiers" subtitle="Configure subscription plans and pricing">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <p className="text-muted-foreground">
              {tiers.filter(t => t.isActive).length} active tiers • {tiers.reduce((sum, t) => sum + t.venueCount, 0)} total venues
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Drag venues between tiers to reassign them
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Tier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Pricing Tier</DialogTitle>
                <DialogDescription>Add a new subscription tier for venues.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tier Name</Label>
                  <Input 
                    placeholder="e.g., Premium" 
                    value={newTier.name}
                    onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Price ($)</Label>
                    <Input 
                      type="number" 
                      value={newTier.monthlyPrice}
                      onChange={(e) => setNewTier({ ...newTier, monthlyPrice: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Yearly Price ($)</Label>
                    <Input 
                      type="number" 
                      value={newTier.yearlyPrice}
                      onChange={(e) => setNewTier({ ...newTier, yearlyPrice: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Features (one per line)</Label>
                  <Textarea 
                    placeholder="Unlimited bookings&#10;Guest list management&#10;Priority support"
                    value={newTier.features}
                    onChange={(e) => setNewTier({ ...newTier, features: e.target.value })}
                    rows={5}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={newTier.isPopular}
                    onCheckedChange={(checked) => setNewTier({ ...newTier, isPopular: checked })}
                  />
                  <Label>Mark as Popular</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddTier}>Create Tier</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Pricing Tiers Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {tiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`glass-card relative cursor-pointer transition-all ${tier.isPopular ? "ring-2 ring-primary" : ""} ${!tier.isActive ? "opacity-60" : ""} ${selectedTier?.id === tier.id ? "ring-2 ring-teal" : ""} ${dragOverTier === tier.id ? "ring-2 ring-gold bg-gold/5" : ""}`}
              onClick={() => handleTierClick(tier)}
              onDragOver={(e) => handleTierDragOver(e, tier.id)}
              onDragLeave={handleTierDragLeave}
              onDrop={(e) => handleTierDrop(e, tier)}
            >
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary gap-1">
                    <Star className="w-3 h-3" /> Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {!tier.isActive && <Badge variant="outline">Inactive</Badge>}
                </div>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">${tier.monthlyPrice}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
                {tier.yearlyPrice > 0 && (
                  <p className="text-sm text-muted-foreground">
                    ${tier.yearlyPrice}/year (save ${tier.monthlyPrice * 12 - tier.yearlyPrice})
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-teal flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 inline" />
                    {tier.venueCount} venues on this plan
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </p>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setEditingTier(tier)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleActive(tier.id)}
                    >
                      {tier.isActive ? "Disable" : "Enable"}
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    {!tier.isPopular && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleSetPopular(tier.id)}
                      >
                        Set Popular
                      </Button>
                    )}
                    {tier.venueCount === 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-coral hover:text-coral"
                        onClick={() => handleDeleteTier(tier.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Venues on Selected Tier */}
        {selectedTier && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Venues on {selectedTier.name} Plan
                </CardTitle>
                <CardDescription>
                  {tierVenues.length} venue{tierVenues.length !== 1 ? 's' : ''} currently on this pricing tier • Drag venues to other tiers to reassign
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingVenues ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : tierVenues.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No venues on this pricing tier</p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {tierVenues.map((venue) => (
                        <div 
                          key={venue.id}
                          draggable
                          onDragStart={(e) => handleVenueDragStart(e, venue)}
                          onDragEnd={handleVenueDragEnd}
                          className={`flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing ${draggedVenue?.id === venue.id ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{venue.name}</p>
                              <p className="text-sm text-muted-foreground">{venue.venue_id} • {venue.category}</p>
                            </div>
                          </div>
                          <Badge variant={venue.status === 'active' ? 'default' : 'outline'}>
                            {venue.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Edit Tier Dialog */}
        <Dialog open={!!editingTier} onOpenChange={(open) => !open && setEditingTier(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pricing Tier</DialogTitle>
            </DialogHeader>
            {editingTier && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tier Name</Label>
                  <Input 
                    value={editingTier.name}
                    onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Price ($)</Label>
                    <Input 
                      type="number" 
                      value={editingTier.monthlyPrice}
                      onChange={(e) => setEditingTier({ ...editingTier, monthlyPrice: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Yearly Price ($)</Label>
                    <Input 
                      type="number" 
                      value={editingTier.yearlyPrice}
                      onChange={(e) => setEditingTier({ ...editingTier, yearlyPrice: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Features (one per line)</Label>
                  <Textarea 
                    value={editingTier.features.join("\n")}
                    onChange={(e) => setEditingTier({ ...editingTier, features: e.target.value.split("\n").filter(f => f.trim()) })}
                    rows={5}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTier(null)}>Cancel</Button>
              <Button onClick={handleUpdateTier}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPricingTiers;
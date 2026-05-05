import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, MapPin, Building2, Edit, Trash2, Globe, DollarSign, Clock, Loader2, Image, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useActivityLog";
import { CityImageEditor } from "@/components/admin/CityImageEditor";
import { CitySectionsManager } from "@/components/admin/CitySectionsManager";

interface City {
  id: string;
  name: string;
  country: string;
  timezone: string;
  currency: string;
  tax_rate: number;
  venue_count: number;
  status: string;
  image_url?: string | null;
  image_position_x?: number;
  image_position_y?: number;
  image_zoom?: number;
}

interface Venue {
  id: string;
  name: string;
}

const currencies = ["USD", "EUR", "GBP", "AED", "CHF", "SEK", "NOK", "DKK"];

// Country to timezone mapping for auto-selection
const countryTimezones: Record<string, string> = {
  "Sweden": "Europe/Stockholm",
  "Norway": "Europe/Oslo",
  "Denmark": "Europe/Copenhagen",
  "Finland": "Europe/Helsinki",
  "United Kingdom": "Europe/London",
  "UK": "Europe/London",
  "Spain": "Europe/Madrid",
  "France": "Europe/Paris",
  "Germany": "Europe/Berlin",
  "Italy": "Europe/Rome",
  "Netherlands": "Europe/Amsterdam",
  "Belgium": "Europe/Brussels",
  "Portugal": "Europe/Lisbon",
  "Greece": "Europe/Athens",
  "USA": "America/New_York",
  "United States": "America/New_York",
  "UAE": "Asia/Dubai",
  "Australia": "Australia/Sydney",
  "Japan": "Asia/Tokyo",
  "Singapore": "Asia/Singapore",
  "Thailand": "Asia/Bangkok",
};

const timezones = [
  "America/New_York", "America/Los_Angeles", "America/Chicago", "America/Denver",
  "Europe/London", "Europe/Stockholm", "Europe/Oslo", "Europe/Copenhagen",
  "Europe/Madrid", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Asia/Bangkok",
  "Australia/Sydney", "Australia/Melbourne"
];

const AdminCities = () => {
  const navigate = useNavigate();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cityVenues, setCityVenues] = useState<Venue[]>([]);
  const [activeTab, setActiveTab] = useState("settings");
  const [newCity, setNewCity] = useState({
    name: "",
    country: "",
    timezone: "Europe/London",
    currency: "EUR",
    tax_rate: 20,
  });

  // Fetch cities from database
  useEffect(() => {
    fetchCities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('cities-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cities' }, () => {
        fetchCities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .order('name');

    if (error) {
      toast.error("Failed to load cities");
      console.error(error);
    } else {
      setCities(data || []);
    }
    setLoading(false);
  };

  const fetchCityVenues = async (cityId: string) => {
    const { data, error } = await supabase
      .from('venues')
      .select('id, name')
      .eq('city_id', cityId)
      .eq('status', 'active');

    if (error) {
      console.error(error);
    } else {
      setCityVenues(data || []);
    }
  };

  // Auto-set timezone when country changes
  const handleCountryChange = (country: string) => {
    const timezone = countryTimezones[country] || newCity.timezone;
    setNewCity({ ...newCity, country, timezone });
  };

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(search.toLowerCase()) ||
    city.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCity = async () => {
    if (!newCity.name || !newCity.country) {
      toast.error("Please fill in required fields");
      return;
    }

    const { data, error } = await supabase.from('cities').insert({
      name: newCity.name,
      country: newCity.country,
      timezone: newCity.timezone,
      currency: newCity.currency,
      tax_rate: newCity.tax_rate,
      status: 'active',
      venue_count: 0,
    }).select().single();

    if (error) {
      toast.error("Failed to add city");
      console.error(error);
    } else {
      await logActivity({
        action: "Created city",
        entityType: "city",
        entityId: data.id,
        details: `Added city: ${newCity.name}, ${newCity.country}`,
        portal: "admin",
      });
      setIsAddOpen(false);
      setNewCity({ name: "", country: "", timezone: "Europe/London", currency: "EUR", tax_rate: 20 });
      toast.success("City added successfully!");
    }
  };

  const handleEditCity = (city: City) => {
    navigate(`/admin/cities/${city.id}`);
  };

  const handleSaveEdit = async () => {
    if (!selectedCity) return;

    const { error } = await supabase
      .from('cities')
      .update({
        name: selectedCity.name,
        country: selectedCity.country,
        timezone: selectedCity.timezone,
        currency: selectedCity.currency,
        tax_rate: selectedCity.tax_rate,
      })
      .eq('id', selectedCity.id);

    if (error) {
      toast.error("Failed to update city");
      console.error(error);
    } else {
      await logActivity({
        action: "Updated city",
        entityType: "city",
        entityId: selectedCity.id,
        details: `Updated city: ${selectedCity.name}`,
        portal: "admin",
      });
      setIsEditOpen(false);
      toast.success("City updated successfully!");
    }
  };

  const handleDeleteCity = async (city: City) => {
    if (city.venue_count > 0) {
      toast.error("Cannot delete city with venues");
      return;
    }

    const { error } = await supabase.from('cities').delete().eq('id', city.id);

    if (error) {
      toast.error("Failed to delete city");
      console.error(error);
    } else {
      await logActivity({
        action: "Deleted city",
        entityType: "city",
        entityId: city.id,
        details: `Deleted city: ${city.name}`,
        portal: "admin",
      });
      toast.success("City deleted");
    }
  };

  const handleViewVenues = (cityName: string) => {
    navigate(`/admin/venues?city=${encodeURIComponent(cityName)}`);
  };

  if (loading) {
    return (
      <AdminLayout title="City Management" subtitle="Manage supported cities and regional settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="City Management" subtitle="Manage supported cities and regional settings">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><Globe className="w-4 h-4" /> Total Cities</CardDescription>
              <CardTitle className="text-3xl">{cities.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1"><Building2 className="w-4 h-4" /> Total Venues</CardDescription>
              <CardTitle className="text-3xl">{cities.reduce((sum, c) => sum + c.venue_count, 0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Countries</CardDescription>
              <CardTitle className="text-3xl">{new Set(cities.map(c => c.country)).size}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Currencies</CardDescription>
              <CardTitle className="text-3xl">{new Set(cities.map(c => c.currency)).size}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-between items-center">
          <Input placeholder="Search cities..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add City
          </Button>
        </motion.div>

        {/* Cities Table */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Tax Rate</TableHead>
                <TableHead>Venues</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCities.map((city) => (
                <TableRow key={city.id} className="border-border/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium">{city.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{city.country}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {city.timezone.split("/")[1]?.replace("_", " ") || city.timezone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      <DollarSign className="w-3 h-3" />
                      {city.currency}
                    </Badge>
                  </TableCell>
                  <TableCell>{city.tax_rate}%</TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto text-primary" onClick={() => handleViewVenues(city.name)}>
                      {city.venue_count} venues
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Badge className={city.status === "active" ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"}>
                      {city.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCity(city)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCity(city)} disabled={city.venue_count > 0}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      </div>

      {/* Add City Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New City</DialogTitle>
            <DialogDescription>Add a new city to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City Name *</Label>
                <Input value={newCity.name} onChange={(e) => setNewCity({ ...newCity, name: e.target.value })} placeholder="e.g., Barcelona" />
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input value={newCity.country} onChange={(e) => handleCountryChange(e.target.value)} placeholder="e.g., Spain" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Timezone (auto-selected based on country)</Label>
                <Select value={newCity.timezone} onValueChange={(v) => setNewCity({ ...newCity, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={newCity.currency} onValueChange={(v) => setNewCity({ ...newCity, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input type="number" value={newCity.tax_rate} onChange={(e) => setNewCity({ ...newCity, tax_rate: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCity}>Add City</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit City Dialog - Now with Tabs */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {selectedCity?.name}</DialogTitle>
            <DialogDescription>Manage city settings, image, and venue sections</DialogDescription>
          </DialogHeader>
          
          {selectedCity && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="settings" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <Image className="w-4 h-4" />
                  Image
                </TabsTrigger>
                <TabsTrigger value="sections" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Sections
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="settings" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City Name</Label>
                    <Input value={selectedCity.name} onChange={(e) => setSelectedCity({ ...selectedCity, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={selectedCity.country} onChange={(e) => setSelectedCity({ ...selectedCity, country: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={selectedCity.timezone} onValueChange={(v) => setSelectedCity({ ...selectedCity, timezone: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={selectedCity.currency} onValueChange={(v) => setSelectedCity({ ...selectedCity, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input type="number" value={selectedCity.tax_rate} onChange={(e) => setSelectedCity({ ...selectedCity, tax_rate: Number(e.target.value) })} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveEdit}>Save Changes</Button>
                </div>
              </TabsContent>
              
              <TabsContent value="image" className="py-4">
                <CityImageEditor
                  cityId={selectedCity.id}
                  currentImageUrl={selectedCity.image_url}
                  positionX={selectedCity.image_position_x ?? 50}
                  positionY={selectedCity.image_position_y ?? 50}
                  zoom={selectedCity.image_zoom ?? 100}
                  onSave={() => {
                    fetchCities();
                  }}
                  onCancel={() => setIsEditOpen(false)}
                />
              </TabsContent>
              
              <TabsContent value="sections" className="py-4">
                <CitySectionsManager
                  cityId={selectedCity.id}
                  cityName={selectedCity.name}
                  venues={cityVenues}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCities;
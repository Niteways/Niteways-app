import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, Building2, MapPin, Mail, Phone, Users, Calendar, Ticket, 
  BarChart3, FileText, Settings as SettingsIcon, 
  DollarSign, Star, Instagram, Edit, Save, TrendingUp, CheckCircle,
  Plus, Trash2, Eye, Upload, User, X, UserCheck, LogOut, ExternalLink,
  CreditCard, Percent, Shield, FolderOpen, Tag, Sparkles, Smartphone, Loader2, Image, Crown
} from "lucide-react";
import { VenueGalleryManager } from "@/components/admin/VenueGalleryManager";
import { OpeningHoursEditor } from "@/components/admin/OpeningHoursEditor";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useVenueTeamMembers, VenueTeamMember } from "@/hooks/useVenueTeamMembers";
import { supabase } from "@/integrations/supabase/client";
import { getRoleBadgeClass, hasPermission, RoleBasedComponent, getVisibleTabs } from "@/components/admin/RoleBasedUI";
import { MobileUserApp } from "@/components/mobile/MobileUserApp";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { usePortal } from "@/contexts/PortalContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Database venue interface
interface DbVenue {
  id: string;
  venue_id: string;
  name: string;
  category: string;
  status: string;
  address: string | null;
  description: string | null;
  music_genre: string | null;
  opening_hours: string | null;
  opening_days: string | null;
  age_limit: number | null;
  instagram_handle: string | null;
  spotify_link: string | null;
  menu_url: string | null;
  gallery_images: string[] | null;
  email: string | null;
  phone: string | null;
  entrance_rules: string | null;
  min_spend_tables: number | null;
  base_package: string;
  addons: string[] | null;
  city_id: string | null;
  cities?: { name: string } | null;
}

// Hook to fetch venue from database with real-time updates
function useVenue(venueId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!venueId) return;

    const channel = supabase
      .channel(`venue-${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "venues",
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-venue", venueId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, queryClient]);

  return useQuery({
    queryKey: ["admin-venue", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*, cities(name)")
        .eq("venue_id", venueId)
        .single();
      
      if (error) throw error;
      return data as DbVenue;
    },
    enabled: !!venueId,
  });
}

const AdminVenueDetail = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch real venue data from database
  const { data: dbVenue, isLoading: venueLoading, refetch: refetchVenue } = useVenue(venueId || "");
  
  // Use global impersonation context
  const { startImpersonation } = useImpersonation();
  const { setMode } = usePortal();
  
  // Dialog state for impersonation selection
  const [isImpersonateDialogOpen, setIsImpersonateDialogOpen] = useState(false);
  
  // User App Preview state
  const [isUserAppOpen, setIsUserAppOpen] = useState(false);
  
  // Edit states
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingVenueInfo, setIsEditingVenueInfo] = useState(false);
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingCommission, setIsEditingCommission] = useState(false);
  const [isEditingSubscription, setIsEditingSubscription] = useState(false);
  const [isAddingTeamMember, setIsAddingTeamMember] = useState(false);
  const [isEditingTeamMember, setIsEditingTeamMember] = useState(false);
  const [editingMember, setEditingMember] = useState<VenueTeamMember | null>(null);
  const [newTeamMember, setNewTeamMember] = useState({ name: "", role: "Host", email: "" });
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for editable fields
  const [basicInfo, setBasicInfo] = useState({ name: "", address: "", category: "" });
  const [contactInfo, setContactInfo] = useState({ name: "", email: "", phone: "", role: "Owner" });
  const [venueInfo, setVenueInfo] = useState({
    description: "",
    musicGenre: "",
    openingHours: "",
    openingDays: "",
    entranceRules: "",
    priceLevel: "$$",
    ageLimit: 21,
    spotifyLink: "",
    instagramHandle: "",
    menuUrl: "",
    heroImage: "",
  });
  const [commissionRates, setCommissionRates] = useState({ tableBooking: 15, ticketing: 10, guestList: 5 });
  const [documents, setDocuments] = useState<{ id: string; name: string; uploadedAt: string; size: string; type: string; storagePath: string; category: string; expirationDate: string | null }[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  
  // Fetch documents for this venue
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!dbVenue?.id) return;
      
      const { data, error } = await supabase
        .from('venue_documents')
        .select('*')
        .eq('venue_id', dbVenue.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setDocuments(data.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          uploadedAt: new Date(doc.created_at).toLocaleDateString(),
          size: doc.size_bytes ? `${(doc.size_bytes / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
          type: doc.mime_type?.split('/')[1]?.toUpperCase() || 'FILE',
          storagePath: doc.storage_path,
          category: doc.category || 'agreement',
          expirationDate: doc.expiration_date || null,
        })));
      }
    };
    
    fetchDocuments();
    
    // Subscribe to realtime updates
    if (dbVenue?.id) {
      const channel = supabase
        .channel(`venue-documents-${dbVenue.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_documents', filter: `venue_id=eq.${dbVenue.id}` }, fetchDocuments)
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    }
  }, [dbVenue?.id]);

  // Handle document upload
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !dbVenue?.id) return;
    
    setIsUploadingDocument(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("You must be signed in to upload documents.");

      const form = new FormData();
      form.append("venueId", dbVenue.id);
      form.append("file", file);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-upload-venue-document`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to upload document");
      }
      
      toast.success('Document uploaded successfully');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error?.message || 'Failed to upload document');
    } finally {
      setIsUploadingDocument(false);
      event.target.value = ''; // Reset input
    }
  };

  // Handle document delete
  const handleDocumentDelete = async (doc: { id: string; storagePath: string }) => {
    try {
      // Delete from storage
      await supabase.storage.from('venue-documents').remove([doc.storagePath]);
      
      // Delete from database
      const { error } = await supabase
        .from('venue_documents')
        .delete()
        .eq('id', doc.id);
      
      if (error) throw error;
      toast.success('Document deleted');
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(error?.message || 'Failed to delete document');
    }
  };

  // Handle document download
  const handleDocumentDownload = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('venue-documents')
        .createSignedUrl(storagePath, 60 * 10);
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error('Download failed:', error);
      toast.error(error?.message || 'Failed to download document');
    }
  };
  
  // Update local state when dbVenue changes
  useEffect(() => {
    if (dbVenue) {
      setBasicInfo({
        name: dbVenue.name || "",
        address: dbVenue.address || "",
        category: dbVenue.category || "",
      });
      setContactInfo({
        name: "",
        email: dbVenue.email || "",
        phone: dbVenue.phone || "",
        role: "Owner",
      });
      setVenueInfo({
        description: dbVenue.description || "",
        musicGenre: dbVenue.music_genre || "",
        openingHours: dbVenue.opening_hours || "",
        openingDays: dbVenue.opening_days || "",
        entranceRules: dbVenue.entrance_rules || "",
        priceLevel: "$$$$",
        ageLimit: dbVenue.age_limit || 21,
        spotifyLink: dbVenue.spotify_link || "",
        instagramHandle: dbVenue.instagram_handle || "",
        menuUrl: dbVenue.menu_url || "",
        heroImage: dbVenue.gallery_images?.[0] || "",
      });
    }
  }, [dbVenue]);
  
  // Fetch real team members from database
  const { teamMembers, loading: loadingTeam, addTeamMember, updateTeamMember, deleteTeamMember, refetch: refetchTeam } = useVenueTeamMembers({ venueId: dbVenue?.id || "" });

  // Toggle venue active/inactive status
  const handleToggleStatus = async () => {
    if (!dbVenue) return;
    
    const newStatus = dbVenue.status === "active" ? "inactive" : "active";
    
    const { error } = await supabase
      .from("venues")
      .update({ status: newStatus })
      .eq("id", dbVenue.id);
    
    if (error) {
      toast.error("Failed to update venue status");
      console.error(error);
    } else {
      toast.success(`Venue is now ${newStatus}`);
      refetchVenue();
    }
  };

  // Handlers - Save to database
  const handleSaveBasicInfo = async () => {
    if (!dbVenue) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("venues")
      .update({
        name: basicInfo.name,
        address: basicInfo.address,
        category: basicInfo.category,
      })
      .eq("id", dbVenue.id);
    
    setIsSaving(false);
    if (error) {
      toast.error("Failed to save basic information");
      console.error(error);
    } else {
      setIsEditingBasicInfo(false);
      toast.success("Basic information updated - changes synced to user app");
      refetchVenue();
    }
  };

  const handleSaveContact = async () => {
    if (!dbVenue) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("venues")
      .update({
        email: contactInfo.email,
        phone: contactInfo.phone,
      })
      .eq("id", dbVenue.id);
    
    setIsSaving(false);
    if (error) {
      toast.error("Failed to save contact information");
      console.error(error);
    } else {
      setIsEditingContact(false);
      toast.success("Contact information updated");
      refetchVenue();
    }
  };

  const handleSaveVenueInfo = async () => {
    if (!dbVenue) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from("venues")
      .update({
        description: venueInfo.description,
        music_genre: venueInfo.musicGenre,
        opening_hours: venueInfo.openingHours,
        opening_days: venueInfo.openingDays,
        entrance_rules: venueInfo.entranceRules,
        age_limit: venueInfo.ageLimit,
        instagram_handle: venueInfo.instagramHandle,
        spotify_link: venueInfo.spotifyLink,
        menu_url: venueInfo.menuUrl,
      })
      .eq("id", dbVenue.id);
    
    setIsSaving(false);
    if (error) {
      toast.error("Failed to save venue information");
      console.error(error);
    } else {
      setIsEditingVenueInfo(false);
      toast.success("Venue information updated - changes synced to user app");
      refetchVenue();
    }
  };

  const handleSaveCommission = () => {
    setIsEditingCommission(false);
    toast.success("Commission rates updated");
  };

  const handleSaveSubscription = () => {
    setIsEditingSubscription(false);
    toast.success("Subscription updated");
  };

  const handleAddTeamMember = async () => {
    if (!newTeamMember.name || !newTeamMember.email) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!dbVenue?.id) {
      toast.error("Venue not loaded yet");
      return;
    }
    try {
      await addTeamMember({
        venue_id: dbVenue.id, // Use the UUID, not the venueId string
        user_id: null,
        name: newTeamMember.name,
        email: newTeamMember.email,
        role: newTeamMember.role,
        permissions: {},
        status: "Active",
        avatar_url: null,
      });
      setIsAddingTeamMember(false);
      setNewTeamMember({ name: "", role: "Host", email: "" });
      toast.success("Team member added");
      refetchTeam();
    } catch (error) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member. Please ensure you have admin permissions.");
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    try {
      await deleteTeamMember(id);
      toast.success("Team member removed");
    } catch (error) {
      toast.error("Failed to remove team member");
    }
  };

  // Impersonate handlers - Navigate to venue portal with member's permissions
  const handleStartImpersonate = (member: VenueTeamMember) => {
    // CRITICAL: Use dbVenue.id (UUID) not venueId (short string like VNU-XXX)
    // This ensures database inserts use the correct UUID for venue_id foreign keys
    startImpersonation(member, dbVenue?.id || "", dbVenue?.name || "Unknown Venue");
    setIsImpersonateDialogOpen(false);
    
    // Switch to venue portal mode
    setMode("venue");
    
    // Get the visible tabs for this role to determine where to navigate
    const visibleTabs = getVisibleTabs(member);
    
    // Navigate to venue dashboard (or first available tab based on role)
    if (visibleTabs.includes("checkin")) {
      navigate("/checkin");
    } else {
      navigate("/");
    }
    
    toast.success(`Now impersonating ${member.name} (${member.role}) - Redirecting to venue portal`);
  };

  // Add gallery tab
  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "basicinfo", label: "Basic Info", icon: Building2 },
    { id: "gallery", label: "Gallery", icon: Image },
    { id: "contact", label: "Contact Person", icon: User },
    { id: "venueinfo", label: "Venue Details", icon: SettingsIcon },
    { id: "commission", label: "Commission", icon: Percent },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "documents", label: "Documents", icon: FolderOpen },
    { id: "team", label: "Team & Permissions", icon: Users },
    { id: "categories", label: "Categories", icon: Tag },
    { id: "features", label: "Features", icon: Sparkles },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  // Contact person is always the super admin of the venue - get from team members
  const contactPerson = teamMembers.find(m => m.role === "Super Admin") || teamMembers.find(m => m.role === "Owner") || null;

  // Loading state
  if (venueLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading venue details...</p>
        </div>
      </div>
    );
  }

  if (!dbVenue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Venue not found</h2>
          <p className="text-muted-foreground mb-4">The venue you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/admin/venues")}>Back to Venues</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin/venues")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{dbVenue.name}</h1>
                  <Badge 
                    className={cn(
                      dbVenue.status === "active" ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {dbVenue.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> {dbVenue.address || "No address"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Active/Inactive Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active</span>
                <Switch 
                  checked={dbVenue.status === "active"}
                  onCheckedChange={handleToggleStatus}
                />
              </div>

              {/* User App Toggle */}
              <Button 
                variant="outline" 
                onClick={() => setIsUserAppOpen(true)} 
                className="gap-2"
              >
                <Smartphone className="w-4 h-4" />
                User App
              </Button>

              <Button variant="outline" onClick={() => setIsImpersonateDialogOpen(true)} className="gap-2">
                <UserCheck className="w-4 h-4" />
                Impersonate
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile User App Preview */}
      <MobileUserApp isOpen={isUserAppOpen} onClose={() => setIsUserAppOpen(false)} />

      {/* Horizontal Tabs with improved scrolling */}
      <div className="border-b border-border bg-card/30">
        <div className="container mx-auto px-6">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-1 py-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-2" />
          </ScrollArea>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gold/10 border-gold/20">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gold/20">
                        <DollarSign className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold">$0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-teal/10 border-teal/20">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal/20">
                        <Users className="w-5 h-5 text-teal" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Active Guests</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-coral/10 border-coral/20">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-coral/20">
                        <Calendar className="w-5 h-5 text-coral" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Bookings</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple/10 border-purple/20">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple/20">
                        <Star className="w-5 h-5 text-purple" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Rating</p>
                        <p className="text-2xl font-bold">-</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{contactInfo.name || "Not set"} ({contactInfo.role})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{contactInfo.email || "Not set"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{contactInfo.phone || "Not set"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Plan</span>
                        <Badge className="bg-primary/20 text-primary">{dbVenue.base_package}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Add-ons</span>
                        <span className="font-bold">{dbVenue.addons?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={dbVenue.status === "active" ? "bg-teal/20 text-teal" : "bg-muted"}>{dbVenue.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "basicinfo" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Core venue details visible in user app</CardDescription>
                </div>
                <Button 
                  variant={isEditingBasicInfo ? "default" : "outline"} 
                  onClick={() => isEditingBasicInfo ? handleSaveBasicInfo() : setIsEditingBasicInfo(true)}
                  className="gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : isEditingBasicInfo ? (
                    <><Save className="w-4 h-4" /> Save</>
                  ) : (
                    <><Edit className="w-4 h-4" /> Edit</>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Venue Name</Label>
                    <Input 
                      value={basicInfo.name} 
                      onChange={(e) => setBasicInfo({...basicInfo, name: e.target.value})}
                      disabled={!isEditingBasicInfo}
                      placeholder="Enter venue name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={basicInfo.category} 
                      onValueChange={(value) => setBasicInfo({...basicInfo, category: value})}
                      disabled={!isEditingBasicInfo}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nightclub">Nightclub</SelectItem>
                        <SelectItem value="Beach Club">Beach Club</SelectItem>
                        <SelectItem value="Bar">Bar</SelectItem>
                        <SelectItem value="Lounge">Lounge</SelectItem>
                        <SelectItem value="Restaurant">Restaurant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address</Label>
                    <Input 
                      value={basicInfo.address} 
                      onChange={(e) => setBasicInfo({...basicInfo, address: e.target.value})}
                      disabled={!isEditingBasicInfo}
                      placeholder="Enter full address"
                    />
                  </div>
                </div>
                {isEditingBasicInfo && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-teal" />
                    Changes will sync to user app in real-time
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "gallery" && dbVenue && (
            <VenueGalleryManager 
              venueId={dbVenue.id} 
              galleryImages={dbVenue.gallery_images || []} 
              onImagesUpdated={refetchVenue}
            />
          )}

          {activeTab === "contact" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Contact Person
                    <Badge variant="outline" className="gap-1">
                      <Crown className="w-3 h-3" />
                      Super Admin
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    The contact person is the Super Admin of this venue and appears in the Team tab
                  </CardDescription>
                </div>
                <Button 
                  variant={isEditingContact ? "default" : "outline"} 
                  onClick={() => isEditingContact ? handleSaveContact() : setIsEditingContact(true)}
                  className="gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : isEditingContact ? (
                    <><Save className="w-4 h-4" /> Save</>
                  ) : (
                    <><Edit className="w-4 h-4" /> Edit</>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactPerson ? (
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={contactPerson.avatar_url || undefined} />
                      <AvatarFallback>{contactPerson.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{contactPerson.name}</p>
                      <p className="text-sm text-muted-foreground">{contactPerson.email}</p>
                    </div>
                    <Badge className="bg-primary/20 text-primary">{contactPerson.role}</Badge>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground mb-4">
                    No Super Admin assigned yet. Add one in the Team tab.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Venue Email</Label>
                    <Input 
                      type="email"
                      value={contactInfo.email} 
                      onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                      disabled={!isEditingContact}
                      placeholder="contact@venue.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Venue Phone</Label>
                    <Input 
                      value={contactInfo.phone} 
                      onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                      disabled={!isEditingContact}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "venueinfo" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Venue Information</CardTitle>
                  <CardDescription>Public information displayed in the app</CardDescription>
                </div>
                <Button 
                  variant={isEditingVenueInfo ? "default" : "outline"} 
                  onClick={() => isEditingVenueInfo ? handleSaveVenueInfo() : setIsEditingVenueInfo(true)}
                  className="gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : isEditingVenueInfo ? (
                    <><Save className="w-4 h-4" /> Save</>
                  ) : (
                    <><Edit className="w-4 h-4" /> Edit</>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea 
                        value={venueInfo.description} 
                        onChange={(e) => setVenueInfo({...venueInfo, description: e.target.value})}
                        disabled={!isEditingVenueInfo}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Music Genre</Label>
                      <Input 
                        value={venueInfo.musicGenre} 
                        onChange={(e) => setVenueInfo({...venueInfo, musicGenre: e.target.value})}
                        disabled={!isEditingVenueInfo}
                      />
                    </div>
                    {/* Opening Hours Editor - Day-specific */}
                    <OpeningHoursEditor
                      openingHours={dbVenue?.opening_hours || null}
                      openingDays={dbVenue?.opening_days || null}
                      onSave={async (hours, days) => {
                        if (!dbVenue) return;
                        const { error } = await supabase
                          .from("venues")
                          .update({
                            opening_hours: hours,
                            opening_days: days,
                          })
                          .eq("id", dbVenue.id);
                        
                        if (error) throw error;
                        refetchVenue();
                      }}
                      disabled={!isEditingVenueInfo}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Entrance Rules</Label>
                      <Input 
                        value={venueInfo.entranceRules} 
                        onChange={(e) => setVenueInfo({...venueInfo, entranceRules: e.target.value})}
                        disabled={!isEditingVenueInfo}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Age Limit</Label>
                      <Input 
                        type="number"
                        value={venueInfo.ageLimit} 
                        onChange={(e) => setVenueInfo({...venueInfo, ageLimit: parseInt(e.target.value) || 18})}
                        disabled={!isEditingVenueInfo}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram Handle</Label>
                      <Input 
                        value={venueInfo.instagramHandle} 
                        onChange={(e) => setVenueInfo({...venueInfo, instagramHandle: e.target.value})}
                        disabled={!isEditingVenueInfo}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Spotify Link</Label>
                      <Input 
                        value={venueInfo.spotifyLink} 
                        onChange={(e) => setVenueInfo({...venueInfo, spotifyLink: e.target.value})}
                        disabled={!isEditingVenueInfo}
                      />
                    </div>
                  </div>
                </div>
                {isEditingVenueInfo && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-4">
                    <CheckCircle className="w-4 h-4 text-teal" />
                    Changes will sync to user app in real-time
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "commission" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Commission Rates</CardTitle>
                  <CardDescription>Platform commission for each service type</CardDescription>
                </div>
                <Button 
                  variant={isEditingCommission ? "default" : "outline"} 
                  onClick={() => isEditingCommission ? handleSaveCommission() : setIsEditingCommission(true)}
                  className="gap-2"
                >
                  {isEditingCommission ? <><Save className="w-4 h-4" /> Save</> : <><Edit className="w-4 h-4" /> Edit</>}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <Label>Table Booking</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number"
                        value={commissionRates.tableBooking} 
                        onChange={(e) => setCommissionRates({...commissionRates, tableBooking: parseInt(e.target.value) || 0})}
                        disabled={!isEditingCommission}
                        className="w-20"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      <Label>Ticketing</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number"
                        value={commissionRates.ticketing} 
                        onChange={(e) => setCommissionRates({...commissionRates, ticketing: parseInt(e.target.value) || 0})}
                        disabled={!isEditingCommission}
                        className="w-20"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <Label>Guest List</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number"
                        value={commissionRates.guestList} 
                        onChange={(e) => setCommissionRates({...commissionRates, guestList: parseInt(e.target.value) || 0})}
                        disabled={!isEditingCommission}
                        className="w-20"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "subscription" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Subscription Plan</CardTitle>
                  <CardDescription>Current plan and billing information</CardDescription>
                </div>
                <Button 
                  variant={isEditingSubscription ? "default" : "outline"} 
                  onClick={() => isEditingSubscription ? handleSaveSubscription() : setIsEditingSubscription(true)}
                  className="gap-2"
                >
                  {isEditingSubscription ? <><Save className="w-4 h-4" /> Save</> : <><Edit className="w-4 h-4" /> Edit</>}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold">{dbVenue.base_package}</span>
                        <Badge className="bg-teal/20 text-teal">{dbVenue.status}</Badge>
                      </div>
                      <p className="text-2xl font-bold">Custom<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Input value={dbVenue.status} disabled />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label>Active Add-ons</Label>
                    <div className="space-y-2">
                      {(dbVenue.addons || []).map((addon, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <span>{addon}</span>
                          <CheckCircle className="w-4 h-4 text-teal" />
                        </div>
                      ))}
                      {(!dbVenue.addons || dbVenue.addons.length === 0) && (
                        <p className="text-muted-foreground text-sm">No add-ons configured</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "documents" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Contracts, licenses, and legal documents</CardDescription>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleDocumentUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploadingDocument}
                  />
                  <Button className="gap-2" disabled={isUploadingDocument}>
                    {isUploadingDocument ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No documents uploaded yet</p>
                    <p className="text-sm mt-1">Upload contracts, licenses, or other venue documents</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => {
                        const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
                        const isExpiringSoon = doc.expirationDate && !isExpired && new Date(doc.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        return (
                        <TableRow key={doc.id} className={isExpired ? "bg-destructive/5" : isExpiringSoon ? "bg-gold/5" : ""}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            {doc.name}
                            {isExpired && <Badge variant="destructive" className="text-xs ml-2">Expired</Badge>}
                            {isExpiringSoon && <Badge className="bg-gold/20 text-gold text-xs ml-2">Expiring</Badge>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{doc.type}</Badge>
                          </TableCell>
                          <TableCell>{doc.uploadedAt}</TableCell>
                          <TableCell className={isExpired ? "text-destructive" : isExpiringSoon ? "text-gold" : "text-muted-foreground"}>
                            {doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell>{doc.size}</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDocumentDownload(doc.storagePath, doc.name)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-coral"
                              onClick={() => handleDocumentDelete({ id: doc.id, storagePath: doc.storagePath })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "team" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team & Permissions</CardTitle>
                  <CardDescription>Manage venue team members and their access rights</CardDescription>
                </div>
                <Button onClick={() => setIsAddingTeamMember(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Member
                </Button>
              </CardHeader>
              <CardContent>
                {loadingTeam ? (
                  <div className="text-center py-8 text-muted-foreground">Loading team members...</div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No team members found. Add some to get started.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member) => {
                        const isSuperAdmin = member.role === "Super Admin" || member.role === "Owner";
                        return (
                        <TableRow key={member.id} className={isSuperAdmin ? "bg-primary/5" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium">{member.name}</span>
                                {isSuperAdmin && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Crown className="w-3 h-3 text-primary" /> Contact Person
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={isSuperAdmin ? "border-primary text-primary" : ""}
                            >
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Badge className={member.status === "Active" ? "bg-teal/20 text-teal" : "bg-muted text-muted-foreground"}>
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleStartImpersonate(member)}
                              title="Impersonate this user"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost"><Edit className="w-4 h-4" /></Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-coral"
                              onClick={() => handleDeleteTeamMember(member.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "categories" && (
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Venue classification and categorization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Venue Category</Label>
                    <Select defaultValue="nightclub">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nightclub">Nightclub</SelectItem>
                        <SelectItem value="beachclub">Beach Club</SelectItem>
                        <SelectItem value="lounge">Lounge</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="rooftop">Rooftop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Music Genre</Label>
                    <Select defaultValue="house">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">House / Electronic</SelectItem>
                        <SelectItem value="hiphop">Hip Hop / R&B</SelectItem>
                        <SelectItem value="latin">Latin / Reggaeton</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="live">Live Music</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Price Level</Label>
                    <Select defaultValue="4">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">$ (Budget)</SelectItem>
                        <SelectItem value="2">$$ (Moderate)</SelectItem>
                        <SelectItem value="3">$$$ (Upscale)</SelectItem>
                        <SelectItem value="4">$$$$ (Luxury)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Atmosphere</Label>
                    <Select defaultValue="upscale">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="trendy">Trendy</SelectItem>
                        <SelectItem value="upscale">Upscale</SelectItem>
                        <SelectItem value="exclusive">Exclusive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "features" && (
            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
                <CardDescription>Enable or disable platform features for this venue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {[
                    { label: "Table Booking", description: "Allow customers to book tables", enabled: true },
                    { label: "Ticketing", description: "Sell tickets for events", enabled: true },
                    { label: "Guest List", description: "Enable guest list management", enabled: true },
                    { label: "Loyalty System", description: "Member rewards and tiers", enabled: true },
                    { label: "Advanced Analytics", description: "Detailed reports and insights", enabled: true },
                    { label: "CRM Integration", description: "Customer relationship management", enabled: false },
                    { label: "Marketing Automation", description: "Automated campaigns and messaging", enabled: false },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                      <Switch defaultChecked={feature.enabled} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "settings" && (
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Configure advanced venue settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Booking Cutoff Hours</Label>
                    <Input type="number" defaultValue={2} />
                    <p className="text-xs text-muted-foreground">Hours before event when bookings close</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Advance Booking Days</Label>
                    <Input type="number" defaultValue={30} />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Deposit Percentage</Label>
                    <Input type="number" defaultValue={20} />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select defaultValue="america-miami">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="america-miami">America/Miami (EST)</SelectItem>
                        <SelectItem value="america-la">America/Los_Angeles (PST)</SelectItem>
                        <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cancellation Policy</Label>
                  <Textarea defaultValue="Cancellations must be made 24 hours in advance for a full refund." rows={3} />
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Impersonate Dialog */}
      <Dialog open={isImpersonateDialogOpen} onOpenChange={setIsImpersonateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Impersonate Team Member
            </DialogTitle>
            <DialogDescription>
              Select a team member to view the venue portal with their exact permissions and limitations.
              You will be redirected to the venue dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {loadingTeam ? (
              <div className="text-center py-4 text-muted-foreground">Loading team members...</div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No team members available to impersonate.</div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {teamMembers.map((member) => {
                  const visibleTabs = getVisibleTabs(member);
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleStartImpersonate(member)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left group"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Access: {visibleTabs.join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">{member.role}</Badge>
                        <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Note:</strong> You will be redirected to the venue portal and see exactly what this team member sees.
            Click "Exit Impersonation" in the top banner to return to admin view.
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={isAddingTeamMember} onOpenChange={setIsAddingTeamMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add a new member to this venue's team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={newTeamMember.name} 
                onChange={(e) => setNewTeamMember({...newTeamMember, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={newTeamMember.email} 
                onChange={(e) => setNewTeamMember({...newTeamMember, email: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newTeamMember.role} onValueChange={(v) => setNewTeamMember({...newTeamMember, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super Admin">
                    <div className="flex items-center gap-2">
                      <Crown className="w-3 h-3 text-primary" />
                      Super Admin (Contact Person)
                    </div>
                  </SelectItem>
                  <SelectItem value="Owner">Owner</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Host">Host</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Promoter">Promoter</SelectItem>
                </SelectContent>
              </Select>
              {(newTeamMember.role === "Super Admin" || newTeamMember.role === "Owner") && (
                <p className="text-xs text-muted-foreground">
                  This person will be shown as the Contact Person for the venue.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingTeamMember(false)}>Cancel</Button>
            <Button onClick={handleAddTeamMember}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVenueDetail;

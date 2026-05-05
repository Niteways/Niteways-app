import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, User, MapPin, Package, CheckCircle, Percent, FileText, Clock, Music, DollarSign, Image, X, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const AdminVenueOnboarding = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Fetch cities from database
  const { data: cities = [] } = useQuery({
    queryKey: ["cities-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("name")
        .order("name");
      if (error) throw error;
      return data.map(c => c.name);
    },
  });

  const [formData, setFormData] = useState({
    // Basic Info
    venueName: "",
    companyName: "",
    city: "",
    address: "",
    category: "Nightclub" as "Nightclub" | "Beach Club" | "Bar" | "Lounge" | "Rooftop",
    // Contact
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactRole: "Owner",
    // Venue Details
    description: "",
    musicGenre: "",
    openingHours: "",
    openingDays: "",
    entranceRules: "",
    ageLimit: 21,
    instagramHandle: "",
    spotifyLink: "",
    // Commission
    commissionRate: 15,
    paymentTerms: "monthly",
    // Package - using lowercase values to match database constraint
    basePackage: "starter" as "starter" | "growth" | "enterprise",
    addOns: {
      ticketing: false,
      loyalty: false,
      advancedAnalytics: false,
      customBranding: false,
      apiAccess: false,
    },
    // Features
    features: {
      tables: true,
      tickets: false,
      guestlists: true,
      loyalty: false,
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAddOn = (addon: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      addOns: { ...prev.addOns, [addon]: value },
    }));
  };

  const updateFeature = (feature: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: value },
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    // For now, use local preview URLs (in production, upload to storage)
    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    
    setGalleryImages(prev => [...prev, ...newImages]);
    setIsUploading(false);
    toast.success(`${files.length} image(s) added`);
  };

  const removeImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    toast.success("Image removed");
  };

  const handleSubmit = async () => {
    if (!formData.venueName || !formData.city || !formData.contactEmail) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Get city_id
      const { data: cityData } = await supabase
        .from("cities")
        .select("id")
        .eq("name", formData.city)
        .single();

      // Generate unique venue_id
      const venueId = `VNU-${Date.now().toString(36).toUpperCase()}`;

      // Insert venue
      const { error } = await supabase.from("venues").insert({
        venue_id: venueId,
        name: formData.venueName,
        category: formData.category,
        status: "active",
        address: formData.address,
        description: formData.description,
        music_genre: formData.musicGenre,
        opening_hours: formData.openingHours,
        opening_days: formData.openingDays,
        entrance_rules: formData.entranceRules,
        age_limit: formData.ageLimit,
        instagram_handle: formData.instagramHandle,
        spotify_link: formData.spotifyLink,
        city_id: cityData?.id || null,
        base_package: formData.basePackage,
        addons: Object.entries(formData.addOns)
          .filter(([, v]) => v)
          .map(([k]) => k),
        gallery_images: galleryImages,
        email: formData.contactEmail,
        phone: formData.contactPhone,
      });

      if (error) throw error;

      toast.success("Venue onboarded successfully!");
      navigate("/admin/venues");
    } catch (error: any) {
      toast.error(error.message || "Failed to onboard venue");
    }
  };

  const basePackages = [
    { id: "starter", name: "Starter", price: 99, description: "Basic features for small venues", features: ["Table booking", "Guest list", "Basic analytics", "Email support"] },
    { id: "growth", name: "Growth", price: 299, description: "Most popular for growing venues", features: ["All Starter features", "Unlimited bookings", "Smart CRM", "Priority support"] },
    { id: "enterprise", name: "Enterprise", price: 599, description: "Full suite for premium venues", features: ["All Growth features", "Advanced analytics", "Custom branding", "Dedicated manager"] },
  ];

  const addOnOptions = [
    { id: "ticketing", name: "Ticketing Module", price: 99, description: "Sell event tickets" },
    { id: "loyalty", name: "Loyalty System", price: 79, description: "Points & rewards program" },
    { id: "advancedAnalytics", name: "Advanced Analytics", price: 49, description: "Deep insights & reports" },
    { id: "customBranding", name: "Custom Branding", price: 149, description: "White-label experience" },
    { id: "apiAccess", name: "API Access", price: 199, description: "Integration capabilities" },
  ];

  return (
    <AdminLayout title="Onboard New Venue" subtitle="Add a new venue to the platform">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/admin/venues")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Venues
        </Button>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-teal text-teal-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 6 && <div className={`w-12 h-0.5 ${s < step ? "bg-teal" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Enter venue and company details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Venue Name *</Label>
                    <Input
                      value={formData.venueName}
                      onChange={(e) => updateField("venueName", e.target.value)}
                      placeholder="Enter venue name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => updateField("companyName", e.target.value)}
                      placeholder="Parent company (optional)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Select value={formData.city} onValueChange={(v) => updateField("city", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => updateField("category", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nightclub">Nightclub</SelectItem>
                        <SelectItem value="Beach Club">Beach Club</SelectItem>
                        <SelectItem value="Bar">Bar</SelectItem>
                        <SelectItem value="Lounge">Lounge</SelectItem>
                        <SelectItem value="Rooftop">Rooftop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Full address"
                  />
                </div>

                {/* Gallery Images Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Venue Gallery Images
                  </Label>
                  <div className="grid grid-cols-4 gap-3">
                    {galleryImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-border group">
                        <img src={img} alt={`Venue ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      {isUploading ? (
                        <span className="text-xs text-muted-foreground">Uploading...</span>
                      ) : (
                        <>
                          <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Add Image</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">Upload images that will be shown in the venue profile on the User App</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Primary Contact</CardTitle>
                    <CardDescription>Main contact person for this venue</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input
                      value={formData.contactName}
                      onChange={(e) => updateField("contactName", e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={formData.contactRole} onValueChange={(v) => updateField("contactRole", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="CEO">CEO</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => updateField("contactEmail", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) => updateField("contactPhone", e.target.value)}
                      placeholder="+1 555-0000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Venue Information */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Venue Information</CardTitle>
                    <CardDescription>Details shown in the customer app</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Venue Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Describe the venue, atmosphere, and unique features..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Music Genre</Label>
                    <Input
                      value={formData.musicGenre}
                      onChange={(e) => updateField("musicGenre", e.target.value)}
                      placeholder="e.g., Hip Hop & House"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age Limit</Label>
                    <Input
                      type="number"
                      value={formData.ageLimit}
                      onChange={(e) => updateField("ageLimit", parseInt(e.target.value) || 18)}
                      min={18}
                      max={30}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Opening Hours</Label>
                    <Input
                      value={formData.openingHours}
                      onChange={(e) => updateField("openingHours", e.target.value)}
                      placeholder="e.g., 23:00 - 03:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Opening Days</Label>
                    <Input
                      value={formData.openingDays}
                      onChange={(e) => updateField("openingDays", e.target.value)}
                      placeholder="e.g., Wed - Sat"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Entrance Rules</Label>
                  <Input
                    value={formData.entranceRules}
                    onChange={(e) => updateField("entranceRules", e.target.value)}
                    placeholder="e.g., Guestlist & table reservation only"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Instagram Handle</Label>
                    <Input
                      value={formData.instagramHandle}
                      onChange={(e) => updateField("instagramHandle", e.target.value)}
                      placeholder="@venuename"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Spotify Playlist Link</Label>
                    <Input
                      value={formData.spotifyLink}
                      onChange={(e) => updateField("spotifyLink", e.target.value)}
                      placeholder="https://open.spotify.com/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Commission & Billing */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Percent className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Commission & Billing</CardTitle>
                    <CardDescription>Set commission rates and payment terms</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Commission Rate (%)</Label>
                    <Input
                      type="number"
                      value={formData.commissionRate}
                      onChange={(e) => updateField("commissionRate", parseInt(e.target.value) || 0)}
                      min={0}
                      max={50}
                    />
                    <p className="text-xs text-muted-foreground">Percentage of each booking revenue</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Select value={formData.paymentTerms} onValueChange={(v) => updateField("paymentTerms", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly Payout</SelectItem>
                        <SelectItem value="biweekly">Bi-Weekly Payout</SelectItem>
                        <SelectItem value="monthly">Monthly Payout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <h4 className="font-medium">Commission Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    This venue will pay {formData.commissionRate}% commission on all bookings made through the platform.
                    Payments will be processed {formData.paymentTerms === "weekly" ? "every week" : formData.paymentTerms === "biweekly" ? "every two weeks" : "at the end of each month"}.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 5: Package Selection */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Subscription Package</CardTitle>
                    <CardDescription>Select base package and add-ons</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-4 block">Base Package</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {basePackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        onClick={() => updateField("basePackage", pkg.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.basePackage === pkg.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{pkg.name}</h4>
                          <span className="text-lg font-bold">${pkg.price}/mo</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                        <ul className="space-y-1">
                          {pkg.features.map((f, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-teal" /> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <Label className="text-base font-medium mb-4 block">Add-Ons</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {addOnOptions.map((addon) => (
                      <div
                        key={addon.id}
                        className={`p-4 rounded-lg border transition-all ${
                          formData.addOns[addon.id as keyof typeof formData.addOns]
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={formData.addOns[addon.id as keyof typeof formData.addOns]}
                            onCheckedChange={(c) => updateAddOn(addon.id, !!c)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{addon.name}</span>
                              <span className="text-sm font-semibold">+${addon.price}/mo</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{addon.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 6: Features & Confirm */}
        {step === 6 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-teal/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-teal" />
                  </div>
                  <div>
                    <CardTitle>Review & Confirm</CardTitle>
                    <CardDescription>Verify all details before onboarding</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Gallery Preview */}
                {galleryImages.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Gallery Images</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {galleryImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Venue ${idx + 1}`}
                          className="w-24 h-16 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Venue Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Venue:</span>
                        <span className="font-medium">{formData.venueName || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Company:</span>
                        <span>{formData.companyName || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">City:</span>
                        <span>{formData.city || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span>{formData.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Age Limit:</span>
                        <span>{formData.ageLimit}+</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Contact</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{formData.contactName || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{formData.contactEmail || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span>{formData.contactPhone || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role:</span>
                        <span>{formData.contactRole}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium">Commission</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="font-medium">{formData.commissionRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment:</span>
                        <span className="capitalize">{formData.paymentTerms}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Subscription Summary</h4>
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex justify-between">
                      <span>Base Package ({formData.basePackage})</span>
                      <span className="font-medium">
                        ${basePackages.find(p => p.id === formData.basePackage)?.price}/mo
                      </span>
                    </div>
                    {Object.entries(formData.addOns).filter(([, v]) => v).map(([key]) => {
                      const addon = addOnOptions.find(a => a.id === key);
                      return addon ? (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{addon.name}</span>
                          <span>+${addon.price}/mo</span>
                        </div>
                      ) : null;
                    })}
                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span>
                        ${(basePackages.find(p => p.id === formData.basePackage)?.price || 0) +
                          Object.entries(formData.addOns)
                            .filter(([, v]) => v)
                            .reduce((sum, [key]) => sum + (addOnOptions.find(a => a.id === key)?.price || 0), 0)}/mo
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Previous
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep(step + 1)}>Continue</Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-teal hover:bg-teal/90">
              Complete Onboarding
            </Button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminVenueOnboarding;

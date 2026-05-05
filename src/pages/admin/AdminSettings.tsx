import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, DollarSign, Globe, FileText, Beaker, ToggleRight, Save } from "lucide-react";
import { toast } from "sonner";

interface FeatureToggle {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  target: "all" | "beta" | "specific";
}

const initialFeatureToggles: FeatureToggle[] = [
  { id: "smart-crm-v2", name: "Smart CRM v2", description: "New AI-powered CRM features", enabled: true, target: "all" },
  { id: "loyalty-system", name: "Loyalty Program", description: "Points-based loyalty system", enabled: false, target: "beta" },
  { id: "new-booking-flow", name: "New Booking Flow", description: "Redesigned booking experience", enabled: true, target: "beta" },
  { id: "analytics-ai", name: "AI Analytics", description: "AI-powered insights", enabled: false, target: "specific" },
  { id: "multi-language", name: "Multi-Language", description: "Support for 10+ languages", enabled: true, target: "all" },
];

const AdminSettings = () => {
  const [commissionRate, setCommissionRate] = useState("10");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [termsVersion, setTermsVersion] = useState("2.1");
  const [featureToggles, setFeatureToggles] = useState<FeatureToggle[]>(initialFeatureToggles);
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggleFeature = (featureId: string) => {
    setFeatureToggles(prev => prev.map(f => 
      f.id === featureId ? { ...f, enabled: !f.enabled } : f
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success("Settings saved successfully");
    setHasChanges(false);
  };

  const currencies = [
    { code: "USD", name: "US Dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
    { code: "SEK", name: "Swedish Krona" },
    { code: "NOK", name: "Norwegian Krone" },
  ];

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "sv", name: "Swedish" },
  ];

  return (
    <AdminLayout title="Platform Settings" subtitle="Configure platform-wide settings and feature toggles">
      <div className="space-y-6">
        <Tabs defaultValue="general">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="fees">Fees & Currency</TabsTrigger>
              <TabsTrigger value="features">Feature Toggles</TabsTrigger>
            </TabsList>
            {hasChanges && (
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" /> Save Changes
              </Button>
            )}
          </div>

          <TabsContent value="general" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-6 lg:grid-cols-2"
            >
              {/* Localization */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5" /> Localization
                  </CardTitle>
                  <CardDescription>Language and regional settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Language</Label>
                    <Select value={defaultLanguage} onValueChange={(v) => { setDefaultLanguage(v); setHasChanges(true); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Available Languages</Label>
                    <div className="flex flex-wrap gap-2">
                      {languages.map(lang => (
                        <Badge key={lang.code} variant="outline" className="cursor-pointer hover:bg-primary/20">
                          {lang.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Terms & Legal */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Terms & Legal
                  </CardTitle>
                  <CardDescription>Manage legal documents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">Terms of Service</p>
                      <p className="text-xs text-muted-foreground">Version {termsVersion}</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">Privacy Policy</p>
                      <p className="text-xs text-muted-foreground">Version 1.8</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">Venue Agreement</p>
                      <p className="text-xs text-muted-foreground">Version 3.0</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="fees" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> Platform Fees & Currency
                  </CardTitle>
                  <CardDescription>Configure commission rates and supported currencies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Default Commission Rate (%)</Label>
                        <Input
                          type="number"
                          value={commissionRate}
                          onChange={(e) => { setCommissionRate(e.target.value); setHasChanges(true); }}
                          min="0"
                          max="100"
                        />
                        <p className="text-xs text-muted-foreground">Applied to all transactions unless overridden</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Default Currency</Label>
                        <Select value={defaultCurrency} onValueChange={(v) => { setDefaultCurrency(v); setHasChanges(true); }}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map(curr => (
                              <SelectItem key={curr.code} value={curr.code}>{curr.code} - {curr.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label>Commission Tiers</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <span>Starter Plan</span>
                          <span className="font-medium">12%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <span>Professional Plan</span>
                          <span className="font-medium">10%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <span>Enterprise Plan</span>
                          <span className="font-medium">8%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Beaker className="w-5 h-5" /> Feature Toggles & Experiments
                  </CardTitle>
                  <CardDescription>Enable/disable features for specific venues or users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {featureToggles.map((feature) => (
                      <div key={feature.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                        <Switch
                          checked={feature.enabled}
                          onCheckedChange={() => handleToggleFeature(feature.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{feature.name}</h4>
                            <Badge className={
                              feature.target === "all" ? "bg-teal/20 text-teal" :
                              feature.target === "beta" ? "bg-gold/20 text-gold" :
                              "bg-purple/20 text-purple"
                            }>
                              {feature.target === "all" ? "All Users" : feature.target === "beta" ? "Beta" : "Specific"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Bell,
  Clock,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const genderOptions = ["Male", "Female", "Other"];
const musicGenres = ["House", "Tech House", "Hip Hop", "R&B", "EDM", "Latin", "Pop", "Reggaeton", "Afrobeats"];
const loyaltyLevels = ["Bronze", "Silver", "Gold", "Platinum", "VIP"];
const cities = ["Miami", "New York", "Los Angeles", "London", "Paris", "Dubai", "Ibiza"];

const CreateCampaign = () => {
  const navigate = useNavigate();
  
  const [audienceType, setAudienceType] = useState<"existing" | "app-users">("existing");
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedLoyalty, setSelectedLoyalty] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value) 
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  const handleSend = () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }
    toast.success("Campaign sent!");
    navigate("/campaigns");
  };

  const handleSchedule = () => {
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }
    toast.success("Campaign scheduled!");
    navigate("/campaigns");
  };

  return (
    <AdminLayout title="Create Campaign" subtitle="Launch a targeted marketing campaign">
      <div className="space-y-6">
        {/* Back button */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="w-4 h-4" />
            Back to Campaigns
          </Button>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Campaign Details */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                  <CardDescription>Basic information about your campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign Name *</Label>
                    <Input 
                      placeholder="e.g., VIP Early Access"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea 
                      placeholder="Write your message..."
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notification Channels */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Notification Channels</CardTitle>
                  <CardDescription>How to deliver this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      { id: "email", icon: Mail, label: "Email", color: "primary" },
                      { id: "sms", icon: MessageSquare, label: "SMS", color: "coral" },
                      { id: "push", icon: Bell, label: "Push", color: "teal" },
                    ].map((channel) => (
                      <div
                        key={channel.id}
                        className={cn(
                          "p-4 rounded-lg border cursor-pointer transition-all",
                          selectedChannels.includes(channel.id)
                            ? `border-${channel.color} bg-${channel.color}/10`
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setSelectedChannels(toggleArrayValue(selectedChannels, channel.id))}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            selectedChannels.includes(channel.id) ? `bg-${channel.color}/20` : "bg-muted"
                          )}>
                            <channel.icon className={cn("w-5 h-5", selectedChannels.includes(channel.id) ? `text-${channel.color}` : "text-muted-foreground")} />
                          </div>
                          <span className="font-medium">{channel.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Target Audience */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Target Audience</CardTitle>
                  <CardDescription>Who should receive this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={audienceType} onValueChange={(v) => setAudienceType(v as "existing" | "app-users")}>
                    <TabsList className="w-full">
                      <TabsTrigger value="existing" className="flex-1">Existing Customers</TabsTrigger>
                      <TabsTrigger value="app-users" className="flex-1">All App Users</TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="space-y-4 mt-4">
                      {/* Gender */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Gender</Label>
                        <div className="flex flex-wrap gap-2">
                          {genderOptions.map((gender) => (
                            <Badge
                              key={gender}
                              variant="outline"
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedGenders.includes(gender)
                                  ? "bg-primary/20 text-primary border-primary/30"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => setSelectedGenders(toggleArrayValue(selectedGenders, gender))}
                            >
                              {gender}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Age Range */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Age Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Min age" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
                          <Input type="number" placeholder="Max age" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
                        </div>
                      </div>

                      {/* Music Preferences */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Music Preferences</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {musicGenres.map((genre) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className={cn(
                                "cursor-pointer transition-colors text-xs",
                                selectedGenres.includes(genre)
                                  ? "bg-coral/20 text-coral border-coral/30"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => setSelectedGenres(toggleArrayValue(selectedGenres, genre))}
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Loyalty Level */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Loyalty Level</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {loyaltyLevels.map((level) => (
                            <Badge
                              key={level}
                              variant="outline"
                              className={cn(
                                "cursor-pointer transition-colors text-xs",
                                selectedLoyalty.includes(level)
                                  ? "bg-gold/20 text-gold border-gold/30"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => setSelectedLoyalty(toggleArrayValue(selectedLoyalty, level))}
                            >
                              {level}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="app-users" className="space-y-4 mt-4">
                      {/* Gender */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Gender</Label>
                        <div className="flex flex-wrap gap-2">
                          {genderOptions.map((gender) => (
                            <Badge
                              key={gender}
                              variant="outline"
                              className={cn(
                                "cursor-pointer transition-colors",
                                selectedGenders.includes(gender)
                                  ? "bg-primary/20 text-primary border-primary/30"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => setSelectedGenders(toggleArrayValue(selectedGenders, gender))}
                            >
                              {gender}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Age Range */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Age Range</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" placeholder="Min age" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
                          <Input type="number" placeholder="Max age" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
                        </div>
                      </div>

                      {/* Music Preferences */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Music Preferences</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {musicGenres.map((genre) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className={cn(
                                "cursor-pointer transition-colors text-xs",
                                selectedGenres.includes(genre)
                                  ? "bg-coral/20 text-coral border-coral/30"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => setSelectedGenres(toggleArrayValue(selectedGenres, genre))}
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* City */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">City</Label>
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((city) => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2" onClick={handleSend}>
                    <Send className="w-4 h-4" />
                    Send Now
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={handleSchedule}>
                    <Clock className="w-4 h-4" />
                    Schedule
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => navigate("/campaigns")}>
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Estimated reach</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-primary">~1,250</p>
                    <p className="text-sm text-muted-foreground">Estimated recipients</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CreateCampaign;

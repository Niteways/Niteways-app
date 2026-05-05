import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Send,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Clock,
  CheckCircle,
  Megaphone,
  Users,
  Mail,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  type: "sms" | "push" | "email";
  status: "draft" | "scheduled" | "sent";
  targetAudience: string;
  sentTo: number;
  openRate: number;
  eventId?: string;
  scheduledDate?: string;
}

const initialCampaigns: Campaign[] = [
  { id: "1", name: "VIP Early Access", type: "sms", status: "sent", targetAudience: "VIP Guests", sentTo: 150, openRate: 78 },
  { id: "2", name: "Weekend Reminder", type: "push", status: "scheduled", targetAudience: "All Guests", sentTo: 0, openRate: 0, scheduledDate: "2024-01-19" },
  { id: "3", name: "Birthday Special Offer", type: "sms", status: "draft", targetAudience: "Birthday This Month", sentTo: 0, openRate: 0 },
  { id: "4", name: "Member Exclusive", type: "email", status: "sent", targetAudience: "Members", sentTo: 500, openRate: 45 },
];

const genderOptions = ["Male", "Female", "Other"];
const musicGenres = ["House", "Tech House", "Hip Hop", "R&B", "EDM", "Latin", "Pop", "Reggaeton", "Afrobeats"];
const loyaltyLevels = ["Bronze", "Silver", "Gold", "Platinum", "VIP"];
const cities = ["Miami", "New York", "Los Angeles", "London", "Paris", "Dubai", "Ibiza"];

const Campaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Campaign form state
  const [audienceType, setAudienceType] = useState<"existing" | "app-users">("existing");
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedLoyalty, setSelectedLoyalty] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  const toggleArrayValue = (array: string[], value: string) => {
    return array.includes(value) 
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  const statusStyles = {
    draft: "bg-muted text-muted-foreground border-border",
    scheduled: "bg-gold/20 text-gold border-gold/30",
    sent: "bg-teal/20 text-teal border-teal/30",
  };

  const typeStyles = {
    sms: "bg-coral/20 text-coral border-coral/30",
    push: "bg-purple/20 text-purple border-purple/30",
    email: "bg-primary/20 text-primary border-primary/30",
  };

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Campaigns" subtitle="Launch targeted marketing campaigns">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Total Campaigns</p>
            <p className="text-2xl font-bold text-foreground">{campaigns.length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Active/Scheduled</p>
            <p className="text-2xl font-bold text-teal">{campaigns.filter(c => c.status === "sent" || c.status === "scheduled").length}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Messages Sent</p>
            <p className="text-2xl font-bold text-gold">{campaigns.reduce((sum, c) => sum + c.sentTo, 0).toLocaleString()}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
            <p className="text-2xl font-bold text-coral">
              {Math.round(campaigns.filter(c => c.openRate > 0).reduce((sum, c) => sum + c.openRate, 0) / campaigns.filter(c => c.openRate > 0).length || 0)}%
            </p>
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button className="gap-2" onClick={() => navigate("/campaigns/create")}>
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          </div>
        </motion.div>

        {/* Campaigns List */}
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign, index) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    campaign.type === "sms" ? "bg-coral/20" : campaign.type === "push" ? "bg-purple/20" : "bg-primary/20"
                  )}>
                    <Megaphone className={cn(
                      "w-5 h-5",
                      campaign.type === "sms" ? "text-coral" : campaign.type === "push" ? "text-purple" : "text-primary"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("text-xs", typeStyles[campaign.type])}>
                        {campaign.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">→ {campaign.targetAudience}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {campaign.status === "sent" && (
                    <div className="text-right">
                      <p className="text-sm font-medium">{campaign.sentTo.toLocaleString()} sent</p>
                      <p className="text-xs text-muted-foreground">{campaign.openRate}% open rate</p>
                    </div>
                  )}
                  {campaign.status === "scheduled" && (
                    <div className="text-right">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Scheduled
                      </p>
                      <p className="text-xs text-muted-foreground">{campaign.scheduledDate}</p>
                    </div>
                  )}
                  <Badge variant="outline" className={statusStyles[campaign.status]}>
                    {campaign.status === "sent" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {campaign.status}
                  </Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-coral hover:text-coral hover:bg-coral/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Campaigns;

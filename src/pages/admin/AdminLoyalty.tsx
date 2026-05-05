import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Star, Gift, TrendingUp, Users, Zap, Plus, Edit, Trash2, ArrowUp, Send, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LoyaltyLevel {
  id: string;
  name: string;
  minPoints: number;
  color: string;
  perks: string[];
  usersCount: number;
}

interface LoyaltyCampaign {
  id: string;
  name: string;
  type: "Points Boost" | "Welcome Bonus" | "Referral";
  status: "Active" | "Scheduled" | "Ended";
  startDate: string;
  endDate: string;
  targetLevel: string;
}

interface LoyaltyUser {
  id: string;
  name: string;
  email: string;
  loyaltyLevel: string;
  points: number;
  totalSpend: number;
  visits: number;
  avatarUrl?: string;
}

const initialLevels: LoyaltyLevel[] = [
  { id: "1", name: "Bronze", minPoints: 0, color: "amber-600", perks: ["5% off bookings", "Priority notifications"], usersCount: 2450 },
  { id: "2", name: "Silver", minPoints: 500, color: "gray-400", perks: ["10% off bookings", "Free coat check", "Early access"], usersCount: 890 },
  { id: "3", name: "Gold", minPoints: 2000, color: "gold", perks: ["15% off bookings", "VIP entry", "Dedicated host", "Birthday perks"], usersCount: 320 },
  { id: "4", name: "Platinum", minPoints: 5000, color: "purple", perks: ["20% off bookings", "Concierge service", "Exclusive events", "Free upgrades", "Personal manager"], usersCount: 85 },
];

const initialCampaigns: LoyaltyCampaign[] = [
  { id: "1", name: "New Year Points Boost", type: "Points Boost", status: "Active", startDate: "2024-01-01", endDate: "2024-01-31", targetLevel: "All" },
  { id: "2", name: "Welcome to Gold", type: "Welcome Bonus", status: "Scheduled", startDate: "2024-02-01", endDate: "2024-02-28", targetLevel: "Gold" },
  { id: "3", name: "Refer a Friend 2x", type: "Referral", status: "Ended", startDate: "2023-12-01", endDate: "2023-12-31", targetLevel: "All" },
];

const mockUsers: LoyaltyUser[] = [
  { id: "1", name: "Alex Johnson", email: "alex@email.com", loyaltyLevel: "Gold", points: 2450, totalSpend: 15000, visits: 24 },
  { id: "2", name: "Maria Garcia", email: "maria@email.com", loyaltyLevel: "Silver", points: 890, totalSpend: 5200, visits: 12 },
  { id: "3", name: "James Wilson", email: "james@email.com", loyaltyLevel: "Platinum", points: 8500, totalSpend: 45000, visits: 56 },
  { id: "4", name: "Emma Davis", email: "emma@email.com", loyaltyLevel: "Bronze", points: 150, totalSpend: 800, visits: 3 },
  { id: "5", name: "Lucas Martinez", email: "lucas@email.com", loyaltyLevel: "Gold", points: 3200, totalSpend: 22000, visits: 38 },
  { id: "6", name: "Sofia Andersson", email: "sofia@email.com", loyaltyLevel: "Silver", points: 720, totalSpend: 4800, visits: 9 },
  { id: "7", name: "Noah Brown", email: "noah@email.com", loyaltyLevel: "Bronze", points: 280, totalSpend: 1500, visits: 5 },
  { id: "8", name: "Olivia Smith", email: "olivia@email.com", loyaltyLevel: "Platinum", points: 12000, totalSpend: 68000, visits: 89 },
];

const loyaltyRingColors: Record<string, string> = {
  Bronze: "ring-amber-700",
  Silver: "ring-zinc-400",
  Gold: "ring-gold",
  Platinum: "ring-purple",
};

const AdminLoyalty = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<LoyaltyLevel[]>(initialLevels);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>(initialCampaigns);
  const [pointsPerEuro, setPointsPerEuro] = useState(1);
  const [crossVenueEnabled, setCrossVenueEnabled] = useState(true);
  const [isEditLevelOpen, setIsEditLevelOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<LoyaltyLevel | null>(null);
  const [isManualLevelUpOpen, setIsManualLevelUpOpen] = useState(false);
  const [isUsersListOpen, setIsUsersListOpen] = useState(false);
  const [selectedLevelUsers, setSelectedLevelUsers] = useState<LoyaltyUser[]>([]);
  const [selectedLevelName, setSelectedLevelName] = useState("");

  const handleEditLevel = (level: LoyaltyLevel) => {
    setSelectedLevel(level);
    setIsEditLevelOpen(true);
  };

  const handleSaveLevel = () => {
    toast.success("Loyalty level updated");
    setIsEditLevelOpen(false);
  };

  const handleManualLevelUp = () => {
    toast.success("User leveled up successfully!");
    setIsManualLevelUpOpen(false);
  };

  const handlePushCampaign = () => {
    toast.success("Campaign pushed to all eligible users");
  };

  const handleViewUsers = (level: LoyaltyLevel) => {
    navigate(`/admin/loyalty/members/${level.name.toLowerCase()}`);
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/admin/guest/USR-${userId.padStart(3, '0')}`);
    setIsUsersListOpen(false);
  };

  const levelColors: Record<string, string> = {
    "amber-600": "bg-amber-900/20 text-amber-600",
    "gray-400": "bg-gray-400/20 text-gray-400",
    "gold": "bg-gold/20 text-gold",
    "purple": "bg-purple/20 text-purple",
  };

  const loyaltyBadgeColors: Record<string, string> = {
    Bronze: "bg-amber-900/20 text-amber-600",
    Silver: "bg-gray-400/20 text-gray-400",
    Gold: "bg-gold/20 text-gold",
    Platinum: "bg-purple/20 text-purple",
  };

  return (
    <AdminLayout title="Loyalty & Rewards" subtitle="Configure loyalty program and reward tiers">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Users className="w-4 h-4" /> Total Members
              </CardDescription>
              <CardTitle className="text-3xl">{levels.reduce((sum, l) => sum + l.usersCount, 0).toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Crown className="w-4 h-4" /> Platinum Members
              </CardDescription>
              <CardTitle className="text-3xl text-purple">{levels.find(l => l.name === "Platinum")?.usersCount || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Zap className="w-4 h-4" /> Points Earned Today
              </CardDescription>
              <CardTitle className="text-3xl">12,450</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Gift className="w-4 h-4" /> Rewards Redeemed
              </CardDescription>
              <CardTitle className="text-3xl">342</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <Tabs defaultValue="levels" className="space-y-6">
          <TabsList>
            <TabsTrigger value="levels">Reward Levels</TabsTrigger>
            <TabsTrigger value="settings">Points Rules</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="manual">Manual Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="levels" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-4"
            >
              {levels.map(level => (
                <Card key={level.id} className="relative cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleViewUsers(level)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={levelColors[level.color]}>
                          <Crown className="w-3 h-3 mr-1" />
                          {level.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {level.minPoints.toLocaleString()}+ points
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewUsers(level); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditLevel(level); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {level.usersCount.toLocaleString()} members
                      <span className="text-xs text-muted-foreground ml-1">(click to view)</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Perks</h4>
                      <ul className="space-y-1">
                        {level.perks.map((perk, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <Star className="w-3 h-3 text-gold" /> {perk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Points Configuration</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Points per €10 spent</Label>
                    <Input
                      type="number"
                      value={pointsPerEuro}
                      onChange={(e) => setPointsPerEuro(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Users earn {pointsPerEuro} point(s) for every €10 spent
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Cross-Venue Loyalty</Label>
                        <p className="text-xs text-muted-foreground">Points count across all cities</p>
                      </div>
                      <Switch checked={crossVenueEnabled} onCheckedChange={setCrossVenueEnabled} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Bonus Points Rules</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                    <Label>First Booking Bonus</Label>
                    <Input type="number" defaultValue={50} />
                    <p className="text-xs text-muted-foreground">Extra points on first booking</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                    <Label>Birthday Bonus</Label>
                    <Input type="number" defaultValue={100} />
                    <p className="text-xs text-muted-foreground">Bonus points on birthday month</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                    <Label>Referral Bonus</Label>
                    <Input type="number" defaultValue={200} />
                    <p className="text-xs text-muted-foreground">Points for successful referral</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => toast.success("Settings saved!")}>Save Changes</Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center"
            >
              <h3 className="text-lg font-medium">Loyalty Campaigns</h3>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> New Campaign
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card overflow-hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target Level</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(campaign => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaign.type}</Badge>
                      </TableCell>
                      <TableCell>{campaign.targetLevel}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {campaign.startDate} - {campaign.endDate}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          campaign.status === "Active" ? "bg-teal/20 text-teal" :
                          campaign.status === "Scheduled" ? "bg-gold/20 text-gold" :
                          "bg-muted text-muted-foreground"
                        }>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={handlePushCampaign}>
                          <Send className="w-3 h-3" /> Push
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 space-y-6"
            >
              <h3 className="text-lg font-medium">Manual Level Up</h3>
              <p className="text-muted-foreground">
                Manually upgrade a user's loyalty level. Use this for special cases or VIP treatment.
              </p>
              <Button onClick={() => setIsManualLevelUpOpen(true)} className="gap-2">
                <ArrowUp className="w-4 h-4" /> Level Up User
              </Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Level Dialog */}
      <Dialog open={isEditLevelOpen} onOpenChange={setIsEditLevelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedLevel?.name} Level</DialogTitle>
            <DialogDescription>Configure this loyalty tier</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Minimum Points Required</Label>
              <Input type="number" defaultValue={selectedLevel?.minPoints} />
            </div>
            <div className="space-y-2">
              <Label>Perks (one per line)</Label>
              <textarea
                className="w-full min-h-24 p-3 rounded-md border bg-background"
                defaultValue={selectedLevel?.perks.join("\n")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditLevelOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLevel}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Level Up Dialog */}
      <Dialog open={isManualLevelUpOpen} onOpenChange={setIsManualLevelUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Level Up</DialogTitle>
            <DialogDescription>Upgrade a user to a higher loyalty tier</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User Email</Label>
              <Input placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>New Level</Label>
              <Select defaultValue="Gold">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(level => (
                    <SelectItem key={level.id} value={level.name}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input placeholder="VIP treatment, special case, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManualLevelUpOpen(false)}>Cancel</Button>
            <Button onClick={handleManualLevelUp}>Level Up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users List Dialog */}
      <Dialog open={isUsersListOpen} onOpenChange={setIsUsersListOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              {selectedLevelName} Members
            </DialogTitle>
            <DialogDescription>
              {selectedLevelUsers.length} users at this loyalty level
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {selectedLevelUsers.map(user => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleViewProfile(user.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className={cn("w-10 h-10 ring-2", loyaltyRingColors[user.loyaltyLevel])}>
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{user.points.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${user.totalSpend.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">total spend</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{user.visits}</p>
                      <p className="text-xs text-muted-foreground">visits</p>
                    </div>
                  </div>
                </div>
              ))}
              {selectedLevelUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No users at this level yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminLoyalty;
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, ArrowLeft, Search, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

const mockUsers: LoyaltyUser[] = [
  { id: "1", name: "Alex Johnson", email: "alex@email.com", loyaltyLevel: "Gold", points: 2450, totalSpend: 15000, visits: 24, avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
  { id: "2", name: "Maria Garcia", email: "maria@email.com", loyaltyLevel: "Silver", points: 890, totalSpend: 5200, visits: 12, avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" },
  { id: "3", name: "James Wilson", email: "james@email.com", loyaltyLevel: "Platinum", points: 8500, totalSpend: 45000, visits: 56, avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" },
  { id: "4", name: "Emma Davis", email: "emma@email.com", loyaltyLevel: "Bronze", points: 150, totalSpend: 800, visits: 3 },
  { id: "5", name: "Lucas Martinez", email: "lucas@email.com", loyaltyLevel: "Gold", points: 3200, totalSpend: 22000, visits: 38, avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
  { id: "6", name: "Sofia Andersson", email: "sofia@email.com", loyaltyLevel: "Silver", points: 720, totalSpend: 4800, visits: 9, avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop" },
  { id: "7", name: "Noah Brown", email: "noah@email.com", loyaltyLevel: "Bronze", points: 280, totalSpend: 1500, visits: 5 },
  { id: "8", name: "Olivia Smith", email: "olivia@email.com", loyaltyLevel: "Platinum", points: 12000, totalSpend: 68000, visits: 89, avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop" },
  { id: "9", name: "Liam Johnson", email: "liam@email.com", loyaltyLevel: "Gold", points: 2800, totalSpend: 18000, visits: 32 },
  { id: "10", name: "Ava Williams", email: "ava@email.com", loyaltyLevel: "Silver", points: 650, totalSpend: 3800, visits: 8 },
];

const loyaltyRingColors: Record<string, string> = {
  Bronze: "ring-amber-700",
  Silver: "ring-zinc-400",
  Gold: "ring-gold",
  Platinum: "ring-purple",
};

const loyaltyBadgeColors: Record<string, string> = {
  Bronze: "bg-amber-900/20 text-amber-600",
  Silver: "bg-gray-400/20 text-gray-400",
  Gold: "bg-gold/20 text-gold",
  Platinum: "bg-purple/20 text-purple",
};

const AdminLoyaltyMembers = () => {
  const navigate = useNavigate();
  const { level } = useParams<{ level: string }>();
  const levelName = level ? level.charAt(0).toUpperCase() + level.slice(1) : "All";
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredUsers = mockUsers
    .filter(u => levelName === "All" || u.loyaltyLevel === levelName)
    .filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleViewProfile = (userId: string) => {
    navigate(`/admin/guest/USR-${userId.padStart(3, '0')}`);
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  return (
    <AdminLayout 
      title={`${levelName} Members`} 
      subtitle={`View all members at the ${levelName} loyalty level`}
    >
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button 
            variant="ghost" 
            onClick={() => navigate("/admin/loyalty")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Loyalty
          </Button>
          
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-gold/10">
                  <Crown className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredUsers.reduce((sum, u) => sum + u.points, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-teal/10">
                  <TrendingUp className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${filteredUsers.reduce((sum, u) => sum + u.totalSpend, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Spend</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-purple/10">
                  <Users className="w-5 h-5 text-purple" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {filteredUsers.reduce((sum, u) => sum + u.visits, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Members List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {filteredUsers.map((user, idx) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * idx }}
              className="flex items-center justify-between p-4 rounded-lg bg-card border border-border hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() => handleViewProfile(user.id)}
            >
              <div className="flex items-center gap-4">
                <Avatar className={cn("w-12 h-12 ring-2", loyaltyRingColors[user.loyaltyLevel])}>
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                  ) : null}
                  <AvatarFallback className="bg-zinc-600 text-zinc-300">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <Badge className={loyaltyBadgeColors[user.loyaltyLevel]}>
                  <Crown className="w-3 h-3 mr-1" />
                  {user.loyaltyLevel}
                </Badge>
                <div className="text-right">
                  <p className="font-semibold">{user.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${user.totalSpend.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">total spend</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{user.visits}</p>
                  <p className="text-xs text-muted-foreground">visits</p>
                </div>
              </div>
            </motion.div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No members found</p>
              <p className="text-sm">Try adjusting your search query</p>
            </div>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminLoyaltyMembers;

import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Shield,
  AlertTriangle,
  Plus,
  Eye,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FlaggedGuest {
  id: string;
  name: string;
  reason: string;
  flaggedBy: string;
  flaggedDate: string;
  severity: "warning" | "banned";
}

const flaggedGuests: FlaggedGuest[] = [
  { id: "1", name: "Robert Smith", reason: "Aggressive behavior, fight incident", flaggedBy: "Security Team", flaggedDate: "2024-01-05", severity: "banned" },
  { id: "2", name: "David Brown", reason: "Underage attempt with fake ID", flaggedBy: "Mike J.", flaggedDate: "2024-01-10", severity: "warning" },
  { id: "3", name: "Alex Turner", reason: "Drunk and disorderly", flaggedBy: "Security Team", flaggedDate: "2024-01-08", severity: "warning" },
  { id: "4", name: "Chris Wilson", reason: "Theft reported", flaggedBy: "Management", flaggedDate: "2024-01-02", severity: "banned" },
];

const MobileSecurity = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<"warning" | "banned">("warning");

  const stats = {
    flagged: flaggedGuests.filter(g => g.severity === "warning").length,
    banned: flaggedGuests.filter(g => g.severity === "banned").length,
  };

  const filteredGuests = flaggedGuests.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToList = () => {
    toast.success(`Added to ${selectedSeverity} list`);
    setIsFlagDialogOpen(false);
  };

  return (
    <AdminLayout title="Security" subtitle="">
      <div className="space-y-4 pb-24">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold text-gold">{stats.flagged}</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-coral" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Banned</p>
                <p className="text-2xl font-bold text-coral">{stats.banned}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search & Add */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Flag Guest</DialogTitle>
                <DialogDescription>Add a guest to the flagged or ban list.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Guest Name</Label>
                  <Input placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant={selectedSeverity === "warning" ? "default" : "outline"}
                      className={cn(
                        "flex-1 gap-2",
                        selectedSeverity === "warning" ? "" : "border-gold/30 text-gold hover:bg-gold/10"
                      )}
                      onClick={() => setSelectedSeverity("warning")}
                    >
                      <AlertTriangle className="w-4 h-4" /> Warning
                    </Button>
                    <Button 
                      type="button"
                      variant={selectedSeverity === "banned" ? "default" : "outline"}
                      className={cn(
                        "flex-1 gap-2",
                        selectedSeverity === "banned" ? "bg-coral hover:bg-coral/90" : "border-coral/30 text-coral hover:bg-coral/10"
                      )}
                      onClick={() => setSelectedSeverity("banned")}
                    >
                      <Shield className="w-4 h-4" /> Banned
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea placeholder="Describe the incident..." rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFlagDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddToList}>Add to List</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Lists */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs defaultValue="flagged">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="flagged" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" />
                Flagged
              </TabsTrigger>
              <TabsTrigger value="banned" className="text-xs gap-1">
                <Shield className="w-3 h-3" />
                Ban List
              </TabsTrigger>
            </TabsList>

            <TabsContent value="flagged" className="mt-3">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y divide-border">
                      {filteredGuests
                        .filter(g => g.severity === "warning")
                        .map((guest) => (
                          <FlaggedGuestRow key={guest.id} guest={guest} />
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banned" className="mt-3">
              <Card className="glass-card">
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y divide-border">
                      {filteredGuests
                        .filter(g => g.severity === "banned")
                        .map((guest) => (
                          <FlaggedGuestRow key={guest.id} guest={guest} />
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

interface FlaggedGuestRowProps {
  guest: FlaggedGuest;
}

function FlaggedGuestRow({ guest }: FlaggedGuestRowProps) {
  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate">{guest.name}</p>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] px-1.5 py-0",
                guest.severity === "banned" 
                  ? "bg-coral/20 text-coral border-coral/30" 
                  : "bg-gold/20 text-gold border-gold/30"
              )}
            >
              {guest.severity === "banned" && <Shield className="w-2.5 h-2.5 mr-0.5" />}
              {guest.severity === "warning" && <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
              {guest.severity}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{guest.reason}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {guest.flaggedBy} • {new Date(guest.flaggedDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7">
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-coral hover:text-coral hover:bg-coral/10">
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MobileSecurity;
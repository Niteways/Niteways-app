import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  QrCode,
  Search,
  Users,
  Clock,
  CheckCircle,
  UserCheck,
  UserX,
  AlertTriangle,
  Shield,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRealtimeCheckIn } from "@/hooks/useRealtimeCheckIn";
import { QRScannerModal } from "@/components/checkin/QRScannerModal";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { VenueIndicatorPill } from "@/components/layout/VenueIndicatorPill";

interface GuestEntry {
  id: string;
  name: string;
  plusGuests: number;
  payingGuests: number;
  checkedInCount: number;
  listType: "aa" | "vip" | "standard" | "promo";
  checkedIn: boolean;
  checkInTime?: string;
  isRecurring?: boolean;
  isOneDay?: boolean;
  table?: string;
  promoter?: string;
  addedAt?: string;
  notes?: string;
}

interface FlaggedGuest {
  id: string;
  name: string;
  reason: string;
  flaggedBy: string;
  flaggedDate: string;
  severity: "warning" | "banned";
}

// Fallback sample data
const sampleGuestListData: GuestEntry[] = [
  { id: "1", name: "Sophie Anderson", plusGuests: 2, payingGuests: 1, checkedInCount: 0, listType: "vip", checkedIn: false, promoter: "Marcus T.", addedAt: "18:30", notes: "Age confirmed" },
  { id: "2", name: "Michael Chen", plusGuests: 4, payingGuests: 2, checkedInCount: 3, listType: "aa", checkedIn: false, promoter: "Sarah W.", addedAt: "17:00" },
  { id: "3", name: "Emma Watson", plusGuests: 1, payingGuests: 0, checkedInCount: 0, listType: "vip", checkedIn: false, promoter: "Alex M.", addedAt: "19:00", notes: "VIP treatment" },
];

const sampleTableBookingsData: GuestEntry[] = [
  { id: "t1", name: "Alexander Lindberg", plusGuests: 5, payingGuests: 0, checkedInCount: 0, listType: "vip", checkedIn: false, table: "T2", promoter: "Marcus T.", addedAt: "14:30" },
  { id: "t2", name: "Emma Johansson", plusGuests: 7, payingGuests: 0, checkedInCount: 8, listType: "aa", checkedIn: true, checkInTime: "21:30", table: "VIP 1", promoter: "Sarah W.", addedAt: "15:45" },
];

const flaggedGuests: FlaggedGuest[] = [
  { id: "1", name: "Robert Smith", reason: "Aggressive behavior, fight incident", flaggedBy: "Security Team", flaggedDate: "2024-01-05", severity: "banned" },
  { id: "2", name: "David Brown", reason: "Underage attempt with fake ID", flaggedBy: "Mike J.", flaggedDate: "2024-01-10", severity: "warning" },
  { id: "3", name: "Alex Turner", reason: "Drunk and disorderly", flaggedBy: "Security Team", flaggedDate: "2024-01-08", severity: "warning" },
  { id: "4", name: "Chris Wilson", reason: "Theft reported", flaggedBy: "Management", flaggedDate: "2024-01-02", severity: "banned" },
];

const listTypeStyles = {
  aa: "bg-gold/20 text-gold border-gold/30",
  vip: "bg-coral/20 text-coral border-coral/30",
  standard: "bg-muted text-muted-foreground border-border",
  promo: "bg-teal/20 text-teal border-teal/30",
};

import { DEFAULT_VENUE_ID } from "@/config/venueScope";

const SecurityCheckIn = () => {
  const { impersonatedVenueId, isImpersonating } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("guest-list");
  const [selectedGuest, setSelectedGuest] = useState<GuestEntry | null>(null);
  const [guestDetailOpen, setGuestDetailOpen] = useState(false);
  const [guestNotes, setGuestNotes] = useState("");
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [securityTab, setSecurityTab] = useState("checkin");
  const [selectedListFilter, setSelectedListFilter] = useState<string>("all");

  // Real-time data from Supabase - scoped to active venue
  const {
    guestListEntries,
    recurringGuests: dbRecurringGuests,
    oneDayGuests: dbOneDayGuests,
    tableBookings: dbTableBookings,
    loading,
    checkInRecurringGuest,
    checkInOneDayGuest,
    checkInGuestListEntry,
    checkInTableBooking,
    recurringLists,
    oneDayLists,
  } = useRealtimeCheckIn({ venueId: activeVenueId });

  // Combine recurring and one-day guests
  const allDbGuests = [...dbRecurringGuests, ...dbOneDayGuests];

  // Use database data if available, otherwise use sample data
  const guests = allDbGuests.length > 0 ? allDbGuests : (guestListEntries.length > 0 ? guestListEntries : sampleGuestListData);
  const bookings = dbTableBookings.length > 0 ? dbTableBookings : sampleTableBookingsData;

  const allGuestsCount = guests.length;
  const allBookingsCount = bookings.length;
  const checkedInGuests = guests.filter(g => g.checkedIn).length;
  const checkedInBookings = bookings.filter(g => g.checkedIn).length;

  const stats = {
    total: allGuestsCount + allBookingsCount,
    checkedIn: checkedInGuests + checkedInBookings,
    pending: (allGuestsCount - checkedInGuests) + (allBookingsCount - checkedInBookings),
    banned: flaggedGuests.filter(g => g.severity === "banned").length,
  };

  // Check in a guest
  const handleCheckInOne = async (guest: GuestEntry) => {
    let success = false;
    
    if (guest.isRecurring) {
      success = await checkInRecurringGuest(guest.id);
    } else if (guest.isOneDay) {
      success = await checkInOneDayGuest(guest.id);
    } else if (guest.table) {
      success = await checkInTableBooking(guest.id);
    } else {
      success = await checkInGuestListEntry(guest.id);
    }
    
    if (success) {
      const totalParty = 1 + guest.plusGuests;
      const newCount = guest.checkedInCount + 1;
      toast.success(`Checked in ${newCount}/${totalParty}`);
      
      if (newCount >= totalParty) {
        setGuestDetailOpen(false);
      }
    }
  };

  const handleOpenGuestDetail = (guest: GuestEntry) => {
    setSelectedGuest(guest);
    setGuestNotes(guest.notes || "");
    setGuestDetailOpen(true);
  };

  const handleOpenQRScanner = () => {
    setQrScannerOpen(true);
  };

  const handleQRScan = (data: string) => {
    toast.success(`Scanned: ${data}`);
  };

  // Get all available lists for the dropdown
  const allLists = [
    ...recurringLists.map(l => ({ id: l.id, name: l.name, type: 'recurring' })),
    ...oneDayLists.map(l => ({ id: l.id, name: l.name, type: 'oneday' })),
  ];

  // Filter guests based on search and selected list
  const filterGuests = (guestList: GuestEntry[]) => {
    return guestList.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (selectedListFilter === "all") return matchesSearch;
      // Filter by list ID if selected
      return matchesSearch;
    });
  };

  const filteredGuests = filterGuests(guests);
  const filteredBookings = filterGuests(bookings);

  return (
    <AdminLayout title="Security & Check-in" subtitle="Real-time check-in dashboard and guest management">
      <div className="space-y-4">
        {/* Venue Indicator */}
        <VenueIndicatorPill />
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
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
              <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-teal" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Checked In</p>
                <p className="text-2xl font-bold text-teal">{stats.checkedIn}</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-gold">{stats.pending}</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-coral/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-coral" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ban List</p>
                <p className="text-2xl font-bold text-coral">{stats.banned}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Tabs: Check-in vs Flagged/Banned */}
        <Tabs value={securityTab} onValueChange={setSecurityTab}>
          <TabsList className="glass-card p-1 w-full md:w-auto">
            <TabsTrigger value="checkin" className="gap-2 flex-1 md:flex-none">
              <UserCheck className="w-4 h-4" />
              Check-in
            </TabsTrigger>
            <TabsTrigger value="flagged" className="gap-2 flex-1 md:flex-none">
              <AlertTriangle className="w-4 h-4" />
              Flagged
            </TabsTrigger>
            <TabsTrigger value="banned" className="gap-2 flex-1 md:flex-none">
              <Shield className="w-4 h-4" />
              Banned
            </TabsTrigger>
          </TabsList>

          {/* Check-in Tab Content */}
          <TabsContent value="checkin" className="space-y-4 mt-4">
            {/* QR Scanner Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button 
                onClick={handleOpenQRScanner}
                className="w-full gap-2 h-14 text-base"
                size="lg"
              >
                <QrCode className="w-6 h-6" />
                Open QR Scanner
              </Button>
            </motion.div>

            {/* Guest List Selector + Search */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              {allLists.length > 0 && (
                <Select value={selectedListFilter} onValueChange={setSelectedListFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select guest list" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lists</SelectItem>
                    {allLists.map(list => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </motion.div>

            {/* Filter Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-2 h-10 bg-muted/20">
                  <TabsTrigger value="guest-list" className="text-xs">
                    Guest List ({allGuestsCount})
                  </TabsTrigger>
                  <TabsTrigger value="table-bookings" className="text-xs">
                    Table Bookings ({allBookingsCount})
                  </TabsTrigger>
                </TabsList>

                {/* Guest List Tab */}
                <TabsContent value="guest-list" className="mt-3">
                  <div className="glass-card p-4">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1">
                        {filteredGuests.length > 0 ? (
                          filteredGuests.map((guest) => (
                            <GuestRow
                              key={guest.id}
                              guest={guest}
                              onClick={() => handleOpenGuestDetail(guest)}
                            />
                          ))
                        ) : (
                          <div className="p-6 text-center text-muted-foreground">
                            No guests found
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                {/* Table Bookings Tab */}
                <TabsContent value="table-bookings" className="mt-3">
                  <div className="glass-card p-4">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1">
                        {filteredBookings.length > 0 ? (
                          filteredBookings.map((guest) => (
                            <GuestRow
                              key={guest.id}
                              guest={guest}
                              onClick={() => handleOpenGuestDetail(guest)}
                              showTable
                            />
                          ))
                        ) : (
                          <div className="p-6 text-center text-muted-foreground">
                            No bookings found
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </TabsContent>

          {/* Flagged Tab Content */}
          <TabsContent value="flagged" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => setIsFlagDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Add to List
              </Button>
            </div>
            <div className="glass-card p-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {flaggedGuests.filter(g => g.severity === "warning").map((guest) => (
                    <FlaggedGuestRow key={guest.id} guest={guest} />
                  ))}
                  {flaggedGuests.filter(g => g.severity === "warning").length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                      No flagged guests
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Banned Tab Content */}
          <TabsContent value="banned" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => setIsFlagDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Add to List
              </Button>
            </div>
            <div className="glass-card p-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {flaggedGuests.filter(g => g.severity === "banned").map((guest) => (
                    <FlaggedGuestRow key={guest.id} guest={guest} />
                  ))}
                  {flaggedGuests.filter(g => g.severity === "banned").length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                      No banned guests
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Guest Detail Dialog */}
        <Dialog open={guestDetailOpen} onOpenChange={setGuestDetailOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Guest Details</DialogTitle>
              <p className="text-center text-sm text-muted-foreground">
                Review guest information before check-in.
              </p>
            </DialogHeader>
            {selectedGuest && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    value={selectedGuest.name} 
                    readOnly 
                    className="bg-muted/30 border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total Party</Label>
                    <Input 
                      value={1 + selectedGuest.plusGuests} 
                      readOnly 
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paying</Label>
                    <Input 
                      value={selectedGuest.payingGuests} 
                      readOnly 
                      className="bg-muted/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>List Type</Label>
                    <Select value={selectedGuest.listType} disabled>
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aa">AA</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="promo">Promo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedGuest.table && (
                    <div className="space-y-2">
                      <Label>Table</Label>
                      <Input 
                        value={selectedGuest.table} 
                        readOnly 
                        className="bg-muted/30"
                      />
                    </div>
                  )}
                </div>
                {guestNotes && (
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea 
                      value={guestNotes}
                      readOnly
                      className="bg-muted/30 opacity-70 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col gap-2">
              {selectedGuest && (
                <>
                  {selectedGuest.checkedIn ? (
                    <Badge className="w-full justify-center py-2 bg-teal/20 text-teal border-0">
                      All {1 + selectedGuest.plusGuests} guests checked in at {selectedGuest.checkInTime}
                    </Badge>
                  ) : (
                    <>
                      <div className="text-center text-sm text-muted-foreground mb-1">
                        {selectedGuest.checkedInCount}/{1 + selectedGuest.plusGuests} guests checked in
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => handleCheckInOne(selectedGuest)}
                      >
                        Check In Guest ({selectedGuest.checkedInCount + 1}/{1 + selectedGuest.plusGuests})
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button variant="outline" className="w-full" onClick={() => setGuestDetailOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Flag Dialog */}
        <Dialog open={isFlagDialogOpen} onOpenChange={setIsFlagDialogOpen}>
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
                  <Button variant="outline" className="flex-1 gap-2 border-gold/30 text-gold hover:bg-gold/10">
                    <AlertTriangle className="w-4 h-4" /> Warning
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 border-coral/30 text-coral hover:bg-coral/10">
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
              <Button onClick={() => setIsFlagDialogOpen(false)}>Add to List</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QR Scanner Modal */}
        <QRScannerModal 
          open={qrScannerOpen}
          onOpenChange={setQrScannerOpen}
          onScan={handleQRScan}
        />
      </div>
    </AdminLayout>
  );
};

interface GuestRowProps {
  guest: GuestEntry;
  onClick: () => void;
  showTable?: boolean;
}

function GuestRow({ guest, onClick, showTable }: GuestRowProps) {
  const totalParty = 1 + guest.plusGuests;
  const isPartiallyCheckedIn = guest.checkedInCount > 0 && guest.checkedInCount < totalParty;
  
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between py-2 px-3 gap-2 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          guest.checkedIn ? "bg-teal/20" : isPartiallyCheckedIn ? "bg-gold/20" : "bg-muted/30"
        )}>
          {guest.checkedIn ? (
            <CheckCircle className="w-4 h-4 text-teal" />
          ) : isPartiallyCheckedIn ? (
            <Clock className="w-4 h-4 text-gold" />
          ) : (
            <Clock className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1">
            <p className="font-medium text-sm truncate">{guest.name}</p>
            {guest.isRecurring && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-primary/10 text-primary border-0">
                R
              </Badge>
            )}
            {guest.isOneDay && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-gold/10 text-gold border-0">
                1D
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 border-0", listTypeStyles[guest.listType])}>
              {guest.listType.toUpperCase()}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Users className="w-3 h-3" />{guest.checkedInCount}/{totalParty}
            </span>
            {showTable && guest.table && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono border-0 bg-muted/30">
                {guest.table}
              </Badge>
            )}
            {guest.checkedIn && guest.checkInTime && (
              <span className="text-[10px] text-teal">✓ {guest.checkInTime}</span>
            )}
            {isPartiallyCheckedIn && (
              <span className="text-[10px] text-gold">{guest.checkedInCount} in</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

interface FlaggedGuestRowProps {
  guest: FlaggedGuest;
}

function FlaggedGuestRow({ guest }: FlaggedGuestRowProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      guest.severity === "banned" ? "border-coral/30 bg-coral/5" : "border-gold/30 bg-gold/5"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          guest.severity === "banned" ? "bg-coral/20" : "bg-gold/20"
        )}>
          {guest.severity === "banned" ? (
            <Shield className="w-4 h-4 text-coral" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-gold" />
          )}
        </div>
        <div>
          <p className="font-medium text-sm">{guest.name}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{guest.reason}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={guest.severity === "banned" ? "bg-coral/20 text-coral border-coral/30" : "bg-gold/20 text-gold border-gold/30"}>
          {guest.severity}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(guest.flaggedDate).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export default SecurityCheckIn;
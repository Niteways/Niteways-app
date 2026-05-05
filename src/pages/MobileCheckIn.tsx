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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  QrCode,
  Search,
  Users,
  Clock,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRealtimeCheckIn } from "@/hooks/useRealtimeCheckIn";
import { QRScannerModal } from "@/components/checkin/QRScannerModal";

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

const listTypeStyles = {
  aa: "bg-gold/20 text-gold border-gold/30",
  vip: "bg-coral/20 text-coral border-coral/30",
  standard: "bg-muted text-muted-foreground border-border",
  promo: "bg-teal/20 text-teal border-teal/30",
};

const MobileCheckIn = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("guest-list");
  const [selectedGuest, setSelectedGuest] = useState<GuestEntry | null>(null);
  const [guestDetailOpen, setGuestDetailOpen] = useState(false);
  const [guestNotes, setGuestNotes] = useState("");
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  // Real-time data from Supabase
  const {
    guestListEntries,
    recurringGuests: dbRecurringGuests,
    oneDayGuests: dbOneDayGuests,
    tableBookings: dbTableBookings,
    loading,
    checkInRecurringGuest,
    checkInOneDayGuest,
    checkInGuestListEntry,
    checkInTableBooking
  } = useRealtimeCheckIn();

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
    total: activeTab === "guest-list" ? allGuestsCount : allBookingsCount,
    checkedIn: activeTab === "guest-list" ? checkedInGuests : checkedInBookings,
    pending: activeTab === "guest-list" ? (allGuestsCount - checkedInGuests) : (allBookingsCount - checkedInBookings),
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
    // Here you would look up the guest by QR code and check them in
  };

  // Filter guests based on search
  const filterGuests = (guestList: GuestEntry[]) => {
    return guestList.filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredGuests = filterGuests(guests);
  const filteredBookings = filterGuests(bookings);

  return (
    <AdminLayout title="Check In" subtitle="">
      <div className="space-y-4 pb-24">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 text-center bg-muted/20 rounded-lg"
          >
            <p className="text-xl font-bold text-foreground">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 text-center bg-muted/20 rounded-lg"
          >
            <p className="text-xl font-bold text-teal">{stats.checkedIn}</p>
            <p className="text-[10px] text-muted-foreground">Checked In</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 text-center bg-muted/20 rounded-lg"
          >
            <p className="text-xl font-bold text-gold">{stats.pending}</p>
            <p className="text-[10px] text-muted-foreground">Pending</p>
          </motion.div>
        </div>

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

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search guests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-0 bg-muted/20"
          />
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
              <ScrollArea className="h-[400px]">
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
            </TabsContent>

            {/* Table Bookings Tab */}
            <TabsContent value="table-bookings" className="mt-3">
              <ScrollArea className="h-[400px]">
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
            </TabsContent>
          </Tabs>
        </motion.div>

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
      className="w-full flex items-center justify-between py-2 px-2 gap-2 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
          guest.checkedIn ? "bg-teal/20" : isPartiallyCheckedIn ? "bg-gold/20" : "bg-muted/30"
        )}>
          {guest.checkedIn ? (
            <CheckCircle className="w-3 h-3 text-teal" />
          ) : isPartiallyCheckedIn ? (
            <Clock className="w-3 h-3 text-gold" />
          ) : (
            <Clock className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1">
            <p className="font-medium text-xs truncate">{guest.name}</p>
            {guest.isRecurring && (
              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 bg-primary/10 text-primary border-0">
                R
              </Badge>
            )}
            {guest.isOneDay && (
              <Badge variant="outline" className="text-[7px] px-1 py-0 h-3 bg-gold/10 text-gold border-0">
                1D
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className={cn("text-[8px] px-1 py-0 h-3.5 border-0", listTypeStyles[guest.listType])}>
              {guest.listType.toUpperCase()}
            </Badge>
            <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
              <Users className="w-2 h-2" />{guest.checkedInCount}/{totalParty}
            </span>
            {showTable && guest.table && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 font-mono border-0 bg-muted/30">
                {guest.table}
              </Badge>
            )}
            {guest.checkedIn && guest.checkInTime && (
              <span className="text-[8px] text-teal">✓ {guest.checkInTime}</span>
            )}
            {isPartiallyCheckedIn && (
              <span className="text-[8px] text-gold">{guest.checkedInCount} in</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default MobileCheckIn;
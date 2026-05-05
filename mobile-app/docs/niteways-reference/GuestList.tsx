import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { GuestProfileModal } from "@/components/guests/GuestProfileModal";
import { EditGuestDialog } from "@/components/guests/EditGuestDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeGuestLists } from "@/hooks/useRealtimeGuestLists";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { VenueIndicatorPill } from "@/components/layout/VenueIndicatorPill";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Upload, Check, UserPlus, Users, Clock, Tag, Edit, Trash2, Download, CalendarIcon, ChevronLeft, ChevronRight, Settings, Star, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, subDays } from "date-fns";
import { toast } from "sonner";
interface ListType {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_VENUE_ID = "f5d0702a-6bd9-42e1-bf2d-87681c103d17";

// Guest List Section Component
const RecurringGuestListsSection = () => {
  const isMobileView = useIsMobile();
  const navigate = useNavigate();
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  const {
    recurringLists,
    oneDayLists,
    loading,
    addGuestToRecurring,
    addGuestToOneDay,
    updateRecurringGuest,
    updateOneDayGuest,
    deleteGuest,
    deleteList,
    resetRecurringList
  } = useRealtimeGuestLists({ venueId: activeVenueId });
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isEditGuestOpen, setIsEditGuestOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<any>(null);
  const [listTypes, setListTypes] = useState<ListType[]>([]);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetCountdown, setResetCountdown] = useState<string>("");
  const [newGuestData, setNewGuestData] = useState({
    name: "",
    plusGuests: 0,
    payingGuests: 0,
    listType: "Standard",
    notes: "",
    isSticky: false
  });
  const allLists = [...recurringLists, ...oneDayLists];

  // Calculate countdown to next reset
  useEffect(() => {
    if (!selectedList || selectedList.type !== "recurring" || !selectedList.resetTime) return;

    const calculateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = (selectedList.resetTime || "03:00").split(":").map(Number);
      
      // Get the list's day of week
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const targetDayIndex = daysOfWeek.indexOf(selectedList.dayOfWeek || "Wednesday");
      const currentDayIndex = now.getDay();
      
      // Calculate days until next occurrence
      let daysUntil = targetDayIndex - currentDayIndex;
      if (daysUntil < 0) daysUntil += 7;
      if (daysUntil === 0) {
        // Same day - check if time has passed
        const resetTime = new Date(now);
        resetTime.setHours(hours, minutes, 0, 0);
        if (now >= resetTime) {
          daysUntil = 7; // Next week
        }
      }
      
      const nextReset = new Date(now);
      nextReset.setDate(now.getDate() + daysUntil);
      nextReset.setHours(hours, minutes, 0, 0);
      
      const diff = nextReset.getTime() - now.getTime();
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (d > 0) {
        setResetCountdown(`${d}d ${h}h ${m}m`);
      } else if (h > 0) {
        setResetCountdown(`${h}h ${m}m`);
      } else {
        setResetCountdown(`${m}m`);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [selectedList]);

  // Fetch list types when a list is selected
  useEffect(() => {
    const fetchListTypes = async () => {
      if (!selectedList) {
        setListTypes([]);
        return;
      }
      const {
        data
      } = await supabase.from("guest_list_types").select("*").eq("list_id", selectedList.id).order("sort_order");
      if (data && data.length > 0) {
        setListTypes(data.map((t: any) => ({
          id: t.id,
          name: t.name,
          color: t.color
        })));
        // Set default list type to the first available
        setNewGuestData(prev => ({
          ...prev,
          listType: data[0].name
        }));
      } else {
        // Fallback defaults
        setListTypes([{
          id: "1",
          name: "Standard",
          color: "teal"
        }, {
          id: "2",
          name: "VIP",
          color: "coral"
        }, {
          id: "3",
          name: "AA",
          color: "gold"
        }, {
          id: "4",
          name: "Promo",
          color: "purple"
        }]);
        setNewGuestData(prev => ({
          ...prev,
          listType: "Standard"
        }));
      }
    };
    fetchListTypes();
  }, [selectedList]);
  const handleOpenFullView = (list: any) => {
    setSelectedList(list);
    setIsFullViewOpen(true);
  };
  const handleAddGuestToList = async () => {
    if (!selectedList || !newGuestData.name) return;
    if (selectedList.type === "recurring") {
      await addGuestToRecurring(selectedList.id, newGuestData.name, newGuestData.plusGuests, newGuestData.payingGuests, newGuestData.listType, newGuestData.notes, newGuestData.isSticky);
    } else {
      await addGuestToOneDay(selectedList.id, newGuestData.name, newGuestData.plusGuests, newGuestData.payingGuests, newGuestData.listType, newGuestData.notes);
    }
    setNewGuestData({
      name: "",
      plusGuests: 0,
      payingGuests: 0,
      listType: listTypes[0]?.name || "Standard",
      notes: "",
      isSticky: false
    });
    setIsAddGuestOpen(false);
  };
  const handleEditGuest = (guest: any) => {
    setEditingGuest(guest);
    setIsEditGuestOpen(true);
  };
  const handleSaveGuestEdit = async (guestId: string, updates: any) => {
    if (!selectedList) return false;
    if (selectedList.type === "recurring") {
      return await updateRecurringGuest(guestId, updates);
    } else {
      return await updateOneDayGuest(guestId, updates);
    }
  };
  const handleDeleteGuestFromList = async (guestId: string) => {
    if (!selectedList) return;
    await deleteGuest(guestId, selectedList.type);
  };

  // Calculate max paying guests based on plus guests
  const maxPayingGuests = 1 + newGuestData.plusGuests;

  // If a list is selected for full view, render the full view
  if (isFullViewOpen && selectedList) {
    const totalGuestsCount = selectedList.guests?.reduce((sum: number, g: any) => sum + 1 + g.plusGuests, 0) || 0;
    return <div className="space-y-4 relative min-h-[500px] pb-24">
        {/* Floating Add Button - Above bottom nav */}
        <Button onClick={() => setIsAddGuestOpen(true)} size="icon" className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-40 bg-gold text-black hover:bg-gold/90">
          <Plus className="w-6 h-6" />
        </Button>

        {/* Back button + header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setIsFullViewOpen(false)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold truncate">{selectedList.name}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedList.type === "recurring" ? `Every ${selectedList.dayOfWeek} • Resets at ${selectedList.resetTime}` : `Event date: ${selectedList.eventDate}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/30 px-2 py-1 rounded">
              <Users className="w-3 h-3" />
              {selectedList.guests?.length || 0}/{totalGuestsCount}
            </span>
            {selectedList.type === "recurring" && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-coral hover:text-coral hover:bg-coral/10" 
                onClick={() => setIsResetDialogOpen(true)}
                title="Reset guest list"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/guest-list/settings/${selectedList.id}?type=${selectedList.type}`)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Reset Time Countdown - Only for recurring lists */}
        {selectedList.type === "recurring" && resetCountdown && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Next Reset</p>
                <p className="text-xs text-muted-foreground">
                  {selectedList.dayOfWeek} at {selectedList.resetTime}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">{resetCountdown}</p>
              <p className="text-[10px] text-muted-foreground">until reset</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search guests..." className="pl-9 border-0 bg-muted/20" />
        </div>

        {/* Guest Table */}
        <div className="overflow-auto">
          {selectedList.guests && selectedList.guests.length > 0 ? <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs">Guest Name</TableHead>
                  <TableHead className="text-xs">Plus</TableHead>
                  <TableHead className="text-xs">Paying</TableHead>
                  <TableHead className="text-xs">List Type</TableHead>
                  <TableHead className="text-xs">Added</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Sort guests: sticky guests first, then by addedAt */}
                {[...selectedList.guests].sort((a: any, b: any) => {
              if (a.isSticky && !b.isSticky) return -1;
              if (!a.isSticky && b.isSticky) return 1;
              return 0;
            }).map((guest: any) => <TableRow key={guest.id} className={cn("border-border/50 hover:bg-muted/30", guest.isSticky && "bg-gold/5")}>
                    <TableCell className="font-medium text-sm py-2">
                      <div className="flex items-center gap-1.5">
                        {guest.isSticky && <span className="text-gold text-xs">★</span>}
                        {guest.name}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="flex items-center gap-1 text-xs">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        +{guest.plusGuests}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {guest.payingGuests || 0}/{1 + guest.plusGuests}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", guest.listType === "VIP" ? "bg-coral/20 text-coral border-coral/30" : guest.listType === "AA" ? "bg-gold/20 text-gold border-gold/30" : guest.listType === "Promo" ? "bg-teal/20 text-teal border-teal/30" : "bg-muted text-muted-foreground border-border")}>
                        {guest.listType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <div>
                        <p className="text-xs">{guest.addedBy}</p>
                        <p className="text-[10px] text-muted-foreground">{guest.addedAt}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[100px] py-2">
                      {guest.notes ? <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate text-xs text-muted-foreground">{guest.notes}</span>
                        </div> : "—"}
                    </TableCell>
                    <TableCell className="py-2">
                      {guest.checkedIn ? <Badge variant="outline" className="bg-teal/20 text-teal border-teal/30 gap-1 text-[10px] px-1.5 py-0">
                          <Check className="w-2.5 h-2.5" />
                          {guest.checkInTime}
                        </Badge> : <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px] px-1.5 py-0">
                          Pending
                        </Badge>}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        {/* Sticky toggle - only for recurring lists */}
                        {selectedList.type === "recurring" && <Button size="icon" variant="ghost" className={cn("h-7 w-7", guest.isSticky ? "text-gold" : "text-muted-foreground hover:text-gold")} onClick={async e => {
                    e.stopPropagation();
                    const newSticky = !guest.isSticky;
                    const success = await updateRecurringGuest(guest.id, {
                      isSticky: newSticky
                    });
                    if (success) {
                      toast.success(newSticky ? "Guest marked as sticky" : "Guest unmarked as sticky");
                    }
                  }} title={guest.isSticky ? "Remove sticky status" : "Mark as sticky (persists through resets)"}>
                            <Star className={cn("w-3.5 h-3.5", guest.isSticky && "fill-gold")} />
                          </Button>}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditGuest(guest)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-coral hover:text-coral hover:bg-coral/10" onClick={() => {
                    if (window.confirm("Are you sure you want to delete this guest?")) {
                      handleDeleteGuestFromList(guest.id);
                    }
                  }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table> : <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No guests on this list yet</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setIsAddGuestOpen(true)}>
                <UserPlus className="w-4 h-4" /> Add First Guest
              </Button>
            </div>}
        </div>

        {/* Add Guest - Full Page Overlay */}
        {isAddGuestOpen && <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setIsAddGuestOpen(false)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold">Add Guest</h2>
                <p className="text-xs text-muted-foreground">{selectedList?.name}</p>
              </div>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-auto p-4 pb-32">
              <div className="max-w-lg mx-auto space-y-4">
                <div className="space-y-2">
                  <Label>Guest Name</Label>
                  <Input value={newGuestData.name} onChange={e => setNewGuestData({
                ...newGuestData,
                name: e.target.value
              })} placeholder="Enter guest name" className="h-11 bg-muted/30 border-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Plus Guests</Label>
                    <Input type="number" min={0} max={20} value={newGuestData.plusGuests} onChange={e => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  setNewGuestData({
                    ...newGuestData,
                    plusGuests: val,
                    payingGuests: Math.min(newGuestData.payingGuests, val + 1)
                  });
                }} className="h-11 bg-muted/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>List Type</Label>
                    <Select value={newGuestData.listType} onValueChange={v => setNewGuestData({
                  ...newGuestData,
                  listType: v
                })}>
                      <SelectTrigger className="h-11 bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {listTypes.map(t => <SelectItem key={t.id} value={t.name}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2.5 h-2.5 rounded-full", t.color === "coral" ? "bg-coral" : t.color === "gold" ? "bg-gold" : t.color === "teal" ? "bg-teal" : t.color === "purple" ? "bg-purple-500" : t.color === "blue" ? "bg-blue-500" : t.color === "pink" ? "bg-pink-500" : t.color === "orange" ? "bg-orange-500" : t.color === "green" ? "bg-green-500" : "bg-muted")} />
                              {t.name}
                            </div>
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Paying Guests (out of {maxPayingGuests} total)</Label>
                  <Input type="number" min={0} max={maxPayingGuests} value={newGuestData.payingGuests} onChange={e => setNewGuestData({
                ...newGuestData,
                payingGuests: Math.min(parseInt(e.target.value) || 0, maxPayingGuests)
              })} className="h-11 bg-muted/30 border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea value={newGuestData.notes} onChange={e => setNewGuestData({
                ...newGuestData,
                notes: e.target.value
              })} placeholder="Age confirmed, VIP treatment, etc." className="resize-none bg-muted/30 border-border" rows={3} />
                </div>
                {/* Sticky toggle - only for recurring lists */}
                {selectedList?.type === "recurring" && <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gold" />
                      <div>
                        <p className="text-sm font-medium">Sticky Guest</p>
                        <p className="text-xs text-muted-foreground">Always appears on list and persists through resets</p>
                      </div>
                    </div>
                    <Switch checked={newGuestData.isSticky} onCheckedChange={checked => setNewGuestData({
                ...newGuestData,
                isSticky: checked
              })} />
                  </div>}
              </div>
            </div>

            {/* Action Buttons - Fixed above menu bar */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border z-50">
              <div className="max-w-lg mx-auto flex gap-3">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setIsAddGuestOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 h-11" onClick={handleAddGuestToList}>
                  Add Guest
                </Button>
              </div>
            </div>
          </div>}

        {/* Edit Guest Dialog */}
        <EditGuestDialog guest={editingGuest} open={isEditGuestOpen} onOpenChange={setIsEditGuestOpen} onSave={handleSaveGuestEdit} listTypes={listTypes} isRecurring={selectedList?.type === "recurring"} />

        {/* Reset Confirmation Dialog */}
        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-coral" />
                Reset Guest List
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to reset <strong>{selectedList?.name}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm font-medium mb-2">This action will:</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5 text-coral" />
                    Remove all non-sticky guests ({selectedList?.guests?.filter((g: any) => !g.isSticky).length || 0} guests)
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-gold" />
                    Preserve sticky guests ({selectedList?.guests?.filter((g: any) => g.isSticky).length || 0} guests)
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Reset all check-in statuses
                  </li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={async () => {
                  if (selectedList) {
                    const success = await resetRecurringList(selectedList.id);
                    if (success) {
                      setIsResetDialogOpen(false);
                    }
                  }
                }}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset List
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>;
  }

  // Main list view
  return <div className="space-y-3">
      {/* Header with title and create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Manage your guest lists </h2>
          
        </div>
        <Button onClick={() => navigate("/guest-list/create")} className="gap-2">
          <Plus className="w-4 h-4" />
          Create
        </Button>
      </div>

      {loading ? <div className="text-center py-8 text-muted-foreground">Loading guest lists...</div> : allLists.length === 0 ? <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No guest lists yet</p>
          <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => navigate("/guest-list/create")}>
            <Plus className="w-4 h-4" /> Create First List
          </Button>
        </div> : isMobileView ? <div className="flex flex-col gap-2">
          {allLists.map(list => <div key={list.id} className={cn("flex items-center justify-between py-3 px-4 rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors", !list.isActive && "opacity-50")} onClick={() => handleOpenFullView(list)}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{list.name}</span>
                <span className="text-xs text-muted-foreground">
                  {list.type === "recurring" ? list.dayOfWeek : format(new Date(list.eventDate || ""), "MMM d")}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <Users className="w-3 h-3" />{list.guestCount}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/guest-list/settings/${list.id}?type=${list.type}`)}>
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>)}
        </div> : <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {allLists.map(list => <div key={list.id} className={cn("rounded-lg cursor-pointer hover:bg-muted/30 transition-colors p-4 space-y-3 bg-muted/20", !list.isActive && "opacity-50")} onClick={() => handleOpenFullView(list)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <CalendarIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-medium truncate">{list.name}</span>
                </div>
                <Badge variant="outline" className={cn("text-[10px] px-1.5", list.type === "recurring" ? "bg-primary/10 text-primary" : "bg-gold/10 text-gold")}>
                  {list.type === "recurring" ? "Weekly" : "One Day"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {list.type === "recurring" ? `Every ${list.dayOfWeek} • ${list.resetTime}` : `Date: ${format(new Date(list.eventDate || ""), "MMM d, yyyy")}`}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {list.guestCount}
                </span>
                <span className="text-xs text-muted-foreground">
                  {list.type === "recurring" ? `Reset: ${list.lastReset}` : ""}
                </span>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="gap-1 flex-1" onClick={() => navigate(`/guest-list/settings/${list.id}?type=${list.type}`)}>
                  <Settings className="w-3 h-3" /> Settings
                </Button>
              </div>
            </div>)}
        </div>}
    </div>;
};
const GuestList = () => {
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Both mobile and desktop now use the RecurringGuestListsSection
  // which displays all lists and their guests from the database
  return (
    <AdminLayout 
      title="Guest List" 
      subtitle={isMobile ? "" : "Manage guest entries and check-ins"}
    >
      <div className={cn("space-y-4", isMobile ? "pb-20" : "space-y-6 pb-20 md:pb-0")}>
        {/* Venue Indicator */}
        <VenueIndicatorPill />
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6"
          >
            <RecurringGuestListsSection />
          </motion.div>
        )}
        {isMobile && <RecurringGuestListsSection />}
        <GuestProfileModal
          guest={selectedGuest}
          open={isProfileOpen}
          onOpenChange={setIsProfileOpen}
          currentVenueName="Skyline Lounge"
        />
      </div>
    </AdminLayout>
  );
};

export default GuestList;
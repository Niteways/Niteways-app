import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, CalendarDays, Users, Clock, Settings, Edit, Trash2, 
  UserPlus, Check, Eye, RefreshCw, Shield
} from "lucide-react";
import { toast } from "sonner";

interface RecurringList {
  id: string;
  name: string;
  dayOfWeek: string;
  resetTime: string;
  isActive: boolean;
  guestCount: number;
  lastReset: string;
  permissions: {
    roleId: string;
    roleName: string;
    canAdd: boolean;
    canAddVip: boolean;
    canAddAa: boolean;
    canView: boolean;
    canCheckIn: boolean;
  }[];
}

interface GuestEntry {
  id: string;
  name: string;
  plusGuests: number;
  listType: "standard" | "vip" | "aa";
  addedBy: string;
  addedAt: string;
  checkedIn: boolean;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const mockRoles = [
  { id: "R001", name: "Manager" },
  { id: "R002", name: "Host" },
  { id: "R003", name: "Promoter" },
  { id: "R004", name: "Security" },
  { id: "R005", name: "Staff" },
];

const mockRecurringLists: RecurringList[] = [
  {
    id: "RL001",
    name: "Crazy Wednesday",
    dayOfWeek: "Wednesday",
    resetTime: "03:00",
    isActive: true,
    guestCount: 45,
    lastReset: "2024-01-17 03:00",
    permissions: [
      { roleId: "R001", roleName: "Manager", canAdd: true, canAddVip: true, canAddAa: true, canView: true, canCheckIn: true },
      { roleId: "R002", roleName: "Host", canAdd: true, canAddVip: true, canAddAa: false, canView: true, canCheckIn: true },
      { roleId: "R003", roleName: "Promoter", canAdd: true, canAddVip: false, canAddAa: false, canView: true, canCheckIn: false },
      { roleId: "R004", roleName: "Security", canAdd: false, canAddVip: false, canAddAa: false, canView: true, canCheckIn: true },
    ],
  },
  {
    id: "RL002",
    name: "Friday Nights",
    dayOfWeek: "Friday",
    resetTime: "04:00",
    isActive: true,
    guestCount: 72,
    lastReset: "2024-01-19 04:00",
    permissions: [
      { roleId: "R001", roleName: "Manager", canAdd: true, canAddVip: true, canAddAa: true, canView: true, canCheckIn: true },
      { roleId: "R002", roleName: "Host", canAdd: true, canAddVip: true, canAddAa: true, canView: true, canCheckIn: true },
    ],
  },
  {
    id: "RL003",
    name: "Saturday Special",
    dayOfWeek: "Saturday",
    resetTime: "04:00",
    isActive: false,
    guestCount: 0,
    lastReset: "2024-01-13 04:00",
    permissions: [
      { roleId: "R001", roleName: "Manager", canAdd: true, canAddVip: true, canAddAa: true, canView: true, canCheckIn: true },
    ],
  },
];

const mockGuests: GuestEntry[] = [
  { id: "G001", name: "Sophie Anderson", plusGuests: 2, listType: "vip", addedBy: "Marcus T.", addedAt: "18:30", checkedIn: true },
  { id: "G002", name: "Michael Chen", plusGuests: 4, listType: "aa", addedBy: "Sarah W.", addedAt: "17:00", checkedIn: true },
  { id: "G003", name: "Emma Watson", plusGuests: 1, listType: "vip", addedBy: "Alex M.", addedAt: "19:00", checkedIn: false },
  { id: "G004", name: "James Wilson", plusGuests: 3, listType: "standard", addedBy: "David B.", addedAt: "15:30", checkedIn: false },
];

const listTypeStyles = {
  aa: "bg-gold/20 text-gold border-gold/30",
  vip: "bg-coral/20 text-coral border-coral/30",
  standard: "bg-muted text-muted-foreground border-border",
};

const RecurringGuestLists = () => {
  const [lists, setLists] = useState<RecurringList[]>(mockRecurringLists);
  const [selectedList, setSelectedList] = useState<RecurringList | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [guests, setGuests] = useState<GuestEntry[]>(mockGuests);
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  
  const [newList, setNewList] = useState({
    name: "",
    dayOfWeek: "Wednesday",
    resetTime: "03:00",
  });
  
  const [newGuest, setNewGuest] = useState({
    name: "",
    plusGuests: 0,
    listType: "standard" as "standard" | "vip" | "aa",
  });
  
  const [editingPermissions, setEditingPermissions] = useState<RecurringList["permissions"]>([]);

  const handleCreateList = () => {
    if (!newList.name) {
      toast.error("Please enter a list name");
      return;
    }
    const newId = `RL${String(lists.length + 1).padStart(3, "0")}`;
    setLists([...lists, {
      id: newId,
      name: newList.name,
      dayOfWeek: newList.dayOfWeek,
      resetTime: newList.resetTime,
      isActive: true,
      guestCount: 0,
      lastReset: "Never",
      permissions: mockRoles.map(role => ({
        roleId: role.id,
        roleName: role.name,
        canAdd: role.name === "Manager",
        canAddVip: role.name === "Manager",
        canAddAa: role.name === "Manager",
        canView: true,
        canCheckIn: role.name === "Manager" || role.name === "Security",
      })),
    }]);
    setNewList({ name: "", dayOfWeek: "Wednesday", resetTime: "03:00" });
    setIsCreateOpen(false);
    toast.success("Recurring guest list created");
  };

  const handleToggleActive = (listId: string) => {
    setLists(lists.map(l => l.id === listId ? { ...l, isActive: !l.isActive } : l));
    toast.success("List status updated");
  };

  const handleDeleteList = (listId: string) => {
    setLists(lists.filter(l => l.id !== listId));
    toast.success("Recurring list deleted");
  };

  const handleOpenPermissions = (list: RecurringList) => {
    setSelectedList(list);
    setEditingPermissions([...list.permissions]);
    setIsPermissionsOpen(true);
  };

  const handleSavePermissions = () => {
    if (!selectedList) return;
    setLists(lists.map(l => l.id === selectedList.id ? { ...l, permissions: editingPermissions } : l));
    setIsPermissionsOpen(false);
    setSelectedList(null);
    toast.success("Permissions updated");
  };

  const handleAddGuest = () => {
    if (!newGuest.name) {
      toast.error("Please enter guest name");
      return;
    }
    const newId = `G${String(guests.length + 1).padStart(3, "0")}`;
    setGuests([...guests, {
      id: newId,
      name: newGuest.name,
      plusGuests: newGuest.plusGuests,
      listType: newGuest.listType,
      addedBy: "Current User",
      addedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      checkedIn: false,
    }]);
    setNewGuest({ name: "", plusGuests: 0, listType: "standard" });
    setIsAddGuestOpen(false);
    toast.success("Guest added to list");
  };

  const handleCheckIn = (guestId: string) => {
    setGuests(guests.map(g => g.id === guestId ? { ...g, checkedIn: true } : g));
    toast.success("Guest checked in");
  };

  return (
    <AdminLayout title="Recurring Guest Lists" subtitle="Manage weekly recurring guest lists with automatic reset">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <RefreshCw className="w-3 h-3" />
              Auto-reset after 24h
            </Badge>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Recurring List
          </Button>
        </div>

        {/* Recurring Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={!list.isActive ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                    </div>
                    <Switch 
                      checked={list.isActive} 
                      onCheckedChange={() => handleToggleActive(list.id)}
                    />
                  </div>
                  <CardDescription className="flex items-center gap-4">
                    <span>Every {list.dayOfWeek}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Resets at {list.resetTime}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Current Guests</span>
                      </div>
                      <span className="font-bold">{list.guestCount}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last reset: {list.lastReset}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={() => setSelectedList(list)}
                      >
                        <Eye className="w-3 h-3" /> View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => handleOpenPermissions(list)}
                      >
                        <Shield className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteList(list.id)}
                      >
                        <Trash2 className="w-3 h-3 text-coral" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Selected List Details */}
        {selectedList && !isPermissionsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedList.name} - Guest List</CardTitle>
                  <CardDescription>
                    {selectedList.dayOfWeek} • Resets at {selectedList.resetTime}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedList(null)}>
                    Close
                  </Button>
                  <Button onClick={() => setIsAddGuestOpen(true)} className="gap-2">
                    <UserPlus className="w-4 h-4" /> Add Guest
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Plus</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guests.map(guest => (
                      <TableRow key={guest.id}>
                        <TableCell className="font-medium">{guest.name}</TableCell>
                        <TableCell>+{guest.plusGuests}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={listTypeStyles[guest.listType]}>
                            {guest.listType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{guest.addedBy}</TableCell>
                        <TableCell>{guest.addedAt}</TableCell>
                        <TableCell>
                          {guest.checkedIn ? (
                            <Badge className="bg-teal/20 text-teal">Checked In</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!guest.checkedIn && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleCheckIn(guest.id)}
                            >
                              <Check className="w-4 h-4 text-teal" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Create List Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Recurring Guest List</DialogTitle>
              <DialogDescription>
                Create a weekly recurring guest list that automatically resets
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>List Name</Label>
                <Input 
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                  placeholder="e.g., Crazy Wednesday"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select 
                    value={newList.dayOfWeek} 
                    onValueChange={(v) => setNewList({ ...newList, dayOfWeek: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reset Time (24h after)</Label>
                  <Input 
                    type="time"
                    value={newList.resetTime}
                    onChange={(e) => setNewList({ ...newList, resetTime: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                The guest list will automatically clear 24 hours after {newList.dayOfWeek} begins, 
                at {newList.resetTime}.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateList}>Create List</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Permissions - {selectedList?.name}</DialogTitle>
              <DialogDescription>
                Set what each role can do on this recurring guest list
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Add Standard</TableHead>
                    <TableHead className="text-center">Add VIP</TableHead>
                    <TableHead className="text-center">Add AA</TableHead>
                    <TableHead className="text-center">View</TableHead>
                    <TableHead className="text-center">Check In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingPermissions.map((perm, idx) => (
                    <TableRow key={perm.roleId}>
                      <TableCell className="font-medium">{perm.roleName}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={perm.canAdd}
                          onCheckedChange={(c) => {
                            const updated = [...editingPermissions];
                            updated[idx] = { ...perm, canAdd: !!c };
                            setEditingPermissions(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={perm.canAddVip}
                          onCheckedChange={(c) => {
                            const updated = [...editingPermissions];
                            updated[idx] = { ...perm, canAddVip: !!c };
                            setEditingPermissions(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={perm.canAddAa}
                          onCheckedChange={(c) => {
                            const updated = [...editingPermissions];
                            updated[idx] = { ...perm, canAddAa: !!c };
                            setEditingPermissions(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={perm.canView}
                          onCheckedChange={(c) => {
                            const updated = [...editingPermissions];
                            updated[idx] = { ...perm, canView: !!c };
                            setEditingPermissions(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={perm.canCheckIn}
                          onCheckedChange={(c) => {
                            const updated = [...editingPermissions];
                            updated[idx] = { ...perm, canCheckIn: !!c };
                            setEditingPermissions(updated);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPermissionsOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePermissions}>Save Permissions</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Guest Dialog */}
        <Dialog open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Guest to List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Guest Name</Label>
                <Input 
                  value={newGuest.name}
                  onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plus Guests</Label>
                  <Input 
                    type="number"
                    value={newGuest.plusGuests}
                    onChange={(e) => setNewGuest({ ...newGuest, plusGuests: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>List Type</Label>
                  <Select 
                    value={newGuest.listType}
                    onValueChange={(v) => setNewGuest({ ...newGuest, listType: v as any })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="aa">AA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddGuestOpen(false)}>Cancel</Button>
              <Button onClick={handleAddGuest}>Add Guest</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default RecurringGuestLists;
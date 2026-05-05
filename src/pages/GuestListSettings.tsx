import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Trash2, Plus, Users, Palette, Mail, Building } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/contexts/ImpersonationContext";

const DEFAULT_VENUE_ID = "f5d0702a-6bd9-42e1-bf2d-87681c103d17";

interface ListType {
  id: string;
  name: string;
  color: string;
}

interface Permission {
  managerId: string;
  managerName: string;
  managerEmail?: string;
  isExternal?: boolean;
  guestLimit?: number | null; // null means no limit
  canView: boolean;
  canCheckIn: boolean;
  canAddStandard: boolean;
  canAddVIP: boolean;
  canAddAA: boolean;
  canDelete: boolean;
}

const AVAILABLE_COLORS = [
  { name: "Teal", value: "teal", class: "bg-teal" },
  { name: "Coral", value: "coral", class: "bg-coral" },
  { name: "Gold", value: "gold", class: "bg-gold" },
  { name: "Purple", value: "purple", class: "bg-purple-500" },
  { name: "Blue", value: "blue", class: "bg-blue-500" },
  { name: "Green", value: "green", class: "bg-green-500" },
  { name: "Pink", value: "pink", class: "bg-pink-500" },
  { name: "Orange", value: "orange", class: "bg-orange-500" },
];

const allManagers = [
  { id: "M001", name: "John Smith", email: "john@company.com", role: "Manager" },
  { id: "M002", name: "Sarah Wilson", email: "sarah@company.com", role: "Host" },
  { id: "M003", name: "Mike Johnson", email: "mike@company.com", role: "Promoter" },
  { id: "M004", name: "Emily Brown", email: "emily@company.com", role: "Security" },
  { id: "M005", name: "David Lee", email: "david@company.com", role: "Staff" },
];

const GuestListSettings = () => {
  const { listId } = useParams();
  const navigate = useNavigate();
  const { isImpersonating, impersonatedVenueId } = useImpersonation();
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : DEFAULT_VENUE_ID;
  
  const [listName, setListName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Wednesday");
  const [resetTime, setResetTime] = useState("03:00");
  const [isActive, setIsActive] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddExternalManagerOpen, setIsAddExternalManagerOpen] = useState(false);
  const [newExternalManager, setNewExternalManager] = useState({ name: "", email: "", guestLimit: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [listType, setListType] = useState<"recurring" | "oneday">("recurring");
  
  const [listTypes, setListTypes] = useState<ListType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("teal");
  
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const daysOfWeekMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Fetch list data from database
  useEffect(() => {
    const fetchListData = async () => {
      if (!listId) {
        setIsLoading(false);
        return;
      }

      try {
        // First try to fetch as recurring list
        const { data: recurringData, error: recurringError } = await supabase
          .from("recurring_guest_lists")
          .select("*")
          .eq("id", listId)
          .maybeSingle();

        if (recurringData) {
          setListName(recurringData.name);
          setDayOfWeek(daysOfWeekMap[recurringData.day_of_week] || "Wednesday");
          setResetTime(recurringData.reset_time || "03:00");
          setIsActive(recurringData.is_active);
          setListType("recurring");

          // Fetch list types for this list
          const { data: typesData } = await supabase
            .from("guest_list_types")
            .select("*")
            .eq("list_id", listId)
            .order("sort_order");

          if (typesData && typesData.length > 0) {
            setListTypes(typesData.map(t => ({
              id: t.id,
              name: t.name,
              color: t.color
            })));
          } else {
            // Default types if none exist
            setListTypes([
              { id: "1", name: "Standard", color: "teal" },
              { id: "2", name: "VIP", color: "coral" },
              { id: "3", name: "AA", color: "gold" },
            ]);
          }

          // Fetch permissions
          const { data: permData } = await supabase
            .from("recurring_list_permissions")
            .select("*")
            .eq("recurring_list_id", listId);

          if (permData) {
            setPermissions(permData.map(p => ({
              managerId: p.manager_id,
              managerName: p.manager_name,
              canView: p.can_view,
              canCheckIn: p.can_check_in,
              canAddStandard: p.can_add_standard,
              canAddVIP: p.can_add_vip,
              canAddAA: p.can_add_aa,
              canDelete: p.can_delete,
              guestLimit: null
            })));
          }
        } else {
          // Try as one-day list
          const { data: oneDayData } = await supabase
            .from("one_day_guest_lists")
            .select("*")
            .eq("id", listId)
            .maybeSingle();

          if (oneDayData) {
            setListName(oneDayData.name);
            setIsActive(oneDayData.is_active);
            setListType("oneday");
            
            // Default types
            setListTypes([
              { id: "1", name: "Standard", color: "teal" },
              { id: "2", name: "VIP", color: "coral" },
              { id: "3", name: "AA", color: "gold" },
            ]);
          }
        }
      } catch (error) {
        console.error("Error fetching list data:", error);
        toast.error("Failed to load list data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListData();
  }, [listId]);
  const permissionFields = [
    { key: "canView", label: "View" },
    { key: "canCheckIn", label: "Check In" },
    { key: "canAddStandard", label: "Add Standard" },
    { key: "canAddVIP", label: "Add VIP" },
    { key: "canAddAA", label: "Add AA" },
    { key: "canDelete", label: "Delete" },
  ];

  const handleSave = async () => {
    try {
      if (!listId) return;
      
      // Update list settings
      if (listType === "recurring") {
        const dayIndex = daysOfWeek.indexOf(dayOfWeek);
        await supabase
          .from("recurring_guest_lists")
          .update({
            name: listName,
            day_of_week: dayIndex === -1 ? 3 : dayIndex + 1,
            reset_time: resetTime,
            is_active: isActive,
          })
          .eq("id", listId);
      } else {
        await supabase
          .from("one_day_guest_lists")
          .update({
            name: listName,
            is_active: isActive,
          })
          .eq("id", listId);
      }

      // Delete existing list types for this list and insert new ones
      await supabase.from("guest_list_types").delete().eq("list_id", listId);
      
      if (listTypes.length > 0) {
        const typesToInsert = listTypes.map((lt, idx) => ({
          name: lt.name,
          color: lt.color,
          list_id: listId,
          venue_id: activeVenueId,
          sort_order: idx,
        }));
        await supabase.from("guest_list_types").insert(typesToInsert);
      }

      // Delete existing permissions and insert new ones
      await supabase.from("recurring_list_permissions").delete().eq("recurring_list_id", listId);
      
      if (permissions.length > 0 && listType === "recurring") {
        const permsToInsert = permissions.map(p => ({
          recurring_list_id: listId,
          manager_id: p.managerId,
          manager_name: p.managerName,
          can_view: p.canView,
          can_check_in: p.canCheckIn,
          can_add_standard: p.canAddStandard,
          can_add_vip: p.canAddVIP,
          can_add_aa: p.canAddAA,
          can_delete: p.canDelete,
        }));
        await supabase.from("recurring_list_permissions").insert(permsToInsert);
      }

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handleDelete = async () => {
    try {
      if (!listId) return;

      // Shared: delete list types (these are linked by list_id)
      await supabase.from("guest_list_types").delete().eq("list_id", listId);

      if (listType === "recurring") {
        await supabase.from("recurring_list_permissions").delete().eq("recurring_list_id", listId);
        await supabase.from("recurring_list_guests").delete().eq("recurring_list_id", listId);
        const { error } = await supabase.from("recurring_guest_lists").delete().eq("id", listId);
        if (error) throw error;
      } else {
        await supabase.from("one_day_list_guests").delete().eq("list_id", listId);
        const { error } = await supabase.from("one_day_guest_lists").delete().eq("id", listId);
        if (error) throw error;
      }

      toast.success("Guest list deleted");
      navigate("/guest-list");
    } catch (error) {
      console.error("Failed to delete guest list:", error);
      toast.error("Failed to delete guest list");
    }
  };

  const handleAddListType = async () => {
    if (!newTypeName) return;
    const newType = {
      id: Date.now().toString(),
      name: newTypeName,
      color: newTypeColor,
    };
    setListTypes([...listTypes, newType]);
    setNewTypeName("");
    setNewTypeColor("teal");
    
    // Save to DB immediately if we have a listId
    if (listId) {
      try {
        await supabase.from("guest_list_types").insert({
          name: newType.name,
          color: newType.color,
          list_id: listId,
          venue_id: activeVenueId,
          sort_order: listTypes.length,
        });
        toast.success("List type added and synced");
      } catch (error) {
        toast.error("Failed to sync list type");
      }
    } else {
      toast.success("List type added");
    }
  };

  const handleRemoveListType = async (typeId: string) => {
    setListTypes(listTypes.filter(t => t.id !== typeId));
    
    // Delete from DB immediately
    try {
      await supabase.from("guest_list_types").delete().eq("id", typeId);
      toast.success("List type removed");
    } catch (error) {
      // Type might be local-only
      toast.success("List type removed");
    }
  };

  const handleTogglePermission = (managerId: string, field: string) => {
    const existingPerm = permissions.find(p => p.managerId === managerId);
    
    if (existingPerm) {
      setPermissions(permissions.map(p => 
        p.managerId === managerId ? { ...p, [field]: !p[field as keyof Permission] } : p
      ));
    } else {
      const manager = allManagers.find(m => m.id === managerId);
      setPermissions([...permissions, {
        managerId,
        managerName: manager?.name || "",
        canView: field === "canView",
        canCheckIn: field === "canCheckIn",
        canAddStandard: field === "canAddStandard",
        canAddVIP: field === "canAddVIP",
        canAddAA: field === "canAddAA",
        canDelete: field === "canDelete",
        guestLimit: null,
      }]);
    }
  };

  const handleAddExternalManager = () => {
    if (!newExternalManager.name || !newExternalManager.email) {
      toast.error("Please enter name and email");
      return;
    }
    const newPerm: Permission = {
      managerId: `EXT-${Date.now()}`,
      managerName: newExternalManager.name,
      managerEmail: newExternalManager.email,
      isExternal: true,
      guestLimit: newExternalManager.guestLimit ? parseInt(newExternalManager.guestLimit) : null,
      canView: true,
      canCheckIn: false,
      canAddStandard: true,
      canAddVIP: false,
      canAddAA: false,
      canDelete: false,
    };
    setPermissions([...permissions, newPerm]);
    setNewExternalManager({ name: "", email: "", guestLimit: "" });
    setIsAddExternalManagerOpen(false);
    toast.success("External manager added");
  };

  const handleUpdateGuestLimit = (managerId: string, limit: string) => {
    setPermissions(permissions.map(p =>
      p.managerId === managerId
        ? { ...p, guestLimit: limit === "" || limit === "0" ? null : parseInt(limit) }
        : p
    ));
  };

  const handleRemoveManager = (managerId: string) => {
    setPermissions(permissions.filter(p => p.managerId !== managerId));
    toast.success("Manager removed");
  };

  const getPermission = (managerId: string, field: string): boolean => {
    const perm = permissions.find(p => p.managerId === managerId);
    return perm ? Boolean(perm[field as keyof Permission]) : false;
  };

  const getColorClass = (color: string) => {
    const found = AVAILABLE_COLORS.find(c => c.value === color);
    return found?.class || "bg-teal";
  };

  return (
    <AdminLayout title="Guest List Settings" subtitle="">
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/guest-list")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{listName} Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your guest list configuration</p>
          </div>
        </div>

        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 space-y-4"
        >
          <h3 className="font-semibold">General Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>List Name</Label>
              <Input 
                value={listName} 
                onChange={(e) => setListName(e.target.value)}
                placeholder="Enter list name"
              />
            </div>
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reset Time</Label>
              <Input 
                type="time" 
                value={resetTime}
                onChange={(e) => setResetTime(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div>
                <Label>Active Status</Label>
                <p className="text-xs text-muted-foreground">Enable or disable this guest list</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </motion.div>

        {/* List Types & Colors */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4" />
              List Types & Colors
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {listTypes.map(type => (
              <div key={type.id} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2">
                <div className={cn("w-3 h-3 rounded-full", getColorClass(type.color))} />
                <span className="text-sm font-medium">{type.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-coral hover:text-coral"
                  onClick={() => handleRemoveListType(type.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label>Add New Type</Label>
              <Input 
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Type name"
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>Color</Label>
              <Select value={newTypeColor} onValueChange={setNewTypeColor}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", getColorClass(newTypeColor))} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COLORS.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", color.class)} />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddListType} className="gap-1">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </motion.div>

        {/* Access / Permissions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Access Permissions
            </h3>
            <Button size="sm" className="gap-1" onClick={() => setIsAddExternalManagerOpen(true)}>
              <Plus className="w-4 h-4" />
              Add External
            </Button>
          </div>

          {/* External Managers Section */}
          {permissions.filter(p => p.isExternal).length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> External Managers
              </Label>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Manager</TableHead>
                      <TableHead className="text-center text-xs min-w-[60px]">Limit</TableHead>
                      {permissionFields.map(field => (
                        <TableHead key={field.key} className="text-center text-xs min-w-[70px]">{field.label}</TableHead>
                      ))}
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.filter(p => p.isExternal).map(perm => (
                      <TableRow key={perm.managerId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{perm.managerName}</p>
                            <p className="text-xs text-muted-foreground">{perm.managerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            className="w-16 h-7 text-xs mx-auto"
                            placeholder="∞"
                            value={perm.guestLimit || ""}
                            onChange={(e) => handleUpdateGuestLimit(perm.managerId, e.target.value)}
                          />
                        </TableCell>
                        {permissionFields.map(field => (
                          <TableCell key={field.key} className="text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(perm[field.key as keyof Permission])}
                              onChange={() => handleTogglePermission(perm.managerId, field.key)}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-coral hover:text-coral"
                            onClick={() => handleRemoveManager(perm.managerId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Team Management Section */}
          <div className="space-y-2 mb-4">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Building className="w-3 h-3" /> Team Management Access
            </Label>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Manager</TableHead>
                    <TableHead className="text-center text-xs min-w-[60px]">Role</TableHead>
                    <TableHead className="text-center text-xs min-w-[60px]">Limit</TableHead>
                    {permissionFields.map(field => (
                      <TableHead key={field.key} className="text-center text-xs min-w-[80px]">{field.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allManagers.map(manager => (
                    <TableRow key={manager.id}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        <div>
                          <p className="text-sm">{manager.name}</p>
                          <p className="text-xs text-muted-foreground">{manager.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {manager.role}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          className="w-16 h-7 text-xs mx-auto"
                          placeholder="∞"
                          value={permissions.find(p => p.managerId === manager.id)?.guestLimit || ""}
                          onChange={(e) => handleUpdateGuestLimit(manager.id, e.target.value)}
                        />
                      </TableCell>
                      {permissionFields.map(field => (
                        <TableCell key={field.key} className="text-center">
                          <input
                            type="checkbox"
                            checked={getPermission(manager.id, field.key)}
                            onChange={() => handleTogglePermission(manager.id, field.key)}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-coral/30 rounded-lg p-6 space-y-4"
        >
          <h3 className="font-semibold text-coral">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            Deleting this guest list will remove all guests and settings permanently.
          </p>
          <Button
            variant="outline"
            className="text-coral border-coral/30 hover:bg-coral/10"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Guest List
          </Button>
        </motion.div>

        {/* Save Button */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate("/guest-list")}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Guest List</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{listName}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add External Manager Dialog */}
        <Dialog open={isAddExternalManagerOpen} onOpenChange={setIsAddExternalManagerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add External Manager</DialogTitle>
              <DialogDescription>
                Add a manager from outside your company who can add guests to this list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newExternalManager.name}
                  onChange={(e) => setNewExternalManager({...newExternalManager, name: e.target.value})}
                  placeholder="Manager name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newExternalManager.email}
                  onChange={(e) => setNewExternalManager({...newExternalManager, email: e.target.value})}
                  placeholder="manager@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Guest Limit</Label>
                <Input
                  type="number"
                  value={newExternalManager.guestLimit}
                  onChange={(e) => setNewExternalManager({...newExternalManager, guestLimit: e.target.value})}
                  placeholder="Leave empty for no limit"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of guests this manager can add. Leave empty for unlimited.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddExternalManagerOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExternalManager}>
                Add Manager
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default GuestListSettings;
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star } from "lucide-react";

interface ListTypeOption {
  name: string;
  color: string;
}

interface Guest {
  id: string;
  name: string;
  plusGuests: number;
  payingGuests?: number;
  listType: string;
  notes?: string;
  isSticky?: boolean;
}

interface EditGuestDialogProps {
  guest: Guest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (guestId: string, updates: {
    guestName?: string;
    plusGuests?: number;
    payingGuests?: number;
    listType?: string;
    notes?: string;
    isSticky?: boolean;
  }) => Promise<boolean>;
  listTypes?: ListTypeOption[];
  isRecurring?: boolean;
}

export const EditGuestDialog = ({ guest, open, onOpenChange, onSave, listTypes, isRecurring }: EditGuestDialogProps) => {
  const [name, setName] = useState("");
  const [plusGuests, setPlusGuests] = useState(0);
  const [payingGuests, setPayingGuests] = useState(0);
  const [listType, setListType] = useState("Standard");
  const [notes, setNotes] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fallback list types if none provided
  const typeOptions: ListTypeOption[] = listTypes && listTypes.length > 0 
    ? listTypes 
    : [
        { name: "Standard", color: "teal" },
        { name: "VIP", color: "coral" },
        { name: "AA", color: "gold" },
        { name: "Promo", color: "purple" },
      ];

  // Populate form when guest changes
  useEffect(() => {
    if (guest) {
      setName(guest.name);
      setPlusGuests(guest.plusGuests);
      setPayingGuests(guest.payingGuests || 0);
      setListType(guest.listType);
      setNotes(guest.notes || "");
      setIsSticky(guest.isSticky || false);
    }
  }, [guest]);

  const handleSave = async () => {
    if (!guest) return;
    
    setIsSaving(true);
    try {
      const success = await onSave(guest.id, {
        guestName: name,
        plusGuests,
        payingGuests,
        listType,
        notes,
        isSticky,
      });
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate max paying guests (can't be more than total party)
  const totalParty = 1 + plusGuests;
  const maxPayingGuests = totalParty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Guest</DialogTitle>
          <DialogDescription>
            Update guest information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Guest Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter guest name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plus Guests</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={plusGuests}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setPlusGuests(val);
                  // Adjust paying guests if it exceeds new total
                  if (payingGuests > val + 1) {
                    setPayingGuests(val + 1);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>List Type</Label>
              <Select value={listType} onValueChange={setListType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          t.color === "coral" ? "bg-coral" :
                          t.color === "gold" ? "bg-gold" :
                          t.color === "teal" ? "bg-teal" :
                          t.color === "purple" ? "bg-purple-500" :
                          t.color === "blue" ? "bg-blue-500" :
                          t.color === "pink" ? "bg-pink-500" :
                          t.color === "orange" ? "bg-orange-500" :
                          t.color === "green" ? "bg-green-500" : "bg-muted"
                        }`} />
                        {t.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Paying Guests (out of {maxPayingGuests} total)</Label>
            <Input
              type="number"
              min={0}
              max={maxPayingGuests}
              value={payingGuests}
              onChange={(e) => setPayingGuests(Math.min(parseInt(e.target.value) || 0, maxPayingGuests))}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Age confirmed, VIP treatment, etc."
              className="resize-none"
              rows={2}
            />
          </div>
          {/* Sticky toggle - only for recurring lists */}
          {isRecurring && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gold" />
                <div>
                  <p className="text-sm font-medium">Sticky Guest</p>
                  <p className="text-xs text-muted-foreground">Always appears on list and persists through resets</p>
                </div>
              </div>
              <Switch checked={isSticky} onCheckedChange={setIsSticky} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name || isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

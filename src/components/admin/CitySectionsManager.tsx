import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { useCitySections, useCitySectionsMutation, CitySection } from "@/hooks/useCitySections";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CitySectionsManagerProps {
  cityId: string;
  cityName: string;
  venues: { id: string; name: string }[];
}

interface SortableSectionCardProps {
  section: CitySection;
  venues: { id: string; name: string }[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onToggleVenue: (venueId: string, isAssigned: boolean) => void;
}

function SortableSectionCard({ section, venues, isExpanded, onToggleExpand, onDelete, onToggleVenue }: SortableSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignedVenueIds = section.venues.map(v => v.venue_id);

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`overflow-hidden transition-all ${isDragging ? "scale-[1.02] shadow-lg ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-center gap-3 p-4">
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-muted"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        <button 
          onClick={onToggleExpand}
          className="flex-1 flex items-center justify-between hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
        >
          <span className="font-medium">{section.title}</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{section.venues.length} venues</Badge>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      
      {isExpanded && (
        <div className="border-t border-border p-4 bg-muted/20">
          <Label className="mb-3 block">Assign Venues to this Section</Label>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {venues.map((venue) => {
              const isAssigned = assignedVenueIds.includes(venue.id);
              return (
                <label
                  key={venue.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={() => onToggleVenue(venue.id, isAssigned)}
                  />
                  <span className="text-sm truncate">{venue.name}</span>
                </label>
              );
            })}
          </div>
          {venues.length === 0 && (
            <p className="text-sm text-muted-foreground">No venues in this city yet.</p>
          )}
        </div>
      )}
    </Card>
  );
}

export function CitySectionsManager({ cityId, cityName, venues }: CitySectionsManagerProps) {
  const { data: sections = [], isLoading, refetch } = useCitySections(cityId);
  const { createSection, deleteSection, addVenueToSection, removeVenueFromSection } = useCitySectionsMutation();
  
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s: CitySection) => s.id === active.id);
    const newIndex = sections.findIndex((s: CitySection) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSections = arrayMove(sections, oldIndex, newIndex);

    try {
      // Update each section's sort_order
      for (let i = 0; i < reorderedSections.length; i++) {
        const section = reorderedSections[i];
        if (section.sort_order !== i) {
          await supabase
            .from("city_venue_sections")
            .update({ sort_order: i })
            .eq("id", section.id);
        }
      }

      await refetch();
      toast.success("Section order updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to reorder sections");
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) {
      toast.error("Please enter a section title");
      return;
    }
    setIsCreating(true);
    try {
      await createSection(cityId, newSectionTitle, "");
      setNewSectionTitle("");
      toast.success("Section created!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create section");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await deleteSection(sectionId);
      toast.success("Section deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete section");
    }
  };

  const handleToggleVenue = async (sectionId: string, venueId: string, isCurrentlyAssigned: boolean) => {
    try {
      if (isCurrentlyAssigned) {
        await removeVenueFromSection(sectionId, venueId);
      } else {
        await addVenueToSection(sectionId, venueId);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update venue assignment");
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading sections...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Custom Sections for {cityName}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create custom sections like "Popular in {cityName}" or "Best Nightclubs" and assign venues.
          <strong> Drag sections to reorder them.</strong>
        </p>
      </div>

      {/* Create New Section */}
      <Card className="p-4">
        <Label className="mb-2 block">Create New Section</Label>
        <p className="text-xs text-muted-foreground mb-3">
          You can include emojis directly in the title (e.g., "Popular in {cityName} 🔥")
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="e.g., Popular in Stockholm 🔥 or Best Nightclubs"
              onKeyDown={(e) => e.key === "Enter" && handleCreateSection()}
            />
          </div>
          <Button onClick={handleCreateSection} disabled={isCreating}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </Card>

      {/* Existing Sections */}
      {sections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No custom sections yet. Create one above to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s: CitySection) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {sections.map((section: CitySection) => (
                <SortableSectionCard
                  key={section.id}
                  section={section}
                  venues={venues}
                  isExpanded={expandedSection === section.id}
                  onToggleExpand={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onToggleVenue={(venueId, isAssigned) => handleToggleVenue(section.id, venueId, isAssigned)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

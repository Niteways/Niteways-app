import { useState, useEffect, useCallback, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { VenueIndicatorPill } from "@/components/layout/VenueIndicatorPill";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  Grid3X3,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Globe,
  Settings,
  Circle,
  Square,
  RectangleHorizontal,
  Wine,
  Music,
  DoorOpen,
  Loader2,
  Sofa,
  Users,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTableSync } from "@/hooks/useTableSync";
import { Link } from "react-router-dom";
import { useImpersonation } from "@/contexts/ImpersonationContext";

interface FloorElement {
  id: string;
  type: "table" | "booth" | "bar" | "dj" | "entrance" | "restroom" | "wall" | "plant";
  shape: "rectangle" | "circle" | "rounded";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  capacity?: number;
  price?: number;
  status?: string;
  guestName?: string;
  isStatic?: boolean;
}

// Color palette matching table booking
const TABLE_COLORS = [
  { name: "Teal", value: "teal", hex: "#14b8a6" },
  { name: "Gold", value: "gold", hex: "#eab308" },
  { name: "Coral", value: "coral", hex: "#f97316" },
  { name: "Purple", value: "purple", hex: "#8b5cf6" },
  { name: "Blue", value: "blue", hex: "#3b82f6" },
  { name: "Green", value: "green", hex: "#22c55e" },
];

const SHAPES = [
  { name: "Circle", value: "circle", icon: Circle },
  { name: "Rectangle", value: "rectangle", icon: Square },
  { name: "Rounded", value: "rounded", icon: RectangleHorizontal },
];

import { getPortalScopeVenueId } from "@/config/venueScope";

// Canvas dimensions
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 450;

const FloorMapEditor = () => {
  const { impersonatedVenueId, isImpersonating } = useImpersonation();
  
  // Use impersonated venue when in impersonation mode
  const activeVenueId = isImpersonating && impersonatedVenueId ? impersonatedVenueId : getPortalScopeVenueId();
  
  // Always scope tables to the active venue (prevents leaking demo venue data)
  const { tables: syncedTables, addTable, deleteTable, updateTable, refetch } = useTableSync({ venueId: activeVenueId });
  
  const [elements, setElements] = useState<FloorElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [userAppZoom, setUserAppZoom] = useState(100); // Zoom level for user app display
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newElementType, setNewElementType] = useState<"table" | "booth" | "bar" | "dj" | "entrance">("table");
  const [bookings, setBookings] = useState<any[]>([]);
  const [staticElements, setStaticElements] = useState<FloorElement[]>([
    { id: "bar1", type: "bar", shape: "rounded", label: "Bar", x: 50, y: 380, width: 180, height: 50, rotation: 0, color: "#64748b", isStatic: true },
    { id: "dj1", type: "dj", shape: "rounded", label: "DJ", x: 280, y: 380, width: 100, height: 55, rotation: 0, color: "#94a3b8", isStatic: true },
    { id: "ent1", type: "entrance", shape: "rectangle", label: "Entry", x: 430, y: 380, width: 90, height: 50, rotation: 0, color: "#64748b", isStatic: true },
  ]);

  const selected = elements.find(e => e.id === selectedElement) || staticElements.find(e => e.id === selectedElement);
  const isSelectedStatic = staticElements.some(e => e.id === selectedElement);

  // Fetch bookings for real-time status
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    const fetchBookings = async () => {
      const { data } = await supabase
        .from("table_bookings")
        .select("*")
        .eq("venue_id", activeVenueId)
        .eq("booking_date", today)
        .neq("status", "cancelled");
      setBookings(data || []);
    };

    fetchBookings();

    const channel = supabase
      .channel(`floor-editor-bookings-${activeVenueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_bookings",
          filter: `venue_id=eq.${activeVenueId}`,
        },
        fetchBookings
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeVenueId]);

  // Load elements from synced tables AND static elements from floor_plan_rooms
  useEffect(() => {
    const loadElements = async () => {
      // Try to load saved positions from floor_plan_rooms
        const { data: floorPlans } = await supabase
          .from("floor_plans")
          .select("id")
          .eq("venue_id", activeVenueId)
          .order("updated_at", { ascending: false })
          .limit(1);

      let savedPositions: Record<string, any> = {};
      let savedStaticElements: FloorElement[] = [];
      
      if (floorPlans?.[0]) {
        const { data: rooms } = await supabase
          .from("floor_plan_rooms")
          .select("elements")
          .eq("floor_plan_id", floorPlans[0].id)
          .limit(1);

        if (rooms?.[0]?.elements) {
          const savedElements = rooms[0].elements as unknown as FloorElement[];
          savedElements.forEach(el => {
            if (el.isStatic) {
              savedStaticElements.push(el);
            } else {
              savedPositions[el.label] = { x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation, shape: el.shape };
            }
          });
          
          // If we have saved static elements, use those instead of defaults
          if (savedStaticElements.length > 0) {
            setStaticElements(savedStaticElements);
          }
        }
      }

      if (syncedTables.length === 0) return;

      // Map synced tables to floor elements with saved positions
      const loadedElements: FloorElement[] = syncedTables.map((table, index) => {
        const saved = savedPositions[table.label];
        const row = Math.floor(index / 5);
        const col = index % 5;
        const isVip = table.type === "booth" || table.label.toLowerCase().includes("vip");
        
        // Default positions if not saved
        const defaultX = isVip ? 50 + (index % 3) * 170 : 50 + col * 110;
        const defaultY = isVip ? 280 : 80 + row * 100;
        const defaultWidth = isVip ? 130 : 70;
        const defaultHeight = isVip ? 80 : 70;

        // Get booking status
        const booking = bookings.find(b => b.table_number === table.label);
        let status = "available";
        let guestName = undefined;
        if (booking) {
          status = booking.status;
          guestName = booking.guest_name;
        }

        return {
          id: table.id,
          type: isVip ? "booth" : "table",
          shape: saved?.shape || (isVip ? "rounded" : "circle"),
          label: table.label,
          x: saved?.x ?? defaultX,
          y: saved?.y ?? defaultY,
          width: saved?.width ?? defaultWidth,
          height: saved?.height ?? defaultHeight,
          rotation: saved?.rotation ?? 0,
          color: table.color || "teal",
          capacity: table.capacity,
          price: table.basePrice,
          status,
          guestName,
        };
      });
      setElements(loadedElements);
    };
    loadElements();
   }, [syncedTables, bookings, activeVenueId]);

  // Enrich elements with booking status
  const enrichedElements = useMemo(() => {
    return elements.map(el => {
      const booking = bookings.find(b => b.table_number === el.label);
      if (!booking) return { ...el, status: "available", guestName: undefined };
      return {
        ...el,
        status: booking.status,
        guestName: booking.status !== "blocked" ? booking.guest_name : "BLOCKED",
      };
    });
  }, [elements, bookings]);

  const getColorHex = (colorName: string): string => {
    const found = TABLE_COLORS.find(c => c.value === colorName);
    return found?.hex || colorName;
  };

  const getStatusColor = (status: string, baseColor: string): string => {
    if (status === "blocked") return "#ef4444";
    if (status === "pending") return "#3b82f6";
    if (status === "confirmed" || status === "reserved") return "#eab308";
    return getColorHex(baseColor);
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string, isStatic: boolean = false) => {
    e.stopPropagation();
    const element = isStatic 
      ? staticElements.find(el => el.id === elementId) 
      : elements.find(el => el.id === elementId);
    if (!element) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragging({
      id: elementId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
    setSelectedElement(elementId);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;

    const canvas = e.currentTarget.getBoundingClientRect();
    const element = elements.find(el => el.id === dragging.id) || staticElements.find(el => el.id === dragging.id);
    if (!element) return;

    let newX = (e.clientX - canvas.left - dragging.offsetX) / zoom;
    let newY = (e.clientY - canvas.top - dragging.offsetY) / zoom;

    // Snap to grid
    if (showGrid) {
      newX = Math.round(newX / 10) * 10;
      newY = Math.round(newY / 10) * 10;
    }

    // Keep within bounds - FULL CANVAS
    newX = Math.max(0, Math.min(CANVAS_WIDTH - element.width, newX));
    newY = Math.max(0, Math.min(CANVAS_HEIGHT - element.height, newY));

    const isStaticElement = staticElements.some(el => el.id === dragging.id);
    if (isStaticElement) {
      setStaticElements(prev => prev.map(el =>
        el.id === dragging.id ? { ...el, x: newX, y: newY } : el
      ));
    } else {
      setElements(prev => prev.map(el =>
        el.id === dragging.id ? { ...el, x: newX, y: newY } : el
      ));
    }
    setHasChanges(true);
  }, [dragging, elements, staticElements, zoom, showGrid]);

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleAddElement = async () => {
    // Only add tables/booths to the database
    if (newElementType === "table" || newElementType === "booth") {
      const isVip = newElementType === "booth";
      const tableCount = elements.filter(e => e.type === "table").length;
      const boothCount = elements.filter(e => e.type === "booth").length;
      const label = isVip ? `VIP ${boothCount + 1}` : `T${tableCount + 1}`;

      try {
        const result = await addTable({
          label,
          type: newElementType,
          capacity: isVip ? 10 : 4,
          basePrice: isVip ? 5000 : 1000,
          minSpend: isVip ? 3000 : 500,
          color: isVip ? "coral" : "teal",
          zone: isVip ? "vip" : "main",
          depositPercent: isVip ? 30 : 20,
          status: "active",
          requiresApproval: false,
          venueId: activeVenueId, // Explicit venue scope - critical for impersonation
        });
        if (result) {
          toast.success(`${label} added - Configure in Table Settings`);
          setIsAddDialogOpen(false);
          // Force refetch to ensure UI updates
          await refetch();
        }
      } catch (error: any) {
        console.error("Failed to add table:", error);
        toast.error(error?.message || "Failed to add table");
      }
    } else {
      // Add static elements locally
      const countByType = staticElements.filter(e => e.type === newElementType).length;
      const labelMap = { bar: "Bar", dj: "DJ", entrance: "Entry" };
      const newStatic: FloorElement = {
        id: `${newElementType}-${Date.now()}`,
        type: newElementType,
        shape: "rounded",
        label: `${labelMap[newElementType as keyof typeof labelMap] || newElementType} ${countByType + 1}`,
        x: 250,
        y: 200,
        width: newElementType === "bar" ? 150 : 100,
        height: 50,
        rotation: 0,
        color: "#64748b",
        isStatic: true,
      };
      setStaticElements(prev => [...prev, newStatic]);
      setHasChanges(true);
      toast.success(`${newStatic.label} added`);
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteElement = async () => {
    if (!selected) return;
    if (isSelectedStatic) {
      setStaticElements(prev => prev.filter(e => e.id !== selected.id));
      setSelectedElement(null);
      setHasChanges(true);
      toast.success(`${selected.label} removed`);
    } else {
      try {
        await deleteTable(selected.id);
        setSelectedElement(null);
        toast.success(`${selected.label} removed`);
      } catch (error) {
        toast.error("Failed to delete table");
      }
    }
  };

  const handleColorChange = async (color: string) => {
    if (!selected) return;
    try {
      await updateTable(selected.id, { color });
      setElements(prev => prev.map(el =>
        el.id === selected.id ? { ...el, color } : el
      ));
    } catch (error) {
      toast.error("Failed to update color");
    }
  };

  const handleShapeChange = (shape: string) => {
    if (!selected) return;
    setElements(prev => prev.map(el =>
      el.id === selected.id ? { ...el, shape: shape as FloorElement["shape"] } : el
    ));
    setHasChanges(true);
  };

  const handleSizeChange = (dimension: "width" | "height", value: number) => {
    if (!selected) return;
    setElements(prev => prev.map(el =>
      el.id === selected.id ? { ...el, [dimension]: value } : el
    ));
    setHasChanges(true);
  };

  const handleRotate = () => {
    if (!selected) return;
    setElements(prev => prev.map(el =>
      el.id === selected.id ? { ...el, rotation: (el.rotation + 45) % 360 } : el
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get or create floor plan for the active venue
      let floorPlanId: string;
      const { data: existingPlans } = await supabase
        .from("floor_plans")
        .select("id")
        .eq("venue_id", activeVenueId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (existingPlans?.[0]) {
        floorPlanId = existingPlans[0].id;
      } else {
        const { data: newPlan } = await supabase
          .from("floor_plans")
          .insert({ venue_id: activeVenueId, name: "Main Floor Plan", is_draft: true })
          .select()
          .single();
        floorPlanId = newPlan!.id;
      }

      // Save room with all elements (avoid upsert-onConflict errors on fresh venues)
      const allElements = [...elements, ...staticElements];
      const roomPayload = {
        floor_plan_id: floorPlanId,
        name: "Main Floor",
        elements: JSON.parse(JSON.stringify(allElements)),
        zones: [{ id: "main", name: "Main Floor", color: "teal" }],
        sort_order: 0,
      };

      const { data: existingRoom, error: roomFetchError } = await supabase
        .from("floor_plan_rooms")
        .select("id")
        .eq("floor_plan_id", floorPlanId)
        .eq("name", "Main Floor")
        .maybeSingle();

      if (roomFetchError) throw roomFetchError;

      if (existingRoom?.id) {
        const { error: updateError } = await supabase
          .from("floor_plan_rooms")
          .update(roomPayload)
          .eq("id", existingRoom.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("floor_plan_rooms")
          .insert(roomPayload);
        if (insertError) throw insertError;
      }

      // Update element_data in venue_tables for each table
      for (const el of elements) {
        await supabase
          .from("venue_tables")
          .update({
            element_data: {
              position: { x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation },
              shape: el.shape,
              userAppZoom,
            }
          })
          .eq("id", el.id);
      }

      setHasChanges(false);
      toast.success("Floor map saved");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save floor map");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await handleSave();
      await supabase
        .from("floor_plans")
        .update({ is_published: true, is_draft: false })
        .eq("venue_id", activeVenueId);

      toast.success("Floor map published!");
    } catch (error) {
      toast.error("Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const renderElement = (element: FloorElement, isStatic: boolean = false) => {
    const isSelected = selectedElement === element.id;
    const isTable = element.type === "table" || element.type === "booth";
    const statusColor = getStatusColor(element.status || "available", element.color);
    
    let borderRadius = "8px";
    if (element.shape === "circle") borderRadius = "9999px";
    else if (element.shape === "rounded") borderRadius = "16px";

    // Status is now indicated by color overlay only - no emoji badges

    return (
      <motion.div
        key={element.id}
        className={cn(
          "absolute flex flex-col items-center justify-center cursor-move transition-all border-2",
          isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background z-20",
        )}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          transform: `rotate(${element.rotation}deg)`,
          borderColor: statusColor,
          backgroundColor: `${statusColor}20`,
          borderRadius,
        }}
        onMouseDown={(e) => handleMouseDown(e, element.id, isStatic)}
        onClick={() => setSelectedElement(element.id)}
        whileHover={{ scale: 1.02 }}
      >
        {/* Status is indicated by border/background color - no emoji badge */}
        
        {/* Icon */}
        <div className="flex items-center justify-center" style={{ color: statusColor }}>
          {element.type === "bar" && <Wine className="w-4 h-4" />}
          {element.type === "dj" && <Music className="w-4 h-4" />}
          {element.type === "entrance" && <DoorOpen className="w-4 h-4" />}
          {element.type === "table" && <Circle className="w-3 h-3" />}
          {element.type === "booth" && <Sofa className="w-4 h-4" />}
        </div>
        
        {/* Label */}
        <span 
          className="text-[10px] font-bold mt-0.5 text-center leading-tight"
          style={{ color: statusColor, transform: `rotate(-${element.rotation}deg)` }}
        >
          {element.label}
        </span>

        {/* Guest name if booked */}
        {element.guestName && (
          <span className="text-[8px] opacity-80 truncate max-w-full px-1" style={{ color: statusColor }}>
            {element.guestName}
          </span>
        )}
      </motion.div>
    );
  };

  return (
    <AdminLayout 
      title="Floor Map Editor" 
      subtitle={`${elements.length} tables synced · Drag to position`}
    >
      <div className="space-y-4">
        {/* Venue Indicator */}
        <VenueIndicatorPill />
        
        {/* Compact Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add
            </Button>
            
            <Button variant="ghost" size="sm" onClick={() => setShowGrid(!showGrid)} className={cn(showGrid && "bg-muted")}>
              <Grid3X3 className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs w-10 text-center font-medium">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/table-settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>

            <Button variant="outline" size="sm" onClick={handleSave} disabled={!hasChanges || isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>

            <Button size="sm" onClick={handlePublish} disabled={isPublishing} className="gap-2 bg-teal hover:bg-teal/90">
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Publish
            </Button>
          </div>
        </motion.div>

        {/* Main Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-4">
          {/* Canvas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-xl border overflow-hidden"
          >
            <div
              className="relative overflow-auto"
              style={{ 
                width: "100%", 
                height: 520,
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                className="relative origin-top-left"
                style={{ 
                  transform: `scale(${zoom})`,
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  minWidth: CANVAS_WIDTH,
                  minHeight: CANVAS_HEIGHT,
                }}
              >
                {/* Background */}
                <div className="absolute inset-0 bg-muted/30" />
                
                {/* Grid */}
                {showGrid && (
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                )}

                {/* Static elements */}
                {staticElements.map(el => renderElement(el, true))}

                {/* Draggable table elements */}
                {enrichedElements.map(el => renderElement(el, false))}
              </div>
            </div>
          </motion.div>

          {/* Properties Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Properties</h3>
                {selected && <Badge variant="outline">{selected.label}</Badge>}
              </div>

              {selected ? (
                <div className="space-y-4">
                  {/* Shape picker */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Shape</Label>
                    <div className="flex gap-1">
                      {SHAPES.map(shape => (
                        <Button
                          key={shape.value}
                          size="sm"
                          variant={selected.shape === shape.value ? "default" : "outline"}
                          onClick={() => handleShapeChange(shape.value)}
                          className="flex-1 p-2"
                        >
                          <shape.icon className="w-4 h-4" />
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Size controls */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Width</Label>
                        <span className="text-xs">{selected.width}px</span>
                      </div>
                      <Slider
                        value={[selected.width]}
                        min={40}
                        max={200}
                        step={10}
                        onValueChange={([v]) => handleSizeChange("width", v)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Height</Label>
                        <span className="text-xs">{selected.height}px</span>
                      </div>
                      <Slider
                        value={[selected.height]}
                        min={40}
                        max={200}
                        step={10}
                        onValueChange={([v]) => handleSizeChange("height", v)}
                      />
                    </div>
                  </div>

                  {/* Color picker */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {TABLE_COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => handleColorChange(color.value)}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 transition-all",
                            selected.color === color.value ? "ring-2 ring-offset-2 ring-white scale-110" : "hover:scale-110"
                          )}
                          style={{ backgroundColor: color.hex, borderColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Rotation */}
                  <Button variant="outline" size="sm" onClick={handleRotate} className="w-full gap-2">
                    <RotateCw className="w-4 h-4" />
                    Rotate 45°
                  </Button>

                  {/* Table Info */}
                  <div className="pt-3 border-t space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Capacity</span>
                      <span>{selected.capacity || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Price</span>
                      <span>${selected.price?.toLocaleString() || "—"}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      Edit in <Link to="/table-settings" className="text-teal hover:underline">Table Settings</Link>
                    </p>
                  </div>

                  {/* Delete */}
                  <Button variant="destructive" size="sm" onClick={handleDeleteElement} className="w-full gap-2">
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Move className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a table</p>
                  <p className="text-xs mt-1">Drag to reposition</p>
                </div>
              )}
            </Card>

            {/* User App Zoom */}
            <Card className="p-4 space-y-3">
              <Label className="text-xs text-muted-foreground">User App Display Zoom</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[userAppZoom]}
                  min={50}
                  max={100}
                  step={5}
                  onValueChange={([v]) => { setUserAppZoom(v); setHasChanges(true); }}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-10">{userAppZoom}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Scale the floor map display in the guest app
              </p>
            </Card>

            {/* Legend */}
            <Card className="p-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Status Legend</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: "rgba(20, 184, 166, 0.3)", borderColor: "#14b8a6" }} />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: "rgba(59, 130, 246, 0.3)", borderColor: "#3b82f6" }} />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: "rgba(234, 179, 8, 0.3)", borderColor: "#eab308" }} />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: "rgba(239, 68, 68, 0.3)", borderColor: "#ef4444" }} />
                  <span>Blocked</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Add Table Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
            <DialogDescription>
              Add a new table. Configure pricing in Table Settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newElementType} onValueChange={(v) => setNewElementType(v as typeof newElementType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4" />
                      Regular Table
                    </div>
                  </SelectItem>
                  <SelectItem value="booth">
                    <div className="flex items-center gap-2">
                      <Sofa className="w-4 h-4" />
                      VIP Booth
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <Wine className="w-4 h-4" />
                      Bar
                    </div>
                  </SelectItem>
                  <SelectItem value="dj">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      DJ Booth
                    </div>
                  </SelectItem>
                  <SelectItem value="entrance">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="w-4 h-4" />
                      Entrance
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddElement}>
              Add Element
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default FloorMapEditor;

import { useState, useEffect, useMemo } from "react";
import { Circle, Sofa, Wine, Music, DoorOpen, Square, Users, Clock, DollarSign, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FloorMapElement } from "@/hooks/useFloorMapData";

export interface FloorMapTable {
  id: string;
  label: string;
  type: "table" | "booth" | "vip_area" | "bar" | "dj" | "entrance" | "wall" | "divider" | "stage" | "restroom" | "plant" | "decoration";
  shape?: "rectangle" | "circle" | "rounded" | "line";
  capacity?: number;
  basePrice?: number;
  minSpend?: number;
  color: string;
  zone?: string;
  status: "available" | "reserved" | "occupied" | "blocked" | "pending" | "confirmed";
  guestName?: string;
  guestCount?: number;
  time?: string;
  notes?: string;
  bookingId?: string;
  venueId?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  showLabel?: boolean;
}

interface FloorMapBooking {
  id: string;
  table_number: string;
  guest_name: string;
  party_size: number;
  booking_time: string;
  status: string;
  notes?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_id?: string | null;
}

interface UnifiedFloorMapProps {
  tables?: FloorMapTable[];
  elements?: FloorMapElement[];
  bookings?: FloorMapBooking[];
  selectedTableId?: string | null;
  onTableSelect?: (table: FloorMapTable) => void;
  onAccept?: (tableId: string, bookingId: string) => void;
  onDecline?: (tableId: string, bookingId: string) => void;
  onBlock?: (tableId: string) => void;
  onUnblock?: (tableId: string) => void;
  showActions?: boolean;
  variant?: "admin" | "user-app";
  className?: string;
  getTablePrice?: (table: FloorMapTable) => number;
  userAppZoom?: number; // 50-100, controls the scale of the user app display
}

const TABLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  teal: { bg: "bg-teal/20", border: "border-teal", text: "text-teal" },
  gold: { bg: "bg-gold/20", border: "border-gold", text: "text-gold" },
  coral: { bg: "bg-coral/20", border: "border-coral", text: "text-coral" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-500" },
  blue: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-500" },
  green: { bg: "bg-green-500/20", border: "border-green-500", text: "text-green-500" },
  red: { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-500" },
  amber: { bg: "bg-amber-500/20", border: "border-amber-500", text: "text-amber-500" },
};

const getElementColors = (table: FloorMapTable) => {
  if (table.status === "blocked") {
    return "bg-red-500/20 border-red-500 text-red-500";
  }
  if (table.status === "pending") {
    return "bg-blue-500/20 border-blue-500 text-blue-500";
  }
  if (table.status === "reserved" || table.status === "confirmed") {
    return "bg-gold/20 border-gold text-gold";
  }
  if (table.status === "occupied") {
    return "bg-coral/20 border-coral text-coral";
  }
  
  const colorConfig = TABLE_COLORS[table.color];
  if (colorConfig) {
    return `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`;
  }
  return "bg-teal/20 border-teal text-teal";
};

const statusLabels: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  confirmed: "Confirmed",
  pending: "Pending Request",
  blocked: "Blocked",
};

export function UnifiedFloorMap({
  tables = [],
  elements = [],
  bookings = [],
  selectedTableId,
  onTableSelect,
  onAccept,
  onDecline,
  onBlock,
  onUnblock,
  showActions = true,
  variant = "admin",
  className,
  getTablePrice,
  userAppZoom = 100,
}: UnifiedFloorMapProps) {
  // Use elements if provided, otherwise convert tables to elements format
  const allElements = useMemo(() => {
    if (elements.length > 0) {
      return elements.map(el => ({
        id: el.id,
        label: el.label,
        type: el.type as FloorMapTable["type"],
        shape: el.shape,
        capacity: el.capacity,
        basePrice: el.price,
        minSpend: el.minSpend,
        color: el.color,
        zone: el.zone,
        status: el.status,
        guestName: el.guestName,
        guestCount: el.guestCount,
        time: el.time,
        notes: el.notes,
        bookingId: el.bookingId,
        venueId: el.venueId,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        showLabel: el.showLabel,
      })) as FloorMapTable[];
    }
    return tables;
  }, [tables, elements]);

  // Merge tables with booking data
  const enrichedTables = useMemo(() => {
    return allElements.map(table => {
      const booking = bookings.find(b => b.table_number === table.label);
      if (!booking) return { ...table, status: table.status || "available" as const };

      let status: FloorMapTable["status"] = "available";
      if (booking.status === "blocked") status = "blocked";
      else if (booking.status === "pending") status = "pending";
      else if (booking.status === "confirmed" || booking.status === "completed") status = "reserved";
      else if (booking.status === "cancelled") return { ...table, status: "available" as const };

      return {
        ...table,
        status,
        guestName: booking.status !== "blocked" ? booking.guest_name : "BLOCKED",
        guestCount: booking.party_size,
        time: booking.booking_time,
        notes: booking.notes || undefined,
        bookingId: booking.id,
      };
    });
  }, [allElements, bookings]);

  // Separate by type
  const tableElements = enrichedTables.filter(t => t.type === "table" || t.type === "booth" || t.type === "vip_area");
  const vipTables = tableElements.filter(t => t.type === "booth" || t.zone === "vip" || t.label.toLowerCase().includes("vip"));
  const regularTables = tableElements.filter(t => t.type === "table" && t.zone !== "vip" && !t.label.toLowerCase().includes("vip"));
  const staticElements = enrichedTables.filter(t => !["table", "booth", "vip_area"].includes(t.type));

  const selectedTable = enrichedTables.find(t => t.id === selectedTableId);

  const handleTableClick = (table: FloorMapTable) => {
    onTableSelect?.(table);
  };

  if (variant === "user-app") {
    // User app: show full canvas scaled to fit container without scrolling
    const adminCanvasWidth = 600;
    const adminCanvasHeight = 450;
    // Apply user app zoom (50-100%)
    const zoomScale = userAppZoom / 100;
    
    return (
      <div className={cn("relative w-full", className)}>
        <div className="relative bg-background rounded-xl overflow-hidden border border-border">
          {/* Fixed aspect ratio container - no scrolling */}
          <div 
            className="relative w-full" 
            style={{ 
              aspectRatio: `${adminCanvasWidth} / ${adminCanvasHeight}`,
            }}
          >
            {/* Scaled content container */}
            <div 
              className="absolute inset-0"
              style={{ 
                transform: `scale(${zoomScale})`, 
                transformOrigin: "center center",
              }}
            >
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }} />
              
              {/* Render static elements */}
              {staticElements.map((el) => {
                const leftPct = ((el.x || 50) / adminCanvasWidth) * 100;
                const topPct = ((el.y || 380) / adminCanvasHeight) * 100;
                const widthPct = ((el.width || 100) / adminCanvasWidth) * 100;
                const heightPct = ((el.height || 50) / adminCanvasHeight) * 100;
                
                return (
                  <div
                    key={el.id}
                    className="absolute bg-muted/30 rounded border border-border flex items-center justify-center"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                  >
                    {el.type === "bar" && <Wine className="w-3 h-3 text-muted-foreground" />}
                    {el.type === "dj" && <Music className="w-3 h-3 text-muted-foreground" />}
                    {el.type === "entrance" && <DoorOpen className="w-3 h-3 text-muted-foreground" />}
                    {el.showLabel !== false && (
                      <span className="text-[8px] text-muted-foreground font-medium truncate px-1 ml-1">{el.label}</span>
                    )}
                  </div>
                );
              })}
              
              {/* Render table elements */}
              {tableElements.map((table) => {
                const isSelected = selectedTableId === table.id;
                const isVip = table.type === "booth" || table.zone === "vip" || table.label.toLowerCase().includes("vip");
                
                const leftPct = ((table.x || 100) / adminCanvasWidth) * 100;
                const topPct = ((table.y || 100) / adminCanvasHeight) * 100;
                const widthPct = Math.max(10, ((table.width || 70) / adminCanvasWidth) * 100);
                const heightPct = Math.max(12, ((table.height || 70) / adminCanvasHeight) * 100);
                
                const price = getTablePrice ? getTablePrice(table) : table.basePrice;
                
                return (
                  <button
                    key={table.id}
                    onClick={() => handleTableClick(table)}
                    className={cn(
                      "absolute flex flex-col items-center justify-center transition-all duration-200 rounded-lg",
                      isSelected 
                        ? isVip 
                          ? "ring-2 ring-amber-500 scale-105 z-10 bg-amber-500/30" 
                          : "ring-2 ring-primary scale-105 z-10 bg-primary/30" 
                        : isVip 
                          ? "hover:scale-105 bg-amber-500/15 border border-amber-500/40"
                          : "hover:scale-105 bg-primary/15 border border-primary/40"
                    )}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      transform: table.rotation ? `rotate(${table.rotation}deg)` : undefined,
                    }}
                  >
                    {isVip ? (
                      <Sofa className={cn("w-3 h-3 mb-0.5", isSelected ? "text-amber-400" : "text-amber-500/60")} />
                    ) : (
                      <Circle className={cn("w-3 h-3 mb-0.5", isSelected ? "text-primary" : "text-primary/60")} />
                    )}
                    <span className={cn(
                      "text-[9px] font-bold truncate max-w-full px-0.5",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {table.label}
                    </span>
                    <span className={cn(
                      "text-[8px] font-semibold",
                      isSelected ? (isVip ? "text-amber-400" : "text-primary") : (isVip ? "text-amber-400/80" : "text-primary/80")
                    )}>
                      €{price}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 py-2 border-t border-border bg-background">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/30 border border-primary/40" />
              <span className="text-[10px] text-muted-foreground">Standard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/40" />
              <span className="text-[10px] text-muted-foreground">VIP</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin variant - use actual positions from database if available
  // Default positions for tables when no x/y exists
  const defaultPositions: Record<string, { x: number; y: number; width: number; height: number }> = {
    "T1": { x: 50, y: 80, width: 70, height: 70 },
    "T2": { x: 160, y: 80, width: 70, height: 70 },
    "T3": { x: 270, y: 80, width: 70, height: 70 },
    "T4": { x: 380, y: 80, width: 70, height: 70 },
    "T5": { x: 490, y: 80, width: 70, height: 70 },
    "T6": { x: 50, y: 180, width: 70, height: 70 },
    "T7": { x: 160, y: 180, width: 70, height: 70 },
    "T8": { x: 270, y: 180, width: 70, height: 70 },
    "T9": { x: 380, y: 180, width: 70, height: 70 },
    "VIP 1": { x: 50, y: 280, width: 120, height: 80 },
    "VIP 2": { x: 200, y: 280, width: 120, height: 80 },
    "VIP 3": { x: 350, y: 280, width: 120, height: 80 },
  };

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div 
        className="relative w-full h-full rounded-lg border border-border bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:20px_20px] bg-muted/20"
        style={{ minHeight: 450 }}
      >
        {/* Render static elements (bar, dj, entrance) */}
        {staticElements.map((el) => (
          <div
            key={el.id}
            className="absolute rounded-lg border-2 flex flex-col items-center justify-center bg-muted/30 border-muted-foreground/30"
            style={{ 
              left: el.x || 50, 
              top: el.y || 380, 
              width: el.width || 100, 
              height: el.height || 50 
            }}
          >
            {el.type === "bar" && <Wine className="w-5 h-5 text-muted-foreground" />}
            {el.type === "dj" && <Music className="w-5 h-5 text-muted-foreground" />}
            {el.type === "entrance" && <DoorOpen className="w-5 h-5 text-muted-foreground" />}
            {el.showLabel !== false && (
              <span className="text-xs font-bold mt-1 text-muted-foreground">{el.label}</span>
            )}
          </div>
        ))}
        
        {/* Render tables */}
        {tableElements.map((table, index) => {
          const isVip = table.type === "booth" || table.zone === "vip";
          
          // Use table's stored position or calculate default
          const defaultPos = defaultPositions[table.label];
          const row = Math.floor(index / 5);
          const col = index % 5;
          const fallbackX = isVip ? 50 + (index % 3) * 150 : 50 + col * 110;
          const fallbackY = isVip ? 280 : 80 + row * 100;
          
          const x = table.x ?? defaultPos?.x ?? fallbackX;
          const y = table.y ?? defaultPos?.y ?? fallbackY;
          const width = table.width ?? defaultPos?.width ?? (isVip ? 120 : 70);
          const height = table.height ?? defaultPos?.height ?? (isVip ? 80 : 70);
          
          const Icon = isVip ? Sofa : Circle;
          const isPending = table.status === "pending";
          
          return (
            <div
              key={table.id}
              className={cn(
                "absolute rounded-lg border-2 flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105",
                getElementColors(table),
                isPending && "animate-pulse",
                selectedTableId === table.id && "ring-2 ring-primary"
              )}
              style={{ 
                left: x, 
                top: y, 
                width, 
                height,
                transform: table.rotation ? `rotate(${table.rotation}deg)` : undefined
              }}
              onClick={() => handleTableClick(table)}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-bold mt-1">{table.label}</span>
              {table.status === "blocked" ? (
                <span className="text-[10px] opacity-70">BLOCKED</span>
              ) : (
                <>
                  <span className="text-[10px] opacity-70">{table.capacity} pax</span>
                  <span className="text-[10px] opacity-70">${table.basePrice}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected table info panel for admin */}
      {showActions && selectedTable && (
        <div className="mt-4 p-4 rounded-lg bg-muted/20 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">{selectedTable.label}</h4>
              <Badge variant="outline" className={cn("mt-1", getElementColors(selectedTable))}>
                {statusLabels[selectedTable.status]}
              </Badge>
            </div>
            {selectedTable.guestName && selectedTable.guestName !== "BLOCKED" && (
              <div className="text-right">
                <p className="text-sm font-medium">{selectedTable.guestName}</p>
                <p className="text-xs text-muted-foreground">{selectedTable.guestCount} guests • {selectedTable.time}</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            {selectedTable.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 bg-teal hover:bg-teal/90"
                  onClick={() => selectedTable.bookingId && onAccept?.(selectedTable.id, selectedTable.bookingId)}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => selectedTable.bookingId && onDecline?.(selectedTable.id, selectedTable.bookingId)}
                >
                  Decline
                </Button>
              </>
            )}
            {selectedTable.status === "available" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
                onClick={() => onBlock?.(selectedTable.id)}
              >
                <Ban className="w-4 h-4 mr-2" />
                Block Table
              </Button>
            )}
            {selectedTable.status === "blocked" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-teal border-teal/30 hover:bg-teal/10"
                onClick={() => onUnblock?.(selectedTable.id)}
              >
                Unblock Table
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

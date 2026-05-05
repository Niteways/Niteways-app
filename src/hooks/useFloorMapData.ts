import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FloorMapElement {
  id: string;
  type: "table" | "booth" | "bar" | "dj" | "entrance" | "wall" | "divider" | "stage" | "restroom" | "plant" | "decoration" | "vip_area";
  shape: "rectangle" | "circle" | "rounded" | "line";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity?: number;
  price?: number;
  minSpend?: number;
  status: "available" | "reserved" | "occupied" | "blocked" | "pending" | "confirmed";
  color: string;
  zone?: string;
  showLabel?: boolean;
  // Booking info
  guestName?: string;
  guestCount?: number;
  time?: string;
  notes?: string;
  bookingId?: string;
  venueId?: string;
}

export interface FloorMapRoom {
  id: string;
  name: string;
  elements: FloorMapElement[];
  zones: { id: string; name: string; color: string }[];
  backgroundColor: string;
  backgroundImage?: string;
  floorPlanId?: string;
}

interface UseFloorMapDataOptions {
  venueId?: string;
  date?: string;
  roomId?: string;
}

export function useFloorMapData({ venueId, date, roomId }: UseFloorMapDataOptions = {}) {
  const [tables, setTables] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<FloorMapRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [floorPlanId, setFloorPlanId] = useState<string | null>(null);
  const [userAppZoom, setUserAppZoom] = useState<number>(100);

  // Fetch floor plan rooms and tables from database
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // First, get the published floor plan
      let floorPlanQuery = supabase
        .from("floor_plans")
        .select("*")
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .limit(1);
      
      if (venueId) {
        floorPlanQuery = floorPlanQuery.eq("venue_id", venueId);
      }

      const { data: floorPlans } = await floorPlanQuery;
      const publishedFloorPlan = floorPlans?.[0];
      
      if (publishedFloorPlan) {
        setFloorPlanId(publishedFloorPlan.id);
        
        // Fetch rooms for this floor plan
        const { data: roomsData, error: roomsError } = await supabase
          .from("floor_plan_rooms")
          .select("*")
          .eq("floor_plan_id", publishedFloorPlan.id)
          .order("sort_order");
        
        if (roomsError) throw roomsError;
        
        if (roomsData && roomsData.length > 0) {
          const parsedRooms: FloorMapRoom[] = roomsData.map(r => ({
            id: r.id,
            name: r.name,
            elements: (r.elements as unknown as FloorMapElement[]) || [],
            zones: (r.zones as unknown as { id: string; name: string; color: string }[]) || [],
            backgroundColor: r.background_color || "#1a1a1a",
            backgroundImage: r.background_image || undefined,
            floorPlanId: r.floor_plan_id,
          }));
          setRooms(parsedRooms);
        }
      }

      // Also fetch venue tables for pricing and capacity info
      let tablesQuery = supabase.from("venue_tables").select("*");
      if (venueId) {
        tablesQuery = tablesQuery.eq("venue_id", venueId);
      }
      const { data: tablesData, error: tablesError } = await tablesQuery;
      if (tablesError) throw tablesError;
      setTables(tablesData || []);

      // Extract userAppZoom from element_data if available
      if (tablesData && tablesData.length > 0) {
        const firstTableWithZoom = tablesData.find((t) => {
          const data = t.element_data as Record<string, unknown> | null;
          return data && typeof data === "object" && "userAppZoom" in data;
        });
        if (firstTableWithZoom) {
          const data = firstTableWithZoom.element_data as Record<string, unknown>;
          if (typeof data?.userAppZoom === "number") {
            setUserAppZoom(data.userAppZoom);
          }
        }
      }

    } catch (err) {
      setError(err as Error);
      console.error("Failed to fetch floor map data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time changes for floor_plan_rooms
    const roomsChannel = supabase
      .channel("floor-map-rooms-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "floor_plan_rooms" },
        () => fetchData()
      )
      .subscribe();

    // Subscribe to venue_tables changes
    const tablesChannel = supabase
      .channel("floor-map-tables-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_tables" },
        () => fetchData()
      )
      .subscribe();

    // Subscribe to floor_plans changes (for publish status)
    const floorPlansChannel = supabase
      .channel("floor-plans-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "floor_plans" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(floorPlansChannel);
    };
  }, [fetchData]);

  // Fetch bookings for the date
  useEffect(() => {
    if (!date) {
      setBookings([]);
      return;
    }

    const fetchBookings = async () => {
      let query = supabase
        .from("table_bookings")
        .select("*")
        .eq("booking_date", date);
      
      if (venueId) {
        query = query.eq("venue_id", venueId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Failed to fetch bookings:", error);
        return;
      }
      setBookings(data || []);
    };

    fetchBookings();

    // Subscribe to real-time booking changes
    const channel = supabase
      .channel(`floor-map-bookings-${date}`)
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "table_bookings",
          filter: `booking_date=eq.${date}`
        },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, venueId]);

  // Build floor map elements from rooms with booking data overlay
  const elements = useMemo<FloorMapElement[]>(() => {
    // If we have rooms with elements, use those as the source of truth
    if (rooms.length > 0) {
      const allElements: FloorMapElement[] = [];
      
      rooms.forEach(room => {
        room.elements.forEach(el => {
          // Find booking for this element (if it's a table/booth)
          const isBookable = el.type === "table" || el.type === "booth" || el.type === "vip_area";
          const booking = isBookable ? bookings.find(b => b.table_number === el.label) : null;
          
          // Find matching venue_table for pricing info
          const venueTable = tables.find(t => t.label === el.label);
          
          let status: FloorMapElement["status"] = el.status || "available";
          let guestName: string | undefined;
          let guestCount: number | undefined;
          let time: string | undefined;
          let notes: string | undefined;
          let bookingId: string | undefined;
          let color = el.color;

          if (booking) {
            bookingId = booking.id;
            if (booking.status === "blocked") {
              status = "blocked";
              color = "#ef4444";
              guestName = "BLOCKED";
            } else if (booking.status === "pending") {
              status = "pending";
              color = "#3b82f6";
              guestName = booking.guest_name;
            } else if (booking.status === "confirmed" || booking.status === "completed") {
              status = "reserved";
              color = "#eab308";
              guestName = booking.guest_name;
            } else if (booking.status === "cancelled") {
              status = "available";
              bookingId = undefined;
            }
            guestCount = booking.party_size;
            time = booking.booking_time;
            notes = booking.notes || undefined;
          }

          allElements.push({
            ...el,
            status,
            color: booking ? color : el.color,
            guestName,
            guestCount,
            time,
            notes,
            bookingId,
            capacity: venueTable?.capacity || el.capacity,
            price: venueTable?.base_price || el.price,
            minSpend: venueTable?.min_spend || el.minSpend,
            venueId: venueTable?.venue_id,
          });
        });
      });
      
      return allElements;
    }
    
    // Fallback: build from venue_tables if no floor plan rooms exist
    const tableElements: FloorMapElement[] = tables.map((table, index) => {
      const elementData = table.element_data as any;
      const row = Math.floor(index / 5);
      const col = index % 5;
      const isVip = table.table_type === "booth" || table.zone === "vip" || table.label.toLowerCase().includes("vip");
      
      const defaultPos = {
        x: isVip ? 50 + (index % 3) * 150 : 50 + col * 110,
        y: isVip ? 280 : 80 + row * 100,
        width: isVip ? 120 : 70,
        height: isVip ? 80 : 70,
      };
      
      const pos = elementData?.position || defaultPos;

      // Find booking for this table
      const booking = bookings.find(b => b.table_number === table.label);

      let status: FloorMapElement["status"] = "available";
      let guestName: string | undefined;
      let guestCount: number | undefined;
      let time: string | undefined;
      let notes: string | undefined;
      let bookingId: string | undefined;
      let color = table.color || "teal";

      if (booking) {
        bookingId = booking.id;
        if (booking.status === "blocked") {
          status = "blocked";
          color = "red";
          guestName = "BLOCKED";
        } else if (booking.status === "pending") {
          status = "pending";
          color = "blue";
          guestName = booking.guest_name;
        } else if (booking.status === "confirmed" || booking.status === "completed") {
          status = "reserved";
          color = "gold";
          guestName = booking.guest_name;
        } else if (booking.status === "cancelled") {
          status = "available";
          bookingId = undefined;
        }
        guestCount = booking.party_size;
        time = booking.booking_time;
        notes = booking.notes || undefined;
      }

      return {
        id: table.id,
        type: isVip ? "booth" : "table",
        shape: isVip ? "rectangle" : "circle",
        label: table.label,
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: pos.rotation || 0,
        capacity: table.capacity,
        price: table.base_price,
        minSpend: table.min_spend,
        status,
        color,
        zone: table.zone || "main",
        showLabel: true,
        guestName,
        guestCount,
        time,
        notes,
        bookingId,
        venueId: table.venue_id,
      };
    });

    // Add static elements
    const staticElements: FloorMapElement[] = [
      { id: "bar1", type: "bar", shape: "rounded", label: "Main Bar", x: 50, y: 380, width: 180, height: 50, rotation: 0, status: "available", color: "#64748b", showLabel: true },
      { id: "dj1", type: "dj", shape: "rounded", label: "DJ Booth", x: 280, y: 380, width: 100, height: 55, rotation: 0, status: "available", color: "#ffffff", showLabel: true },
      { id: "ent1", type: "entrance", shape: "rectangle", label: "Entrance", x: 430, y: 380, width: 90, height: 50, rotation: 0, status: "available", color: "#64748b", showLabel: true },
    ];

    return [...tableElements, ...staticElements];
  }, [rooms, tables, bookings]);

  // Get the current room (first room or specific room)
  const currentRoom = useMemo(() => {
    if (roomId) {
      return rooms.find(r => r.id === roomId) || rooms[0];
    }
    return rooms[0];
  }, [rooms, roomId]);

  return {
    elements,
    rooms,
    currentRoom,
    tables,
    bookings,
    isLoading,
    error,
    floorPlanId,
    userAppZoom,
    refetch: fetchData,
  };
}

// Helper function to save floor plan rooms to database
export async function saveFloorPlanRooms(
  floorPlanId: string,
  rooms: FloorMapRoom[]
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Delete existing rooms for this floor plan
    await supabase
      .from("floor_plan_rooms")
      .delete()
      .eq("floor_plan_id", floorPlanId);

    // Insert new rooms one by one to avoid type issues
    for (let index = 0; index < rooms.length; index++) {
      const room = rooms[index];
      const { error } = await supabase
        .from("floor_plan_rooms")
        .insert({
          id: room.id,
          floor_plan_id: floorPlanId,
          name: room.name,
          elements: JSON.parse(JSON.stringify(room.elements)),
          zones: JSON.parse(JSON.stringify(room.zones)),
          background_color: room.backgroundColor,
          background_image: room.backgroundImage || null,
          sort_order: index,
        });
      
      if (error) throw error;
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to save floor plan rooms:", err);
    return { success: false, error: err as Error };
  }
}
// Helper function to create or update floor plan
export async function saveFloorPlan(
  venueId: string,
  name: string,
  rooms: FloorMapRoom[],
  publish: boolean = false
): Promise<{ success: boolean; floorPlanId?: string; error?: Error }> {
  try {
    // Check if a floor plan already exists for this venue
    const { data: existingPlans } = await supabase
      .from("floor_plans")
      .select("id")
      .eq("venue_id", venueId)
      .limit(1);

    let floorPlanId: string;

    if (existingPlans && existingPlans.length > 0) {
      // Update existing floor plan
      floorPlanId = existingPlans[0].id;
      const { error: updateError } = await supabase
        .from("floor_plans")
        .update({
          name,
          is_published: publish,
          is_draft: !publish,
          updated_at: new Date().toISOString(),
        })
        .eq("id", floorPlanId);

      if (updateError) throw updateError;
    } else {
      // Create new floor plan
      const { data: newPlan, error: createError } = await supabase
        .from("floor_plans")
        .insert({
          venue_id: venueId,
          name,
          is_published: publish,
          is_draft: !publish,
        })
        .select()
        .single();

      if (createError) throw createError;
      floorPlanId = newPlan.id;
    }

    // Save rooms
    const { success, error: roomsError } = await saveFloorPlanRooms(floorPlanId, rooms);
    if (!success) throw roomsError;

    // Also sync tables to venue_tables
    await syncElementsToVenueTables(venueId, rooms);

    return { success: true, floorPlanId };
  } catch (err) {
    console.error("Failed to save floor plan:", err);
    return { success: false, error: err as Error };
  }
}

// Sync table elements to venue_tables table
async function syncElementsToVenueTables(venueId: string, rooms: FloorMapRoom[]) {
  const tableElements = rooms.flatMap(room => 
    room.elements.filter(el => el.type === "table" || el.type === "booth" || el.type === "vip_area")
  );

  for (const element of tableElements) {
    const tableType = element.type === "booth" ? "booth" : element.type === "vip_area" ? "vip" : "table";
    
    // Check if table exists
    const { data: existing } = await supabase
      .from("venue_tables")
      .select("id")
      .eq("label", element.label)
      .eq("venue_id", venueId)
      .maybeSingle();

    const elementData = {
      position: {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation,
      },
      shape: element.shape,
      showLabel: element.showLabel,
    };

    if (existing) {
      // Update existing table
      await supabase
        .from("venue_tables")
        .update({
          table_type: tableType,
          capacity: element.capacity || 4,
          base_price: element.price || 1000,
          min_spend: element.minSpend || 500,
          color: element.color,
          zone: element.zone || "main",
          element_data: elementData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Create new table
      await supabase
        .from("venue_tables")
        .insert({
          venue_id: venueId,
          label: element.label,
          table_type: tableType,
          capacity: element.capacity || 4,
          base_price: element.price || 1000,
          min_spend: element.minSpend || 500,
          color: element.color,
          zone: element.zone || "main",
          element_data: elementData,
          status: "active",
        });
    }
  }
}

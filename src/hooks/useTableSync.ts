import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SyncedTable {
  id: string;
  label: string;
  type: "table" | "booth" | "vip_area";
  capacity: number;
  basePrice: number;
  minSpend: number;
  color: string;
  zone: string;
  depositPercent: number;
  status: "active" | "inactive" | "blocked";
  roomId?: string;
  venueId?: string;
  requiresApproval: boolean;
}

export interface SyncedRoom {
  id: string;
  name: string;
  tables: string[];
}

interface UseTableSyncOptions {
  venueId: string; // Required - no fallback to default venue
}

export function useTableSync(options: UseTableSyncOptions) {
  const [tables, setTablesState] = useState<SyncedTable[]>([]);
  const [rooms, setRoomsState] = useState<SyncedRoom[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use provided venueId - no fallback (prevents data leakage)
  const activeVenueId = options.venueId;

  // Fetch tables from database
  const fetchTables = useCallback(async () => {
    try {
      // Always filter by venue - required for proper scoping
      const { data, error } = await supabase
        .from("venue_tables")
        .select("*")
        .eq("venue_id", activeVenueId)
        .order("label");

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedTables: SyncedTable[] = data.map(t => ({
          id: t.id,
          label: t.label,
          type: t.table_type as "table" | "booth" | "vip_area",
          capacity: t.capacity,
          basePrice: t.base_price,
          minSpend: t.min_spend,
          color: t.color || "teal",
          zone: t.zone || "main",
          depositPercent: t.deposit_percent,
          status: t.status as "active" | "inactive" | "blocked",
          roomId: t.room_id || undefined,
          venueId: t.venue_id || undefined,
          requiresApproval: (t as any).requires_approval || false,
        }));
        setTablesState(mappedTables);
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent("tableSyncUpdate", { detail: { tables: mappedTables } }));
      } else {
        // Empty state for venue with no tables yet
        setTablesState([]);
      }

      // Set default room
      setRoomsState([{ id: "main-floor", name: "Main Floor", tables: [] }]);
      setIsLoaded(true);
    } catch (error) {
      console.error("Error fetching tables:", error);
      setIsLoaded(true);
    }
  }, [options.venueId, activeVenueId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("venue-tables-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "venue_tables",
        },
        () => {
          // Refetch on any change
          fetchTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTables]);

  // Listen for updates from other components
  useEffect(() => {
    const handleTableUpdate = (e: CustomEvent) => {
      if (e.detail?.tables) {
        setTablesState(e.detail.tables);
      }
    };

    window.addEventListener("tableSyncUpdate", handleTableUpdate as EventListener);
    return () => {
      window.removeEventListener("tableSyncUpdate", handleTableUpdate as EventListener);
    };
  }, [options.venueId, activeVenueId]);

  const setTables = useCallback((updater: SyncedTable[] | ((prev: SyncedTable[]) => SyncedTable[])) => {
    setTablesState((prev) => {
      const newTables = typeof updater === "function" ? updater(prev) : updater;
      window.dispatchEvent(new CustomEvent("tableSyncUpdate", { detail: { tables: newTables } }));
      return newTables;
    });
  }, []);

  const setRooms = useCallback((updater: SyncedRoom[] | ((prev: SyncedRoom[]) => SyncedRoom[])) => {
    setRoomsState((prev) => {
      const newRooms = typeof updater === "function" ? updater(prev) : updater;
      window.dispatchEvent(new CustomEvent("roomSyncUpdate", { detail: { rooms: newRooms } }));
      return newRooms;
    });
  }, []);

  const addTable = useCallback(async (table: Omit<SyncedTable, "id">) => {
    try {
      const { data, error } = await supabase
        .from("venue_tables")
        .insert({
          label: table.label,
          table_type: table.type,
          capacity: table.capacity,
          base_price: table.basePrice,
          min_spend: table.minSpend,
          color: table.color,
          zone: table.zone,
          deposit_percent: table.depositPercent,
          status: table.status,
          venue_id: table.venueId || activeVenueId,
          room_id: table.roomId,
          requires_approval: table.requiresApproval ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchTables();
      return data;
    } catch (error) {
      console.error("Error adding table:", error);
      throw error;
    }
  }, [activeVenueId, fetchTables]);

  const updateTable = useCallback(async (id: string, updates: Partial<SyncedTable>) => {
    try {
      const dbUpdates: any = {};
      if (updates.label !== undefined) dbUpdates.label = updates.label;
      if (updates.type !== undefined) dbUpdates.table_type = updates.type;
      if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
      if (updates.basePrice !== undefined) dbUpdates.base_price = updates.basePrice;
      if (updates.minSpend !== undefined) dbUpdates.min_spend = updates.minSpend;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.zone !== undefined) dbUpdates.zone = updates.zone;
      if (updates.depositPercent !== undefined) dbUpdates.deposit_percent = updates.depositPercent;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.roomId !== undefined) dbUpdates.room_id = updates.roomId;
      if (updates.requiresApproval !== undefined) dbUpdates.requires_approval = updates.requiresApproval;

      const { error } = await supabase
        .from("venue_tables")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
      await fetchTables();
    } catch (error) {
      console.error("Error updating table:", error);
      throw error;
    }
  }, [fetchTables]);

  const deleteTable = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("venue_tables")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchTables();
    } catch (error) {
      console.error("Error deleting table:", error);
      throw error;
    }
  }, [fetchTables]);

  const addRoom = useCallback((name: string) => {
    const newRoom: SyncedRoom = {
      id: `room-${Date.now()}`,
      name,
      tables: [],
    };
    setRooms((prev) => [...prev, newRoom]);
    return newRoom;
  }, [setRooms]);

  const deleteRoom = useCallback((id: string) => {
    if (rooms.length <= 1) return;
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }, [setRooms, rooms.length]);

  const getTablesForRoom = useCallback((roomId: string) => {
    return tables.filter(t => t.roomId === roomId);
  }, [tables]);

  return {
    tables,
    rooms,
    isLoaded,
    setTables,
    setRooms,
    addTable,
    updateTable,
    deleteTable,
    addRoom,
    deleteRoom,
    getTablesForRoom,
    refetch: fetchTables,
  };
}

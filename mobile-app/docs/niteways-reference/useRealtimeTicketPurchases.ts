import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type TicketPurchase = Tables<"ticket_purchases"> & {
  guests?: { name: string; guest_id: string } | null;
};

interface UseRealtimeTicketPurchasesOptions {
  venueId?: string;
  eventDate?: string;
  statusFilter?: string[];
  limit?: number;
}

export function useRealtimeTicketPurchases(options: UseRealtimeTicketPurchasesOptions = {}) {
  const { venueId, eventDate, statusFilter, limit = 100 } = options;
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("ticket_purchases")
        .select("*, guests(name, guest_id)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (venueId) {
        query = query.eq("venue_id", venueId);
      }
      if (eventDate) {
        query = query.eq("event_date", eventDate);
      }
      if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setPurchases(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch purchases"));
    } finally {
      setIsLoading(false);
    }
  }, [venueId, eventDate, statusFilter, limit]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("ticket-purchases-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ticket_purchases",
        },
        async (payload) => {
          console.log("Realtime ticket purchase update:", payload);

          if (payload.eventType === "INSERT") {
            const { data } = await supabase
              .from("ticket_purchases")
              .select("*, guests(name, guest_id)")
              .eq("id", payload.new.id)
              .single();

            if (data) {
              let matches = true;
              if (venueId && data.venue_id !== venueId) matches = false;
              if (eventDate && data.event_date !== eventDate) matches = false;
              if (statusFilter && statusFilter.length > 0 && !statusFilter.includes(data.status)) matches = false;

              if (matches) {
                setPurchases((prev) => [data, ...prev].slice(0, limit));
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const { data } = await supabase
              .from("ticket_purchases")
              .select("*, guests(name, guest_id)")
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setPurchases((prev) =>
                prev.map((p) => (p.id === data.id ? data : p))
              );
            }
          } else if (payload.eventType === "DELETE") {
            setPurchases((prev) =>
              prev.filter((p) => p.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, eventDate, statusFilter, limit]);

  const addPurchase = useCallback(
    async (purchase: Omit<Tables<"ticket_purchases">, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("ticket_purchases")
        .insert(purchase)
        .select("*, guests(name, guest_id)")
        .single();

      if (error) throw error;
      return data;
    },
    []
  );

  const updatePurchase = useCallback(
    async (id: string, updates: Partial<Tables<"ticket_purchases">>) => {
      const { data, error } = await supabase
        .from("ticket_purchases")
        .update(updates)
        .eq("id", id)
        .select("*, guests(name, guest_id)")
        .single();

      if (error) throw error;
      return data;
    },
    []
  );

  const deletePurchase = useCallback(async (id: string) => {
    const { error } = await supabase.from("ticket_purchases").delete().eq("id", id);
    if (error) throw error;
  }, []);

  return {
    purchases,
    isLoading,
    error,
    refetch: fetchPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
  };
}

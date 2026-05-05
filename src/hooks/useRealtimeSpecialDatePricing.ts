import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SpecialDatePricing {
  id: string;
  venue_id: string | null;
  date: string;
  multiplier: number;
  tables: string[];
  individual_prices: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface UseRealtimeSpecialDatePricingOptions {
  venueId?: string;
}

export function useRealtimeSpecialDatePricing(options: UseRealtimeSpecialDatePricingOptions = {}) {
  const { venueId } = options;
  const [specialDates, setSpecialDates] = useState<SpecialDatePricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSpecialDates = useCallback(async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("special_date_pricing")
        .select("*")
        .order("date", { ascending: true });

      if (venueId) {
        query = query.eq("venue_id", venueId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      // Transform data to match our interface
      const transformedData: SpecialDatePricing[] = (data || []).map(d => ({
        id: d.id,
        venue_id: d.venue_id,
        date: d.date,
        multiplier: Number(d.multiplier),
        tables: d.tables || [],
        individual_prices: (d.individual_prices as Record<string, number>) || {},
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
      
      setSpecialDates(transformedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch special dates"));
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchSpecialDates();
  }, [fetchSpecialDates]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("special-date-pricing-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "special_date_pricing",
        },
        async (payload) => {
          console.log("Realtime special date pricing update:", payload);

          if (payload.eventType === "INSERT") {
            const newData = payload.new as any;
            const transformed: SpecialDatePricing = {
              id: newData.id,
              venue_id: newData.venue_id,
              date: newData.date,
              multiplier: Number(newData.multiplier),
              tables: newData.tables || [],
              individual_prices: (newData.individual_prices as Record<string, number>) || {},
              created_at: newData.created_at,
              updated_at: newData.updated_at,
            };
            
            if (!venueId || transformed.venue_id === venueId) {
              setSpecialDates((prev) => [...prev, transformed].sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
              ));
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedData = payload.new as any;
            const transformed: SpecialDatePricing = {
              id: updatedData.id,
              venue_id: updatedData.venue_id,
              date: updatedData.date,
              multiplier: Number(updatedData.multiplier),
              tables: updatedData.tables || [],
              individual_prices: (updatedData.individual_prices as Record<string, number>) || {},
              created_at: updatedData.created_at,
              updated_at: updatedData.updated_at,
            };
            
            setSpecialDates((prev) =>
              prev.map((sd) => (sd.id === transformed.id ? transformed : sd))
            );
          } else if (payload.eventType === "DELETE") {
            setSpecialDates((prev) =>
              prev.filter((sd) => sd.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  const addSpecialDate = useCallback(
    async (data: {
      venue_id?: string | null;
      date: string;
      multiplier: number;
      tables: string[];
      individual_prices?: Record<string, number>;
    }) => {
      const { data: result, error } = await supabase
        .from("special_date_pricing")
        .insert({
          venue_id: data.venue_id || null,
          date: data.date,
          multiplier: data.multiplier,
          tables: data.tables,
          individual_prices: data.individual_prices || {},
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    []
  );

  const updateSpecialDate = useCallback(
    async (id: string, updates: Partial<{
      date: string;
      multiplier: number;
      tables: string[];
      individual_prices: Record<string, number>;
    }>) => {
      const { data, error } = await supabase
        .from("special_date_pricing")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    []
  );

  const deleteSpecialDate = useCallback(async (id: string) => {
    const { error } = await supabase.from("special_date_pricing").delete().eq("id", id);
    if (error) throw error;
  }, []);

  // Get pricing for a specific date
  const getPricingForDate = useCallback((date: string, tableId: string, basePrice: number): number => {
    const specialDate = specialDates.find(sd => sd.date === date);
    if (!specialDate) return basePrice;
    
    // Check if this table has individual pricing
    if (specialDate.individual_prices && specialDate.individual_prices[tableId]) {
      return specialDate.individual_prices[tableId];
    }
    
    // Check if this table is in the special date tables list
    if (specialDate.tables.length === 0 || specialDate.tables.includes(tableId)) {
      return Math.round(basePrice * specialDate.multiplier);
    }
    
    return basePrice;
  }, [specialDates]);

  return {
    specialDates,
    isLoading,
    error,
    refetch: fetchSpecialDates,
    addSpecialDate,
    updateSpecialDate,
    deleteSpecialDate,
    getPricingForDate,
  };
}

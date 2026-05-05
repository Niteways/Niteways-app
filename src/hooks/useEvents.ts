import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Event {
  id: string;
  venue_id: string;
  event_name: string;
  event_date: string;
  event_time: string | null;
  end_time?: string | null;
  description: string | null;
  image_url: string | null;
  ticket_price: number | null;
  ticket_types: any;
  capacity: number | null;
  tickets_sold: number;
  status: string;
  featured: boolean;
  age_limit?: number;
  music_genre?: string | null;
  custom_tags?: string[] | null;
  created_at: string;
  updated_at: string;
  venue?: {
    id: string;
    name: string;
    address: string | null;
    category: string;
    gallery_images: string[] | null;
  };
}

// Fetch all active events
export function useEvents(cityId?: string) {
  return useQuery({
    queryKey: ["events", cityId],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select(`
          *,
          venue:venues!inner(id, name, address, category, gallery_images, city_id)
        `)
        .eq("status", "active")
        .gte("event_date", new Date().toISOString().split("T")[0])
        .order("event_date", { ascending: true });

      if (cityId) {
        query = query.eq("venue.city_id", cityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Event[];
    },
  });
}

// Fetch events for a specific venue
export function useVenueEvents(venueId: string) {
  return useQuery({
    queryKey: ["venue-events", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("venue_id", venueId)
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
    enabled: !!venueId,
  });
}

// Create event mutation
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<Event, "id" | "created_at" | "updated_at" | "tickets_sold">) => {
      const { data, error } = await supabase
        .from("events")
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["venue-events", data.venue_id] });
    },
  });
}

// Update event mutation
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { data, error } = await supabase
        .from("events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["venue-events", data.venue_id] });
    },
  });
}

// Delete event mutation
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["venue-events"] });
    },
  });
}

// Real-time events subscription
export function useRealtimeEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("events-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["events"] });
          queryClient.invalidateQueries({ queryKey: ["venue-events"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

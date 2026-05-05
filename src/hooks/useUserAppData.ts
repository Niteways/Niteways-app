import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Venue {
  id: string;
  name: string;
  category: string;
  status: string;
  address: string | null;
  description: string | null;
  music_genre: string | null;
  opening_hours: string | null;
  city_id: string | null;
  city_name?: string;
  gallery_images?: string[] | null;
  instagram_handle?: string | null;
  spotify_link?: string | null;
  age_limit?: number | null;
  age_requirements?: Record<string, number> | null;
  dress_code?: string | null;
  min_spend_tables?: number | null;
  opening_days?: string | null;
  menu_url?: string | null;
}

export interface City {
  id: string;
  name: string;
  country: string;
  status: string;
  image_url?: string | null;
  image_position_x?: number | null;
  image_position_y?: number | null;
  image_zoom?: number | null;
}

export interface VenueTable {
  id: string;
  label: string;
  capacity: number;
  base_price: number;
  status: string;
  min_spend: number;
  venue_id: string;
  table_type: string;
  deposit_percent: number;
  requires_approval?: boolean;
}

// Hook for venues with real-time sync
export function useVenues(cityId?: string) {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("venues-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "venues",
        },
        () => {
          // Invalidate and refetch venues on any change
          queryClient.invalidateQueries({ queryKey: ["user-app-venues"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["user-app-venues", cityId],
    queryFn: async () => {
      let query = supabase
        .from("venues")
        .select("*, cities(name)")
        .eq("status", "active");
      
      if (cityId) {
        query = query.eq("city_id", cityId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((venue: any) => ({
        ...venue,
        city_name: venue.cities?.name || "Unknown",
      })) as Venue[];
    },
  });
}

// Hook for cities with real-time sync
export function useCities() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("cities-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cities",
        },
        () => {
          // Invalidate and refetch cities on any change
          queryClient.invalidateQueries({ queryKey: ["user-app-cities"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["user-app-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("status", "active")
        .order("name");
      
      if (error) throw error;
      return data as City[];
    },
  });
}

// Hook for venue tables with real-time sync
export function useVenueTables(venueId: string) {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    if (!venueId) return;

    const channel = supabase
      .channel(`tables-realtime-${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "venue_tables",
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          // Invalidate and refetch tables on any change
          queryClient.invalidateQueries({ queryKey: ["user-app-tables", venueId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, queryClient]);

  return useQuery({
    queryKey: ["user-app-tables", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venue_tables")
        .select("*")
        .eq("venue_id", venueId)
        .eq("status", "active")
        .order("base_price");
      
      if (error) throw error;
      return data as VenueTable[];
    },
    enabled: !!venueId,
  });
}

// Hook for table bookings with real-time sync
export function useTableBookings(venueId: string, date: string) {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    if (!venueId || !date) return;

    const channel = supabase
      .channel(`bookings-realtime-${venueId}-${date}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_bookings",
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          // Invalidate and refetch bookings on any change
          queryClient.invalidateQueries({ queryKey: ["user-app-bookings", venueId, date] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, date, queryClient]);

  return useQuery({
    queryKey: ["user-app-bookings", venueId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table_bookings")
        .select("*")
        .eq("venue_id", venueId)
        .eq("booking_date", date);
      
      if (error) throw error;
      return data;
    },
    enabled: !!venueId && !!date,
  });
}

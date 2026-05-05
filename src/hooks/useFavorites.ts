import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface Favorite {
  id: string;
  user_id: string;
  venue_id: string;
  created_at: string;
}

// Get current user's favorites
export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as Favorite[];
    },
  });
}

// Check if a venue is favorited
export function useIsFavorite(venueId: string) {
  const { data: favorites = [] } = useFavorites();
  return favorites.some(f => f.venue_id === venueId);
}

// Hook to manage favorites with local state for non-authenticated users
export function useFavoriteManager() {
  const queryClient = useQueryClient();
  const [localFavorites, setLocalFavorites] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("guest_favorites");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  // Save local favorites to localStorage
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem("guest_favorites", JSON.stringify(localFavorites));
    }
  }, [localFavorites, isAuthenticated]);

  const { data: dbFavorites = [] } = useFavorites();

  const isFavorite = (venueId: string) => {
    if (isAuthenticated) {
      return dbFavorites.some(f => f.venue_id === venueId);
    }
    return localFavorites.includes(venueId);
  };

  const toggleFavorite = async (venueId: string) => {
    if (isAuthenticated) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const existing = dbFavorites.find(f => f.venue_id === venueId);
      
      if (existing) {
        await supabase
          .from("user_favorites")
          .delete()
          .eq("id", existing.id);
      } else {
        await supabase
          .from("user_favorites")
          .insert({ user_id: user.id, venue_id: venueId });
      }

      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    } else {
      // For non-authenticated users, use local storage
      setLocalFavorites(prev => 
        prev.includes(venueId) 
          ? prev.filter(id => id !== venueId)
          : [...prev, venueId]
      );
    }
  };

  return {
    isFavorite,
    toggleFavorite,
    favorites: isAuthenticated ? dbFavorites.map(f => f.venue_id) : localFavorites,
  };
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CitySection {
  id: string;
  city_id: string;
  title: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
  venues: { venue_id: string; sort_order: number }[];
}

export function useCitySections(cityId?: string) {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    if (!cityId) return;

    const channel = supabase
      .channel(`city-sections-${cityId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "city_venue_sections",
          filter: `city_id=eq.${cityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["city-sections", cityId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "city_section_venues",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["city-sections", cityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cityId, queryClient]);

  return useQuery({
    queryKey: ["city-sections", cityId],
    queryFn: async () => {
      if (!cityId) return [];

      // Fetch sections
      const { data: sections, error: sectionsError } = await supabase
        .from("city_venue_sections")
        .select("*")
        .eq("city_id", cityId)
        .eq("is_active", true)
        .order("sort_order");

      if (sectionsError) throw sectionsError;
      if (!sections || sections.length === 0) return [];

      // Fetch venue assignments for all sections
      const sectionIds = sections.map(s => s.id);
      const { data: venueAssignments, error: venuesError } = await supabase
        .from("city_section_venues")
        .select("*")
        .in("section_id", sectionIds)
        .order("sort_order");

      if (venuesError) throw venuesError;

      // Combine sections with their venues
      return sections.map(section => ({
        ...section,
        venues: (venueAssignments || [])
          .filter(v => v.section_id === section.id)
          .map(v => ({ venue_id: v.venue_id, sort_order: v.sort_order }))
      })) as CitySection[];
    },
    enabled: !!cityId,
  });
}

// Hook for managing sections (admin use)
export function useCitySectionsMutation() {
  const queryClient = useQueryClient();

  const createSection = async (cityId: string, title: string, emoji: string = "") => {
    const { data: existingSections } = await supabase
      .from("city_venue_sections")
      .select("sort_order")
      .eq("city_id", cityId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existingSections?.[0]?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("city_venue_sections")
      .insert({
        city_id: cityId,
        title,
        emoji: emoji || null,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["city-sections", cityId] });
    return data;
  };

  const updateSection = async (sectionId: string, updates: { title?: string; emoji?: string; is_active?: boolean; sort_order?: number }) => {
    const { error } = await supabase
      .from("city_venue_sections")
      .update(updates)
      .eq("id", sectionId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["city-sections"] });
  };

  const deleteSection = async (sectionId: string) => {
    const { error } = await supabase
      .from("city_venue_sections")
      .delete()
      .eq("id", sectionId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["city-sections"] });
  };

  const addVenueToSection = async (sectionId: string, venueId: string) => {
    const { data: existing } = await supabase
      .from("city_section_venues")
      .select("sort_order")
      .eq("section_id", sectionId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { error } = await supabase
      .from("city_section_venues")
      .insert({
        section_id: sectionId,
        venue_id: venueId,
        sort_order: nextOrder,
      });

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["city-sections"] });
  };

  const removeVenueFromSection = async (sectionId: string, venueId: string) => {
    const { error } = await supabase
      .from("city_section_venues")
      .delete()
      .eq("section_id", sectionId)
      .eq("venue_id", venueId);

    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["city-sections"] });
  };

  return {
    createSection,
    updateSection,
    deleteSection,
    addVenueToSection,
    removeVenueFromSection,
  };
}
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VenueTeamMember {
  id: string;
  venue_id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
  status: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface UseVenueTeamMembersOptions {
  venueId?: string;
}

export function useVenueTeamMembers({ venueId }: UseVenueTeamMembersOptions) {
  const [teamMembers, setTeamMembers] = useState<VenueTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeamMembers = useCallback(async () => {
    if (!venueId) return;
    
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("venue_team_members")
        .select("*")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;
      setTeamMembers((data || []) as VenueTeamMember[]);
    } catch (err) {
      console.error("Error fetching team members:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  const addTeamMember = useCallback(async (member: Omit<VenueTeamMember, "id" | "created_at" | "updated_at">) => {
    try {
      const { data, error: insertError } = await supabase
        .from("venue_team_members")
        .insert(member)
        .select()
        .single();

      if (insertError) throw insertError;
      return data as VenueTeamMember;
    } catch (err) {
      console.error("Error adding team member:", err);
      throw err;
    }
  }, []);

  const updateTeamMember = useCallback(async (id: string, updates: Partial<VenueTeamMember>) => {
    try {
      const { data, error: updateError } = await supabase
        .from("venue_team_members")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data as VenueTeamMember;
    } catch (err) {
      console.error("Error updating team member:", err);
      throw err;
    }
  }, []);

  const deleteTeamMember = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("venue_team_members")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error("Error deleting team member:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!venueId) return;
    
    fetchTeamMembers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`venue-team-${venueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "venue_team_members",
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          fetchTeamMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchTeamMembers]);

  return {
    teamMembers,
    loading,
    error,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    refetch: fetchTeamMembers,
  };
}

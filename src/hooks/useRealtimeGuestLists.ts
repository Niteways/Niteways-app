import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RecurringListGuest {
  id: string;
  name: string;
  plusGuests: number;
  payingGuests: number;
  listType: string;
  promoter: string;
  addedBy: string;
  addedAt: string;
  notes?: string;
  checkedIn: boolean;
  checkedInCount: number;
  checkInTime?: string;
  isSticky: boolean;
}

interface GuestList {
  id: string;
  name: string;
  dayOfWeek?: string;
  eventDate?: string;
  resetTime?: string;
  isActive: boolean;
  guestCount: number;
  lastReset: string;
  guests: RecurringListGuest[];
  type: "recurring" | "oneday";
}

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getLocalProfileName = () => {
  try {
    const raw = localStorage.getItem("userProfileData");
    if (!raw) return null;
    const profile = JSON.parse(raw);
    const fullName = (profile.name || `${profile.firstName || ""} ${profile.lastName || ""}`)
      .trim()
      .replace(/\s+/g, " ");
    return fullName || null;
  } catch {
    return null;
  }
};

const normalizeAddedBy = (
  addedBy: string | null | undefined,
  currentUserId: string | null,
  currentProfileName: string | null,
) => {
  const raw = (addedBy || "").trim();
  if (!raw) return "Unknown";

  // Backwards-compatible fallback from previous placeholder inserts
  if (raw.toLowerCase() === "current user") {
    return currentProfileName || "Current user";
  }

  // If the DB stores the auth user id, show the profile name instead
  if (currentUserId && raw === currentUserId) {
    return currentProfileName || raw;
  }

  return raw;
};

// DB constraint requires: standard | vip | aa
const toDbGuestType = (label: string) => {
  const v = (label || "").trim().toLowerCase();
  if (v === "vip") return "vip";
  if (v === "aa") return "aa";
  return "standard";
};

const toUiGuestType = (dbValue: string | null | undefined) => {
  const v = (dbValue || "standard").toLowerCase();
  if (v === "vip") return "VIP";
  if (v === "aa") return "AA";
  return "Standard";
};

interface UseRealtimeGuestListsOptions {
  venueId: string; // Required - no fallback
}

export function useRealtimeGuestLists(options: UseRealtimeGuestListsOptions) {
  const activeVenueId = options.venueId;
  
  const [recurringLists, setRecurringLists] = useState<GuestList[]>([]);
  const [oneDayLists, setOneDayLists] = useState<GuestList[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all guest lists with their guests
  const fetchLists = useCallback(async () => {
    try {
      const profileName = getLocalProfileName();
      let currentUserId: string | null = null;

      try {
        const { data: auth } = await supabase.auth.getUser();
        currentUserId = auth.user?.id ?? null;
      } catch {
        // ignore if auth isn't enabled in this environment
      }

      // Fetch recurring guest lists - scoped to active venue (critical for impersonation)
      const { data: recurringData, error: recurringError } = await supabase
        .from("recurring_guest_lists")
        .select("*")
        .eq("venue_id", activeVenueId)
        .order("created_at", { ascending: false });

      if (recurringError) throw recurringError;

      // Fetch recurring list guests
      const recurringIds = (recurringData || []).map(l => l.id);
      let recurringGuests: any[] = [];
      if (recurringIds.length > 0) {
        const { data: guestsData, error: guestsError } = await supabase
          .from("recurring_list_guests")
          .select("*")
          .in("recurring_list_id", recurringIds);
        if (guestsError) throw guestsError;
        recurringGuests = guestsData || [];
      }

      const formattedRecurring: GuestList[] = (recurringData || []).map(list => {
        const listGuests = recurringGuests
          .filter((g) => g.recurring_list_id === list.id)
          .map((g) => {
            const addedBy = normalizeAddedBy(g.added_by, currentUserId, profileName);

              return {
                id: g.id,
                name: g.guest_name,
                plusGuests: g.plus_guests || 0,
                payingGuests: g.paying_guests || 0,
                listType: toUiGuestType(g.guest_type),
                promoter: addedBy,
                addedBy,
              addedAt: new Date(g.added_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
              notes: g.notes || undefined,
              checkedIn: g.checked_in || false,
              checkedInCount:
                g.checked_in_count ||
                (g.checked_in ? 1 + (g.plus_guests || 0) : 0),
              checkInTime: g.check_in_time
                ? new Date(g.check_in_time).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : undefined,
              isSticky: g.is_sticky || false,
            };
          });

        return {
          id: list.id,
          name: list.name,
          dayOfWeek: daysOfWeek[list.day_of_week] || "Unknown",
          resetTime: list.reset_time || "03:00",
          isActive: list.is_active,
          guestCount: listGuests.length,
          lastReset: list.updated_at ? new Date(list.updated_at).toLocaleString() : "Never",
          guests: listGuests,
          type: "recurring" as const
        };
      });

      // Fetch one-day guest lists - scoped to venue
      const { data: oneDayData, error: oneDayError } = await supabase
        .from("one_day_guest_lists")
        .select("*")
        .eq("venue_id", activeVenueId)
        .order("event_date", { ascending: false });

      if (oneDayError) throw oneDayError;

      // Fetch one-day list guests
      const oneDayIds = (oneDayData || []).map(l => l.id);
      let oneDayGuests: any[] = [];
      if (oneDayIds.length > 0) {
        const { data: guestsData, error: guestsError } = await supabase
          .from("one_day_list_guests")
          .select("*")
          .in("list_id", oneDayIds);
        if (guestsError) throw guestsError;
        oneDayGuests = guestsData || [];
      }

      const formattedOneDay: GuestList[] = (oneDayData || []).map(list => {
        const listGuests = oneDayGuests
          .filter((g) => g.list_id === list.id)
          .map((g) => {
            const addedBy = normalizeAddedBy(g.added_by, currentUserId, profileName);

            return {
              id: g.id,
              name: g.guest_name,
              plusGuests: g.plus_guests || 0,
              payingGuests: g.paying_guests || 0,
              listType: toUiGuestType(g.guest_type),
              promoter: addedBy,
              addedBy,
              addedAt: new Date(g.added_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
              notes: g.notes || undefined,
              checkedIn: g.checked_in || false,
              checkedInCount:
                g.checked_in_count ||
                (g.checked_in ? 1 + (g.plus_guests || 0) : 0),
              checkInTime: g.check_in_time
                ? new Date(g.check_in_time).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : undefined,
              isSticky: false,
            };
          });

        return {
          id: list.id,
          name: list.name,
          eventDate: list.event_date,
          isActive: list.is_active,
          guestCount: listGuests.length,
          lastReset: list.updated_at ? new Date(list.updated_at).toLocaleString() : "Never",
          guests: listGuests,
          type: "oneday" as const
        };
      });

      setRecurringLists(formattedRecurring);
      setOneDayLists(formattedOneDay);
    } catch (error) {
      console.error("Error fetching guest lists:", error);
    } finally {
      setLoading(false);
    }
  }, [activeVenueId]);

  // Create a new recurring guest list
  const createRecurringList = useCallback(async (name: string, dayOfWeek: string, resetTime: string) => {
    try {
      const dayIndex = daysOfWeek.indexOf(dayOfWeek);
      
      const { data, error } = await supabase
        .from("recurring_guest_lists")
        .insert({
          venue_id: activeVenueId,
          name,
          day_of_week: dayIndex >= 0 ? dayIndex : 3,
          reset_time: resetTime,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Guest list created successfully");
      await fetchLists(); // Refetch to update UI
      return data;
    } catch (error) {
      console.error("Error creating guest list:", error);
      toast.error("Failed to create guest list");
      return null;
    }
  }, [activeVenueId, fetchLists]);

  // Create a one-day guest list
  const createOneDayList = useCallback(async (name: string, eventDate: string) => {
    try {
      const { data, error } = await supabase
        .from("one_day_guest_lists")
        .insert({
          venue_id: activeVenueId,
          name,
          event_date: eventDate,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("One-day guest list created successfully");
      await fetchLists(); // Refetch to update UI
      return data;
    } catch (error) {
      console.error("Error creating one-day list:", error);
      toast.error("Failed to create guest list");
      return null;
    }
  }, [activeVenueId, fetchLists]);

  // Toggle list active status
  const toggleListActive = useCallback(async (listId: string, isActive: boolean, type: "recurring" | "oneday") => {
    try {
      const table = type === "recurring" ? "recurring_guest_lists" : "one_day_guest_lists";
      const { error } = await supabase
        .from(table)
        .update({ is_active: !isActive })
        .eq("id", listId);

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling list status:", error);
      toast.error("Failed to update list status");
    }
  }, []);

  // Delete a guest list
  const deleteList = useCallback(async (listId: string, type: "recurring" | "oneday") => {
    try {
      // Immediately update local state FIRST for instant UI feedback
      if (type === "recurring") {
        setRecurringLists(prev => prev.filter(list => list.id !== listId));
      } else {
        setOneDayLists(prev => prev.filter(list => list.id !== listId));
      }

      if (type === "recurring") {
        // First delete all non-sticky guests from the list (keep sticky for reset)
        const { error: guestsError } = await supabase
          .from("recurring_list_guests")
          .delete()
          .eq("recurring_list_id", listId);
        
        if (guestsError) {
          console.error("Error deleting recurring guests:", guestsError);
          throw guestsError;
        }
        
        // Delete any permissions associated with this list
        const { error: permError } = await supabase
          .from("recurring_list_permissions")
          .delete()
          .eq("recurring_list_id", listId);
        
        if (permError) {
          console.error("Error deleting permissions:", permError);
        }
        
        // Then delete the list itself
        const { error: listError } = await supabase
          .from("recurring_guest_lists")
          .delete()
          .eq("id", listId);
        
        if (listError) throw listError;
      } else {
        // First delete all guests from the list
        const { error: guestsError } = await supabase
          .from("one_day_list_guests")
          .delete()
          .eq("list_id", listId);
        
        if (guestsError) {
          console.error("Error deleting one-day guests:", guestsError);
          throw guestsError;
        }
        
        // Then delete the list itself
        const { error: listError } = await supabase
          .from("one_day_guest_lists")
          .delete()
          .eq("id", listId);
        
        if (listError) throw listError;
      }
      
      toast.success("Guest list deleted");
      return true;
    } catch (error) {
      console.error("Error deleting guest list:", error);
      toast.error("Failed to delete guest list");
      // Re-fetch to restore state if delete failed
      fetchLists();
      return false;
    }
  }, [fetchLists]);

  // Add a guest to a recurring list
  const addGuestToRecurring = useCallback(
    async (
      listId: string,
      guestName: string,
      plusGuests: number,
      payingGuests: number,
      listType: string,
      notes?: string,
      isSticky?: boolean,
    ) => {
      try {
        const profileName = getLocalProfileName();
        let addedBy: string = profileName || "Unknown";

        try {
          const { data: auth } = await supabase.auth.getUser();
          if (auth.user?.id) addedBy = auth.user.id;
        } catch {
          // ignore
        }

        const { data, error } = await supabase
          .from("recurring_list_guests")
          .insert({
            recurring_list_id: listId,
            guest_name: guestName.trim(),
            guest_type: toDbGuestType(listType),
            plus_guests: Math.max(0, Number(plusGuests) || 0),
            paying_guests: Math.max(0, Number(payingGuests) || 0),
            added_by: addedBy,
            notes: notes || null,
            checked_in: false,
            checked_in_count: 0,
            is_sticky: !!isSticky,
          })
          .select()
          .single();

        if (error) throw error;

        toast.success("Guest added successfully");
        return data;
      } catch (error: any) {
        console.error("Error adding guest:", error);
        toast.error(error?.message || "Failed to add guest");
        return null;
      }
    },
    [],
  );

  // Add a guest to a one-day list
  const addGuestToOneDay = useCallback(
    async (
      listId: string,
      guestName: string,
      plusGuests: number,
      payingGuests: number,
      listType: string,
      notes?: string,
    ) => {
      try {
        const profileName = getLocalProfileName();
        let addedBy: string = profileName || "Unknown";

        try {
          const { data: auth } = await supabase.auth.getUser();
          if (auth.user?.id) addedBy = auth.user.id;
        } catch {
          // ignore
        }

        const { data, error } = await supabase
          .from("one_day_list_guests")
          .insert({
            list_id: listId,
            guest_name: guestName.trim(),
            guest_type: toDbGuestType(listType),
            plus_guests: Math.max(0, Number(plusGuests) || 0),
            paying_guests: Math.max(0, Number(payingGuests) || 0),
            added_by: addedBy,
            notes: notes || null,
            checked_in: false,
            checked_in_count: 0,
          })
          .select()
          .single();

        if (error) throw error;

        toast.success("Guest added successfully");
        return data;
      } catch (error: any) {
        console.error("Error adding guest:", error);
        toast.error(error?.message || "Failed to add guest");
        return null;
      }
    },
    [],
  );

  // Update a recurring guest
  const updateRecurringGuest = useCallback(async (
    guestId: string,
    updates: {
      guestName?: string;
      plusGuests?: number;
      payingGuests?: number;
      listType?: string;
      notes?: string;
      isSticky?: boolean;
    }
  ) => {
    try {
      const updateData: Record<string, any> = {};
      if (updates.guestName) updateData.guest_name = updates.guestName;
      if (updates.plusGuests !== undefined) updateData.plus_guests = updates.plusGuests;
      if (updates.payingGuests !== undefined) updateData.paying_guests = updates.payingGuests;
      if (updates.listType) updateData.guest_type = updates.listType;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.isSticky !== undefined) updateData.is_sticky = updates.isSticky;

      const { error } = await supabase
        .from("recurring_list_guests")
        .update(updateData)
        .eq("id", guestId);

      if (error) throw error;

      toast.success("Guest updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating guest:", error);
      toast.error("Failed to update guest");
      return false;
    }
  }, []);

  // Update a one-day guest
  const updateOneDayGuest = useCallback(async (
    guestId: string,
    updates: {
      guestName?: string;
      plusGuests?: number;
      payingGuests?: number;
      listType?: string;
      notes?: string;
    }
  ) => {
    try {
      const updateData: Record<string, any> = {};
      if (updates.guestName) updateData.guest_name = updates.guestName;
      if (updates.plusGuests !== undefined) updateData.plus_guests = updates.plusGuests;
      if (updates.payingGuests !== undefined) updateData.paying_guests = updates.payingGuests;
      if (updates.listType) updateData.guest_type = updates.listType;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from("one_day_list_guests")
        .update(updateData)
        .eq("id", guestId);

      if (error) throw error;

      toast.success("Guest updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating guest:", error);
      toast.error("Failed to update guest");
      return false;
    }
  }, []);

  // Delete a guest from a list
  const deleteGuest = useCallback(async (guestId: string, type: "recurring" | "oneday" = "recurring") => {
    try {
      const table = type === "recurring" ? "recurring_list_guests" : "one_day_list_guests";
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", guestId);

      if (error) throw error;
      
      toast.success("Guest removed");
    } catch (error) {
      console.error("Error deleting guest:", error);
      toast.error("Failed to remove guest");
    }
  }, []);

  // Check in a guest (incremental)
  const checkInGuest = useCallback(async (guestId: string, currentCount: number, totalParty: number, type: "recurring" | "oneday" = "recurring") => {
    try {
      const table = type === "recurring" ? "recurring_list_guests" : "one_day_list_guests";
      const newCount = currentCount + 1;
      const isFullyCheckedIn = newCount >= totalParty;
      
      const { error } = await supabase
        .from(table)
        .update({ 
          checked_in_count: newCount,
          checked_in: isFullyCheckedIn,
          check_in_time: new Date().toISOString()
        })
        .eq("id", guestId);

      if (error) throw error;
      
      toast.success(`Checked in ${newCount}/${totalParty}`);
      return true;
    } catch (error) {
      console.error("Error checking in guest:", error);
      toast.error("Failed to check in guest");
      return false;
    }
  }, []);

  // Set up real-time subscriptions - scoped to active venue
  useEffect(() => {
    fetchLists();

    // Subscribe to changes on recurring_guest_lists (venue-scoped channel)
    const recurringListsChannel = supabase
      .channel(`recurring-guest-lists-${activeVenueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recurring_guest_lists", filter: `venue_id=eq.${activeVenueId}` },
        () => fetchLists()
      )
      .subscribe();

    // Subscribe to changes on recurring_list_guests
    const recurringGuestsChannel = supabase
      .channel(`recurring-list-guests-${activeVenueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "recurring_list_guests" }, () => fetchLists())
      .subscribe();

    // Subscribe to changes on one_day_guest_lists (venue-scoped channel)
    const oneDayListsChannel = supabase
      .channel(`one-day-guest-lists-${activeVenueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "one_day_guest_lists", filter: `venue_id=eq.${activeVenueId}` },
        () => fetchLists()
      )
      .subscribe();

    // Subscribe to changes on one_day_list_guests
    const oneDayGuestsChannel = supabase
      .channel(`one-day-list-guests-${activeVenueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "one_day_list_guests" }, () => fetchLists())
      .subscribe();

    return () => {
      supabase.removeChannel(recurringListsChannel);
      supabase.removeChannel(recurringGuestsChannel);
      supabase.removeChannel(oneDayListsChannel);
      supabase.removeChannel(oneDayGuestsChannel);
    };
  }, [fetchLists, activeVenueId]);

  // Reset a recurring guest list (delete non-sticky guests, preserve sticky, update timestamp)
  const resetRecurringList = useCallback(async (listId: string) => {
    try {
      // Delete only non-sticky guests
      const { error: deleteError } = await supabase
        .from("recurring_list_guests")
        .delete()
        .eq("recurring_list_id", listId)
        .eq("is_sticky", false);

      if (deleteError) throw deleteError;

      // Reset check-in status for sticky guests
      const { error: resetError } = await supabase
        .from("recurring_list_guests")
        .update({ checked_in: false, checked_in_count: 0, check_in_time: null })
        .eq("recurring_list_id", listId)
        .eq("is_sticky", true);

      if (resetError) throw resetError;

      // Update the list's updated_at timestamp (serves as last_reset)
      const { error: updateError } = await supabase
        .from("recurring_guest_lists")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", listId);

      if (updateError) throw updateError;

      toast.success("Guest list reset successfully. Sticky guests preserved.");
      await fetchLists();
      return true;
    } catch (error) {
      console.error("Error resetting guest list:", error);
      toast.error("Failed to reset guest list");
      return false;
    }
  }, [fetchLists]);

  // Combine all lists for backwards compatibility
  const allLists = [...recurringLists, ...oneDayLists];

  return {
    lists: allLists,
    recurringLists,
    oneDayLists,
    loading,
    createRecurringList,
    createOneDayList,
    toggleListActive,
    deleteList,
    addGuestToRecurring,
    addGuestToOneDay,
    updateRecurringGuest,
    updateOneDayGuest,
    deleteGuest,
    checkInGuest,
    resetRecurringList,
    refetch: fetchLists
  };
}
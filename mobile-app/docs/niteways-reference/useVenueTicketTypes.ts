import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, getDay } from "date-fns";

export interface VenueTicketType {
  id: string;
  venue_id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  status: "active" | "soldout" | "hidden";
  type: "regular" | "special";
  description: string | null;
  active_days: string[] | null;
  specific_dates: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface UseVenueTicketTypesOptions {
  venueId: string;
  selectedDate?: Date;
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function useVenueTicketTypes({ venueId, selectedDate }: UseVenueTicketTypesOptions) {
  const [tickets, setTickets] = useState<VenueTicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("venue_tickets")
        .select("*")
        .eq("venue_id", venueId)
        .order("sort_order");

      if (error) throw error;
      setTickets((data as VenueTicketType[]) || []);
    } catch (err) {
      console.error("Failed to fetch venue tickets:", err);
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`venue-tickets-${venueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_tickets", filter: `venue_id=eq.${venueId}` },
        () => fetchTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchTickets]);

  // Filter tickets based on selected date
  const filteredTickets = tickets.filter((ticket) => {
    // Never show hidden tickets
    if (ticket.status === "hidden") return false;
    
    // If no date selected, show all active tickets
    if (!selectedDate) return ticket.status === "active";
    
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    const selectedDayIndex = getDay(selectedDate);
    const selectedDayName = dayNames[selectedDayIndex];

    // Special tickets: only show on their specific dates
    if (ticket.type === "special") {
      if (ticket.specific_dates && ticket.specific_dates.length > 0) {
        return ticket.specific_dates.includes(selectedDateStr);
      }
      // Special ticket without dates → don't show
      return false;
    }

    // Regular tickets: check active_days if set
    if (ticket.active_days && ticket.active_days.length > 0) {
      return ticket.active_days.some(d => d.toLowerCase() === selectedDayName);
    }

    // Regular ticket with no day restrictions → show if active
    return ticket.status === "active";
  });

  // Calculate availability
  const ticketsWithAvailability = filteredTickets.map((ticket) => {
    const available = ticket.quantity - ticket.sold;
    const soldOut = ticket.status === "soldout" || available <= 0;
    return {
      ...ticket,
      available: Math.max(0, available),
      soldOut,
    };
  });

  const hasTicketsForDate = ticketsWithAvailability.length > 0;

  // Mutations
  const addTicket = async (ticket: Omit<VenueTicketType, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from("venue_tickets")
      .insert(ticket)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateTicket = async (id: string, updates: Partial<VenueTicketType>) => {
    const { error } = await supabase
      .from("venue_tickets")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  };

  const deleteTicket = async (id: string) => {
    const { error } = await supabase
      .from("venue_tickets")
      .delete()
      .eq("id", id);

    if (error) throw error;
  };

  return {
    tickets: ticketsWithAvailability,
    allTickets: tickets,
    isLoading,
    hasTicketsForDate,
    refetch: fetchTickets,
    addTicket,
    updateTicket,
    deleteTicket,
  };
}

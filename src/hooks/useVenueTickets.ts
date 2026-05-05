import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, getDay } from "date-fns";

interface TicketType {
  id?: string;
  name: string;
  price: number;
  quantity?: number;
  available?: number;
  sold?: number;
  status?: string;
  description?: string;
  type?: "regular" | "special";
  specificDates?: string[];
  activeDays?: string[];
}

interface VenueEvent {
  id: string;
  venue_id: string;
  event_name: string;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  description: string | null;
  image_url: string | null;
  ticket_price: number | null;
  ticket_types: TicketType[] | null;
  capacity: number | null;
  tickets_sold: number | null;
  status: string | null;
  music_genre: string | null;
  age_limit: number;
  custom_tags: string[] | null;
}

interface TicketDisplay {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string | null;
  ticketName: string;
  price: number;
  available: number;
  totalQuantity: number;
  soldOut: boolean;
  description?: string;
  type?: "regular" | "special";
  activeDays?: string[];
  specificDates?: string[];
}

interface UseVenueTicketsOptions {
  venueId: string;
  selectedDate?: Date;
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function useVenueTickets({ venueId, selectedDate }: UseVenueTicketsOptions) {
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all active events for the venue (including future dates)
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("venue_id", venueId)
        .eq("status", "active")
        .order("event_date", { ascending: true });

      if (error) throw error;

      // Parse ticket_types from JSON
      const parsedEvents = (data || []).map((e: any) => ({
        ...e,
        ticket_types: Array.isArray(e.ticket_types)
          ? e.ticket_types
          : typeof e.ticket_types === "string"
          ? JSON.parse(e.ticket_types)
          : e.ticket_types || [],
      })) as VenueEvent[];

      setEvents(parsedEvents);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  // Fetch ticket purchase counts for sold-out calculation
  const fetchPurchaseCounts = useCallback(async () => {
    if (events.length === 0) return;

    const { data, error } = await supabase
      .from("ticket_purchases")
      .select("event_name, ticket_type, quantity")
      .eq("venue_id", venueId)
      .in("status", ["active", "confirmed"]);

    if (error) {
      console.error("Failed to fetch purchase counts:", error);
      return;
    }

    // Aggregate by event name + ticket type
    const counts: Record<string, Record<string, number>> = {};
    (data || []).forEach((p: any) => {
      const key = p.event_name;
      if (!counts[key]) counts[key] = {};
      if (!counts[key][p.ticket_type]) counts[key][p.ticket_type] = 0;
      counts[key][p.ticket_type] += p.quantity || 1;
    });

    setPurchaseCounts(counts);
  }, [venueId, events]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (events.length > 0) {
      fetchPurchaseCounts();
    }
  }, [events, fetchPurchaseCounts]);

  // Real-time subscription for events
  useEffect(() => {
    const channel = supabase
      .channel(`venue-events-${venueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `venue_id=eq.${venueId}` },
        () => fetchEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchEvents]);

  // Real-time subscription for ticket purchases
  useEffect(() => {
    const channel = supabase
      .channel(`venue-ticket-purchases-${venueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_purchases", filter: `venue_id=eq.${venueId}` },
        () => fetchPurchaseCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, fetchPurchaseCounts]);

  // Filter events and tickets for selected date
  const tickets = useMemo((): TicketDisplay[] => {
    const result: TicketDisplay[] = [];
    const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
    const selectedDayName = selectedDate ? dayNames[getDay(selectedDate)].toLowerCase() : null;

    events.forEach((event) => {
      const eventPurchases = purchaseCounts[event.event_name] || {};

      if (event.ticket_types && event.ticket_types.length > 0) {
        event.ticket_types.forEach((tt: TicketType) => {
          // Handle both quantity and available fields
          const totalQty = tt.quantity || tt.available || 100;
          const alreadySold = tt.sold || 0;
          const purchasedCount = eventPurchases[tt.name] || 0;
          const totalSold = alreadySold + purchasedCount;
          const available = totalQty - totalSold;

          // Determine if ticket is sold out based on status or availability
          const isSoldOut = tt.status === "soldout" || available <= 0;

          // Check if this ticket should be shown for the selected date
          let showTicket = false;
          const ticketType = tt.type || "regular";

          if (!selectedDateStr) {
            // No date selected, show all tickets
            showTicket = true;
          } else if (ticketType === "special" && tt.specificDates && tt.specificDates.length > 0) {
            // Special ticket - show only on specific dates
            showTicket = tt.specificDates.includes(selectedDateStr);
          } else if (tt.activeDays && tt.activeDays.length > 0) {
            // Has active days configured - show on those days
            showTicket = selectedDayName ? tt.activeDays.map(d => d.toLowerCase()).includes(selectedDayName) : false;
          } else {
            // No activeDays or specificDates configured - show if event date matches OR show for any date
            // This ensures tickets without date restrictions are always visible
            showTicket = event.event_date === selectedDateStr || !tt.activeDays;
          }

          if (showTicket) {
            result.push({
              id: `${event.id}-${tt.name}`,
              eventId: event.id,
              eventName: event.event_name,
              eventDate: event.event_date,
              eventTime: event.event_time,
              ticketName: tt.name,
              price: tt.price,
              available: Math.max(0, available),
              totalQuantity: totalQty,
              soldOut: isSoldOut,
              description: tt.description,
              type: ticketType,
              activeDays: tt.activeDays,
              specificDates: tt.specificDates,
            });
          }
        });
      } else if (event.ticket_price) {
        // Single ticket type - show on event date or if no date selected
        const showTicket = !selectedDateStr || event.event_date === selectedDateStr;

        if (showTicket) {
          const sold = event.tickets_sold || 0;
          const capacity = event.capacity || 100;
          const available = capacity - sold;

          result.push({
            id: `${event.id}-general`,
            eventId: event.id,
            eventName: event.event_name,
            eventDate: event.event_date,
            eventTime: event.event_time,
            ticketName: "General Admission",
            price: event.ticket_price,
            available: Math.max(0, available),
            totalQuantity: capacity,
            soldOut: available <= 0,
          });
        }
      }
    });

    return result;
  }, [events, purchaseCounts, selectedDate]);

  // Check if any tickets exist for the date
  const hasTicketsForDate = tickets.length > 0;

  return {
    events,
    tickets,
    isLoading,
    hasTicketsForDate,
    refetch: fetchEvents,
  };
}

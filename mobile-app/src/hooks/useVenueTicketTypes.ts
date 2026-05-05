import { useState, useEffect, useCallback } from 'react';
import { format, getDay } from 'date-fns';
import { supabase } from '../config/supabase';
import { isMissingSchemaTableError } from '../utils/supabasePostgrestErrors';

export interface VenueTicketType {
    id: string;
    venue_id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    status: 'active' | 'soldout' | 'hidden';
    type: 'regular' | 'special';
    description: string | null;
    active_days: string[] | null;
    specific_dates: string[] | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

interface UseVenueTicketTypesOptions {
    venueId: string | null;
    selectedDate?: Date;
}

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function warnTickets(tag: string, err: unknown) {
    if (!isMissingSchemaTableError(err)) {
        console.warn(`[useVenueTicketTypes] ${tag}`, err);
    }
}

export function useVenueTicketTypes({ venueId, selectedDate }: UseVenueTicketTypesOptions) {
    const activeVenueId = venueId?.trim() || '';
    const [tickets, setTickets] = useState<VenueTicketType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTickets = useCallback(async () => {
        if (!activeVenueId) {
            setTickets([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('venue_tickets')
                .select('*')
                .eq('venue_id', activeVenueId)
                .order('sort_order');

            if (error) throw error;
            setTickets((data as VenueTicketType[]) || []);
        } catch (err) {
            warnTickets('fetch', err);
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeVenueId]);

    useEffect(() => {
        void fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        if (!activeVenueId) return;
        const channel = supabase
            .channel(`venue-tickets-${activeVenueId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'venue_tickets',
                    filter: `venue_id=eq.${activeVenueId}`,
                },
                () => {
                    void fetchTickets();
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [activeVenueId, fetchTickets]);

    const filteredTickets = tickets.filter((ticket) => {
        if (ticket.status === 'hidden') return false;
        if (!selectedDate) return ticket.status === 'active';
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        const selectedDayIndex = getDay(selectedDate);
        const selectedDayName = dayNames[selectedDayIndex];
        if (ticket.type === 'special') {
            if (ticket.specific_dates && ticket.specific_dates.length > 0) {
                return ticket.specific_dates.includes(selectedDateStr);
            }
            return false;
        }
        if (ticket.active_days && ticket.active_days.length > 0) {
            return ticket.active_days.some((d) => d.toLowerCase() === selectedDayName);
        }
        return ticket.status === 'active';
    });

    const ticketsWithAvailability = filteredTickets.map((ticket) => {
        const available = ticket.quantity - ticket.sold;
        const soldOut = ticket.status === 'soldout' || available <= 0;
        return {
            ...ticket,
            available: Math.max(0, available),
            soldOut,
        };
    });

    const hasTicketsForDate = ticketsWithAvailability.length > 0;

    const addTicket = async (ticket: Omit<VenueTicketType, 'id' | 'created_at' | 'updated_at'>) => {
        // Avoid `.select().single()` here: insert can succeed but returning 0 rows (RLS / PGRST116) still fails the call.
        const { error } = await supabase.from('venue_tickets').insert(ticket);
        if (error) throw error;
        await fetchTickets();
    };

    const updateTicket = async (id: string, updates: Partial<VenueTicketType>) => {
        const { error } = await supabase.from('venue_tickets').update(updates).eq('id', id);
        if (error) throw error;
    };

    const deleteTicket = async (id: string) => {
        const { error } = await supabase.from('venue_tickets').delete().eq('id', id);
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

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { isMissingSchemaTableError } from '../utils/supabasePostgrestErrors';

/** Row shape for `ticket_purchases` (+ optional joined `guests`). */
export type TicketPurchaseRow = {
    id: string;
    created_at: string;
    venue_id: string;
    ticket_id: string;
    guest_name: string;
    guest_email: string | null;
    guest_id: string | null;
    ticket_type: string;
    event_name: string | null;
    event_date: string;
    quantity: number | null;
    price: number;
    status: string;
    guests?: { name: string; guest_id: string } | null;
};

export type TicketPurchaseInsert = Omit<TicketPurchaseRow, 'id' | 'created_at' | 'guests'>;

interface UseRealtimeTicketPurchasesOptions {
    venueId?: string | null;
    eventDate?: string;
    statusFilter?: string[];
    limit?: number;
}

function warnPurchases(tag: string, err: unknown) {
    if (!isMissingSchemaTableError(err)) {
        console.warn(`[useRealtimeTicketPurchases] ${tag}`, err);
    }
}

export function useRealtimeTicketPurchases(options: UseRealtimeTicketPurchasesOptions = {}) {
    const { venueId, eventDate, statusFilter, limit = 100 } = options;
    const activeVenueId = venueId?.trim() || '';
    const [purchases, setPurchases] = useState<TicketPurchaseRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchPurchases = useCallback(async () => {
        if (!activeVenueId) {
            setPurchases([]);
            setIsLoading(false);
            setError(null);
            return;
        }
        try {
            setIsLoading(true);
            let query = supabase
                .from('ticket_purchases')
                .select('*, guests(name, guest_id)')
                .order('created_at', { ascending: false })
                .limit(limit);

            query = query.eq('venue_id', activeVenueId);
            if (eventDate) {
                query = query.eq('event_date', eventDate);
            }
            if (statusFilter && statusFilter.length > 0) {
                query = query.in('status', statusFilter);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            setPurchases((data as TicketPurchaseRow[]) || []);
            setError(null);
        } catch (err) {
            warnPurchases('fetch', err);
            setPurchases([]);
            setError(err instanceof Error ? err : new Error('Failed to fetch purchases'));
        } finally {
            setIsLoading(false);
        }
    }, [activeVenueId, eventDate, statusFilter, limit]);

    useEffect(() => {
        void fetchPurchases();
    }, [fetchPurchases]);

    useEffect(() => {
        if (!activeVenueId) return;
        const channel = supabase
            .channel('ticket-purchases-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ticket_purchases',
                },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const row = payload.new as { id?: string };
                        if (!row?.id) return;
                        const { data } = await supabase
                            .from('ticket_purchases')
                            .select('*, guests(name, guest_id)')
                            .eq('id', row.id)
                            .single();

                        if (data) {
                            const d = data as TicketPurchaseRow;
                            let matches = true;
                            if (activeVenueId && d.venue_id !== activeVenueId) matches = false;
                            if (eventDate && d.event_date !== eventDate) matches = false;
                            if (
                                statusFilter &&
                                statusFilter.length > 0 &&
                                !statusFilter.includes(d.status)
                            ) {
                                matches = false;
                            }
                            if (matches) {
                                setPurchases((prev) => [d, ...prev].slice(0, limit));
                            }
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        const row = payload.new as { id?: string };
                        if (!row?.id) return;
                        const { data } = await supabase
                            .from('ticket_purchases')
                            .select('*, guests(name, guest_id)')
                            .eq('id', row.id)
                            .single();

                        if (data) {
                            const d = data as TicketPurchaseRow;
                            setPurchases((prev) => prev.map((p) => (p.id === d.id ? d : p)));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const oldRow = payload.old as { id?: string };
                        if (oldRow?.id) {
                            setPurchases((prev) => prev.filter((p) => p.id !== oldRow.id));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [activeVenueId, eventDate, statusFilter, limit]);

    const addPurchase = useCallback(async (purchase: TicketPurchaseInsert) => {
        const { data, error: insertError } = await supabase
            .from('ticket_purchases')
            .insert(purchase)
            .select('*, guests(name, guest_id)')
            .single();

        if (insertError) throw insertError;
        return data as TicketPurchaseRow;
    }, []);

    const updatePurchase = useCallback(async (id: string, updates: Partial<TicketPurchaseRow>) => {
        const { data, error: updateError } = await supabase
            .from('ticket_purchases')
            .update(updates)
            .eq('id', id)
            .select('*, guests(name, guest_id)')
            .single();

        if (updateError) throw updateError;
        return data as TicketPurchaseRow;
    }, []);

    const deletePurchase = useCallback(async (id: string) => {
        const { error: delError } = await supabase.from('ticket_purchases').delete().eq('id', id);
        if (delError) throw delError;
    }, []);

    return {
        purchases,
        isLoading,
        error,
        refetch: fetchPurchases,
        addPurchase,
        updatePurchase,
        deletePurchase,
    };
}

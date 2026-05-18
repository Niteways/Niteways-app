import { supabase } from '../config/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/** Postgres change event filter — matches Supabase's `event` string. */
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface SubscribeOptions {
    /** Source table, e.g. `table_bookings`. */
    table: string;
    /** Optional channel name (must be unique per subscription). Defaults to a random one. */
    channel?: string;
    /** Schema name; defaults to `public`. */
    schema?: string;
    /** Optional Supabase filter expression, e.g. `venue_id=eq.<uuid>`. */
    filter?: string;
    /** Defaults to `*` (all events). */
    event?: RealtimeEvent;
}

/**
 * Subscribe to Postgres changes on a single table. Returns an unsubscribe function.
 *
 *     const unsub = subscribeToTable(
 *       { table: 'table_bookings', filter: `venue_id=eq.${venueId}` },
 *       payload => refetch(),
 *     );
 *     // later: unsub();
 *
 * Mirrors `src/lib/realtime.ts` so both halves of the venue portal use the same wire-up.
 */
export function subscribeToTable<
    T extends Record<string, unknown> = Record<string, unknown>
>(
    options: SubscribeOptions,
    onChange: (payload: RealtimePostgresChangesPayload<T>) => void
): () => void {
    const channelName =
        options.channel ?? `rt-${options.table}-${Math.random().toString(36).slice(2, 9)}`;
    const config: {
        event: RealtimeEvent;
        schema: string;
        table: string;
        filter?: string;
    } = {
        event: options.event ?? '*',
        schema: options.schema ?? 'public',
        table: options.table,
    };
    if (options.filter) config.filter = options.filter;

    const ch = supabase
        .channel(channelName)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any, config as any, (payload: RealtimePostgresChangesPayload<T>) => {
            onChange(payload);
        })
        .subscribe();

    return () => {
        void supabase.removeChannel(ch);
    };
}

/** Subscribe to multiple tables at once and return a single unsubscribe. */
export function subscribeToTables(
    subscriptions: Array<{ options: SubscribeOptions; onChange: () => void }>
): () => void {
    const unsubs = subscriptions.map((s) => subscribeToTable(s.options, () => s.onChange()));
    return () => unsubs.forEach((u) => u());
}

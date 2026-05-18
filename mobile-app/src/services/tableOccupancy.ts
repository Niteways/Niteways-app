/**
 * RN twin of `src/lib/tableOccupancy.ts` — kept byte-compatible at the type
 * level so both apps can read the same Supabase rows and produce the same
 * status map. See the web file for inline rationale.
 */

export type TableOccupancyStatus =
    | 'free'
    | 'reserved'
    | 'occupied'
    | 'blocked';

export type CanonicalBookingStatus =
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'checked_in'
    | 'no_show'
    | 'completed'
    | 'blocked';

export interface OccupancyTableRow {
    table_label: string;
    status?: string | null;
}

export interface OccupancyBookingRow {
    table_number: string;
    status: CanonicalBookingStatus | string;
}

const OCCUPIED_STATUSES = new Set<string>(['checked_in']);
const RESERVED_STATUSES = new Set<string>(['pending', 'confirmed']);

export function deriveTableOccupancy(
    tables: OccupancyTableRow[],
    bookings: OccupancyBookingRow[]
): Map<string, TableOccupancyStatus> {
    const result = new Map<string, TableOccupancyStatus>();

    for (const t of tables) {
        const s = (t.status || '').toLowerCase();
        result.set(t.table_label, s === 'inactive' || s === 'blocked' ? 'blocked' : 'free');
    }

    for (const b of bookings) {
        const label = b.table_number;
        const s = String(b.status || '').toLowerCase();
        if (OCCUPIED_STATUSES.has(s)) {
            if (result.get(label) !== 'blocked') {
                result.set(label, 'occupied');
            }
            continue;
        }
        if (RESERVED_STATUSES.has(s)) {
            const prev = result.get(label);
            if (prev !== 'blocked' && prev !== 'occupied') {
                result.set(label, 'reserved');
            }
        }
    }

    return result;
}

export function getTableOccupancy(
    label: string,
    occupancy: Map<string, TableOccupancyStatus>
): TableOccupancyStatus {
    return occupancy.get(label) ?? 'free';
}

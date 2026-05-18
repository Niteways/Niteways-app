/**
 * Tier 1 — shared, pure derivation of "what state is each table in right now?"
 * for the floor map / table widgets. Both the web portal and the native app
 * should call into this so they show the same status for the same data.
 *
 * Inputs are intentionally narrow — just the columns we need from
 * `venue_tables` and `table_bookings`. Callers can fetch with their own
 * filters (date, venue, etc.) and pass the trimmed rows in.
 */

export type TableOccupancyStatus =
  | "free"
  | "reserved"
  | "occupied"
  | "blocked";

/** Canonical booking statuses we read from `table_bookings.status`. */
export type CanonicalBookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "checked_in"
  | "no_show"
  | "completed"
  | "blocked";

export interface OccupancyTableRow {
  /** Stable identifier used to group bookings (table_number on the booking). */
  table_label: string;
  /** `inactive` / `blocked` tables are marked blocked regardless of bookings. */
  status?: string | null;
}

export interface OccupancyBookingRow {
  table_number: string;
  status: CanonicalBookingStatus | string;
}

const OCCUPIED_STATUSES = new Set<string>(["checked_in"]);
const RESERVED_STATUSES = new Set<string>(["pending", "confirmed"]);

/**
 * Returns a map of `table_label → status`. Tables without any active booking
 * resolve to `free`; tables explicitly flagged inactive resolve to `blocked`.
 */
export function deriveTableOccupancy(
  tables: OccupancyTableRow[],
  bookings: OccupancyBookingRow[]
): Map<string, TableOccupancyStatus> {
  const result = new Map<string, TableOccupancyStatus>();

  for (const t of tables) {
    const s = (t.status || "").toLowerCase();
    result.set(t.table_label, s === "inactive" || s === "blocked" ? "blocked" : "free");
  }

  // Occupied wins over reserved — a checked-in table is the strongest signal.
  for (const b of bookings) {
    const label = b.table_number;
    const s = String(b.status || "").toLowerCase();
    if (OCCUPIED_STATUSES.has(s)) {
      if (result.get(label) !== "blocked") {
        result.set(label, "occupied");
      }
      continue;
    }
    if (RESERVED_STATUSES.has(s)) {
      const prev = result.get(label);
      if (prev !== "blocked" && prev !== "occupied") {
        result.set(label, "reserved");
      }
    }
  }

  return result;
}

export function getTableOccupancy(
  label: string,
  occupancy: Map<string, TableOccupancyStatus>
): TableOccupancyStatus {
  return occupancy.get(label) ?? "free";
}

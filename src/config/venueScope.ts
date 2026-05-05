/**
 * Default `venues.id` when the web portal is not impersonating another venue.
 *
 * Set `VITE_DEFAULT_VENUE_ID` on Railway (and locally in `.env`) to the same UUID
 * the native venue app uses (`profiles.venue_id` for that staff account) so both
 * clients read and write the same rows in Supabase.
 */
const LEGACY_DEMO_VENUE_ID = "f5d0702a-6bd9-42e1-bf2d-87681c103d17";

function readEnvVenueId(): string | null {
  const raw = import.meta.env.VITE_DEFAULT_VENUE_ID;
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || v === "undefined") return null;
  return /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

export const DEFAULT_VENUE_ID = readEnvVenueId() ?? LEGACY_DEMO_VENUE_ID;

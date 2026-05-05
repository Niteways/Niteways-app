/**
 * Resolves which `venues.id` the web venue portal uses when not impersonating.
 *
 * Order (first match wins):
 * 1. URL query `?venue_id=` or `?venue=` (UUID) — also saved to sessionStorage for next visits
 * 2. `sessionStorage.niteways_portal_venue_id` (UUID) — set manually in devtools or by future UI
 * 3. `VITE_DEFAULT_VENUE_ID` from the **build** (Railway must expose this var during `vite build`)
 * 4. Legacy demo UUID
 *
 * Tip: open `https://…railway.app/?venue_id=<your-venues.id>` once to pin the venue without redeploying.
 */
const LEGACY_DEMO_VENUE_ID = "f5d0702a-6bd9-42e1-bf2d-87681c103d17";

const UUID_RE = /^[0-9a-f-]{36}$/i;

function readBuildTimeVenueId(): string | null {
  const raw = import.meta.env.VITE_DEFAULT_VENUE_ID;
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v || v === "undefined") return null;
  return UUID_RE.test(v) ? v : null;
}

export function getPortalScopeVenueId(): string {
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      for (const key of ["venue_id", "venue"] as const) {
        const raw = params.get(key)?.trim();
        if (raw && UUID_RE.test(raw)) {
          try {
            sessionStorage.setItem("niteways_portal_venue_id", raw);
          } catch {
            /* private mode / quota */
          }
          return raw;
        }
      }
      const stored = sessionStorage.getItem("niteways_portal_venue_id")?.trim();
      if (stored && UUID_RE.test(stored)) return stored;
    } catch {
      /* ignore */
    }
  }
  return readBuildTimeVenueId() ?? LEGACY_DEMO_VENUE_ID;
}

import { supabase } from "@/integrations/supabase/client";
import { resolveWebPortalVenueForUser } from "@/services/resolveWebPortalVenueForUser";

/**
 * Auto-resolves the signed-in venue user's `venues.id` and stores it in
 * sessionStorage, so the legacy `getPortalScopeVenueId()` (used by ~20 pages)
 * picks it up without each call site having to be refactored to the async
 * `useResolvedPortalVenueId` hook.
 *
 * Wiring:
 *   - on app start, syncs from any existing session
 *   - on `SIGNED_IN` / `TOKEN_REFRESHED`, re-syncs
 *   - on `SIGNED_OUT`, clears the cached value so the next user doesn't
 *     accidentally inherit the previous owner's venue
 *
 * Idempotent: calling more than once is a no-op (only the first call
 * subscribes to auth state changes).
 */
const SESSION_KEY = "niteways_portal_venue_id";

let started = false;

async function syncFromCurrentSession() {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    const vid = await resolveWebPortalVenueForUser(uid);
    if (vid) {
      try {
        sessionStorage.setItem(SESSION_KEY, vid);
      } catch {
        /* private mode / quota — silently ignore; the sync hook still works */
      }
    }
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[portalVenueScopeInit] sync error", e);
    }
  }
}

export function initPortalVenueScope(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  void syncFromCurrentSession();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    if (session?.user?.id) {
      void syncFromCurrentSession();
    }
  });
}

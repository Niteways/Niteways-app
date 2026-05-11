import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { getPortalScopeVenueId } from "@/config/venueScope";
import { supabase } from "@/integrations/supabase/client";
import { resolveWebPortalVenueForUser } from "@/services/resolveWebPortalVenueForUser";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * Resolves `venues.id` for the web venue portal so it matches the native app:
 * impersonation → explicit URL `venue_id` / `venue` → signed-in user's
 * `profiles.venue_id` → `venue_team_members` → `venues.owner_id` / metadata
 * → `getPortalScopeVenueId()` (sessionStorage / env / demo fallback).
 */
export function useResolvedPortalVenueId() {
  const [searchParams] = useSearchParams();
  const { isImpersonating, impersonatedVenueId } = useImpersonation();

  const queryVenueId = useMemo(() => {
    const raw = searchParams.get("venue_id")?.trim() || searchParams.get("venue")?.trim();
    return raw && UUID_RE.test(raw) ? raw : null;
  }, [searchParams]);

  const [authVenueId, setAuthVenueId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reResolve = useCallback(async () => {
    if (isImpersonating && impersonatedVenueId) {
      setAuthVenueId(null);
      setReady(true);
      return;
    }
    if (queryVenueId) {
      setAuthVenueId(null);
      setReady(true);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setAuthVenueId(null);
      setReady(true);
      return;
    }

    const vid = await resolveWebPortalVenueForUser(uid);
    setAuthVenueId(vid);
    setReady(true);
  }, [isImpersonating, impersonatedVenueId, queryVenueId]);

  useEffect(() => {
    void reResolve();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void reResolve();
    });
    return () => subscription.unsubscribe();
  }, [reResolve]);

  const activeVenueId = useMemo(() => {
    if (isImpersonating && impersonatedVenueId) return impersonatedVenueId;
    if (queryVenueId) return queryVenueId;
    /** Avoid a one-frame fetch against sessionStorage/demo before profile resolution finishes. */
    if (!ready) return null;
    if (authVenueId) return authVenueId;
    return getPortalScopeVenueId();
  }, [isImpersonating, impersonatedVenueId, queryVenueId, ready, authVenueId]);

  return { activeVenueId, venueIdReady: ready, refreshVenueScope: reResolve };
}

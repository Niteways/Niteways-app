import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { REQUIRE_VENUE_PORTAL_AUTH } from "@/config/deployMode";

/**
 * Wraps all venue portal routes. When REQUIRE_VENUE_PORTAL_AUTH is on (Railway venue-only
 * or VITE_REQUIRE_VENUE_LOGIN), redirects anonymous users to /login.
 */
export function VenuePortalGate() {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "ok" | "anon">("loading");

  useEffect(() => {
    if (!REQUIRE_VENUE_PORTAL_AUTH) {
      setStatus("ok");
      return;
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "ok" : "anon");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "ok" : "anon");
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!REQUIRE_VENUE_PORTAL_AUTH) {
    return <Outlet />;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (status === "anon") {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}

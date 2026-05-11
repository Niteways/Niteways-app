/**
 * Railway / production: set VITE_VENUE_PORTAL_ONLY=true so the web build only
 * exposes the Venue Portal (no Admin Portal switch, no User App preview).
 *
 * @see VITE_DEPLOY_MODE=venue_portal_only (alternative)
 */
export const IS_VENUE_PORTAL_ONLY =
  import.meta.env.VITE_VENUE_PORTAL_ONLY === "true" ||
  import.meta.env.VITE_VENUE_PORTAL_ONLY === "1" ||
  import.meta.env.VITE_DEPLOY_MODE === "venue_portal_only";

/** When true, venue routes require Supabase email/password (see VenuePortalGate). */
export const REQUIRE_VENUE_PORTAL_AUTH =
  IS_VENUE_PORTAL_ONLY ||
  import.meta.env.VITE_REQUIRE_VENUE_LOGIN === "true" ||
  import.meta.env.VITE_REQUIRE_VENUE_LOGIN === "1";

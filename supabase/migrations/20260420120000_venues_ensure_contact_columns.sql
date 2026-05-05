-- Ensure public.venues has the contact columns used by the Venue Portal > Settings > Venue tab.
-- The original venues schema (20251214220006_...) already declares email/phone, but some
-- drifted databases are missing them (PGRST 42703 "column venues.email does not exist"),
-- which breaks fetchVenueInfo / updateVenueInfo in mobile-app/src/services/venuePortal.ts.

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS phone TEXT;

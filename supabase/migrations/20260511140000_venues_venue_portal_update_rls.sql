-- Venue mobile app (Venue Info / Settings): UPDATE must affect a row under RLS.
-- If "Public update venues" was removed on production without an owner policy,
-- PostgREST returns success with 0 rows — the app shows "Venue update affected no row".
--
-- NOTE: If SELECT RLS on `profiles` / `venue_team_members` blocks the caller, inline EXISTS
-- in policies may never match. Prefer also applying:
--   20260511150000_venues_portal_update_rls_security_definer.sql

DROP POLICY IF EXISTS "Venue portal users update own venue" ON public.venues;

CREATE POLICY "Venue portal users update own venue"
ON public.venues
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.venue_id = venues.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.venue_team_members m
    WHERE m.user_id = auth.uid()
      AND m.venue_id = venues.id
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.venue_id = venues.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.venue_team_members m
    WHERE m.user_id = auth.uid()
      AND m.venue_id = venues.id
  )
);

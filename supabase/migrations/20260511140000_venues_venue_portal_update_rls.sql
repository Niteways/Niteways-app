-- Venue mobile app (Venue Info / Settings): UPDATE must affect a row under RLS.
-- If "Public update venues" was removed on production without an owner policy,
-- PostgREST returns success with 0 rows — the app shows "Venue update affected no row".
--
-- This policy allows authenticated users linked to the venue to UPDATE it:
--   • venues.owner_id = auth.uid()
--   • profiles.id = auth.uid() AND profiles.venue_id = venues.id
--   • venue_team_members.user_id = auth.uid() AND venue_id matches

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

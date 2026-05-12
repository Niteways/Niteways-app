-- Venue portal saves: UPDATE policies that reference profiles / venue_team_members run those
-- subqueries as the **caller**. If SELECT RLS on those tables hides rows from the venue owner,
-- the EXISTS never matches → UPDATE affects 0 rows (mobile shows "Venue update affected no row").
--
-- This helper runs as definer so linkage checks see the real rows (still gated on auth.uid()).

CREATE OR REPLACE FUNCTION public.can_portal_user_manage_venue(p_venue_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.venues v
    WHERE v.id = p_venue_id
      AND (
        v.owner_id = uid
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = uid
            AND p.venue_id = v.id
        )
        OR EXISTS (
          SELECT 1
          FROM public.venue_team_members m
          WHERE m.user_id = uid
            AND m.venue_id = v.id
        )
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_portal_user_manage_venue(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_portal_user_manage_venue(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_portal_user_manage_venue(uuid) TO authenticated;

DROP POLICY IF EXISTS "Venue portal users update own venue" ON public.venues;

CREATE POLICY "Venue portal users update own venue"
ON public.venues
FOR UPDATE
TO public
USING (public.can_portal_user_manage_venue(id))
WITH CHECK (public.can_portal_user_manage_venue(id));

GRANT UPDATE ON TABLE public.venues TO anon;
GRANT UPDATE ON TABLE public.venues TO authenticated;

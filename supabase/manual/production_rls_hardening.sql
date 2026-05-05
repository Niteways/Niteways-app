-- =============================================================================
-- Production RLS hardening for shared Niteways backend
--
-- Goal:
--   One Supabase project used by:
--   - Railway Venue Web Portal
--   - Native Venue App
--   - Consumer User App
--
-- IMPORTANT:
--   Review in staging before running in production. This replaces broad MVP
--   "USING (true)" policies with user-owned and venue-scoped policies.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Canonical profile fields used by mobile routing and RLS helper functions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'guest',
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_profiles_venue_id ON public.profiles(venue_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON public.venues(owner_id);

-- -----------------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER avoids recursive RLS when policies need to
-- check venue_team_members or user_roles.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', '');
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role::text IN ('super_admin', 'admin')
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_venue_owner(_venue_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.venues v
      WHERE v.id = _venue_id
        AND v.owner_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _user_id
        AND p.venue_id = _venue_id
        AND p.role IN ('venue_owner', 'owner', 'admin')
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_venue_team_member(_venue_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.venue_team_members vtm
      WHERE vtm.venue_id = _venue_id
        AND vtm.status = 'active'
        AND (
          vtm.user_id = _user_id
          OR lower(vtm.email) = lower(public.current_user_email())
        )
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_venue(_venue_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.is_platform_admin(_user_id)
    OR public.is_venue_owner(_venue_id, _user_id)
    OR public.is_venue_team_member(_venue_id, _user_id),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_storage_venue_path(_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  first_folder text;
  second_folder text;
  parsed_venue_id uuid;
BEGIN
  first_folder := split_part(_object_name, '/', 1);
  second_folder := split_part(_object_name, '/', 2);

  BEGIN
    parsed_venue_id := CASE
      WHEN first_folder = 'venues' THEN second_folder::uuid
      ELSE first_folder::uuid
    END;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN public.is_platform_admin(auth.uid());
  END;

  RETURN public.can_manage_venue(parsed_venue_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_email() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_venue_owner(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_venue_team_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_venue(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_storage_venue_path(text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Drop old broad policies on tables that are shared across the apps.
-- -----------------------------------------------------------------------------
DO $do$
DECLARE
  target_table text;
  existing_policy record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'profiles',
    'cities',
    'venues',
    'guests',
    'guest_visits',
    'table_bookings',
    'guest_list_entries',
    'ticket_purchases',
    'activity_logs',
    'events',
    'user_favorites',
    'user_notifications',
    'user_profiles',
    'venue_team_members',
    'venue_tickets',
    'recurring_guest_lists',
    'recurring_list_guests',
    'recurring_list_permissions',
    'one_day_guest_lists',
    'one_day_list_guests',
    'guest_list_types',
    'venue_tables',
    'floor_plans',
    'floor_plan_rooms',
    'special_date_pricing',
    'table_pricing_history',
    'venue_documents',
    'platform_activity_logs'
  ]
  LOOP
    IF to_regclass('public.' || target_table) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);

      FOR existing_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = target_table
      LOOP
        EXECUTE format(
          'DROP POLICY IF EXISTS %I ON public.%I',
          existing_policy.policyname,
          target_table
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$do$;

-- -----------------------------------------------------------------------------
-- Public catalogue data.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view active cities"
ON public.cities
FOR SELECT
USING (status = 'active' OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can manage cities"
ON public.cities
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Public can view active venues"
ON public.venues
FOR SELECT
USING (
  (status = 'active' AND deleted_at IS NULL)
  OR public.can_manage_venue(id)
);

CREATE POLICY "Venue owners and admins can insert venues"
ON public.venues
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR owner_id = auth.uid()
);

CREATE POLICY "Venue owners and admins can update venues"
ON public.venues
FOR UPDATE
TO authenticated
USING (public.can_manage_venue(id))
WITH CHECK (
  public.can_manage_venue(id)
  OR public.is_platform_admin(auth.uid())
  OR owner_id = auth.uid()
);

CREATE POLICY "Venue owners and admins can delete venues"
ON public.venues
FOR DELETE
TO authenticated
USING (public.can_manage_venue(id));

-- -----------------------------------------------------------------------------
-- Profiles and user-owned data.
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_platform_admin(auth.uid()))
WITH CHECK (id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can view own user profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can insert own user profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can update own user profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can view own favorites"
ON public.user_favorites
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can add own favorites"
ON public.user_favorites
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can remove own favorites"
ON public.user_favorites
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can view own notifications"
ON public.user_notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR lower(COALESCE(user_email, '')) = lower(public.current_user_email())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can create own notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR lower(COALESCE(user_email, '')) = lower(public.current_user_email())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can mark own notifications"
ON public.user_notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR lower(COALESCE(user_email, '')) = lower(public.current_user_email())
  OR public.is_platform_admin(auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR lower(COALESCE(user_email, '')) = lower(public.current_user_email())
  OR public.is_platform_admin(auth.uid())
);

-- -----------------------------------------------------------------------------
-- Venue team and operational data.
-- -----------------------------------------------------------------------------
CREATE POLICY "Venue staff can view their team"
ON public.venue_team_members
FOR SELECT
TO authenticated
USING (
  public.can_manage_venue(venue_id)
  OR user_id = auth.uid()
  OR lower(email) = lower(public.current_user_email())
);

CREATE POLICY "Venue owners and admins can add team members"
ON public.venue_team_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.is_venue_owner(venue_id)
);

CREATE POLICY "Venue owners and admins can update team members"
ON public.venue_team_members
FOR UPDATE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.is_venue_owner(venue_id)
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR public.is_venue_owner(venue_id)
);

CREATE POLICY "Venue owners and admins can delete team members"
ON public.venue_team_members
FOR DELETE
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR public.is_venue_owner(venue_id)
);

CREATE POLICY "Venue staff can manage guests"
ON public.guests
FOR ALL
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR (venue_id IS NOT NULL AND public.can_manage_venue(venue_id))
  OR lower(COALESCE(email, '')) = lower(public.current_user_email())
)
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR (venue_id IS NOT NULL AND public.can_manage_venue(venue_id))
  OR lower(COALESCE(email, '')) = lower(public.current_user_email())
);

CREATE POLICY "Venue staff can manage guest visits"
ON public.guest_visits
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Users and venue staff can view table bookings"
ON public.table_bookings
FOR SELECT
TO authenticated
USING (
  public.can_manage_venue(venue_id)
  OR guest_id = auth.uid()
  OR lower(COALESCE(guest_email, '')) = lower(public.current_user_email())
);

CREATE POLICY "Users and venue staff can create table bookings"
ON public.table_bookings
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_venue(venue_id)
  OR guest_id = auth.uid()
  OR lower(COALESCE(guest_email, '')) = lower(public.current_user_email())
);

CREATE POLICY "Users and venue staff can update table bookings"
ON public.table_bookings
FOR UPDATE
TO authenticated
USING (
  public.can_manage_venue(venue_id)
  OR guest_id = auth.uid()
  OR lower(COALESCE(guest_email, '')) = lower(public.current_user_email())
)
WITH CHECK (
  public.can_manage_venue(venue_id)
  OR guest_id = auth.uid()
  OR lower(COALESCE(guest_email, '')) = lower(public.current_user_email())
);

CREATE POLICY "Venue staff can delete table bookings"
ON public.table_bookings
FOR DELETE
TO authenticated
USING (public.can_manage_venue(venue_id));

CREATE POLICY "Users and venue staff can view guest list entries"
ON public.guest_list_entries
FOR SELECT
TO authenticated
USING (
  public.can_manage_venue(venue_id)
  OR added_by IN (auth.uid()::text, public.current_user_email())
);

CREATE POLICY "Users and venue staff can create guest list entries"
ON public.guest_list_entries
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_venue(venue_id)
  OR added_by IN (auth.uid()::text, public.current_user_email())
);

CREATE POLICY "Venue staff can update guest list entries"
ON public.guest_list_entries
FOR UPDATE
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can delete guest list entries"
ON public.guest_list_entries
FOR DELETE
TO authenticated
USING (public.can_manage_venue(venue_id));

-- -----------------------------------------------------------------------------
-- Ticketing.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view active venue tickets"
ON public.venue_tickets
FOR SELECT
USING (status = 'active' OR public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage venue tickets"
ON public.venue_tickets
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Users and venue staff can view ticket purchases"
ON public.ticket_purchases
FOR SELECT
TO authenticated
USING (
  public.can_manage_venue(venue_id)
  OR guest_id = auth.uid()
  OR lower(COALESCE(guest_email, '')) = lower(public.current_user_email())
);

CREATE POLICY "Users and venue staff can create ticket purchases"
ON public.ticket_purchases
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_venue(venue_id)
  OR guest_id = auth.uid()
  OR lower(COALESCE(guest_email, '')) = lower(public.current_user_email())
);

CREATE POLICY "Venue staff can update ticket purchases"
ON public.ticket_purchases
FOR UPDATE
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

-- -----------------------------------------------------------------------------
-- Events and advanced venue-only features.
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can view active events"
ON public.events
FOR SELECT
USING (status = 'active' OR public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage events"
ON public.events
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage recurring guest lists"
ON public.recurring_guest_lists
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage recurring list guests"
ON public.recurring_list_guests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recurring_guest_lists rgl
    WHERE rgl.id = recurring_list_id
      AND public.can_manage_venue(rgl.venue_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.recurring_guest_lists rgl
    WHERE rgl.id = recurring_list_id
      AND public.can_manage_venue(rgl.venue_id)
  )
);

CREATE POLICY "Venue staff can manage recurring list permissions"
ON public.recurring_list_permissions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.recurring_guest_lists rgl
    WHERE rgl.id = recurring_list_id
      AND public.can_manage_venue(rgl.venue_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.recurring_guest_lists rgl
    WHERE rgl.id = recurring_list_id
      AND public.can_manage_venue(rgl.venue_id)
  )
);

CREATE POLICY "Venue staff can manage one day guest lists"
ON public.one_day_guest_lists
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage one day list guests"
ON public.one_day_list_guests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.one_day_guest_lists odgl
    WHERE odgl.id = list_id
      AND public.can_manage_venue(odgl.venue_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.one_day_guest_lists odgl
    WHERE odgl.id = list_id
      AND public.can_manage_venue(odgl.venue_id)
  )
);

CREATE POLICY "Venue staff can manage guest list types"
ON public.guest_list_types
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Public can view venue tables"
ON public.venue_tables
FOR SELECT
USING (true);

CREATE POLICY "Venue staff can manage venue tables"
ON public.venue_tables
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage floor plans"
ON public.floor_plans
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage floor plan rooms"
ON public.floor_plan_rooms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.floor_plans fp
    WHERE fp.id = floor_plan_id
      AND public.can_manage_venue(fp.venue_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.floor_plans fp
    WHERE fp.id = floor_plan_id
      AND public.can_manage_venue(fp.venue_id)
  )
);

CREATE POLICY "Venue staff can manage special date pricing"
ON public.special_date_pricing
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage table pricing history"
ON public.table_pricing_history
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

CREATE POLICY "Venue staff can manage venue documents"
ON public.venue_documents
FOR ALL
TO authenticated
USING (public.can_manage_venue(venue_id))
WITH CHECK (public.can_manage_venue(venue_id));

-- -----------------------------------------------------------------------------
-- Logs. Inserts are scoped to admins/venue staff to prevent anonymous log spam.
-- -----------------------------------------------------------------------------
CREATE POLICY "Venue staff can view activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin(auth.uid())
  OR (venue_id IS NOT NULL AND public.can_manage_venue(venue_id))
);

CREATE POLICY "Venue staff can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR (venue_id IS NOT NULL AND public.can_manage_venue(venue_id))
);

CREATE POLICY "Admins can view platform activity logs"
ON public.platform_activity_logs
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admins can insert platform activity logs"
ON public.platform_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- Storage buckets.
-- Convention: scoped venue files should be stored under:
--   <venue_uuid>/<file-name>
-- or the mobile app's current:
--   venues/<venue_uuid>/<file-name>
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('venue-gallery', 'venue-gallery', true),
  ('venue-menus', 'venue-menus', true),
  ('venue-documents', 'venue-documents', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "venue-gallery public read" ON storage.objects;
DROP POLICY IF EXISTS "venue-gallery auth insert" ON storage.objects;
DROP POLICY IF EXISTS "venue-gallery auth update" ON storage.objects;
DROP POLICY IF EXISTS "venue-gallery auth delete" ON storage.objects;
DROP POLICY IF EXISTS "venue-menus public read" ON storage.objects;
DROP POLICY IF EXISTS "venue-menus auth insert" ON storage.objects;
DROP POLICY IF EXISTS "venue-menus auth update" ON storage.objects;
DROP POLICY IF EXISTS "venue-menus auth delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read venue documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage venue documents objects" ON storage.objects;
DROP POLICY IF EXISTS "venue-gallery venue staff insert" ON storage.objects;
DROP POLICY IF EXISTS "venue-gallery venue staff update" ON storage.objects;
DROP POLICY IF EXISTS "venue-gallery venue staff delete" ON storage.objects;
DROP POLICY IF EXISTS "venue-menus venue staff insert" ON storage.objects;
DROP POLICY IF EXISTS "venue-menus venue staff update" ON storage.objects;
DROP POLICY IF EXISTS "venue-menus venue staff delete" ON storage.objects;
DROP POLICY IF EXISTS "venue-documents venue staff read" ON storage.objects;
DROP POLICY IF EXISTS "venue-documents venue staff manage" ON storage.objects;

CREATE POLICY "venue-gallery public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'venue-gallery');

CREATE POLICY "venue-gallery venue staff insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'venue-gallery'
  AND public.can_manage_storage_venue_path(name)
);

CREATE POLICY "venue-gallery venue staff update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'venue-gallery'
  AND public.can_manage_storage_venue_path(name)
)
WITH CHECK (
  bucket_id = 'venue-gallery'
  AND public.can_manage_storage_venue_path(name)
);

CREATE POLICY "venue-gallery venue staff delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'venue-gallery'
  AND public.can_manage_storage_venue_path(name)
);

CREATE POLICY "venue-menus public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'venue-menus');

CREATE POLICY "venue-menus venue staff insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'venue-menus'
  AND public.can_manage_storage_venue_path(name)
);

CREATE POLICY "venue-menus venue staff update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'venue-menus'
  AND public.can_manage_storage_venue_path(name)
)
WITH CHECK (
  bucket_id = 'venue-menus'
  AND public.can_manage_storage_venue_path(name)
);

CREATE POLICY "venue-menus venue staff delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'venue-menus'
  AND public.can_manage_storage_venue_path(name)
);

CREATE POLICY "venue-documents venue staff read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'venue-documents'
  AND public.can_manage_storage_venue_path(name)
);

CREATE POLICY "venue-documents venue staff manage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'venue-documents'
  AND public.can_manage_storage_venue_path(name)
)
WITH CHECK (
  bucket_id = 'venue-documents'
  AND public.can_manage_storage_venue_path(name)
);

-- -----------------------------------------------------------------------------
-- Verification helpers.
-- -----------------------------------------------------------------------------
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND (
    tablename IN (
      'venues',
      'venue_team_members',
      'table_bookings',
      'guest_list_entries',
      'venue_tickets',
      'ticket_purchases',
      'user_notifications',
      'user_profiles',
      'activity_logs'
    )
    OR (schemaname = 'storage' AND tablename = 'objects')
  )
ORDER BY schemaname, tablename, policyname;

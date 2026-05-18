-- =============================================================================
-- Tier 1 bootstrap for production Supabase (project ref: swbjxienxrptmawsdugv)
-- =============================================================================
-- The production database was started with an older mini-schema and never had
-- the venue-portal migrations applied. The codebase queries `table_bookings`,
-- `guests`, `user_notifications`, etc. — none of which exist on prod.
--
-- This script installs JUST the minimum schema needed for Tier 1 sync (table
-- bookings + guest-facing notifications) without touching the existing tables
-- (bookings, venues, events, profiles, cities, user_notification_prefs,
-- venue_team_members, venue_tickets, favorites, activity_logs).
--
-- It is idempotent: every CREATE uses IF NOT EXISTS / OR REPLACE; every policy
-- is dropped and re-created; ALTER TABLE … ADD COLUMN IF NOT EXISTS is used
-- for additive column changes.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Make sure the existing tables have the columns the helpers need
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS role     text,
    ADD COLUMN IF NOT EXISTS venue_id uuid;

ALTER TABLE public.venues
    ADD COLUMN IF NOT EXISTS owner_id uuid;

ALTER TABLE public.venue_team_members
    ADD COLUMN IF NOT EXISTS user_id  uuid,
    ADD COLUMN IF NOT EXISTS email    text,
    ADD COLUMN IF NOT EXISTS status   text DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS venue_id uuid;

-- ---------------------------------------------------------------------------
-- 2) user_roles (for platform admins)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL,
    role       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) guests (nightclub guest book — separate from auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id           text NOT NULL UNIQUE,
    name               text NOT NULL,
    email              text,
    phone              text,
    avatar_url         text,
    loyalty_level      text,
    automatic_rating   numeric(2,1) DEFAULT 5.0,
    personnel_rating   numeric(2,1) DEFAULT 5.0,
    total_visits       integer DEFAULT 0,
    total_spend        numeric(12,2) DEFAULT 0,
    avg_spend          numeric(10,2) DEFAULT 0,
    about              text,
    instagram_handle   text,
    instagram_photos   text[],
    date_of_birth      date,
    status             text DEFAULT 'active',
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4) table_bookings (nightclub table reservations)
--    The existing public.bookings table is event-ticket bookings — left alone.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.table_bookings (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id   text NOT NULL UNIQUE,
    venue_id     uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    guest_id     uuid REFERENCES public.guests(id) ON DELETE SET NULL,
    guest_name   text NOT NULL,
    guest_email  text,
    guest_phone  text,
    table_number text NOT NULL,
    party_size   integer NOT NULL DEFAULT 2,
    booking_date date NOT NULL,
    booking_time time NOT NULL,
    status       text NOT NULL DEFAULT 'pending',
    price        numeric(10,2) DEFAULT 0,
    notes        text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.table_bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_table_bookings_venue_id     ON public.table_bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_booking_date ON public.table_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_table_bookings_status       ON public.table_bookings(status);
CREATE INDEX IF NOT EXISTS idx_table_bookings_guest_email  ON public.table_bookings(lower(guest_email));

-- ---------------------------------------------------------------------------
-- 5) user_notifications (the bell)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid,
    user_email  text,
    title       text NOT NULL,
    message     text NOT NULL,
    type        text NOT NULL DEFAULT 'booking',
    related_id  text,
    is_read     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id    ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_email ON public.user_notifications(lower(user_email));
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read    ON public.user_notifications(is_read);

-- ---------------------------------------------------------------------------
-- 6) Shared updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guests_updated_at ON public.guests;
CREATE TRIGGER trg_guests_updated_at
BEFORE UPDATE ON public.guests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

DROP TRIGGER IF EXISTS trg_table_bookings_updated_at ON public.table_bookings;
CREATE TRIGGER trg_table_bookings_updated_at
BEFORE UPDATE ON public.table_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

-- ---------------------------------------------------------------------------
-- 7) Permission helper functions
-- ---------------------------------------------------------------------------
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
            SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = _user_id
               AND ur.role IN ('super_admin', 'admin')
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
            SELECT 1 FROM public.venues v
             WHERE v.id = _venue_id AND v.owner_id = _user_id
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
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
            SELECT 1 FROM public.venue_team_members vtm
             WHERE vtm.venue_id = _venue_id
               AND (vtm.user_id = _user_id
                    OR lower(coalesce(vtm.email, '')) = lower(public.current_user_email()))
               AND (vtm.status IS NULL OR vtm.status = 'active')
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

GRANT EXECUTE ON FUNCTION public.current_user_email()             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_venue_owner(uuid, uuid)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_venue_team_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_venue(uuid, uuid)     TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8) RLS policies for the new tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
          FROM pg_policies
         WHERE schemaname='public'
           AND tablename IN ('guests', 'table_bookings', 'user_notifications', 'user_roles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END;
$$;

-- user_roles: admin-only visibility, admin-only writes
CREATE POLICY user_roles_admin_select ON public.user_roles
    FOR SELECT USING (public.is_platform_admin(auth.uid()));

CREATE POLICY user_roles_admin_write ON public.user_roles
    FOR ALL
    USING (public.is_platform_admin(auth.uid()))
    WITH CHECK (public.is_platform_admin(auth.uid()));

-- guests: any signed-in user can read/write (mirrors current MVP policy from migrations)
CREATE POLICY guests_select_authenticated ON public.guests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY guests_insert_authenticated ON public.guests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY guests_update_authenticated ON public.guests
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY guests_delete_admins ON public.guests
    FOR DELETE USING (public.is_platform_admin(auth.uid()));

-- table_bookings: venue managers/owners full access; guest can see + create their own
CREATE POLICY table_bookings_venue_manage ON public.table_bookings
    FOR ALL
    USING (
        public.can_manage_venue(venue_id)
        OR public.is_platform_admin(auth.uid())
    )
    WITH CHECK (
        public.can_manage_venue(venue_id)
        OR public.is_platform_admin(auth.uid())
    );

CREATE POLICY table_bookings_guest_view ON public.table_bookings
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND lower(coalesce(guest_email, '')) = lower(public.current_user_email())
    );

CREATE POLICY table_bookings_guest_insert ON public.table_bookings
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND lower(coalesce(guest_email, '')) = lower(public.current_user_email())
    );

-- user_notifications: each user sees only their own (by id or by email)
CREATE POLICY user_notifications_select_own ON public.user_notifications
    FOR SELECT
    USING (
        (user_id IS NOT NULL AND user_id = auth.uid())
        OR (user_email IS NOT NULL
            AND lower(user_email) = lower(public.current_user_email()))
        OR public.is_platform_admin(auth.uid())
    );

-- Inserts come from server-side SECURITY DEFINER RPCs / triggers, so leave open
CREATE POLICY user_notifications_insert_any ON public.user_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY user_notifications_update_own ON public.user_notifications
    FOR UPDATE
    USING (
        (user_id IS NOT NULL AND user_id = auth.uid())
        OR (user_email IS NOT NULL
            AND lower(user_email) = lower(public.current_user_email()))
        OR public.is_platform_admin(auth.uid())
    );

-- ---------------------------------------------------------------------------
-- 9) Realtime publication
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.table_bookings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10) Booking-status RPC (single write path for both portals)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_booking_status(
    p_booking_id uuid,
    p_status     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking    record;
    v_user_id    uuid;
    v_user_email text;
    v_venue_name text;
    v_title      text;
    v_message    text;
    v_notify     boolean;
BEGIN
    IF p_status NOT IN (
        'pending', 'confirmed', 'cancelled', 'checked_in',
        'no_show', 'completed', 'blocked'
    ) THEN
        RAISE EXCEPTION 'Invalid booking status: %', p_status
            USING ERRCODE = '22023';
    END IF;

    SELECT id, venue_id, guest_id, guest_email, table_number,
           booking_date, booking_time
      INTO v_booking
      FROM public.table_bookings
     WHERE id = p_booking_id;

    IF v_booking IS NULL OR v_booking.id IS NULL THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT (
        public.can_manage_venue(v_booking.venue_id)
        OR public.is_platform_admin(auth.uid())
        OR (
            p_status = 'cancelled'
            AND auth.uid() IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid()
                   AND lower(p.email) = lower(coalesce(v_booking.guest_email, ''))
            )
        )
    ) THEN
        RAISE EXCEPTION 'Not authorised to update booking %', p_booking_id
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.table_bookings
       SET status = p_status,
           updated_at = now()
     WHERE id = p_booking_id;

    v_notify := p_status IN ('confirmed', 'cancelled', 'checked_in');

    IF v_notify THEN
        v_user_email := lower(coalesce(v_booking.guest_email, ''));
        IF v_user_email = '' THEN v_user_email := NULL; END IF;

        IF v_booking.guest_id IS NOT NULL THEN
            SELECT lower(g.email) INTO v_user_email
              FROM public.guests g WHERE g.id = v_booking.guest_id;
        END IF;

        IF v_user_email IS NOT NULL THEN
            SELECT p.id INTO v_user_id
              FROM public.profiles p
             WHERE lower(p.email) = v_user_email LIMIT 1;
        END IF;

        SELECT name INTO v_venue_name FROM public.venues WHERE id = v_booking.venue_id;
        v_venue_name := coalesce(v_venue_name, 'the venue');

        CASE p_status
            WHEN 'confirmed' THEN
                v_title := 'Booking confirmed';
                v_message := format(
                    '%s confirmed your table %s on %s at %s.',
                    v_venue_name, v_booking.table_number,
                    to_char(v_booking.booking_date, 'YYYY-MM-DD'),
                    v_booking.booking_time
                );
            WHEN 'cancelled' THEN
                v_title := 'Booking cancelled';
                v_message := format(
                    'Your table booking at %s for %s was cancelled.',
                    v_venue_name, to_char(v_booking.booking_date, 'YYYY-MM-DD')
                );
            WHEN 'checked_in' THEN
                v_title := 'Checked in';
                v_message := format(
                    'You are checked in at %s. Enjoy your night!',
                    v_venue_name
                );
        END CASE;

        IF v_title IS NOT NULL AND (v_user_id IS NOT NULL OR v_user_email IS NOT NULL) THEN
            INSERT INTO public.user_notifications (
                user_id, user_email, title, message, type, related_id, is_read
            ) VALUES (
                v_user_id, v_user_email, v_title, v_message,
                'booking_' || p_status, v_booking.id::text, false
            );
        END IF;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_booking_status(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.set_booking_status(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11) Push-notification seam: AFTER INSERT on user_notifications -> pg_notify
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_user_notification_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM pg_notify(
        'user_notifications_insert',
        json_build_object(
            'id',         NEW.id,
            'user_id',    NEW.user_id,
            'user_email', NEW.user_email,
            'title',      NEW.title,
            'type',       NEW.type,
            'related_id', NEW.related_id
        )::text
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_notifications_insert ON public.user_notifications;
CREATE TRIGGER trg_user_notifications_insert
AFTER INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_user_notification_insert();

COMMIT;

NOTIFY pgrst, 'reload schema';

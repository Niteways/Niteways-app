-- =============================================================================
-- Tier 1 step 2 bootstrap for production Supabase (project ref: swbjxienxrptmawsdugv)
-- =============================================================================
-- Adds the schema needed for guest lists (recurring + one-day), floor map /
-- venue tables, and the simple `guest_list_entries` flat list. Assumes the
-- step-1 bootstrap (supabase/manual/tier1_bootstrap_production.sql) has
-- already been applied — i.e. `can_manage_venue`, `is_platform_admin`,
-- `current_user_email`, `set_updated_at_column` already exist.
--
-- Idempotent: every CREATE uses IF NOT EXISTS, ALTER … ADD COLUMN IF NOT EXISTS,
-- every policy is dropped and re-created.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Simple flat guest list (referenced by web check-in code)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_list_entries (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id      uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    guest_id      uuid REFERENCES public.guests(id) ON DELETE SET NULL,
    guest_name    text NOT NULL,
    plus_guests   integer DEFAULT 0,
    list_type     text NOT NULL DEFAULT 'standard',
    promoter      text,
    event_date    date NOT NULL,
    notes         text,
    checked_in    boolean DEFAULT false,
    check_in_time time,
    added_by      text,
    added_at      timestamptz NOT NULL DEFAULT now(),
    status        text NOT NULL DEFAULT 'pending'
);
ALTER TABLE public.guest_list_entries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_guest_list_entries_venue_date
    ON public.guest_list_entries(venue_id, event_date);

-- ---------------------------------------------------------------------------
-- 2) Recurring guest lists (weekly templates)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_guest_lists (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id    uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name        text NOT NULL,
    day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    reset_time  time NOT NULL DEFAULT '06:00:00',
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recurring_guest_lists ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.recurring_list_guests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_list_id  uuid NOT NULL REFERENCES public.recurring_guest_lists(id) ON DELETE CASCADE,
    guest_name         text NOT NULL,
    guest_type         text NOT NULL DEFAULT 'standard'
                       CHECK (guest_type IN ('standard', 'vip', 'aa')),
    plus_guests        integer NOT NULL DEFAULT 0,
    added_by           text,
    added_at           timestamptz NOT NULL DEFAULT now()
);
-- additive columns the app expects (matches the later migrations)
ALTER TABLE public.recurring_list_guests
    ADD COLUMN IF NOT EXISTS paying_guests    integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes            text,
    ADD COLUMN IF NOT EXISTS checked_in       boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS checked_in_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS check_in_time    timestamptz,
    ADD COLUMN IF NOT EXISTS is_sticky        boolean NOT NULL DEFAULT false;

ALTER TABLE public.recurring_list_guests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_recurring_list_guests_sticky
    ON public.recurring_list_guests(recurring_list_id, is_sticky DESC, added_at DESC);

CREATE TABLE IF NOT EXISTS public.recurring_list_permissions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_list_id uuid NOT NULL REFERENCES public.recurring_guest_lists(id) ON DELETE CASCADE,
    manager_id        text NOT NULL,
    manager_name      text NOT NULL,
    can_view          boolean NOT NULL DEFAULT true,
    can_check_in      boolean NOT NULL DEFAULT false,
    can_add_standard  boolean NOT NULL DEFAULT false,
    can_add_vip       boolean NOT NULL DEFAULT false,
    can_add_aa        boolean NOT NULL DEFAULT false,
    can_delete        boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (recurring_list_id, manager_id)
);
ALTER TABLE public.recurring_list_permissions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) One-day guest lists
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.one_day_guest_lists (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id   uuid NOT NULL,
    name       text NOT NULL,
    event_date date NOT NULL,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.one_day_guest_lists ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.one_day_list_guests (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id           uuid NOT NULL REFERENCES public.one_day_guest_lists(id) ON DELETE CASCADE,
    guest_name        text NOT NULL,
    guest_type        text NOT NULL DEFAULT 'standard',
    plus_guests       integer NOT NULL DEFAULT 0,
    paying_guests     integer NOT NULL DEFAULT 0,
    added_by          text,
    notes             text,
    checked_in        boolean DEFAULT false,
    checked_in_count  integer DEFAULT 0,
    check_in_time     timestamptz,
    added_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.one_day_list_guests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.guest_list_types (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id   uuid NOT NULL,
    list_id    uuid,
    name       text NOT NULL,
    color      text NOT NULL DEFAULT 'teal',
    sort_order integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guest_list_types ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4) Floor plans + venue tables (for table state / floor map)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.floor_plans (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id     uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name         text NOT NULL,
    is_published boolean NOT NULL DEFAULT false,
    is_draft     boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.floor_plan_rooms (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_plan_id uuid NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
    name          text NOT NULL,
    sort_order    integer DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.floor_plan_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.venue_tables (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id        uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    floor_plan_id   uuid REFERENCES public.floor_plans(id) ON DELETE SET NULL,
    room_id         uuid REFERENCES public.floor_plan_rooms(id) ON DELETE SET NULL,
    label           text NOT NULL,
    table_type      text NOT NULL DEFAULT 'table'
                    CHECK (table_type IN ('table', 'booth', 'vip_area')),
    capacity        integer NOT NULL DEFAULT 4,
    base_price      numeric NOT NULL DEFAULT 1000,
    min_spend       numeric NOT NULL DEFAULT 500,
    deposit_percent numeric NOT NULL DEFAULT 20,
    color           text DEFAULT 'teal',
    zone            text DEFAULT 'main',
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
    element_data    jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.venue_tables ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_venue_tables_venue ON public.venue_tables(venue_id);

-- ---------------------------------------------------------------------------
-- 5) updated_at triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'recurring_guest_lists', 'one_day_guest_lists',
        'floor_plans', 'venue_tables'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column()',
            t, t
        );
    END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) RLS policies — venue-scoped via can_manage_venue
-- ---------------------------------------------------------------------------
DO $$
DECLARE pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
          FROM pg_policies
         WHERE schemaname='public'
           AND tablename IN (
             'guest_list_entries',
             'recurring_guest_lists', 'recurring_list_guests', 'recurring_list_permissions',
             'one_day_guest_lists',   'one_day_list_guests',
             'guest_list_types',
             'floor_plans', 'floor_plan_rooms', 'venue_tables'
           )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END;
$$;

-- guest_list_entries
CREATE POLICY guest_list_entries_manage ON public.guest_list_entries
    FOR ALL
    USING (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()))
    WITH CHECK (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()));

-- recurring_guest_lists
CREATE POLICY recurring_guest_lists_manage ON public.recurring_guest_lists
    FOR ALL
    USING (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()))
    WITH CHECK (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()));

-- recurring_list_guests (scoped via the parent list)
CREATE POLICY recurring_list_guests_manage ON public.recurring_list_guests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.recurring_guest_lists rgl
             WHERE rgl.id = recurring_list_id
               AND (public.can_manage_venue(rgl.venue_id) OR public.is_platform_admin(auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.recurring_guest_lists rgl
             WHERE rgl.id = recurring_list_id
               AND (public.can_manage_venue(rgl.venue_id) OR public.is_platform_admin(auth.uid()))
        )
    );

CREATE POLICY recurring_list_permissions_manage ON public.recurring_list_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.recurring_guest_lists rgl
             WHERE rgl.id = recurring_list_id
               AND (public.can_manage_venue(rgl.venue_id) OR public.is_platform_admin(auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.recurring_guest_lists rgl
             WHERE rgl.id = recurring_list_id
               AND (public.can_manage_venue(rgl.venue_id) OR public.is_platform_admin(auth.uid()))
        )
    );

-- one_day_guest_lists
CREATE POLICY one_day_guest_lists_manage ON public.one_day_guest_lists
    FOR ALL
    USING (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()))
    WITH CHECK (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY one_day_list_guests_manage ON public.one_day_list_guests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.one_day_guest_lists odgl
             WHERE odgl.id = list_id
               AND (public.can_manage_venue(odgl.venue_id) OR public.is_platform_admin(auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.one_day_guest_lists odgl
             WHERE odgl.id = list_id
               AND (public.can_manage_venue(odgl.venue_id) OR public.is_platform_admin(auth.uid()))
        )
    );

-- guest_list_types
CREATE POLICY guest_list_types_manage ON public.guest_list_types
    FOR ALL
    USING (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()))
    WITH CHECK (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()));

-- floor_plans + rooms + tables
CREATE POLICY floor_plans_manage ON public.floor_plans
    FOR ALL
    USING (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()))
    WITH CHECK (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()));

CREATE POLICY floor_plan_rooms_manage ON public.floor_plan_rooms
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.floor_plans fp
             WHERE fp.id = floor_plan_id
               AND (public.can_manage_venue(fp.venue_id) OR public.is_platform_admin(auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.floor_plans fp
             WHERE fp.id = floor_plan_id
               AND (public.can_manage_venue(fp.venue_id) OR public.is_platform_admin(auth.uid()))
        )
    );

CREATE POLICY venue_tables_manage ON public.venue_tables
    FOR ALL
    USING (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()))
    WITH CHECK (public.can_manage_venue(venue_id) OR public.is_platform_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 7) Realtime publication
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'guest_list_entries',
        'recurring_guest_lists', 'recurring_list_guests', 'recurring_list_permissions',
        'one_day_guest_lists',   'one_day_list_guests',
        'guest_list_types',
        'floor_plans', 'floor_plan_rooms', 'venue_tables'
    ]
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END LOOP;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

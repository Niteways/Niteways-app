-- Tier 1 sync — table bookings
-- Single source of truth for changing a booking's status across web + mobile.
--   * Validates status against the canonical enum (no more `declined` vs `cancelled` drift)
--   * Updates `table_bookings.status`
--   * Inserts a guest-facing row into `public.user_notifications` for
--     confirmed / cancelled / checked_in
--   * Runs SECURITY DEFINER so the notification insert isn't blocked by RLS
--   * Authorises the caller via `public.can_manage_venue(venue_id)` (or
--     platform admin), with a self-cancel exception for the booking's own guest.
--
-- Uses RETURNS void + RECORD so the function definition does not depend on
-- the `table_bookings` row-type existing at function-creation time (avoids
-- 42704 when bootstrapping a fresh DB).

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

    -- Authorisation: venue staff/owner OR platform admin can flip any status;
    --                the booking's guest themselves can only cancel their own booking.
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
       SET status     = p_status,
           updated_at = now()
     WHERE id = p_booking_id;

    v_notify := p_status IN ('confirmed', 'cancelled', 'checked_in');

    IF v_notify THEN
        v_user_email := lower(coalesce(v_booking.guest_email, ''));
        IF v_user_email = '' THEN v_user_email := NULL; END IF;

        IF v_booking.guest_id IS NOT NULL THEN
            SELECT lower(g.email) INTO v_user_email
              FROM public.guests g
             WHERE g.id = v_booking.guest_id;
        END IF;

        IF v_user_email IS NOT NULL THEN
            SELECT p.id INTO v_user_id
              FROM public.profiles p
             WHERE lower(p.email) = v_user_email
             LIMIT 1;
        END IF;

        SELECT name INTO v_venue_name FROM public.venues WHERE id = v_booking.venue_id;
        v_venue_name := coalesce(v_venue_name, 'the venue');

        CASE p_status
            WHEN 'confirmed' THEN
                v_title   := 'Booking confirmed';
                v_message := format(
                    '%s confirmed your table %s on %s at %s.',
                    v_venue_name,
                    v_booking.table_number,
                    to_char(v_booking.booking_date, 'YYYY-MM-DD'),
                    v_booking.booking_time
                );
            WHEN 'cancelled' THEN
                v_title   := 'Booking cancelled';
                v_message := format(
                    'Your table booking at %s for %s was cancelled.',
                    v_venue_name,
                    to_char(v_booking.booking_date, 'YYYY-MM-DD')
                );
            WHEN 'checked_in' THEN
                v_title   := 'Checked in';
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

-- Push-notification seam: anything that wants to deliver pushes (FCM/Expo) can
-- LISTEN to `user_notifications_insert` (or replace this with a queue insert /
-- pg_net call).
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

NOTIFY pgrst, 'reload schema';

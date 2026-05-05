-- Allow staff blocking by permitting status = 'blocked'
ALTER TABLE public.table_bookings
  DROP CONSTRAINT IF EXISTS table_bookings_status_check;

ALTER TABLE public.table_bookings
  ADD CONSTRAINT table_bookings_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'confirmed'::text,
        'declined'::text,
        'completed'::text,
        'cancelled'::text,
        'no_show'::text,
        'blocked'::text
      ]
    )
  );

-- Speed up venue check-in: today’s recurring lists by weekday, one-day lists by event date.
CREATE INDEX IF NOT EXISTS idx_recurring_guest_lists_venue_day_active
  ON public.recurring_guest_lists (venue_id, day_of_week)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_one_day_guest_lists_venue_event_active
  ON public.one_day_guest_lists (venue_id, event_date)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_table_bookings_venue_booking_date
  ON public.table_bookings (venue_id, booking_date DESC);

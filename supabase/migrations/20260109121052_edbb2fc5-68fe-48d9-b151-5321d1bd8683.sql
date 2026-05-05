-- Add is_sticky column to recurring_list_guests for "always on top" guests
ALTER TABLE public.recurring_list_guests ADD COLUMN IF NOT EXISTS is_sticky boolean NOT NULL DEFAULT false;

-- Add index for faster sorting
CREATE INDEX IF NOT EXISTS idx_recurring_list_guests_sticky ON public.recurring_list_guests(recurring_list_id, is_sticky DESC, added_at DESC);
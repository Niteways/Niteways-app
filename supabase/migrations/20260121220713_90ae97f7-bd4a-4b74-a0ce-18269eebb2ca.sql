-- Add requires_approval column to venue_tables for booking request mode
ALTER TABLE public.venue_tables 
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.venue_tables.requires_approval IS 'If true, bookings require approval instead of direct booking';
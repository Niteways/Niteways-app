-- Add venue_id column to guests table for venue-specific CRM
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE;

-- Create index for efficient venue-scoped queries
CREATE INDEX IF NOT EXISTS idx_guests_venue_id ON public.guests(venue_id);

-- Update RLS policies to include venue context (maintaining public access but enabling venue filtering)
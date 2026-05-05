-- Add dress_code column for venue dress code requirements
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS dress_code text;

-- Add age_requirements column for day-specific age limits (JSON format)
-- Format: {"monday": 21, "friday": 23, "saturday": 23}
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS age_requirements jsonb DEFAULT '{}'::jsonb;
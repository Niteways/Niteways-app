-- Add paying_guests column to recurring_list_guests table
ALTER TABLE public.recurring_list_guests 
ADD COLUMN IF NOT EXISTS paying_guests integer DEFAULT 0;

-- Add checked_in_count column for partial check-ins
ALTER TABLE public.recurring_list_guests 
ADD COLUMN IF NOT EXISTS checked_in_count integer DEFAULT 0;

-- Create one-day guest lists table
CREATE TABLE IF NOT EXISTS public.one_day_guest_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on one_day_guest_lists
ALTER TABLE public.one_day_guest_lists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for one_day_guest_lists
CREATE POLICY "Public read one_day_guest_lists" ON public.one_day_guest_lists
FOR SELECT USING (true);

CREATE POLICY "Public insert one_day_guest_lists" ON public.one_day_guest_lists
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update one_day_guest_lists" ON public.one_day_guest_lists
FOR UPDATE USING (true);

CREATE POLICY "Public delete one_day_guest_lists" ON public.one_day_guest_lists
FOR DELETE USING (true);

-- Create one-day guest list guests table
CREATE TABLE IF NOT EXISTS public.one_day_list_guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.one_day_guest_lists(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_type TEXT NOT NULL DEFAULT 'standard',
  plus_guests INTEGER NOT NULL DEFAULT 0,
  paying_guests INTEGER NOT NULL DEFAULT 0,
  added_by TEXT,
  notes TEXT,
  checked_in BOOLEAN DEFAULT false,
  checked_in_count INTEGER DEFAULT 0,
  check_in_time TIMESTAMP WITH TIME ZONE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on one_day_list_guests
ALTER TABLE public.one_day_list_guests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for one_day_list_guests
CREATE POLICY "Public read one_day_list_guests" ON public.one_day_list_guests
FOR SELECT USING (true);

CREATE POLICY "Public insert one_day_list_guests" ON public.one_day_list_guests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update one_day_list_guests" ON public.one_day_list_guests
FOR UPDATE USING (true);

CREATE POLICY "Public delete one_day_list_guests" ON public.one_day_list_guests
FOR DELETE USING (true);

-- Add list type configurations table for custom colors
CREATE TABLE IF NOT EXISTS public.guest_list_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL,
  list_id UUID,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'teal',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on guest_list_types
ALTER TABLE public.guest_list_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read guest_list_types" ON public.guest_list_types
FOR SELECT USING (true);

CREATE POLICY "Public insert guest_list_types" ON public.guest_list_types
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update guest_list_types" ON public.guest_list_types
FOR UPDATE USING (true);

CREATE POLICY "Public delete guest_list_types" ON public.guest_list_types
FOR DELETE USING (true);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.one_day_guest_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.one_day_list_guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_list_types;
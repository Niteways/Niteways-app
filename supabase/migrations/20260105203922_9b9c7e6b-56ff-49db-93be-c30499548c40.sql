-- Add notes column to recurring_list_guests table
ALTER TABLE public.recurring_list_guests ADD COLUMN IF NOT EXISTS notes text;

-- Add checked_in column if not exists
ALTER TABLE public.recurring_list_guests ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false;

-- Add check_in_time column if not exists  
ALTER TABLE public.recurring_list_guests ADD COLUMN IF NOT EXISTS check_in_time timestamp with time zone;

-- Enable realtime for recurring guest list tables (guest_list_entries already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_guest_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_list_guests;
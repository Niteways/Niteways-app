-- Add date_of_birth to guests table
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Create table for tracking personnel ratings over time
CREATE TABLE public.guest_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id uuid REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  rating numeric NOT NULL CHECK (rating >= 1 AND rating <= 5),
  rated_by text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on guest_ratings
ALTER TABLE public.guest_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for guest_ratings
CREATE POLICY "Public read guest_ratings" ON public.guest_ratings FOR SELECT USING (true);
CREATE POLICY "Public insert guest_ratings" ON public.guest_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update guest_ratings" ON public.guest_ratings FOR UPDATE USING (true);

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id text NOT NULL UNIQUE,
  subject text NOT NULL,
  user_name text NOT NULL,
  user_email text,
  user_type text NOT NULL DEFAULT 'guest',
  venue_name text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  category text NOT NULL DEFAULT 'general',
  assigned_to text,
  opened_by text,
  opened_at timestamp with time zone,
  closed_by text,
  closed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create support messages table for mail chat
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_name text NOT NULL,
  sender_type text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public read support_tickets" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "Public insert support_tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update support_tickets" ON public.support_tickets FOR UPDATE USING (true);

CREATE POLICY "Public read support_messages" ON public.support_messages FOR SELECT USING (true);
CREATE POLICY "Public insert support_messages" ON public.support_messages FOR INSERT WITH CHECK (true);

-- Trigger for support_tickets updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
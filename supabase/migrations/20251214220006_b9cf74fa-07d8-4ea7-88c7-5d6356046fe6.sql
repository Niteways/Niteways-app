-- Create cities table
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  currency TEXT NOT NULL DEFAULT 'EUR',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  venue_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create venues table
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'Nightclub' CHECK (category IN ('Nightclub', 'Beach Club', 'Lounge', 'Bar', 'Restaurant')),
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  music_genre TEXT,
  opening_hours TEXT,
  opening_days TEXT,
  entrance_rules TEXT,
  spotify_link TEXT,
  instagram_handle TEXT,
  menu_url TEXT,
  gallery_images TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  base_package TEXT NOT NULL DEFAULT 'starter' CHECK (base_package IN ('starter', 'growth', 'enterprise')),
  addons TEXT[] DEFAULT ARRAY[]::text[],
  timezone TEXT,
  booking_cutoff_hours INTEGER DEFAULT 2,
  max_advance_days INTEGER DEFAULT 30,
  cancellation_policy TEXT,
  deposit_percent NUMERIC(5,2) DEFAULT 20.00,
  min_spend_tables NUMERIC(10,2) DEFAULT 500.00,
  min_spend_vip NUMERIC(10,2) DEFAULT 1500.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guests table
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  loyalty_level TEXT DEFAULT 'bronze' CHECK (loyalty_level IN ('bronze', 'silver', 'gold', 'platinum')),
  automatic_rating NUMERIC(2,1) DEFAULT 5.0,
  personnel_rating NUMERIC(2,1) DEFAULT 5.0,
  total_visits INTEGER DEFAULT 0,
  total_spend NUMERIC(12,2) DEFAULT 0.00,
  avg_spend NUMERIC(10,2) DEFAULT 0.00,
  about TEXT,
  instagram_handle TEXT,
  instagram_photos TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned', 'flagged')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guest visits table (tracks visits via QR scan)
CREATE TABLE public.guest_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  spend_amount NUMERIC(10,2) DEFAULT 0.00,
  notes TEXT
);

-- Create table bookings
CREATE TABLE public.table_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  table_number TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'cancelled', 'no_show')),
  price NUMERIC(10,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guest list entries
CREATE TABLE public.guest_list_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  plus_guests INTEGER DEFAULT 0,
  list_type TEXT NOT NULL DEFAULT 'standard' CHECK (list_type IN ('aa', 'vip', 'standard', 'promo')),
  promoter TEXT,
  event_date DATE NOT NULL,
  notes TEXT,
  checked_in BOOLEAN DEFAULT false,
  check_in_time TIME,
  added_by TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined'))
);

-- Create ticket purchases
CREATE TABLE public.ticket_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL UNIQUE,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  ticket_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity logs
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  performed_by TEXT,
  portal TEXT NOT NULL DEFAULT 'admin' CHECK (portal IN ('admin', 'venue')),
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create public policies (for MVP without auth)
CREATE POLICY "Public read cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Public insert cities" ON public.cities FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update cities" ON public.cities FOR UPDATE USING (true);
CREATE POLICY "Public delete cities" ON public.cities FOR DELETE USING (true);

CREATE POLICY "Public read venues" ON public.venues FOR SELECT USING (true);
CREATE POLICY "Public insert venues" ON public.venues FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update venues" ON public.venues FOR UPDATE USING (true);
CREATE POLICY "Public delete venues" ON public.venues FOR DELETE USING (true);

CREATE POLICY "Public read guests" ON public.guests FOR SELECT USING (true);
CREATE POLICY "Public insert guests" ON public.guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update guests" ON public.guests FOR UPDATE USING (true);
CREATE POLICY "Public delete guests" ON public.guests FOR DELETE USING (true);

CREATE POLICY "Public read guest_visits" ON public.guest_visits FOR SELECT USING (true);
CREATE POLICY "Public insert guest_visits" ON public.guest_visits FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read table_bookings" ON public.table_bookings FOR SELECT USING (true);
CREATE POLICY "Public insert table_bookings" ON public.table_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update table_bookings" ON public.table_bookings FOR UPDATE USING (true);
CREATE POLICY "Public delete table_bookings" ON public.table_bookings FOR DELETE USING (true);

CREATE POLICY "Public read guest_list_entries" ON public.guest_list_entries FOR SELECT USING (true);
CREATE POLICY "Public insert guest_list_entries" ON public.guest_list_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update guest_list_entries" ON public.guest_list_entries FOR UPDATE USING (true);
CREATE POLICY "Public delete guest_list_entries" ON public.guest_list_entries FOR DELETE USING (true);

CREATE POLICY "Public read ticket_purchases" ON public.ticket_purchases FOR SELECT USING (true);
CREATE POLICY "Public insert ticket_purchases" ON public.ticket_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update ticket_purchases" ON public.ticket_purchases FOR UPDATE USING (true);

CREATE POLICY "Public read activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Public insert activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_table_bookings_updated_at BEFORE UPDATE ON public.table_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_list_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
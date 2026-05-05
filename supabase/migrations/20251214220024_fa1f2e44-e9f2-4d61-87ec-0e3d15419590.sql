-- Fix function search path for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Insert sample cities
INSERT INTO public.cities (name, country, timezone, currency, tax_rate, status, venue_count) VALUES
('Stockholm', 'Sweden', 'Europe/Stockholm', 'SEK', 25.00, 'active', 3),
('London', 'United Kingdom', 'Europe/London', 'GBP', 20.00, 'active', 1),
('Barcelona', 'Spain', 'Europe/Madrid', 'EUR', 21.00, 'active', 1),
('Miami', 'United States', 'America/New_York', 'USD', 7.00, 'active', 1);

-- Insert sample guests
INSERT INTO public.guests (guest_id, name, email, phone, loyalty_level, automatic_rating, personnel_rating, total_visits, total_spend, avg_spend, about) VALUES
('USR-001', 'Cassandra Hansson', 'cassandra@maitres.com', '070-960 61 57', 'gold', 4.5, 5.0, 35, 29423.00, 620.00, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'),
('USR-002', 'Marcus Thompson', 'marcus.t@email.com', '070-123 45 67', 'platinum', 5.0, 5.0, 52, 45000.00, 865.00, 'VIP regular customer with excellent track record.'),
('USR-003', 'Sophie Anderson', 'sophie.a@email.com', '070-234 56 78', 'silver', 4.2, 4.5, 12, 8500.00, 708.00, 'Birthday celebrations frequent.'),
('USR-004', 'Michael Chen', 'michael.c@email.com', '070-345 67 89', 'gold', 4.8, 4.7, 28, 22000.00, 785.00, 'Corporate events organizer.'),
('USR-005', 'Emma Watson', 'emma.w@email.com', '070-456 78 90', 'bronze', 4.0, 4.2, 5, 2500.00, 500.00, 'New customer with potential.');
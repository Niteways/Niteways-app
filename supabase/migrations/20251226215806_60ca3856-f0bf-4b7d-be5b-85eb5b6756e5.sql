-- Create table for recurring guest lists
CREATE TABLE public.recurring_guest_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  reset_time TIME NOT NULL DEFAULT '06:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for recurring list guests (the actual guests on each list)
CREATE TABLE public.recurring_list_guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_list_id UUID NOT NULL REFERENCES public.recurring_guest_lists(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_type TEXT NOT NULL DEFAULT 'standard' CHECK (guest_type IN ('standard', 'vip', 'aa')),
  plus_guests INTEGER NOT NULL DEFAULT 0,
  added_by TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for manager permissions on recurring lists
CREATE TABLE public.recurring_list_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_list_id UUID NOT NULL REFERENCES public.recurring_guest_lists(id) ON DELETE CASCADE,
  manager_id TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_check_in BOOLEAN NOT NULL DEFAULT false,
  can_add_standard BOOLEAN NOT NULL DEFAULT false,
  can_add_vip BOOLEAN NOT NULL DEFAULT false,
  can_add_aa BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (recurring_list_id, manager_id)
);

-- Create table for floor plans with multi-room support
CREATE TABLE public.floor_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for floor plan rooms
CREATE TABLE public.floor_plan_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL REFERENCES public.floor_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  background_color TEXT DEFAULT '#1a1a1a',
  background_image TEXT,
  elements JSONB DEFAULT '[]',
  zones JSONB DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for venue tables (synced from floor plans)
CREATE TABLE public.venue_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  floor_plan_id UUID REFERENCES public.floor_plans(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.floor_plan_rooms(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  table_type TEXT NOT NULL DEFAULT 'table' CHECK (table_type IN ('table', 'booth', 'vip_area')),
  capacity INTEGER NOT NULL DEFAULT 4,
  base_price NUMERIC NOT NULL DEFAULT 1000,
  min_spend NUMERIC NOT NULL DEFAULT 500,
  deposit_percent NUMERIC NOT NULL DEFAULT 20,
  color TEXT DEFAULT 'teal',
  zone TEXT DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  element_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.recurring_guest_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_list_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_list_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plan_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_tables ENABLE ROW LEVEL SECURITY;

-- Create public access policies (matching existing tables pattern)
CREATE POLICY "Public read recurring_guest_lists" ON public.recurring_guest_lists FOR SELECT USING (true);
CREATE POLICY "Public insert recurring_guest_lists" ON public.recurring_guest_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update recurring_guest_lists" ON public.recurring_guest_lists FOR UPDATE USING (true);
CREATE POLICY "Public delete recurring_guest_lists" ON public.recurring_guest_lists FOR DELETE USING (true);

CREATE POLICY "Public read recurring_list_guests" ON public.recurring_list_guests FOR SELECT USING (true);
CREATE POLICY "Public insert recurring_list_guests" ON public.recurring_list_guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update recurring_list_guests" ON public.recurring_list_guests FOR UPDATE USING (true);
CREATE POLICY "Public delete recurring_list_guests" ON public.recurring_list_guests FOR DELETE USING (true);

CREATE POLICY "Public read recurring_list_permissions" ON public.recurring_list_permissions FOR SELECT USING (true);
CREATE POLICY "Public insert recurring_list_permissions" ON public.recurring_list_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update recurring_list_permissions" ON public.recurring_list_permissions FOR UPDATE USING (true);
CREATE POLICY "Public delete recurring_list_permissions" ON public.recurring_list_permissions FOR DELETE USING (true);

CREATE POLICY "Public read floor_plans" ON public.floor_plans FOR SELECT USING (true);
CREATE POLICY "Public insert floor_plans" ON public.floor_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update floor_plans" ON public.floor_plans FOR UPDATE USING (true);
CREATE POLICY "Public delete floor_plans" ON public.floor_plans FOR DELETE USING (true);

CREATE POLICY "Public read floor_plan_rooms" ON public.floor_plan_rooms FOR SELECT USING (true);
CREATE POLICY "Public insert floor_plan_rooms" ON public.floor_plan_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update floor_plan_rooms" ON public.floor_plan_rooms FOR UPDATE USING (true);
CREATE POLICY "Public delete floor_plan_rooms" ON public.floor_plan_rooms FOR DELETE USING (true);

CREATE POLICY "Public read venue_tables" ON public.venue_tables FOR SELECT USING (true);
CREATE POLICY "Public insert venue_tables" ON public.venue_tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update venue_tables" ON public.venue_tables FOR UPDATE USING (true);
CREATE POLICY "Public delete venue_tables" ON public.venue_tables FOR DELETE USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_recurring_guest_lists_updated_at
  BEFORE UPDATE ON public.recurring_guest_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_floor_plans_updated_at
  BEFORE UPDATE ON public.floor_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_floor_plan_rooms_updated_at
  BEFORE UPDATE ON public.floor_plan_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_tables_updated_at
  BEFORE UPDATE ON public.venue_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
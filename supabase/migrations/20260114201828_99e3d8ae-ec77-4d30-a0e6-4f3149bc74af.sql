-- Create venue_team_members table for real team sync
CREATE TABLE IF NOT EXISTS public.venue_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  permissions JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venue_id, email)
);

-- Enable RLS
ALTER TABLE public.venue_team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for venue_team_members
CREATE POLICY "Admins can view all team members"
  ON public.venue_team_members
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'moderator'))
  );

CREATE POLICY "Admins can insert team members"
  ON public.venue_team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin'))
  );

CREATE POLICY "Admins can update team members"
  ON public.venue_team_members
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin'))
  );

CREATE POLICY "Admins can delete team members"
  ON public.venue_team_members
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin'))
  );

-- Create platform_activity_logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  venue_id UUID REFERENCES public.venues(id),
  venue_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform logs
CREATE POLICY "Admins can view all platform logs"
  ON public.platform_activity_logs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin'))
  );

-- System can insert logs
CREATE POLICY "Allow log insertion"
  ON public.platform_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Create table_pricing_history for tracking individual table pricing
CREATE TABLE IF NOT EXISTS public.table_pricing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.venue_tables(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(table_id, date)
);

-- Enable RLS
ALTER TABLE public.table_pricing_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for table_pricing_history
CREATE POLICY "Admins can view table pricing"
  ON public.table_pricing_history
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin', 'moderator'))
  );

CREATE POLICY "Admins can manage table pricing"
  ON public.table_pricing_history
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin'))
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.table_pricing_history;
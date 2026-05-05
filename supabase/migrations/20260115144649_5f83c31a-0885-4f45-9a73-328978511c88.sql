-- Drop restrictive policies and add permissive ones for venue_team_members
-- This allows the admin portal to manage team members

DROP POLICY IF EXISTS "Admins can insert team members" ON public.venue_team_members;
DROP POLICY IF EXISTS "Admins can update team members" ON public.venue_team_members;
DROP POLICY IF EXISTS "Admins can delete team members" ON public.venue_team_members;
DROP POLICY IF EXISTS "Admins can view all team members" ON public.venue_team_members;

-- Create permissive policies for venue_team_members (admin portal access)
CREATE POLICY "Public read venue_team_members" 
ON public.venue_team_members 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert venue_team_members" 
ON public.venue_team_members 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update venue_team_members" 
ON public.venue_team_members 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete venue_team_members" 
ON public.venue_team_members 
FOR DELETE 
USING (true);
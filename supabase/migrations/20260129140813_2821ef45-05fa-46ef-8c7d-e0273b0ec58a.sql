-- Add soft delete column to venues table
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for filtering deleted venues
CREATE INDEX IF NOT EXISTS idx_venues_deleted_at ON public.venues(deleted_at);

-- Create user_profiles table for storing profile data including social accounts
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  name TEXT,
  email TEXT,
  phone TEXT,
  country_code TEXT DEFAULT '+46',
  birthday DATE,
  gender TEXT DEFAULT 'mr',
  avatar_url TEXT,
  instagram_handle TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view all profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
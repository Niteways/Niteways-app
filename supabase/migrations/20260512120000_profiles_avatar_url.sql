-- Venue portal + native app: shared profile photo URL (public avatars bucket).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.profiles.avatar_url IS 'Public Storage URL for staff profile photo (avatars/profiles/...)';

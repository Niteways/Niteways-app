-- Drop existing restrictive INSERT policy on venue_documents
DROP POLICY IF EXISTS "Admins can manage venue documents" ON public.venue_documents;

-- Create separate policies for each operation
-- Allow authenticated users to INSERT documents (they need to be logged in)
CREATE POLICY "Authenticated users can insert venue documents"
ON public.venue_documents
FOR INSERT
WITH CHECK (true);

-- Allow admins to UPDATE documents
CREATE POLICY "Admins can update venue documents"
ON public.venue_documents
FOR UPDATE
USING (is_admin(auth.uid()));

-- Allow admins to DELETE documents
CREATE POLICY "Admins can delete venue documents"
ON public.venue_documents
FOR DELETE
USING (is_admin(auth.uid()));
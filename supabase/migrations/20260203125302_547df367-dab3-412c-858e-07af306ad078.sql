-- Fix venue_documents SELECT policy to be permissive (recreate it)
DROP POLICY IF EXISTS "Authenticated can view venue documents" ON public.venue_documents;
DROP POLICY IF EXISTS "Anyone can view venue documents" ON public.venue_documents;

CREATE POLICY "Anyone can view venue documents" 
ON public.venue_documents 
FOR SELECT 
USING (true);
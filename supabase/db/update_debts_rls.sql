-- Drop all existing RLS policies for debts table
DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;
DROP POLICY IF EXISTS "Authenticated users can manage their own debts" ON public.debts;
DROP POLICY IF EXISTS "Anonymous users can manage debts with their client ID" ON public.debts;
DROP POLICY IF EXISTS "Default user can access their debts" ON public.debts;

-- Create a policy for authenticated users only
CREATE POLICY "Authenticated users can manage their own debts"
ON public.debts
FOR ALL
USING (
  -- Allow access if the user is authenticated and the record belongs to them
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- Refresh PostgREST schema cache to ensure the new policies are applied
NOTIFY pgrst, 'reload schema';

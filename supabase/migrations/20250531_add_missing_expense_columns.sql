-- Add missing columns to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS split_ratio NUMERIC(5,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS split_with_user_id UUID REFERENCES auth.users(id);

-- Update the RLS policies if needed
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON public.expenses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.expenses;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.expenses;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.expenses;

-- Recreate RLS policies
CREATE POLICY "Enable read access for authenticated users only" 
ON public.expenses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id" 
ON public.expenses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" 
ON public.expenses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

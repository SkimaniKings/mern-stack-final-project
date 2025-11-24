-- Fix missing columns in expenses table
-- This migration ensures all required columns exist with proper constraints

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns if they don't exist
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS is_split BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS split_ratio NUMERIC(5,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS split_with_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_ids UUID[] DEFAULT '{}'::UUID[],
  ADD COLUMN IF NOT EXISTS expense_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create or update the update_timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expenses_updated_at') THEN
    CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Update RLS policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.expenses;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.expenses;

-- Recreate RLS policies with proper security
CREATE POLICY "Enable read access for authenticated users" 
ON public.expenses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.expenses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

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

-- Create an index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);

-- Create an index on date for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- Create an index on category_ids for better performance with array operations
CREATE INDEX IF NOT EXISTS idx_expenses_category_ids ON public.expenses USING GIN (category_ids);

-- Add comments to columns for better documentation
COMMENT ON COLUMN public.expenses.latitude IS 'Latitude coordinate where the expense occurred';
COMMENT ON COLUMN public.expenses.longitude IS 'Longitude coordinate where the expense occurred';
COMMENT ON COLUMN public.expenses.is_split IS 'Flag indicating if this is a split expense';
COMMENT ON COLUMN public.expenses.split_ratio IS 'The ratio of the total amount that this user is responsible for (0.0 to 1.0)';
COMMENT ON COLUMN public.expenses.split_with_user_id IS 'The user ID of the person this expense is split with';
COMMENT ON COLUMN public.expenses.category_ids IS 'Array of category IDs associated with this expense';
COMMENT ON COLUMN public.expenses.expense_id IS 'Unique identifier for the expense (alternative primary key)';

-- Grant necessary permissions
GRANT ALL ON TABLE public.expenses TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

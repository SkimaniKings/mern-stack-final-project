-- SQL functions to fix subscription table issues
-- This ensures all required columns exist and refreshes the schema cache

CREATE OR REPLACE FUNCTION fix_subscription_issues()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  column_exists BOOLEAN;
BEGIN
  -- Check if category column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions'
    AND column_name = 'category'
  ) INTO column_exists;
  
  -- Add category column if it doesn't exist
  IF NOT column_exists THEN
    BEGIN
      ALTER TABLE subscriptions ADD COLUMN category TEXT DEFAULT 'other';
      result := result || '{"category_added": true}'::JSONB;
    EXCEPTION WHEN OTHERS THEN
      result := result || '{"category_error": "' || SQLERRM || '"}'::JSONB;
    END;
  ELSE
    result := result || '{"category_exists": true}'::JSONB;
  END IF;

  -- Check if category_id column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscriptions'
    AND column_name = 'category_id'
  ) INTO column_exists;
  
  -- Add category_id column if it doesn't exist
  IF NOT column_exists THEN
    BEGIN
      ALTER TABLE subscriptions ADD COLUMN category_id TEXT DEFAULT 'other';
      result := result || '{"category_id_added": true}'::JSONB;
    EXCEPTION WHEN OTHERS THEN
      result := result || '{"category_id_error": "' || SQLERRM || '"}'::JSONB;
    END;
  ELSE
    result := result || '{"category_id_exists": true}'::JSONB;
  END IF;
  
  -- Ensure all other required columns exist
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS service_provider TEXT;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'monthly';
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS start_date DATE;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS end_date DATE;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS roi_expected NUMERIC;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS roi_actual NUMERIC;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS roi_notes TEXT;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS next_renewal_date DATE;
  ALTER TABLE IF EXISTS public.subscriptions ADD COLUMN IF NOT EXISTS client_side BOOLEAN DEFAULT FALSE;
  
  -- Refresh the schema cache
  NOTIFY pgrst, 'reload schema';
  
  result := result || '{"schema_refreshed": true}'::JSONB;
  
  RETURN result;
END;
$$;

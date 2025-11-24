-- SQL functions for subscription system setup
-- These functions help ensure the subscription table has the correct structure
-- and provide fallback mechanisms when RLS policies prevent direct access

-- Function to create other subscription-related functions
CREATE OR REPLACE FUNCTION create_subscription_functions()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create the function to ensure subscription table structure
  EXECUTE $FUNC$
    CREATE OR REPLACE FUNCTION ensure_subscription_structure()
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $INNER$
    DECLARE
      column_exists BOOLEAN;
      result JSONB := '{}'::JSONB;
    BEGIN
      -- Check if client_side column exists
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        AND column_name = 'client_side'
      ) INTO column_exists;
      
      -- Add client_side column if it doesn't exist
      IF NOT column_exists THEN
        BEGIN
          ALTER TABLE subscriptions ADD COLUMN client_side BOOLEAN DEFAULT FALSE;
          result := result || '{"client_side_added": true}'::JSONB;
        EXCEPTION WHEN OTHERS THEN
          result := result || '{"client_side_error": "' || SQLERRM || '"}'::JSONB;
        END;
      ELSE
        result := result || '{"client_side_exists": true}'::JSONB;
      END IF;
      
      -- Create a more permissive RLS policy for subscriptions if possible
      BEGIN
        DROP POLICY IF EXISTS "Allow individual read access" ON subscriptions;
        CREATE POLICY "Allow individual read access" 
          ON subscriptions 
          FOR SELECT 
          USING (true);
        
        DROP POLICY IF EXISTS "Allow individual insert access" ON subscriptions;
        CREATE POLICY "Allow individual insert access" 
          ON subscriptions 
          FOR INSERT 
          WITH CHECK (true);
        
        result := result || '{"policies_updated": true}'::JSONB;
      EXCEPTION WHEN OTHERS THEN
        result := result || '{"policies_error": "' || SQLERRM || '"}'::JSONB;
      END;
      
      -- Ensure RLS is enabled
      BEGIN
        ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
        result := result || '{"rls_enabled": true}'::JSONB;
      EXCEPTION WHEN OTHERS THEN
        result := result || '{"rls_error": "' || SQLERRM || '"}'::JSONB;
      END;
      
      RETURN result;
    END;
    $INNER$;
  $FUNC$;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating subscription functions: %', SQLERRM;
  RETURN FALSE;
END;
$$;

-- Execute the function to create other functions
SELECT create_subscription_functions();

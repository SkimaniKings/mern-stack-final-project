-- Function to ensure all required columns exist in the debts table
CREATE OR REPLACE FUNCTION ensure_debts_columns_exist()
RETURNS BOOLEAN AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if the type column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'debts' AND column_name = 'type'
  ) INTO column_exists;
  
  -- Add the type column if it doesn't exist
  IF NOT column_exists THEN
    EXECUTE 'ALTER TABLE debts ADD COLUMN type TEXT DEFAULT ''personal_loan''';
  END IF;
  
  -- Add other required columns if they don't exist
  -- Check and add current_balance column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'debts' AND column_name = 'current_balance'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    EXECUTE 'ALTER TABLE debts ADD COLUMN current_balance NUMERIC DEFAULT 0';
  END IF;
  
  -- Check and add interest_rate column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'debts' AND column_name = 'interest_rate'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    EXECUTE 'ALTER TABLE debts ADD COLUMN interest_rate NUMERIC DEFAULT 0';
  END IF;
  
  -- Check and add minimum_payment column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'debts' AND column_name = 'minimum_payment'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    EXECUTE 'ALTER TABLE debts ADD COLUMN minimum_payment NUMERIC DEFAULT 0';
  END IF;
  
  -- Check and add loan_term column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'debts' AND column_name = 'loan_term'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    EXECUTE 'ALTER TABLE debts ADD COLUMN loan_term INTEGER';
  END IF;
  
  -- Refresh the PostgREST schema cache
  NOTIFY pgrst, 'reload schema';
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh the PostgREST schema cache
CREATE OR REPLACE FUNCTION refresh_postgrest_schema()
RETURNS VOID AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql;

-- Function to execute arbitrary SQL (for admin use only)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql;

-- Function to fix RLS policies for the debts table
CREATE OR REPLACE FUNCTION fix_debts_rls_policies()
RETURNS BOOLEAN AS $$
BEGIN
  -- Drop existing RLS policies if they exist
  DROP POLICY IF EXISTS debts_select_policy ON debts;
  DROP POLICY IF EXISTS debts_insert_policy ON debts;
  DROP POLICY IF EXISTS debts_update_policy ON debts;
  DROP POLICY IF EXISTS debts_delete_policy ON debts;
  
  -- Enable RLS on the debts table
  ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
  
  -- Create more permissive RLS policies
  -- Allow users to select their own debts or debts with a matching client_id cookie
  CREATE POLICY debts_select_policy ON debts
    FOR SELECT
    USING (
      auth.uid() = user_id OR 
      EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = user_id AND 
              (current_setting('request.headers', true)::json->>'client-id')::text = id::text
      ) OR
      EXISTS (
        SELECT 1 
        FROM auth.users 
        WHERE id = user_id AND 
              (current_setting('request.cookies', true)::json->>'client-id')::text = id::text
      )
    );
  
  -- Allow users to insert debts for themselves
  CREATE POLICY debts_insert_policy ON debts
    FOR INSERT
    WITH CHECK (
      auth.uid() = user_id OR
      auth.uid() IS NULL -- Allow anonymous inserts for testing
    );
  
  -- Allow users to update their own debts
  CREATE POLICY debts_update_policy ON debts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  
  -- Allow users to delete their own debts
  CREATE POLICY debts_delete_policy ON debts
    FOR DELETE
    USING (auth.uid() = user_id);
  
  -- Refresh the PostgREST schema cache
  PERFORM refresh_postgrest_schema();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to create the create_debt RPC function if it doesn't exist
CREATE OR REPLACE FUNCTION ensure_create_debt_function_exists()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the function exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'create_debt'
  ) THEN
    -- Create the function
    EXECUTE '
    CREATE OR REPLACE FUNCTION create_debt(
      _name TEXT,
      _type TEXT DEFAULT ''personal_loan'',
      _current_balance NUMERIC DEFAULT 0,
      _interest_rate NUMERIC DEFAULT 0,
      _minimum_payment NUMERIC DEFAULT 0,
      _loan_term INTEGER DEFAULT NULL,
      _due_date TEXT DEFAULT NULL
    ) RETURNS UUID AS $$
    DECLARE
      new_id UUID;
      user_id UUID;
    BEGIN
      -- Get the current user ID
      user_id := auth.uid();
      
      -- Generate a new UUID for the debt
      new_id := gen_random_uuid();
      
      -- Insert the debt
      INSERT INTO debts (
        id,
        user_id,
        name,
        type,
        current_balance,
        interest_rate,
        minimum_payment,
        loan_term,
        due_date,
        created_at,
        updated_at
      ) VALUES (
        new_id,
        user_id,
        _name,
        _type,
        _current_balance,
        _interest_rate,
        _minimum_payment,
        _loan_term,
        _due_date,
        NOW(),
        NOW()
      );
      
      RETURN new_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

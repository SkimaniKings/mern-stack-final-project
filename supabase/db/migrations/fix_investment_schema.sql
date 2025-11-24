-- Migration script to fix investment schema issues
-- This addresses multiple errors:
-- 1. Missing 'type' column in investments
-- 2. Missing 'value' column in investments
-- 3. Not-null constraint violation for account_type in accounts
-- 4. Missing 'color' column in categories

-- Fix investments table
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investments') THEN
    -- Add type column to investments table if it doesn't exist
    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS type text;
    
    -- Add value column to investments table if it doesn't exist
    ALTER TABLE IF EXISTS investments 
    ADD COLUMN IF NOT EXISTS value numeric DEFAULT 0;
    
    -- Make amount_invested column nullable or set a default value to fix the constraint violation
    ALTER TABLE IF EXISTS investments 
    ALTER COLUMN amount_invested DROP NOT NULL;
    
    -- Make date_invested column nullable to fix the constraint violation
    ALTER TABLE IF EXISTS investments 
    ALTER COLUMN date_invested DROP NOT NULL;
    
    -- Create index on type column for better performance
    CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
    
    -- Comment on the columns
    COMMENT ON COLUMN investments.type IS 'Asset class type for investment (e.g. Stocks, Bonds, Cash, etc.)';
    COMMENT ON COLUMN investments.value IS 'Current value of the investment';
  END IF;
END $$;

-- Fix accounts table
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accounts') THEN
    -- Add type column to accounts table if it doesn't exist
    ALTER TABLE IF EXISTS accounts 
    ADD COLUMN IF NOT EXISTS type text;
    
    -- Make account_type column nullable to fix the constraint violation
    ALTER TABLE IF EXISTS accounts 
    ALTER COLUMN account_type DROP NOT NULL;
    
    -- Create index on type column for better performance
    CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
    
    -- Comment on the column
    COMMENT ON COLUMN accounts.type IS 'Account type (e.g. Checking, Savings, Investment, etc.)';
  END IF;
END $$;

-- Fix categories table
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
    -- Add color column to categories table if it doesn't exist
    ALTER TABLE IF EXISTS categories 
    ADD COLUMN IF NOT EXISTS color text;
    
    -- Comment on the column
    COMMENT ON COLUMN categories.color IS 'Color code for category visualization';
  END IF;
END $$;

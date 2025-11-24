-- Setup all database tables and schemas for Dripcheck
-- This script will run all the SQL files in the db directory

-- First, create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Run secure_users_schema.sql
\i 'secure_users_schema.sql'

-- Run accounts.sql
\i 'accounts.sql'

-- Run categories.sql
\i 'categories.sql'

-- Run transaction.sql
\i 'transaction.sql'

-- Run income.sql
\i 'income.sql'

-- Run expense.sql
\i 'expense.sql'

-- Run bills.sql
\i 'bills.sql'

-- Run budget.sql
\i 'budget.sql'

-- Run debt.sql
\i 'debt.sql'

-- Run goals.sql
\i 'goals.sql'

-- Run investment.sql
\i 'investment.sql'

-- Run net-worth-tracker.sql
\i 'net-worth-tracker.sql'

-- Run notification.sql
\i 'notification.sql'

-- Run subscription.sql
\i 'subscription.sql'

-- Run tax.sql
\i 'tax.sql'

-- Run get_asset_classes.sql
\i 'get_asset_classes.sql'

-- Fix specific issues mentioned in the errors

-- Fix 'column accounts_1.type does not exist' error
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'accounts') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'accounts' 
                  AND column_name = 'type') THEN
      ALTER TABLE public.accounts 
      ADD COLUMN type TEXT NOT NULL DEFAULT 'checking' 
      CHECK (type IN ('checking', 'savings', 'credit', 'investment', 'cash', 'loan', 'other'));
    END IF;
  END IF;
END
$$;

-- Fix 'column expenses.spent_at does not exist' error
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'expenses') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'expenses' 
                  AND column_name = 'spent_at') THEN
      ALTER TABLE public.expenses 
      ADD COLUMN spent_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
  END IF;
END
$$;

-- Create income_sources table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.income_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  frequency TEXT NOT NULL CHECK (frequency IN ('one-time', 'daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'semi-annually', 'annually')),
  next_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policy for income_sources
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own income sources"
ON public.income_sources
FOR ALL
USING (auth.uid() = user_id);

-- Create index for income_sources
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON public.income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_next_date ON public.income_sources(next_date);

-- Fix relationship between transactions and categories
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'transactions') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'transactions' 
                  AND column_name = 'category_id') THEN
      ALTER TABLE public.transactions 
      ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
    END IF;
  END IF;
END
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at column
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
            CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE PROCEDURE update_modified_column();
        ', t, t);
    END LOOP;
END
$$;

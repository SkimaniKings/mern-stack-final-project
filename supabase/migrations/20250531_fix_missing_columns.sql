-- Add missing columns to expenses table if they don't exist
DO $$
BEGIN
    -- Add latitude column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'expenses' 
                   AND column_name = 'latitude') THEN
        ALTER TABLE public.expenses ADD COLUMN latitude DOUBLE PRECISION;
        RAISE NOTICE 'Added latitude column to expenses table';
    END IF;

    -- Add is_split column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'expenses' 
                   AND column_name = 'is_split') THEN
        ALTER TABLE public.expenses ADD COLUMN is_split BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_split column to expenses table';
    END IF;

    -- Add any other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'expenses' 
                   AND column_name = 'longitude') THEN
        ALTER TABLE public.expenses ADD COLUMN longitude DOUBLE PRECISION;
        RAISE NOTICE 'Added longitude column to expenses table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'expenses' 
                   AND column_name = 'split_ratio') THEN
        ALTER TABLE public.expenses ADD COLUMN split_ratio NUMERIC(5,2) DEFAULT 1.0;
        RAISE NOTICE 'Added split_ratio column to expenses table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'expenses' 
                   AND column_name = 'split_with_user_id') THEN
        ALTER TABLE public.expenses ADD COLUMN split_with_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added split_with_user_id column to expenses table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'expenses' 
                   AND column_name = 'category_ids') THEN
        ALTER TABLE public.expenses ADD COLUMN category_ids UUID[] DEFAULT '{}'::UUID[];
        RAISE NOTICE 'Added category_ids column to expenses table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'expenses' 
                   AND column_name = 'expense_id') THEN
        ALTER TABLE public.expenses ADD COLUMN expense_id UUID DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added expense_id column to expenses table';
    END IF;

    -- Add updated_at column and trigger if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'expenses' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE public.expenses ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Added updated_at column to expenses table';
    END IF;

    -- Create or replace the update_timestamp function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create the trigger if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_expenses_updated_at') THEN
        CREATE TRIGGER update_expenses_updated_at
        BEFORE UPDATE ON public.expenses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Created update_expenses_updated_at trigger';
    END IF;

    RAISE NOTICE 'All missing columns have been added to the expenses table';
END
$$;

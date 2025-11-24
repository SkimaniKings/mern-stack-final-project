-- Fix split expenses table and column issues

-- First, check if expense_splits table exists and create it if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_splits') THEN
        -- Create the expense_splits table (which our code is using)
        CREATE TABLE public.expense_splits (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            expense_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
            shared_with_name text NOT NULL, -- Store name instead of user ID
            amount numeric(12, 2) NOT NULL,
            status text DEFAULT 'pending',
            notes text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );

        -- Create trigger for updated_at
        CREATE TRIGGER set_timestamp_expense_splits
        BEFORE UPDATE ON public.expense_splits
        FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

        -- Add RLS policy
        ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow users to access their own expense splits
        CREATE POLICY "Allow users to access their own expense splits"
        ON public.expense_splits
        FOR ALL
        USING (
            expense_id IN (
                SELECT id FROM public.expenses WHERE user_id = auth.uid()
            )
        );

        -- Migrate any existing data from split_expenses if it exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'split_expenses') THEN
            INSERT INTO public.expense_splits (expense_id, shared_with_name, amount, notes, created_at)
            SELECT 
                expense_id, 
                COALESCE((SELECT email FROM auth.users WHERE id = shared_with_user), 'Unknown User'),
                amount, 
                note,
                created_at
            FROM public.split_expenses;
        END IF;
    END IF;
END
$$;

-- Add split_with_name and split_amount columns to expenses table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.expenses'::regclass AND attname = 'split_with_name') THEN
        ALTER TABLE public.expenses ADD COLUMN split_with_name text;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_attribute WHERE attrelid = 'public.expenses'::regclass AND attname = 'split_amount') THEN
        ALTER TABLE public.expenses ADD COLUMN split_amount numeric(12, 2);
    END IF;
END
$$;

-- Refresh the PostgREST schema cache to ensure new columns are visible
SELECT pg_notify('pgrst', 'reload schema');

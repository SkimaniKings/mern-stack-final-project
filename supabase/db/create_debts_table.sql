-- Create debts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'personal_loan' CHECK (type IN ('credit_card', 'credit-card', 'mortgage', 'auto', 'auto_loan', 'student', 'student_loan', 'personal', 'personal_loan', 'medical', 'other')),
  current_balance DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  minimum_payment DECIMAL(12,2) NOT NULL,
  loan_term INTEGER, -- in months
  due_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  last_payment_amount DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create debt_consolidations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.debt_consolidations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_debt_balance DECIMAL(12,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  loan_term INTEGER NOT NULL, -- in months
  monthly_payment DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_consolidations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own debts"
ON public.debts
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own debt consolidations"
ON public.debt_consolidations
FOR ALL
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_consolidations_user_id ON public.debt_consolidations(user_id);

-- Add updated_at trigger
DO $$
BEGIN
  EXECUTE format('
    DROP TRIGGER IF EXISTS set_updated_at ON public.debts;
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.debts
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
  ');
  
  EXECUTE format('
    DROP TRIGGER IF EXISTS set_updated_at ON public.debt_consolidations;
    CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.debt_consolidations
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
  ');
END
$$;

-- Refresh PostgREST schema cache to ensure the new tables are accessible
NOTIFY pgrst, 'reload schema';

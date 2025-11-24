-- Add category column to financial_goals table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'financial_goals' AND column_name = 'category'
  ) THEN
    ALTER TABLE financial_goals ADD COLUMN category text DEFAULT 'emergency';
  END IF;
END $$;

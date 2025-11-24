-- Drop the existing generated column
ALTER TABLE incomes DROP COLUMN monthly_equivalent_amount;

-- Add it back as a regular numeric column
ALTER TABLE incomes ADD COLUMN monthly_equivalent_amount numeric(14, 2);

-- Add a trigger to automatically calculate the monthly equivalent amount
CREATE OR REPLACE FUNCTION update_monthly_equivalent_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.monthly_equivalent_amount := CASE NEW.recurrence
    WHEN 'weekly' THEN NEW.amount * 52 / 12
    WHEN 'bi_weekly' THEN NEW.amount * 26 / 12
    WHEN 'monthly' THEN NEW.amount
    WHEN 'quarterly' THEN NEW.amount / 3
    WHEN 'semi_annual' THEN NEW.amount / 6
    WHEN 'annual' THEN NEW.amount / 12
    ELSE NEW.amount
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for insert
CREATE TRIGGER trg_set_monthly_equivalent_on_insert
BEFORE INSERT ON incomes
FOR EACH ROW
EXECUTE FUNCTION update_monthly_equivalent_amount();

-- Create trigger for update
CREATE TRIGGER trg_set_monthly_equivalent_on_update
BEFORE UPDATE ON incomes
FOR EACH ROW
WHEN (OLD.recurrence IS DISTINCT FROM NEW.recurrence OR OLD.amount IS DISTINCT FROM NEW.amount)
EXECUTE FUNCTION update_monthly_equivalent_amount();

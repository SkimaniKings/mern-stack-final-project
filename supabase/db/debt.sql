-- ===============================================
-- Debt Repayment Strategy Functions
-- ===============================================
DROP VIEW IF EXISTS potential_duplicate_subscriptions;

-- Repayment Strategy: Avalanche
create or replace function calculate_avalanche_repayment(
  _user_id uuid
) returns jsonb as $$
declare
  debt_record record;
  total_payment numeric := 0;
  remaining_balance numeric := 0;
  repayment_plan jsonb := '[]'::jsonb;
begin
  -- Get debts sorted by interest rate descending (Avalanche: highest interest first)
  for debt_record in
    select id, name, current_balance, interest_rate, minimum_payment
    from debts
    where user_id = _user_id and current_balance > 0
    order by interest_rate desc
  loop
    remaining_balance := debt_record.current_balance;
    total_payment := debt_record.minimum_payment;
    
    -- Create repayment schedule for each debt
    repayment_plan := repayment_plan || jsonb_build_object(
      'debt_id', debt_record.id,
      'debt_name', debt_record.name,
      'total_balance', debt_record.current_balance,
      'interest_rate', debt_record.interest_rate,
      'monthly_payment', total_payment
    );
  end loop;
  
  return repayment_plan;
end;
$$ language plpgsql;

-- Repayment Strategy: Snowball
create or replace function calculate_snowball_repayment(
  _user_id uuid
) returns jsonb as $$
declare
  debt_record record;
  total_payment numeric := 0;
  remaining_balance numeric := 0;
  repayment_plan jsonb := '[]'::jsonb;
begin
  -- Get debts sorted by balance ascending (Snowball: smallest balance first)
  for debt_record in
    select id, name, current_balance, interest_rate, minimum_payment
    from debts
    where user_id = _user_id and current_balance > 0
    order by current_balance asc
  loop
    remaining_balance := debt_record.current_balance;
    total_payment := debt_record.minimum_payment;
    
    -- Create repayment schedule for each debt
    repayment_plan := repayment_plan || jsonb_build_object(
      'debt_id', debt_record.id,
      'debt_name', debt_record.name,
      'total_balance', debt_record.current_balance,
      'interest_rate', debt_record.interest_rate,
      'monthly_payment', total_payment
    );
  end loop;
  
  return repayment_plan;
end;
$$ language plpgsql;

-- Repayment Strategy: Hybrid
create or replace function calculate_hybrid_repayment(
  _user_id uuid
) returns jsonb as $$
declare
  debt_record record;
  total_payment numeric := 0;
  remaining_balance numeric := 0;
  repayment_plan jsonb := '[]'::jsonb;
begin
  -- Combine both Avalanche and Snowball methods
  for debt_record in
    select id, name, current_balance, interest_rate, minimum_payment
    from debts
    where user_id = _user_id and current_balance > 0
    order by interest_rate desc, current_balance asc
  loop
    remaining_balance := debt_record.current_balance;
    total_payment := debt_record.minimum_payment;
    
    -- Create repayment schedule for each debt
    repayment_plan := repayment_plan || jsonb_build_object(
      'debt_id', debt_record.id,
      'debt_name', debt_record.name,
      'total_balance', debt_record.current_balance,
      'interest_rate', debt_record.interest_rate,
      'monthly_payment', total_payment
    );
  end loop;
  
  return repayment_plan;
end;
$$ language plpgsql;

-- ===============================================
-- Interest Savings Analysis and Refinancing
-- ===============================================

-- Function: Calculate Interest Savings from Refinancing
create or replace function calculate_interest_savings(
  _user_id uuid,
  _new_interest_rate numeric,
  _loan_term int
) returns numeric as $$
declare
  debt_record record;
  current_balance numeric;
  total_interest_current numeric := 0;
  total_interest_refinanced numeric := 0;
  monthly_payment_current numeric;
  monthly_payment_refinanced numeric;
  total_interest_current_calculation numeric;
  total_interest_refinanced_calculation numeric;
begin
  -- Loop through the user's debts
  for debt_record in
    select id, current_balance, interest_rate, loan_term
    from debts
    where user_id = _user_id and current_balance > 0
  loop
    -- Calculate current interest using the old rate
    current_balance := debt_record.current_balance;
    monthly_payment_current := (current_balance * (debt_record.interest_rate / 100) / 12) + (current_balance / _loan_term);
    total_interest_current_calculation := monthly_payment_current * _loan_term - current_balance;
    
    -- Calculate interest with the new refinancing rate
    monthly_payment_refinanced := (current_balance * (_new_interest_rate / 100) / 12) + (current_balance / _loan_term);
    total_interest_refinanced_calculation := monthly_payment_refinanced * _loan_term - current_balance;
    
    -- Accumulate the total interest savings
    total_interest_current := total_interest_current + total_interest_current_calculation;
    total_interest_refinanced := total_interest_refinanced + total_interest_refinanced_calculation;
  end loop;
  
  -- Calculate total savings from refinancing
  return total_interest_current - total_interest_refinanced;
end;
$$ language plpgsql;

-- ===============================================
-- Refinancing and Debt Updates
-- ===============================================

-- Function: Create Refinancing Opportunity
create or replace function create_refinancing_opportunity(
  _user_id uuid,
  _new_interest_rate numeric,
  _loan_term int,
  _debt_id uuid
) returns void as $$
begin
  insert into debt_consolidations (user_id, total_debt_balance, interest_rate, loan_term, monthly_payment)
  select
    _user_id,
    current_balance,
    _new_interest_rate,
    _loan_term,
    (current_balance * (_new_interest_rate / 100) / 12) + (current_balance / _loan_term)
  from debts
  where id = _debt_id;
end;
$$ language plpgsql;

-- Function: Update Debt Terms After Refinancing
create or replace function update_debt_after_refinancing(
  _debt_id uuid,
  _new_interest_rate numeric,
  _new_loan_term int
) returns void as $$
begin
  update debts
  set interest_rate = _new_interest_rate,
      due_date = current_date + interval '1 month' * _new_loan_term
  where id = _debt_id;
end;
$$ language plpgsql;

-- ===============================================
-- Debt CRUD Operations
-- ===============================================

-- Function to Create a New Debt
create or replace function create_debt(
  _user_id uuid,
  _name text,
  _current_balance numeric,
  _interest_rate numeric,
  _minimum_payment numeric,
  _loan_term int
) returns void as $$
begin
  insert into debts (user_id, name, current_balance, interest_rate, minimum_payment, loan_term)
  values (_user_id, _name, _current_balance, _interest_rate, _minimum_payment, _loan_term);
end;
$$ language plpgsql;

-- Function to Update Debt Information
create or replace function update_debt(
  _debt_id uuid,
  _name text,
  _current_balance numeric,
  _interest_rate numeric,
  _minimum_payment numeric,
  _loan_term int
) returns void as $$
begin
  update debts
  set name = _name,
      current_balance = _current_balance,
      interest_rate = _interest_rate,
      minimum_payment = _minimum_payment,
      loan_term = _loan_term
  where id = _debt_id;
end;
$$ language plpgsql;

-- Function to Delete Debt
create or replace function delete_debt(
  _debt_id uuid
) returns void as $$
begin
  delete from debts
  where id = _debt_id;
end;
$$ language plpgsql;

-- ===============================================
-- Reporting and Tracking
-- ===============================================

-- Debt-to-Income Ratio Tracker
create or replace function calculate_debt_to_income_ratio(
  _user_id uuid
) returns numeric as $$
declare
  total_debt numeric := 0;
  total_income numeric := 0;
begin
  -- Calculate total debt for the user
  select sum(current_balance) into total_debt
  from debts
  where user_id = _user_id;
  
  -- Get the total income (assuming we have an income table)
  select sum(amount) into total_income
  from incomes
  where user_id = _user_id;
  
  -- Calculate and return Debt-to-Income Ratio
  if total_income > 0 then
    return total_debt / total_income;
  else
    return 0; -- Avoid division by zero
  end if;
end;
$$ language plpgsql;

-- ===============================================
-- View for Debt Repayment Strategy and Refinancing
-- ===============================================

-- View: Potential Duplicate Subscriptions (fixed column name for cost)
CREATE OR REPLACE VIEW potential_duplicate_subscriptions AS
SELECT 
    s1.id AS subscription_id,
    s1.name AS subscription_name,
    s1.amount AS cost1,  -- Replace `cost` with `amount` or the correct column
    s2.id AS duplicate_subscription_id,
    s2.name AS duplicate_subscription_name,
    s2.amount AS cost2  -- Replace `cost` with `amount` or the correct column
FROM subscriptions s1
INNER JOIN subscriptions s2 
    ON s1.name = s2.name
WHERE s1.id <> s2.id;

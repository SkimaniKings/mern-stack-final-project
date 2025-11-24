-- Fix the get_expenses_by_period function to handle date type correctly
CREATE OR REPLACE FUNCTION public.get_expenses_by_period(
  p_user_id UUID,
  p_period_type TEXT,
  p_max_periods INTEGER
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  amount NUMERIC,
  category_id UUID,
  category_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH date_ranges AS (
    SELECT 
      (date_trunc(p_period_type, current_date) - (n || ' ' || p_period_type)::INTERVAL)::DATE as period_start,
      (date_trunc(p_period_type, current_date) - ((n-1) || ' ' || p_period_type)::INTERVAL)::DATE as period_end
    FROM generate_series(0, p_max_periods - 1) as n
  )
  SELECT 
    dr.period_start,
    dr.period_end,
    COALESCE(SUM(e.amount), 0) as amount,
    c.id as category_id,
    c.name as category_name
  FROM date_ranges dr
  LEFT JOIN expenses e ON 
    e.user_id = p_user_id
    AND e.expense_date >= dr.period_start 
    AND e.expense_date < dr.period_end
  LEFT JOIN categories c ON c.id = ANY(e.category_ids)
  GROUP BY dr.period_start, dr.period_end, c.id, c.name
  ORDER BY dr.period_start DESC, amount DESC;
END;
$$;

-- Create a function to get all debts for a user
CREATE OR REPLACE FUNCTION get_user_debts(p_user_id UUID)
RETURNS SETOF debts AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM debts
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_debts(UUID) TO authenticated;

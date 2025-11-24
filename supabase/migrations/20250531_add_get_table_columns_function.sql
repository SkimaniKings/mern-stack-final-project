-- Create a function to get table columns
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE (column_name text, data_type text) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text
  FROM 
    information_schema.columns c
  WHERE 
    c.table_schema = 'public'
    AND c.table_name = $1
  ORDER BY 
    c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO authenticated;

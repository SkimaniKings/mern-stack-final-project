-- Function to get asset classes from the enum
CREATE OR REPLACE FUNCTION get_asset_classes()
RETURNS TABLE (asset_class text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT enumlabel::text
  FROM pg_enum
  WHERE enumtypid = 'asset_class'::regtype;
END;
$$;

COMMENT ON FUNCTION get_asset_classes IS 'Returns all available asset classes from the asset_class enum';

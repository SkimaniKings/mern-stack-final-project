-- Create a function to create the reports bucket
CREATE OR REPLACE FUNCTION create_reports_bucket()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create the reports bucket if it doesn't exist
  INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
  VALUES (
    'reports',
    'reports',
    false, -- Not public
    20971520, -- 20MB
    ARRAY[
      'application/json',
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  )
  ON CONFLICT (id) DO NOTHING;

  -- NOTE: RLS policies for storage must be created via the Supabase Dashboard, CLI, or Admin API.
  -- Example policy suggestions for manual setup:
  --   1. Allow authenticated users to upload files:
  --      Expression: auth.role() = 'authenticated'
  --   2. Allow authenticated users to access only their own files:
  --      Expression: metadata->>'user_id' = auth.uid()
  --   3. Allow service_role full access (automatically bypasses RLS)

  RAISE NOTICE 'Reports bucket created successfully (if not already existing). Configure policies via Supabase Dashboard or CLI.';
END;
$$;

-- Execute the function to ensure the bucket is created
SELECT create_reports_bucket();

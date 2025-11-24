-- Create a function to create the reports bucket with proper RLS policies
CREATE OR REPLACE FUNCTION create_reports_bucket_with_policies()
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

  -- Create RLS policy to allow authenticated users to upload files
  DROP POLICY IF EXISTS "Allow authenticated users to upload reports" ON storage.objects;
  CREATE POLICY "Allow authenticated users to upload reports"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'reports' AND 
      auth.uid() IS NOT NULL
    );

  -- Create RLS policy to allow users to access only their own files
  DROP POLICY IF EXISTS "Allow users to access their own reports" ON storage.objects;
  CREATE POLICY "Allow users to access their own reports"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'reports' AND 
      (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Create RLS policy to allow users to update their own files
  DROP POLICY IF EXISTS "Allow users to update their own reports" ON storage.objects;
  CREATE POLICY "Allow users to update their own reports"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'reports' AND 
      (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Create RLS policy to allow users to delete their own files
  DROP POLICY IF EXISTS "Allow users to delete their own reports" ON storage.objects;
  CREATE POLICY "Allow users to delete their own reports"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'reports' AND 
      (storage.foldername(name))[1] = auth.uid()::text
    );
    
  -- Create policy for service role to have full access
  DROP POLICY IF EXISTS "Allow service role full access to reports" ON storage.objects;
  CREATE POLICY "Allow service role full access to reports"
    ON storage.objects FOR ALL
    USING (
      bucket_id = 'reports' AND
      auth.role() = 'service_role'
    );

  RAISE NOTICE 'Reports bucket created successfully with proper RLS policies.';
END;
$$;

-- Execute the function to ensure the bucket is created with policies
SELECT create_reports_bucket_with_policies();

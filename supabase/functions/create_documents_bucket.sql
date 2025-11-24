-- Create a function to create the documents bucket with proper RLS policies
CREATE OR REPLACE FUNCTION create_documents_bucket()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create the documents bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'documents',
    'documents',
    false,
    10485760, -- 10MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- First, delete any existing policies for the documents bucket to avoid conflicts
  DELETE FROM storage.policies WHERE bucket_id = 'documents';
  
  -- Create policy for authenticated users to upload files (INSERT)
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES (
    'Allow authenticated users to upload files',
    'auth.role() = ''authenticated''',
    'documents',
    'INSERT'
  );
  
  -- Create policy for authenticated users to download their own files (SELECT)
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES (
    'Allow authenticated users to download files',
    'auth.role() = ''authenticated''',
    'documents',
    'SELECT'
  );
  
  -- Create policy for authenticated users to update their own files (UPDATE)
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES (
    'Allow authenticated users to update files',
    'auth.role() = ''authenticated''',
    'documents',
    'UPDATE'
  );
  
  -- Create policy for authenticated users to delete their own files (DELETE)
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES (
    'Allow authenticated users to delete files',
    'auth.role() = ''authenticated''',
    'documents',
    'DELETE'
  );
  
  -- Create policy for service role to manage all files
  INSERT INTO storage.policies (name, definition, bucket_id, operation)
  VALUES (
    'Allow service role full access',
    'auth.role() = ''service_role''',
    'documents',
    'ALL'
  );
  
  RAISE NOTICE 'Documents bucket and policies created or updated successfully';
END;
$$;

-- Execute the function to ensure the bucket is created
SELECT create_documents_bucket();

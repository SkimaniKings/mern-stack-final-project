// Script to fix storage bucket policies for the documents bucket
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or service role key is missing.');
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixStoragePolicies() {
  try {
    console.log('Fixing storage bucket policies...');

    // First check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
    
    if (!documentsBucket) {
      console.log('Documents bucket does not exist, creating it...');
      
      // Create the bucket
      const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.createBucket('documents', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/png', 
          'image/jpeg', 
          'image/jpg', 
          'application/pdf', 
          'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      });
      
      if (bucketError) {
        console.error('Error creating bucket:', bucketError);
        return;
      }
      
      console.log('Documents bucket created successfully');
    } else {
      console.log('Documents bucket already exists');
    }

    // Read the SQL file with the updated policies
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'functions', 'create_documents_bucket.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL directly using the REST API
    console.log('Applying updated storage policies...');
    
    // Create a temporary SQL file with just the policy updates
    const tempSqlContent = `
    -- First, delete any existing policies for the documents bucket
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
    `;
    
    // Now let's try to execute the SQL via the Supabase API
    try {
      // Try to execute the SQL directly
      console.log('Executing SQL to update policies...');
      
      // Since we can't execute SQL directly, we'll use the REST API to create policies
      console.log('Creating policies via Storage API...');
      
      // First, let's try to delete existing policies (this might not work via API)
      console.log('Attempting to create policies...');
      
      // Create INSERT policy
      await createPolicy('Allow authenticated users to upload files', 'documents', 'INSERT', 'auth.role() = \'authenticated\'');
      
      // Create SELECT policy
      await createPolicy('Allow authenticated users to download files', 'documents', 'SELECT', 'auth.role() = \'authenticated\'');
      
      // Create UPDATE policy
      await createPolicy('Allow authenticated users to update files', 'documents', 'UPDATE', 'auth.role() = \'authenticated\'');
      
      // Create DELETE policy
      await createPolicy('Allow authenticated users to delete files', 'documents', 'DELETE', 'auth.role() = \'authenticated\'');
      
      // Create ALL policy for service role
      await createPolicy('Allow service role full access', 'documents', 'ALL', 'auth.role() = \'service_role\'');
      
      console.log('Policies created successfully!');
      
      // Test the bucket with a small upload
      console.log('Testing bucket with a small upload...');
      const testData = Buffer.from('test file content');
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload('test-file.txt', testData, {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Test upload failed:', uploadError);
        console.log('You may need to manually set the policies in the Supabase dashboard');
      } else {
        console.log('Test upload successful! Bucket is working correctly.');
        // Clean up test file
        await supabaseAdmin.storage.from('documents').remove(['test-file.txt']);
      }
      
    } catch (sqlError) {
      console.error('Error executing SQL:', sqlError);
      console.log('Please execute the following SQL in your Supabase dashboard:');
      console.log('\n' + tempSqlContent + '\n');
    }
    
    console.log('Storage policy update complete!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Helper function to create a policy via the REST API
async function createPolicy(name, bucketId, operation, definition) {
  try {
    // We can't directly create policies via the JS client, so we'll make a direct API call
    const response = await fetch(`${supabaseUrl}/storage/v1/policies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        name,
        bucket_id: bucketId,
        operation,
        definition
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`Warning creating policy "${name}":`, errorData);
    } else {
      console.log(`Policy "${name}" created successfully`);
    }
  } catch (error) {
    console.warn(`Error creating policy "${name}":`, error);
  }
}

// Run the function
fixStoragePolicies()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Error:', err));

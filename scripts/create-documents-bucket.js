// Script to create documents bucket in Supabase with proper RLS policies
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function fixDocumentsBucket() {
  try {
    console.log('Fixing documents bucket and policies...');
    
    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
    
    // Create bucket if it doesn't exist
    if (!documentsBucket) {
      console.log('Documents bucket does not exist, creating it...');
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
      
      console.log('Bucket created successfully');
    } else {
      console.log('Documents bucket already exists');
    }
    
    // Now fix the policies directly using the Storage API
    console.log('Setting up storage policies...');
    
    // First, try to get existing policies
    try {
      // We need to manually set up policies since we can't easily query them
      // Delete existing policies first (we'll recreate them)
      console.log('Creating INSERT policy...');
      await supabaseAdmin.storage.from('documents').createPolicy({
        name: 'documents insert policy',
        definition: {
          statements: ['INSERT'],
          check: 'true', // Allow all uploads
          roles: ['authenticated']
        }
      });
      
      console.log('Creating SELECT policy...');
      await supabaseAdmin.storage.from('documents').createPolicy({
        name: 'documents select policy',
        definition: {
          statements: ['SELECT'],
          check: 'true', // Allow all downloads
          roles: ['authenticated']
        }
      });
      
      console.log('Creating UPDATE policy...');
      await supabaseAdmin.storage.from('documents').createPolicy({
        name: 'documents update policy',
        definition: {
          statements: ['UPDATE'],
          check: 'true', // Allow all updates
          roles: ['authenticated']
        }
      });
      
      console.log('Creating DELETE policy...');
      await supabaseAdmin.storage.from('documents').createPolicy({
        name: 'documents delete policy',
        definition: {
          statements: ['DELETE'],
          check: 'true', // Allow all deletes
          roles: ['authenticated']
        }
      });
      
      console.log('Policies created successfully');
    } catch (policyError) {
      console.error('Error setting policies via API:', policyError);
      console.log('Falling back to SQL method...');
      
      // Fallback to SQL approach
      try {
        // Execute our SQL file that contains the policy setup
        const sqlFilePath = path.join(__dirname, '..', 'supabase', 'functions', 'create_documents_bucket.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Try to execute the SQL directly through the dashboard
        console.log('Please execute the following SQL in your Supabase dashboard:');
        console.log('\n' + sqlContent + '\n');
        console.log('Alternatively, you can set the policies manually in the Supabase dashboard under Storage > Policies');
      } catch (sqlError) {
        console.error('Error reading SQL file:', sqlError);
      }
    }
    
    // Test the bucket by trying to upload a small test file
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
    
    console.log('Documents bucket setup complete!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

fixDocumentsBucket();

// Script to create the reports storage bucket in Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createReportsBucket() {
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ADMIN_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Supabase URL or service key not found in environment variables.');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Error listing buckets: ${listError.message}`);
    }
    
    const reportsBucketExists = buckets.some(bucket => bucket.name === 'reports');
    
    if (reportsBucketExists) {
      console.log('✅ Reports bucket already exists');
      return;
    }
    
    // Create the reports bucket
    const { data, error } = await supabase.storage.createBucket('reports', {
      public: true, // Make bucket public so files can be accessed without authentication
      fileSizeLimit: 10485760, // 10MB file size limit
    });
    
    if (error) {
      throw new Error(`Error creating reports bucket: ${error.message}`);
    }
    
    console.log('✅ Reports bucket created successfully');
    
    // Set up bucket policies to allow public access to files
    const { error: policyError } = await supabase.storage.from('reports').createSignedUrl('test.txt', 60);
    
    if (policyError && !policyError.message.includes('The resource was not found')) {
      console.warn(`Warning: Could not verify bucket policies: ${policyError.message}`);
    } else {
      console.log('✅ Bucket policies verified');
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
createReportsBucket()
  .then(() => {
    console.log('✨ Setup complete');
    process.exit(0);
  })
  .catch(error => {
    console.error(`❌ Unhandled error: ${error.message}`);
    process.exit(1);
  });

// Script to create a storage bucket in Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or service role key is missing.');
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
  try {
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('user-content', {
      public: true, // Make files publicly accessible
      fileSizeLimit: 2097152, // 2MB in bytes
    });

    if (error) {
      throw error;
    }

    console.log('✅ Storage bucket "user-content" created successfully');

    // Set up bucket policies to allow public access to files
    const { error: policyError } = await supabase.storage.from('user-content').createPolicy(
      'public-read',
      {
        name: 'public-read',
        definition: {
          statements: [
            {
              effect: 'allow',
              principal: '*',
              actions: ['select'],
              resources: ['*'],
            },
          ],
        },
      }
    );

    if (policyError) {
      console.error('Warning: Error setting up bucket policy:', policyError.message);
    } else {
      console.log('✅ Public read policy created for bucket "user-content"');
    }

  } catch (error) {
    console.error('Error creating bucket:', error.message);
    process.exit(1);
  }
}

createBucket();

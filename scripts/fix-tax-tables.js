// Script to fix tax tables by recreating them if necessary
require('dotenv').config();
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

// SQL to recreate the tax_timeline table
const recreateTaxTimelineTableSQL = `
-- Drop the table if it exists
DROP TABLE IF EXISTS tax_timeline;

-- Create the tax timeline table with the correct schema
CREATE TABLE IF NOT EXISTS tax_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    type TEXT DEFAULT 'one-time',
    status TEXT DEFAULT 'pending',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
`;

// SQL to recreate the tax_documents table
const recreateTaxDocumentsTableSQL = `
-- Drop the table if it exists
DROP TABLE IF EXISTS tax_documents;

-- Create the tax documents table with the correct schema
CREATE TABLE IF NOT EXISTS tax_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_url TEXT,
    file_name TEXT,
    file_metadata_id UUID,
    due_date TIMESTAMPTZ,
    notes TEXT,
    status TEXT DEFAULT 'received',
    is_uploaded BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
`;

async function fixTaxTables() {
  try {
    console.log('Fixing tax tables...');
    
    // Recreate tax_timeline table
    console.log('Recreating tax_timeline table...');
    try {
      const { error: timelineError } = await supabaseAdmin.rpc('pgexec', { sql: recreateTaxTimelineTableSQL });
      
      if (timelineError) {
        console.error('Error recreating tax_timeline table via RPC:', timelineError);
        console.log('You may need to execute the SQL manually in the Supabase dashboard');
        console.log('\nSQL to execute for tax_timeline:\n');
        console.log(recreateTaxTimelineTableSQL);
      } else {
        console.log('Successfully recreated tax_timeline table');
      }
    } catch (error) {
      console.error('Error recreating tax_timeline table:', error);
    }
    
    // Recreate tax_documents table
    console.log('Recreating tax_documents table...');
    try {
      const { error: documentsError } = await supabaseAdmin.rpc('pgexec', { sql: recreateTaxDocumentsTableSQL });
      
      if (documentsError) {
        console.error('Error recreating tax_documents table via RPC:', documentsError);
        console.log('You may need to execute the SQL manually in the Supabase dashboard');
        console.log('\nSQL to execute for tax_documents:\n');
        console.log(recreateTaxDocumentsTableSQL);
      } else {
        console.log('Successfully recreated tax_documents table');
      }
    } catch (error) {
      console.error('Error recreating tax_documents table:', error);
    }
    
    // Verify the tables exist and have the required columns
    try {
      console.log('Verifying tax_timeline table...');
      const { data: timelineData, error: timelineError } = await supabaseAdmin
        .from('tax_timeline')
        .select('id')
        .limit(1);
      
      if (timelineError) {
        console.error('Error verifying tax_timeline table:', timelineError);
      } else {
        console.log('tax_timeline table verified successfully!');
      }
      
      console.log('Verifying tax_documents table...');
      const { data: documentsData, error: documentsError } = await supabaseAdmin
        .from('tax_documents')
        .select('id')
        .limit(1);
      
      if (documentsError) {
        console.error('Error verifying tax_documents table:', documentsError);
      } else {
        console.log('tax_documents table verified successfully!');
      }
    } catch (verifyError) {
      console.error('Error verifying tables:', verifyError);
    }
    
    console.log('Tax tables fix complete!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
fixTaxTables()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Error:', err));

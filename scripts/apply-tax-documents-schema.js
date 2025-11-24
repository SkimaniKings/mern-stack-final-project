// Script to apply the tax documents schema to the database
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

// SQL to create the tax_documents table
const createTaxDocumentsTableSQL = `
-- Drop the table if it exists to ensure a clean slate
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
    due_date TEXT,
    notes TEXT,
    status TEXT DEFAULT 'received',
    is_uploaded BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tax_documents_user_id ON tax_documents(user_id);
`;

async function applyTaxDocumentsSchema() {
  try {
    console.log('Applying tax documents schema...');
    
    // Execute the SQL directly
    const { error } = await supabaseAdmin.rpc('pgexec', { sql: createTaxDocumentsTableSQL });
    
    if (error) {
      console.error('Error executing SQL via RPC:', error);
      
      // Try alternative approach - direct SQL execution
      try {
        console.log('Trying direct SQL execution...');
        
        // Split the SQL into separate statements
        const statements = createTaxDocumentsTableSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0)
          .map(stmt => stmt + ';');
        
        // Execute each statement separately
        for (const statement of statements) {
          console.log(`Executing: ${statement.substring(0, 60)}...`);
          const { error: stmtError } = await supabaseAdmin.sql(statement);
          
          if (stmtError) {
            console.error(`Error executing statement: ${stmtError.message}`);
          }
        }
        
        console.log('Schema applied via direct SQL execution');
      } catch (sqlError) {
        console.error('Error with direct SQL execution:', sqlError);
        console.log('You may need to execute the SQL manually in the Supabase dashboard');
        console.log('\nSQL to execute:\n');
        console.log(createTaxDocumentsTableSQL);
      }
    } else {
      console.log('Schema applied successfully via RPC');
    }
    
    // Verify the table exists
    try {
      const { data, error: checkError } = await supabaseAdmin
        .from('tax_documents')
        .select('id')
        .limit(1);
      
      if (checkError) {
        console.error('Error verifying tax_documents table:', checkError);
      } else {
        console.log('tax_documents table verified successfully!');
      }
    } catch (verifyError) {
      console.error('Error verifying table:', verifyError);
    }
    
    console.log('Schema application complete!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
applyTaxDocumentsSchema()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Error:', err));

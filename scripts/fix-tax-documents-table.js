// Script to fix the tax_documents table schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function fixTaxDocumentsTable() {
  console.log('Starting tax_documents table fix...');

  try {
    // SQL to properly create the tax_documents table with all required columns
    const createTableSQL = `
      -- Drop the table if it exists to ensure a clean slate
DROP TABLE IF EXISTS tax_documents;

-- Create the tax_documents table with all required columns
CREATE TABLE IF NOT EXISTS tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_metadata JSONB,
  due_date TIMESTAMPTZ,
  notes TEXT,
  status TEXT DEFAULT 'received',
  is_uploaded BOOLEAN DEFAULT TRUE,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tax_documents_user_id ON tax_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_documents_document_type ON tax_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_tax_documents_due_date ON tax_documents(due_date);

-- Set up RLS policies
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their own documents
DROP POLICY IF EXISTS "Users can view their own tax documents" ON tax_documents;
CREATE POLICY "Users can view their own tax documents"
  ON tax_documents FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to insert their own documents
DROP POLICY IF EXISTS "Users can insert their own tax documents" ON tax_documents;
CREATE POLICY "Users can insert their own tax documents"
  ON tax_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own documents
DROP POLICY IF EXISTS "Users can update their own tax documents" ON tax_documents;
CREATE POLICY "Users can update their own tax documents"
  ON tax_documents FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy for users to delete their own documents
DROP POLICY IF EXISTS "Users can delete their own tax documents" ON tax_documents;
CREATE POLICY "Users can delete their own tax documents"
  ON tax_documents FOR DELETE
  USING (auth.uid() = user_id);

    `;

    // Execute the SQL to create/fix the table
    console.log('Executing SQL to fix tax_documents table...');
    const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL });

    if (sqlError) {
      console.error('Error executing SQL via RPC:', sqlError);
      
      // Fallback approach: try direct SQL execution if available
      console.log('Attempting direct SQL execution...');
      try {
        // This requires the pg client which might not be available in all environments
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
        });
        
        await pool.query(createTableSQL);
        console.log('Successfully executed SQL directly');
        pool.end();
      } catch (pgError) {
        console.error('Error with direct SQL execution:', pgError);
        console.log('\nSQL to execute manually:\n');
        console.log(createTableSQL);
        throw pgError;
      }
    } else {
      console.log('Successfully fixed tax_documents table via RPC');
    }

    // Verify the table exists and has the correct structure
    console.log('Verifying tax_documents table...');
    const { data, error: verifyError } = await supabaseAdmin
      .from('tax_documents')
      .select('id, name, due_date')
      .limit(1);

    if (verifyError) {
      console.error('Error verifying tax_documents table:', verifyError);
      throw verifyError;
    }

    console.log('tax_documents table verified successfully!');
    console.log('Table fix completed successfully.');

  } catch (error) {
    console.error('Error fixing tax_documents table:', error);
    process.exit(1);
  }
}

// Run the function
fixTaxDocumentsTable()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

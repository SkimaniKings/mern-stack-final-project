// Script to apply the tax schema to the database
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

// SQL to update the tax_timeline table
const updateTaxTimelineTableSQL = `
-- Add is_completed column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tax_timeline' AND column_name = 'is_completed') THEN
        ALTER TABLE tax_timeline ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tax_timeline' AND column_name = 'updated_at') THEN
        ALTER TABLE tax_timeline ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;
`;

// SQL to update the tax_documents table
const updateTaxDocumentsTableSQL = `
-- Update the due_date column type in tax_documents if it exists and has the wrong type
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'tax_documents' AND column_name = 'due_date' 
               AND data_type != 'timestamp with time zone') THEN
        ALTER TABLE tax_documents ALTER COLUMN due_date TYPE TIMESTAMPTZ USING due_date::TIMESTAMPTZ;
    END IF;

    -- Make sure all required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tax_documents' AND column_name = 'is_uploaded') THEN
        ALTER TABLE tax_documents ADD COLUMN is_uploaded BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tax_documents' AND column_name = 'status') THEN
        ALTER TABLE tax_documents ADD COLUMN status TEXT DEFAULT 'received';
    END IF;
END $$;
`;

async function applyTaxSchema() {
  try {
    console.log('Applying tax schema updates...');
    
    // Update tax_timeline table
    console.log('Updating tax_timeline table...');
    try {
      await supabaseAdmin.rpc('pgexec', { sql: updateTaxTimelineTableSQL });
      console.log('Successfully updated tax_timeline table');
    } catch (error) {
      console.error('Error updating tax_timeline table via RPC:', error);
      
      // Try direct query
      try {
        // Try direct SQL execution
        await supabaseAdmin.from('_sql').select('*');
        console.log('Direct SQL execution not available, trying alternative approach');
        
        // Alternative approach: Create a function to execute the SQL
        const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION apply_tax_timeline_updates() RETURNS void AS $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'tax_timeline' AND column_name = 'is_completed') THEN
                ALTER TABLE tax_timeline ADD COLUMN is_completed BOOLEAN DEFAULT FALSE;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'tax_timeline' AND column_name = 'updated_at') THEN
                ALTER TABLE tax_timeline ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
            END IF;
        END;
        $$ LANGUAGE plpgsql;
        `;
        
        // Create and execute the function
        await supabaseAdmin.rpc('pgexec', { sql: createFunctionSQL });
        await supabaseAdmin.rpc('apply_tax_timeline_updates');
        console.log('Applied tax_timeline updates via custom function');
      } catch (directError) {
        console.error('Error with direct SQL execution:', directError);
        console.log('You may need to execute the SQL manually in the Supabase dashboard');
        console.log('\nSQL to execute for tax_timeline:\n');
        console.log(updateTaxTimelineTableSQL);
      }
    }
    
    // Update tax_documents table
    console.log('Updating tax_documents table...');
    try {
      await supabaseAdmin.rpc('pgexec', { sql: updateTaxDocumentsTableSQL });
      console.log('Successfully updated tax_documents table');
    } catch (error) {
      console.error('Error updating tax_documents table via RPC:', error);
      
      // Try direct query
      try {
        // Alternative approach: Create a function to execute the SQL
        const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION apply_tax_documents_updates() RETURNS void AS $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tax_documents' AND column_name = 'due_date' 
                      AND data_type != 'timestamp with time zone') THEN
                ALTER TABLE tax_documents ALTER COLUMN due_date TYPE TIMESTAMPTZ USING due_date::TIMESTAMPTZ;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'tax_documents' AND column_name = 'is_uploaded') THEN
                ALTER TABLE tax_documents ADD COLUMN is_uploaded BOOLEAN DEFAULT TRUE;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'tax_documents' AND column_name = 'status') THEN
                ALTER TABLE tax_documents ADD COLUMN status TEXT DEFAULT 'received';
            END IF;
        END;
        $$ LANGUAGE plpgsql;
        `;
        
        // Create and execute the function
        await supabaseAdmin.rpc('pgexec', { sql: createFunctionSQL });
        await supabaseAdmin.rpc('apply_tax_documents_updates');
        console.log('Applied tax_documents updates via custom function');
      } catch (directError) {
        console.error('Error with direct SQL execution:', directError);
        console.log('You may need to execute the SQL manually in the Supabase dashboard');
        console.log('\nSQL to execute for tax_documents:\n');
        console.log(updateTaxDocumentsTableSQL);
      }
    }
    
    // Verify the tables exist and have the required columns
    try {
      console.log('Verifying tax_timeline table...');
      const { data: timelineData, error: timelineError } = await supabaseAdmin
        .from('tax_timeline')
        .select('id, is_completed')
        .limit(1);
      
      if (timelineError) {
        console.error('Error verifying tax_timeline table:', timelineError);
      } else {
        console.log('tax_timeline table verified successfully!');
      }
      
      console.log('Verifying tax_documents table...');
      const { data: documentsData, error: documentsError } = await supabaseAdmin
        .from('tax_documents')
        .select('id, due_date, is_uploaded, status')
        .limit(1);
      
      if (documentsError) {
        console.error('Error verifying tax_documents table:', documentsError);
      } else {
        console.log('tax_documents table verified successfully!');
      }
    } catch (verifyError) {
      console.error('Error verifying tables:', verifyError);
    }
    
    console.log('Schema updates complete!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
applyTaxSchema()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Error:', err));

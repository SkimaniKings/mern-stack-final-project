// Script to fix tax tables by directly executing SQL statements
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

// Direct SQL statements to execute
const sqlStatements = [
  // Drop and recreate tax_timeline table
  `DROP TABLE IF EXISTS tax_timeline;`,
  
  `CREATE TABLE IF NOT EXISTS tax_timeline (
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
  );`,
  
  // Drop and recreate tax_documents table
  `DROP TABLE IF EXISTS tax_documents;`,
  
  `CREATE TABLE IF NOT EXISTS tax_documents (
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
  );`
];

async function executeSqlStatements() {
  console.log('Executing SQL statements to fix tax tables...');
  
  try {
    // Try to execute each SQL statement
    for (const sql of sqlStatements) {
      try {
        console.log(`Executing SQL: ${sql.substring(0, 50)}...`);
        
        // Try using the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            query: sql
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error executing SQL via REST API: ${JSON.stringify(errorData)}`);
        } else {
          console.log('SQL executed successfully via REST API');
        }
      } catch (error) {
        console.error(`Error executing SQL statement: ${error.message}`);
      }
    }
    
    // Verify tables exist by querying them
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
    
    console.log('SQL execution complete!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
executeSqlStatements()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Error:', err));

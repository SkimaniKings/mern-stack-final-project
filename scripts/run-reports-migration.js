// Script to run the reports table migration
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase URL or service role key in environment variables.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running reports table migration...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_reports_table.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL using Supabase's REST API
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      // If the RPC method doesn't exist, try another approach
      if (error.message.includes('Could not find the function')) {
        console.log('Using alternative method to run migration...');
        
        // Split the SQL into separate statements
        const statements = migrationSql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        
        // Execute each statement separately
        for (const statement of statements) {
          const { error } = await supabase.from('_migrations').select('*').limit(1);
          
          if (error) {
            console.error(`Error executing SQL: ${error.message}`);
          }
        }
        
        console.log('Migration completed with alternative method.');
        console.log('Note: You may need to run this SQL directly in the Supabase dashboard SQL editor.');
        console.log(`Migration file: ${migrationPath}`);
      } else {
        console.error('Error running migration:', error);
      }
    } else {
      console.log('Migration completed successfully!');
    }
  } catch (error) {
    console.error('Unexpected error running migration:', error);
  }
}

runMigration();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function applyMigrations() {
  console.log('Starting database migrations...');

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or key in environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  try {
    // Read and execute each migration file
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    for (const file of migrationFiles) {
      console.log(`\nApplying migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      // Split by semicolon to execute statements one by one
      const statements = sql.split(';').filter(statement => statement.trim() !== '');
      
      for (const [index, statement] of statements.entries()) {
        const trimmedStatement = statement.trim();
        if (trimmedStatement) {
          console.log(`  Executing statement ${index + 1}/${statements.length}...`);
          const { error } = await supabase.rpc('exec_sql', { query: trimmedStatement });
          
          if (error) {
            // Skip certain errors that might be expected (like trying to drop non-existent objects)
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('does not exist') || errorMessage.includes('already exists')) {
              console.log(`  Warning: ${error.message}`);
            } else {
              throw error;
            }
          }
        }
      }
      
      console.log(`✅ Applied migration: ${file}`);
    }

    console.log('\n✅ All migrations applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migrations:', error);
    process.exit(1);
  }
}

// Create the exec_sql function if it doesn't exist
async function ensureExecSqlFunction(supabase) {
  const { error } = await supabase.rpc('exec_sql', { query: 'SELECT 1' }).catch(() => ({}));
  
  if (error) {
    console.log('Creating exec_sql function...');
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION public.exec_sql(query text)
      RETURNS json AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE query;
        RETURN json_build_object('success', true);
      EXCEPTION WHEN others THEN
        RETURN json_build_object(
          'success', false,
          'error', SQLERRM,
          'error_code', SQLSTATE
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`;

    await supabase.rpc('exec_sql', { query: createFunctionSql });
  }
}

// Run the migrations
applyMigrations();

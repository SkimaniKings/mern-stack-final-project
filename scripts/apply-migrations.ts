import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  try {
    console.log('Starting to apply migrations...');
    
    // Dynamically collect all .sql files in migrations directory
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    const allFiles: string[] = readdirSync(migrationsDir);
    const migrations = allFiles
      .filter((f) => f.endsWith('.sql'))
      .sort() // alphabetical (timestamp prefix) order
      .map((f) => join(migrationsDir, f));

      __dirname,
      '..',
      'supabase',
      'migrations',
      '20250531_fix_expenses_table.sql'

    
    // Apply missing columns

      __dirname,
      '..',
      'supabase',
      'migrations',
      '20250531_add_missing_expense_columns.sql'

    

      __dirname,
      '..',
      'supabase',
      'migrations',
      '20250616_fix_tax_predictions_table.sql'


    // Read and apply all migrations

    
    for (const migrationPath of migrations) {
      console.log(`\nApplying migration: ${migrationPath}`);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      console.log('Running migration...');
      const { data, error } = await supabase.rpc('pgmigrate', {
        query: migrationSQL,
      });
      
      if (error) {
        console.error('Error applying migration:', error);
        process.exit(1);
      }

      console.log('Migration applied successfully! Refreshing schema cache...');
      const { error: refreshError } = await supabase.rpc('refresh_postgrest_schema');

      if (refreshError) {
        console.error('Error refreshing schema cache:', refreshError);
        console.warn('Could not refresh schema cache. You may need to restart the service for changes to take effect.');
      } else {
        console.log('Schema cache refreshed successfully!');
      }
    }
    
    console.log('All migrations applied successfully!');
    console.log('Don\'t forget to run: supabase db push');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applyMigrations();

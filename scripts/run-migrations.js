// Script to run database migrations against Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or service key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_watchlist_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: create_watchlist_table.sql');
    
    // Execute the SQL against Supabase
    const { error } = await supabase.rpc('pgmigrate', { query: sql });
    
    if (error) {
      // If the RPC method isn't available, try direct SQL execution
      console.log('RPC method not available, trying direct SQL execution...');
      const { error: sqlError } = await supabase.sql(sql);
      
      if (sqlError) {
        console.error('Error running migration:', sqlError);
        return false;
      }
    }
    
    console.log('Migration completed successfully!');
    return true;
  } catch (error) {
    console.error('Error running migration:', error);
    return false;
  }
}

// Alternative approach if direct SQL execution is not available
async function createWatchlistTableManually() {
  try {
    console.log('Creating watchlist table manually...');
    
    // Check if the table already exists
    const { data, error } = await supabase
      .from('watchlist')
      .select('id')
      .limit(1);
    
    if (!error) {
      console.log('Watchlist table already exists!');
      return true;
    }
    
    // Create the table using Supabase's API
    const { error: createError } = await supabase.sql(`
      CREATE TABLE IF NOT EXISTS public.watchlist (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        investment_id UUID,
        ticker TEXT NOT NULL,
        name TEXT NOT NULL,
        price DECIMAL(12, 2) NOT NULL DEFAULT 0,
        target_price DECIMAL(12, 2),
        notes TEXT,
        sector TEXT,
        price_alert_enabled BOOLEAN DEFAULT FALSE,
        alert_threshold DECIMAL(12, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    if (createError) {
      console.error('Error creating watchlist table:', createError);
      return false;
    }
    
    console.log('Watchlist table created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating watchlist table manually:', error);
    return false;
  }
}

// Run the migration
async function main() {
  console.log('Starting database migration...');
  
  // Try running the migration first
  const migrationSuccess = await runMigration();
  
  // If migration fails, try manual creation
  if (!migrationSuccess) {
    console.log('Migration failed, trying manual table creation...');
    const manualSuccess = await createWatchlistTableManually();
    
    if (!manualSuccess) {
      console.error('Failed to create watchlist table. Please check your Supabase configuration.');
      process.exit(1);
    }
  }
  
  console.log('Database setup completed!');
  process.exit(0);
}

main();

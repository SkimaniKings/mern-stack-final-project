// This script updates the database schema to add missing columns
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
  try {
    console.log('Updating database schema...');
    
    // Add missing columns to transactions table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS merchant_name TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS location_name TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_impulse BOOLEAN DEFAULT FALSE;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS time_of_day TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT FALSE;
      `
    });

    if (alterError) {
      console.error('Error updating schema:', alterError);
      process.exit(1);
    }

    console.log('Schema updated successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateSchema(); 
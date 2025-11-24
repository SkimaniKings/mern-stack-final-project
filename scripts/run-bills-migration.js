#!/usr/bin/env node

/**
 * Bills Tables Migration Script
 * 
 * This script creates all the necessary tables for the bills management feature:
 * - bills
 * - bill_categories
 * - bill_schedules
 * - bill_reminders
 * 
 * Usage:
 * node scripts/run-bills-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing required environment variables.');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file.');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Path to the SQL migration file
const migrationFilePath = path.join(__dirname, '..', 'migrations', 'create_bills_tables.sql');

async function runMigration() {
  try {
    console.log('Reading SQL migration file...');
    const sql = fs.readFileSync(migrationFilePath, 'utf8');

    console.log('Running migration...');
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully!');
    console.log('The following tables have been created:');
    console.log('- bills');
    console.log('- bill_categories');
    console.log('- bill_schedules');
    console.log('- bill_reminders');
    console.log('- payments (if it didn\'t exist)');
    
    console.log('\nDefault bill categories have been added.');
    console.log('\nRow-Level Security policies have been applied to all tables.');
    console.log('\nFor more information, see README-BILLS.md');
  } catch (err) {
    console.error('Error running migration:', err);
    process.exit(1);
  }
}

// Create exec_sql function if it doesn't exist
async function createExecSqlFunction() {
  try {
    console.log('Creating exec_sql function...');
    
    const { error } = await supabase.rpc('exec_sql', { 
      sql: 'SELECT 1' 
    });
    
    // If the function already exists, we're good
    if (!error) {
      console.log('exec_sql function already exists, proceeding with migration...');
      return runMigration();
    }
    
    // Create the function if it doesn't exist
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `;
    
    const { error: createError } = await supabase.sql(createFunctionSql);
    
    if (createError) {
      console.error('Failed to create exec_sql function:', createError);
      process.exit(1);
    }
    
    console.log('exec_sql function created successfully.');
    return runMigration();
  } catch (err) {
    console.error('Error creating exec_sql function:', err);
    process.exit(1);
  }
}

// Start the migration process
console.log('Starting bills tables migration...');
createExecSqlFunction();

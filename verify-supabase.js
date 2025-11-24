// Verify Supabase connection and database access
console.log('=== Supabase Connection Test ===\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Simple check for required environment variables
const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('✅ Environment variables found');

// Initialize Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\nInitializing Supabase client...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 10) + '...');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Test function
async function testConnection() {
  try {
    console.log('\nTesting database connection...');
    
    // Try to list tables first (if we have permissions)
    console.log('Listing tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .limit(5);
      
    if (tablesError) {
      console.log('Could not list tables (expected without proper permissions)');
    } else {
      console.log('Tables:', tables);
    }
    
    // Try to query the expenses table
    console.log('\nQuerying expenses table...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);
      
    if (expensesError) {
      console.error('❌ Error querying expenses:', {
        message: expensesError.message,
        code: expensesError.code,
        details: expensesError.details
      });
    } else {
      console.log('✅ Successfully queried expenses table');
      console.log('Sample expense:', expenses[0] || 'No expenses found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the test
testConnection().then(() => {
  console.log('\nTest completed.');  
});

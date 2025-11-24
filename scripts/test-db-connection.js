// Simple script to test database connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('Starting database connection test...');

// Log environment variables for debugging
console.log('Environment variables:', {
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
  keyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...'
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

// Simple test function
async function testConnection() {
  try {
    console.log('Attempting to connect to the database...');
    
    // Test a simple query
    console.log('Running test query...');
    const { data, error, status, statusText } = await supabase
      .from('expenses')
      .select('*')
      .limit(1);
    
    console.log('Query results:', {
      status,
      statusText,
      error: error ? error.message : 'No error',
      dataLength: data ? data.length : 'No data'
    });
    
    if (error) {
      console.error('Query error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log('Successfully connected to the database!');
    return true;
  } catch (error) {
    console.error('Connection test failed:', {
      name: error?.name || 'UnknownError',
      message: error?.message || 'No error message',
      stack: error?.stack || 'No stack trace'
    });
    return false;
  }
}

// Run the test
console.log('Starting test...');
testConnection()
  .then(success => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });
